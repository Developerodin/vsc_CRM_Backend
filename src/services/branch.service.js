import httpStatus from 'http-status';
import { Branch, TeamMember } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

/**
 * Validate if team member ID exists
 * @param {string} teamMemberId
 * @returns {Promise<boolean>}
 */
const validateTeamMember = async (teamMemberId) => {
  const teamMember = await TeamMember.findById(teamMemberId);
  return !!teamMember;
};

/**
 * Create a branch
 * @param {Object} branchBody
 * @returns {Promise<Branch>}
 */
const createBranch = async (branchBody) => {
  if (await Branch.isEmailTaken(branchBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (await Branch.isPhoneTaken(branchBody.phone)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already taken');
  }
  if (branchBody.branchHead && !(await validateTeamMember(branchBody.branchHead))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Branch head must be a valid team member');
  }
  const branch = await Branch.create(branchBody);
  return branch.populate('branchHead');
};

/**
 * Query for branches
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryBranches = async (filter, options) => {
  const branches = await Branch.paginate(filter, {
    ...options,
    populate: 'branchHead',
  });
  return branches;
};

/**
 * Get branch by id
 * @param {ObjectId} id
 * @returns {Promise<Branch>}
 */
const getBranchById = async (id) => {
  const branch = await Branch.findById(id).populate('branchHead');
  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }
  return branch;
};

/**
 * Get branch by email
 * @param {string} email
 * @returns {Promise<Branch>}
 */
const getBranchByEmail = async (email) => {
  const branch = await Branch.findOne({ email }).populate('branchHead');
  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }
  return branch;
};

/**
 * Get branch by phone
 * @param {string} phone
 * @returns {Promise<Branch>}
 */
const getBranchByPhone = async (phone) => {
  const branch = await Branch.findOne({ phone }).populate('branchHead');
  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }
  return branch;
};

/**
 * Update branch by id
 * @param {ObjectId} branchId
 * @param {Object} updateBody
 * @returns {Promise<Branch>}
 */
const updateBranchById = async (branchId, updateBody) => {
  const branch = await getBranchById(branchId);
  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }
  if (updateBody.email && (await Branch.isEmailTaken(updateBody.email, branchId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (updateBody.phone && (await Branch.isPhoneTaken(updateBody.phone, branchId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already taken');
  }
  if (updateBody.branchHead && !(await validateTeamMember(updateBody.branchHead))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Branch head must be a valid team member');
  }
  Object.assign(branch, updateBody);
  await branch.save();
  return branch.populate('branchHead');
};

/**
 * Delete branch by id
 * @param {ObjectId} branchId
 * @returns {Promise<Branch>}
 */
const deleteBranchById = async (branchId) => {
  const branch = await getBranchById(branchId);
  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }
  await branch.remove();
  return branch;
};

export {
  createBranch,
  queryBranches,
  getBranchById,
  getBranchByEmail,
  getBranchByPhone,
  updateBranchById,
  deleteBranchById,
}; 