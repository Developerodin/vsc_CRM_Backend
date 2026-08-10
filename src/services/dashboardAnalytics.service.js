import Timeline from '../models/timeline.model.js';
import {
  buildBranchScopedFilter,
  buildFrequencyStatusMatch,
  buildTaskDateOverlapFilter,
  MAX_PERIODS_PER_STATUS,
  MAX_PERIOD_ROWS,
} from './dashboardHelpers.js';

/**
 * Aggregate timeline frequency × status counts without hydrating documents.
 * @param {Object} user
 * @param {Object} params
 * @returns {Promise<Object>}
 */
const getTimelineStatusByFrequency = async (user, { branchId, startDate, endDate, frequency, status }) => {
  const filter = buildBranchScopedFilter(user, branchId, frequency ? { frequency } : {});
  const fsMatch = buildFrequencyStatusMatch({ startDate, endDate, frequency, status });

  const pipeline = [
    { $match: filter },
    { $unwind: { path: '$frequencyStatus', preserveNullAndEmptyArrays: false } },
  ];
  if (fsMatch) pipeline.push({ $match: fsMatch });
  pipeline.push(
    {
      $group: {
        _id: {
          frequency: '$frequency',
          status: '$frequencyStatus.status',
        },
        count: { $sum: 1 },
        periods: { $addToSet: '$frequencyStatus.period' },
      },
    },
    {
      $group: {
        _id: '$_id.frequency',
        totalPeriods: { $sum: '$count' },
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count',
            periods: '$periods',
          },
        },
      },
    }
  );

  const rows = await Timeline.aggregate(pipeline);
  const emptyBreakdown = () => ({
    pending: { count: 0, periods: [] },
    completed: { count: 0, periods: [] },
    delayed: { count: 0, periods: [] },
    ongoing: { count: 0, periods: [] },
  });

  const results = rows.map((row) => {
    const statusBreakdown = emptyBreakdown();
    (row.statuses || []).forEach((s) => {
      if (!statusBreakdown[s.status]) return;
      statusBreakdown[s.status].count = s.count;
      statusBreakdown[s.status].periods = (s.periods || []).slice(0, MAX_PERIODS_PER_STATUS);
    });
    return {
      frequency: row._id,
      totalPeriods: row.totalPeriods,
      statusBreakdown,
    };
  });

  return {
    dateRange: startDate && endDate ? { startDate, endDate } : null,
    filters: { frequency, status },
    results,
  };
};

/**
 * Period-level timeline rows via aggregation + lookups (capped).
 * @param {Object} user
 * @param {Object} params
 * @returns {Promise<Object>}
 */
