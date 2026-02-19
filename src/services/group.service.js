import httpStatus from 'http-status';
import { Group, Client, Task, Timeline } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { hasBranchAccess, getUserBranchIds } from './role.service.js';
import { getGroupAnalyticsExtended } from './groupAnalytics.service.js';
import { getCurrentFinancialYear } from '../utils/financialYear.js';

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
const getGroupTaskStatistics = async (filter = {}, options = {}, user = null) => {
  try {

    // Create a new filter object to avoid modifying the original
    const mongoFilter = { ...filter };
    
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

    // If name filter exists, convert it to case-insensitive regex
    if (mongoFilter.name) {
      mongoFilter.name = { $regex: mongoFilter.name, $options: 'i' };
    }

    // Get pagination options with max limit cap to prevent performance issues
    const page = parseInt(options.page) || 1;
    const rawLimit = parseInt(options.limit) || 50;
    const limit = Math.min(rawLimit, 100); // Cap at 100 to prevent performance issues
    const skip = (page - 1) * limit;

    // First, get the groups that match the filter
    const groups = await Group.find(mongoFilter)
      .select('_id name branch numberOfClients')
      .populate('clients', '_id name email')
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalGroups = await Group.countDocuments(mongoFilter);

    // Get all client IDs from all groups
    const allClientIds = groups.reduce((ids, group) => {
      if (group.clients && group.clients.length > 0) {
        ids.push(...group.clients.map(client => client._id));
      }
      return ids;
    }, []);

    if (allClientIds.length === 0) {
      // No clients in any groups, return empty results
      const emptyGroupStats = groups.map(group => ({
        groupId: group._id,
        groupName: group.name,
        numberOfClients: group.numberOfClients || 0,
        clients: group.clients || [],
        taskStatistics: {
          total: 0,
          pending: 0,
          ongoing: 0,
          completed: 0,
          onHold: 0,
          cancelled: 0,
          delayed: 0
        }
      }));

      return {
        results: emptyGroupStats,
        pagination: {
          page,
          limit,
          total: totalGroups,
          pages: Math.ceil(totalGroups / limit)
        }
      };
    }

    // Optimized: Start from Timeline (which has client directly) instead of Task
    // This avoids expensive $unwind operations on Task.timeline array
    const clientStats = await Timeline.aggregate([
      // Match timelines for our clients (indexed query)
      {
        $match: {
          client: { $in: allClientIds }
        }
      },
      // Lookup tasks that reference this timeline
      {
        $lookup: {
          from: 'tasks',
          let: { timelineId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$$timelineId', '$timeline']
                }
              }
            },
            {
              $project: {
                status: 1
              }
            }
          ],
          as: 'tasks'
        }
      },
      // Unwind tasks to get individual task statuses
      {
        $unwind: '$tasks'
      },
      // Group by client and status
      {
        $group: {
          _id: {
            clientId: '$client',
            status: '$tasks.status'
          },
          count: { $sum: 1 }
        }
      },
      // Lookup client details
      {
        $lookup: {
          from: 'clients',
          localField: '_id.clientId',
          foreignField: '_id',
          as: 'clientDetails'
        }
      },
      {
        $unwind: '$clientDetails'
      },
      // Group by client to get all statuses together
      {
        $group: {
          _id: {
            clientId: '$_id.clientId',
            clientName: '$clientDetails.name',
            clientEmail: '$clientDetails.email'
          },
          statusCounts: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          totalTasks: { $sum: '$count' }
        }
      }
    ]);

    // Create a map of client statistics for quick lookup
    const clientStatsMap = new Map();
    clientStats.forEach(clientStat => {
      const statusMap = {
        pending: 0,
        ongoing: 0,
        completed: 0,
        on_hold: 0,
        cancelled: 0,
        delayed: 0
      };

      // Fill in the actual counts
      clientStat.statusCounts.forEach(statusCount => {
        if (statusCount.status in statusMap) {
          statusMap[statusCount.status] = statusCount.count;
        }
      });

      clientStatsMap.set(clientStat._id.clientId.toString(), {
        clientId: clientStat._id.clientId,
        clientName: clientStat._id.clientName,
        clientEmail: clientStat._id.clientEmail,
        taskStatistics: {
          total: clientStat.totalTasks,
          pending: statusMap.pending,
          ongoing: statusMap.ongoing,
          completed: statusMap.completed,
          onHold: statusMap.on_hold,
          cancelled: statusMap.cancelled,
          delayed: statusMap.delayed
        }
      });
    });

    // Transform groups to include task statistics
    const transformedGroupStats = groups.map(group => {
      const groupTaskStats = {
        total: 0,
        pending: 0,
        ongoing: 0,
        completed: 0,
        onHold: 0,
        cancelled: 0,
        delayed: 0
      };

      const clientsWithStats = [];

      // Process each client in the group
      if (group.clients && group.clients.length > 0) {
        group.clients.forEach(client => {
          const clientStat = clientStatsMap.get(client._id.toString());
          
          if (clientStat) {
            // Client has tasks, add their statistics
            clientsWithStats.push(clientStat);
            
            // Aggregate group statistics
            groupTaskStats.total += clientStat.taskStatistics.total;
            groupTaskStats.pending += clientStat.taskStatistics.pending;
            groupTaskStats.ongoing += clientStat.taskStatistics.ongoing;
            groupTaskStats.completed += clientStat.taskStatistics.completed;
            groupTaskStats.onHold += clientStat.taskStatistics.onHold;
            groupTaskStats.cancelled += clientStat.taskStatistics.cancelled;
            groupTaskStats.delayed += clientStat.taskStatistics.delayed;
          } else {
            // Client has no tasks, add with 0 counts
            clientsWithStats.push({
              clientId: client._id,
              clientName: client.name,
              clientEmail: client.email,
              taskStatistics: {
                total: 0,
                pending: 0,
                ongoing: 0,
                completed: 0,
                onHold: 0,
                cancelled: 0,
                delayed: 0
              }
            });
          }
        });
      }

      return {
        groupId: group._id,
        groupName: group.name,
        numberOfClients: group.numberOfClients || 0,
        clients: clientsWithStats,
        taskStatistics: groupTaskStats
      };
    });

    // Sort groups by total tasks (highest first)
    transformedGroupStats.sort((a, b) => b.taskStatistics.total - a.taskStatistics.total);

    return {
      results: transformedGroupStats,
      pagination: {
        page,
        limit,
        total: totalGroups,
        pages: Math.ceil(totalGroups / limit)
      }
    };

  } catch (error) {

    throw error;
  }
};

