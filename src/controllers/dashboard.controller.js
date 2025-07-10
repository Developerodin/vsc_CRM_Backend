import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { dashboardService } from '../services/index.js';

const getTotalActivities = catchAsync(async (req, res) => {
  const count = await dashboardService.getTotalActivities();
  res.status(httpStatus.OK).send({ total: count });
});

const getTotalTeams = catchAsync(async (req, res) => {
  const count = await dashboardService.getTotalTeams(req.user);
  res.status(httpStatus.OK).send({ total: count });
});

const getTotalBranches = catchAsync(async (req, res) => {
  const count = await dashboardService.getTotalBranches(req.user);
  res.status(httpStatus.OK).send({ total: count });
});

const getTotalClients = catchAsync(async (req, res) => {
  const count = await dashboardService.getTotalClients(req.user);
  res.status(httpStatus.OK).send({ total: count });
});

const getTotalOngoingTasks = catchAsync(async (req, res) => {
  const count = await dashboardService.getTotalOngoingTasks(req.user);
  res.status(httpStatus.OK).send({ total: count });
});

const getTimelineCountsByBranch = catchAsync(async (req, res) => {
  const { branchId } = req.query;
  const counts = await dashboardService.getTimelineCountsByBranch(req.user, branchId);
  res.status(httpStatus.OK).send(counts);
});

const getAssignedTaskCounts = catchAsync(async (req, res) => {
  const { branchId, startDate, endDate } = req.query;
  const count = await dashboardService.getAssignedTaskCounts(req.user, branchId, startDate, endDate);
  res.status(httpStatus.OK).send({ count });
});

export { 
  getTotalActivities, 
  getTotalTeams, 
  getTotalBranches, 
  getTotalClients, 
  getTotalOngoingTasks,
  getTimelineCountsByBranch,
  getAssignedTaskCounts
}; 