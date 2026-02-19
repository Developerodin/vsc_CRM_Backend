import httpStatus from 'http-status';
import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import Timeline from '../models/timeline.model.js';
import Activity from '../models/activity.model.js';
import Client from '../models/client.model.js';
import Group from '../models/group.model.js';
import { hasBranchAccess, getUserBranchIds } from './role.service.js';
import { getCurrentFinancialYear, generateTimelineDates, calculateNextOccurrence } from '../utils/financialYear.js';
import cache from '../utils/cache.js';

/**
 * Validate if activity ID exists
 * @param {string} activityId
 * @returns {Promise<boolean>}
 */
const validateActivity = async (activityId) => {
  if (!mongoose.Types.ObjectId.isValid(activityId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid activity ID format');
  }
  const activity = await Activity.findById(activityId);
  if (!activity) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Activity not found');
  }
  return true;
};

/**
 * Validate if client ID exists
 * @param {string} clientId
 * @returns {Promise<boolean>}
 */
const validateClient = async (clientId) => {
  if (!mongoose.Types.ObjectId.isValid(clientId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid client ID format');
  }
  const client = await Client.findById(clientId);
  if (!client) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Client not found');
  }
  return true;
};

/**
 * Create a new timeline
 * @param {Object} timelineBody
 * @param {Object} user
 * @returns {Promise<Timeline>}
 */
const createTimeline = async (timelineBody, user = null) => {
  await validateActivity(timelineBody.activity);
  await validateClient(timelineBody.client);
  
  // Validate branch access if user is provided
  if (user && timelineBody.branch) {
    if (user.userType === 'teamMember') {
      // Team members can only create timelines in their own branch
      const teamMemberBranchId = user.branch?.toString() || user.branch;
      const requestedBranchId = timelineBody.branch.toString();
      if (requestedBranchId !== teamMemberBranchId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
      }
    } else if (user.role) {
      // Regular user with role
      if (!hasBranchAccess(user.role, timelineBody.branch)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
      }
    }
  }

  const timeline = await Timeline.create(timelineBody);
  
  // Populate the created timeline
  const populatedTimeline = await Timeline.populate(timeline, [
    { path: 'activity', select: 'name' },
    { path: 'client', select: 'name email' }
  ]);

  return populatedTimeline;
};

/**
 * Query for timelines
 * @param {Object} filter - Mongo filter
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (if not provided, returns all results)
 * @param {number} [options.page] - Current page (default = 1)
 * @param {Object} user - User object with role information
 * @returns {Promise<QueryResult>}
 */
