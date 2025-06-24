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
 * Validate frequency configuration based on frequency type
 * @param {string} frequency
 * @param {Object} frequencyConfig
 * @returns {Promise<boolean>}
 */
const validateFrequencyConfig = (frequency, frequencyConfig) => {
  if (!frequencyConfig) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'frequencyConfig is required');
  }

  switch (frequency) {
    case 'Hourly':
      if (!frequencyConfig.hourlyInterval || frequencyConfig.hourlyInterval < 1 || frequencyConfig.hourlyInterval > 24) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'For Hourly frequency, hourlyInterval (1-24) is required');
      }
      break;
    case 'Daily':
      if (!frequencyConfig.dailyTime || !/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(frequencyConfig.dailyTime)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'For Daily frequency, dailyTime in format "HH:MM AM/PM" is required');
      }
      break;
    case 'Weekly':
      if (!frequencyConfig.weeklyDays || frequencyConfig.weeklyDays.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'For Weekly frequency, weeklyDays array is required');
      }
      if (!frequencyConfig.weeklyTime || !/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(frequencyConfig.weeklyTime)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'For Weekly frequency, weeklyTime in format "HH:MM AM/PM" is required');
      }
      break;
    case 'Monthly':
      if (!frequencyConfig.monthlyDay || frequencyConfig.monthlyDay < 1 || frequencyConfig.monthlyDay > 31) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'For Monthly frequency, monthlyDay (1-31) is required');
      }
      if (!frequencyConfig.monthlyTime || !/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(frequencyConfig.monthlyTime)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'For Monthly frequency, monthlyTime in format "HH:MM AM/PM" is required');
      }
      break;
    case 'Quarterly':
      if (!frequencyConfig.quarterlyMonths || frequencyConfig.quarterlyMonths.length === 0) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'For Quarterly frequency, quarterlyMonths array is required');
      }
      if (frequencyConfig.quarterlyMonths.length !== 4) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'For Quarterly frequency, quarterlyMonths must have exactly 4 months');
      }
      if (!frequencyConfig.quarterlyDay || frequencyConfig.quarterlyDay < 1 || frequencyConfig.quarterlyDay > 31) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'For Quarterly frequency, quarterlyDay (1-31) is required');
      }
      if (!frequencyConfig.quarterlyTime || !/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(frequencyConfig.quarterlyTime)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'For Quarterly frequency, quarterlyTime in format "HH:MM AM/PM" is required');
      }
      break;
    case 'Yearly':
      if (!frequencyConfig.yearlyMonth) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'For Yearly frequency, yearlyMonth is required');
      }
      if (!frequencyConfig.yearlyDate || frequencyConfig.yearlyDate < 1 || frequencyConfig.yearlyDate > 31) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'For Yearly frequency, yearlyDate (1-31) is required');
      }
      if (!frequencyConfig.yearlyTime || !/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(frequencyConfig.yearlyTime)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'For Yearly frequency, yearlyTime in format "HH:MM AM/PM" is required');
      }
      break;
    default:
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid frequency type');
  }
  return true;
};

/**
 * Clean frequency configuration to keep only relevant fields based on frequency type
 * @param {string} frequency
 * @param {Object} frequencyConfig
 * @returns {Object} - Cleaned frequency configuration
 */
const cleanFrequencyConfig = (frequency, frequencyConfig) => {
  if (!frequencyConfig) return frequencyConfig;

  const cleanedConfig = {};

  switch (frequency) {
    case 'Hourly':
      if (frequencyConfig.hourlyInterval) {
        cleanedConfig.hourlyInterval = frequencyConfig.hourlyInterval;
      }
      break;
    case 'Daily':
      if (frequencyConfig.dailyTime) {
        cleanedConfig.dailyTime = frequencyConfig.dailyTime;
      }
      break;
    case 'Weekly':
      if (frequencyConfig.weeklyDays && frequencyConfig.weeklyDays.length > 0) {
        cleanedConfig.weeklyDays = frequencyConfig.weeklyDays;
      }
      if (frequencyConfig.weeklyTime) {
        cleanedConfig.weeklyTime = frequencyConfig.weeklyTime;
      }
      break;
    case 'Monthly':
      if (frequencyConfig.monthlyDay) {
        cleanedConfig.monthlyDay = frequencyConfig.monthlyDay;
      }
      if (frequencyConfig.monthlyTime) {
        cleanedConfig.monthlyTime = frequencyConfig.monthlyTime;
      }
      break;
    case 'Quarterly':
      if (frequencyConfig.quarterlyMonths && frequencyConfig.quarterlyMonths.length > 0) {
        cleanedConfig.quarterlyMonths = frequencyConfig.quarterlyMonths;
      }
      if (frequencyConfig.quarterlyDay) {
        cleanedConfig.quarterlyDay = frequencyConfig.quarterlyDay;
      }
      if (frequencyConfig.quarterlyTime) {
        cleanedConfig.quarterlyTime = frequencyConfig.quarterlyTime;
      }
      break;
    case 'Yearly':
      if (frequencyConfig.yearlyMonth) {
        cleanedConfig.yearlyMonth = frequencyConfig.yearlyMonth;
      }
      if (frequencyConfig.yearlyDate) {
        cleanedConfig.yearlyDate = frequencyConfig.yearlyDate;
      }
      if (frequencyConfig.yearlyTime) {
        cleanedConfig.yearlyTime = frequencyConfig.yearlyTime;
      }
      break;
  }

  return cleanedConfig;
};