/**
 * Get analytics summary for all groups
 * @param {Object} filter - Filter to select which groups to get analytics for
 * @param {Object} user - User object with role information
 * @returns {Promise<Object>} - Group analytics summary
 */
const getAllGroupsAnalytics = async (filter = {}, user = null) => {
  try {
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
    
    // Handle individual field filters (only if no global search)
    if (!mongoFilter.$or) {
      // If name filter exists, convert it to case-insensitive regex
      if (mongoFilter.name && mongoFilter.name.trim() !== '') {
        mongoFilter.name = { $regex: mongoFilter.name.trim(), $options: 'i' };
      }
    }
    
    // Apply branch filtering based on user's access
    if (user && user.role) {
      if (mongoFilter.branch) {
        if (!hasBranchAccess(user.role, mongoFilter.branch)) {
          throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
        }
      } else {
        const allowedBranchIds = getUserBranchIds(user.role);
        if (allowedBranchIds === null) {
          // User has access to all branches
        } else if (allowedBranchIds.length > 0) {
          // MongoDB will automatically AND the branch filter with $or if it exists
          mongoFilter.branch = { $in: allowedBranchIds };
        } else {
          throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
        }
      }
    }

    // Get all groups matching the filter
    const groups = await Group.find(mongoFilter)
      .select('_id name branch numberOfClients clients')
      .populate('branch', '_id name')
      .lean();

    if (groups.length === 0) {
      return {
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
            delayed: 0
          },
          timelineStatus: {
            total: 0,
            pending: 0,
            ongoing: 0,
            completed: 0,
            delayed: 0,
            'not applicable': 0
          }
        }
      };
    }

    // Get all client IDs from all groups
    const allClientIds = groups.reduce((ids, group) => {
      if (group.clients && group.clients.length > 0) {
        ids.push(...group.clients.map(c => c._id || c));
      }
      return ids;
    }, []);

    // Initialize summary statistics
    const summary = {
      taskStatus: {
        total: 0,
        pending: 0,
        ongoing: 0,
        completed: 0,
        on_hold: 0,
        cancelled: 0,
        delayed: 0
      },
      timelineStatus: {
        total: 0,
        pending: 0,
        ongoing: 0,
        completed: 0,
        delayed: 0,
        'not applicable': 0
      }
    };

    // Optimized: Start from Timeline instead of Task to avoid expensive $unwind
    let taskStats = [];
    if (allClientIds.length > 0) {
      taskStats = await Timeline.aggregate([
        {
          $match: {
            client: { $in: allClientIds }
          }
        },
        {
          $lookup: {
            from: 'tasks',
            let: { timelineId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$$timelineId', '$timeline']
                  }
                }
              },
              {
                $project: {
                  status: 1
                }
              }
            ],
            as: 'tasks'
          }
        },
        { $unwind: '$tasks' },
        {
          $group: {
            _id: '$tasks.status',
            count: { $sum: 1 }
          }
        }
      ]);
    }

    // Get timeline statistics for all clients
    let timelineStats = [];
    if (allClientIds.length > 0) {
      timelineStats = await Timeline.aggregate([
        {
          $match: {
            client: { $in: allClientIds }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);
    }

    // Process task statistics
    taskStats.forEach(stat => {
      if (stat._id in summary.taskStatus) {
        summary.taskStatus[stat._id] = stat.count;
        summary.taskStatus.total += stat.count;
      }
    });

    // Process timeline statistics
    timelineStats.forEach(stat => {
      if (stat._id in summary.timelineStatus) {
        summary.timelineStatus[stat._id] = stat.count;
        summary.timelineStatus.total += stat.count;
      }
    });

    // Create a map of group to client IDs for efficient lookup
    const groupClientMap = new Map();
    groups.forEach(group => {
      const clientIds = (group.clients || []).map(c => c._id || c);
      groupClientMap.set(group._id.toString(), clientIds);
    });

    // Optimized: Start from Timeline instead of Task
    const allTaskStatsByClient = allClientIds.length > 0 ? await Timeline.aggregate([
      {
        $match: {
          client: { $in: allClientIds }
        }
      },
      {
        $lookup: {
          from: 'tasks',
          let: { timelineId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ['$$timelineId', '$timeline']
                }
              }
            },
            {
              $project: {
                status: 1
              }
            }
          ],
          as: 'tasks'
        }
      },
      { $unwind: '$tasks' },
      {
        $group: {
          _id: {
            client: '$client',
            status: '$tasks.status'
          },
          count: { $sum: 1 }
        }
      }
    ]) : [];

    // Get all timeline statistics grouped by client
    const allTimelineStatsByClient = allClientIds.length > 0 ? await Timeline.aggregate([
      {
        $match: {
          client: { $in: allClientIds }
        }
      },
      {
        $group: {
          _id: {
            client: '$client',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      }
    ]) : [];

    // Create maps for quick lookup
    const taskStatsMap = new Map();
    allTaskStatsByClient.forEach(stat => {
      const clientId = stat._id.client.toString();
      if (!taskStatsMap.has(clientId)) {
        taskStatsMap.set(clientId, {});
      }
      taskStatsMap.get(clientId)[stat._id.status] = stat.count;
    });

    const timelineStatsMap = new Map();
    allTimelineStatsByClient.forEach(stat => {
      const clientId = stat._id.client.toString();
      if (!timelineStatsMap.has(clientId)) {
        timelineStatsMap.set(clientId, {});
      }
      timelineStatsMap.get(clientId)[stat._id.status] = stat.count;
    });

    // Get per-group statistics
    const groupAnalytics = groups.map((group) => {
      const groupClientIds = groupClientMap.get(group._id.toString()) || [];
      
      const taskStatus = {
        total: 0,
        pending: 0,
        ongoing: 0,
        completed: 0,
        on_hold: 0,
        cancelled: 0,
        delayed: 0
      };

      const timelineStatus = {
        total: 0,
        pending: 0,
        ongoing: 0,
        completed: 0,
        delayed: 0,
        'not applicable': 0
      };

      // Aggregate statistics for all clients in this group
      groupClientIds.forEach(clientId => {
        const clientIdStr = clientId.toString();
        
        // Aggregate task stats
        const clientTaskStats = taskStatsMap.get(clientIdStr) || {};
        Object.keys(clientTaskStats).forEach(status => {
          if (status in taskStatus) {
            taskStatus[status] += clientTaskStats[status];
            taskStatus.total += clientTaskStats[status];
          }
        });

        // Aggregate timeline stats
        const clientTimelineStats = timelineStatsMap.get(clientIdStr) || {};
        Object.keys(clientTimelineStats).forEach(status => {
          if (status in timelineStatus) {
            timelineStatus[status] += clientTimelineStats[status];
            timelineStatus.total += clientTimelineStats[status];
          }
        });
      });

      return {
        groupId: group._id,
        groupName: group.name,
        branch: group.branch,
        numberOfClients: group.numberOfClients || groupClientIds.length,
        taskStatus,
        timelineStatus
      };
    });

    return {
      totalGroups: groups.length,
      totalClients: allClientIds.length,
      groups: groupAnalytics,
      summary
    };
  } catch (error) {
    throw error;
  }
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

    // Optimized: Start from Timeline instead of Task to avoid expensive $unwind
    const [taskStatusCounts, taskPriorityCounts, taskTotal] = await Promise.all([
      Timeline.aggregate([
        { $match: timelineMatch },
        {
          $lookup: {
            from: 'tasks',
            let: { timelineId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$$timelineId', '$timeline']
                  }
                }
              },
              {
                $project: {
                  status: 1
                }
              }
            ],
            as: 'tasks'
          }
        },
        { $unwind: '$tasks' },
        {
          $group: {
            _id: '$tasks.status',
            count: { $sum: 1 }
          }
        }
      ]),
      Timeline.aggregate([
        { $match: timelineMatch },
        {
          $lookup: {
            from: 'tasks',
            let: { timelineId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$$timelineId', '$timeline']
                  }
                }
              },
              {
                $project: {
                  priority: 1
                }
              }
            ],
            as: 'tasks'
          }
        },
        { $unwind: '$tasks' },
        {
          $group: {
            _id: '$tasks.priority',
            count: { $sum: 1 }
          }
        }
      ]),
      Timeline.aggregate([
        { $match: timelineMatch },
        {
          $lookup: {
            from: 'tasks',
            let: { timelineId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$$timelineId', '$timeline']
                  }
                }
              }
            ],
            as: 'tasks'
          }
        },
        {
          $match: {
            'tasks.0': { $exists: true }
          }
        },
        { $count: 'total' }
      ])
    ]);

    // Get timeline analytics - status and frequency breakdown
    const [timelineStatusCounts, timelineFrequencyCounts, timelineTotal] = await Promise.all([
      Timeline.aggregate([
        { $match: timelineMatch },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      Timeline.aggregate([
        { $match: timelineMatch },
        {
          $group: {
            _id: '$frequency',
            count: { $sum: 1 }
          }
        }
      ]),
      Timeline.countDocuments(timelineMatch)
    ]);

    // Process task analytics
    const processedTaskAnalytics = {
      total: taskTotal[0]?.total || 0,
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
    };

    taskStatusCounts.forEach(stat => {
      if (stat._id in processedTaskAnalytics.statusBreakdown) {
        processedTaskAnalytics.statusBreakdown[stat._id] = stat.count;
      }
    });

    taskPriorityCounts.forEach(stat => {
      if (stat._id in processedTaskAnalytics.priorityBreakdown) {
        processedTaskAnalytics.priorityBreakdown[stat._id] = stat.count;
      }
    });

    // Process timeline analytics
    const processedTimelineAnalytics = {
      total: timelineTotal || 0,
      statusBreakdown: {
        pending: 0,
        ongoing: 0,
        completed: 0,
        delayed: 0,
        'not applicable': 0
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
    };

    timelineStatusCounts.forEach(stat => {
      if (stat._id in processedTimelineAnalytics.statusBreakdown) {
        processedTimelineAnalytics.statusBreakdown[stat._id] = stat.count;
      }
    });

    timelineFrequencyCounts.forEach(stat => {
      if (stat._id in processedTimelineAnalytics.frequencyBreakdown) {
        processedTimelineAnalytics.frequencyBreakdown[stat._id] = stat.count;
      }
    });

    // Optimized: Get client-level statistics efficiently
    const [clientTaskCounts, clientTimelineCounts] = await Promise.all([
      Timeline.aggregate([
        { $match: timelineMatch },
        {
          $lookup: {
            from: 'tasks',
            let: { timelineId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$$timelineId', '$timeline']
                  }
                }
              }
            ],
            as: 'tasks'
          }
        },
        {
          $match: {
            'tasks.0': { $exists: true }
          }
        },
        {
          $group: {
            _id: '$client',
            count: { $sum: 1 }
          }
        }
      ]),
      Timeline.aggregate([
        { $match: timelineMatch },
        {
          $group: {
            _id: '$client',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const taskCountMap = new Map();
    clientTaskCounts.forEach(stat => {
      taskCountMap.set(stat._id.toString(), stat.count);
    });

    const timelineCountMap = new Map();
    clientTimelineCounts.forEach(stat => {
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
        numberOfClients: group.numberOfClients || clientIds.length
      },
      clients: extended.clientsEnriched,
      taskAnalytics: processedTaskAnalytics,
      timelineAnalytics: processedTimelineAnalytics,
      currentFY: extended.currentFY,
      groupTurnoverSummary: extended.groupTurnoverSummary,
      activityWiseTimelineAnalytics: extended.activityWiseTimelineAnalytics
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
}; 