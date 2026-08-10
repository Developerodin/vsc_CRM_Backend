import httpStatus from 'http-status';
import { Group, Client, Timeline } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { hasBranchAccess, getUserBranchIds } from './role.service.js';
import { getGroupAnalyticsExtended } from './groupAnalytics.service.js';
import { getCurrentFinancialYear } from '../utils/financialYear.js';
import cache from '../utils/cache.js';
import {
  aggregateTaskStatsByClientIds,
  aggregateTaskAndTimelineStatsByClientIds,
  aggregateTaskBreakdownForClients,
  clampStatsLimit,
} from './taskStatsByClient.helper.js';

const GROUP_TASK_STATS_CACHE_PREFIX = 'group-task-stats:';
const GROUP_ANALYTICS_CACHE_PREFIX = 'group-analytics-all:';

/**
 * Drop groups analytics / task-stats caches after task or timeline status writes.
 * Keeps the 60s TTL as a safety net while avoiding stale counts after mutations.
 * @returns {number} Total cache keys removed
 */
const invalidateGroupsAnalyticsCache = () => {
  const removedStats = cache.clearByPrefix(GROUP_TASK_STATS_CACHE_PREFIX);
  const removedAnalytics = cache.clearByPrefix(GROUP_ANALYTICS_CACHE_PREFIX);
  // Client list task-stats share the same underlying aggregations.
  const removedClientStats = cache.clearByPrefix('client-task-stats:');
  return removedStats + removedAnalytics + removedClientStats;
};

/**
 * Validate if all client IDs exist
 * @param {string[]} clientIds
 * @returns {Promise<boolean>}
 */
const validateClients = async (clientIds) => {
  if(typeof clientIds === 'string') {
    clientIds = [clientIds];
  }
  const clients = await Client.find({ _id: { $in: clientIds } });
  return clients.length === clientIds.length;
};

/**
 * Create a group
 * @param {Object} groupBody
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<Group>}
 */
const createGroup = async (groupBody, user = null) => {
  if (groupBody.clients && !(await validateClients(groupBody.clients))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'All clients must be valid');
  }
  
  // Validate branch access if user is provided
  if (user && user.role && groupBody.branch) {
    if (!hasBranchAccess(user.role, groupBody.branch)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
  }
  
  const group = await Group.create(groupBody);
  return group.populate('clients');
};

/**
 * Query for groups
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (if not provided, returns all results)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {Object} user - User object with role information
 * @returns {Promise<QueryResult>}
 */
