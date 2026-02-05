import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import Activity from '../models/activity.model.js';
import Timeline from '../models/timeline.model.js';
import Client from '../models/client.model.js';
import cache from '../utils/cache.js';
import { createClientTimelines } from './timeline.service.js';

/** GST quarterly subactivity names and their monthly counterparts to remove when adding quarterly. */
const GST_QUARTERLY_TO_MONTHLY = {
  'GSTR-1-Q': 'GSTR-1',
  'GSTR-3B-Q': 'GSTR-3B',
};

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
 * When adding GST quarterly (GSTR-1-Q / GSTR-3B-Q), return the monthly subactivity id to remove.
 * @param {Object} activity - Activity doc with subactivities
 * @param {Object} subactivity - Subactivity being added (quarterly)
 * @returns {ObjectId|null} - Monthly counterpart subactivity id, or null
 */
const getMonthlyCounterpartForGstQuarterly = (activity, subactivity) => {
  const name = (subactivity?.name || '').trim();
  const monthlyName = GST_QUARTERLY_TO_MONTHLY[name];
  if (!monthlyName || (activity?.name || '').trim() !== 'GST') return null;
  const monthly = activity.subactivities?.find((s) => (s.name || '').trim() === monthlyName);
  return monthly?._id || null;
};

/**
 * Bulk create timelines for multiple clients. When subactivityId is provided, adds the
 * activity+subactivity to each client and creates timelines (recurring when applicable).
 * For GST + GSTR-1-Q or GSTR-3B-Q: removes the monthly counterpart (GSTR-1 / GSTR-3B)
 * from clients and deletes their timelines, then adds quarterly and creates timelines.
 */
const bulkCreateTimelines = async (bulkData, user = null) => {
  const { clientIds, activityId, subactivityId, ...timelineData } = bulkData;

  const activity = await Activity.findById(activityId);
  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found');
  }

  let subactivity = null;
  if (subactivityId) {
    subactivity = activity.subactivities.id(subactivityId);
    if (!subactivity) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Subactivity not found');
    }
  }

  const clients = await Client.find({ _id: { $in: clientIds } }).select('_id branch activities gstNumbers');
  if (clients.length !== clientIds.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'One or more client IDs are invalid');
  }

  if (user && user.userType === 'teamMember') {
    const teamMemberBranchId = user.branch ? user.branch.toString() : null;
    const hasUnauthorizedBranch = clients.some((c) => (c.branch ? c.branch.toString() : null) !== teamMemberBranchId);
    if (hasUnauthorizedBranch) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied: one or more clients belong to branches you do not have access to');
    }
  }

  const results = { created: 0, failed: 0, errors: [] };

  if (!subactivityId || !subactivity) {
    // No subactivity: legacy path – bulk insert simple timelines only (no client.activities update)
    const clientBranchMap = Object.fromEntries(clients.map((c) => [c._id.toString(), c.branch]));
    const timelinesToCreate = clientIds.map((clientId) => {
      const branch = clientBranchMap[clientId.toString()];
      if (!branch) throw new ApiError(httpStatus.BAD_REQUEST, `Client ${clientId} does not have a branch`);
      return {
        client: clientId,
        activity: activityId,
        branch,
        status: timelineData.status || 'pending',
        frequency: timelineData.frequency || 'OneTime',
        timelineType: timelineData.timelineType || 'oneTime',
        ...(timelineData.dueDate && { dueDate: timelineData.dueDate }),
        ...(timelineData.startDate && { startDate: timelineData.startDate }),
        ...(timelineData.endDate && { endDate: timelineData.endDate }),
        ...(timelineData.period && { period: timelineData.period }),
        ...(timelineData.financialYear && { financialYear: timelineData.financialYear }),
      };
    });
    try {
      const inserted = await Timeline.insertMany(timelinesToCreate, { ordered: false, rawResult: true });
      results.created = inserted.insertedCount || timelinesToCreate.length;
    } catch (err) {
      if (err.writeErrors) {
        results.created = (err.insertedDocs && err.insertedDocs.length) || 0;
        results.failed = err.writeErrors.length;
        err.writeErrors.forEach((e) => results.errors.push({ clientId: clientIds[e.index], error: e.err?.errmsg || 'Timeline creation failed' }));
      } else throw err;
    }
    return results;
  }

  // Subactivity provided: add to client.activities and create proper recurring timelines
  const activityIdStr = activityId.toString();
  const monthlyCounterpartId = getMonthlyCounterpartForGstQuarterly(activity, subactivity);

  const newActivityEntry = {
    activity: activityId,
    subactivity: {
      _id: subactivity._id,
      name: subactivity.name,
      frequency: subactivity.frequency,
      frequencyConfig: subactivity.frequencyConfig,
      fields: subactivity.fields || [],
    },
    assignedDate: new Date(),
    status: 'active',
    notes: timelineData.notes || '',
  };

  for (const client of clients) {
    const cidStr = client._id.toString();
    try {
      const isMonthlyGst = (a) => {
        if ((a.activity?._id ?? a.activity)?.toString() !== activityIdStr) return false;
        const subId = a.subactivity?._id ?? a.subactivity;
        const subIdStr = subId ? subId.toString() : null;
        const subName = (a.subactivity?.name ?? '').trim();
        return monthlyCounterpartId && (subIdStr === monthlyCounterpartId.toString() || subName === (GST_QUARTERLY_TO_MONTHLY[subactivity.name?.trim()] || ''));
      };
      const alreadyHasSubactivity = (client.activities || []).some((a) => {
        const subId = a.subactivity?._id ?? a.subactivity;
        return subId && subId.toString() === subactivityId.toString();
      });

      if (monthlyCounterpartId) {
        const before = (client.activities || []).length;
        client.activities = (client.activities || []).filter((a) => !isMonthlyGst(a));
        if (client.activities.length < before) await client.save();
      }

      if (monthlyCounterpartId) {
        const monthlyName = GST_QUARTERLY_TO_MONTHLY[subactivity.name?.trim()] || '';
        await Timeline.deleteMany({
          client: client._id,
          activity: activityId,
          $or: [
            { subactivityId: monthlyCounterpartId },
            { 'subactivity._id': monthlyCounterpartId },
            ...(monthlyName ? [{ 'subactivity.name': monthlyName }] : []),
          ],
        });
      }

      const didAdd = !alreadyHasSubactivity;
      if (didAdd) {
        client.activities = client.activities || [];
        client.activities.push(newActivityEntry);
        await client.save();
      }

      if (didAdd) {
        const fullClient = await Client.findById(client._id).select('_id branch activities gstNumbers').lean();
        if (fullClient) {
          const entryForTimeline = (fullClient.activities || []).find((a) => {
            const subId = a.subactivity?._id ?? a.subactivity;
            return subId && subId.toString() === subactivityId.toString();
          }) || newActivityEntry;
          const created = await createClientTimelines(fullClient, [entryForTimeline]);
          results.created += Array.isArray(created) ? created.length : 0;
        }
      }
    } catch (err) {
      results.failed += 1;
      results.errors.push({ clientId: client._id, error: err.message || 'Failed' });
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