import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import Timeline from '../models/timeline.model.js';
import Activity from '../models/activity.model.js';
import Client from '../models/client.model.js';
import { hasBranchAccess, getUserBranchIds } from './role.service.js';
import { getCurrentFinancialYear, generateTimelineDates } from '../utils/financialYear.js';

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

  // Clean up empty filters
  if (mongoFilter.status === '') {
    delete mongoFilter.status;
  }

  if (mongoFilter.activityName === '') {
    delete mongoFilter.activityName;
  }

  // Handle activity filter (can be activity ID or activity name)
  if (mongoFilter.activity) {
    // If it's an ObjectId, keep as is
    if (mongoose.Types.ObjectId.isValid(mongoFilter.activity)) {
      // Keep the activity filter as is
    } else {
      // If it's a string (activity name), we'll need to handle this differently
      // For now, we'll search by activity name in the populated data
      delete mongoFilter.activity;
      mongoFilter['$or'] = [
        { 'activity': { $exists: true } } // We'll filter this after population
      ];
    }
  }

  // Handle subactivity filter
  if (mongoFilter.subactivity) {
    if (mongoose.Types.ObjectId.isValid(mongoFilter.subactivity)) {
      // If it's an ObjectId, search in the subactivity._id field
      mongoFilter['subactivity._id'] = mongoFilter.subactivity;
      delete mongoFilter.subactivity;
    } else {
      // If it's a string (subactivity name), search in the subactivity.name field
      mongoFilter['subactivity.name'] = { $regex: mongoFilter.subactivity, $options: 'i' };
      delete mongoFilter.subactivity;
    }
  }

  // Handle period filter
  if (mongoFilter.period) {
    // Support exact match or partial match
    if (mongoFilter.period.includes('*') || mongoFilter.period.includes('%')) {
      // Wildcard search - convert * or % to regex
      const regexPattern = mongoFilter.period.replace(/[*%]/g, '.*');
      mongoFilter.period = { $regex: regexPattern, $options: 'i' };
    } else {
      // Exact match
      mongoFilter.period = { $regex: mongoFilter.period, $options: 'i' };
    }
  }

  // Handle frequency filter
  if (mongoFilter.frequency) {
    // Support exact match or partial match
    if (mongoFilter.frequency.includes('*') || mongoFilter.frequency.includes('%')) {
      // Wildcard search - convert * or % to regex
      const regexPattern = mongoFilter.frequency.replace(/[*%]/g, '.*');
      mongoFilter.frequency = { $regex: regexPattern, $options: 'i' };
    } else {
      // Exact match
      mongoFilter.frequency = { $regex: mongoFilter.frequency, $options: 'i' };
    }
  }

  // Handle date range filters
  if (mongoFilter.startDate || mongoFilter.endDate) {
    mongoFilter.dueDate = {};
    if (mongoFilter.startDate) {
      mongoFilter.dueDate.$gte = new Date(mongoFilter.startDate);
      delete mongoFilter.startDate;
    }
    if (mongoFilter.endDate) {
      mongoFilter.dueDate.$lte = new Date(mongoFilter.endDate);
      delete mongoFilter.endDate;
    }
  }

  // Handle financial year filter
  if (mongoFilter.financialYear) {
    mongoFilter.financialYear = { $regex: mongoFilter.financialYear, $options: 'i' };
  }

  // Handle client filter
  if (mongoFilter.client) {
    if (mongoose.Types.ObjectId.isValid(mongoFilter.client)) {
      // Keep as is if it's an ObjectId
    } else {
      // If it's a string (client name), we'll filter after population
      delete mongoFilter.client;
      mongoFilter['$or'] = mongoFilter['$or'] || [];
      mongoFilter['$or'].push({ 'client': { $exists: true } });
    }
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
  
  // Populate the results with activity and client data
  if (result.results && result.results.length > 0) {
    await Timeline.populate(result.results, [
      { path: 'activity', select: 'name sortOrder subactivities' },
      { path: 'client', select: 'name email phone' }
    ]);
    
    // Process subactivity data since it's stored as embedded document
    result.results.forEach(timeline => {
      if (timeline.subactivity && timeline.subactivity._id && timeline.activity && timeline.activity.subactivities) {
        // Find the matching subactivity in the populated activity
        const subactivity = timeline.activity.subactivities.find(
          sub => sub._id.toString() === timeline.subactivity._id.toString()
        );
        if (subactivity) {
          timeline.subactivity = subactivity;
        }
      }
    });

    // Apply post-query filters for text-based searches
    if (filter.activity && !mongoose.Types.ObjectId.isValid(filter.activity)) {
      // Filter by activity name
      result.results = result.results.filter(timeline => 
        timeline.activity && timeline.activity.name && 
        timeline.activity.name.toLowerCase().includes(filter.activity.toLowerCase())
      );
    }

    if (filter.client && !mongoose.Types.ObjectId.isValid(filter.client)) {
      // Filter by client name
      result.results = result.results.filter(timeline => 
        timeline.client && timeline.client.name && 
        timeline.client.name.toLowerCase().includes(filter.client.toLowerCase())
      );
    }

    // Update total count after filtering
    result.totalResults = result.results.length;
    result.totalPages = Math.ceil(result.totalResults / (options.limit || 10));
  }
  
  return result;
};

