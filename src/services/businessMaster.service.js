import httpStatus from 'http-status';
import { BusinessMaster } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

/**
 * Create a business master
 * @param {Object} businessMasterBody
 * @returns {Promise<BusinessMaster>}
 */
const createBusinessMaster = async (businessMasterBody) => {
  const businessMaster = await BusinessMaster.create(businessMasterBody);
  return businessMaster;
};

/**
 * Query for business masters
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (if not provided, returns all results)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryBusinessMasters = async (filter, options) => {
  // Create a new filter object to avoid modifying the original
  const mongoFilter = { ...filter };
  
  // Remove empty or null values from filter
  Object.keys(mongoFilter).forEach(key => {
    if (mongoFilter[key] === '' || mongoFilter[key] === null || mongoFilter[key] === undefined) {
      delete mongoFilter[key];
    }
  });
  
  // Handle global search across multiple fields
  if (mongoFilter.search) {
    const searchValue = mongoFilter.search;
    const searchRegex = { $regex: searchValue, $options: 'i' };
    
    // Create an $or condition to search across multiple fields
    mongoFilter.$or = [
      { name: searchRegex },
    ];
    
    // Remove the search parameter as it's now handled by $or
    delete mongoFilter.search;
  }
  
  // Handle individual field filters (only if no global search)
  if (!mongoFilter.$or) {
    // If name filter exists, convert it to case-insensitive regex
    if (mongoFilter.name) {
      mongoFilter.name = { $regex: mongoFilter.name, $options: 'i' };
    }
  }

  const businessMasters = await BusinessMaster.paginate(mongoFilter, options);
  return businessMasters;
};

/**
 * Get business master by id
 * @param {ObjectId} id
 * @returns {Promise<BusinessMaster>}
 */
const getBusinessMasterById = async (id) => {
  return BusinessMaster.findById(id);
};

/**
 * Update business master by id
 * @param {ObjectId} businessMasterId
 * @param {Object} updateBody
 * @returns {Promise<BusinessMaster>}
 */
const updateBusinessMasterById = async (businessMasterId, updateBody) => {
  const businessMaster = await getBusinessMasterById(businessMasterId);
  if (!businessMaster) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Business Master not found');
  }
  
  Object.assign(businessMaster, updateBody);
  await businessMaster.save();
  return businessMaster;
};

/**
 * Delete business master by id
 * @param {ObjectId} businessMasterId
 * @returns {Promise<BusinessMaster>}
 */
const deleteBusinessMasterById = async (businessMasterId) => {
  const businessMaster = await getBusinessMasterById(businessMasterId);
  if (!businessMaster) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Business Master not found');
  }
  await businessMaster.remove();
  return businessMaster;
};

/**
 * Bulk import business masters
 * @param {Array} businessMastersData
 * @returns {Promise<Object>}
 */
const bulkImportBusinessMasters = async (businessMastersData) => {
  const results = {
    success: [],
    errors: [],
    total: businessMastersData.length,
  };

  for (const data of businessMastersData) {
    try {
      const businessMaster = await BusinessMaster.create(data);
      results.success.push(businessMaster);
    } catch (error) {
      results.errors.push({
        data,
        error: error.message,
      });
    }
  }

  return results;
};

export {
  createBusinessMaster,
  queryBusinessMasters,
  getBusinessMasterById,
  updateBusinessMasterById,
  deleteBusinessMasterById,
  bulkImportBusinessMasters,
};