const queryTimelines = async (filter, options, user) => {
  const mongoFilter = { ...filter };

  // Clean up empty filters
  if (mongoFilter.status === '') {
    delete mongoFilter.status;
  }

  // Handle activityName filter - optimize by querying Activity collection first
  let activityNameFilter = null;
  if (mongoFilter.activityName === '' || !mongoFilter.activityName) {
    delete mongoFilter.activityName;
  } else if (mongoFilter.activityName) {
    // Clean up whitespace and URL-decoded characters
    activityNameFilter = mongoFilter.activityName.trim();
    // Remove activityName from mongoFilter - will be converted to activity IDs
    delete mongoFilter.activityName;
  }

  // Handle activity filter (can be activity ID or activity name)
  let activityNameStringFilter = null;
  if (mongoFilter.activity) {
    // If it's an ObjectId, keep as is
    if (mongoose.Types.ObjectId.isValid(mongoFilter.activity)) {
      // Keep the activity filter as is
    } else {
      // If it's a string (activity name), store for later optimization
      activityNameStringFilter = mongoFilter.activity;
      delete mongoFilter.activity;
    }
  }

  // Handle subactivityName filter - optimize by querying Activity collection first
  let subactivityNameFilter = null;
  if (mongoFilter.subactivityName === '' || !mongoFilter.subactivityName) {
    delete mongoFilter.subactivityName;
  } else if (mongoFilter.subactivityName) {
    // Clean up whitespace and URL-decoded characters
    subactivityNameFilter = mongoFilter.subactivityName.trim().replace(/\+/g, ' '); // Handle URL encoding
    // Remove subactivityName from mongoFilter - will be converted to activity IDs and subactivity filter
    delete mongoFilter.subactivityName;
  }

  // Handle subactivity filter
  if (mongoFilter.subactivity) {
    if (mongoose.Types.ObjectId.isValid(mongoFilter.subactivity)) {
      // If it's an ObjectId, search in the subactivity._id field
      mongoFilter['subactivity._id'] = new mongoose.Types.ObjectId(mongoFilter.subactivity);
      delete mongoFilter.subactivity;
    } else {
      // If it's a string (subactivity name), search in the subactivity.name field
      mongoFilter['subactivity.name'] = { $regex: mongoFilter.subactivity, $options: 'i' };
      delete mongoFilter.subactivity;
    }
  }

  // Handle period filter
  if (mongoFilter.period) {
    let periodValue = mongoFilter.period.trim();
    // Normalize YYYY-MM (e.g. 2026-02) to stored format (e.g. February-2026)
    const yyyyMmMatch = periodValue.match(/^(\d{4})-(\d{2})$/);
    if (yyyyMmMatch) {
      const [, year, monthNum] = yyyyMmMatch;
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const monthIndex = parseInt(monthNum, 10) - 1;
      if (monthIndex >= 0 && monthIndex <= 11) {
        periodValue = `${monthNames[monthIndex]}-${year}`;
      }
    }
    // Support exact match or partial match
    if (periodValue.includes('*') || periodValue.includes('%')) {
      const regexPattern = periodValue.replace(/[*%]/g, '.*');
      mongoFilter.period = { $regex: regexPattern, $options: 'i' };
    } else {
      mongoFilter.period = { $regex: periodValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
  }

  // Handle frequency filter
  if (mongoFilter.frequency) {
    // Support exact match or partial match
    if (mongoFilter.frequency.includes('*') || mongoFilter.frequency.includes('%')) {
      // Wildcard search - convert * or % to regex
      const regexPattern = mongoFilter.frequency.replace(/[*%]/g, '.*');
      mongoFilter.frequency = { $regex: regexPattern, $options: 'i' };
    } else {
      // Exact match
      mongoFilter.frequency = { $regex: mongoFilter.frequency, $options: 'i' };
    }
  }

  // Handle date range filters
  if (mongoFilter.startDate || mongoFilter.endDate) {
    mongoFilter.dueDate = {};
    if (mongoFilter.startDate) {
      mongoFilter.dueDate.$gte = new Date(mongoFilter.startDate);
      delete mongoFilter.startDate;
    }
    if (mongoFilter.endDate) {
      mongoFilter.dueDate.$lte = new Date(mongoFilter.endDate);
      delete mongoFilter.endDate;
    }
  }

  // Handle financial year filter
  if (mongoFilter.financialYear) {
    mongoFilter.financialYear = { $regex: mongoFilter.financialYear, $options: 'i' };
  }

  // Handle state filter (for GST-related timelines)
  if (mongoFilter.state) {
    // Case-insensitive state matching
    mongoFilter.state = { $regex: mongoFilter.state, $options: 'i' };
  }

  // Handle group filter first (filters timelines by clients in the group)
  let groupClientIds = null;
  if (mongoFilter.group) {
    try {
      let group;
      if (mongoose.Types.ObjectId.isValid(mongoFilter.group)) {
        // If it's an ObjectId, find by ID
        group = await Group.findById(mongoFilter.group);
      } else {
        // If it's a string (group name), find by name
        group = await Group.findOne({ name: { $regex: mongoFilter.group, $options: 'i' } });
      }
      
      if (group && group.clients && group.clients.length > 0) {
        // Get all client IDs from the group
        groupClientIds = group.clients.map(clientId => clientId.toString());
      } else {
        // Group not found or has no clients, return empty results
        groupClientIds = [];
      }
    } catch (error) {

      // On error, return empty results
      groupClientIds = [];
    }
    // Remove group from mongoFilter as it's now handled
    delete mongoFilter.group;
  }

  // Handle client filter
  if (mongoFilter.client) {
    if (mongoose.Types.ObjectId.isValid(mongoFilter.client)) {
      // If it's an ObjectId
      if (groupClientIds !== null) {
        // If group filter is also active, check if this client is in the group
        if (!groupClientIds.includes(mongoFilter.client.toString())) {
          // Client is not in the group, return empty results
          mongoFilter.client = { $in: [] };
        } else {
          // Client is in the group, keep the filter
          mongoFilter.client = mongoFilter.client;
        }
      }
      // Otherwise keep as is
    } else {
      // If it's a string (client name), we'll filter after population
      // Remove from mongoFilter - will be handled in post-query filtering
      // But if group filter is active, we still need to filter by group clients in MongoDB
      if (groupClientIds !== null && groupClientIds.length > 0) {
        mongoFilter.client = { $in: groupClientIds.map(id => new mongoose.Types.ObjectId(id)) };
      } else if (groupClientIds !== null && groupClientIds.length === 0) {
        // Group has no clients, return empty results
        mongoFilter.client = { $in: [] };
      } else {
        // No group filter, just remove client for post-query
        delete mongoFilter.client;
      }
    }
  } else if (groupClientIds !== null) {
    // No client filter but group filter is active, filter by group clients
    if (groupClientIds.length > 0) {
      mongoFilter.client = { $in: groupClientIds.map(id => new mongoose.Types.ObjectId(id)) };
    } else {
      // Group has no clients, return empty results
      mongoFilter.client = { $in: [] };
    }
  }

  // Handle search parameter (searches in activity name and client name)
  const searchTerm = mongoFilter.search;
  if (searchTerm) {
    delete mongoFilter.search; // Remove from mongoFilter, will handle in post-query
  }

  // Clean up any empty $or conditions that might have been left behind
  if (mongoFilter.$or && Array.isArray(mongoFilter.$or) && mongoFilter.$or.length === 0) {
    delete mongoFilter.$or;
  }

  // Apply branch filtering based on user's access
  if (user) {
    // Handle team members (they don't have roles, but have a branch)
    if (user.userType === 'teamMember') {
      const teamMemberBranchId = user.branch?.toString() || user.branch;
      
      if (mongoFilter.branch) {
        // Check if requested branch matches team member's branch
        const requestedBranchId = mongoFilter.branch.toString();
        if (requestedBranchId !== teamMemberBranchId) {
          throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
        }
      } else {
        // Filter by team member's branch
        mongoFilter.branch = teamMemberBranchId;
      }
    } else if (user.role) {
      // Regular user with role
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
  }

  // Optimize: If activityName or activity (as string) is provided, resolve to activity IDs first
  // This avoids loading all timelines into memory
  if (activityNameFilter || activityNameStringFilter) {
    const activitySearchTerm = (activityNameFilter || activityNameStringFilter).trim();
    if (activitySearchTerm) {
      // Find matching activity IDs - escape special regex characters and use word boundaries
      // This ensures "Direct Taxation" doesn't match "Indirect Taxation"
      const escapedTerm = activitySearchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matchingActivities = await Activity.find({
        $or: [
          { name: { $regex: `^${escapedTerm}$`, $options: 'i' } }, // Exact match
          { name: { $regex: `\\b${escapedTerm}\\b`, $options: 'i' } } // Word boundary match
        ]
      }).select('_id').lean();
      
      const activityIds = matchingActivities.map(a => a._id);
      
      if (activityIds.length === 0) {
        // No matching activities, return empty result
        return {
          results: [],
          page: options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1,
          limit: options.limit ? parseInt(options.limit, 10) : 0,
          totalPages: 0,
          totalResults: 0,
        };
      }
      
      // Use activity IDs in MongoDB filter
      if (mongoFilter.activity) {
        // If activity filter already exists (as ObjectId), check if it's in the matching IDs
        const existingActivityId = mongoFilter.activity.toString();
        const isInMatchingIds = activityIds.some(id => id.toString() === existingActivityId);
        if (isInMatchingIds) {
          // Keep the existing filter (it's already in the matching set)
          // No change needed
        } else {
          // Existing activity ID doesn't match the name filter, return empty
          return {
            results: [],
            page: options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1,
            limit: options.limit ? parseInt(options.limit, 10) : 0,
            totalPages: 0,
            totalResults: 0,
          };
        }
      } else {
        mongoFilter.activity = { $in: activityIds };
      }
      
      // Clear activityName filters since we've converted them to activity IDs
      activityNameFilter = null;
      activityNameStringFilter = null;
    }
  }

  // Optimize: If subactivityName is provided, resolve to subactivity IDs
  // IMPORTANT: If activity filter already exists (from activityName), only search within those activities
  if (subactivityNameFilter) {
    const subactivitySearchTerm = subactivityNameFilter.trim();
    if (subactivitySearchTerm) {
      // Build activity filter for subactivity search
      // If we already have an activity filter (from activityName), ONLY search within those activities
      let activityFilterForSubactivity = {};
      
      if (mongoFilter.activity) {
        // We have an activity filter - only search for subactivities within these specific activities
        if (mongoFilter.activity.$in) {
          activityFilterForSubactivity = { 
            _id: { $in: mongoFilter.activity.$in },
            'subactivities.name': { $regex: subactivitySearchTerm, $options: 'i' }
          };
        } else {
          // Single activity ID
          activityFilterForSubactivity = { 
            _id: mongoFilter.activity,
            'subactivities.name': { $regex: subactivitySearchTerm, $options: 'i' }
          };
        }
      } else {
        // No activity filter - search all activities for this subactivity name
        activityFilterForSubactivity = {
          'subactivities.name': { $regex: subactivitySearchTerm, $options: 'i' }
        };
      }
      
      // Find activities that contain subactivities with this name
      // If activity filter exists, this will only search within those activities
      const matchingActivities = await Activity.find(activityFilterForSubactivity)
        .select('_id subactivities').lean();
      
      // Extract subactivity IDs that match the name
      // Only extract from activities that match our filter (if activity filter was set)
      const matchingSubactivityIds = [];
      const activityIdsWithSubactivity = [];
      
      matchingActivities.forEach(activity => {
        if (activity.subactivities && Array.isArray(activity.subactivities)) {
          let foundMatchingSub = false;
          activity.subactivities.forEach(sub => {
            if (sub.name && new RegExp(subactivitySearchTerm, 'i').test(sub.name)) {
              // Convert to ObjectId if needed
              const subId = sub._id ? (typeof sub._id === 'string' ? new mongoose.Types.ObjectId(sub._id) : sub._id) : null;
              if (subId) {
                matchingSubactivityIds.push(subId);
                foundMatchingSub = true;
              }
            }
          });
          if (foundMatchingSub) {
            activityIdsWithSubactivity.push(activity._id);
          }
        }
      });
      
      if (matchingSubactivityIds.length === 0) {
        // No matching subactivities found in the specified activities, return empty result
        return {
          results: [],
          page: options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1,
          limit: options.limit ? parseInt(options.limit, 10) : 0,
          totalPages: 0,
          totalResults: 0,
        };
      }
      
      // If we had an activity filter, ensure we only keep activities that have the subactivity
      // If we didn't have an activity filter, set it to the activities that have this subactivity
      if (mongoFilter.activity) {
        // Activity filter exists - intersect to keep only activities that have both the name match AND the subactivity
        if (mongoFilter.activity.$in) {
          // Intersect arrays - only keep activities that are in both lists
          const existingActivityIds = mongoFilter.activity.$in.map(id => 
            (id && id.toString) ? id.toString() : String(id)
          );
          const newActivityIds = activityIdsWithSubactivity.map(id => 
            (id && id.toString) ? id.toString() : String(id)
          );
          const intersection = existingActivityIds.filter(id => 
            newActivityIds.includes(id)
          );
          
          if (intersection.length === 0) {
            // No intersection - the activities matching the name don't have this subactivity
            return {
              results: [],
              page: options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1,
              limit: options.limit ? parseInt(options.limit, 10) : 0,
              totalPages: 0,
              totalResults: 0,
            };
          }
          
          // Update activity filter to only include activities that have the subactivity
          mongoFilter.activity = { 
            $in: intersection.map(id => {
              // Find the original ObjectId from existing filter
              const originalId = mongoFilter.activity.$in.find(origId => 
                (origId && origId.toString ? origId.toString() : String(origId)) === id
              );
              return originalId || (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id);
            })
          };
        } else {
          // Single activity ID - check if it has the subactivity
          const existingActivityId = (mongoFilter.activity && mongoFilter.activity.toString) 
            ? mongoFilter.activity.toString() 
            : String(mongoFilter.activity);
          const hasSubactivity = activityIdsWithSubactivity.some(id => 
            (id && id.toString ? id.toString() : String(id)) === existingActivityId
          );
          if (!hasSubactivity) {
            // This activity doesn't contain this subactivity, return empty
            return {
              results: [],
              page: options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1,
              limit: options.limit ? parseInt(options.limit, 10) : 0,
              totalPages: 0,
              totalResults: 0,
            };
          }
          // Activity has the subactivity, keep the filter as is
        }
      } else {
        // No activity filter - set it to activities that have this subactivity
        mongoFilter.activity = { $in: activityIdsWithSubactivity };
      }
      
      // Filter by subactivity ID (more reliable than name since subactivity is stored as embedded doc)
      // Convert all IDs to ObjectIds for consistent comparison
      const subactivityObjectIds = matchingSubactivityIds.map(id => {
        if (typeof id === 'string') {
          return new mongoose.Types.ObjectId(id);
        }
        return id;
      });
      
      // Use $in with ObjectIds - MongoDB will handle the comparison
      mongoFilter['subactivity._id'] = { $in: subactivityObjectIds };
      
      // Clear subactivityName filter since we've converted it to subactivity._id
      subactivityNameFilter = null;
    }
  }

  // Check if we need to apply post-query filters (text-based searches on activity/client name or search parameter)
  // Note: activityName, subactivityName and activity (as string) are now handled above, so they won't trigger post-query
  // However, if sortBy includes activityName, we need post-query filtering to sort by populated activity name
  const sortByIncludesActivityName = options.sortBy && options.sortBy.includes('activityName');
  const needsPostQueryFilter = (filter.client && !mongoose.Types.ObjectId.isValid(filter.client)) ||
                                !!searchTerm ||
                                sortByIncludesActivityName;

  let result;
  
  if (needsPostQueryFilter) {
    // If we need post-query filters, we must:
    // 1. Get ALL documents matching the MongoDB filter (without pagination, but with sorting)
    // 2. Populate and apply post-query filters
    // 3. Count the filtered results
    // 4. Apply pagination to the filtered results
    
    // Build sort query
    let sort = '';
    if (options.sortBy) {
      const sortingCriteria = [];
      options.sortBy.split(',').forEach((sortOption) => {
        const [key, order] = sortOption.split(':');
        // Map common field names to actual Timeline model fields
        const fieldMap = {
          'title': 'createdAt', // Timeline doesn't have title, use createdAt
          'name': 'createdAt',
          'date': 'dueDate',
          'dueDate': 'dueDate',
          'createdAt': 'createdAt',
          'updatedAt': 'updatedAt'
        };
        const actualField = fieldMap[key] || key;
        sortingCriteria.push((order === 'desc' ? '-' : '') + actualField);
      });
      sort = sortingCriteria.join(' ');
    } else {
      sort = 'createdAt';
    }
    
    // Get all documents matching the filter with sorting (no pagination)
    // Ensure subactivity filter is preserved if it was set
    const queryFilter = { ...mongoFilter };
    let allResults = await Timeline.find(queryFilter).sort(sort);
    
    // Populate the results with activity and client data
    // Use strictPopulate: false to handle null references gracefully
    await Timeline.populate(allResults, [
      { path: 'activity', select: 'name sortOrder subactivities', strictPopulate: false },
      { path: 'client', select: 'name email phone pan gstNumbers tanNumber cinNumber udyamNumber iecCode', strictPopulate: false }
    ]);
    
    // Process subactivity data since it's stored as embedded document
    // Note: subactivity is already in the timeline document, but we may want to enrich it from activity
    allResults.forEach(timeline => {
      // If subactivity exists in timeline (embedded doc), keep it
      // Only enrich if we have activity data and subactivity needs enrichment
      if (timeline.subactivity && timeline.subactivity._id) {
        // Subactivity is already present as embedded document - keep it
        // Optionally enrich from activity if activity is populated and has more complete data
        if (timeline.activity && timeline.activity.subactivities && Array.isArray(timeline.activity.subactivities)) {
          const matchingSub = timeline.activity.subactivities.find(
            sub => sub._id && sub._id.toString() === timeline.subactivity._id.toString()
          );
          if (matchingSub) {
            // Merge to get complete subactivity data (activity has more fields like frequencyConfig)
            timeline.subactivity = { ...timeline.subactivity, ...matchingSub };
          }
        }
      }
    });

    // Note: activityName and activity (as string) filters are now handled by converting to activity IDs
    // before this point, so they don't need post-query filtering

    if (filter.client && !mongoose.Types.ObjectId.isValid(filter.client)) {
      // Filter by client name (case-insensitive partial match)
      const clientSearchTerm = filter.client.toLowerCase().trim().replace(/\+/g, ' '); // Handle URL encoding
      if (clientSearchTerm) { // Only filter if search term is not empty
        allResults = allResults.filter(timeline => 
          timeline.client && 
          timeline.client.name && 
          timeline.client.name.toLowerCase().includes(clientSearchTerm)
        );
      }
    }

    // Handle search parameter (searches in both activity and client names)
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase().trim().replace(/\+/g, ' ');
      if (searchTermLower) { // Only filter if search term is not empty
        allResults = allResults.filter(timeline => {
          // Search in activity name
          const matchesActivity = timeline.activity && 
                                  timeline.activity.name && 
                                  timeline.activity.name.toLowerCase().includes(searchTermLower);
          
          // Search in client name
          const matchesClient = timeline.client && 
                               timeline.client.name && 
                               timeline.client.name.toLowerCase().includes(searchTermLower);
          
          return matchesActivity || matchesClient;
        });
      }
    }

    // Handle group filter in post-query (if group was provided and client was also a string)
    // Note: If groupClientIds was set and client was ObjectId, it's already filtered in MongoDB
    // But if client was a string, we need to filter by both group clients AND client name
    if (groupClientIds !== null && filter.client && !mongoose.Types.ObjectId.isValid(filter.client)) {
      // Both group and client (string) filters are active
      // Filter by group clients first
      if (groupClientIds.length > 0) {
        allResults = allResults.filter(timeline => 
          timeline.client && 
          timeline.client._id && 
          groupClientIds.includes(timeline.client._id.toString())
        );
      } else {
        // Group has no clients, return empty results
        allResults = [];
      }
    }

    // Handle sorting by activityName (requires post-query since it's a populated field)
    if (sortByIncludesActivityName && allResults.length > 0) {
      const sortFields = options.sortBy.split(',');
      sortFields.forEach(sortField => {
        const [field, order] = sortField.split(':');
        if (field === 'activityName') {
          const sortOrder = order === 'desc' ? -1 : 1;
          allResults.sort((a, b) => {
            const aName = (a.activity && a.activity.name) ? a.activity.name.toLowerCase() : '';
            const bName = (b.activity && b.activity.name) ? b.activity.name.toLowerCase() : '';
            if (aName < bName) return -1 * sortOrder;
            if (aName > bName) return 1 * sortOrder;
            return 0;
          });
        }
      });
    }

    // Get total count of filtered results (this is the true total)
    const totalResults = allResults.length;
    
    // Apply pagination to filtered results
    const hasLimit = options.limit && parseInt(options.limit, 10) > 0;
    const limit = hasLimit ? parseInt(options.limit, 10) : null;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = hasLimit ? (page - 1) * limit : 0;
    
    const paginatedResults = hasLimit 
      ? allResults.slice(skip, skip + limit)
      : allResults;
    
    const totalPages = hasLimit ? Math.ceil(totalResults / limit) : 1;
    
    result = {
      results: paginatedResults,
      page,
      limit: limit || totalResults,
      totalPages,
      totalResults, // This is now the total count of all matching documents after post-query filters
    };
  } else {
    // No post-query filters needed, use standard pagination
    // Map sortBy field names to actual Timeline model fields
    let mappedOptions = { ...options };
    if (mappedOptions.sortBy) {
      const sortOptions = mappedOptions.sortBy.split(',');
      const mappedSortOptions = sortOptions.map(sortOption => {
        const [key, order] = sortOption.split(':');
        const fieldMap = {
          'title': 'createdAt', // Timeline doesn't have title, use createdAt
          'name': 'createdAt',
          'date': 'dueDate',
          'dueDate': 'dueDate',
          'createdAt': 'createdAt',
          'updatedAt': 'updatedAt'
        };
        const actualField = fieldMap[key] || key;
        return `${actualField}:${order}`;
      });
      mappedOptions.sortBy = mappedSortOptions.join(',');
    }
    
    result = await Timeline.paginate(mongoFilter, mappedOptions);
    
    // Populate the results with activity and client data
    if (result.results && result.results.length > 0) {
      await Timeline.populate(result.results, [
        { path: 'activity', select: 'name sortOrder subactivities', strictPopulate: false },
        { path: 'client', select: 'name email phone pan gstNumbers tanNumber cinNumber udyamNumber iecCode', strictPopulate: false }
      ]);
      
      // Process subactivity data since it's stored as embedded document
      // Note: subactivity is already in the timeline document, but we may want to enrich it from activity
      result.results.forEach(timeline => {
        // If subactivity exists in timeline (embedded doc), keep it
        // Only enrich if we have activity data and subactivity needs enrichment
        if (timeline.subactivity && timeline.subactivity._id) {
          // Subactivity is already present as embedded document - keep it
          // Optionally enrich from activity if activity is populated and has more complete data
          if (timeline.activity && timeline.activity.subactivities && Array.isArray(timeline.activity.subactivities)) {
            const matchingSub = timeline.activity.subactivities.find(
              sub => sub._id && sub._id.toString() === timeline.subactivity._id.toString()
            );
            if (matchingSub) {
              // Merge to get complete subactivity data (activity has more fields like frequencyConfig)
              timeline.subactivity = { ...timeline.subactivity, ...matchingSub };
            }
          }
        }
      });
    }
  }
  
  return result;
};

/**
 * Get timeline by id
 * @param {ObjectId} id
 * @returns {Promise<Timeline>}
 */
const getTimelineById = async (id, user = null) => {
  const timeline = await Timeline.findById(id).populate([
    { path: 'activity', select: 'name sortOrder subactivities' },
    { path: 'client', select: 'name email phone' }
  ]);
  
  if (!timeline) {
    return null;
  }
  
  // Check branch access for team members
  if (user && user.userType === 'teamMember') {
    const teamMemberBranchId = user.branch?.toString() || user.branch;
    const timelineBranchId = timeline.branch?.toString() || timeline.branch;
    if (timelineBranchId !== teamMemberBranchId) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this timeline');
    }
  }
  
  // Process subactivity data since it's stored as embedded document
  if (timeline && timeline.subactivity && timeline.subactivity._id && timeline.activity && timeline.activity.subactivities) {
    const subactivity = timeline.activity.subactivities.find(
      sub => sub._id.toString() === timeline.subactivity._id.toString()
    );
    if (subactivity) {
      timeline.subactivity = subactivity;
    }
  }
  
  return timeline;
};

/**
 * Update timeline by id
 * @param {ObjectId} timelineId
 * @param {Object} updateBody
 * @param {Object} user
 * @returns {Promise<Timeline>}
 */
const updateTimelineById = async (timelineId, updateBody, user = null) => {
  const timeline = await getTimelineById(timelineId, user);
  
  // Validate branch access if user is provided and branch is being updated
  if (user && updateBody.branch) {
    if (user.userType === 'teamMember') {
      // Team members can only update timelines in their own branch
      const teamMemberBranchId = user.branch?.toString() || user.branch;
      const requestedBranchId = updateBody.branch.toString();
      if (requestedBranchId !== teamMemberBranchId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
      }
      // Also check if the existing timeline is in their branch
      const timelineBranchId = timeline.branch?.toString() || timeline.branch;
      if (timelineBranchId !== teamMemberBranchId) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this timeline');
      }
    } else if (user.role) {
      // Regular user with role
      if (!hasBranchAccess(user.role, updateBody.branch)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
      }
    }
  } else if (user && user.userType === 'teamMember') {
    // Even if branch is not being updated, check if team member can access this timeline
    const teamMemberBranchId = user.branch?.toString() || user.branch;
    const timelineBranchId = timeline.branch?.toString() || timeline.branch;
    if (timelineBranchId !== teamMemberBranchId) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this timeline');
    }
  }
  
  if (updateBody.activity) {
    await validateActivity(updateBody.activity);
  }
  if (updateBody.client) {
    await validateClient(updateBody.client);
  }
  
  Object.assign(timeline, updateBody);
  await timeline.save();
  return timeline.populate([
    { path: 'activity', select: 'name' },
    { path: 'client', select: 'name email' }
  ]);
};

