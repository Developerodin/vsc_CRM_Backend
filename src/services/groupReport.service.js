/**
 * Group year report: per-client reports (timelines, status, pendings, turnover) for all clients in the group.
 * Includes next-year Auditing timelines per client when present (audit for requested FY done in following FY).
 */
import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { Group, Timeline, Activity } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { hasBranchAccess } from './role.service.js';
import { normalizeFinancialYear, getNextFinancialYear } from './clientReport.service.js';

const PENDING_STATUSES = ['pending', 'ongoing', 'delayed'];
const AUDITING_ACTIVITY_NAME = 'Auditing';

/**
 * Build status summary and pendings from timeline list for one client.
 * @param {Array} timelines - raw timeline docs with activity populated
 * @returns {{ statusSummary: Object, pendings: Array, timelineList: Array }}
 */
const buildTimelineReport = (timelines) => {
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
    if (PENDING_STATUSES.includes(status)) pendings.push(item);
    return item;
  });
  return {
    statusSummary: {
      ...statusSummary,
      total: timelineList.length,
    },
    pendings,
    timelineList,
  };
};

/**
 * Get full year report for a group: one report object per client (timelines, status, pendings, turnover).
 * @param {string} groupId
 * @param {string} [year] - FY e.g. "2024-2025" or "2024"
 * @param {Object} [user] - for branch access check
 * @returns {Promise<Object>}
 */
const getGroupYearReport = async (groupId, year, user = null) => {
  const fy = normalizeFinancialYear(year);

  const group = await Group.findById(groupId)
    .populate({
      path: 'clients',
      select: '_id name email phone branch category turnover turnoverHistory status',
    })
    .lean();

  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
  }

  if (user && user.role && group.branch) {
    const branchId = group.branch.toString ? group.branch.toString() : group.branch;
    if (!hasBranchAccess(user.role, branchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
  }

  const clientIds = (group.clients || []).map((c) => (c._id || c).toString());
  if (clientIds.length === 0) {
    return {
      group: { _id: group._id, name: group.name, branch: group.branch },
      financialYear: fy,
      clients: [],
      summary: { totalClients: 0, totalTimelines: 0, totalPending: 0, totalCompleted: 0 },
    };
  }

  const objectIds = clientIds.map((id) => new mongoose.Types.ObjectId(id));
  const nextFy = getNextFinancialYear(fy);

  const [timelines, auditingActivity] = await Promise.all([
    Timeline.find({
      client: { $in: objectIds },
      financialYear: fy,
    })
      .populate('activity', 'name')
      .sort({ client: 1, dueDate: 1, period: 1 })
      .lean(),
    Activity.findOne({ name: AUDITING_ACTIVITY_NAME }).select('_id').lean(),
  ]);

  let auditingTimelines = [];
  if (auditingActivity) {
    auditingTimelines = await Timeline.find({
      client: { $in: objectIds },
      financialYear: nextFy,
      activity: auditingActivity._id,
    })
      .populate('activity', 'name')
      .sort({ client: 1, dueDate: 1, period: 1 })
      .lean();
  }

  const timelinesByClient = new Map();
  for (const t of timelines) {
    const cid = t.client.toString();
    if (!timelinesByClient.has(cid)) timelinesByClient.set(cid, []);
    timelinesByClient.get(cid).push(t);
  }

  const auditingByClient = new Map();
  for (const t of auditingTimelines) {
    const cid = t.client.toString();
    if (!auditingByClient.has(cid)) auditingByClient.set(cid, []);
    auditingByClient.get(cid).push(t);
  }

  const formatTimelineItem = (t) => ({
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
  });

  let totalPending = 0;
  let totalCompleted = 0;
  let totalTimelines = 0;

  const clients = (group.clients || []).map((client) => {
    const clientId = (client._id || client).toString();
    const clientTimelines = timelinesByClient.get(clientId) || [];
    const { statusSummary, pendings, timelineList } = buildTimelineReport(clientTimelines);

    totalPending += statusSummary.pending + statusSummary.delayed + statusSummary.ongoing;
    totalCompleted += statusSummary.completed;
    totalTimelines += timelineList.length;

    const turnoverForYear =
      (client.turnoverHistory || []).find((h) => h.year === fy)?.turnover ?? client.turnover ?? null;

    const clientReport = {
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
      turnoverHistory: (client.turnoverHistory || []).sort((a, b) =>
        (b.year || '').localeCompare(a.year || '')
      ),
      timelines: timelineList,
      statusSummary,
      pendings,
    };
    const nextAuditing = auditingByClient.get(clientId);
    if (nextAuditing && nextAuditing.length > 0) {
      clientReport.auditingNextYear = {
        financialYear: nextFy,
        timelines: nextAuditing.map(formatTimelineItem),
      };
    }
    return clientReport;
  });

  return {
    group: { _id: group._id, name: group.name, branch: group.branch },
    financialYear: fy,
    clients,
    summary: {
      totalClients: clients.length,
      totalTimelines,
      totalPending,
      totalCompleted,
    },
  };
};

export { getGroupYearReport };
