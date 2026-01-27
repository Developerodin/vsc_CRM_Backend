import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { Client, Activity, FileManager, Timeline, Task, Branch } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { hasBranchAccess, getUserBranchIds } from './role.service.js';
import { createClientTimelines as createTimelinesFromService } from './timeline.service.js';
import cache from '../utils/cache.js';

/**
 * Helper function to get month name from month index
 * @param {number} monthIndex - Month index (0-11)
 * @returns {string} - Month name
 */
const getMonthName = (monthIndex) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
};

/**
 * Helper function to parse date from various formats
 * @param {string} dateString - Date string in DD.MM.YYYY or other formats
 * @returns {Date} - Parsed date object
 * @throws {Error} - If date cannot be parsed
 */
const parseGstDate = (dateString) => {
  if (!dateString) {
    throw new Error('Date string is required');
  }
  
  let parsedDate;
  
  if (dateString.includes('.')) {
    // Handle DD.MM.YYYY format
    const [day, month, year] = dateString.split('.');
    parsedDate = new Date(year, month - 1, day); // month is 0-indexed
  } else {
    // Handle other formats (ISO, etc.)
    parsedDate = new Date(dateString);
  }
  
  // Validate the parsed date
  if (isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid date format: ${dateString}. Expected DD.MM.YYYY format.`);
  }
  
  return parsedDate;
};

/**
 * Register quarter: July=Q1, October=Q2, January=Q3, May=Q4.
 * @param {number} monthIndex - Month index (0-11)
 * @returns {string} - Quarter (Q1, Q2, Q3, Q4)
 */
const getQuarterFromMonth = (monthIndex) => {
  if (monthIndex <= 2) return 'Q3';   // Jan–Mar
  if (monthIndex <= 5) return 'Q4';  // Apr–Jun
  if (monthIndex <= 8) return 'Q1';  // Jul–Sep
  return 'Q2';                       // Oct–Dec
};

/**
 * Quarter start month index for register: Q1=July(6), Q2=Oct(9), Q3=Jan(0), Q4=May(4).
 * @param {string} quarter - Quarter (Q1, Q2, Q3, Q4)
 * @returns {number} - Month index (0-11)
 */
const getQuarterStartMonth = (quarter) => {
  switch (quarter) {
    case 'Q1': return 6;  // July
    case 'Q2': return 9;  // October
    case 'Q3': return 0;  // January
    case 'Q4': return 4;  // May
    default: return 6;    // July
  }
};

/**
 * Helper function to automatically detect and add compliance activities based on client data
 * This function checks for PAN, TAN, GST numbers, and CIN with entity type and automatically adds corresponding activities
 * @param {Object} clientBody - Client data object
 * @param {Array} existingActivities - Existing activities array (for updates)
 * @returns {Promise<Array>} - Updated activities array with auto-detected compliance activities
 */
const autoDetectComplianceActivities = async (clientBody, existingActivities = []) => {
  const activities = existingActivities.length > 0 ? [...existingActivities] : (clientBody.activities || []);
  
  // Create a map of existing activities to avoid duplicates
  const existingActivityMap = new Map();
  activities.forEach(act => {
    const activityId = (act.activity && act.activity.toString) ? act.activity.toString() : act.activity;
    const subactivityId = act.subactivity ? 
      (act.subactivity._id ? act.subactivity._id.toString() : act.subactivity.toString()) : null;
    const key = `${activityId}_${subactivityId || 'none'}`;
    existingActivityMap.set(key, act);
  });

  try {
    // 1. Check for PAN number - add Income Tax > Income Tax Return
    if (clientBody.pan) {
      const incomeTaxActivity = await Activity.findOne({ name: 'Income Tax' });
      
      if (incomeTaxActivity) {
        const incomeTaxReturnSubactivity = (incomeTaxActivity.subactivities && Array.isArray(incomeTaxActivity.subactivities)) 
          ? incomeTaxActivity.subactivities.find(sub => sub.name === 'Income Tax Return')
          : null;
        
        if (incomeTaxReturnSubactivity) {
          const key = `${incomeTaxActivity._id.toString()}_${incomeTaxReturnSubactivity._id.toString()}`;
          if (!existingActivityMap.has(key)) {
            activities.push({
              activity: incomeTaxActivity._id,
              subactivity: incomeTaxReturnSubactivity._id,
              assignedDate: new Date(),
              notes: 'Auto-detected based on PAN number',
              status: 'active'
            });
            existingActivityMap.set(key, true);
          }
        }
      }
    }

    // 2. Check for TAN number - add TDS > 24Q, 26Q, 27Q, 27EQ
    if (clientBody.tanNumber) {
      const tdsActivity = await Activity.findOne({ name: 'TDS' });
      
      if (tdsActivity && tdsActivity.subactivities && Array.isArray(tdsActivity.subactivities)) {
        const tdsSubactivities = ['24Q', '26Q', '27Q', '27EQ'];
        
        tdsSubactivities.forEach(subactivityName => {
          const subactivity = tdsActivity.subactivities.find(sub => sub.name === subactivityName);
          
          if (subactivity) {
            const key = `${tdsActivity._id.toString()}_${subactivity._id.toString()}`;
            if (!existingActivityMap.has(key)) {
              activities.push({
                activity: tdsActivity._id,
                subactivity: subactivity._id,
                assignedDate: new Date(),
                notes: `Auto-detected based on TAN number`,
                status: 'active'
              });
              existingActivityMap.set(key, true);
            }
          }
        });
      }
    }

    // 3. Check for GST numbers - add GST > GSTR-1, GSTR-3B
    if (clientBody.gstNumbers && Array.isArray(clientBody.gstNumbers) && clientBody.gstNumbers.length > 0) {
      const gstActivity = await Activity.findOne({ name: 'GST' });
      
      if (gstActivity && gstActivity.subactivities && Array.isArray(gstActivity.subactivities)) {
        const gstSubactivities = ['GSTR-1', 'GSTR-3B'];
        
        gstSubactivities.forEach(subactivityName => {
          const subactivity = gstActivity.subactivities.find(sub => sub.name === subactivityName);
          
          if (subactivity) {
            const key = `${gstActivity._id.toString()}_${subactivity._id.toString()}`;
            if (!existingActivityMap.has(key)) {
              activities.push({
                activity: gstActivity._id,
                subactivity: subactivity._id,
                assignedDate: new Date(),
                notes: `Auto-detected based on GST number(s)`,
                status: 'active'
              });
              existingActivityMap.set(key, true);
            }
          }
        });
      }
    }

    // 4. Check for CIN number with entity type conditions
    if (clientBody.cinNumber && clientBody.entityType) {
      const entityType = clientBody.entityType.trim();
      
      // Check for Private Limited
      if (entityType === 'Private Limited') {
        const rocPvtLtdActivity = await Activity.findOne({ name: 'ROC - PVT. LTD.' });
        
        if (rocPvtLtdActivity && rocPvtLtdActivity.subactivities && Array.isArray(rocPvtLtdActivity.subactivities)) {
          const rocPvtSubactivities = ['AOC-4', 'MGT-7/7A', 'DPT-3'];
          
          rocPvtSubactivities.forEach(subactivityName => {
            const subactivity = rocPvtLtdActivity.subactivities.find(sub => sub.name === subactivityName);
            
            if (subactivity) {
              const key = `${rocPvtLtdActivity._id.toString()}_${subactivity._id.toString()}`;
              if (!existingActivityMap.has(key)) {
                activities.push({
                  activity: rocPvtLtdActivity._id,
                  subactivity: subactivity._id,
                  assignedDate: new Date(),
                  notes: `Auto-detected based on CIN number and Private Limited entity type`,
                  status: 'active'
                });
                existingActivityMap.set(key, true);
              }
            }
          });
        }
      }
      // Check for LLP
      else if (entityType === 'LLP') {
        const rocLlpActivity = await Activity.findOne({ name: 'ROC - LLP' });
        
        if (rocLlpActivity && rocLlpActivity.subactivities && Array.isArray(rocLlpActivity.subactivities)) {
          const rocLlpSubactivities = ['FORM-8', 'FORM-11'];
          
          rocLlpSubactivities.forEach(subactivityName => {
            const subactivity = rocLlpActivity.subactivities.find(sub => sub.name === subactivityName);
            
            if (subactivity) {
              const key = `${rocLlpActivity._id.toString()}_${subactivity._id.toString()}`;
              if (!existingActivityMap.has(key)) {
                activities.push({
                  activity: rocLlpActivity._id,
                  subactivity: subactivity._id,
                  assignedDate: new Date(),
                  notes: `Auto-detected based on CIN number and LLP entity type`,
                  status: 'active'
                });
                existingActivityMap.set(key, true);
              }
            }
          });
        }
      }
    }
  } catch (error) {
    // If there's an error finding activities, just return existing activities
    // Don't fail the entire operation
    console.error('Error auto-detecting compliance activities:', error);
  }

  return activities;
};

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

  // Validate and set default category if not provided
  if (!clientBody.category) {
    clientBody.category = 'C';
  } else if (!['A', 'B', 'C'].includes(clientBody.category)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid category. Allowed values are: A, B, C');
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

  // Auto-detect and add compliance activities based on PAN, TAN, and GST numbers
  clientBody.activities = await autoDetectComplianceActivities(clientBody, clientBody.activities || []);
  
  const client = await Client.create(clientBody);
  return client;
};

/**
 * Query for clients
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (if not provided, returns all results)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {Object} user - User object with role information
 * @returns {Promise<QueryResult>}
 */
const queryClients = async (filter, options, user) => {
  // Check cache for simple queries
  const cacheKey = cache.generateKey('clients', { 
    filter: JSON.stringify(filter),
    options: JSON.stringify(options),
    userId: (user && user._id && user._id.toString) ? user._id.toString() : 'anonymous'
  });
  
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

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
    
    // If category filter exists, validate and apply exact match
    if (mongoFilter.category) {
      // Validate category value
      if (!['A', 'B', 'C'].includes(mongoFilter.category)) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid category filter. Allowed values are: A, B, C');
      }
      // Category is already set correctly, no need to modify
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
  
  // Cache the result for 2 minutes
  cache.set(cacheKey, clients, 2 * 60 * 1000);
  
  return clients;
};

/**
 * Get client by id
 * @param {ObjectId} id
 * @returns {Promise<Client>}
 */
const getClientById = async (id) => {
  if (!id) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Client ID is required');
  }
  
  // Convert to string for consistent handling
  const idString = id.toString();
  
  // Validate ObjectId format using mongoose
  if (!mongoose.Types.ObjectId.isValid(idString)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid client ID format');
  }
  
  // Convert to ObjectId for query
  const objectId = new mongoose.Types.ObjectId(idString);
  
  // Try to find the client
  const client = await Client.findById(objectId);
  
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
 * Get client by email and PAN
 * @param {string} email
 * @param {string} pan
 * @returns {Promise<Client>}
 */
const getClientByEmailAndPan = async (email, pan) => {
  const client = await Client.findOne({ email, pan });
  return client;
};

/**
 * Get client by PAN
 * @param {string} pan
 * @returns {Promise<Client>}
 */
const getClientByPan = async (pan) => {
  const client = await Client.findOne({ pan });
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

  // Validate category if provided
  if (updateBody.category !== undefined) {
    if (!['A', 'B', 'C'].includes(updateBody.category)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid category. Allowed values are: A, B, C');
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

  // Merge client data with update body to check for compliance fields
  const mergedClientData = {
    pan: updateBody.pan !== undefined ? updateBody.pan : client.pan,
    tanNumber: updateBody.tanNumber !== undefined ? updateBody.tanNumber : client.tanNumber,
    gstNumbers: updateBody.gstNumbers !== undefined ? updateBody.gstNumbers : client.gstNumbers
  };

  // Auto-detect and add compliance activities based on PAN, TAN, and GST numbers
  // Use existing client activities as base, and merge with any activities in updateBody
  const existingActivities = client.activities || [];
  const updateActivities = updateBody.activities !== undefined ? updateBody.activities : existingActivities;
  
  // Auto-detect compliance activities and merge with existing/update activities
  const autoDetectedActivities = await autoDetectComplianceActivities(mergedClientData, existingActivities);
  
  // Merge auto-detected activities with update activities (update activities take precedence)
  const finalActivities = [...autoDetectedActivities];
  
  // Add update activities that aren't already in finalActivities
  if (updateActivities && Array.isArray(updateActivities)) {
    updateActivities.forEach(updateAct => {
      const activityId = (updateAct.activity && updateAct.activity.toString) ? updateAct.activity.toString() : updateAct.activity;
      const subactivityId = updateAct.subactivity ? 
        (updateAct.subactivity._id ? updateAct.subactivity._id.toString() : updateAct.subactivity.toString()) : null;
      const key = `${activityId}_${subactivityId || 'none'}`;
      
      const exists = finalActivities.some(act => {
        const actId = (act.activity && act.activity.toString) ? act.activity.toString() : act.activity;
        const actSubId = act.subactivity ? 
          (act.subactivity._id ? act.subactivity._id.toString() : act.subactivity.toString()) : null;
        return actId === activityId && (actSubId || 'none') === (subactivityId || 'none');
      });
      
      if (!exists) {
        finalActivities.push(updateAct);
      }
    });
  }
  
  // Only update activities if they were explicitly provided or auto-detected new ones
  if (updateBody.activities !== undefined || finalActivities.length !== existingActivities.length) {
    updateBody.activities = finalActivities;
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
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<Client>}
 */
const deleteClientById = async (clientId, user = null) => {
  const client = await getClientById(clientId);
  
  // Validate branch access if user is provided
  if (user && user.role) {
    if (!hasBranchAccess(user.role, client.branch)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this client');
    }
  }
  
  await client.deleteOne();
  return client;
};

/**
 * Bulk delete clients by IDs
 * @param {Array<string>} clientIds - Array of client IDs to delete
 * @returns {Promise<Object>} - Result with deleted count and errors
 */
const bulkDeleteClients = async (clientIds) => {
  
  const results = {
    deleted: 0,
    notFound: 0,
    errors: [],
    totalProcessed: clientIds.length,
  };

  const BATCH_SIZE = 100; // Process in batches to avoid memory issues
  const startTime = Date.now();

  try {
    for (let i = 0; i < clientIds.length; i += BATCH_SIZE) {
      const batch = clientIds.slice(i, i + BATCH_SIZE);

      try {
        // Validate all IDs are valid ObjectIds using regex (same as validation)
        const validIds = [];
        const invalidIds = [];
        const objectIdRegex = /^[0-9a-fA-F]{24}$/;
        
        batch.forEach((id, batchIndex) => {
          if (objectIdRegex.test(id)) {
            validIds.push(id);
          } else {
            invalidIds.push({ index: i + batchIndex, id });
          }
        });

        // Add invalid IDs to errors
        invalidIds.forEach(({ index, id }) => {
          results.errors.push({
            index,
            error: 'Invalid ObjectId format',
            data: { id }
          });
        });

        if (validIds.length > 0) {
          // Delete clients in batch
          const deleteResult = await Client.deleteMany({
            _id: { $in: validIds }
          });

          const deletedCount = deleteResult.deletedCount || 0;
          results.deleted += deletedCount;
          
          // Check which clients were not found (if any)
          if (deletedCount < validIds.length) {
            const notFoundCount = validIds.length - deletedCount;
            results.notFound += notFoundCount;
            
            // Find which specific IDs were not found
            const foundIds = await Client.find({
              _id: { $in: validIds }
            }).select('_id').lean();

            const foundIdSet = new Set(foundIds.map(c => c._id.toString()));
            const notFoundIds = validIds.filter(id => !foundIdSet.has(id.toString()));

            notFoundIds.forEach((id) => {
              const batchIndex = batch.indexOf(id);
              results.errors.push({
                index: i + batchIndex,
                error: `Client with ID ${id} not found`,
                data: { id }
              });
            });
          }

        }
      } catch (error) {
        // Add all clients in batch as errors
        batch.forEach((id, batchIndex) => {
          results.errors.push({
            index: i + batchIndex,
            error: `Delete failed: ${error.message}`,
            data: { id }
          });
        });
      }
    }
  } catch (error) {
    throw error;
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  if (results.errors.length > 0) {
  }

  return results;
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
        // Process subactivity if provided
        let subactivity = null;
        if (activityRow.subactivity) {
          // If subactivity is provided, validate it exists in the activity
          if (activity.subactivities && Array.isArray(activity.subactivities)) {
            const subactivityExists = activity.subactivities.some(
              sub => sub._id.toString() === activityRow.subactivity.toString()
            );
            
            if (!subactivityExists) {
              errors.push({
                type: 'SUBACTIVITY_NOT_FOUND',
                message: `Subactivity with ID '${activityRow.subactivity}' not found in activity '${activity.name}'`,
                data: activityRow
              });
              continue;
            }
            
            // Store the subactivity data
            subactivity = activityRow.subactivity;
          } else {
            errors.push({
              type: 'NO_SUBACTIVITIES',
              message: `Activity '${activity.name}' has no subactivities`,
              data: activityRow
            });
            continue;
          }
        }
        
        // Use the IDs directly from frontend (no need to convert)
        activities.push({
          activity: activityRow.activity, // Keep the original ID
          subactivity: subactivity, // Add subactivity if provided
          assignedDate: new Date(), // System automatically sets current date
          notes: activityRow.notes || '',
          status: activityRow.status || 'active' // Add status support
        });
      } else {
        // Add validation error
        errors.push({
          type: 'ACTIVITY_NOT_FOUND',
          message: `Activity with ID '${activityRow.activity}' not found`,
          data: activityRow
        });
      }
    } catch (error) {
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
  
  if (!gstNumbersData || !Array.isArray(gstNumbersData)) {
    return { isValid: true, gstNumbers: existingGstNumbers, errors: [] };
  }

  // Start with empty array - we'll rebuild it from the frontend data
  const gstNumbers = [];
  const errors = [];
  
  for (const gstRow of gstNumbersData) {
    try {

      // Validate required fields
      if (!gstRow.state || !gstRow.gstNumber || !gstRow.dateOfRegistration || !gstRow.gstUserId) {

        errors.push({
          type: 'MISSING_FIELDS',
          message: 'Missing required fields: state, gstNumber, dateOfRegistration, and gstUserId are required',
          data: gstRow
        });
        continue;
      }

      // Check if this is an update (has _id) or new entry
      if (gstRow._id) {

        // Find the existing GST number to update
        const existingGst = existingGstNumbers.find(gst => gst._id && gst._id.toString() === gstRow._id);
        if (existingGst) {

          // Check if updating state would conflict with other GST numbers in the same request
          const stateConflict = gstNumbers.find(gst => gst.state === gstRow.state && gst._id !== gstRow._id);
          if (stateConflict) {

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
            gstNumber: gstRow.gstNumber.trim(),
            dateOfRegistration: parseGstDate(gstRow.dateOfRegistration),
            gstUserId: gstRow.gstUserId.trim()
          });

        } else {

          errors.push({
            type: 'GST_NOT_FOUND',
            message: `GST number with ID '${gstRow._id}' not found`,
            data: gstRow
          });
        }
      } else {

        // Check if state already exists in this update request
        const stateConflict = gstNumbers.find(gst => gst.state === gstRow.state);
        if (stateConflict) {

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

          errors.push({
            type: 'DUPLICATE_STATE',
            message: `GST number already exists for state: ${gstRow.state}`,
            data: gstRow
          });
          continue;
        }

        // Parse date using helper function
        let parsedDate;
        try {
          parsedDate = parseGstDate(gstRow.dateOfRegistration);
        } catch (error) {

          errors.push({
            type: 'DATE_PARSE_ERROR',
            message: error.message,
            data: gstRow
          });
          continue;
        }

        // Add new GST number
        gstNumbers.push({
          state: gstRow.state.trim(),
          gstNumber: gstRow.gstNumber.trim(),
          dateOfRegistration: parsedDate,
          gstUserId: gstRow.gstUserId.trim()
        });

      }
    } catch (error) {

      errors.push({
        type: 'VALIDATION_ERROR',
        message: 'Error processing GST data',
        data: gstRow
      });
    }
  }

  if (errors.length > 0) {

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
const createClientSubfolder = async (clientName, branchId, clientId = null) => {
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
      // Create new folder with clientId in metadata
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
            clientName: clientName,
            ...(clientId && { clientId: clientId })
          }
        }
      });
    } else if (clientId && (!existingClientFolder.folder.metadata || !existingClientFolder.folder.metadata.clientId)) {
      // Update existing folder to include clientId if it's missing
      existingClientFolder.folder.metadata = {
        ...(existingClientFolder.folder.metadata || {}),
        clientId: clientId,
        clientName: clientName
      };
      await existingClientFolder.save();
    }
  } catch (error) {
    throw error;
  }
};

// Note: createClientTimelines function removed - using createTimelinesFromService from timeline.service.js instead
// This ensures consistent timeline creation logic including GST multiple timeline support

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
        // Map to store processed activities for each client (keyed by name+branch for matching)
        const processedActivitiesMap = new Map();
        
        const processedBatch = await Promise.all(
          batch.map(async (client, batchIndex) => {

            // Basic validation for required fields
            if (!client.name || !client.branch) {
              const error = `Missing required fields - name: ${!!client.name}, branch: ${!!client.branch}`;

              results.errors.push({
                index: i + batchIndex,
                error: error,
                data: client
              });
              return null; // Skip this client
            }
            
            let processedClient = { ...client };
            
            // Validate and set default category if not provided
            if (!processedClient.category) {
              processedClient.category = 'C';
            } else if (!['A', 'B', 'C'].includes(processedClient.category)) {
              results.errors.push({
                index: i + batchIndex,
                error: 'Invalid category. Allowed values are: A, B, C',
                data: client
              });
              return null; // Skip this client
            }
            
            // Auto-detect and add compliance activities based on PAN, TAN, and GST numbers
            const autoDetectedActivities = await autoDetectComplianceActivities(processedClient, []);
            
            // Merge auto-detected activities with existing activities
            const existingActivities = client.activities || [];
            const mergedActivities = [...autoDetectedActivities];
            
            // Add existing activities that aren't already in mergedActivities
            existingActivities.forEach(existingAct => {
              const activityId = (existingAct.activity && existingAct.activity.toString) ? existingAct.activity.toString() : existingAct.activity;
              const subactivityId = existingAct.subactivity ? 
                (existingAct.subactivity._id ? existingAct.subactivity._id.toString() : existingAct.subactivity.toString()) : null;
              const key = `${activityId}_${subactivityId || 'none'}`;
              
              const exists = mergedActivities.some(act => {
                const actId = (act.activity && act.activity.toString) ? act.activity.toString() : act.activity;
                const actSubId = act.subactivity ? 
                  (act.subactivity._id ? act.subactivity._id.toString() : act.subactivity.toString()) : null;
                return actId === activityId && (actSubId || 'none') === (subactivityId || 'none');
              });
              
              if (!exists) {
                mergedActivities.push(existingAct);
              }
            });
            
            // Process activities (now includes auto-detected ones)
            if (mergedActivities.length > 0) {
              const result = await processActivitiesFromFrontend(mergedActivities);
              if (!result.isValid) {

                // Add validation errors to results
                result.errors.forEach(error => {
                  results.errors.push({
                    index: i + batchIndex,
                    error: error.message,
                    data: { ...client, activityError: error }
                  });
                });
              } else {

                // Store processed activities in map for later use in timeline creation
                // Use client name as key (branch might be string or ObjectId, so use name only for matching)
                const clientKey = client.name.toLowerCase().trim();
                processedActivitiesMap.set(clientKey, result.activities);
              }
              processedClient.activities = result.activities;
            } else if (client.activities && Array.isArray(client.activities)) {
              // Process original activities if no auto-detected ones
              const result = await processActivitiesFromFrontend(client.activities);
              if (!result.isValid) {

                // Add validation errors to results
                result.errors.forEach(error => {
                  results.errors.push({
                    index: i + batchIndex,
                    error: error.message,
                    data: { ...client, activityError: error }
                  });
                });
              } else {

                // Store processed activities in map for later use in timeline creation
                // Use client name as key (branch might be string or ObjectId, so use name only for matching)
                const clientKey = client.name.toLowerCase().trim();
                processedActivitiesMap.set(clientKey, result.activities);
              }
              processedClient.activities = result.activities;
            }

            // Process GST numbers if provided
            if (client.gstNumbers && Array.isArray(client.gstNumbers)) {

              // Validate GST numbers structure for new clients
              for (const gst of client.gstNumbers) {
                if (!gst.state || !gst.gstNumber || !gst.dateOfRegistration || !gst.gstUserId) {
                  throw new Error(`Missing required GST fields for client: ${client.name || 'Unknown'}. Required: state, gstNumber, dateOfRegistration, gstUserId`);
                }
              }
              
              const gstResult = await processGstNumbersFromFrontend(client.gstNumbers, []);
              if (!gstResult.isValid) {

                // Add validation errors to results
                gstResult.errors.forEach(error => {
                  results.errors.push({
                    index: i + batchIndex,
                    error: error.message,
                    data: { ...client, gstError: error }
                  });
                });
              } else {

              }
              processedClient.gstNumbers = gstResult.gstNumbers;
            }

            return processedClient;
          })
        );

        // Filter out clients with validation errors before insertion
        const validClients = processedBatch.filter((client, batchIndex) => {
          if (!client) {

            return false;
          }
          const hasErrors = results.errors.some(error => error.index === i + batchIndex);
          if (hasErrors) {

            return false;
          }
          return true;
        });

        if (validClients.length === 0) {

          results.totalProcessed += batch.length;
          continue;
        }

        // Use bulk insert to create all clients, allowing duplicates

        // Convert branch names to ObjectIds before insertion
        const clientsWithObjectIds = await Promise.all(validClients.map(async (client) => {
          if (typeof client.branch === 'string') {
            // Find branch by name and convert to ObjectId
            const branch = await Branch.findOne({ name: client.branch });
            if (!branch) {
              throw new Error(`Branch not found: ${client.branch}`);
            }
            client.branch = branch._id;

          }
          return client;
        }));

        const insertResult = await Client.insertMany(clientsWithObjectIds, {
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
            postProcessBatch.map(async (createdClient, postIndex) => {
              try {

                // Create subfolder
                await createClientSubfolder(createdClient.name, createdClient.branch, createdClient._id);

                // Get processed activities from map (use the processed activities, not the inserted document's activities)
                // Match by client name (normalized to lowercase for consistency)
                const clientKey = createdClient.name.toLowerCase().trim();
                const processedActivities = processedActivitiesMap.get(clientKey);
                
                // Create timelines if activities exist
                if (processedActivities && processedActivities.length > 0) {

                  // Use the timeline service function which has proper financial year handling and date generation
                  const timelinesCreated = await createTimelinesFromService(createdClient, processedActivities);

                } else if (createdClient.activities && createdClient.activities.length > 0) {
                  // Fallback to inserted document activities if processed activities not found

                  const timelinesCreated = await createTimelinesFromService(createdClient, createdClient.activities);

                } else {

                }
              } catch (error) {

                // Add to errors but don't fail the entire batch
                results.errors.push({
                  index: i + j + postIndex,
                  error: `Post-processing failed: ${error.message}`,
                  data: createdClient,
                });
              }
            })
          );
        }
      } catch (error) {

        // Log the full error for debugging
        if (error.writeErrors && error.writeErrors.length > 0) {

        } else if (error.errors) {

        } else {

        }
        
        if (error.writeErrors) {
          // Handle partial failures in batch

          results.created += error.insertedCount || 0;
          error.writeErrors.forEach((writeError, errorIndex) => {

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
            // Fetch existing client to merge data for auto-detection
            let existingClient = null;
            try {
              existingClient = await Client.findById(client.id);
            } catch (error) {
              // If client not found, skip auto-detection
            }

            // Merge client data for auto-detection
            const mergedClientData = {
              pan: client.pan !== undefined ? client.pan : (existingClient && existingClient.pan ? existingClient.pan : null),
              tanNumber: client.tanNumber !== undefined ? client.tanNumber : (existingClient && existingClient.tanNumber ? existingClient.tanNumber : null),
              gstNumbers: client.gstNumbers !== undefined ? client.gstNumbers : (existingClient && existingClient.gstNumbers ? existingClient.gstNumbers : [])
            };

            // Auto-detect and add compliance activities
            const existingActivities = (existingClient && existingClient.activities) ? existingClient.activities : [];
            const autoDetectedActivities = await autoDetectComplianceActivities(mergedClientData, existingActivities);
            
            // Merge auto-detected activities with update activities
            const updateActivities = client.activities && Array.isArray(client.activities) ? client.activities : [];
            const mergedActivities = [...autoDetectedActivities];
            
            // Add update activities that aren't already in mergedActivities
            updateActivities.forEach(updateAct => {
              const activityId = (updateAct.activity && updateAct.activity.toString) ? updateAct.activity.toString() : updateAct.activity;
              const subactivityId = updateAct.subactivity ? 
                (updateAct.subactivity._id ? updateAct.subactivity._id.toString() : updateAct.subactivity.toString()) : null;
              const key = `${activityId}_${subactivityId || 'none'}`;
              
              const exists = mergedActivities.some(act => {
                const actId = (act.activity && act.activity.toString) ? act.activity.toString() : act.activity;
                const actSubId = act.subactivity ? 
                  (act.subactivity._id ? act.subactivity._id.toString() : act.subactivity.toString()) : null;
                return actId === activityId && (actSubId || 'none') === (subactivityId || 'none');
              });
              
              if (!exists) {
                mergedActivities.push(updateAct);
              }
            });

            // Process activities (now includes auto-detected ones)
            let activities = [];
            if (mergedActivities.length > 0) {
              const result = await processActivitiesFromFrontend(mergedActivities);
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
            } else if (client.activities && Array.isArray(client.activities)) {
              // Process original activities if no auto-detected ones
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
                  // Validate GST numbers structure for updates
                  for (const gst of client.gstNumbers) {
                    if (!gst.state || !gst.gstNumber || !gst.dateOfRegistration || !gst.gstUserId) {
                      throw new Error(`Missing required GST fields for client: ${client.name || 'Unknown'}. Required: state, gstNumber, dateOfRegistration, gstUserId`);
                    }
                  }
                  
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

            // Validate category if provided
            if (client.category !== undefined && !['A', 'B', 'C'].includes(client.category)) {
              results.errors.push({
                index: i,
                error: 'Invalid category. Allowed values are: A, B, C',
                data: client
              });
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
                    // Update category if provided
                    ...(client.category && { category: client.category }),
                    // Update turnover if provided
                    ...(client.turnover !== undefined && { turnover: client.turnover }),
                    // Update activities (includes auto-detected compliance activities)
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
                  await createClientSubfolder(updatedClient.name, updatedClient.branch, updatedClient._id);
                  
                  // Create timelines if activities exist and were updated
                  if (updatedClient.activities && updatedClient.activities.length > 0) {

                    // Use the timeline service function which has proper financial year handling and date generation
                    const timelinesCreated = await createTimelinesFromService(updatedClient, updatedClient.activities);

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
  
  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  if (results.errors.length > 0) {

    results.errors.forEach((error, index) => {

      if (error.data && error.data.name) {

      }
    });
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
  
  // Automatically create timelines for this activity
  try {
    // This function is no longer imported, so it's removed.
    // If you need to create timelines for a single activity, you'll need to
    // import the createTimelinesForClient function or implement its logic here.
    // For now, commenting out the call as it's no longer available.
    // await createTimelinesForClient(clientId, activityData.activity);
  } catch (error) {

    // Don't fail the entire operation if timeline creation fails
  }
  
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
  const hasLimit = query.limit && parseInt(query.limit) > 0;
  const limit = hasLimit ? parseInt(query.limit) : null;
  const startIndex = hasLimit ? (page - 1) * limit : 0;
  const endIndex = hasLimit ? startIndex + limit : activities.length;
  
  const paginatedActivities = hasLimit ? activities.slice(startIndex, endIndex) : activities;
  
  return {
    activities: paginatedActivities,
    pagination: {
      page,
      limit: limit || activities.length,
      total: activities.length,
      pages: hasLimit ? Math.ceil(activities.length / limit) : 1,
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
            await createClientSubfolder(client.name, client.branch, client._id);
            results.subfoldersCreated++;
            
            // Create timelines if activities exist
            if (client.activities && client.activities.length > 0) {
              const timelinesCreated = await createTimelinesFromService(client, client.activities);
              results.timelinesCreated += timelinesCreated.length;
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
 * @param {Object} gstData - GST data with state, gstNumber, dateOfRegistration, and gstUserId
 * @returns {Promise<Client>}
 */
const addGstNumber = async (clientId, gstData) => {
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }

  // Validate required fields
  if (!gstData.state || !gstData.gstNumber || !gstData.dateOfRegistration || !gstData.gstUserId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Missing required fields: state, gstNumber, dateOfRegistration, and gstUserId are required');
  }

  // Check if GST number already exists for this state
  const existingGst = client.gstNumbers.find(
    gst => gst.state === gstData.state
  );
  
  if (existingGst) {
    throw new ApiError(httpStatus.CONFLICT, 'GST number already exists for this state');
  }

  // Add new GST number
  client.gstNumbers.push({
    state: gstData.state.trim(),
    gstNumber: gstData.gstNumber.trim(),
    dateOfRegistration: parseGstDate(gstData.dateOfRegistration),
    gstUserId: gstData.gstUserId.trim()
  });
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

  // Update GST data with proper type conversion
  if (updateData.state) updateData.state = updateData.state.trim();
  if (updateData.gstNumber) updateData.gstNumber = updateData.gstNumber.trim();
  if (updateData.dateOfRegistration) updateData.dateOfRegistration = parseGstDate(updateData.dateOfRegistration);
  if (updateData.gstUserId) updateData.gstUserId = updateData.gstUserId.trim();

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
  getClientByEmailAndPan,
  getClientByPan,
  updateClientById, 
  updateClientStatus,
  deleteClientById,
  bulkDeleteClients, 
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
  processGstNumbersFromFrontend, // Add this if needed elsewhere
}; 