/**
 * Delete timeline by id
 * @param {ObjectId} timelineId
 * @param {Object} user
 * @returns {Promise<Timeline>}
 */
const deleteTimelineById = async (timelineId, user = null) => {
  const timeline = await getTimelineById(timelineId, user);
  await timeline.deleteOne();
  return timeline;
};

/**
 * Bulk import timelines
 * @param {Array} timelinesData
 * @returns {Promise<Object>}
 */
const bulkImportTimelines = async (timelinesData) => {
  const results = {
    created: [],
    updated: [],
    errors: []
  };

  for (let i = 0; i < timelinesData.length; i++) {
    const timelineData = timelinesData[i];
    
    try {
      // Validate required fields
      if (!timelineData.activity || !timelineData.client || !timelineData.branch) {
        results.errors.push({
          index: i,
          field: 'required_fields',
          value: 'Missing required fields: activity, client, or branch'
        });
        continue;
      }

      // Validate activity and client references
      try {
        await validateActivity(timelineData.activity);
        await validateClient(timelineData.client);
      } catch (error) {
        results.errors.push({
          index: i,
          field: 'reference_validation',
          value: error.message
        });
        continue;
      }

      // Check if timeline already exists (by ID if provided)
      if (timelineData.id) {
        const existingTimeline = await Timeline.findById(timelineData.id);
        if (existingTimeline) {
          // Update existing timeline
          Object.assign(existingTimeline, timelineData);
          delete existingTimeline.id; // Remove the id field
          await existingTimeline.save();
          results.updated.push({
            index: i,
            timeline: existingTimeline
          });
        } else {
          // Create new timeline with the provided ID
          delete timelineData.id;
          const newTimeline = await Timeline.create(timelineData);
          results.created.push({
            index: i,
            timeline: newTimeline
          });
        }
      } else {
        // Create new timeline
        const newTimeline = await Timeline.create(timelineData);
        results.created.push({
          index: i,
          timeline: newTimeline
        });
      }
    } catch (error) {
      results.errors.push({
        index: i,
        field: 'creation_error',
        value: error.message
      });
    }
  }

  return results;
};