const queryGroups = async (filter, options, user) => {
  // Create a new filter object to avoid modifying the original
  const mongoFilter = { ...filter };
  
  // Remove empty or null values from filter
  Object.keys(mongoFilter).forEach(key => {
    if (mongoFilter[key] === '' || mongoFilter[key] === null || mongoFilter[key] === undefined) {
      delete mongoFilter[key];
    }
  });
  
  // Handle global search across multiple fields
  if (mongoFilter.search && mongoFilter.search.trim() !== '') {
    const searchValue = mongoFilter.search.trim();
    const searchRegex = { $regex: searchValue, $options: 'i' };
    
    // Create an $or condition to search across multiple fields
    mongoFilter.$or = [
      { name: searchRegex },
    ];
    
    // Remove the search parameter as it's now handled by $or
    delete mongoFilter.search;

  }
  
  // Handle client name search
  if (mongoFilter.client && mongoFilter.client.trim() !== '') {
    try {
      const clientName = mongoFilter.client.trim();
      
      // Find clients with matching names
      const matchingClients = await Client.find({
        name: { $regex: clientName, $options: 'i' }
      });
      
      if (matchingClients.length > 0) {
        // Get the client IDs
        const clientIds = matchingClients.map(client => client._id);
        
        // Search for groups that contain any of these clients
        mongoFilter.clients = { $in: clientIds };

      } else {
        // If no clients found, return empty results

        return {
          results: [],
          page: options.page || 1,
          limit: options.limit || 0,
          totalPages: 0,
          totalResults: 0
        };
      }
      
      // Remove the client parameter as it's now handled by clients filter
      delete mongoFilter.client;
    } catch (error) {

      // If there's an error, return empty results
      return {
        results: [],
        page: options.page || 1,
        limit: options.limit || 0,
        totalPages: 0,
        totalResults: 0
      };
    }
  }
  
  // Handle individual field filters (only if no global search)
  if (!mongoFilter.$or) {
    // If name filter exists, convert it to case-insensitive regex
    if (mongoFilter.name && mongoFilter.name.trim() !== '') {
      mongoFilter.name = { $regex: mongoFilter.name.trim(), $options: 'i' };
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

  // Cap limit to prevent performance issues with large datasets
  const paginateOptions = { ...options };
  if (paginateOptions.limit) {
    paginateOptions.limit = Math.min(parseInt(paginateOptions.limit), 100);
  } else {
    paginateOptions.limit = 50; // Default limit
  }

  const groups = await Group.paginate(mongoFilter, {
    ...paginateOptions,
    populate: {
      path: 'clients',
      select: '_id name email', // Only select necessary fields
    },
  });

  return groups;
};

/**
 * Get group by id
 * @param {ObjectId} id
 * @returns {Promise<Group>}
 */
const getGroupById = async (id) => {
  const group = await Group.findById(id).populate('clients');
  if (!group) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
  }
  return group;
};

/**
 * Update group by id
 * @param {ObjectId} groupId
 * @param {Object} updateBody
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<Group>}
 */
const updateGroupById = async (groupId, updateBody, user = null) => {
  const group = await getGroupById(groupId);
  if (updateBody.clients && !(await validateClients(updateBody.clients))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'All clients must be valid');
  }
  
  // Validate branch access if user is provided and branch is being updated
  if (user && user.role && updateBody.branch) {
    if (!hasBranchAccess(user.role, updateBody.branch)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
  }
  
  Object.assign(group, updateBody);
  await group.save();
  return group.populate('clients');
};

/**
 * Delete group by id
 * @param {ObjectId} groupId
 * @returns {Promise<Group>}
 */
const deleteGroupById = async (groupId) => {
  const group = await getGroupById(groupId);
  await group.remove();
  return group;
};

/**
 * Add client to group
 * @param {ObjectId} groupId
 * @param {ObjectId} clientId
 * @returns {Promise<Group>}
 */
const addClientToGroup = async (groupId, clientId) => {
  const group = await getGroupById(groupId);
  const client = await Client.findById(clientId);
  
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }

  if (group.clients.includes(clientId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Client already in group');
  }

  group.clients.push(clientId);
  group.numberOfClients = group.clients.length;
  await group.save();
  
  return group.populate('clients');
};

/**
 * Remove client from group
 * @param {ObjectId} groupId
 * @param {ObjectId} clientId
 * @returns {Promise<Group>}
 */
const removeClientFromGroup = async (groupId, clientId) => {
  try {
    // First check if the group exists
    const group = await Group.findById(groupId).populate('clients');
    if (!group) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
    }

    // Check if the client exists
    const client = await Client.findById(clientId);
    if (!client) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
    }

    // Convert clientId to string for comparison
    const clientIdStr = clientId.toString();
    
    // Log the current clients in the group for debugging

    // Check if client exists in the group
    const clientExists = group.clients.some(id => id._id.toString() === clientIdStr);
    
    if (!clientExists) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Client not found in group');
    }

    // Remove client from the group
    group.clients = group.clients.filter(id => id._id.toString() !== clientIdStr);
    group.numberOfClients = group.clients.length;
    
    await group.save();
    return group.populate('clients');
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.BAD_REQUEST, 'Error removing client from group');
  }
};

/**
 * Get clients by group id
 * @param {ObjectId} groupId
 * @returns {Promise<Client[]>}
 */
const getClientsByGroup = async (groupId) => {
  const group = await getGroupById(groupId);
  return group.clients;
};

/**
 * Bulk import groups (create and update)
 * @param {Array} groups - Array of group objects with optional id for updates
 * @returns {Promise<Object>} - Result with created and updated counts
 */
