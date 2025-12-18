import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { teamMemberService } from '../services/index.js';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';

const createTeamMember = catchAsync(async (req, res) => {
  const teamMember = await teamMemberService.createTeamMember(req.body, req.user);
  res.status(httpStatus.CREATED).send(teamMember);
});

const getTeamMembers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'email', 'phone', 'branch', 'city', 'state', 'country', 'pinCode', 'search']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  
  // Add branch filtering based on user's access
  const result = await teamMemberService.queryTeamMembers(filter, options, req.user);
  res.send(result);
});

const getTeamMember = catchAsync(async (req, res) => {
  const teamMember = await teamMemberService.getTeamMemberById(req.params.teamMemberId);
  if (!teamMember) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found');
  }
  res.send(teamMember);
});

const updateTeamMember = catchAsync(async (req, res) => {
  const teamMember = await teamMemberService.updateTeamMemberById(req.params.teamMemberId, req.body, req.user);
  res.send(teamMember);
});

const deleteTeamMember = catchAsync(async (req, res) => {
  await teamMemberService.deleteTeamMemberById(req.params.teamMemberId);
  res.status(httpStatus.NO_CONTENT).send();
});

const bulkImportTeamMembers = catchAsync(async (req, res) => {
  const result = await teamMemberService.bulkImportTeamMembers(req.body.teamMembers);
  res.status(httpStatus.OK).send(result);
});

const updateAccessibleTeamMembers = catchAsync(async (req, res) => {
  const teamMember = await teamMemberService.updateAccessibleTeamMembers(
    req.params.teamMemberId,
    req.body.accessibleTeamMembers
  );
  res.send(teamMember);
});

const getAccessibleTeamMembers = catchAsync(async (req, res) => {
  const teamMember = await teamMemberService.getAccessibleTeamMembers(req.params.teamMemberId);
  res.send(teamMember);
});

export {
  createTeamMember,
  getTeamMembers,
  getTeamMember,
  updateTeamMember,
  deleteTeamMember,
  bulkImportTeamMembers,
  updateAccessibleTeamMembers,
  getAccessibleTeamMembers,
}; 