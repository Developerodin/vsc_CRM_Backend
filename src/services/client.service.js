import httpStatus from 'http-status';
import { Client, Activity, TeamMember } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { hasBranchAccess, getUserBranchIds } from './role.service.js';

/**
 * Create a client
 * @param {Object} clientBody
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<Client>}
 */
const createClient = async (clientBody, user = null) => {
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
 * Get client by email
 * @param {string} email
 * @returns {Promise<Client>}
 */
const getClientByEmail = async (email) => {
  const client = await Client.findOne({ email });
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

// Helper function to validate and process activities from frontend data
const processActivitiesFromFrontend = async (activityData) => {
  if (!activityData || !Array.isArray(activityData)) {
    return { isValid: true, activities: [], errors: [] };
  }

  const activities = [];
  const errors = [];
  
  for (const activityRow of activityData) {
    try {
      // Validate that activity exists by ID
      const activity = await Activity.findById(activityRow.activity);
      
      // Validate that team member exists by ID
      const teamMember = await TeamMember.findById(activityRow.assignedTeamMember);
      
      if (activity && teamMember) {
        // Use the IDs directly from frontend (no need to convert)
        activities.push({
          activity: activityRow.activity, // Keep the original ID
          assignedTeamMember: activityRow.assignedTeamMember, // Keep the original ID
          assignedDate: new Date(), // System automatically sets current date
          notes: activityRow.notes || ''
        });
      } else {
        // Add validation error
        if (!activity) {
          errors.push({
            type: 'ACTIVITY_NOT_FOUND',
            message: `Activity with ID '${activityRow.activity}' not found`,
            data: activityRow
          });
        }
        if (!teamMember) {
          errors.push({
            type: 'TEAM_MEMBER_NOT_FOUND',
            message: `Team member with ID '${activityRow.assignedTeamMember}' not found`,
            data: activityRow
          });
        }
      }
    } catch (error) {
      console.error('Error validating activity row:', error, activityRow);
      errors.push({
        type: 'VALIDATION_ERROR',
        message: 'Error validating activity data',
        data: activityRow
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    activities,
    errors
  };
};

/**
 * Bulk import clients (create and update) - Allows duplicate emails and phones
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

  // Process creation in batches - allow duplicates
  if (toCreate.length > 0) {
    for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
      const batch = toCreate.slice(i, i + BATCH_SIZE);

      try {
        // Process activities for each client before creation
        const processedBatch = await Promise.all(
          batch.map(async (client) => {
            if (client.activities && Array.isArray(client.activities)) {
              const result = await processActivitiesFromFrontend(client.activities);
              if (!result.isValid) {
                // Add validation errors to results
                result.errors.forEach(error => {
                  results.errors.push({
                    index: i,
                    error: error.message,
                    data: { ...client, activityError: error }
                  });
                });
              }
              return { ...client, activities: result.activities };
            }
            return client;
          })
        );

        // Use bulk insert to create all clients, allowing duplicates
        const insertResult = await Client.insertMany(processedBatch, {
          ordered: false, // Continue processing even if some fail
        });
        results.created += insertResult.length;
        results.totalProcessed += batch.length;
      } catch (error) {
        if (error.writeErrors) {
          // Handle partial failures in batch
          results.created += error.insertedCount || 0;
          error.writeErrors.forEach((writeError) => {
            results.errors.push({
              index: i + writeError.index,
              error: writeError.err.errmsg || 'Creation failed',
              data: batch[writeError.index],
            });
          });
        } else {
          // If batch completely fails, add all items as errors
          batch.forEach((client, batchIndex) => {
            results.errors.push({
              index: i + batchIndex,
              error: error.message || 'Creation failed',
              data: client,
            });
          });
        }
        results.totalProcessed += batch.length;
      }
    }
  }

  // Process updates in batches
  if (toUpdate.length > 0) {
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);

      try {
        const updateOps = await Promise.all(
          batch.map(async (client) => {
            // Process activities if provided
            let activities = [];
            if (client.activities && Array.isArray(client.activities)) {
              const result = await processActivitiesFromFrontend(client.activities);
              if (result.isValid) {
                activities = result.activities;
              } else {
                // Add validation errors to results
                result.errors.forEach(error => {
                  results.errors.push({
                    index: i,
                    error: error.message,
                    data: { ...client, activityError: error }
                  });
                });
              }
            }

            return {
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
                    // New business fields
                    businessType: client.businessType,
                    gstNumber: client.gstNumber,
                    tanNumber: client.tanNumber,
                    cinNumber: client.cinNumber,
                    udyamNumber: client.udyamNumber,
                    iecCode: client.iecCode,
                    entityType: client.entityType,
                    metadata: client.metadata,
                    // Update activities if provided
                    ...(activities.length > 0 && { activities }),
                  },
                },
                upsert: false,
              },
            };
          })
        );

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
            results.errors.push({
              index: i + writeError.index,
              error: writeError.err.errmsg || 'Update failed',
              data: batch[writeError.index],
            });
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

// Activity management service methods

/**
 * Add an activity to a client
 * @param {ObjectId} clientId
 * @param {Object} activityData
 * @returns {Promise<Client>}
 */
const addActivityToClient = async (clientId, activityData) => {
  const client = await getClientById(clientId);
  
  // Check if activity already exists for this client
  const existingActivity = client.activities.find(
    (act) => act.activity.toString() === activityData.activity
  );
  
  if (existingActivity) {
    throw new ApiError(httpStatus.CONFLICT, 'Activity already exists for this client');
  }
  
  // Add the new activity
  client.activities.push({
    activity: activityData.activity,
    assignedTeamMember: activityData.assignedTeamMember,
    notes: activityData.notes || '',
  });
  
  await client.save();
  return client.populate([
    { path: 'activities.activity' },
    { path: 'activities.assignedTeamMember' }
  ]);
};

/**
 * Remove an activity from a client
 * @param {ObjectId} clientId
 * @param {ObjectId} activityId
 * @returns {Promise<void>}
 */
const removeActivityFromClient = async (clientId, activityId) => {
  const client = await getClientById(clientId);
  
  const activityIndex = client.activities.findIndex(
    (act) => act.activity.toString() === activityId
  );
  
  if (activityIndex === -1) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found for this client');
  }
  
  client.activities.splice(activityIndex, 1);
  await client.save();
};

/**
 * Update activity assignment for a client
 * @param {ObjectId} clientId
 * @param {ObjectId} activityId
 * @param {Object} updateData
 * @returns {Promise<Client>}
 */
const updateActivityAssignment = async (clientId, activityId, updateData) => {
  const client = await getClientById(clientId);
  
  const activity = client.activities.find(
    (act) => act.activity.toString() === activityId
  );
  
  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found for this client');
  }
  
  // Update the activity assignment
  if (updateData.assignedTeamMember !== undefined) {
    activity.assignedTeamMember = updateData.assignedTeamMember;
  }
  
  if (updateData.notes !== undefined) {
    activity.notes = updateData.notes;
  }
  
  await client.save();
  return client.populate([
    { path: 'activities.activity' },
    { path: 'activities.assignedTeamMember' }
  ]);
};

/**
 * Get client activities with filtering and pagination
 * @param {ObjectId} clientId
 * @param {Object} query - Query parameters
 * @returns {Promise<Object>}
 */
const getClientActivities = async (clientId, query = {}) => {
  const client = await getClientById(clientId);
  
  let activities = client.activities;
  
  // Apply filters
  if (query.assignedTeamMember) {
    activities = activities.filter(
      (act) => act.assignedTeamMember.toString() === query.assignedTeamMember
    );
  }
  
  // Apply sorting
  if (query.sortBy) {
    const [field, order] = query.sortBy.split(':');
    const sortOrder = order === 'desc' ? -1 : 1;
    
    activities.sort((a, b) => {
      if (field === 'assignedDate') {
        return (new Date(a.assignedDate) - new Date(b.assignedDate)) * sortOrder;
      }
      return 0;
    });
  }
  
  // Apply pagination
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  const paginatedActivities = activities.slice(startIndex, endIndex);
  
  return {
    activities: paginatedActivities,
    pagination: {
      page,
      limit,
      total: activities.length,
      pages: Math.ceil(activities.length / limit),
    },
  };
};

export { 
  createClient, 
  queryClients, 
  getClientById, 
  getClientByEmail,
  updateClientById, 
  deleteClientById, 
  bulkImportClients,
  addActivityToClient,
  removeActivityFromClient,
  updateActivityAssignment,
  getClientActivities,
}; 