const bulkImportGroups = async (groups) => {
  const results = {
    created: 0,
    updated: 0,
    errors: [],
  };

  // Separate groups for creation and update
  const toCreate = groups.filter((group) => !group.id);
  const toUpdate = groups.filter((group) => group.id);

  // Handle bulk creation
  if (toCreate.length > 0) {
    try {
      // Validate client IDs for all groups to be created
      const allClientIds = toCreate.reduce((ids, group) => {
        if (group.clients && group.clients.length > 0) {
          ids.push(...group.clients);
        }
        return ids;
      }, []);

      if (allClientIds.length > 0) {
        const uniqueClientIds = [...new Set(allClientIds)];
        const validClients = await Client.find({ _id: { $in: uniqueClientIds } });
        const validClientIds = validClients.map(client => client._id.toString());

        // Check for invalid client IDs
        const invalidClientIds = uniqueClientIds.filter(id => !validClientIds.includes(id));
        if (invalidClientIds.length > 0) {
          invalidClientIds.forEach((invalidId) => {
            const groupsWithInvalidClient = toCreate.filter(group => 
              group.clients && group.clients.includes(invalidId)
            );
            groupsWithInvalidClient.forEach((group, index) => {
              results.errors.push({
                index: toCreate.indexOf(group),
                error: `Invalid client ID: ${invalidId}`,
                data: group,
              });
            });
          });
        }

        // Remove groups with invalid client IDs from creation
        const validGroups = toCreate.filter(group => 
          !group.clients || group.clients.every(clientId => validClientIds.includes(clientId))
        );

        if (validGroups.length > 0) {
          const createdGroups = await Group.insertMany(validGroups, {
            ordered: false,
            rawResult: true,
          });
          results.created = createdGroups.insertedCount || validGroups.length;
        }
      } else {
        // No client IDs to validate, proceed with creation
        const createdGroups = await Group.insertMany(toCreate, {
          ordered: false,
          rawResult: true,
        });
        results.created = createdGroups.insertedCount || toCreate.length;
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
    const updateOps = toUpdate.map((group) => ({
      updateOne: {
        filter: { _id: group.id },
        update: {
          $set: {
            name: group.name,
            numberOfClients: group.numberOfClients || 0,
            clients: group.clients || [],
            branch: group.branch,
            sortOrder: group.sortOrder,
          },
        },
        upsert: false,
      },
    }));

    try {
      const updateResult = await Group.bulkWrite(updateOps, {
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
 * Get group task statistics based on timeline data from all clients in the group
 * @param {Object} filter - Filter to select which groups to get statistics for
 * @param {Object} options - Query options
 * @param {number} [options.limit] - Maximum number of results per page (default = 50)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {Object} user - User object with role information
 * @returns {Promise<Object>} - Group task statistics with pagination
 */
/**
 * Paginated per-group task status statistics.
 * Caps page size; aggregates client task counts via indexed Timeline→Task join.
 * @param {Object} filter
 * @param {Object} options
 * @param {Object|null} user
 * @returns {Promise<Object>}
 */
const getGroupTaskStatistics = async (filter = {}, options = {}, user = null) => {
  const mongoFilter = { ...filter };

  if (user && user.role) {
    if (mongoFilter.branch) {
      if (!hasBranchAccess(user.role, mongoFilter.branch)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
      }
    } else {
      const allowedBranchIds = getUserBranchIds(user.role);
      if (allowedBranchIds === null) {
        // all branches
      } else if (allowedBranchIds.length > 0) {
        mongoFilter.branch = { $in: allowedBranchIds };
      } else {
        throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
      }
    }
  }

  if (mongoFilter.name) {
    mongoFilter.name = { $regex: mongoFilter.name, $options: 'i' };
  }

  // Resolve client-name filter to client ObjectIds (same behavior as queryGroups)
  if (mongoFilter.client) {
    const matchingClients = await Client.find({
      name: { $regex: mongoFilter.client, $options: 'i' },
    })
      .select('_id')
      .lean();
    if (matchingClients.length === 0) {
      return {
        results: [],
        pagination: {
          page: parseInt(options.page, 10) || 1,
          limit: clampStatsLimit(options.limit),
          total: 0,
          pages: 0,
        },
      };
    }
    mongoFilter.clients = { $in: matchingClients.map((c) => c._id) };
    delete mongoFilter.client;
  }

  if (mongoFilter.search) {
    const searchRegex = { $regex: mongoFilter.search, $options: 'i' };
    mongoFilter.$or = [{ name: searchRegex }];
    delete mongoFilter.search;
  }

  const page = parseInt(options.page, 10) || 1;
  const limit = clampStatsLimit(options.limit);
  const skip = (page - 1) * limit;

  const cacheKey = cache.generateKey(GROUP_TASK_STATS_CACHE_PREFIX, {
    userId: user?._id?.toString?.() || user?.id?.toString?.() || 'anon',
    page,
    limit,
    filter: JSON.stringify(mongoFilter),
  });
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const [groups, totalGroups] = await Promise.all([
    Group.find(mongoFilter)
      .select('_id name branch numberOfClients')
      .populate('clients', '_id name email')
      .skip(skip)
      .limit(limit)
      .lean(),
    Group.countDocuments(mongoFilter),
  ]);

  const emptyStats = () => ({
    total: 0,
    pending: 0,
    ongoing: 0,
    completed: 0,
    onHold: 0,
    cancelled: 0,
    delayed: 0,
  });

  const allClientIds = groups.reduce((ids, group) => {
    if (group.clients?.length) {
      ids.push(...group.clients.map((client) => client._id));
    }
    return ids;
  }, []);

  if (allClientIds.length === 0) {
    const emptyPayload = {
      results: groups.map((group) => ({
        groupId: group._id,
        groupName: group.name,
        numberOfClients: group.numberOfClients || 0,
        clients: group.clients || [],
        taskStatistics: emptyStats(),
      })),
      pagination: {
        page,
        limit,
        total: totalGroups,
        pages: Math.ceil(totalGroups / limit) || 0,
      },
    };
    cache.set(cacheKey, emptyPayload, 60 * 1000);
    return emptyPayload;
  }

  const clientStatsMap = await aggregateTaskStatsByClientIds(allClientIds);

  const transformedGroupStats = groups.map((group) => {
    const groupTaskStats = emptyStats();
    const clientsWithStats = [];

    (group.clients || []).forEach((client) => {
      const stats = clientStatsMap.get(client._id.toString()) || emptyStats();
      clientsWithStats.push({
        clientId: client._id,
        clientName: client.name,
        clientEmail: client.email,
        taskStatistics: { ...stats },
      });
      groupTaskStats.total += stats.total;
      groupTaskStats.pending += stats.pending;
      groupTaskStats.ongoing += stats.ongoing;
      groupTaskStats.completed += stats.completed;
      groupTaskStats.onHold += stats.onHold;
      groupTaskStats.cancelled += stats.cancelled;
      groupTaskStats.delayed += stats.delayed;
    });

    return {
      groupId: group._id,
      groupName: group.name,
      numberOfClients: group.numberOfClients || 0,
      clients: clientsWithStats,
      taskStatistics: groupTaskStats,
    };
  });

  transformedGroupStats.sort((a, b) => b.taskStatistics.total - a.taskStatistics.total);

  const payload = {
    results: transformedGroupStats,
    pagination: {
      page,
      limit,
      total: totalGroups,
      pages: Math.ceil(totalGroups / limit),
    },
  };

  cache.set(cacheKey, payload, 60 * 1000);
  return payload;
};

/**
 * Build empty all-groups analytics payload.
 * @returns {Object}
 */
const createEmptyGroupsAnalytics = () => ({
  totalGroups: 0,
  totalClients: 0,
  groups: [],
  summary: {
    taskStatus: {
      total: 0,
      pending: 0,
      ongoing: 0,
      completed: 0,
      on_hold: 0,
      cancelled: 0,
      delayed: 0,
    },
    timelineStatus: {
      total: 0,
      pending: 0,
      ongoing: 0,
      completed: 0,
      delayed: 0,
      'not applicable': 0,
    },
  },
});

/**
 * Get analytics summary for all groups.
 * Uses indexable Timeline→Task lookups (not `$expr $in`) and derives the global
 * summary from per-client maps so we only run two aggregations.
 * @param {Object} filter - Filter to select which groups to get analytics for
 * @param {Object} user - User object with role information
 * @returns {Promise<Object>} - Group analytics summary
 */
const getAllGroupsAnalytics = async (filter = {}, user = null) => {
  const mongoFilter = { ...filter };

  Object.keys(mongoFilter).forEach((key) => {
    if (mongoFilter[key] === '' || mongoFilter[key] === null || mongoFilter[key] === undefined) {
      delete mongoFilter[key];
    }
  });

  if (mongoFilter.search && mongoFilter.search.trim() !== '') {
    const searchRegex = { $regex: mongoFilter.search.trim(), $options: 'i' };
    mongoFilter.$or = [{ name: searchRegex }];
    delete mongoFilter.search;
  }

  if (!mongoFilter.$or && mongoFilter.name && mongoFilter.name.trim() !== '') {
    mongoFilter.name = { $regex: mongoFilter.name.trim(), $options: 'i' };
  }

  if (user && user.role) {
    if (mongoFilter.branch) {
      if (!hasBranchAccess(user.role, mongoFilter.branch)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
      }
    } else {
      const allowedBranchIds = getUserBranchIds(user.role);
      if (allowedBranchIds === null) {
        // all branches
      } else if (allowedBranchIds.length > 0) {
        mongoFilter.branch = { $in: allowedBranchIds };
      } else {
        throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
      }
    }
  }

  const cacheKey = cache.generateKey(GROUP_ANALYTICS_CACHE_PREFIX, {
    userId: user?._id?.toString?.() || user?.id?.toString?.() || 'anon',
    filter: JSON.stringify(mongoFilter),
  });
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const groups = await Group.find(mongoFilter)
    .select('_id name branch numberOfClients clients')
    .populate('branch', '_id name')
    .lean();

  if (groups.length === 0) {
    const empty = createEmptyGroupsAnalytics();
    cache.set(cacheKey, empty, 60 * 1000);
    return empty;
  }

  const allClientIds = groups.reduce((ids, group) => {
    if (group.clients?.length) {
      ids.push(...group.clients.map((c) => c._id || c));
    }
    return ids;
  }, []);

  const summary = createEmptyGroupsAnalytics().summary;

  const { taskStatsByClient, timelineStatsByClient } =
    await aggregateTaskAndTimelineStatsByClientIds(allClientIds);

  // Roll per-client maps into the global summary once (avoids a second pair of aggregations).
  taskStatsByClient.forEach((stats) => {
    summary.taskStatus.total += stats.total;
    summary.taskStatus.pending += stats.pending;
    summary.taskStatus.ongoing += stats.ongoing;
    summary.taskStatus.completed += stats.completed;
    summary.taskStatus.on_hold += stats.onHold;
    summary.taskStatus.cancelled += stats.cancelled;
    summary.taskStatus.delayed += stats.delayed;
  });

  timelineStatsByClient.forEach((stats) => {
    summary.timelineStatus.total += stats.total;
    summary.timelineStatus.pending += stats.pending;
    summary.timelineStatus.ongoing += stats.ongoing;
    summary.timelineStatus.completed += stats.completed;
    summary.timelineStatus.delayed += stats.delayed;
    summary.timelineStatus['not applicable'] += stats['not applicable'] || 0;
  });

  const groupAnalytics = groups.map((group) => {
    const groupClientIds = (group.clients || []).map((c) => c._id || c);

    const taskStatus = {
      total: 0,
      pending: 0,
      ongoing: 0,
      completed: 0,
      on_hold: 0,
      cancelled: 0,
      delayed: 0,
    };

    const timelineStatus = {
      total: 0,
      pending: 0,
      ongoing: 0,
      completed: 0,
      delayed: 0,
      'not applicable': 0,
    };

    groupClientIds.forEach((clientId) => {
      const clientIdStr = clientId.toString();
      const clientTaskStats = taskStatsByClient.get(clientIdStr);
      if (clientTaskStats) {
        taskStatus.total += clientTaskStats.total;
        taskStatus.pending += clientTaskStats.pending;
        taskStatus.ongoing += clientTaskStats.ongoing;
        taskStatus.completed += clientTaskStats.completed;
        taskStatus.on_hold += clientTaskStats.onHold;
        taskStatus.cancelled += clientTaskStats.cancelled;
        taskStatus.delayed += clientTaskStats.delayed;
      }

      const clientTimelineStats = timelineStatsByClient.get(clientIdStr);
      if (clientTimelineStats) {
        timelineStatus.total += clientTimelineStats.total;
        timelineStatus.pending += clientTimelineStats.pending;
        timelineStatus.ongoing += clientTimelineStats.ongoing;
        timelineStatus.completed += clientTimelineStats.completed;
        timelineStatus.delayed += clientTimelineStats.delayed;
        timelineStatus['not applicable'] += clientTimelineStats['not applicable'] || 0;
      }
    });

    return {
      groupId: group._id,
      groupName: group.name,
      branch: group.branch,
      numberOfClients: group.numberOfClients || groupClientIds.length,
      taskStatus,
      timelineStatus,
    };
  });

  const payload = {
    totalGroups: groups.length,
    totalClients: allClientIds.length,
    groups: groupAnalytics,
    summary,
  };

  cache.set(cacheKey, payload, 60 * 1000);
  return payload;
};

/**
 * Get detailed analytics for a specific group
 * @param {ObjectId} groupId - Group ID
 * @param {Object} user - User object with role information
 * @param {Object} options - Optional: { fy } financial year e.g. "2026-2027"
 * @returns {Promise<Object>} - Detailed group analytics
 */
const getGroupAnalytics = async (groupId, user = null, options = {}) => {
  try {
    const fy = options.fy && options.fy.trim() ? options.fy.trim() : null;
    const currentFY = fy || getCurrentFinancialYear().yearString;

    const group = await Group.findById(groupId)
      .populate('branch', '_id name')
      .populate({
        path: 'clients',
        select: '_id name email phone branch category turnover turnoverHistory activities',
        populate: { path: 'activities.activity', select: '_id name' }
      })
      .lean();

    if (!group) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Group not found');
    }

    // Check branch access
    if (user && user.role && group.branch) {
      const branchId = group.branch._id || group.branch;
      if (!hasBranchAccess(user.role, branchId)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
      }
    }

    const clientIds = (group.clients || []).map(c => c._id || c);

    // When fy is not passed: include all timelines (no year filter). When fy passed: filter by that FY only.
    const timelineMatch = { client: { $in: clientIds } };
    if (fy) {
      timelineMatch.financialYear = fy;
    }

    if (clientIds.length === 0) {
      return {
        group: {
          _id: group._id,
          name: group.name,
          branch: group.branch,
          numberOfClients: 0
        },
        clients: [],
        taskAnalytics: {
          total: 0,
          statusBreakdown: {
            pending: 0,
            ongoing: 0,
            completed: 0,
            on_hold: 0,
            cancelled: 0,
            delayed: 0
          },
          priorityBreakdown: {
            low: 0,
            medium: 0,
            high: 0,
            urgent: 0,
            critical: 0
          }
        },
        timelineAnalytics: {
          total: 0,
          statusBreakdown: {
            pending: 0,
            ongoing: 0,
            completed: 0,
            delayed: 0
          },
          frequencyBreakdown: {
            None: 0,
            OneTime: 0,
            Hourly: 0,
            Daily: 0,
            Weekly: 0,
            Monthly: 0,
            Quarterly: 0,
            Yearly: 0
          }
        },
        currentFY,
        groupTurnoverSummary: { currentFY, turnoverByClient: [], clientsWithTurnover: 0 },
        activityWiseTimelineAnalytics: { currentFY, byActivity: [] }
      };
    }

    // Indexable Timeline→Task lookups (status + priority + per-client timeline-with-tasks counts)
    // plus cheap timeline status/frequency aggregations — all in parallel.
    const [
      taskBreakdown,
      timelineStatusCounts,
      timelineFrequencyCounts,
      timelineTotal,
      clientTimelineCounts,
    ] = await Promise.all([
      aggregateTaskBreakdownForClients(clientIds, fy ? { financialYear: fy } : {}),
      Timeline.aggregate([
        { $match: timelineMatch },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Timeline.aggregate([
        { $match: timelineMatch },
        { $group: { _id: '$frequency', count: { $sum: 1 } } },
      ]),
      Timeline.countDocuments(timelineMatch),
      Timeline.aggregate([
        { $match: timelineMatch },
        { $group: { _id: '$client', count: { $sum: 1 } } },
      ]),
    ]);

    const processedTaskAnalytics = {
      total: taskBreakdown.totalTasks,
      statusBreakdown: {
        pending: 0,
        ongoing: 0,
        completed: 0,
        on_hold: 0,
        cancelled: 0,
        delayed: 0,
      },
      priorityBreakdown: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0,
        critical: 0,
      },
    };

    taskBreakdown.statusCounts.forEach((stat) => {
      if (stat._id in processedTaskAnalytics.statusBreakdown) {
        processedTaskAnalytics.statusBreakdown[stat._id] = stat.count;
      }
    });

    taskBreakdown.priorityCounts.forEach((stat) => {
      if (stat._id in processedTaskAnalytics.priorityBreakdown) {
        processedTaskAnalytics.priorityBreakdown[stat._id] = stat.count;
      }
    });

    const processedTimelineAnalytics = {
      total: timelineTotal || 0,
      statusBreakdown: {
        pending: 0,
        ongoing: 0,
        completed: 0,
        delayed: 0,
        'not applicable': 0,
      },
      frequencyBreakdown: {
        None: 0,
        OneTime: 0,
        Hourly: 0,
        Daily: 0,
        Weekly: 0,
        Monthly: 0,
        Quarterly: 0,
        Yearly: 0,
      },
    };

    timelineStatusCounts.forEach((stat) => {
      if (stat._id in processedTimelineAnalytics.statusBreakdown) {
        processedTimelineAnalytics.statusBreakdown[stat._id] = stat.count;
      }
    });

    timelineFrequencyCounts.forEach((stat) => {
      if (stat._id in processedTimelineAnalytics.frequencyBreakdown) {
        processedTimelineAnalytics.frequencyBreakdown[stat._id] = stat.count;
      }
    });

    const taskCountMap = taskBreakdown.timelinesWithTasksByClient;

    const timelineCountMap = new Map();
    clientTimelineCounts.forEach((stat) => {
      timelineCountMap.set(stat._id.toString(), stat.count);
    });

    const extended = await getGroupAnalyticsExtended(
      group,
      clientIds,
      taskCountMap,
      timelineCountMap,
      fy
    );

    return {
      group: {
        _id: group._id,
        name: group.name,
        branch: group.branch,
        numberOfClients: group.numberOfClients || clientIds.length,
      },
      clients: extended.clientsEnriched,
      taskAnalytics: processedTaskAnalytics,
      timelineAnalytics: processedTimelineAnalytics,
      currentFY: extended.currentFY,
      groupTurnoverSummary: extended.groupTurnoverSummary,
      activityWiseTimelineAnalytics: extended.activityWiseTimelineAnalytics,
    };
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error fetching group analytics');
  }
};

export {
  createGroup,
  queryGroups,
  getGroupById,
  updateGroupById,
  deleteGroupById,
  addClientToGroup,
  removeClientFromGroup,
  getClientsByGroup,
  bulkImportGroups,
  getGroupTaskStatistics,
  getAllGroupsAnalytics,
  getGroupAnalytics,
  invalidateGroupsAnalyticsCache,
}; 