/**
 * Create timeline(s) - handles both single client and multiple clients
 * @param {Object} timelineBody
 * @returns {Promise<Timeline|Array<Timeline>>}
 */
const createTimeline = async (timelineBody) => {
  await validateActivity(timelineBody.activity);
  await validateTeamMember(timelineBody.assignedMember);
  validateFrequencyConfig(timelineBody.frequency, timelineBody.frequencyConfig);
  
  // Clean frequency configuration to keep only relevant fields
  const cleanedTimelineBody = {
    ...timelineBody,
    frequencyConfig: cleanFrequencyConfig(timelineBody.frequency, timelineBody.frequencyConfig)
  };

  // Ensure client is always an array
  let clientArray = timelineBody.client;
  if (!Array.isArray(clientArray)) {
    clientArray = [clientArray];
  }

  // Validate all clients
  for (const clientId of clientArray) {
    await validateClient(clientId);
  }

  // Create separate timeline entries for each client
  const timelinesToCreate = clientArray.map(clientId => ({
    ...cleanedTimelineBody,
    client: clientId
  }));

  const createdTimelines = await Timeline.insertMany(timelinesToCreate);
  
  // Populate all created timelines
  const populatedTimelines = await Timeline.populate(createdTimelines, [
    { path: 'activity', select: 'name' },
    { path: 'client', select: 'name email' },
    { path: 'assignedMember', select: 'name email' }
  ]);

  // Return single timeline if only one client, array if multiple clients
  return clientArray.length === 1 ? populatedTimelines[0] : populatedTimelines;
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

  if (mongoFilter.status === '') {
    delete mongoFilter.status;
  }

  if (mongoFilter.activityName === '') {
    delete mongoFilter.activityName;
  }

  // Handle activity name filtering
  if (mongoFilter.activityName) {
    // Find activities that match the name filter
    const activities = await Activity.find({
      name: { $regex: mongoFilter.activityName, $options: 'i' }
    }).select('_id');
    
    // Get the activity IDs
    const activityIds = activities.map(activity => activity._id);
    
    // If no activities found, return empty result
    if (activityIds.length === 0) {
      return {
        results: [],
        page: options.page || 1,
        limit: options.limit || 10,
        totalPages: 0,
        totalResults: 0,
      };
    }
    
    // Replace activityName filter with activity ID filter
    mongoFilter.activity = { $in: activityIds };
    delete mongoFilter.activityName;
  }

  const timelines = await Timeline.paginate(mongoFilter, {
    sortBy: options.sortBy || 'createdAt:desc',
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
  if (updateBody.frequency && updateBody.frequencyConfig) {
    validateFrequencyConfig(updateBody.frequency, updateBody.frequencyConfig);
  }
  
  // Clean frequency configuration if it's being updated
  if (updateBody.frequencyConfig) {
    const frequency = updateBody.frequency || timeline.frequency;
    updateBody.frequencyConfig = cleanFrequencyConfig(frequency, updateBody.frequencyConfig);
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
      // Expand timelines with multiple clients into separate entries
      const expandedTimelines = [];
      
      toCreate.forEach((timeline, originalIndex) => {
        if (timeline.clients && Array.isArray(timeline.clients)) {
          // Create separate timeline entry for each client
          timeline.clients.forEach((clientId) => {
            const expandedTimeline = {
              ...timeline,
              client: clientId, // Single client reference
              originalIndex, // Keep track of original index for error reporting
            };
            delete expandedTimeline.clients; // Remove the clients array
            expandedTimelines.push(expandedTimeline);
          });
        } else {
          // Single client or no clients specified
          const expandedTimeline = {
            ...timeline,
            originalIndex,
          };
          if (timeline.client) {
            expandedTimeline.client = timeline.client;
          }
          delete expandedTimeline.clients;
          expandedTimelines.push(expandedTimeline);
        }
      });

      // Clean frequency configuration for all timelines to be created
      expandedTimelines.forEach((timeline) => {
        if (timeline.frequencyConfig) {
          timeline.frequencyConfig = cleanFrequencyConfig(timeline.frequency, timeline.frequencyConfig);
        }
      });

      // Validate all references for timelines to be created
      const allActivityIds = expandedTimelines.map(t => t.activity);
      const allClientIds = expandedTimelines.map(t => t.client);
      const allTeamMemberIds = expandedTimelines.map(t => t.assignedMember);

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
          const timelinesWithInvalidActivity = expandedTimelines.filter(t => t.activity === invalidId);
          timelinesWithInvalidActivity.forEach((t) => {
            validationErrors.push({
              index: t.originalIndex,
              field: 'activity',
              value: invalidId,
            });
          });
        });
      }

      if (invalidClientIds.length > 0) {
        invalidClientIds.forEach((invalidId) => {
          const timelinesWithInvalidClient = expandedTimelines.filter(t => t.client === invalidId);
          timelinesWithInvalidClient.forEach((t) => {
            validationErrors.push({
              index: t.originalIndex,
              field: 'client',
              value: invalidId,
            });
          });
        });
      }

      if (invalidTeamMemberIds.length > 0) {
        invalidTeamMemberIds.forEach((invalidId) => {
          const timelinesWithInvalidTeamMember = expandedTimelines.filter(t => t.assignedMember === invalidId);
          timelinesWithInvalidTeamMember.forEach((t) => {
            validationErrors.push({
              index: t.originalIndex,
              field: 'assignedMember',
              value: invalidId,
            });
          });
        });
      }

      // Validate frequency configurations
      expandedTimelines.forEach((timeline) => {
        try {
          validateFrequencyConfig(timeline.frequency, timeline.frequencyConfig);
        } catch (error) {
          validationErrors.push({
            index: timeline.originalIndex,
            field: 'frequencyConfig',
            value: error.message,
          });
        }
      });

      if (validationErrors.length > 0) {
        validationErrors.forEach((error) => {
          results.errors.push({
            index: error.index,
            error: `Invalid ${error.field}: ${error.value}`,
            data: toCreate[error.index],
          });
        });
        // Remove timelines with validation errors from creation
        const validTimelines = expandedTimelines.filter((timeline) =>
          !validationErrors.some(error => error.index === timeline.originalIndex)
        );

        if (validTimelines.length > 0) {
          // Remove originalIndex before inserting
          const timelinesToInsert = validTimelines.map(({ originalIndex, ...timeline }) => timeline);
          const createdTimelines = await Timeline.insertMany(timelinesToInsert, {
            ordered: false,
            rawResult: true,
          });
          results.created = createdTimelines.insertedCount || timelinesToInsert.length;
        }
      } else {
        // Remove originalIndex before inserting
        const timelinesToInsert = expandedTimelines.map(({ originalIndex, ...timeline }) => timeline);
        const createdTimelines = await Timeline.insertMany(timelinesToInsert, {
          ordered: false,
          rawResult: true,
        });
        results.created = createdTimelines.insertedCount || timelinesToInsert.length;
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
    // Clean frequency configuration for all timelines to be updated
    toUpdate.forEach((timeline) => {
      if (timeline.frequencyConfig) {
        timeline.frequencyConfig = cleanFrequencyConfig(timeline.frequency, timeline.frequencyConfig);
      }
    });

    const updateOps = toUpdate.map((timeline) => ({
      updateOne: {
        filter: { _id: timeline.id },
        update: {
          $set: {
            activity: timeline.activity,
            client: timeline.client,
            status: timeline.status,
            frequency: timeline.frequency,
            frequencyConfig: timeline.frequencyConfig,
            udin: timeline.udin,
            turnover: timeline.turnover,
            assignedMember: timeline.assignedMember,
            startDate: timeline.startDate,
            endDate: timeline.endDate,
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