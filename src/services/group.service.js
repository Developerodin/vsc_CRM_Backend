import httpStatus from 'http-status';
import { Group, Client } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { hasBranchAccess, getUserBranchIds } from './role.service.js';

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
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {Object} user - User object with role information
 * @returns {Promise<QueryResult>}
 */
const queryGroups = async (filter, options, user) => {
  // Create a new filter object to avoid modifying the original
  const mongoFilter = { ...filter };
  
  // If name filter exists, convert it to case-insensitive regex
  if (mongoFilter.name) {
    mongoFilter.name = { $regex: mongoFilter.name, $options: 'i' };
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

  const groups = await Group.paginate(mongoFilter, {
    ...options,
    populate: 'clients',
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
    console.log('Current clients in group:', group.clients.map(c => c._id.toString()));
    console.log('Attempting to remove client:', clientIdStr);
    
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
}; 