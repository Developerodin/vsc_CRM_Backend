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
  await activity.remove();
  return activity;
};

export {
  createActivity,
  queryActivities,
  getActivityById,
  updateActivityById,
  deleteActivityById,
}; 