/**
 * Client year report: timelines (activity/subactivity), status, pendings, turnover for a given FY.
 * Includes next-year Auditing timelines when present (audit for requested FY is done in the following FY).
 */
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { Client, Timeline, Activity } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { hasBranchAccess } from './role.service.js';
import { getCurrentFinancialYear } from '../utils/financialYear.js';

const PENDING_STATUSES = ['pending', 'ongoing', 'delayed'];
const AUDITING_ACTIVITY_NAME = 'Auditing';

/**
 * Get next financial year string. e.g. "2024-2025" -> "2025-2026" (audit for a FY is done in next FY).
 * @param {string} fy - e.g. "2024-2025"
 * @returns {string}
 */
const getNextFinancialYear = (fy) => {
  const [start, end] = fy.split('-').map(Number);
  return `${end}-${end + 1}`;
};

/**
 * Normalize year to financial year string.
 * @param {string} [year] - "2024", "2024-2025", or empty
 * @returns {string} e.g. "2024-2025"
 */
const normalizeFinancialYear = (year) => {
  if (year && typeof year === 'string' && year.trim()) {
    const trimmed = year.trim();
    if (/^\d{4}-\d{4}$/.test(trimmed)) return trimmed;
    if (/^\d{4}$/.test(trimmed)) return `${trimmed}-${parseInt(trimmed, 10) + 1}`;
  }
  return getCurrentFinancialYear().yearString;
};

/**
 * Get full year report for a single client: timelines, status breakdown, pendings, turnover.
 * @param {string} clientId
 * @param {string} [year] - FY e.g. "2024-2025" or "2024"
 * @param {Object} [user] - for branch access check
 * @returns {Promise<Object>}
 */
const getClientYearReport = async (clientId, year, user = null) => {
  const fy = normalizeFinancialYear(year);

  const client = await Client.findById(clientId)
    .select('_id name email phone branch category turnover turnoverHistory activities status')
    .lean();

  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }

  if (user && user.role && client.branch) {
    const branchId = client.branch.toString ? client.branch.toString() : client.branch;
    if (!hasBranchAccess(user.role, branchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
  }

  const [timelines, auditingActivity] = await Promise.all([
    Timeline.find({
      client: new mongoose.Types.ObjectId(clientId),
      financialYear: fy,
    })
      .populate('activity', 'name')
      .sort({ dueDate: 1, period: 1 })
      .lean(),
    Activity.findOne({ name: AUDITING_ACTIVITY_NAME }).select('_id').lean(),
  ]);

  const nextFy = getNextFinancialYear(fy);
  let auditingNextYear = null;
  if (auditingActivity) {
    const auditingTimelines = await Timeline.find({
      client: new mongoose.Types.ObjectId(clientId),
      financialYear: nextFy,
      activity: auditingActivity._id,
    })
      .populate('activity', 'name')
      .sort({ dueDate: 1, period: 1 })
      .lean();
    if (auditingTimelines.length > 0) {
      auditingNextYear = {
        financialYear: nextFy,
        timelines: auditingTimelines.map((t) => ({
          _id: t._id,
          activity: t.activity
            ? { _id: t.activity._id, name: t.activity.name }
            : { _id: t.activity, name: null },
          subactivity: t.subactivity
            ? { _id: t.subactivity._id || t.subactivityId, name: t.subactivity.name || null }
            : null,
          status: t.status || 'pending',
          period: t.period,
          dueDate: t.dueDate,
          startDate: t.startDate,
          endDate: t.endDate,
          completedAt: t.completedAt,
          frequency: t.frequency,
          timelineType: t.timelineType,
          referenceNumber: t.referenceNumber,
        })),
      };
    }
  }

  const statusSummary = { pending: 0, completed: 0, delayed: 0, ongoing: 0, notApplicable: 0 };
  const pendings = [];

  const timelineList = timelines.map((t) => {
    const status = t.status || 'pending';
    if (status === 'not applicable') statusSummary.notApplicable += 1;
    else statusSummary[status] = (statusSummary[status] || 0) + 1;

    const item = {
      _id: t._id,
      activity: t.activity
        ? { _id: t.activity._id, name: t.activity.name }
        : { _id: t.activity, name: null },
      subactivity: t.subactivity
        ? { _id: t.subactivity._id || t.subactivityId, name: t.subactivity.name || null }
        : null,
      status,
      period: t.period,
      dueDate: t.dueDate,
      startDate: t.startDate,
      endDate: t.endDate,
      completedAt: t.completedAt,
      frequency: t.frequency,
      timelineType: t.timelineType,
      referenceNumber: t.referenceNumber,
    };

    if (PENDING_STATUSES.includes(status)) {
      pendings.push(item);
    }

    return item;
  });

  const turnoverForYear =
    (client.turnoverHistory || []).find((h) => h.year === fy)?.turnover ?? client.turnover ?? null;

  const result = {
    client: {
      _id: client._id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      category: client.category,
      status: client.status,
    },
    financialYear: fy,
    turnover: turnoverForYear,
    turnoverHistory: (client.turnoverHistory || []).sort((a, b) => (b.year || '').localeCompare(a.year || '')),
    timelines: timelineList,
    statusSummary: {
      pending: statusSummary.pending,
      completed: statusSummary.completed,
      delayed: statusSummary.delayed,
      ongoing: statusSummary.ongoing,
      notApplicable: statusSummary.notApplicable,
      total: timelineList.length,
    },
    pendings,
  };
  if (auditingNextYear) result.auditingNextYear = auditingNextYear;
  return result;
};

export { getClientYearReport, normalizeFinancialYear, getNextFinancialYear };
