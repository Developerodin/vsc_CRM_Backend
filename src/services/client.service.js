import httpStatus from 'http-status';
import { Client, Activity, FileManager, Timeline, Task } from '../models/index.js';
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

  // Process GST numbers if provided
  if (clientBody.gstNumbers && Array.isArray(clientBody.gstNumbers)) {
    const gstResult = await processGstNumbersFromFrontend(clientBody.gstNumbers, []);
    
    if (!gstResult.isValid) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'GST numbers validation failed', {
        errors: gstResult.errors
      });
    }
    
    // Replace the gstNumbers field with processed result
    clientBody.gstNumbers = gstResult.gstNumbers;
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
  
  // Handle global search across multiple fields
  if (mongoFilter.search) {
    const searchValue = mongoFilter.search;
    const searchRegex = { $regex: searchValue, $options: 'i' };
    
    // Create an $or condition to search across multiple fields
    mongoFilter.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
      { district: searchRegex },
      { businessType: searchRegex },
      { pan: searchRegex },
      { 'gstNumbers.gstNumber': searchRegex },
      { 'gstNumbers.state': searchRegex }
    ];
    
    // Remove the search parameter as it's now handled by $or
    delete mongoFilter.search;
  }
  
  // Handle individual field filters (only if no global search)
  if (!mongoFilter.$or) {
    // If name filter exists, convert it to case-insensitive regex
    if (mongoFilter.name) {
      mongoFilter.name = { $regex: mongoFilter.name, $options: 'i' };
    }
    
    // If email filter exists, convert it to case-insensitive regex
    if (mongoFilter.email) {
      mongoFilter.email = { $regex: mongoFilter.email, $options: 'i' };
    }
    
    // If phone filter exists, convert it to case-insensitive regex
    if (mongoFilter.phone) {
      mongoFilter.phone = { $regex: mongoFilter.phone, $options: 'i' };
    }
    
    // If district filter exists, convert it to case-insensitive regex
    if (mongoFilter.district) {
      mongoFilter.district = { $regex: mongoFilter.district, $options: 'i' };
    }
    
    // If businessType filter exists, convert it to case-insensitive regex
    if (mongoFilter.businessType) {
      mongoFilter.businessType = { $regex: mongoFilter.businessType, $options: 'i' };
    }
    
    // If pan filter exists, convert it to case-insensitive regex
    if (mongoFilter.pan) {
      mongoFilter.pan = { $regex: mongoFilter.pan, $options: 'i' };
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

  // Process GST numbers if provided
  if (updateBody.gstNumbers !== undefined) {
    const gstResult = await processGstNumbersFromFrontend(updateBody.gstNumbers, client.gstNumbers);
    
    if (!gstResult.isValid) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'GST numbers validation failed', {
        errors: gstResult.errors
      });
    }
    
    // Replace the gstNumbers field with processed result
    updateBody.gstNumbers = gstResult.gstNumbers;
  }
  
  Object.assign(client, updateBody);
  await client.save();
  return client;
};

/**
 * Update client status by id
 * @param {ObjectId} clientId
 * @param {string} status - New status ('active' or 'inactive')
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<Client>}
 */
