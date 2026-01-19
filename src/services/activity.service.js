import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import Activity from '../models/activity.model.js';
import cache from '../utils/cache.js';

/**
 * Normalize frequencyConfig to ensure yearlyMonth is a string (not array)
 * @param {Object} frequencyConfig - The frequency configuration object
 * @returns {Object} - Normalized frequency configuration
 */
const normalizeFrequencyConfig = (frequencyConfig) => {
  if (!frequencyConfig || typeof frequencyConfig !== 'object') {
    return frequencyConfig;
  }
  
  const normalized = { ...frequencyConfig };
  
  // Convert yearlyMonth array to string if needed (model expects string)
  if (normalized.yearlyMonth && Array.isArray(normalized.yearlyMonth)) {
    normalized.yearlyMonth = normalized.yearlyMonth.length > 0 ? normalized.yearlyMonth[0] : null;
  }
  
  return normalized;
};

/**
 * Normalize subactivity data, including nested frequencyConfig
 * @param {Object} subactivity - The subactivity object
 * @returns {Object} - Normalized subactivity
 */
const normalizeSubactivity = (subactivity) => {
  if (!subactivity || typeof subactivity !== 'object') {
    return subactivity;
  }
  
  const normalized = { ...subactivity };
  
  // Normalize frequencyConfig if present
  if (normalized.frequencyConfig) {
    normalized.frequencyConfig = normalizeFrequencyConfig(normalized.frequencyConfig);
  }
  
  return normalized;
};

/**
 * Create an activity
 * @param {Object} activityBody
 * @returns {Promise<Activity>}
 */
const createActivity = async (activityBody) => {
  // Normalize subactivities if present
  if (activityBody.subactivities && Array.isArray(activityBody.subactivities)) {
    activityBody.subactivities = activityBody.subactivities.map(normalizeSubactivity);
  }
  
  const activity = await Activity.create(activityBody);
  return activity;
};

/**
 * Query for activities
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (if not provided, returns all results)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryActivities = async (filter, options) => {
  // Check cache for large limit queries (like limit=1000)
  const isLargeQuery = options.limit && parseInt(options.limit) >= 1000;
  let cacheKey = null;
  
  if (isLargeQuery) {
    cacheKey = cache.generateKey('activities-large', { 
      filter: JSON.stringify(filter),
      options: JSON.stringify(options)
    });
    
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
  }

  const mongoFilter = { ...filter };
  if (mongoFilter.name) {
    mongoFilter.name = { $regex: mongoFilter.name, $options: 'i' };
  }
  
  const activities = await Activity.paginate(mongoFilter, options);
  
  // Cache large queries for 5 minutes
  if (isLargeQuery && cacheKey) {
    cache.set(cacheKey, activities, 5 * 60 * 1000);
  }
  
  return activities;
};

/**
 * Get activity by id
 * @param {ObjectId} id
 * @returns {Promise<Activity>}
 */
const getActivityById = async (id) => {
  const activity = await Activity.findById(id);
  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found');
  }
  return activity;
};

/**
 * Update activity by id
 * @param {ObjectId} activityId
 * @param {Object} updateBody
 * @returns {Promise<Activity>}
 */
const updateActivityById = async (activityId, updateBody) => {
  const activity = await getActivityById(activityId);
  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found');
  }
  
  // Handle subactivity updates if provided
  if (updateBody.subactivities && Array.isArray(updateBody.subactivities)) {
    // Extract subactivities from update body
    const { subactivities, ...otherUpdates } = updateBody;
    
    // Process subactivities array - handle updates and additions
    const processedSubactivities = [];
    
    subactivities.forEach(subactivity => {
      // Normalize subactivity data first
      const normalizedSubactivity = normalizeSubactivity(subactivity);
      
      if (normalizedSubactivity._id) {
        // This is an existing subactivity - find and update it
        const existingSubactivity = activity.subactivities.id(normalizedSubactivity._id);
        if (existingSubactivity) {
          // Update existing subactivity
          Object.assign(existingSubactivity, normalizedSubactivity);
          processedSubactivities.push(existingSubactivity);
        }
      } else {
        // This is a new subactivity - add it
        processedSubactivities.push(normalizedSubactivity);
      }
    });
    
    // Replace the entire subactivities array with processed one
    activity.subactivities = processedSubactivities;
    
    // Apply other updates
    Object.assign(activity, otherUpdates);
  } else {
    // No subactivities to update, apply all updates normally
    Object.assign(activity, updateBody);
  }
  
  await activity.save();
  return activity;
};

