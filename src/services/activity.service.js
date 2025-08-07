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
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
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
  Object.assign(activity, updateBody);
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
      if (activity.dueDate !== undefined) updateData.dueDate = activity.dueDate;
      if (activity.frequency !== undefined) updateData.frequency = activity.frequency;
      if (activity.frequencyConfig !== undefined) updateData.frequencyConfig = activity.frequencyConfig;
      
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

export { createActivity, queryActivities, getActivityById, updateActivityById, deleteActivityById, bulkImportActivities }; 