import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import Timeline from '../models/timeline.model.js';
import Activity from '../models/activity.model.js';
import Client from '../models/client.model.js';
import {
  getCurrentFinancialYear,
  parseFinancialYearString,
  collectDueDatesInRange,
} from '../utils/financialYear.js';

/**
 * @param {import('mongoose').Document | object} subactivity - Subactivity or mixed
 * @returns {boolean}
 */
const isGstRelatedSubactivity = (subactivity) => {
  if (!subactivity) return false;
  const subactivityName = (subactivity.name || '').toLowerCase();
  if (subactivityName.includes('gst')) {
    return true;
  }
  if (subactivity.fields && Array.isArray(subactivity.fields)) {
    for (const field of subactivity.fields) {
      const fieldName = (field.name || '').toLowerCase();
      if (fieldName.includes('gst')) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Match timeline.service register quarter / monthly period labels.
 * @param {Date} date - Due date
 * @param {string|null} frequency - Subactivity frequency
 * @returns {string}
 */
const getPeriodFromDate = (date, frequency = null) => {
  const month = date.getMonth();
  const year = date.getFullYear();
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  if (frequency === 'Quarterly') {
    let quarter;
    if (month <= 2) quarter = 'Q3';
    else if (month <= 5) quarter = 'Q4';
    else if (month <= 8) quarter = 'Q1';
    else quarter = 'Q2';
    return `${quarter}-${year}`;
  }
  if (frequency === 'Yearly') {
    const financialYearStart = month >= 3 ? year : year - 1;
    const financialYearEnd = financialYearStart + 1;
    return `${financialYearStart}-${financialYearEnd}`;
  }
  return `${monthNames[month]}-${year}`;
};

/**
 * Persist a timeline; duplicate key → skip (idempotent backfill).
 * @param {import('mongoose').Document} timelineDoc - New Timeline document
 * @returns {Promise<'created'|'skipped'|'error'>}
 */
const saveTimelineIdempotent = async (timelineDoc) => {
  try {
    await timelineDoc.save();
    return 'created';
  } catch (err) {
    if (err && err.code === 11000) {
      return 'skipped';
    }
    throw err;
  }
};

/**
 * Build recurring rows for one subactivity × client for a target FY (GST multiplies by gst row).
 * @param {object} params
 * @returns {Promise<{ created: number, skipped: number }>}
 */
const backfillSubactivityOccurrences = async ({
  client,
  activityDoc,
  subactivity,
  financialYearStr,
  fyStart,
  fyEnd,
}) => {
  let created = 0;
  let skipped = 0;
  const freq = subactivity.frequency;
  if (!freq || freq === 'None' || freq === 'OneTime') {
    return { created, skipped };
  }

  const dueDates = collectDueDatesInRange(subactivity.frequencyConfig, freq, fyStart, fyEnd);
  if (dueDates.length === 0) {
    return { created, skipped };
  }

  const isGst = isGstRelatedSubactivity(subactivity);
  const gstNumbers = client.gstNumbers || [];

  const baseSub = {
    _id: subactivity._id,
    name: subactivity.name,
    frequency: subactivity.frequency,
    frequencyConfig: subactivity.frequencyConfig,
    fields: subactivity.fields,
  };

  const emptyFields = subactivity.fields
    ? subactivity.fields.map((field) => ({
        fileName: field.name,
        fieldType: field.type,
        fieldValue: null,
      }))
    : [];

  const gstTargets =
    isGst && gstNumbers.length > 0
      ? gstNumbers
      : [{ state: undefined, gstNumber: undefined, gstUserId: undefined, _id: undefined }];

  for (const gstRow of gstTargets) {
    for (const dueDate of dueDates) {
      const period = getPeriodFromDate(dueDate, freq);

      const timeline = new Timeline({
        activity: activityDoc._id,
        subactivity: baseSub,
        subactivityId: subactivity._id,
        client: client._id,
        status: 'pending',
        dueDate,
        startDate: dueDate,
        endDate: dueDate,
        frequency: freq,
        frequencyConfig: subactivity.frequencyConfig,
        branch: client.branch,
        timelineType: 'recurring',
        financialYear: financialYearStr,
        period,
        fields: emptyFields,
        ...(isGst && gstNumbers.length > 0
          ? {
              state: gstRow.state,
              metadata: {
                gstNumber: gstRow.gstNumber,
                gstState: gstRow.state,
                gstUserId: gstRow.gstUserId,
                gstId: gstRow._id?.toString?.() || gstRow._id,
              },
            }
          : {}),
      });

      const outcome = await saveTimelineIdempotent(timeline);
      if (outcome === 'created') created += 1;
      else if (outcome === 'skipped') skipped += 1;
    }
  }

  return { created, skipped };
};

/**
 * Admin: generate past-period recurring timeline rows for selected clients and a completed FY.
 * Uses each client’s existing activity mappings and activity definitions (same as new-client flow, but all periods in range).
 *
 * @param {object} body
 * @param {string[]} body.clientIds - Mongo ids
 * @param {string} body.financialYear - e.g. "2023-2024"
 * @param {string} [body.activityId] - Limit to one master activity
 * @param {string} [body.subactivityId] - Limit to one subactivity (requires activityId for unambiguous filtering)
 * @param {object|null} user - Request user (branch checks for team members)
 * @returns {Promise<{ created: number, skipped: number, clientsProcessed: number, errors: Array<{ clientId: string, message: string }> }>}
 */
export const backfillFinancialYearTimelines = async (body, user = null) => {
  const { clientIds, financialYear, activityId: filterActivityId, subactivityId: filterSubactivityId } = body;

  if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'clientIds is required');
  }

  let fyParsed;
  try {
    fyParsed = parseFinancialYearString(financialYear);
  } catch (e) {
    throw new ApiError(httpStatus.BAD_REQUEST, e.message || 'Invalid financial year');
  }

  const { start: fyStart, end: fyEnd, yearString: financialYearStr } = fyParsed;
  const currentFy = getCurrentFinancialYear();
  if (fyEnd.getTime() >= currentFy.start.getTime()) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Backfill is only allowed for completed financial years (strictly before the current FY start).'
    );
  }

  const clients = await Client.find({ _id: { $in: clientIds } })
    .select('_id branch activities gstNumbers')
    .lean();

  if (clients.length !== clientIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'One or more client IDs are invalid');
  }

  if (user && user.userType === 'teamMember') {
    const teamMemberBranchId = user.branch ? user.branch.toString() : null;
    const unauthorized = clients.some(
      (c) => (c.branch ? c.branch.toString() : null) !== teamMemberBranchId
    );
    if (unauthorized) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied: one or more clients are outside your branch');
    }
  }

  let created = 0;
  let skipped = 0;
  const errors = [];

  for (const client of clients) {
    try {
      let entries = client.activities || [];
      if (filterActivityId) {
        const aid = filterActivityId.toString();
        entries = entries.filter((a) => {
          const id = (a.activity && a.activity._id) || a.activity;
          return id && id.toString() === aid;
        });
      }
      if (filterSubactivityId) {
        const sid = filterSubactivityId.toString();
        entries = entries.filter((a) => {
          const sub = a.subactivity && (a.subactivity._id || a.subactivity);
          return sub && sub.toString() === sid;
        });
      }

      for (const activityItem of entries) {
        const actId = activityItem.activity && activityItem.activity._id ? activityItem.activity._id : activityItem.activity;
        if (!actId || !mongoose.Types.ObjectId.isValid(actId)) {
          continue;
        }

        const activityDoc = await Activity.findById(actId);
        if (!activityDoc || !activityDoc.subactivities || activityDoc.subactivities.length === 0) {
          continue;
        }

        for (const subactivity of activityDoc.subactivities) {
          let isAssigned = false;
          if (activityItem.subactivity) {
            const clientSubId = activityItem.subactivity._id || activityItem.subactivity;
            isAssigned = clientSubId.toString() === subactivity._id.toString();
          }
          if (activityItem.subactivity && !isAssigned) {
            continue;
          }

          const { created: c, skipped: s } = await backfillSubactivityOccurrences({
            client,
            activityDoc,
            subactivity,
            financialYearStr,
            fyStart,
            fyEnd,
          });
          created += c;
          skipped += s;
        }
      }
    } catch (err) {
      errors.push({
        clientId: client._id.toString(),
        message: err.message || 'Backfill failed for client',
      });
    }
  }

  return {
    created,
    skipped,
    clientsProcessed: clients.length,
    financialYear: financialYearStr,
    errors,
  };
};
