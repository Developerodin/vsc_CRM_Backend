import httpStatus from 'http-status';
import { EntityTypeMaster } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

/**
 * Create an entity type master
 * @param {Object} entityTypeMasterBody
 * @returns {Promise<EntityTypeMaster>}
 */
const createEntityTypeMaster = async (entityTypeMasterBody) => {
  const entityTypeMaster = await EntityTypeMaster.create(entityTypeMasterBody);
  return entityTypeMaster;
};

/**
 * Query for entity type masters
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryEntityTypeMasters = async (filter, options) => {
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

  const entityTypeMasters = await EntityTypeMaster.paginate(mongoFilter, options);
  return entityTypeMasters;
};

/**
 * Get entity type master by id
 * @param {ObjectId} id
 * @returns {Promise<EntityTypeMaster>}
 */
const getEntityTypeMasterById = async (id) => {
  return EntityTypeMaster.findById(id);
};

/**
 * Update entity type master by id
 * @param {ObjectId} entityTypeMasterId
 * @param {Object} updateBody
 * @returns {Promise<EntityTypeMaster>}
 */
const updateEntityTypeMasterById = async (entityTypeMasterId, updateBody) => {
  const entityTypeMaster = await getEntityTypeMasterById(entityTypeMasterId);
  if (!entityTypeMaster) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Entity Type Master not found');
  }
  
  Object.assign(entityTypeMaster, updateBody);
  await entityTypeMaster.save();
  return entityTypeMaster;
};

/**
 * Delete entity type master by id
 * @param {ObjectId} entityTypeMasterId
 * @returns {Promise<EntityTypeMaster>}
 */
const deleteEntityTypeMasterById = async (entityTypeMasterId) => {
  const entityTypeMaster = await getEntityTypeMasterById(entityTypeMasterId);
  if (!entityTypeMaster) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Entity Type Master not found');
  }
  await entityTypeMaster.remove();
  return entityTypeMaster;
};

/**
 * Bulk import entity type masters
 * @param {Array} entityTypeMastersData
 * @returns {Promise<Object>}
 */
const bulkImportEntityTypeMasters = async (entityTypeMastersData) => {
  const results = {
    success: [],
    errors: [],
    total: entityTypeMastersData.length,
  };

  for (const data of entityTypeMastersData) {
    try {
      const entityTypeMaster = await EntityTypeMaster.create(data);
      results.success.push(entityTypeMaster);
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
  createEntityTypeMaster,
  queryEntityTypeMasters,
  getEntityTypeMasterById,
  updateEntityTypeMasterById,
  deleteEntityTypeMasterById,
  bulkImportEntityTypeMasters,
};
