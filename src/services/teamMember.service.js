import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import TeamMember from '../models/teamMember.model.js';
import Activity from '../models/activity.model.js';
import Branch from '../models/branch.model.js';

/**
 * Validate if all skill IDs exist in the activities collection
 * @param {string[]} skillIds
 * @returns {Promise<boolean>}
 */
const validateSkills = async (skillIds) => {
  if (!Array.isArray(skillIds)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Skills must be an array');
  }
  if (skillIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'At least one skill is required');
  }
  // Find all activities with the given IDs
  const activities = await Activity.find({ _id: { $in: skillIds } });
  // Check if we found all the activities (no duplicates or invalid IDs)
  if (activities.length !== skillIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'One or more skills are invalid');
  }
  return true;
};

/**
 * Validate if branch ID exists
 * @param {string} branchId
 * @returns {Promise<boolean>}
 */
const validateBranch = async (branchId) => {
  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid branch ID format');
  }
  const branch = await Branch.findById(branchId);
  if (!branch) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Branch not found');
  }
  return true;
};

/**
 * Create a team member
 * @param {Object} teamMemberBody
 * @returns {Promise<TeamMember>}
 */
const createTeamMember = async (teamMemberBody) => {
  if (await TeamMember.isEmailTaken(teamMemberBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (await TeamMember.isPhoneTaken(teamMemberBody.phone)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already taken');
  }
  await validateSkills(teamMemberBody.skills);
  await validateBranch(teamMemberBody.branch);
  
  const teamMember = await TeamMember.create(teamMemberBody);
  return teamMember.populate(['skills', 'branch']);
};

/**
 * Query for team members
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryTeamMembers = async (filter, options) => {
  const teamMembers = await TeamMember.paginate(filter, {
    ...options,
    populate: 'skills,branch',
    sortBy: options.sortBy || 'sortOrder:asc',
  });
  return teamMembers;
};

/**
 * Get team member by id
 * @param {ObjectId} id
 * @returns {Promise<TeamMember>}
 */
const getTeamMemberById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid team member ID format');
  }
  const teamMember = await TeamMember.findById(id).populate(['skills', 'branch']);
  if (!teamMember) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found');
  }
  return teamMember;
};

/**
 * Get team member by phone
 * @param {string} phone
 * @returns {Promise<TeamMember>}
 */
const getTeamMemberByPhone = async (phone) => {
  const teamMember = await TeamMember.findOne({ phone }).populate(['skills', 'branch']);
  if (!teamMember) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found');
  }
  return teamMember;
};

/**
 * Get team member by email
 * @param {string} email
 * @returns {Promise<TeamMember>}
 */
const getTeamMemberByEmail = async (email) => {
  const teamMember = await TeamMember.findOne({ email }).populate(['skills', 'branch']);
  if (!teamMember) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found');
  }
  return teamMember;
};

/**
 * Update team member by id
 * @param {ObjectId} teamMemberId
 * @param {Object} updateBody
 * @returns {Promise<TeamMember>}
 */
const updateTeamMemberById = async (teamMemberId, updateBody) => {
  const teamMember = await getTeamMemberById(teamMemberId);
  
  if (updateBody.email && (await TeamMember.isEmailTaken(updateBody.email, teamMemberId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (updateBody.phone && (await TeamMember.isPhoneTaken(updateBody.phone, teamMemberId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already taken');
  }
  if (updateBody.skills) {
    await validateSkills(updateBody.skills);
  }
  if (updateBody.branch) {
    await validateBranch(updateBody.branch);
  }
  
  Object.assign(teamMember, updateBody);
  await teamMember.save();
  return teamMember.populate(['skills', 'branch']);
};

/**
 * Delete team member by id
 * @param {ObjectId} teamMemberId
 * @returns {Promise<TeamMember>}
 */
const deleteTeamMemberById = async (teamMemberId) => {
  const teamMember = await getTeamMemberById(teamMemberId);
  await teamMember.deleteOne();
  return teamMember;
};

export {
  createTeamMember,
  queryTeamMembers,
  getTeamMemberById,
  getTeamMemberByEmail,
  getTeamMemberByPhone,
  updateTeamMemberById,
  deleteTeamMemberById,
}; 