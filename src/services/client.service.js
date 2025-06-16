import httpStatus from 'http-status';
import { Client, Group } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

/**
 * Validate if all group IDs exist
 * @param {string[]} groupIds
 * @returns {Promise<boolean>}
 */
const validateGroups = async (groupIds) => {
  if(typeof groupIds === 'string') {
    groupIds = [groupIds];
  }
  const groups = await Group.find({ _id: { $in: groupIds } });
  return groups.length === groupIds.length;
};

/**
 * Create a client
 * @param {Object} clientBody
 * @returns {Promise<Client>}
 */
const createClient = async (clientBody) => {
  if (await Client.isEmailTaken(clientBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (await Client.isPhoneTaken(clientBody.phone)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already taken');
  }
  if (!(await validateGroups(clientBody.groups))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'All groups must be valid');
  }
  const client = await Client.create(clientBody);
  return client.populate('groups');
};

/**
 * Query for clients
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryClients = async (filter, options) => {
  const clients = await Client.paginate(filter, {
    ...options,
    populate: 'groups',
  });
  return clients;
};

/**
 * Get client by id
 * @param {ObjectId} id
 * @returns {Promise<Client>}
 */
const getClientById = async (id) => {
  const client = await Client.findById(id).populate('groups');
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }
  return client;
};

/**
 * Update client by id
 * @param {ObjectId} clientId
 * @param {Object} updateBody
 * @returns {Promise<Client>}
 */
const updateClientById = async (clientId, updateBody) => {
  const client = await getClientById(clientId);
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }
  if (updateBody.email && (await Client.isEmailTaken(updateBody.email, clientId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (updateBody.phone && (await Client.isPhoneTaken(updateBody.phone, clientId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already taken');
  }
  if (updateBody.groups && !(await validateGroups(updateBody.groups))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'All groups must be valid');
  }
  Object.assign(client, updateBody);
  await client.save();
  return client.populate('groups');
};

/**
 * Delete client by id
 * @param {ObjectId} clientId
 * @returns {Promise<Client>}
 */
const deleteClientById = async (clientId) => {
  const client = await getClientById(clientId);
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }
  await client.remove();
  return client;
};

export {
  createClient,
  queryClients,
  getClientById,
  updateClientById,
  deleteClientById,
}; 