import httpStatus from 'http-status';
import { Client } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { hasBranchAccess, getUserBranchIds } from './role.service.js';

/**
 * Create a client
 * @param {Object} clientBody
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<Client>}
 */
const createClient = async (clientBody, user = null) => {
  if (clientBody.email && (await Client.isEmailTaken(clientBody.email))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (clientBody.phone && (await Client.isPhoneTaken(clientBody.phone))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Phone number already taken');
  }
  
  // Validate branch access if user is provided
  if (user && user.role && clientBody.branch) {
    if (!hasBranchAccess(user.role, clientBody.branch)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
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
 * @param {Object} user - User object with role information
 * @returns {Promise<QueryResult>}
 */
const queryClients = async (filter, options, user) => {
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
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<Client>}
 */
const updateClientById = async (clientId, updateBody, user = null) => {
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
  
  // Validate branch access if user is provided and branch is being updated
  if (user && user.role && updateBody.branch) {
    if (!hasBranchAccess(user.role, updateBody.branch)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
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
 * Bulk import clients (create and update) - Optimized for large datasets with duplicate email and phone handling
 * @param {Array} clients - Array of client objects with optional id for updates
 * @returns {Promise<Object>} - Result with created and updated counts
 */
const bulkImportClients = async (clients) => {
  const results = {
    created: 0,
    updated: 0,
    errors: [],
    totalProcessed: 0,
  };

  const BATCH_SIZE = 100; // Process in batches to avoid memory issues

  // Separate clients for creation and update
  const toCreate = clients.filter((client) => !client.id);
  const toUpdate = clients.filter((client) => client.id);

  // Process creation in batches with duplicate email and phone handling
  if (toCreate.length > 0) {
    for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
      const batch = toCreate.slice(i, i + BATCH_SIZE);

      try {
        // Use individual inserts to handle duplicate emails and phones gracefully
        const insertPromises = batch.map(async (client, batchIndex) => {
          try {
            const newClient = await Client.create(client);
            return { success: true, client: newClient };
          } catch (error) {
            const globalIndex = i + batchIndex;
            if (error.code === 11000) {
              // Duplicate key error - handle both email and phone duplicates
              if (error.message.includes('email')) {
                // Duplicate email - try to find existing client and update
                try {
                  const existingClient = await Client.findOne({ email: client.email });
                  if (existingClient) {
                    // Update existing client with new data
                    Object.assign(existingClient, {
                      name: client.name || existingClient.name,
                      phone: client.phone || existingClient.phone,
                      email2: client.email2 || existingClient.email2,
                      address: client.address || existingClient.address,
                      district: client.district || existingClient.district,
                      state: client.state || existingClient.state,
                      country: client.country || existingClient.country,
                      fNo: client.fNo || existingClient.fNo,
                      pan: client.pan || existingClient.pan,
                      dob: client.dob || existingClient.dob,
                      branch: client.branch || existingClient.branch,
                      sortOrder: client.sortOrder || existingClient.sortOrder,
                    });
                    await existingClient.save();
                    return { success: true, updated: true, client: existingClient };
                  }
                } catch (updateError) {
                  return { 
                    success: false, 
                    error: `Failed to update existing client with email: ${client.email}`,
                    globalIndex 
                  };
                }
              } else if (error.message.includes('phone')) {
                // Duplicate phone - try to find existing client and update
                try {
                  const existingClient = await Client.findOne({ phone: client.phone });
                  if (existingClient) {
                    // Update existing client with new data
                    Object.assign(existingClient, {
                      name: client.name || existingClient.name,
                      email: client.email || existingClient.email,
                      email2: client.email2 || existingClient.email2,
                      address: client.address || existingClient.address,
                      district: client.district || existingClient.district,
                      state: client.state || existingClient.state,
                      country: client.country || existingClient.country,
                      fNo: client.fNo || existingClient.fNo,
                      pan: client.pan || existingClient.pan,
                      dob: client.dob || existingClient.dob,
                      branch: client.branch || existingClient.branch,
                      sortOrder: client.sortOrder || existingClient.sortOrder,
                    });
                    await existingClient.save();
                    return { success: true, updated: true, client: existingClient };
                  }
                } catch (updateError) {
                  return { 
                    success: false, 
                    error: `Failed to update existing client with phone: ${client.phone}`,
                    globalIndex 
                  };
                }
              }
            }
            return { 
              success: false, 
              error: error.message || 'Creation failed',
              globalIndex 
            };
          }
        });

        const insertResults = await Promise.all(insertPromises);
        
        insertResults.forEach((result) => {
          if (result.success) {
            if (result.updated) {
              results.updated++;
            } else {
              results.created++;
            }
          } else {
            results.errors.push({
              index: result.globalIndex,
              error: result.error,
              data: batch[result.globalIndex - i],
            });
          }
        });

        results.totalProcessed += batch.length;
      } catch (error) {
        // If batch completely fails, add all items as errors
        batch.forEach((client, batchIndex) => {
          results.errors.push({
            index: i + batchIndex,
            error: error.message || 'Creation failed',
            data: client,
          });
        });
        results.totalProcessed += batch.length;
      }
    }
  }

  // Process updates in batches
  if (toUpdate.length > 0) {
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);

      try {
        const updateOps = batch.map((client) => ({
          updateOne: {
            filter: { _id: client.id },
            update: {
              $set: {
                name: client.name,
                phone: client.phone,
                email: client.email,
                email2: client.email2,
                address: client.address,
                district: client.district,
                state: client.state,
                country: client.country,
                fNo: client.fNo,
                pan: client.pan,
                dob: client.dob,
                branch: client.branch,
                sortOrder: client.sortOrder,
              },
            },
            upsert: false,
          },
        }));

        const updateResult = await Client.bulkWrite(updateOps, {
          ordered: false, // Continue processing even if some fail
        });
        results.updated += updateResult.modifiedCount || 0;
        results.totalProcessed += batch.length;
      } catch (error) {
        if (error.writeErrors) {
          // Handle partial failures in batch
          results.updated += error.modifiedCount || 0;
          error.writeErrors.forEach((writeError) => {
            const errorMessage = writeError.err.errmsg || 'Update failed';
            
            // Handle duplicate key errors gracefully for both email and phone
            if (errorMessage.includes('duplicate key error')) {
              let fieldType = 'unknown';
              if (errorMessage.includes('email')) {
                fieldType = 'email';
              } else if (errorMessage.includes('phone')) {
                fieldType = 'phone';
              }
              
              results.errors.push({
                index: i + writeError.index,
                error: `${fieldType} already exists: ${batch[writeError.index]?.[fieldType] || 'unknown'}`,
                data: batch[writeError.index],
                type: `duplicate_${fieldType}`
              });
            } else {
              results.errors.push({
                index: i + writeError.index,
                error: errorMessage,
                data: batch[writeError.index],
              });
            }
          });
        } else {
          // If batch completely fails, add all items as errors
          batch.forEach((client, batchIndex) => {
            results.errors.push({
              index: i + batchIndex,
              error: error.message || 'Update failed',
              data: client,
            });
          });
        }
        results.totalProcessed += batch.length;
      }
    }
  }

  return results;
};

export { createClient, queryClients, getClientById, updateClientById, deleteClientById, bulkImportClients }; 