/**
 * Get timeline by id
 * @param {ObjectId} id
 * @returns {Promise<Timeline>}
 */
const getTimelineById = async (id) => {
  const timeline = await Timeline.findById(id).populate([
    { path: 'activity', select: 'name sortOrder subactivities' },
    { path: 'client', select: 'name email phone' }
  ]);
  
  // Process subactivity data since it's stored as embedded document
  if (timeline && timeline.subactivity && timeline.subactivity._id && timeline.activity && timeline.activity.subactivities) {
    const subactivity = timeline.activity.subactivities.find(
      sub => sub._id.toString() === timeline.subactivity._id.toString()
    );
    if (subactivity) {
      timeline.subactivity = subactivity;
    }
  }
  
  return timeline;
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

/**
 * Create timelines for a client based on their activities and subactivities
 * @param {Object} client - Client document
 * @param {Array} activities - Array of client activities
 * @returns {Promise<Array>} Array of created timeline documents
 */
export const createClientTimelines = async (client, activities) => {
  console.log(`🔍 [TIMELINE SERVICE] createClientTimelines called for client: ${client.name}`);
  console.log(`📊 [TIMELINE SERVICE] Activities count: ${activities?.length || 0}`);
  
  if (!activities || activities.length === 0) {
    console.log(`⚠️ [TIMELINE SERVICE] No activities provided, returning empty array`);
    return [];
  }

  const timelinePromises = [];
  const { yearString: financialYear } = getCurrentFinancialYear();
  console.log(`📅 [TIMELINE SERVICE] Financial year: ${financialYear}`);

  for (const activityItem of activities) {
    try {
      console.log(`🔍 [TIMELINE SERVICE] Processing activity: ${activityItem.activity}`);
      
      // Get the full activity document to check subactivities
      const Activity = mongoose.model('Activity');
      const activity = await Activity.findById(activityItem.activity);
      
      if (!activity) {
        console.warn(`⚠️ [TIMELINE SERVICE] Activity ${activityItem.activity} not found for client ${client.name}`);
        continue;
      }
      
      console.log(`✅ [TIMELINE SERVICE] Found activity: ${activity.name}`);
      console.log(`📊 [TIMELINE SERVICE] Activity has ${activity.subactivities?.length || 0} subactivities`);

      // Handle activities with subactivities
      if (activity.subactivities && activity.subactivities.length > 0) {
        console.log(`🔍 [TIMELINE SERVICE] Processing ${activity.subactivities.length} subactivities`);
        
        for (const subactivity of activity.subactivities) {
          console.log(`🔍 [TIMELINE SERVICE] Processing subactivity: ${subactivity.name} (ID: ${subactivity._id})`);
          
          // Check if specific subactivity is assigned to this client
          const isAssignedSubactivity = activityItem.subactivity && 
            activityItem.subactivity.toString() === subactivity._id.toString();
          
          console.log(`🔍 [TIMELINE SERVICE] Subactivity assignment check:`, {
            clientSubactivity: activityItem.subactivity,
            subactivityId: subactivity._id.toString(),
            isAssigned: isAssignedSubactivity,
            shouldProcess: !activityItem.subactivity || isAssignedSubactivity
          });
          
          // If no specific subactivity is assigned, or this is the assigned one
          if (!activityItem.subactivity || isAssignedSubactivity) {
            if (subactivity.frequency && subactivity.frequency !== 'None' && subactivity.frequencyConfig) {
              console.log(`🔄 [TIMELINE SERVICE] Creating recurring timelines for subactivity: ${subactivity.name}`);
              console.log(`📅 [TIMELINE SERVICE] Frequency: ${subactivity.frequency}`);
              console.log(`⚙️ [TIMELINE SERVICE] Frequency config:`, subactivity.frequencyConfig);
              
              // Create recurring timelines for subactivities with frequency
              const timelineDates = generateTimelineDates(subactivity.frequencyConfig, subactivity.frequency);
              console.log(`📅 [TIMELINE SERVICE] Generated ${timelineDates.length} timeline dates`);
              
              for (const dueDate of timelineDates) {
                const timeline = new Timeline({
                  activity: activity._id,
                  subactivity: {
                    _id: subactivity._id,
                    name: subactivity.name,
                    frequency: subactivity.frequency,
                    frequencyConfig: subactivity.frequencyConfig,
                    fields: subactivity.fields
                  },
                  client: client._id,
                  status: 'pending',
                  dueDate: dueDate,
                  startDate: dueDate,
                  endDate: dueDate,
                  frequency: subactivity.frequency,
                  frequencyConfig: subactivity.frequencyConfig,
                  branch: client.branch,
                  timelineType: 'recurring',
                  financialYear: financialYear,
                  period: getPeriodFromDate(dueDate),
                  fields: subactivity.fields ? subactivity.fields.map(field => ({
                    fileName: field.name,
                    fieldType: field.type,
                    fieldValue: null // Empty value as requested
                  })) : []
                });
                
                console.log(`📝 [TIMELINE SERVICE] Created timeline object for date: ${dueDate.toDateString()}`);
                console.log(`📋 [TIMELINE SERVICE] Copied ${subactivity.fields?.length || 0} fields from subactivity`);
                timelinePromises.push(timeline.save());
              }
            } else {
              console.log(`🔄 [TIMELINE SERVICE] Creating one-time timeline for subactivity: ${subactivity.name}`);
              // Create one-time timeline for subactivities without frequency
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days
              
              const timeline = new Timeline({
                activity: activity._id,
                subactivity: {
                  _id: subactivity._id,
                  name: subactivity.name,
                  frequency: subactivity.frequency,
                  frequencyConfig: subactivity.frequencyConfig,
                  fields: subactivity.fields
                },
                client: client._id,
                status: 'pending',
                dueDate: dueDate,
                startDate: dueDate,
                endDate: dueDate,
                frequency: 'OneTime',
                frequencyConfig: null,
                branch: client.branch,
                timelineType: 'oneTime',
                financialYear: financialYear,
                period: getPeriodFromDate(dueDate),
                fields: subactivity.fields ? subactivity.fields.map(field => ({
                  fileName: field.name,
                  fieldType: field.type,
                  fieldValue: null // Empty value as requested
                })) : []
              });
              
              console.log(`📋 [TIMELINE SERVICE] Copied ${subactivity.fields?.length || 0} fields from subactivity`);
              timelinePromises.push(timeline.save());
            }
          }
        }
      } else {
        // Handle legacy activities without subactivities - create one-time timeline
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days
        
        const timeline = new Timeline({
          activity: activity._id,
          subactivity: null,
          client: client._id,
          status: 'pending',
          dueDate: dueDate,
          startDate: dueDate,
          endDate: dueDate,
          frequency: 'OneTime',
          frequencyConfig: null,
          branch: client.branch,
          timelineType: 'oneTime',
          financialYear: financialYear,
          period: getPeriodFromDate(dueDate),
          fields: [] // No fields for legacy activities
        });
        
        console.log(`📋 [TIMELINE SERVICE] No fields to copy for legacy activity`);
        timelinePromises.push(timeline.save());
      }
    } catch (error) {
      console.error(`Error creating timeline for activity ${activityItem.activity}:`, error);
      // Continue with other activities even if one fails
    }
  }
  
  // Wait for all timelines to be created
  if (timelinePromises.length > 0) {
    console.log(`⏳ [TIMELINE SERVICE] Waiting for ${timelinePromises.length} timelines to be saved...`);
    const createdTimelines = await Promise.all(timelinePromises);
    console.log(`✅ [TIMELINE SERVICE] Successfully created ${createdTimelines.length} timelines for client ${client.name}`);
    return createdTimelines;
  }
  
  console.log(`⚠️ [TIMELINE SERVICE] No timelines to create for client ${client.name}`);
  return [];
};

/**
 * Get period string from date (e.g., "April-2024", "Q1-2024")
 * @param {Date} date - Date to get period for
 * @returns {String} Period string
 */
const getPeriodFromDate = (date) => {
  const month = date.getMonth();
  const year = date.getFullYear();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Determine quarter
  let quarter;
  if (month <= 2) quarter = 'Q1';
  else if (month <= 5) quarter = 'Q2';
  else if (month <= 8) quarter = 'Q3';
  else quarter = 'Q4';
  
  return `${monthNames[month]}-${year}`;
};

/**
 * Get timelines for a specific client
 * @param {String} clientId - Client ID
 * @param {String} branchId - Branch ID
 * @returns {Promise<Array>} Array of timeline documents
 */
export const getClientTimelines = async (clientId, branchId) => {
  const timelines = await Timeline.find({
    client: clientId,
    branch: branchId,
    isDeleted: { $ne: true }
  }).populate([
    { path: 'activity', select: 'name sortOrder subactivities' },
    { path: 'client', select: 'name email phone' }
  ]);
  
  // Process subactivity data since it's stored as embedded document
  timelines.forEach(timeline => {
    if (timeline.subactivity && timeline.subactivity._id && timeline.activity && timeline.activity.subactivities) {
      const subactivity = timeline.activity.subactivities.find(
        sub => sub._id.toString() === timeline.subactivity._id.toString()
      );
      if (subactivity) {
        timeline.subactivity = subactivity;
      }
    }
  });
  
  return timelines;
};

/**
 * Get all timelines with populated data
 * @param {Object} filter - Filter criteria
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of timeline documents with populated data
 */
export const getAllTimelines = async (filter = {}, options = {}) => {
  const query = Timeline.find(filter);
  
  // Apply pagination if provided
  if (options.limit) {
    query.limit(options.limit);
  }
  if (options.skip) {
    query.skip(options.skip);
  }
  
  // Apply sorting if provided
  if (options.sortBy) {
    query.sort(options.sortBy);
  }
  
  // Always populate with activity and client data
  query.populate([
    { path: 'activity', select: 'name sortOrder subactivities' },
    { path: 'client', select: 'name email phone' }
  ]);
  
  const timelines = await query.exec();
  
  // Process subactivity data since it's stored as embedded document
  timelines.forEach(timeline => {
    if (timeline.subactivity && timeline.subactivity._id && timeline.activity && timeline.activity.subactivities) {
      const subactivity = timeline.activity.subactivities.find(
        sub => sub._id.toString() === timeline.subactivity._id.toString()
      );
      if (subactivity) {
        timeline.subactivity = subactivity;
      }
    }
  });
  
  return timelines;
};



/**
 * Update timeline status
 * @param {String} timelineId - Timeline ID
 * @param {String} status - New status
 * @returns {Promise<Object>} Updated timeline document
 */
export const updateTimelineStatus = async (timelineId, status) => {
  const timeline = await Timeline.findByIdAndUpdate(
    timelineId,
    { status },
    { new: true, runValidators: true }
  );
  
  // Populate the updated timeline before returning
  const populatedTimeline = await Timeline.populate(timeline, [
    { path: 'activity', select: 'name sortOrder subactivities' },
    { path: 'client', select: 'name email phone' }
  ]);
  
  // Process subactivity data since it's stored as embedded document
  if (populatedTimeline && populatedTimeline.subactivity && populatedTimeline.subactivity._id && populatedTimeline.activity && populatedTimeline.activity.subactivities) {
    const subactivity = populatedTimeline.activity.subactivities.find(
      sub => sub._id.toString() === populatedTimeline.subactivity._id.toString()
    );
    if (subactivity) {
      populatedTimeline.subactivity = subactivity;
    }
  }
  
  return populatedTimeline;
};

/**
 * Get frequency periods for a specific frequency type
 * @param {String} frequency - Frequency type ('Monthly', 'Quarterly', 'Yearly')
 * @param {String} [financialYear] - Financial year (e.g., '2025-2026'). If not provided, uses current financial year
 * @returns {Promise<Object>} Object containing frequency periods and their details
 */
const getFrequencyPeriods = async (frequency, financialYear = null) => {
  // Get current financial year if not provided
  if (!financialYear) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const financialYearStart = currentDate.getMonth() >= 3 ? currentYear : currentYear - 1;
    const financialYearEnd = financialYearStart + 1;
    financialYear = `${financialYearStart}-${financialYearEnd}`;
  }

  const periods = [];
  const [startYear, endYear] = financialYear.split('-').map(Number);

  switch (frequency) {
    case 'Monthly':
      // Generate monthly periods for the financial year (April to March)
      for (let month = 3; month <= 14; month++) {
        const monthIndex = month % 12;
        const monthName = getMonthName(monthIndex);
        const periodYear = monthIndex >= 3 ? startYear : endYear;
        const period = `${monthName}-${periodYear}`;
        
        periods.push({
          period,
          month: monthName,
          year: periodYear,
          monthIndex,
          startDate: new Date(periodYear, monthIndex, 1),
          endDate: new Date(periodYear, monthIndex + 1, 0), // Last day of the month
          displayName: `${monthName} ${periodYear}`
        });
      }
      break;

    case 'Quarterly':
      // For quarterly frequency, return monthly periods (April, July, October, January)
      // These are the key months when quarterly tasks are due
      const quarterlyMonths = [
        { monthIndex: 3, monthName: 'April', year: startYear },      // April
        { monthIndex: 6, monthName: 'July', year: startYear },       // July  
        { monthIndex: 9, monthName: 'October', year: startYear },    // October
        { monthIndex: 0, monthName: 'January', year: endYear }       // January (next year)
      ];

      for (const monthData of quarterlyMonths) {
        const period = `${monthData.monthName}-${monthData.year}`;
        const startDate = new Date(monthData.year, monthData.monthIndex, 1);
        const endDate = new Date(monthData.year, monthData.monthIndex + 1, 0); // Last day of the month
        
        periods.push({
          period,
          month: monthData.monthName,
          year: monthData.year,
          monthIndex: monthData.monthIndex,
          startDate,
          endDate,
          displayName: `${monthData.monthName} ${monthData.year}`,
          financialYear,
          quarter: getQuarterFromMonth(monthData.monthIndex)
        });
      }
      break;

    case 'Yearly':
      // Generate yearly periods (can be multiple years if needed)
      periods.push({
        period: financialYear,
        year: startYear,
        startDate: new Date(startYear, 3, 1), // April 1st
        endDate: new Date(endYear, 2, 31),    // March 31st
        displayName: `Financial Year ${financialYear}`,
        financialYear
      });
      break;

    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }

  return {
    frequency,
    financialYear,
    periods,
    totalPeriods: periods.length,
    description: getFrequencyDescription(frequency, financialYear)
  };
};

