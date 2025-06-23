import httpStatus from 'http-status';
import { Client } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

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
  const client = await Client.create(clientBody);
  return client;
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
  // Create a new filter object to avoid modifying the original
  const mongoFilter = { ...filter };
  
  // If name filter exists, convert it to case-insensitive regex
  if (mongoFilter.name) {
    mongoFilter.name = { $regex: mongoFilter.name, $options: 'i' };
  }

  const clients = await Client.paginate(mongoFilter, options);
  return clients;
};

/**
 * Get client by id
 * @param {ObjectId} id
 * @returns {Promise<Client>}
 */
const getClientById = async (id) => {
  const client = await Client.findById(id);
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
  Object.assign(client, updateBody);
  await client.save();
  return client;
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

/**
 * Bulk import clients (create and update)
 * @param {Array} clients - Array of client objects with optional id for updates
 * @returns {Promise<Object>} - Result with created and updated counts
 */
const bulkImportClients = async (clients) => {
  const results = {
    created: 0,
    updated: 0,
    errors: [],
  };

  // Separate clients for creation and update
  const toCreate = clients.filter((client) => !client.id);
  const toUpdate = clients.filter((client) => client.id);

  // Handle bulk creation with unique field validation
  if (toCreate.length > 0) {
    try {
      // Validate unique fields before bulk insert
      const emailValidationPromises = toCreate.map(async (client, index) => {
        if (await Client.isEmailTaken(client.email)) {
          return { index, field: 'email', value: client.email };
        }
        return null;
      });

      const phoneValidationPromises = toCreate.map(async (client, index) => {
        if (await Client.isPhoneTaken(client.phone)) {
          return { index, field: 'phone', value: client.phone };
        }
        return null;
      });

      const [emailErrors, phoneErrors] = await Promise.all([
        Promise.all(emailValidationPromises),
        Promise.all(phoneValidationPromises),
      ]);

      const validationErrors = [...emailErrors, ...phoneErrors].filter(Boolean);
      
      if (validationErrors.length > 0) {
        validationErrors.forEach((error) => {
          results.errors.push({
            index: error.index,
            error: `${error.field} already taken: ${error.value}`,
            data: toCreate[error.index],
          });
        });
        // Remove clients with validation errors from creation
        const validClients = toCreate.filter((_, index) =>
          !validationErrors.some((error) => error.index === index)
        );
        
        if (validClients.length > 0) {
          const createdClients = await Client.insertMany(validClients, {
            ordered: false,
            rawResult: true,
          });
          results.created = createdClients.insertedCount || validClients.length;
        }
      } else {
        const createdClients = await Client.insertMany(toCreate, {
          ordered: false,
          rawResult: true,
        });
        results.created = createdClients.insertedCount || toCreate.length;
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
    const updateOps = toUpdate.map((client) => ({
      updateOne: {
        filter: { _id: client.id },
        update: {
          $set: {
            name: client.name,
            phone: client.phone,
            email: client.email,
            address: client.address,
            city: client.city,
            state: client.state,
            country: client.country,
            pinCode: client.pinCode,
            sortOrder: client.sortOrder,
          },
        },
        upsert: false,
      },
    }));

    try {
      const updateResult = await Client.bulkWrite(updateOps, {
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

export { createClient, queryClients, getClientById, updateClientById, deleteClientById, bulkImportClients }; 