/**
 * Check if a subactivity is GST-related
 * @param {Object} subactivity - Subactivity object
 * @returns {boolean} - True if subactivity is GST-related
 */
const isGstRelatedSubactivity = (subactivity) => {
  if (!subactivity) return false;
  
  // Check if subactivity name contains "GST" (case-insensitive)
  const subactivityName = (subactivity.name || '').toLowerCase();
  if (subactivityName.includes('gst')) {
    return true;
  }
  
  // Check if any field name contains "GST"
  if (subactivity.fields && Array.isArray(subactivity.fields)) {
    for (const field of subactivity.fields) {
      const fieldName = (field.name || '').toLowerCase();
      if (fieldName.includes('gst')) {
        return true;
      }
    }
  }
  
  return false;
};

/**
 * Create timelines for a client based on their activities and subactivities
 * @param {Object} client - Client document
 * @param {Array} activities - Array of client activities
 * @returns {Promise<Array>} Array of created timeline documents
 */
export const createClientTimelines = async (client, activities) => {
  if (!activities || activities.length === 0) {
    return [];
  }

  const timelinePromises = [];
  const { yearString: financialYear } = getCurrentFinancialYear();

  for (const activityItem of activities) {
    try {
      // Get the full activity document to check subactivities
      const Activity = mongoose.model('Activity');
      const activity = await Activity.findById(activityItem.activity);
      
      if (!activity) {

        continue;
      }

      // Handle activities with subactivities
      if (activity.subactivities && activity.subactivities.length > 0) {
        
        for (const subactivity of activity.subactivities) {
          
          // Check if specific subactivity is assigned to this client
          let isAssignedSubactivity = false;
          
          if (activityItem.subactivity) {
            // Handle both object and ObjectId formats
            const clientSubactivityId = activityItem.subactivity._id || activityItem.subactivity;
            isAssignedSubactivity = clientSubactivityId.toString() === subactivity._id.toString();
          }

          // If no specific subactivity is assigned, or this is the assigned one
          if (!activityItem.subactivity || isAssignedSubactivity) {
            // Check if subactivity is GST-related
            const isGstRelated = isGstRelatedSubactivity(subactivity);
            const clientGstNumbers = client.gstNumbers || [];
            const hasMultipleGst = clientGstNumbers.length > 1;
            
            // If GST-related and client has multiple GST numbers, create one timeline per GST
            if (isGstRelated && hasMultipleGst) {
              // Create one timeline for each GST number
              for (const gstNumber of clientGstNumbers) {
                if (subactivity.frequency && subactivity.frequency !== 'None' && subactivity.frequencyConfig) {
                  const currentDueDate = calculateCurrentPeriodDueDate(subactivity.frequency, subactivity.frequencyConfig);
                  
                  if (!currentDueDate || !(currentDueDate instanceof Date) || isNaN(currentDueDate.getTime())) {
                    continue;
                  }
                  
                  const currentPeriod = getPeriodFromDate(currentDueDate, subactivity.frequency);

                  const timeline = new Timeline({
                    activity: activity._id,
                    subactivity: {
                      _id: subactivity._id,
                      name: subactivity.name,
                      frequency: subactivity.frequency,
                      frequencyConfig: subactivity.frequencyConfig,
                      fields: subactivity.fields
                    },
                    subactivityId: subactivity._id,
                    client: client._id,
                    status: 'pending',
                    dueDate: currentDueDate,
                    startDate: currentDueDate,
                    endDate: currentDueDate,
                    frequency: subactivity.frequency,
                    frequencyConfig: subactivity.frequencyConfig,
                    branch: client.branch,
                    timelineType: 'recurring',
                    financialYear: financialYear,
                    period: currentPeriod,
                    state: gstNumber.state, // Add state field for GST timelines
                    fields: subactivity.fields ? subactivity.fields.map(field => ({
                      fileName: field.name,
                      fieldType: field.type,
                      fieldValue: null
                    })) : [],
                    metadata: {
                      gstNumber: gstNumber.gstNumber,
                      gstState: gstNumber.state,
                      gstUserId: gstNumber.gstUserId,
                      gstId: gstNumber._id?.toString() || gstNumber._id
                    }
                  });
                  
                  timelinePromises.push(timeline.save());
                } else {
                  // Create one-time timeline for subactivities without frequency
                  const dueDate = new Date();
                  dueDate.setDate(dueDate.getDate() + 30);
                  
                  const timeline = new Timeline({
                    activity: activity._id,
                    subactivity: {
                      _id: subactivity._id,
                      name: subactivity.name,
                      frequency: subactivity.frequency,
                      frequencyConfig: subactivity.frequencyConfig,
                      fields: subactivity.fields
                    },
                    subactivityId: subactivity._id,
                    client: client._id,
                    status: 'pending',
                    dueDate: dueDate,
                    startDate: dueDate,
                    endDate: dueDate,
                    frequency: 'OneTime',
                    frequencyConfig: null,
                    branch: client.branch,
                    timelineType: 'oneTime',
                    financialYear: financialYear,
                    period: getPeriodFromDate(dueDate),
                    state: gstNumber.state, // Add state field for GST timelines
                    fields: subactivity.fields ? subactivity.fields.map(field => ({
                      fileName: field.name,
                      fieldType: field.type,
                      fieldValue: null
                    })) : [],
                    metadata: {
                      gstNumber: gstNumber.gstNumber,
                      gstState: gstNumber.state,
                      gstUserId: gstNumber.gstUserId,
                      gstId: gstNumber._id?.toString() || gstNumber._id
                    }
                  });
                  
                  timelinePromises.push(timeline.save());
                }
              }
            } else {
              // Not GST-related OR client has single/no GST - create single timeline
              if (subactivity.frequency && subactivity.frequency !== 'None' && subactivity.frequencyConfig) {
                
                // Create only ONE timeline for the current period
                const currentDueDate = calculateCurrentPeriodDueDate(subactivity.frequency, subactivity.frequencyConfig);
                
                // Validate the date is valid
                if (!currentDueDate || !(currentDueDate instanceof Date) || isNaN(currentDueDate.getTime())) {

                  continue; // Skip this subactivity and move to the next one
                }
                
                const currentPeriod = getPeriodFromDate(currentDueDate, subactivity.frequency);

                const timeline = new Timeline({
                  activity: activity._id,
                  subactivity: {
                    _id: subactivity._id,
                    name: subactivity.name,
                    frequency: subactivity.frequency,
                    frequencyConfig: subactivity.frequencyConfig,
                    fields: subactivity.fields
                  },
                  subactivityId: subactivity._id,
                  client: client._id,
                  status: 'pending',
                  dueDate: currentDueDate,
                  startDate: currentDueDate,
                  endDate: currentDueDate,
                  frequency: subactivity.frequency,
                  frequencyConfig: subactivity.frequencyConfig,
                  branch: client.branch,
                  timelineType: 'recurring',
                  financialYear: financialYear,
                  period: currentPeriod,
                  fields: subactivity.fields ? subactivity.fields.map(field => ({
                    fileName: field.name,
                    fieldType: field.type,
                    fieldValue: null // Empty value as requested
                  })) : []
                });
                
                timelinePromises.push(timeline.save());
              } else {
                // Create one-time timeline for subactivities without frequency
                const dueDate = new Date();
                dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days
                
                const timeline = new Timeline({
                  activity: activity._id,
                  subactivity: {
                    _id: subactivity._id,
                    name: subactivity.name,
                    frequency: subactivity.frequency,
                    frequencyConfig: subactivity.frequencyConfig,
                    fields: subactivity.fields
                  },
                  subactivityId: subactivity._id,
                  client: client._id,
                  status: 'pending',
                  dueDate: dueDate,
                  startDate: dueDate,
                  endDate: dueDate,
                  frequency: 'OneTime',
                  frequencyConfig: null,
                  branch: client.branch,
                  timelineType: 'oneTime',
                  financialYear: financialYear,
                  period: getPeriodFromDate(dueDate),
                  fields: subactivity.fields ? subactivity.fields.map(field => ({
                    fileName: field.name,
                    fieldType: field.type,
                    fieldValue: null // Empty value as requested
                  })) : []
                });
                
                timelinePromises.push(timeline.save());
              }
            }
          }
        }
      } else {
        // Handle legacy activities without subactivities - create one-time timeline
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // Due in 30 days
        
        const timeline = new Timeline({
          activity: activity._id,
          subactivity: null,
          client: client._id,
          status: 'pending',
          dueDate: dueDate,
          startDate: dueDate,
          endDate: dueDate,
          frequency: 'OneTime',
          frequencyConfig: null,
          branch: client.branch,
          timelineType: 'oneTime',
          financialYear: financialYear,
          period: getPeriodFromDate(dueDate),
          fields: [] // No fields for legacy activities
        });
        
        timelinePromises.push(timeline.save());
      }
    } catch (error) {

      // Continue with other activities even if one fails
    }
  }
  
  // Wait for all timelines to be created
  if (timelinePromises.length > 0) {
    const createdTimelines = await Promise.all(timelinePromises);
    return createdTimelines;
  }
  
  return [];
};

