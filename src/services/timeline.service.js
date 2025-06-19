import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import Timeline from '../models/timeline.model.js';
import Activity from '../models/activity.model.js';
import Client from '../models/client.model.js';
import TeamMember from '../models/teamMember.model.js';

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
 * Validate if team member ID exists
 * @param {string} teamMemberId
 * @returns {Promise<boolean>}
 */
const validateTeamMember = async (teamMemberId) => {
  if (!mongoose.Types.ObjectId.isValid(teamMemberId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid team member ID format');
  }
  const teamMember = await TeamMember.findById(teamMemberId);
  if (!teamMember) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Team member not found');
  }
  return true;
};

/**
 * Create a timeline
 * @param {Object} timelineBody
 * @returns {Promise<Timeline>}
 */
const createTimeline = async (timelineBody) => {
  await validateActivity(timelineBody.activity);
  await validateClient(timelineBody.client);
  await validateTeamMember(timelineBody.assignedMember);
  
  const timeline = await Timeline.create(timelineBody);
  return timeline.populate([
    { path: 'activity', select: 'name' },
    { path: 'client', select: 'name email' },
    { path: 'assignedMember', select: 'name email' }
  ]);
};

/**
 * Query for timelines
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryTimelines = async (filter, options) => {
  const mongoFilter = { ...filter };
  
  // If udin filter exists, convert it to case-insensitive regex
  if (mongoFilter.udin) {
    mongoFilter.udin = { $regex: mongoFilter.udin, $options: 'i' };
  }

  const timelines = await Timeline.paginate(mongoFilter, {
    sortBy: options.sortBy || 'dueDate:asc',
    limit: options.limit,
    page: options.page,
    populate: 'activity,client,assignedMember',
  });
  return timelines;
};

/**
 * Get timeline by id
 * @param {ObjectId} id
 * @returns {Promise<Timeline>}
 */
const getTimelineById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid timeline ID format');
  }
  const timeline = await Timeline.findById(id).populate([
    { path: 'activity', select: 'name' },
    { path: 'client', select: 'name email' },
    { path: 'assignedMember', select: 'name email' }
  ]);
  if (!timeline) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Timeline not found');
  }
  return timeline;
};

/**
 * Update timeline by id
 * @param {ObjectId} timelineId
 * @param {Object} updateBody
 * @returns {Promise<Timeline>}
 */
const updateTimelineById = async (timelineId, updateBody) => {
  const timeline = await getTimelineById(timelineId);
  
  if (updateBody.activity) {
    await validateActivity(updateBody.activity);
  }
  if (updateBody.client) {
    await validateClient(updateBody.client);
  }
  if (updateBody.assignedMember) {
    await validateTeamMember(updateBody.assignedMember);
  }
  
  Object.assign(timeline, updateBody);
  await timeline.save();
  return timeline.populate([
    { path: 'activity', select: 'name' },
    { path: 'client', select: 'name email' },
    { path: 'assignedMember', select: 'name email' }
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
 * Bulk import timelines (create and update)
 * @param {Array} timelines - Array of timeline objects with optional id for updates
 * @returns {Promise<Object>} - Result with created and updated counts
 */
const bulkImportTimelines = async (timelines) => {
  const results = {
    created: 0,
    updated: 0,
    errors: [],
  };

  // Separate timelines for creation and update
  const toCreate = timelines.filter((timeline) => !timeline.id);
  const toUpdate = timelines.filter((timeline) => timeline.id);

  // Handle bulk creation with validation
  if (toCreate.length > 0) {
    try {
      // Validate all references for timelines to be created
      const allActivityIds = toCreate.map(t => t.activity);
      const allClientIds = toCreate.map(t => t.client);
      const allTeamMemberIds = toCreate.map(t => t.assignedMember);

      const uniqueActivityIds = [...new Set(allActivityIds)];
      const uniqueClientIds = [...new Set(allClientIds)];
      const uniqueTeamMemberIds = [...new Set(allTeamMemberIds)];

      // Validate all references
      const [validActivities, validClients, validTeamMembers] = await Promise.all([
        Activity.find({ _id: { $in: uniqueActivityIds } }),
        Client.find({ _id: { $in: uniqueClientIds } }),
        TeamMember.find({ _id: { $in: uniqueTeamMemberIds } })
      ]);

      const validActivityIds = validActivities.map(a => a._id.toString());
      const validClientIds = validClients.map(c => c._id.toString());
      const validTeamMemberIds = validTeamMembers.map(tm => tm._id.toString());

      // Check for invalid references
      const invalidActivityIds = uniqueActivityIds.filter(id => !validActivityIds.includes(id));
      const invalidClientIds = uniqueClientIds.filter(id => !validClientIds.includes(id));
      const invalidTeamMemberIds = uniqueTeamMemberIds.filter(id => !validTeamMemberIds.includes(id));

      const validationErrors = [];

      // Add validation errors for invalid references
      if (invalidActivityIds.length > 0) {
        invalidActivityIds.forEach((invalidId) => {
          const timelinesWithInvalidActivity = toCreate.filter(t => t.activity === invalidId);
          timelinesWithInvalidActivity.forEach((t) => {
            validationErrors.push({
              index: toCreate.indexOf(t),
              field: 'activity',
              value: invalidId,
            });
          });
        });
      }

      if (invalidClientIds.length > 0) {
        invalidClientIds.forEach((invalidId) => {
          const timelinesWithInvalidClient = toCreate.filter(t => t.client === invalidId);
          timelinesWithInvalidClient.forEach((t) => {
            validationErrors.push({
              index: toCreate.indexOf(t),
              field: 'client',
              value: invalidId,
            });
          });
        });
      }

      if (invalidTeamMemberIds.length > 0) {
        invalidTeamMemberIds.forEach((invalidId) => {
          const timelinesWithInvalidTeamMember = toCreate.filter(t => t.assignedMember === invalidId);
          timelinesWithInvalidTeamMember.forEach((t) => {
            validationErrors.push({
              index: toCreate.indexOf(t),
              field: 'assignedMember',
              value: invalidId,
            });
          });
        });
      }

      if (validationErrors.length > 0) {
        validationErrors.forEach((error) => {
          results.errors.push({
            index: error.index,
            error: `Invalid ${error.field}: ${error.value}`,
            data: toCreate[error.index],
          });
        });
        // Remove timelines with validation errors from creation
        const validTimelines = toCreate.filter((_, index) =>
          !validationErrors.some(error => error.index === index)
        );

        if (validTimelines.length > 0) {
          const createdTimelines = await Timeline.insertMany(validTimelines, {
            ordered: false,
            rawResult: true,
          });
          results.created = createdTimelines.insertedCount || validTimelines.length;
        }
      } else {
        const createdTimelines = await Timeline.insertMany(toCreate, {
          ordered: false,
          rawResult: true,
        });
        results.created = createdTimelines.insertedCount || toCreate.length;
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
    const updateOps = toUpdate.map((timeline) => ({
      updateOne: {
        filter: { _id: timeline.id },
        update: {
          $set: {
            activity: timeline.activity,
            client: timeline.client,
            frequency: timeline.frequency,
            frequencyCount: timeline.frequencyCount,
            udin: timeline.udin,
            turnover: timeline.turnover,
            assignedMember: timeline.assignedMember,
            dueDate: timeline.dueDate,
          },
        },
        upsert: false,
      },
    }));

    try {
      const updateResult = await Timeline.bulkWrite(updateOps, {
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
  createTimeline,
  queryTimelines,
  getTimelineById,
  updateTimelineById,
  deleteTimelineById,
  bulkImportTimelines,
}; 