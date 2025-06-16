import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { groupService } from '../services/index.js';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';

const createGroup = catchAsync(async (req, res) => {
  const group = await groupService.createGroup(req.body);
  res.status(httpStatus.CREATED).send(group);
});

const getGroups = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'numberOfClients']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await groupService.queryGroups(filter, options);
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
  const group = await groupService.updateGroupById(req.params.groupId, req.body);
  res.send(group);
});

const deleteGroup = catchAsync(async (req, res) => {
  await groupService.deleteGroupById(req.params.groupId);
  res.status(httpStatus.NO_CONTENT).send();
});

export {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup,
}; 