/**
 * Helper function to get month name from month index
 * @param {number} monthIndex - Month index (0-11)
 * @returns {string} - Month name
 */
const getMonthName = (monthIndex) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
};

/**
 * Helper function to get quarter from month
 * @param {number} monthIndex - Month index (0-11)
 * @returns {string} - Quarter (Q1, Q2, Q3, Q4)
 */
const getQuarterFromMonth = (monthIndex) => {
  if (monthIndex >= 3 && monthIndex <= 5) return 'Q1';      // April, May, June
  if (monthIndex >= 6 && monthIndex <= 8) return 'Q2';      // July, August, September
  if (monthIndex >= 9 && monthIndex <= 11) return 'Q3';     // October, November, December
  return 'Q4';                                               // January, February, March
};

/**
 * Helper function to get frequency description
 * @param {string} frequency - Frequency type
 * @param {string} financialYear - Financial year
 * @returns {string} - Description of the frequency
 */
const getFrequencyDescription = (frequency, financialYear) => {
  switch (frequency) {
    case 'Monthly':
      return `Monthly periods for financial year ${financialYear} (April ${financialYear.split('-')[0]} to March ${financialYear.split('-')[1]})`;
    case 'Quarterly':
      return `Monthly periods for quarterly frequency in financial year ${financialYear} (April, July, October, January)`;
    case 'Yearly':
      return `Financial year ${financialYear}`;
    default:
      return `Frequency periods for ${frequency}`;
  }
};

export {
  createTimeline,
  queryTimelines,
  getTimelineById,
  updateTimelineById,
  deleteTimelineById,
  bulkImportTimelines,
  getFrequencyPeriods,
};