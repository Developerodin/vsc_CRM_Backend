import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import Branch from '../models/branch.model.js';

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
  const branch = await Branch.create(branchBody);
  return branch;
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
  const branches = await Branch.paginate(filter, options);
  return branches;
};

/**
 * Get branch by id
 * @param {ObjectId} id
 * @returns {Promise<Branch>}
 */
const getBranchById = async (id) => {
  return Branch.findById(id);
};

/**
 * Get branch by email
 * @param {string} email
 * @returns {Promise<Branch>}
 */
const getBranchByEmail = async (email) => {
  return Branch.findOne({ email });
};

/**
 * Get branch by phone
 * @param {string} phone
 * @returns {Promise<Branch>}
 */
const getBranchByPhone = async (phone) => {
  return Branch.findOne({ phone });
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
  Object.assign(branch, updateBody);
  await branch.save();
  return branch;
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