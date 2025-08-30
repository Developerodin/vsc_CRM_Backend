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
                  subactivity: subactivity._id,
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
                  period: getPeriodFromDate(dueDate)
                });
                
                console.log(`📝 [TIMELINE SERVICE] Created timeline object for date: ${dueDate.toDateString()}`);
                timelinePromises.push(timeline.save());
              }
            } else {
              console.log(`🔄 [TIMELINE SERVICE] Creating one-time timeline for subactivity: ${subactivity.name}`);
              // Create one-time timeline for subactivities without frequency
              const dueDate = new Date();
              dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days
              
              const timeline = new Timeline({
                activity: activity._id,
                subactivity: subactivity._id,
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
                period: getPeriodFromDate(dueDate)
              });
              
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
          period: getPeriodFromDate(dueDate)
        });
        
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
  return Timeline.find({
    client: clientId,
    branch: branchId,
    isDeleted: { $ne: true }
  }).populate('activity subactivity client');
};

/**
 * Update timeline status
 * @param {String} timelineId - Timeline ID
 * @param {String} status - New status
 * @returns {Promise<Object>} Updated timeline document
 */
export const updateTimelineStatus = async (timelineId, status) => {
  return Timeline.findByIdAndUpdate(
    timelineId,
    { status },
    { new: true, runValidators: true }
  );
};

export {
  createTimeline,
  queryTimelines,
  getTimelineById,
  updateTimelineById,
  deleteTimelineById,
  bulkImportTimelines,
};