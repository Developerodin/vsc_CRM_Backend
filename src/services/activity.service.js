import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import Activity from '../models/activity.model.js';
import Timeline from '../models/timeline.model.js';
import Client from '../models/client.model.js';
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

/**
 * Bulk create timelines for multiple clients
 * @param {Object} bulkData
 * @param {Array<ObjectId>} bulkData.clientIds - Array of client IDs (1 to 1000)
 * @param {ObjectId} bulkData.activityId - Activity ID
 * @param {ObjectId} bulkData.subactivityId - Subactivity ID (optional)
 * @param {Object} bulkData.timelineData - Timeline data (status, dueDate, etc.)
 * @param {Object} user - User object for branch access validation
 * @returns {Promise<Object>} - Result with created count and any errors
 */
const bulkCreateTimelines = async (bulkData, user = null) => {
  const { clientIds, activityId, subactivityId, ...timelineData } = bulkData;
  
  // Validate activity exists
  const activity = await Activity.findById(activityId);
  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found');
  }
  
  // Validate subactivity if provided and get dueDate from it
  let subactivity = null;
  let subactivityDueDate = null;
  if (subactivityId) {
    subactivity = activity.subactivities.id(subactivityId);
    if (!subactivity) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Subactivity not found');
    }
    // Get dueDate from subactivity if available
    subactivityDueDate = subactivity.dueDate;
  }
  
  // Validate all clients exist and get their branches
  const clients = await Client.find({ _id: { $in: clientIds } }).select('_id branch');
  
  if (clients.length !== clientIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'One or more client IDs are invalid');
  }
  
  // Create a map of clientId to branch for easy lookup
  const clientBranchMap = {};
  clients.forEach(client => {
    clientBranchMap[client._id.toString()] = client.branch;
  });
  
  // Validate branch access if user is provided (check against client branches)
  if (user && user.userType === 'teamMember') {
    const teamMemberBranchId = user.branch ? user.branch.toString() : null;
    // Check if any client belongs to a different branch
    const hasUnauthorizedBranch = clients.some(client => {
      const clientBranchId = client.branch ? client.branch.toString() : null;
      return clientBranchId !== teamMemberBranchId;
    });
    
    if (hasUnauthorizedBranch) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied: one or more clients belong to branches you do not have access to');
    }
  }
  
  const results = {
    created: 0,
    failed: 0,
    errors: [],
  };
  
  // Determine the dueDate to use: explicit dueDate > subactivity dueDate > null
  const effectiveDueDate = timelineData.dueDate || subactivityDueDate;
  
  // Prepare timeline documents for bulk insert
  const timelinesToCreate = clientIds.map(clientId => {
    const clientIdStr = clientId.toString();
    const clientBranch = clientBranchMap[clientIdStr];
    
    if (!clientBranch) {
      throw new ApiError(httpStatus.BAD_REQUEST, `Client ${clientId} does not have a branch assigned`);
    }
    
    const timelineDoc = {
      client: clientId,
      activity: activityId,
      branch: clientBranch,
      status: timelineData.status || 'pending',
      frequency: timelineData.frequency || 'OneTime',
      timelineType: timelineData.timelineType || 'oneTime',
    };
    
    // Add subactivity data if provided
    if (subactivity) {
      timelineDoc.subactivity = {
        _id: subactivity._id,
        name: subactivity.name,
        dueDate: subactivity.dueDate,
        frequency: subactivity.frequency,
        frequencyConfig: subactivity.frequencyConfig,
        fields: subactivity.fields,
      };
    }
    
    // Add dueDate (from explicit param or subactivity)
    if (effectiveDueDate) timelineDoc.dueDate = effectiveDueDate;
    
    // Add other optional fields
    if (timelineData.startDate) timelineDoc.startDate = timelineData.startDate;
    if (timelineData.endDate) timelineDoc.endDate = timelineData.endDate;
    if (timelineData.period) timelineDoc.period = timelineData.period;
    if (timelineData.financialYear) timelineDoc.financialYear = timelineData.financialYear;
    if (timelineData.referenceNumber) timelineDoc.referenceNumber = timelineData.referenceNumber;
    if (timelineData.frequencyConfig) timelineDoc.frequencyConfig = normalizeFrequencyConfig(timelineData.frequencyConfig);
    if (timelineData.fields) timelineDoc.fields = timelineData.fields;
    if (timelineData.metadata) timelineDoc.metadata = timelineData.metadata;
    if (timelineData.state) timelineDoc.state = timelineData.state;
    
    return timelineDoc;
  });
  
  // Bulk insert timelines
  try {
    const createdTimelines = await Timeline.insertMany(timelinesToCreate, {
      ordered: false, // Continue processing even if some fail
      rawResult: true,
    });
    results.created = createdTimelines.insertedCount || timelinesToCreate.length;
  } catch (error) {
    if (error.writeErrors) {
      // Handle partial failures
      results.created = (error.insertedDocs && error.insertedDocs.length) || 0;
      results.failed = error.writeErrors.length;
      error.writeErrors.forEach((writeError) => {
        results.errors.push({
          clientId: clientIds[writeError.index],
          error: writeError.err.errmsg || 'Timeline creation failed',
        });
      });
    } else {
      throw error;
    }
  }
  
  return results;
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
  subactivityExists,
  bulkCreateTimelines,
}; 