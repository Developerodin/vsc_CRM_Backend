import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import Timeline from '../models/timeline.model.js';
import Activity from '../models/activity.model.js';
import Client from '../models/client.model.js';
import TeamMember from '../models/teamMember.model.js';
import { hasBranchAccess, getUserBranchIds } from './role.service.js';
import { generateFrequencyPeriods } from '../utils/frequencyGenerator.js';



/**
 * Initialize frequency status for a timeline
 * @param {Object} timeline - Timeline object
 * @returns {Array} - Array of frequency status objects
 */
const initializeFrequencyStatus = (timeline) => {
  if (!timeline.startDate || !timeline.endDate) {
    return [];
  }
  
  // Use the utility function which already returns the correct format
  return generateFrequencyPeriods(
    timeline.frequency,
    timeline.frequencyConfig,
    timeline.startDate,
    timeline.endDate
  );
};

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
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<Timeline|Array<Timeline>>}
 */
const createTimeline = async (timelineBody, user = null) => {
  await validateActivity(timelineBody.activity);
  await validateTeamMember(timelineBody.assignedMember);
  validateFrequencyConfig(timelineBody.frequency, timelineBody.frequencyConfig);
  
  // Validate branch access if user is provided
  if (user && user.role && timelineBody.branch) {
    if (!hasBranchAccess(user.role, timelineBody.branch)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
  }
  
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
  const timelinesToCreate = clientArray.map(clientId => {
    const timelineData = {
      ...cleanedTimelineBody,
      client: clientId
    };
    
    // Initialize frequency status if start and end dates are provided
    if (timelineData.startDate && timelineData.endDate) {
      timelineData.frequencyStatus = initializeFrequencyStatus(timelineData);
    }
    
    return timelineData;
  });

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

  if(mongoFilter.startDate === '') {
    delete mongoFilter.startDate;
  }
  
  if(mongoFilter.endDate === '') {
    delete mongoFilter.endDate;
  }

  if(mongoFilter.startDate || mongoFilter.endDate) {
    delete mongoFilter.today;
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

  // Handle "Today" filter
  if (mongoFilter.today === 'true') {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    const dateConditions = [];

    // Case 1: Both startDate and endDate are provided
    if (mongoFilter.startDate && mongoFilter.endDate) {
      dateConditions.push({
        $and: [
          { startDate: { $exists: true, $ne: null, $ne: "" } },
          { endDate: { $exists: true, $ne: null, $ne: "" } },
          { startDate: { $lte: endOfDay } },
          { endDate: { $gte: startOfDay } }
        ]
      });
    }
    // Case 2: Only startDate is provided - timeline starts before or on today
    else if (mongoFilter.startDate && !mongoFilter.endDate) {
      dateConditions.push({
        $and: [
          { startDate: { $exists: true, $ne: null, $ne: "" } },
          { startDate: { $lte: endOfDay } }
        ]
      });
    }
    // Case 3: Only endDate is provided - timeline ends after or on today
    else if (!mongoFilter.startDate && mongoFilter.endDate) {
      dateConditions.push({
        $and: [
          { endDate: { $exists: true, $ne: null, $ne: "" } },
          { endDate: { $gte: startOfDay } }
        ]
      });
    }

    dateConditions.push({
      $or: [
        { startDate: { $ne: "", $ne: null } },
        { endDate: { $ne: "", $ne: null } }
      ]
    });

    if (dateConditions.length > 0) {
      mongoFilter.$or = dateConditions;
    }
    
    delete mongoFilter.today;
  } else if (mongoFilter.today === 'false' || mongoFilter.today === '') {
    delete mongoFilter.today;
  }

  // Handle date range filtering
  if (mongoFilter.startDate || mongoFilter.endDate) {
    const startDateValue = mongoFilter?.startDate?.toISOString();
    const endDateValue = mongoFilter?.endDate?.toISOString();
    
    console.log('=== DATE FILTERING DEBUG ===');
    console.log('startDateValue:', startDateValue);
    console.log('endDateValue:', endDateValue);
    
    // Build date filter conditions
    const dateConditions = [];
    
    if (startDateValue) {
      // Parse the date string properly to avoid timezone issues
      let year, month, day;
      
      if (startDateValue.includes('T')) {
        // Handle ISO format: "2024-01-15T10:30:00Z" or "2024-01-15T10:30:00.000Z"
        const datePart = startDateValue.split('T')[0];
        [year, month, day] = datePart.split('-').map(Number);
      } else {
        // Handle simple format: "2024-01-15"
        [year, month, day] = startDateValue.split('-').map(Number);
      }
      
      // Validate the date
      const tempDate = new Date(year, month - 1, day);
      if (tempDate.getFullYear() !== year || tempDate.getMonth() !== month - 1 || tempDate.getDate() !== day) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Invalid startDate: ${startDateValue}. Please use YYYY-MM-DD format.`);
      }
      
      const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
      
      console.log('Filter startDate:', startDate);
      console.log('Filter startDate ISO:', startDate.toISOString());
      
      // For startDate filter: timeline should start on or after the specified date
      // Only include timelines that have a startDate field and it's >= the filter date
      dateConditions.push({
        $and: [
          { startDate: { $exists: true } },
          { startDate: { $ne: null } },
          { startDate: { $gte: startDate } }
        ]
      });
    }
    
    if (endDateValue) {
      // Parse the date string properly to avoid timezone issues
      let year, month, day;
      
      if (endDateValue.includes('T')) {
        // Handle ISO format: "2024-01-15T10:30:00Z" or "2024-01-15T10:30:00.000Z"
        const datePart = endDateValue.split('T')[0];
        [year, month, day] = datePart.split('-').map(Number);
      } else {
        // Handle simple format: "2024-01-15"
        [year, month, day] = endDateValue.split('-').map(Number);
      }
      
      // Validate the date
      const tempDate = new Date(year, month - 1, day);
      if (tempDate.getFullYear() !== year || tempDate.getMonth() !== month - 1 || tempDate.getDate() !== day) {
        throw new ApiError(httpStatus.BAD_REQUEST, `Invalid endDate: ${endDateValue}. Please use YYYY-MM-DD format.`);
      }
      
      const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
      
      console.log('Filter endDate:', endDate);
      console.log('Filter endDate ISO:', endDate.toISOString());
      
      // For endDate filter: timeline should end on or before the specified date
      // Only include timelines that have an endDate field and it's <= the filter date
      dateConditions.push({
        $and: [
          { endDate: { $exists: true } },
          { endDate: { $ne: null } },
          { endDate: { $lte: endDate } }
        ]
      });
    }
    
    // If both startDate and endDate are provided, use $and to combine them
    if (startDateValue && endDateValue) {
      let startYear, startMonth, startDay;
      let endYear, endMonth, endDay;
      
      if (startDateValue.includes('T')) {
        const startDatePart = startDateValue.split('T')[0];
        [startYear, startMonth, startDay] = startDatePart.split('-').map(Number);
      } else {
        [startYear, startMonth, startDay] = startDateValue.split('-').map(Number);
      }
      
      if (endDateValue.includes('T')) {
        const endDatePart = endDateValue.split('T')[0];
        [endYear, endMonth, endDay] = endDatePart.split('-').map(Number);
      } else {
        [endYear, endMonth, endDay] = endDateValue.split('-').map(Number);
      }
      
      const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
      const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
      
      mongoFilter.$and = [
        { startDate: { $exists: true } },
        { startDate: { $ne: null } },
        { startDate: { $gte: startDate } },
        { endDate: { $exists: true } },
        { endDate: { $ne: null } },
        { endDate: { $lte: endDate } }
      ];
      
      console.log('Combined date filter:', JSON.stringify(mongoFilter.$and, null, 2));
    } else {
      // If only one date is provided, use $or for the conditions
      if (mongoFilter.$or) {
        const existingOrFilter = mongoFilter.$or;
        mongoFilter.$or = [
          ...existingOrFilter,
          ...dateConditions
        ];
      } else {
        mongoFilter.$or = dateConditions;
      }
      
      console.log('Single date filter:', JSON.stringify(mongoFilter.$or, null, 2));
    }
    
    delete mongoFilter.startDate;
    delete mongoFilter.endDate;
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
 * @param {Object} user - User object with role information (optional)
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
  if (updateBody.assignedMember) {
    await validateTeamMember(updateBody.assignedMember);
  }
  if (updateBody.frequency && updateBody.frequencyConfig) {
    validateFrequencyConfig(updateBody.frequency, updateBody.frequencyConfig);
  }
  
  // Validate frequency configuration if it's being updated
  if (updateBody.frequencyConfig) {
    const frequency = updateBody.frequency || timeline.frequency;
    validateFrequencyConfig(frequency, updateBody.frequencyConfig);
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
            branch: timeline.branch,
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

/**
 * Update UDIN array for a timeline
 * @param {ObjectId} timelineId
 * @param {Array} udinArray
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<Timeline>}
 */
const updateTimelineUdin = async (timelineId, udinArray, user = null) => {
  const timeline = await getTimelineById(timelineId);
  // Optionally, validate branch access if needed
  if (user && user.role && timeline.branch) {
    if (!hasBranchAccess(user.role, timeline.branch)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
  }
  timeline.udin = udinArray;
  await timeline.save();
  return timeline;
};

/**
 * Validate and clean frequency status array
 * @param {Array} frequencyStatus - Frequency status array
 * @returns {Array} - Cleaned frequency status array
 */
const validateAndCleanFrequencyStatus = (frequencyStatus) => {
  if (!Array.isArray(frequencyStatus)) {
    return [];
  }
  
  return frequencyStatus.filter(fs => 
    fs && 
    typeof fs === 'object' && 
    fs.period && 
    typeof fs.period === 'string' &&
    fs.status && 
    ['pending', 'completed', 'delayed', 'ongoing'].includes(fs.status)
  );
};

/**
 * Update frequency status for a specific period
 * @param {ObjectId} timelineId
 * @param {string} period - Period identifier
 * @param {Object} statusData - Status update data
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<Timeline>}
 */
const updateFrequencyStatus = async (timelineId, period, statusData, user = null) => {
  const timeline = await getTimelineById(timelineId);
  
  // Validate branch access if needed
  if (user && user.role && timeline.branch) {
    if (!hasBranchAccess(user.role, timeline.branch)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
  }
  
  // Clean and validate frequency status array
  timeline.frequencyStatus = validateAndCleanFrequencyStatus(timeline.frequencyStatus);
  
  // Find the frequency status entry for the specified period
  const frequencyStatusIndex = timeline.frequencyStatus.findIndex(fs => fs.period === period);
  
  if (frequencyStatusIndex === -1) {
    throw new ApiError(httpStatus.NOT_FOUND, `Frequency period '${period}' not found for this timeline`);
  }
  
  // Update the frequency status
  const updateData = {
    status: statusData.status,
    notes: statusData.notes || timeline.frequencyStatus[frequencyStatusIndex].notes
  };
  
  // Set completedAt if status is being set to completed
  if (statusData.status === 'completed') {
    updateData.completedAt = new Date();
  } else {
    updateData.completedAt = null;
  }
  
  // Ensure we preserve the period field and update other fields
  timeline.frequencyStatus[frequencyStatusIndex] = {
    period: timeline.frequencyStatus[frequencyStatusIndex].period, // Preserve the period
    status: updateData.status,
    completedAt: updateData.completedAt,
    notes: updateData.notes
  };
  
  await timeline.save();
  return timeline;
};

/**
 * Get frequency status for a timeline
 * @param {ObjectId} timelineId
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<Object>}
 */
const getFrequencyStatus = async (timelineId, user = null) => {
  const timeline = await getTimelineById(timelineId);
  
  // Validate branch access if needed
  if (user && user.role && timeline.branch) {
    if (!hasBranchAccess(user.role, timeline.branch)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
  }
  
  // Clean and validate frequency status before returning
  const cleanFrequencyStatus = validateAndCleanFrequencyStatus(timeline.frequencyStatus);
  
  return {
    timelineId: timeline._id,
    frequency: timeline.frequency,
    overallStatus: timeline.status,
    frequencyStatus: cleanFrequencyStatus
  };
};

/**
 * Initialize or regenerate frequency status for a timeline
 * @param {ObjectId} timelineId
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<Timeline>}
 */
const initializeOrRegenerateFrequencyStatus = async (timelineId, user = null) => {
  const timeline = await getTimelineById(timelineId);
  
  // Validate branch access if needed
  if (user && user.role && timeline.branch) {
    if (!hasBranchAccess(user.role, timeline.branch)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
  }
  
  if (!timeline.startDate || !timeline.endDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Start date and end date are required to initialize frequency status');
  }
  
  timeline.frequencyStatus = initializeFrequencyStatus(timeline);
  await timeline.save();
  return timeline;
};

/**
 * Get frequency status statistics across all timelines
 * @param {Object} user - User object for branch access filtering
 * @returns {Object} - Statistics object with counts for each status
 */
const getFrequencyStatusStats = async (user = null) => {
  let query = {};
  
  // Apply branch access filtering if user is provided
  if (user) {
    const userBranchIds = getUserBranchIds(user.role);
    console.log('User branch IDs:', userBranchIds);
    if (userBranchIds === null) {
      // User has access to all branches, no filtering needed
      query = {};
    } else if (userBranchIds.length > 0) {
      query.branch = { $in: userBranchIds };
    } else {
      // User has no branch access, return empty stats
      return {
        pending: 0,
        ongoing: 0,
        delayed: 0,
        completed: 0,
        total: 0
      };
    }
  }

  console.log('Query:', JSON.stringify(query));

  // First, let's check how many timelines we have
  const totalTimelines = await Timeline.countDocuments(query);
  console.log('Total timelines found:', totalTimelines);

  // Check if timelines have frequencyStatus
  const timelinesWithFrequencyStatus = await Timeline.countDocuments({
    ...query,
    'frequencyStatus.0': { $exists: true }
  });
  console.log('Timelines with frequencyStatus:', timelinesWithFrequencyStatus);

  // Let's first get a sample timeline to see the structure
  const sampleTimeline = await Timeline.findOne(query);
  console.log('Sample timeline frequencyStatus:', sampleTimeline?.frequencyStatus);

  // Aggregate to count frequency status across all timelines
  const stats = await Timeline.aggregate([
    { $match: query },
    { $unwind: '$frequencyStatus' },
    {
      $group: {
        _id: '$frequencyStatus.status',
        count: { $sum: 1 }
      }
    }
  ]);

  console.log('Aggregation results:', stats);

  // Alternative approach: manually count from all timelines
  const allTimelines = await Timeline.find(query).select('frequencyStatus');
  console.log('All timelines count:', allTimelines.length);
  
  const manualCounts = {
    pending: 0,
    ongoing: 0,
    delayed: 0,
    completed: 0
  };

  allTimelines.forEach(timeline => {
    if (timeline.frequencyStatus && Array.isArray(timeline.frequencyStatus)) {
      timeline.frequencyStatus.forEach(fs => {
        if (fs.status && manualCounts.hasOwnProperty(fs.status)) {
          manualCounts[fs.status]++;
        }
      });
    }
  });

  console.log('Manual counts:', manualCounts);

  // Initialize result object with all possible statuses
  const result = {
    pending: 0,
    ongoing: 0,
    delayed: 0,
    completed: 0,
    total: 0
  };

  // Populate counts from aggregation results
  stats.forEach(stat => {
    if (result.hasOwnProperty(stat._id)) {
      result[stat._id] = stat.count;
    }
  });

  // If aggregation returned no results, use manual counts
  if (result.total === 0) {
    console.log('Using manual counts as fallback');
    result.pending = manualCounts.pending;
    result.ongoing = manualCounts.ongoing;
    result.delayed = manualCounts.delayed;
    result.completed = manualCounts.completed;
  }

  // Calculate total
  result.total = result.pending + result.ongoing + result.delayed + result.completed;

  console.log('Final result:', result);
  return result;
};

export {
  createTimeline,
  queryTimelines,
  getTimelineById,
  updateTimelineById,
  deleteTimelineById,
  bulkImportTimelines,
  updateTimelineUdin,
  updateFrequencyStatus,
  getFrequencyStatus,
  initializeOrRegenerateFrequencyStatus,
  getFrequencyStatusStats,
}; 