const getTimelineStatusByPeriod = async (user, { branchId, startDate, endDate, frequency, period }) => {
  const filter = buildBranchScopedFilter(user, branchId, frequency ? { frequency } : {});
  const fsMatch = buildFrequencyStatusMatch({ startDate, endDate, frequency, period });

  const pipeline = [
    { $match: filter },
    { $unwind: { path: '$frequencyStatus', preserveNullAndEmptyArrays: false } },
  ];
  if (fsMatch) pipeline.push({ $match: fsMatch });

  pipeline.push(
    {
      $lookup: {
        from: 'activities',
        localField: 'activity',
        foreignField: '_id',
        as: 'activityDoc',
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    {
      $lookup: {
        from: 'clients',
        localField: 'client',
        foreignField: '_id',
        as: 'clientDoc',
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    {
      $lookup: {
        from: 'teammembers',
        localField: 'assignedMember',
        foreignField: '_id',
        as: 'memberDoc',
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    {
      $lookup: {
        from: 'branches',
        localField: 'branch',
        foreignField: '_id',
        as: 'branchDoc',
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    {
      $project: {
        period: '$frequencyStatus.period',
        status: '$frequencyStatus.status',
        completedAt: '$frequencyStatus.completedAt',
        notes: '$frequencyStatus.notes',
        timelineId: '$_id',
        activity: { $ifNull: [{ $arrayElemAt: ['$activityDoc.name', 0] }, 'Unknown Activity'] },
        client: { $ifNull: [{ $arrayElemAt: ['$clientDoc.name', 0] }, 'Unknown Client'] },
        assignedMember: { $ifNull: [{ $arrayElemAt: ['$memberDoc.name', 0] }, 'Unassigned'] },
        branch: { $ifNull: [{ $arrayElemAt: ['$branchDoc.name', 0] }, 'Unknown Branch'] },
      },
    },
    { $limit: MAX_PERIOD_ROWS }
  );

  const periodData = await Timeline.aggregate(pipeline);

  return {
    frequency,
    dateRange: startDate && endDate ? { startDate, endDate } : null,
    period,
    totalPeriods: periodData.length,
    periods: periodData,
    capped: periodData.length >= MAX_PERIOD_ROWS,
  };
};

/**
 * Frequency analytics grouped in MongoDB.
 * @param {Object} user
 * @param {Object} params
 * @returns {Promise<Object>}
 */
const getTimelineFrequencyAnalytics = async (user, { branchId, startDate, endDate, groupBy = 'frequency' }) => {
  const filter = buildBranchScopedFilter(user, branchId);
  const fsMatch = buildFrequencyStatusMatch({ startDate, endDate, frequency: 'Monthly' });

  const pipeline = [
    { $match: filter },
    { $unwind: { path: '$frequencyStatus', preserveNullAndEmptyArrays: false } },
  ];
  if (fsMatch) pipeline.push({ $match: fsMatch });

  let groupId;
  switch (groupBy) {
    case 'status':
      groupId = '$frequencyStatus.status';
      break;
    case 'branch':
      groupId = '$branch';
      break;
    case 'activity':
      groupId = '$activity';
      break;
    case 'frequency':
    default:
      groupId = '$frequency';
  }

  pipeline.push({
    $group: {
      _id: groupId,
      totalPeriods: { $sum: 1 },
      pendingCount: { $sum: { $cond: [{ $eq: ['$frequencyStatus.status', 'pending'] }, 1, 0] } },
      completedCount: { $sum: { $cond: [{ $eq: ['$frequencyStatus.status', 'completed'] }, 1, 0] } },
      delayedCount: { $sum: { $cond: [{ $eq: ['$frequencyStatus.status', 'delayed'] }, 1, 0] } },
      ongoingCount: { $sum: { $cond: [{ $eq: ['$frequencyStatus.status', 'ongoing'] }, 1, 0] } },
    },
  });

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
  } else if (groupBy === 'activity') {
    pipeline.push(
      { $lookup: { from: 'activities', localField: '_id', foreignField: '_id', as: 'activityDoc' } },
      {
        $addFields: {
          activity: { $ifNull: [{ $arrayElemAt: ['$activityDoc.name', 0] }, 'Unknown Activity'] },
          activityId: { $toString: '$_id' },
        },
      }
    );
  } else if (groupBy === 'status') {
    pipeline.push({ $addFields: { status: '$_id' } });
  } else {
    pipeline.push({ $addFields: { frequency: '$_id' } });
  }

  pipeline.push({
    $project: {
      _id: 0,
      frequency: 1,
      status: 1,
      branch: 1,
      branchId: 1,
      activity: 1,
      activityId: 1,
      totalPeriods: 1,
      pendingCount: 1,
      completedCount: 1,
      delayedCount: 1,
      ongoingCount: 1,
      completionRate: {
        $cond: [
          { $gt: ['$totalPeriods', 0] },
          { $multiply: [{ $divide: ['$completedCount', '$totalPeriods'] }, 100] },
          0,
        ],
      },
    },
  });
  pipeline.push({ $sort: { totalPeriods: -1 } });

  const analytics = await Timeline.aggregate(pipeline);

  return {
    groupBy,
    dateRange: startDate && endDate ? { startDate, endDate } : null,
    totalAnalytics: analytics.length,
    analytics,
  };
};

/**
 * Status trends over period strings (grouped by period as interval key).
 * @param {Object} user
 * @param {Object} params
 * @returns {Promise<Object>}
 */
const getTimelineStatusTrends = async (user, { branchId, startDate, endDate, frequency, interval = 'day' }) => {
  const extra = frequency && String(frequency).trim() !== '' ? { frequency } : {};
  const filter = buildBranchScopedFilter(user, branchId, extra);
  const fsMatch = buildFrequencyStatusMatch({ startDate, endDate, frequency });

  const pipeline = [
    { $match: filter },
    { $unwind: { path: '$frequencyStatus', preserveNullAndEmptyArrays: false } },
  ];
  if (fsMatch) pipeline.push({ $match: fsMatch });

  pipeline.push(
    {
      $group: {
        _id: '$frequencyStatus.period',
        totalCount: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$frequencyStatus.status', 'pending'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$frequencyStatus.status', 'completed'] }, 1, 0] } },
        delayed: { $sum: { $cond: [{ $eq: ['$frequencyStatus.status', 'delayed'] }, 1, 0] } },
        ongoing: { $sum: { $cond: [{ $eq: ['$frequencyStatus.status', 'ongoing'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } }
  );

  const rows = await Timeline.aggregate(pipeline);
  const trends = rows.map((r) => ({
    interval: r._id,
    totalCount: r.totalCount,
    statusBreakdown: {
      pending: r.pending,
      completed: r.completed,
      delayed: r.delayed,
      ongoing: r.ongoing,
    },
  }));

  return {
    interval,
    dateRange: startDate && endDate ? { startDate, endDate } : null,
    frequency,
    trends,
  };
};

/**
 * Completion rates via aggregation.
 * @param {Object} user
 * @param {Object} params
 * @returns {Promise<Object>}
 */
const getTimelineCompletionRates = async (user, { branchId, startDate, endDate, frequency }) => {
  const extra = frequency && String(frequency).trim() !== '' ? { frequency } : {};
  const filter = buildBranchScopedFilter(user, branchId, extra);
  const fsMatch = buildFrequencyStatusMatch({ startDate, endDate, frequency });

  const pipeline = [
    { $match: filter },
    { $unwind: { path: '$frequencyStatus', preserveNullAndEmptyArrays: false } },
  ];
  if (fsMatch) pipeline.push({ $match: fsMatch });

  pipeline.push({
    $group: {
      _id: '$frequency',
      totalPeriods: { $sum: 1 },
      completedPeriods: { $sum: { $cond: [{ $eq: ['$frequencyStatus.status', 'completed'] }, 1, 0] } },
      delayedPeriods: { $sum: { $cond: [{ $eq: ['$frequencyStatus.status', 'delayed'] }, 1, 0] } },
      ongoingPeriods: { $sum: { $cond: [{ $eq: ['$frequencyStatus.status', 'ongoing'] }, 1, 0] } },
      pendingPeriods: { $sum: { $cond: [{ $eq: ['$frequencyStatus.status', 'pending'] }, 1, 0] } },
    },
  });

  const rows = await Timeline.aggregate(pipeline);

  const overallStats = {
    totalPeriods: 0,
    completedPeriods: 0,
    delayedPeriods: 0,
    ongoingPeriods: 0,
    pendingPeriods: 0,
  };

  const frequencyBreakdown = rows.map((stats) => {
    overallStats.totalPeriods += stats.totalPeriods;
    overallStats.completedPeriods += stats.completedPeriods;
    overallStats.delayedPeriods += stats.delayedPeriods;
    overallStats.ongoingPeriods += stats.ongoingPeriods;
    overallStats.pendingPeriods += stats.pendingPeriods;
    return {
      frequency: stats._id,
      totalPeriods: stats.totalPeriods,
      completedPeriods: stats.completedPeriods,
      delayedPeriods: stats.delayedPeriods,
      ongoingPeriods: stats.ongoingPeriods,
      pendingPeriods: stats.pendingPeriods,
      completionRate: stats.totalPeriods > 0 ? (stats.completedPeriods / stats.totalPeriods) * 100 : 0,
      onTimeRate:
        stats.totalPeriods > 0
          ? ((stats.completedPeriods + stats.ongoingPeriods) / stats.totalPeriods) * 100
          : 0,
    };
  });

  overallStats.completionRate =
    overallStats.totalPeriods > 0 ? (overallStats.completedPeriods / overallStats.totalPeriods) * 100 : 0;
  overallStats.onTimeRate =
    overallStats.totalPeriods > 0
      ? ((overallStats.completedPeriods + overallStats.ongoingPeriods) / overallStats.totalPeriods) * 100
      : 0;

  frequencyBreakdown.sort((a, b) => b.completionRate - a.completionRate);

  return {
    dateRange: startDate && endDate ? { startDate, endDate } : null,
    frequency,
    overallStats,
    frequencyBreakdown,
  };
};

export {
  getTimelineStatusByFrequency,
  getTimelineStatusByPeriod,
  getTimelineFrequencyAnalytics,
  getTimelineStatusTrends,
  getTimelineCompletionRates,
};

export {
  getTaskAnalytics,
  getTaskTrends,
} from './dashboardTaskAnalytics.service.js';