/**
 * Calculate due date for current period based on frequency
 * @param {string} frequency - The frequency type
 * @param {Object} frequencyConfig - The frequency configuration
 * @returns {Date} Due date for current period
 */
const calculateCurrentPeriodDueDate = (frequency, frequencyConfig) => {
  const now = new Date();
  
  try {
    // Validate that frequencyConfig exists
    if (!frequencyConfig) {

      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() + 30);
      return fallbackDate;
    }

    // Use calculateNextOccurrence to get the next due date from now
    // Correct parameter order: (frequencyConfig, frequency, startDate)
    const nextOccurrence = calculateNextOccurrence(frequencyConfig, frequency, now);
    
    // Validate the date is valid
    if (!nextOccurrence || isNaN(nextOccurrence.getTime())) {

      throw new Error('Invalid date returned from calculateNextOccurrence');
    }
    
    // If the next occurrence is in the future, use it
    // If it's in the past, it means we're already in the current period
    if (nextOccurrence > now) {
      return nextOccurrence;
    } else {
      // If next occurrence is in the past, calculate from the beginning of current period
      switch (frequency) {
        case 'Monthly':
          if (frequencyConfig.monthlyDay) {
            const currentMonth = new Date(now.getFullYear(), now.getMonth(), frequencyConfig.monthlyDay);
            if (isNaN(currentMonth.getTime())) {
              throw new Error(`Invalid date for Monthly: day ${frequencyConfig.monthlyDay}`);
            }
            if (currentMonth > now) {
              return currentMonth;
            } else {
              // Next month
              const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, frequencyConfig.monthlyDay);
              if (isNaN(nextMonth.getTime())) {
                throw new Error(`Invalid date for Monthly: day ${frequencyConfig.monthlyDay}`);
              }
              return nextMonth;
            }
          }
          break;
          
        case 'Quarterly':
          if (frequencyConfig.quarterlyMonths && frequencyConfig.quarterlyMonths.length > 0 && frequencyConfig.quarterlyDay) {
            // Use custom quarterlyMonths (e.g. July, Jan, Oct for TDS), not calendar quarters
            const nextFromConfig = calculateNextOccurrence(frequencyConfig, 'Quarterly', now);
            if (nextFromConfig && !isNaN(nextFromConfig.getTime())) {
              return nextFromConfig;
            }
          }
          if (frequencyConfig.quarterlyDay) {
            // Fallback: register quarters (July=Q1, Oct=Q2, Jan=Q3, May=Q4) when no quarterlyMonths
            const registerMonths = [6, 9, 0, 4];
            const currentYear = now.getFullYear();
            const day = Math.min(frequencyConfig.quarterlyDay, 31);
            const candidates = [];
            for (const m of registerMonths) {
              const y = m === 0 ? currentYear + 1 : currentYear;
              const lastDay = new Date(y, m + 1, 0).getDate();
              candidates.push(new Date(y, m, Math.min(day, lastDay)));
            }
            for (const m of registerMonths) {
              const y = m === 0 ? currentYear + 2 : currentYear + 1;
              const lastDay = new Date(y, m + 1, 0).getDate();
              candidates.push(new Date(y, m, Math.min(day, lastDay)));
            }
            candidates.sort((a, b) => a - b);
            const next = candidates.find((d) => d > now);
            return next || new Date(currentYear + 1, 6, Math.min(day, 31));
          }
          break;
          
        case 'Yearly':
          if (frequencyConfig.yearlyMonth && frequencyConfig.yearlyDate) {
            // Handle both array and string for backward compatibility
            const monthValue = Array.isArray(frequencyConfig.yearlyMonth) 
              ? frequencyConfig.yearlyMonth[0] 
              : frequencyConfig.yearlyMonth;
            const monthIndex = [
              'January', 'February', 'March', 'April', 'May', 'June',
              'July', 'August', 'September', 'October', 'November', 'December'
            ].indexOf(monthValue);
            
            if (monthIndex !== -1) {
              // For financial year, determine correct year
              const year = monthIndex >= 3 ? now.getFullYear() : now.getFullYear() + 1;
              const yearlyDue = new Date(year, monthIndex, frequencyConfig.yearlyDate);
              
              if (isNaN(yearlyDue.getTime())) {
                throw new Error(`Invalid date for Yearly: month ${monthValue}, day ${frequencyConfig.yearlyDate}`);
              }
              
              if (yearlyDue > now) {
                return yearlyDue;
              } else {
                // Next year
                const nextYear = new Date(year + 1, monthIndex, frequencyConfig.yearlyDate);
                if (isNaN(nextYear.getTime())) {
                  throw new Error(`Invalid date for Yearly: month ${monthValue}, day ${frequencyConfig.yearlyDate}`);
                }
                return nextYear;
              }
            }
          }
          break;
      }
      
      // Validate nextOccurrence before returning as fallback
      if (!nextOccurrence || isNaN(nextOccurrence.getTime())) {
        throw new Error('nextOccurrence is invalid and no valid date could be calculated from switch cases');
      }
      
      // Fallback: return next occurrence
      return nextOccurrence;
    }
  } catch (error) {

    // Fallback: return a date 30 days from now
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() + 30);
    return fallbackDate;
  }
};

