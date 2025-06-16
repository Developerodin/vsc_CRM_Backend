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
  await group.populate('clients');
  return group;
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
  await group.populate('clients');
  return group;
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

export {
  createGroup,
  queryGroups,
  getGroupById,
  updateGroupById,
  deleteGroupById,
}; 