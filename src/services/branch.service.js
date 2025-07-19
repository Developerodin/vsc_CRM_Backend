import httpStatus from 'http-status';
import { Branch } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

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
  return Branch.create(branchBody);
};

/**
 * Query for branches
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = all)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryBranches = async (filter, options) => {
  // Create a new filter object to avoid modifying the original
  const mongoFilter = { ...filter };
  
  // If name filter exists, convert it to case-insensitive regex
  if (mongoFilter.name) {
    mongoFilter.name = { $regex: mongoFilter.name, $options: 'i' };
  }

  // If no limit is specified, set it to a very high number to get all branches
  const queryOptions = { ...options };
  if (!queryOptions.limit) {
    queryOptions.limit = 10000; // Set to a very high number to get all branches
  }

  const branches = await Branch.paginate(mongoFilter, queryOptions);
  return branches;
};

/**
 * Get branch by id
 * @param {ObjectId} id
 * @returns {Promise<Branch>}
 */
const getBranchById = async (id) => {
  const branch = await Branch.findById(id);
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
  const branch = await Branch.findOne({ email });
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
  const branch = await Branch.findOne({ phone });
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

/**
 * Bulk import branches (create and update)
 * @param {Array} branches - Array of branch objects with optional id for updates
 * @returns {Promise<Object>} - Result with created and updated counts
 */
const bulkImportBranches = async (branches) => {
  const results = {
    created: 0,
    updated: 0,
    errors: [],
  };

  // Separate branches for creation and update
  const toCreate = branches.filter((branch) => !branch.id);
  const toUpdate = branches.filter((branch) => branch.id);

  // Handle bulk creation with unique field validation
  if (toCreate.length > 0) {
    try {
      // Validate unique fields before bulk insert
      const emailValidationPromises = toCreate.map(async (branch, index) => {
        if (await Branch.isEmailTaken(branch.email)) {
          return { index, field: 'email', value: branch.email };
        }
        return null;
      });

      const phoneValidationPromises = toCreate.map(async (branch, index) => {
        if (await Branch.isPhoneTaken(branch.phone)) {
          return { index, field: 'phone', value: branch.phone };
        }
        return null;
      });

      const [emailErrors, phoneErrors] = await Promise.all([
        Promise.all(emailValidationPromises),
        Promise.all(phoneValidationPromises),
      ]);

      const validationErrors = [...emailErrors, ...phoneErrors].filter(Boolean);
      
      if (validationErrors.length > 0) {
        validationErrors.forEach((error) => {
          results.errors.push({
            index: error.index,
            error: `${error.field} already taken: ${error.value}`,
            data: toCreate[error.index],
          });
        });
        // Remove branches with validation errors from creation
        const validBranches = toCreate.filter((_, index) => 
          !validationErrors.some(error => error.index === index)
        );
        
        if (validBranches.length > 0) {
          const createdBranches = await Branch.insertMany(validBranches, {
            ordered: false,
            rawResult: true,
          });
          results.created = createdBranches.insertedCount || validBranches.length;
        }
      } else {
        const createdBranches = await Branch.insertMany(toCreate, {
          ordered: false,
          rawResult: true,
        });
        results.created = createdBranches.insertedCount || toCreate.length;
      }
    } catch (error) {
      if (error.writeErrors) {
        // Handle partial failures
        results.created = (error.insertedDocs && error.insertedDocs.length) || 0;
        error.writeErrors.forEach((writeError) => {
          results.errors.push({
            index: writeError.index,
            error: writeError.err.errmsg || 'Creation failed',
            data: toCreate[writeError.index],
          });
        });
      } else {
        throw error;
      }
    }
  }

  // Handle bulk updates
  if (toUpdate.length > 0) {
    const updateOps = toUpdate.map((branch) => ({
      updateOne: {
        filter: { _id: branch.id },
        update: {
          $set: {
            name: branch.name,
            branchHead: branch.branchHead,
            email: branch.email,
            phone: branch.phone,
            address: branch.address,
            city: branch.city,
            state: branch.state,
            country: branch.country,
            pinCode: branch.pinCode,
            sortOrder: branch.sortOrder,
          },
        },
        upsert: false,
      },
    }));

    try {
      const updateResult = await Branch.bulkWrite(updateOps, {
        ordered: false, // Continue processing even if some fail
      });
      results.updated = updateResult.modifiedCount || 0;
    } catch (error) {
      if (error.writeErrors) {
        // Handle partial failures
        results.updated = error.modifiedCount || 0;
        error.writeErrors.forEach((writeError) => {
          results.errors.push({
            index: writeError.index,
            error: writeError.err.errmsg || 'Update failed',
            data: toUpdate[writeError.index],
          });
        });
      } else {
        throw error;
      }
    }
  }

  return results;
};

export {
  createBranch,
  queryBranches,
  getBranchById,
  getBranchByEmail,
  getBranchByPhone,
  updateBranchById,
  deleteBranchById,
  bulkImportBranches,
}; 