/**
 * Get period string from date (e.g., "April-2024", "Q1-2024").
 * Register quarters: July=Q1, October=Q2, January=Q3, May=Q4.
 * @param {Date} date - Date to get period for
 * @param {string} frequency - The frequency type (optional, for better period calculation)
 * @returns {String} Period string
 */
const getPeriodFromDate = (date, frequency = null) => {
  const month = date.getMonth();
  const year = date.getFullYear();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Return period based on frequency
  if (frequency === 'Quarterly') {
    // Register: July=Q1, Oct=Q2, Jan=Q3, May=Q4. Month ranges: Jan–Mar Q3, Apr–Jun Q4, Jul–Sep Q1, Oct–Dec Q2
    let quarter;
    if (month <= 2) quarter = 'Q3';      // Jan–Mar
    else if (month <= 5) quarter = 'Q4'; // Apr–Jun (May is Q4 due month)
    else if (month <= 8) quarter = 'Q1';  // Jul–Sep
    else quarter = 'Q2';                  // Oct–Dec
    return `${quarter}-${year}`;
  } else if (frequency === 'Yearly') {
    // Financial year format
    const financialYearStart = month >= 3 ? year : year - 1;
    const financialYearEnd = financialYearStart + 1;
    return `${financialYearStart}-${financialYearEnd}`;
  } else {
    // Default to monthly format
    return `${monthNames[month]}-${year}`;
  }
};

