import cache from '../utils/cache.js';
import {
  getTimelineStatusByFrequency,
  getTimelineStatusByPeriod,
  getTimelineFrequencyAnalytics,
  getTimelineStatusTrends,
  getTimelineCompletionRates,
  getTaskAnalytics,
  getTaskTrends,
} from './dashboardAnalytics.service.js';
import { getFrequencyStatusStats } from './timeline.service.js';
import {
  getTotalActivities,
  getTotalTeams,
  getTotalBranches,
  getTotalClients,
  getTotalOngoingTasks,
  getTimelineCountsByBranch,
  getAssignedTaskCounts,
  getTopClients,
  getTopActivities,
} from './dashboard.service.js';

/**
 * Single dashboard summary payload — fans in totals + analytics for one round-trip.
 * @param {Object} user
 * @param {Object} params
 * @returns {Promise<Object>}
 */
const getDashboardSummary = async (user, params = {}) => {
  const {
    branchId,
    startDate,
    endDate,
    frequency = 'Monthly',
    interval = 'month',
  } = params;

  const cacheKey = cache.generateKey('dashboardSummary', {
    userId: user?._id?.toString() || 'anon',
    branchId: branchId || 'all',
    startDate: startDate || '',
    endDate: endDate || '',
    frequency: frequency || 'Monthly',
    interval: interval || 'month',
  });
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const filterParams = { branchId, startDate, endDate, frequency };
  const trendParams = { branchId, startDate, endDate, interval };
  const freqParams = { branchId, startDate, endDate, frequency };

  const [
    totalBranches,
    totalClients,
    totalTeams,
    totalActivities,
    totalOngoingTasks,
    timelineCounts,
    assignedTaskCounts,
    topClients,
    topActivities,
    timelineStatusByFrequency,
    timelineFrequencyAnalytics,
    timelineStatusTrends,
    timelineCompletionRates,
    frequencyStatusStats,
    timelineStatusByPeriod,
    taskTrends,
    taskAnalyticsByStatus,
    taskAnalyticsByPriority,
  ] = await Promise.all([
    getTotalBranches(user),
    getTotalClients(user, branchId),
    getTotalTeams(user, branchId),
    getTotalActivities(),
    getTotalOngoingTasks(user, branchId),
    branchId ? getTimelineCountsByBranch(user, branchId) : Promise.resolve(null),
    getAssignedTaskCounts(user, branchId),
    getTopClients(user, branchId),
    getTopActivities(user, branchId),
    getTimelineStatusByFrequency(user, filterParams),
    getTimelineFrequencyAnalytics(user, { branchId, startDate, endDate, groupBy: 'frequency' }),
    getTimelineStatusTrends(user, { ...freqParams, interval: 'day' }),
    getTimelineCompletionRates(user, freqParams),
    getFrequencyStatusStats({ branchId, startDate, endDate, frequency }, user),
    getTimelineStatusByPeriod(user, { ...freqParams, frequency: frequency || 'Monthly' }),
    getTaskTrends(user, trendParams),
    getTaskAnalytics(user, { branchId, startDate, endDate, groupBy: 'status' }),
    getTaskAnalytics(user, { branchId, startDate, endDate, groupBy: 'priority' }),
  ]);

  const summary = {
    totals: {
      totalBranches,
      totalCustomers: totalClients,
      totalTeams,
      totalActivities,
      totalOngoingTasks,
    },
    timelineCounts,
    assignedTaskCounts,
    topClients,
    topActivities,
    frequencyStatusData: timelineStatusByFrequency.results || [],
    frequencyAnalyticsData: timelineFrequencyAnalytics.analytics || [],
    statusTrendsData: timelineStatusTrends.trends || [],
    completionRatesData: timelineCompletionRates.overallStats || null,
    frequencyStatusStats: frequencyStatusStats?.data?.statusBreakdown
      ? {
          pending: frequencyStatusStats.data.statusBreakdown.pending || 0,
          ongoing: frequencyStatusStats.data.statusBreakdown.ongoing || 0,
          delayed: frequencyStatusStats.data.statusBreakdown.delayed || 0,
          completed: frequencyStatusStats.data.statusBreakdown.completed || 0,
          total: frequencyStatusStats.data.totalTimelines || 0,
        }
      : null,
    timelinePeriodData: timelineStatusByPeriod.periods || [],
    taskTrendsData: taskTrends,
    taskStatusAnalytics: taskAnalyticsByStatus,
    taskPriorityAnalytics: taskAnalyticsByPriority,
    meta: {
      branchId: branchId || null,
      frequency,
      interval,
      dateRange: startDate && endDate ? { startDate, endDate } : null,
    },
  };

  cache.set(cacheKey, summary, 2 * 60 * 1000);
  return summary;
};


export { getDashboardSummary };
