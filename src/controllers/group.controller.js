import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { groupService } from '../services/index.js';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';

const createGroup = catchAsync(async (req, res) => {
  const group = await groupService.createGroup(req.body, req.user);
  res.status(httpStatus.CREATED).send(group);
});

const getGroups = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'numberOfClients', 'branch', 'client', 'search']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  
  // Add branch filtering based on user's access
  const result = await groupService.queryGroups(filter, options, req.user);
  res.send(result);
});

const getGroup = catchAsync(async (req, res) => {
  const group = await groupService.getGroupById(req.params.groupId);
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
  }
  res.send(group);
});

const updateGroup = catchAsync(async (req, res) => {
  const group = await groupService.updateGroupById(req.params.groupId, req.body, req.user);
  res.send(group);
});

const deleteGroup = catchAsync(async (req, res) => {
  await groupService.deleteGroupById(req.params.groupId);
  res.status(httpStatus.NO_CONTENT).send();
});

const addClientToGroup = catchAsync(async (req, res) => {
  const group = await groupService.addClientToGroup(req.params.groupId, req.body.clientId);
  res.send(group);
});

const removeClientFromGroup = catchAsync(async (req, res) => {
  const group = await groupService.removeClientFromGroup(req.params.groupId, req.params.clientId);
  res.send(group);
});

const getClientsByGroup = catchAsync(async (req, res) => {
  const clients = await groupService.getClientsByGroup(req.params.groupId);
  res.send(clients);
});

const bulkImportGroups = catchAsync(async (req, res) => {
  const result = await groupService.bulkImportGroups(req.body.groups);
  res.status(httpStatus.OK).send(result);
});

const getGroupTaskStatistics = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'branch', 'client', 'search']);
  const options = pick(req.query, ['limit', 'page']);
  
  const result = await groupService.getGroupTaskStatistics(filter, options, req.user);
  res.send(result);
});

const getAllGroupsAnalytics = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'branch', 'search']);
  const result = await groupService.getAllGroupsAnalytics(filter, req.user);
  res.status(httpStatus.OK).send(result);
});

const getGroupAnalytics = catchAsync(async (req, res) => {
  const result = await groupService.getGroupAnalytics(req.params.groupId, req.user, { fy: req.query.fy });
  res.status(httpStatus.OK).send(result);
});

export {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  addClientToGroup,
  removeClientFromGroup,
  getClientsByGroup,
  bulkImportGroups,
  getGroupTaskStatistics,
  getAllGroupsAnalytics,
  getGroupAnalytics,
}; 