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

export { 
  getTotalActivities, 
  getTotalTeams, 
  getTotalBranches, 
  getTotalClients, 
  getTotalOngoingTasks,
  getTimelineCountsByBranch,
  getAssignedTaskCounts,
  getTopClients,
  getTopActivities
}; 