/**
 * Get timelines for a specific client
 * @param {String} clientId - Client ID
 * @param {String} branchId - Branch ID
 * @returns {Promise<Array>} Array of timeline documents
 */
export const getClientTimelines = async (clientId, branchId) => {
  const timelines = await Timeline.find({
    client: clientId,
    branch: branchId,
    isDeleted: { $ne: true }
  }).populate([
    { path: 'activity', select: 'name sortOrder subactivities' },
    { path: 'client', select: 'name email phone' }
  ]);
  
  // Process subactivity data since it's stored as embedded document
  timelines.forEach(timeline => {
    if (timeline.subactivity && timeline.subactivity._id && timeline.activity && timeline.activity.subactivities) {
      const subactivity = timeline.activity.subactivities.find(
        sub => sub._id.toString() === timeline.subactivity._id.toString()
      );
      if (subactivity) {
        timeline.subactivity = subactivity;
      }
    }
  });
  
  return timelines;
};

/**
 * Get all timelines with populated data
 * @param {Object} filter - Filter criteria
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Array of timeline documents with populated data
 */
export const getAllTimelines = async (filter = {}, options = {}) => {
  const query = Timeline.find(filter);
  
  // Apply pagination if provided
  if (options.limit) {
    query.limit(options.limit);
  }
  if (options.skip) {
    query.skip(options.skip);
  }
  
  // Apply sorting if provided
  if (options.sortBy) {
    query.sort(options.sortBy);
  }
  
  // Always populate with activity and client data
  query.populate([
    { path: 'activity', select: 'name sortOrder subactivities' },
    { path: 'client', select: 'name email phone' }
  ]);
  
  const timelines = await query.exec();
  
  // Process subactivity data since it's stored as embedded document
  timelines.forEach(timeline => {
    if (timeline.subactivity && timeline.subactivity._id && timeline.activity && timeline.activity.subactivities) {
      const subactivity = timeline.activity.subactivities.find(
        sub => sub._id.toString() === timeline.subactivity._id.toString()
      );
      if (subactivity) {
        timeline.subactivity = subactivity;
      }
    }
  });
  
  return timelines;
};

/**
 * Update timeline status
 * @param {String} timelineId - Timeline ID
 * @param {String} status - New status
 * @returns {Promise<Object>} Updated timeline document
 */
export const updateTimelineStatus = async (timelineId, status) => {
  const timeline = await Timeline.findByIdAndUpdate(
    timelineId,
    { status },
    { new: true, runValidators: true }
  );
  
  // Populate the updated timeline before returning
  const populatedTimeline = await Timeline.populate(timeline, [
    { path: 'activity', select: 'name sortOrder subactivities' },
    { path: 'client', select: 'name email phone' }
  ]);
  
  // Process subactivity data since it's stored as embedded document
  if (populatedTimeline && populatedTimeline.subactivity && populatedTimeline.subactivity._id && populatedTimeline.activity && populatedTimeline.activity.subactivities) {
    const subactivity = populatedTimeline.activity.subactivities.find(
      sub => sub._id.toString() === populatedTimeline.subactivity._id.toString()
    );
    if (subactivity) {
      populatedTimeline.subactivity = subactivity;
    }
  }
  
  return populatedTimeline;
};

/**
 * Get frequency periods for a specific frequency type
 * @param {String} frequency - Frequency type ('Monthly', 'Quarterly', 'Yearly')
 * @param {String} [financialYear] - Financial year (e.g., '2025-2026'). If not provided, uses current financial year
 * @returns {Promise<Object>} Object containing frequency periods and their details
 */
