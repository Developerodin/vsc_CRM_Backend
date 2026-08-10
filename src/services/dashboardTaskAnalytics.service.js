import Task from '../models/task.model.js';
import {
  buildBranchScopedFilter,
  buildTaskDateOverlapFilter,
} from './dashboardHelpers.js';

/**
 * Task analytics via aggregation (counts only — no embedded task lists).
 * @param {Object} user
 * @param {Object} params
 * @returns {Promise<Object>}
 */
const getTaskAnalytics = async (user, { branchId, startDate, endDate, groupBy = 'status' }) => {
  const filter = buildBranchScopedFilter(user, branchId);
  const dateOverlap = buildTaskDateOverlapFilter(startDate, endDate);
  if (dateOverlap) {
    Object.assign(filter, dateOverlap);
  }

  let groupIdField = '$status';
  if (groupBy === 'priority') groupIdField = '$priority';
  else if (groupBy === 'branch') groupIdField = '$branch';
  else if (groupBy === 'teamMember') groupIdField = '$teamMember';
  else if (groupBy === 'month') {
    groupIdField = {
      $dateToString: { format: '%Y-%m', date: '$startDate' },
    };
  } else if (groupBy === 'week') {
    groupIdField = {
      $concat: [
        { $toString: { $year: '$startDate' } },
        '-W',
        {
          $cond: [
            { $lt: [{ $isoWeek: '$startDate' }, 10] },
            { $concat: ['0', { $toString: { $isoWeek: '$startDate' } }] },
            { $toString: { $isoWeek: '$startDate' } },
          ],
        },
      ],
    };
  }

  const pipeline = [
    { $match: filter },
    {
      $group: {
        _id: groupIdField,
        count: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        ongoing: { $sum: { $cond: [{ $eq: ['$status', 'ongoing'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        on_hold: { $sum: { $cond: [{ $eq: ['$status', 'on_hold'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        delayed: { $sum: { $cond: [{ $eq: ['$status', 'delayed'] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] } },
      },
    },
    { $sort: { count: -1 } },
  ];

  if (groupBy === 'branch') {
    pipeline.push(
      { $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branchDoc' } },
      {
        $addFields: {
          branch: { $ifNull: [{ $arrayElemAt: ['$branchDoc.name', 0] }, 'Unknown Branch'] },
          branchId: { $toString: '$_id' },
        },
      }
    );
  } else if (groupBy === 'teamMember') {
    pipeline.push(
      { $lookup: { from: 'teammembers', localField: '_id', foreignField: '_id', as: 'memberDoc' } },
      {
        $addFields: {
          teamMember: { $ifNull: [{ $arrayElemAt: ['$memberDoc.name', 0] }, 'Unknown Member'] },
          teamMemberId: { $toString: '$_id' },
        },
      }
    );
  }

  const rows = await Task.aggregate(pipeline);
  const totalTasks = rows.reduce((sum, r) => sum + r.count, 0);

  const analytics = rows.map((r) => {
    const item = {
      count: r.count,
      tasks: [],
      statusBreakdown: {
        pending: r.pending,
        ongoing: r.ongoing,
        completed: r.completed,
        on_hold: r.on_hold,
        cancelled: r.cancelled,
        delayed: r.delayed,
      },
      priorityBreakdown: {
        low: r.low,
        medium: r.medium,
        high: r.high,
        urgent: r.urgent,
        critical: r.critical,
      },
    };
    if (groupBy === 'status') item.status = r._id;
    else if (groupBy === 'priority') item.priority = r._id;
    else if (groupBy === 'branch') {
      item.branch = r.branch;
      item.branchId = r.branchId;
    } else if (groupBy === 'teamMember') {
      item.teamMember = r.teamMember;
      item.teamMemberId = r.teamMemberId;
    } else if (groupBy === 'month') item.month = r._id;
    else if (groupBy === 'week') item.week = r._id;
    return item;
  });

  return {
    groupBy,
    dateRange: startDate && endDate ? { startDate, endDate } : null,
    totalTasks,
    totalGroups: analytics.length,
    analytics,
  };
};

/**
 * Task trends via aggregation.
 * @param {Object} user
 * @param {Object} params
 * @returns {Promise<Object>}
 */
const getTaskTrends = async (user, { branchId, startDate, endDate, interval = 'month' }) => {
  const filter = buildBranchScopedFilter(user, branchId);
  const dateOverlap = buildTaskDateOverlapFilter(startDate, endDate);
  if (dateOverlap) Object.assign(filter, dateOverlap);

  // Lean find of only needed fields then group in JS is still O(n) memory;
  // prefer aggregation with date formatting when possible.
  let intervalExpr;
  if (interval === 'day') {
    intervalExpr = { $dateToString: { format: '%Y-%m-%d', date: '$startDate' } };
  } else if (interval === 'week') {
    intervalExpr = {
      $concat: [
        { $toString: { $year: '$startDate' } },
        '-W',
        {
          $cond: [
            { $lt: [{ $isoWeek: '$startDate' }, 10] },
            { $concat: ['0', { $toString: { $isoWeek: '$startDate' } }] },
            { $toString: { $isoWeek: '$startDate' } },
          ],
        },
      ],
    };
  } else {
    intervalExpr = { $dateToString: { format: '%Y-%m', date: '$startDate' } };
  }

  const rows = await Task.aggregate([
    { $match: filter },
    {
      $group: {
        _id: intervalExpr,
        totalTasks: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        ongoing: { $sum: { $cond: [{ $eq: ['$status', 'ongoing'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        on_hold: { $sum: { $cond: [{ $eq: ['$status', 'on_hold'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        delayed: { $sum: { $cond: [{ $eq: ['$status', 'delayed'] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const trends = rows.map((r) => ({
    interval: r._id || 'unknown',
    totalTasks: r.totalTasks,
    statusBreakdown: {
      pending: r.pending,
      ongoing: r.ongoing,
      completed: r.completed,
      on_hold: r.on_hold,
      cancelled: r.cancelled,
      delayed: r.delayed,
    },
    priorityBreakdown: {
      low: r.low,
      medium: r.medium,
      high: r.high,
      urgent: r.urgent,
      critical: r.critical,
    },
  }));

  return {
    interval,
    dateRange: startDate && endDate ? { startDate, endDate } : null,
    totalTasks: trends.reduce((s, t) => s + t.totalTasks, 0),
    trends,
  };
};

export {
  getTaskAnalytics,
  getTaskTrends,
};