const updateClientStatus = async (clientId, status, user = null) => {
  const client = await getClientById(clientId);
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }
  
  // Validate branch access if user is provided
  if (user && user.role) {
    if (!hasBranchAccess(user.role, client.branch)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this client');
    }
  }
  
  // Update status
  client.status = status;
  
  // If status is being set to inactive, set all activities to inactive
  if (status === 'inactive' && client.activities && client.activities.length > 0) {
    client.activities.forEach(activity => {
      activity.status = 'inactive';
    });
  }
  
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
  await client.deleteOne();
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
      if (activity) {
        // Use the IDs directly from frontend (no need to convert)
        activities.push({
          activity: activityRow.activity, // Keep the original ID
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

// Helper function to process GST numbers from frontend data
const processGstNumbersFromFrontend = async (gstNumbersData, existingGstNumbers = []) => {
  console.log('🔍 processGstNumbersFromFrontend called with:');
  console.log('gstNumbersData:', JSON.stringify(gstNumbersData, null, 2));
  console.log('existingGstNumbers:', JSON.stringify(existingGstNumbers, null, 2));
  
  if (!gstNumbersData || !Array.isArray(gstNumbersData)) {
    console.log('❌ Invalid input data, returning early');
    return { isValid: true, gstNumbers: existingGstNumbers, errors: [] };
  }

  // Start with empty array - we'll rebuild it from the frontend data
  const gstNumbers = [];
  const errors = [];
  console.log('Starting with empty GST numbers array, will rebuild from frontend data');
  
  for (const gstRow of gstNumbersData) {
    try {
      console.log(`🔍 Processing GST row:`, gstRow);
      
      // Validate GST number format
      console.log(`🔍 Validating GST number: ${gstRow.gstNumber}`);
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      const isValidFormat = gstRegex.test(gstRow.gstNumber);
      console.log(`GST format validation result: ${isValidFormat}`);
      
      if (!gstRow.gstNumber || !isValidFormat) {
        console.log(`❌ GST format validation failed for: ${gstRow.gstNumber}`);
        errors.push({
          type: 'INVALID_GST_FORMAT',
          message: `Invalid GST number format: ${gstRow.gstNumber}`,
          data: gstRow
        });
        continue;
      }
      
      console.log(`✅ GST format validation passed for: ${gstRow.gstNumber}`);

      // Validate state is provided
      if (!gstRow.state || gstRow.state.trim() === '') {
        errors.push({
          type: 'MISSING_STATE',
          message: 'State is required for GST number',
          data: gstRow
        });
        continue;
      }

      // Check if this is an update (has _id) or new entry
      if (gstRow._id) {
        console.log(`🔄 Processing UPDATE for existing GST with ID: ${gstRow._id}`);
        
        // Find the existing GST number to update
        const existingGst = existingGstNumbers.find(gst => gst._id && gst._id.toString() === gstRow._id);
        if (existingGst) {
          console.log(`✅ Found existing GST to update:`, existingGst);
          
          // Check if updating state would conflict with other GST numbers in the same request
          const stateConflict = gstNumbers.find(gst => gst.state === gstRow.state && gst._id !== gstRow._id);
          if (stateConflict) {
            console.log(`❌ State conflict detected: ${gstRow.state} already exists in this update`);
            errors.push({
              type: 'DUPLICATE_STATE',
              message: `GST number already exists for state: ${gstRow.state}`,
              data: gstRow
            });
            continue;
          }
          
          // Add the updated GST number
          gstNumbers.push({
            _id: gstRow._id,
            state: gstRow.state.trim(),
            gstNumber: gstRow.gstNumber.trim()
          });
          console.log(`✅ Updated GST added to result:`, gstNumbers[gstNumbers.length - 1]);
        } else {
          console.log(`❌ GST with ID ${gstRow._id} not found in existing data`);
          errors.push({
            type: 'GST_NOT_FOUND',
            message: `GST number with ID '${gstRow._id}' not found`,
            data: gstRow
          });
        }
      } else {
        console.log(`➕ Processing NEW GST for state: ${gstRow.state}`);
        
        // Check if state already exists in this update request
        const stateConflict = gstNumbers.find(gst => gst.state === gstRow.state);
        if (stateConflict) {
          console.log(`❌ State conflict detected: ${gstRow.state} already exists in this update`);
          errors.push({
            type: 'DUPLICATE_STATE',
            message: `GST number already exists for state: ${gstRow.state}`,
            data: gstRow
          });
          continue;
        }
        
        // Check if state already exists in existing data
        const existingStateConflict = existingGstNumbers.find(gst => gst.state === gstRow.state);
        if (existingStateConflict) {
          console.log(`❌ State conflict with existing data: ${gstRow.state} already exists`);
          errors.push({
            type: 'DUPLICATE_STATE',
            message: `GST number already exists for state: ${gstRow.state}`,
            data: gstRow
          });
          continue;
        }

        // Add new GST number
        gstNumbers.push({
          state: gstRow.state.trim(),
          gstNumber: gstRow.gstNumber.trim()
        });
        console.log(`✅ New GST added to result:`, gstNumbers[gstNumbers.length - 1]);
      }
    } catch (error) {
      console.error('Error processing GST row:', error, gstRow);
      errors.push({
        type: 'VALIDATION_ERROR',
        message: 'Error processing GST data',
        data: gstRow
      });
    }
  }
  
  console.log('🔍 processGstNumbersFromFrontend returning:');
  console.log('isValid:', errors.length === 0);
  console.log('gstNumbers count:', gstNumbers.length);
  console.log('errors count:', errors.length);
  if (errors.length > 0) {
    console.log('Errors:', JSON.stringify(errors, null, 2));
  }
  
  return {
    isValid: errors.length === 0,
    gstNumbers,
    errors
  };
};

/**
 * Bulk import clients (create and update) - Allows duplicate emails and phones
 * @param {Array} clients - Array of client objects with optional id for updates
 * @returns {Promise<Object>} - Result with created and updated counts
 */
// Helper function to create client subfolder
const createClientSubfolder = async (clientName, branchId) => {
  try {
    // Ensure Clients parent folder exists
    let clientsParentFolder = await FileManager.findOne({
      type: 'folder',
      'folder.name': 'Clients',
      'folder.isRoot': true,
      isDeleted: false
    });

    if (!clientsParentFolder) {
      clientsParentFolder = await FileManager.create({
        type: 'folder',
        folder: {
          name: 'Clients',
          description: 'Parent folder for all client subfolders',
          parentFolder: null,
          createdBy: branchId,
          isRoot: true,
          path: '/Clients'
        }
      });
    }

    // Create client subfolder if it doesn't exist
    const existingClientFolder = await FileManager.findOne({
      type: 'folder',
      'folder.name': clientName,
      'folder.parentFolder': clientsParentFolder._id,
      isDeleted: false
    });

    if (!existingClientFolder) {
      await FileManager.create({
        type: 'folder',
        folder: {
          name: clientName,
          description: `Folder for client: ${clientName}`,
          parentFolder: clientsParentFolder._id,
          createdBy: branchId,
          isRoot: false,
          path: `/Clients/${clientName}`,
          metadata: {
            clientName: clientName
          }
        }
      });
    }
  } catch (error) {
    throw error;
  }
};

// Helper function to create timelines for client activities
const createClientTimelines = async (client, activities) => {
  try {
    if (!activities || activities.length === 0) return;

    const timelinePromises = [];
    
    for (const activityItem of activities) {
      try {
        // Get the full activity document to check frequency
        const activity = await Activity.findById(activityItem.activity);
        
        // Only create timeline if activity has frequency and frequencyConfig
        if (activity && activity.frequency && activity.frequencyConfig) {
          // Calculate start and end dates (1 year from today)
          const startDate = new Date();
          const endDate = new Date();
          endDate.setFullYear(endDate.getFullYear() + 1);
          
          // Create timeline
          const timeline = new Timeline({
            activity: activity._id,
            client: client._id,
            status: 'pending',
            startDate: startDate,
            endDate: endDate,
            frequency: activity.frequency,
            frequencyConfig: activity.frequencyConfig,
            branch: client.branch
          });
          
          timelinePromises.push(timeline.save());
        }
      } catch (error) {
        // Continue with other activities even if one fails
      }
    }
    
    // Wait for all timelines to be created
    if (timelinePromises.length > 0) {
      await Promise.all(timelinePromises);
    }
  } catch (error) {
    throw error;
  }
};

const bulkImportClients = async (clients) => {
  const results = {
    created: 0,
    updated: 0,
    errors: [],
    totalProcessed: 0,
  };

  const BATCH_SIZE = 100; // Process in batches to avoid memory issues
  
  const startTime = Date.now();

  // Separate clients for creation and update
  const toCreate = clients.filter((client) => !client.id);
  const toUpdate = clients.filter((client) => client.id);

  // Process creation in batches - allow duplicates
  if (toCreate.length > 0) {
    for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
      const batch = toCreate.slice(i, i + BATCH_SIZE);

      try {
        // Process activities and GST numbers for each client before creation
        const processedBatch = await Promise.all(
          batch.map(async (client) => {
            let processedClient = { ...client };
            
            // Process activities if provided
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
              processedClient.activities = result.activities;
            }

            // Process GST numbers if provided
            if (client.gstNumbers && Array.isArray(client.gstNumbers)) {
              const gstResult = await processGstNumbersFromFrontend(client.gstNumbers, []);
              if (!gstResult.isValid) {
                // Add validation errors to results
                gstResult.errors.forEach(error => {
                  results.errors.push({
                    index: i,
                    error: error.message,
                    data: { ...client, gstError: error }
                  });
                });
              }
              processedClient.gstNumbers = gstResult.gstNumbers;
            }

            return processedClient;
          })
        );

        // Use bulk insert to create all clients, allowing duplicates
        const insertResult = await Client.insertMany(processedBatch, {
          ordered: false, // Continue processing even if some fail
        });
        results.created += insertResult.length;
        results.totalProcessed += batch.length;

        // Create subfolders and timelines for newly created clients
        // Process in smaller batches to avoid overwhelming the system
        const POST_PROCESS_BATCH_SIZE = 20;
        for (let j = 0; j < insertResult.length; j += POST_PROCESS_BATCH_SIZE) {
          const postProcessBatch = insertResult.slice(j, j + POST_PROCESS_BATCH_SIZE);
          
          await Promise.all(
            postProcessBatch.map(async (createdClient) => {
              try {
                // Create subfolder
                await createClientSubfolder(createdClient.name, createdClient.branch);
                
                // Create timelines if activities exist
                if (createdClient.activities && createdClient.activities.length > 0) {
                  await createClientTimelines(createdClient, createdClient.activities);
                }
              } catch (error) {
                // Add to errors but don't fail the entire batch
                results.errors.push({
                  index: i + j,
                  error: `Post-processing failed: ${error.message}`,
                  data: createdClient,
                });
              }
            })
          );
        }
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

            // Process GST numbers if provided
            let gstNumbers = undefined;
            if (client.gstNumbers && Array.isArray(client.gstNumbers)) {
              // For updates, we need to fetch existing GST numbers to process properly
              try {
                const existingClient = await Client.findById(client.id);
                if (existingClient) {
                  const gstResult = await processGstNumbersFromFrontend(client.gstNumbers, existingClient.gstNumbers);
                  if (gstResult.isValid) {
                    gstNumbers = gstResult.gstNumbers;
                  } else {
                    // Add validation errors to results
                    gstResult.errors.forEach(error => {
                      results.errors.push({
                        index: i,
                        error: error.message,
                        data: { ...client, gstError: error }
                      });
                    });
                  }
                }
              } catch (error) {
                results.errors.push({
                  index: i,
                  error: `Failed to process GST numbers: ${error.message}`,
                  data: client
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
                    gstNumbers: gstNumbers,
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

        // For updated clients, we need to fetch them to create/update subfolders and timelines
        if (updateResult.modifiedCount > 0) {
          // Fetch the updated clients to get their current state
          const updatedClientIds = batch.map(client => client.id);
          const updatedClients = await Client.find({ _id: { $in: updatedClientIds } });
          
          // Process in smaller batches to avoid overwhelming the system
          const POST_PROCESS_BATCH_SIZE = 20;
          for (let j = 0; j < updatedClients.length; j += POST_PROCESS_BATCH_SIZE) {
            const postProcessBatch = updatedClients.slice(j, j + POST_PROCESS_BATCH_SIZE);
            
            await Promise.all(
              postProcessBatch.map(async (updatedClient) => {
                try {
                  // Ensure subfolder exists (update if needed)
                  await createClientSubfolder(updatedClient.name, updatedClient.branch);
                  
                  // Create timelines if activities exist and were updated
                  if (updatedClient.activities && updatedClient.activities.length > 0) {
                    await createClientTimelines(updatedClient, updatedClient.activities);
                  }
                } catch (error) {
                  // Add to errors but don't fail the entire batch
                  results.errors.push({
                    index: i + j,
                    error: `Post-processing failed: ${error.message}`,
                    data: updatedClient,
                  });
                }
              })
            );
          }
        }
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
    notes: activityData.notes || '',
  });
  
  await client.save();
  return client.populate([
    { path: 'activities.activity' },
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
  
  // Update the activity notes only (assigned team member removed)
  if (updateData.notes !== undefined) {
    activity.notes = updateData.notes;
  }
  
  // Update the activity status if provided
  if (updateData.status !== undefined) {
    activity.status = updateData.status;
  }
  
  await client.save();
  return client.populate([
    { path: 'activities.activity' },
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
  if (query.status) {
    activities = activities.filter(activity => activity.status === query.status);
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

/**
 * Get client task statistics based on timeline data
 * @param {Object} filter - Filter to select which clients to get statistics for
 * @param {Object} options - Query options
 * @param {number} [options.limit] - Maximum number of results per page (default = 50)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {Object} user - User object with role information
 * @returns {Promise<Object>} - Client task statistics with pagination
 */
const getClientTaskStatistics = async (filter = {}, options = {}, user = null) => {
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

    // Handle search parameter (searches across name, email, phone, district, businessType, pan)
    if (mongoFilter.search) {
      const searchValue = mongoFilter.search;
      const searchRegex = { $regex: searchValue, $options: 'i' };
      
      // Create an $or condition to search across multiple fields
      mongoFilter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { district: searchRegex },
        { businessType: searchRegex },
        { pan: searchRegex }
      ];
      
      // Remove the search parameter as it's now handled by $or
      delete mongoFilter.search;
    }
    // If name filter exists (and no search), convert it to case-insensitive regex
    else if (mongoFilter.name) {
      mongoFilter.name = { $regex: mongoFilter.name, $options: 'i' };
    }

    // Get pagination options
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 50;
    const skip = (page - 1) * limit;

    // First, get the clients that match the filter
    const clients = await Client.find(mongoFilter)
      .select('_id name email branch')
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalClients = await Client.countDocuments(mongoFilter);

    // Check if there are any tasks at all
    const totalTasks = await Task.countDocuments();
    
    if (totalTasks === 0) {
      return {
        results: clients.map(client => ({
          _id: client._id,
          name: client.name,
          email: client.email,
          branch: client.branch,
          totalTasks: 0,
          pendingTasks: 0,
          ongoingTasks: 0,
          completedTasks: 0,
          on_holdTasks: 0,
          cancelledTasks: 0,
          delayedTasks: 0
        })),
        page,
        limit,
        totalPages: Math.ceil(totalClients / limit),
        totalResults: totalClients
      };
    }

    // Get all client IDs we're interested in
    const clientIds = clients.map(c => c._id);
    
    // Simplified aggregation pipeline
    let clientStats = await Task.aggregate([
      // Match tasks that have timelines
      {
        $match: {
          timeline: { $exists: true, $ne: [] }
        }
      },
      // Unwind timeline array
      {
        $unwind: '$timeline'
      },
      // Lookup timeline details
      {
        $lookup: {
          from: 'timelines',
          localField: 'timeline',
          foreignField: '_id',
          as: 'timelineDetails'
        }
      },
      // Unwind timeline details
      {
        $unwind: '$timelineDetails'
      },
      // Lookup client details from timeline
      {
        $lookup: {
          from: 'clients',
          localField: 'timelineDetails.client',
          foreignField: '_id',
          as: 'clientDetails'
        }
      },
      // Unwind client details
      {
        $unwind: '$clientDetails'
      },
      // Match only the clients we're interested in
      {
        $match: {
          'clientDetails._id': { $in: clientIds }
        }
      },
      // Group by client and status
      {
        $group: {
          _id: {
            clientId: '$clientDetails._id',
            clientName: '$clientDetails.name',
            clientEmail: '$clientDetails.email',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      // Group by client to get all statuses together
      {
        $group: {
          _id: {
            clientId: '$_id.clientId',
            clientName: '$_id.clientName',
            clientEmail: '$_id.clientEmail'
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

    // If no results from timeline-based approach, try direct task-to-client mapping
    if (clientStats.length === 0) {
      // Get all tasks for the clients' branches
      const clientBranchIds = clients.map(c => c.branch);
      const directTaskStats = await Task.aggregate([
        // Match tasks in the same branches as our clients
        {
          $match: {
            branch: { $in: clientBranchIds }
          }
        },
        // Group by branch and status to get overall branch statistics
        {
          $group: {
            _id: {
              branch: '$branch',
              status: '$status'
            },
            count: { $sum: 1 }
          }
        },
        // Group by branch to get all statuses together
        {
          $group: {
            _id: {
              branch: '$_id.branch'
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

      // Map branch stats to clients
      const branchStatsMap = new Map();
      directTaskStats.forEach(stat => {
        branchStatsMap.set(stat._id.branch.toString(), stat);
      });

      // Create client stats based on branch statistics
      clientStats = clients.map(client => {
        const branchStats = branchStatsMap.get(client.branch.toString());
        if (branchStats) {
          return {
            _id: {
              clientId: client._id,
              clientName: client.name,
              clientEmail: client.email
            },
            statusCounts: branchStats.statusCounts,
            totalTasks: branchStats.totalTasks
          };
        } else {
          return {
            _id: {
              clientId: client._id,
              clientName: client.name,
              clientEmail: client.email
            },
            statusCounts: [],
            totalTasks: 0
          };
        }
      });
    }

    // Create a map of client stats by client ID
    const clientStatsMap = new Map();
    clientStats.forEach(stat => {
      const clientId = stat._id.clientId.toString();
      
      // Initialize stats if not exists
      if (!clientStatsMap.has(clientId)) {
        clientStatsMap.set(clientId, {
          totalTasks: 0,
          pendingTasks: 0,
          ongoingTasks: 0,
          completedTasks: 0,
          on_holdTasks: 0,
          cancelledTasks: 0,
          delayedTasks: 0
        });
      }
      
      const currentStats = clientStatsMap.get(clientId);
      currentStats.totalTasks = stat.totalTasks;
      
      // Process status counts
      stat.statusCounts.forEach(statusCount => {
        switch (statusCount.status) {
          case 'pending':
            currentStats.pendingTasks = statusCount.count;
            break;
          case 'ongoing':
            currentStats.ongoingTasks = statusCount.count;
            break;
          case 'completed':
            currentStats.completedTasks = statusCount.count;
            break;
          case 'on_hold':
            currentStats.on_holdTasks = statusCount.count;
            break;
          case 'cancelled':
            currentStats.cancelledTasks = statusCount.count;
            break;
          case 'delayed':
            currentStats.delayedTasks = statusCount.count;
            break;
        }
      });
    });

    // Merge client info with task statistics
    const result = clients.map(client => {
      const stats = clientStatsMap.get(client._id.toString()) || {
        totalTasks: 0,
        pendingTasks: 0,
        ongoingTasks: 0,
        completedTasks: 0,
        on_holdTasks: 0,
        cancelledTasks: 0,
        delayedTasks: 0
      };

      return {
        _id: client._id,
        name: client.name,
        email: client.email,
        branch: client.branch,
        ...stats
      };
    });

    return {
      results: result,
      page,
      limit,
      totalPages: Math.ceil(totalClients / limit),
      totalResults: totalClients
    };

  } catch (error) {
    throw error;
  }
};

/**
 * Reprocess existing clients to create missing timelines and subfolders
 * This is useful for clients that were imported before the automatic creation was implemented
 * @param {Object} filter - Filter to select which clients to reprocess
 * @param {number} batchSize - Number of clients to process at once (default: 50)
 * @returns {Promise<Object>} - Results of the reprocessing
 */
const reprocessExistingClients = async (filter = {}, batchSize = 50) => {
  const results = {
    processed: 0,
    subfoldersCreated: 0,
    timelinesCreated: 0,
    errors: [],
    totalClients: 0
  };

  try {
    // Get total count of clients to process
    const totalClients = await Client.countDocuments(filter);
    results.totalClients = totalClients;
    
    if (totalClients === 0) {
      return results;
    }
    
    // Process clients in batches
    for (let skip = 0; skip < totalClients; skip += batchSize) {
      const clients = await Client.find(filter)
        .skip(skip)
        .limit(batchSize)
        .populate('activities.activity');
      
      await Promise.all(
        clients.map(async (client) => {
          try {
            // Create subfolder if it doesn't exist
            await createClientSubfolder(client.name, client.branch);
            results.subfoldersCreated++;
            
            // Create timelines if activities exist
            if (client.activities && client.activities.length > 0) {
              await createClientTimelines(client, client.activities);
              results.timelinesCreated++;
            }
            
            results.processed++;
          } catch (error) {
            results.errors.push({
              clientId: client._id,
              clientName: client.name,
              error: error.message
            });
          }
        })
      );
      
      // Small delay between batches to avoid overwhelming the system
      if (skip + batchSize < totalClients) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
  } catch (error) {
    throw error;
  }
  
  return results;
};

/**
 * Add a new GST number to a client
 * @param {ObjectId} clientId - Client ID
 * @param {Object} gstData - GST data with state and gstNumber
 * @returns {Promise<Client>}
 */
const addGstNumber = async (clientId, gstData) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }

  // Check if GST number already exists for this state
  const existingGst = client.gstNumbers.find(
    gst => gst.state === gstData.state
  );
  
  if (existingGst) {
    throw new ApiError(httpStatus.CONFLICT, 'GST number already exists for this state');
  }

  // Add new GST number
  client.gstNumbers.push(gstData);
  await client.save();
  
  return client;
};

/**
 * Remove a GST number from a client
 * @param {ObjectId} clientId - Client ID
 * @param {string} gstId - GST ID (state)
 * @returns {Promise<void>}
 */
const removeGstNumber = async (clientId, gstId) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }

  const gstIndex = client.gstNumbers.findIndex(
    gst => gst._id.toString() === gstId
  );
  
  if (gstIndex === -1) {
    throw new ApiError(httpStatus.NOT_FOUND, 'GST number not found');
  }

  client.gstNumbers.splice(gstIndex, 1);
  await client.save();
};

/**
 * Update a GST number for a client
 * @param {ObjectId} clientId - Client ID
 * @param {string} gstId - GST ID
 * @param {Object} updateData - Updated GST data
 * @returns {Promise<Client>}
 */
const updateGstNumber = async (clientId, gstId, updateData) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }

  const gstIndex = client.gstNumbers.findIndex(
    gst => gst._id.toString() === gstId
  );
  
  if (gstIndex === -1) {
    throw new ApiError(httpStatus.NOT_FOUND, 'GST number not found');
  }

  // Check if updating state would conflict with existing GST
  if (updateData.state && updateData.state !== client.gstNumbers[gstIndex].state) {
    const existingGst = client.gstNumbers.find(
      gst => gst.state === updateData.state && gst._id.toString() !== gstId
    );
    
    if (existingGst) {
      throw new ApiError(httpStatus.CONFLICT, 'GST number already exists for this state');
    }
  }

  // Update GST data
  Object.assign(client.gstNumbers[gstIndex], updateData);
  await client.save();
  
  return client;
};

/**
 * Get all GST numbers for a client
 * @param {ObjectId} clientId - Client ID
 * @returns {Promise<Array>}
 */
const getGstNumbers = async (clientId) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }

  return client.gstNumbers;
};

export { 
  createClient, 
  queryClients, 
  getClientById, 
  getClientByEmail,
  updateClientById, 
  updateClientStatus,
  deleteClientById, 
  bulkImportClients,
  addActivityToClient,
  removeActivityFromClient,
  updateActivityAssignment,
  getClientActivities,
  getClientTaskStatistics,
  reprocessExistingClients,
  addGstNumber,
  removeGstNumber,
  updateGstNumber,
  getGstNumbers,
}; 