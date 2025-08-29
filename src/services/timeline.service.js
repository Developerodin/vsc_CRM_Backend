import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import Timeline from '../models/timeline.model.js';
import Activity from '../models/activity.model.js';
import Client from '../models/client.model.js';
import { hasBranchAccess, getUserBranchIds } from './role.service.js';

/**
 * Validate if activity ID exists
 * @param {string} activityId
 * @returns {Promise<boolean>}
 */
const validateActivity = async (activityId) => {
  if (!mongoose.Types.ObjectId.isValid(activityId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid activity ID format');
  }
  const activity = await Activity.findById(activityId);
  if (!activity) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Activity not found');
  }
  return true;
};

/**
 * Validate if client ID exists
 * @param {string} clientId
 * @returns {Promise<boolean>}
 */
const validateClient = async (clientId) => {
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid client ID format');
  }
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Client not found');
  }
  return true;
};

/**
 * Create a new timeline
 * @param {Object} timelineBody
 * @param {Object} user
 * @returns {Promise<Timeline>}
 */
const createTimeline = async (timelineBody, user = null) => {
  await validateActivity(timelineBody.activity);
  await validateClient(timelineBody.client);
  
  // Validate branch access if user is provided
  if (user && user.role && timelineBody.branch) {
    if (!hasBranchAccess(user.role, timelineBody.branch)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
  }

  const timeline = await Timeline.create(timelineBody);
  
  // Populate the created timeline
  const populatedTimeline = await Timeline.populate(timeline, [
    { path: 'activity', select: 'name' },
    { path: 'client', select: 'name email' }
  ]);

  return populatedTimeline;
};

/**
 * Query for timelines
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {Object} user - User object with role information
 * @returns {Promise<QueryResult>}
 */
const queryTimelines = async (filter, options, user) => {
  const mongoFilter = { ...filter };

  if (mongoFilter.status === '') {
    delete mongoFilter.status;
  }

  if (mongoFilter.activityName === '') {
    delete mongoFilter.activityName;
  }

  // Apply branch filtering based on user's access
  if (user && user.role) {
    // If specific branch is requested in filter
    if (mongoFilter.branch) {
      // Check if user has access to this specific branch
      if (!hasBranchAccess(user.role, mongoFilter.branch)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
      }
    } else {
      // Get user's allowed branch IDs
      const allowedBranchIds = getUserBranchIds(user.role);
      
      if (allowedBranchIds === null) {
        // User has access to all branches, no filtering needed
      } else if (allowedBranchIds.length > 0) {
        // Filter by user's allowed branches
        mongoFilter.branch = { $in: allowedBranchIds };
      } else {
        // User has no branch access
        throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
      }
    }
  }

  const result = await Timeline.paginate(mongoFilter, options);
  return result;
};

/**
 * Get timeline by id
 * @param {ObjectId} id
 * @returns {Promise<Timeline>}
 */
const getTimelineById = async (id) => {
  return Timeline.findById(id);
};

/**
 * Update timeline by id
 * @param {ObjectId} timelineId
 * @param {Object} updateBody
 * @param {Object} user
 * @returns {Promise<Timeline>}
 */
const updateTimelineById = async (timelineId, updateBody, user = null) => {
  const timeline = await getTimelineById(timelineId);
  
  // Validate branch access if user is provided and branch is being updated
  if (user && user.role && updateBody.branch) {
    if (!hasBranchAccess(user.role, updateBody.branch)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
  }
  
  if (updateBody.activity) {
    await validateActivity(updateBody.activity);
  }
  if (updateBody.client) {
    await validateClient(updateBody.client);
  }
  
  Object.assign(timeline, updateBody);
  await timeline.save();
  return timeline.populate([
    { path: 'activity', select: 'name' },
    { path: 'client', select: 'name email' }
  ]);
};

/**
 * Delete timeline by id
 * @param {ObjectId} timelineId
 * @returns {Promise<Timeline>}
 */
const deleteTimelineById = async (timelineId) => {
  const timeline = await getTimelineById(timelineId);
  await timeline.deleteOne();
  return timeline;
};

/**
 * Bulk import timelines
 * @param {Array} timelinesData
 * @returns {Promise<Object>}
 */
const bulkImportTimelines = async (timelinesData) => {
  const results = {
    created: [],
    updated: [],
    errors: []
  };

  for (let i = 0; i < timelinesData.length; i++) {
    const timelineData = timelinesData[i];
    
    try {
      // Validate required fields
      if (!timelineData.activity || !timelineData.client || !timelineData.branch) {
        results.errors.push({
          index: i,
          field: 'required_fields',
          value: 'Missing required fields: activity, client, or branch'
        });
        continue;
      }

      // Validate activity and client references
      try {
        await validateActivity(timelineData.activity);
        await validateClient(timelineData.client);
      } catch (error) {
        results.errors.push({
          index: i,
          field: 'reference_validation',
          value: error.message
        });
        continue;
      }

      // Check if timeline already exists (by ID if provided)
      if (timelineData.id) {
        const existingTimeline = await Timeline.findById(timelineData.id);
        if (existingTimeline) {
          // Update existing timeline
          Object.assign(existingTimeline, timelineData);
          delete existingTimeline.id; // Remove the id field
          await existingTimeline.save();
          results.updated.push({
            index: i,
            timeline: existingTimeline
          });
        } else {
          // Create new timeline with the provided ID
          delete timelineData.id;
          const newTimeline = await Timeline.create(timelineData);
          results.created.push({
            index: i,
            timeline: newTimeline
          });
        }
      } else {
        // Create new timeline
        const newTimeline = await Timeline.create(timelineData);
        results.created.push({
          index: i,
          timeline: newTimeline
        });
      }
    } catch (error) {
      results.errors.push({
        index: i,
        field: 'creation_error',
        value: error.message
      });
    }
  }

  return results;
};

export {
  createTimeline,
  queryTimelines,
  getTimelineById,
  updateTimelineById,
  deleteTimelineById,
  bulkImportTimelines,
};