const getFrequencyPeriods = async (frequency, financialYear = null) => {
  // Get current financial year if not provided
  if (!financialYear) {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const financialYearStart = currentDate.getMonth() >= 3 ? currentYear : currentYear - 1;
    const financialYearEnd = financialYearStart + 1;
    financialYear = `${financialYearStart}-${financialYearEnd}`;
  }

  const periods = [];
  const [startYear, endYear] = financialYear.split('-').map(Number);

  switch (frequency) {
    case 'Monthly':
      // Generate monthly periods for the financial year (April to March)
      for (let month = 3; month <= 14; month++) {
        const monthIndex = month % 12;
        const monthName = getMonthName(monthIndex);
        const periodYear = monthIndex >= 3 ? startYear : endYear;
        const period = `${monthName}-${periodYear}`;
        
        periods.push({
          period,
          month: monthName,
          year: periodYear,
          monthIndex,
          startDate: new Date(periodYear, monthIndex, 1),
          endDate: new Date(periodYear, monthIndex + 1, 0), // Last day of the month
          displayName: `${monthName} ${periodYear}`
        });
      }
      break;

    case 'Quarterly':
      // Register: July=Q1, October=Q2, January=Q3, May=Q4 (quarter due months)
      const quarterlyMonths = [
        { monthIndex: 6, monthName: 'July', year: startYear, quarter: 'Q1' },
        { monthIndex: 9, monthName: 'October', year: startYear, quarter: 'Q2' },
        { monthIndex: 0, monthName: 'January', year: endYear, quarter: 'Q3' },
        { monthIndex: 4, monthName: 'May', year: startYear, quarter: 'Q4' },
      ];

      for (const monthData of quarterlyMonths) {
        const period = `${monthData.quarter}-${monthData.year}`;
        const startDate = new Date(monthData.year, monthData.monthIndex, 1);
        const endDate = new Date(monthData.year, monthData.monthIndex + 1, 0);
        periods.push({
          period,
          month: monthData.monthName,
          year: monthData.year,
          monthIndex: monthData.monthIndex,
          startDate,
          endDate,
          displayName: `${monthData.monthName} ${monthData.year} (${monthData.quarter})`,
          financialYear,
          quarter: monthData.quarter,
        });
      }
      break;

    case 'Yearly':
      // Generate yearly periods (can be multiple years if needed)
      periods.push({
        period: financialYear,
        year: startYear,
        startDate: new Date(startYear, 3, 1), // April 1st
        endDate: new Date(endYear, 2, 31),    // March 31st
        displayName: `Financial Year ${financialYear}`,
        financialYear
      });
      break;

    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }

  return {
    frequency,
    financialYear,
    periods,
    totalPeriods: periods.length,
    description: getFrequencyDescription(frequency, financialYear)
  };
};

/**
 * Get frequency status statistics for timelines
 * @param {Object} params - Parameters including branchId, startDate, endDate, frequency, status
 * @param {Object} user - User object with role information
 * @returns {Promise<Object>}
 */
export const getFrequencyStatusStats = async (params, user) => {
  const { branchId, startDate, endDate, frequency, status } = params;
  
  // Check cache first
  const cacheKey = cache.generateKey('frequency-status-stats', { 
    userId: user._id.toString(), 
    branchId: branchId || 'all',
    startDate: startDate || '',
    endDate: endDate || '',
    frequency: frequency || 'all',
    status: status || 'all'
  });
  
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }
  
  // Build filter based on parameters
  let filter = {};
  
  if (branchId) {
    filter.branch = branchId;
  }
  
  if (frequency) {
    filter.frequency = frequency;
  }
  
  // Apply user's branch access restrictions
  if (user.role && !branchId) {
    const allowedBranchIds = getUserBranchIds(user.role);
    if (allowedBranchIds !== null && allowedBranchIds.length > 0) {
      filter.branch = { $in: allowedBranchIds };
    }
  }
  
  // Use aggregation pipeline for better performance
  const pipeline = [
    { $match: filter },
    {
      $group: {
        _id: null,
        totalTimelines: { $sum: 1 },
        frequencyBreakdown: {
          $push: {
            frequency: { $ifNull: ['$frequency', 'None'] },
            status: { $ifNull: ['$status', 'pending'] }
          }
        }
      }
    }
  ];
  
  const result = await Timeline.aggregate(pipeline);
  
  if (!result || result.length === 0) {
    return {
      success: true,
      data: {
        totalTimelines: 0,
        frequencyBreakdown: {},
        statusBreakdown: {
          pending: 0,
          completed: 0,
          delayed: 0,
          ongoing: 0
        }
      },
      filters: { branchId, startDate, endDate, frequency, status }
    };
  }
  
  const aggregatedData = result[0];
  const stats = {
    totalTimelines: aggregatedData.totalTimelines,
    frequencyBreakdown: {},
    statusBreakdown: {
      pending: 0,
      completed: 0,
      delayed: 0,
      ongoing: 0
    }
  };
  
  // Process the aggregated data
  aggregatedData.frequencyBreakdown.forEach(item => {
    // Count by frequency
    if (!stats.frequencyBreakdown[item.frequency]) {
      stats.frequencyBreakdown[item.frequency] = 0;
    }
    stats.frequencyBreakdown[item.frequency]++;
    
    // Count by status
    if (stats.statusBreakdown[item.status] !== undefined) {
      stats.statusBreakdown[item.status]++;
    }
  });
  
  const finalResult = {
    success: true,
    data: stats,
    filters: {
      branchId,
      startDate,
      endDate,
      frequency,
      status
    }
  };
  
  // Cache the result for 3 minutes
  cache.set(cacheKey, finalResult, 3 * 60 * 1000);
  
  return finalResult;
};

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
 * Get quarter from month using register mapping (July=Q1, Oct=Q2, Jan=Q3, May=Q4).
 * Re-exported from financialYear for local use in getFrequencyDescription; use financialYear in new code.
 */
const getQuarterFromMonth = (monthIndex) => {
  if (monthIndex <= 2) return 'Q3';   // Jan–Mar
  if (monthIndex <= 5) return 'Q4';  // Apr–Jun
  if (monthIndex <= 8) return 'Q1';  // Jul–Sep
  return 'Q2';                       // Oct–Dec
};

/**
 * Helper function to get frequency description
 * @param {string} frequency - Frequency type
 * @param {string} financialYear - Financial year
 * @returns {string} - Description of the frequency
 */
const getFrequencyDescription = (frequency, financialYear) => {
  switch (frequency) {
    case 'Monthly':
      return `Monthly periods for financial year ${financialYear} (April ${financialYear.split('-')[0]} to March ${financialYear.split('-')[1]})`;
    case 'Quarterly':
      return `Quarterly periods in financial year ${financialYear} (July=Q1, October=Q2, January=Q3, May=Q4)`;
    case 'Yearly':
      return `Financial year ${financialYear}`;
    default:
      return `Frequency periods for ${frequency}`;
  }
};

export {
  createTimeline,
  queryTimelines,
  getTimelineById,
  updateTimelineById,
  deleteTimelineById,
  bulkImportTimelines,
  getFrequencyPeriods,
};