/**
 * Delete activity by id
 * @param {ObjectId} activityId
 * @returns {Promise<Activity>}
 */
const deleteActivityById = async (activityId) => {
  const activity = await getActivityById(activityId);
  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found');
  }
  await activity.deleteOne();
  return activity;
};

/**
 * Bulk import activities (create and update)
 * @param {Array} activities - Array of activity objects with optional id for updates
 * @returns {Promise<Object>} - Result with created and updated counts
 */
const bulkImportActivities = async (activities) => {
  const results = {
    created: 0,
    updated: 0,
    errors: [],
  };

  // Normalize all activities first
  const normalizedActivities = activities.map(activity => {
    const normalized = { ...activity };
    // Normalize subactivities if present
    if (normalized.subactivities && Array.isArray(normalized.subactivities)) {
      normalized.subactivities = normalized.subactivities.map(normalizeSubactivity);
    }
    return normalized;
  });
  
  // Separate activities for creation and update
  const toCreate = normalizedActivities.filter((activity) => !activity.id);
  const toUpdate = normalizedActivities.filter((activity) => activity.id);

  // Handle bulk creation
  if (toCreate.length > 0) {
    try {
      const createdActivities = await Activity.insertMany(toCreate, {
        ordered: false, // Continue processing even if some fail
        rawResult: true,
      });
      results.created = createdActivities.insertedCount || toCreate.length;
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
    const updateOps = toUpdate.map((activity) => {
      const updateData = {
        name: activity.name,
        sortOrder: activity.sortOrder,
      };
      
      // Include optional fields if they exist
      if (activity.subactivities !== undefined) updateData.subactivities = activity.subactivities;
      
      return {
        updateOne: {
          filter: { _id: activity.id },
          update: { $set: updateData },
          upsert: false,
        },
      };
    });

    try {
      const updateResult = await Activity.bulkWrite(updateOps, {
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

/**
 * Create a subactivity for an activity
 * @param {ObjectId} activityId
 * @param {Object} subactivityBody
 * @returns {Promise<Activity>}
 */
const createSubactivity = async (activityId, subactivityBody) => {
  const activity = await getActivityById(activityId);
  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found');
  }
  
  // Normalize subactivity data before adding
  const normalizedSubactivity = normalizeSubactivity(subactivityBody);
  activity.subactivities.push(normalizedSubactivity);
  await activity.save();
  return activity;
};

/**
 * Update a subactivity
 * @param {ObjectId} activityId
 * @param {ObjectId} subactivityId
 * @param {Object} updateBody
 * @returns {Promise<Activity>}
 */
const updateSubactivity = async (activityId, subactivityId, updateBody) => {
  const activity = await getActivityById(activityId);
  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found');
  }
  
  const subactivity = activity.subactivities.id(subactivityId);
  if (!subactivity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subactivity not found');
  }
  
  // Normalize update body before applying
  const normalizedUpdateBody = normalizeSubactivity(updateBody);
  Object.assign(subactivity, normalizedUpdateBody);
  await activity.save();
  return activity;
};

/**
 * Get a specific subactivity by ID
 * @param {ObjectId} activityId
 * @param {ObjectId} subactivityId
 * @returns {Promise<Object>}
 */
const getSubactivityById = async (activityId, subactivityId) => {
  const activity = await getActivityById(activityId);
  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found');
  }
  
  const subactivity = activity.subactivities.id(subactivityId);
  if (!subactivity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subactivity not found');
  }
  
  return subactivity;
};

/**
 * Check if a subactivity exists
 * @param {ObjectId} activityId
 * @param {ObjectId} subactivityId
 * @returns {Promise<boolean>}
 */
const subactivityExists = async (activityId, subactivityId) => {
  try {
    await getSubactivityById(activityId, subactivityId);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Delete a subactivity
 * @param {ObjectId} activityId
 * @param {ObjectId} subactivityId
 * @returns {Promise<Activity>}
 */
const deleteSubactivity = async (activityId, subactivityId) => {
  const activity = await getActivityById(activityId);
  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found');
  }
  
  const subactivity = activity.subactivities.id(subactivityId);
  if (!subactivity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subactivity not found');
  }
  
  subactivity.deleteOne();
  await activity.save();
  return activity;
};

export { 
  createActivity, 
  queryActivities, 
  getActivityById, 
  updateActivityById, 
  deleteActivityById, 
  bulkImportActivities,
  createSubactivity,
  updateSubactivity,
  deleteSubactivity,
  getSubactivityById,
  subactivityExists
}; 