import httpStatus from 'http-status';
import { Group, Client } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

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
 * @returns {Promise<Group>}
 */
const createGroup = async (groupBody) => {
  if (groupBody.clients && !(await validateClients(groupBody.clients))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'All clients must be valid');
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
 * @returns {Promise<QueryResult>}
 */
const queryGroups = async (filter, options) => {
  const groups = await Group.paginate(filter, {
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
 * @returns {Promise<Group>}
 */
const updateGroupById = async (groupId, updateBody) => {
  const group = await getGroupById(groupId);
  if (updateBody.clients && !(await validateClients(updateBody.clients))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'All clients must be valid');
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

export {
  createGroup,
  queryGroups,
  getGroupById,
  updateGroupById,
  deleteGroupById,
  addClientToGroup,
  removeClientFromGroup,
  getClientsByGroup,
}; 