import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { dashboardService } from '../services/index.js';

const getTotalActivities = catchAsync(async (req, res) => {
  const count = await dashboardService.getTotalActivities();
  res.status(httpStatus.OK).send({ total: count });
});

const getTotalTeams = catchAsync(async (req, res) => {
  const { branchId } = req.query;
  const count = await dashboardService.getTotalTeams(req.user, branchId);
  res.status(httpStatus.OK).send({ total: count });
});

const getTotalBranches = catchAsync(async (req, res) => {
  const count = await dashboardService.getTotalBranches(req.user);
  res.status(httpStatus.OK).send({ total: count });
});

const getTotalClients = catchAsync(async (req, res) => {
  const { branchId } = req.query;
  const count = await dashboardService.getTotalClients(req.user, branchId);
  res.status(httpStatus.OK).send({ total: count });
});

const getTotalOngoingTasks = catchAsync(async (req, res) => {
  const { branchId } = req.query;
  const count = await dashboardService.getTotalOngoingTasks(req.user, branchId);
  res.status(httpStatus.OK).send({ total: count });
});

const getTimelineCountsByBranch = catchAsync(async (req, res) => {
  const { branchId } = req.query;
  const counts = await dashboardService.getTimelineCountsByBranch(req.user, branchId);
  res.status(httpStatus.OK).send(counts);
});

const getAssignedTaskCounts = catchAsync(async (req, res) => {
  const { branchId } = req.query;
  const data = await dashboardService.getAssignedTaskCounts(req.user, branchId);
  res.status(httpStatus.OK).send(data);
});

const getTopClients = catchAsync(async (req, res) => {
  const { branchId } = req.query;
  const data = await dashboardService.getTopClients(req.user, branchId);
  res.status(httpStatus.OK).send(data);
});

const getTopActivities = catchAsync(async (req, res) => {
  const { branchId } = req.query;
  const data = await dashboardService.getTopActivities(req.user, branchId);
  res.status(httpStatus.OK).send(data);
});

// Helper function to clean up empty string parameters
const cleanParams = (params) => {
  const cleaned = {};
  Object.keys(params).forEach(key => {
    if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
      cleaned[key] = params[key];
    }
  });
  return cleaned;
};

// New controller methods for frequency-based timeline analysis
const getTimelineStatusByFrequency = catchAsync(async (req, res) => {
  const { branchId, startDate, endDate, frequency, status } = req.query;
  const cleanedParams = cleanParams({ branchId, startDate, endDate, frequency, status });
  const data = await dashboardService.getTimelineStatusByFrequency(req.user, cleanedParams);
  res.status(httpStatus.OK).send(data);
});

const getTimelineStatusByPeriod = catchAsync(async (req, res) => {
  const { branchId, startDate, endDate, frequency, period } = req.query;
  const cleanedParams = cleanParams({ branchId, startDate, endDate, frequency, period });
  const data = await dashboardService.getTimelineStatusByPeriod(req.user, cleanedParams);
  res.status(httpStatus.OK).send(data);
});

const getTimelineFrequencyAnalytics = catchAsync(async (req, res) => {
  const { branchId, startDate, endDate, groupBy } = req.query;
  const cleanedParams = cleanParams({ branchId, startDate, endDate, groupBy });
  const data = await dashboardService.getTimelineFrequencyAnalytics(req.user, cleanedParams);
  res.status(httpStatus.OK).send(data);
});

const getTimelineStatusTrends = catchAsync(async (req, res) => {
  const { branchId, startDate, endDate, frequency, interval } = req.query;
  const cleanedParams = cleanParams({ branchId, startDate, endDate, frequency, interval });
  const data = await dashboardService.getTimelineStatusTrends(req.user, cleanedParams);
  res.status(httpStatus.OK).send(data);
});

const getTimelineCompletionRates = catchAsync(async (req, res) => {
  const { branchId, startDate, endDate, frequency } = req.query;
  const cleanedParams = cleanParams({ branchId, startDate, endDate, frequency });
  const data = await dashboardService.getTimelineCompletionRates(req.user, cleanedParams);
  res.status(httpStatus.OK).send(data);
});

// New controller methods for task analytics
const getTotalTasksAndStatus = catchAsync(async (req, res) => {
  const { branchId } = req.query;
  const data = await dashboardService.getTotalTasksAndStatus(req.user, branchId);
  res.status(httpStatus.OK).send(data);
});

const getTaskAnalytics = catchAsync(async (req, res) => {
  const { branchId, startDate, endDate, groupBy } = req.query;
  const cleanedParams = cleanParams({ branchId, startDate, endDate, groupBy });
  const data = await dashboardService.getTaskAnalytics(req.user, cleanedParams);
  res.status(httpStatus.OK).send(data);
});

const getTaskTrends = catchAsync(async (req, res) => {
  const { branchId, startDate, endDate, interval } = req.query;
  const cleanedParams = cleanParams({ branchId, startDate, endDate, interval });
  const data = await dashboardService.getTaskTrends(req.user, cleanedParams);
  res.status(httpStatus.OK).send(data);
});

export { 
  getTotalActivities, 
  getTotalTeams, 
  getTotalBranches, 
  getTotalClients, 
  getTotalOngoingTasks,
  getTimelineCountsByBranch,
  getAssignedTaskCounts,
  getTopClients,
  getTopActivities,
  getTimelineStatusByFrequency,
  getTimelineStatusByPeriod,
  getTimelineFrequencyAnalytics,
  getTimelineStatusTrends,
  getTimelineCompletionRates,
  getTotalTasksAndStatus,
  getTaskAnalytics,
  getTaskTrends
}; 