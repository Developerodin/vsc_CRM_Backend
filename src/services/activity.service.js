import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import Activity from '../models/activity.model.js';



/**
 * Create an activity
 * @param {Object} activityBody
 * @returns {Promise<Activity>}
 */
const createActivity = async (activityBody) => {
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
  const mongoFilter = { ...filter };
  if (mongoFilter.name) {
    mongoFilter.name = { $regex: mongoFilter.name, $options: 'i' };
  }
  const activities = await Activity.paginate(mongoFilter, options);
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
      if (subactivity._id) {
        // This is an existing subactivity - find and update it
        const existingSubactivity = activity.subactivities.id(subactivity._id);
        if (existingSubactivity) {
          // Update existing subactivity
          Object.assign(existingSubactivity, subactivity);
          processedSubactivities.push(existingSubactivity);
        }
      } else {
        // This is a new subactivity - add it
        processedSubactivities.push(subactivity);
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

  // Separate activities for creation and update
  const toCreate = activities.filter((activity) => !activity.id);
  const toUpdate = activities.filter((activity) => activity.id);

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
  
  activity.subactivities.push(subactivityBody);
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
  
  Object.assign(subactivity, updateBody);
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