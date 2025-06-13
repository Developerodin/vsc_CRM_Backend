import httpStatus from 'http-status';

import ApiError from '../utils/ApiError.js';
import TeamMember from '../models/teamMember.model.js';

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
  return TeamMember.create(teamMemberBody);
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
  const teamMembers = await TeamMember.paginate(filter, options);
  return teamMembers;
};

/**
 * Get team member by id
 * @param {ObjectId} id
 * @returns {Promise<TeamMember>}
 */
const getTeamMemberById = async (id) => {
  return TeamMember.findById(id);
};

/**
 * Get team member by phone
 * @param {string} phone
 * @returns {Promise<TeamMember>}
 */
const getTeamMemberByPhone = async (phone) => {
  return TeamMember.findOne({ phone });
};

/**
 * Get team member by email
 * @param {string} email
 * @returns {Promise<TeamMember>}
 */
const getTeamMemberByEmail = async (email) => {
  return TeamMember.findOne({ email });
};

/**
 * Update team member by id
 * @param {ObjectId} teamMemberId
 * @param {Object} updateBody
 * @returns {Promise<TeamMember>}
 */
const updateTeamMemberById = async (teamMemberId, updateBody) => {
  const teamMember = await getTeamMemberById(teamMemberId);
  if (!teamMember) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found');
  }
  if (updateBody.email && (await TeamMember.isEmailTaken(updateBody.email, teamMemberId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (updateBody.phone && (await TeamMember.isPhoneTaken(updateBody.phone, teamMemberId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already taken');
  }
  Object.assign(teamMember, updateBody);
  await teamMember.save();
  return teamMember;
};

/**
 * Delete team member by id
 * @param {ObjectId} teamMemberId
 * @returns {Promise<TeamMember>}
 */
const deleteTeamMemberById = async (teamMemberId) => {
  const teamMember = await getTeamMemberById(teamMemberId);
  if (!teamMember) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found');
  }
  await teamMember.remove();
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