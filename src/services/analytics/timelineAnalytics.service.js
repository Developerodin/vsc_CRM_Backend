import mongoose from 'mongoose';
import Timeline from '../../models/timeline.model.js';
import Client from '../../models/client.model.js';
import Activity from '../../models/activity.model.js';
import Task from '../../models/task.model.js';
import { hasBranchAccess, getUserBranchIds } from '../role.service.js';

/**
 * Get all timelines table data with comprehensive information
 * @param {Object} filter - Filter options
 * @param {Object} options - Query options including pagination
 * @param {Object} user - User object with role information
 * @returns {Promise<Object>} Timelines table data with pagination
 */
const getAllTimelinesTableData = async (filter = {}, options = {}, user = null) => {
  try {
    // Create a new filter object to avoid modifying the original
    const mongoFilter = { ...filter };
    
    // Remove analytics-specific filters that need special handling
    const clientSearch = mongoFilter.clientSearch;
    const businessType = mongoFilter.businessType;
    const entityType = mongoFilter.entityType;
    const clientCategory = mongoFilter.clientCategory;
    const turnover = mongoFilter.turnover;
    const turnoverYear = mongoFilter.turnoverYear ? String(mongoFilter.turnoverYear).trim() : null;
    const activitySearch = mongoFilter.activitySearch;
    const subactivitySearch = mongoFilter.subactivitySearch;
    const globalSearch = mongoFilter.search;
    
    delete mongoFilter.clientSearch;
    delete mongoFilter.businessType;
    delete mongoFilter.entityType;
    delete mongoFilter.clientCategory;
    delete mongoFilter.turnover;
    delete mongoFilter.turnoverYear;
    delete mongoFilter.activitySearch;
    delete mongoFilter.subactivitySearch;
    delete mongoFilter.search;

    // Handle individual field filters
    // If period filter exists, convert it to case-insensitive regex
    if (mongoFilter.period) {
      mongoFilter.period = { $regex: mongoFilter.period, $options: 'i' };
    }
    
    // If financialYear filter exists, convert it to case-insensitive regex
    if (mongoFilter.financialYear) {
      mongoFilter.financialYear = { $regex: mongoFilter.financialYear, $options: 'i' };
    }
    
    // Handle activityName filter (similar to regular timeline service)
    let activityNameFilter = null;
    if (mongoFilter.activityName) {
      activityNameFilter = mongoFilter.activityName.trim();
      delete mongoFilter.activityName;
    }
    
    // Handle activity filter - if it's not an ObjectId, treat as name
    let activityNameStringFilter = null;
    if (mongoFilter.activity && !mongoose.Types.ObjectId.isValid(mongoFilter.activity)) {
      activityNameStringFilter = mongoFilter.activity;
      delete mongoFilter.activity;
    }

    // Handle subactivity filter - subactivity is stored as embedded document
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

    // Handle activity name filters by finding activity IDs first
    if (activityNameFilter || activityNameStringFilter || activitySearch) {
      const activitySearchTerm = activityNameFilter || activityNameStringFilter || activitySearch;
      const activityRegex = { $regex: activitySearchTerm, $options: 'i' };
      const matchingActivities = await Activity.find({ name: activityRegex }).select('_id').lean();
      const activityIds = matchingActivities.map(a => a._id);
      
      if (activityIds.length > 0) {
        if (mongoFilter.activity) {
          // If activity filter already exists, intersect with found IDs
          const existingActivityId = mongoose.Types.ObjectId.isValid(mongoFilter.activity) 
            ? new mongoose.Types.ObjectId(mongoFilter.activity) 
            : null;
          if (existingActivityId && activityIds.some(id => id.toString() === existingActivityId.toString())) {
            mongoFilter.activity = existingActivityId;
          } else {
            mongoFilter.activity = { $in: activityIds };
          }
        } else {
          mongoFilter.activity = { $in: activityIds };
        }
      } else {
        // No matching activities found, return empty result
        return {
          results: [],
          page: parseInt(options.page) || 1,
          limit: parseInt(options.limit) || 50,
          totalPages: 0,
          totalResults: 0,
          hasNextPage: false,
          hasPrevPage: false
        };
      }
    }

    // Apply branch filtering based on user's access
    if (user && user.role) {
      try {
        // If specific branch is requested in filter
        if (mongoFilter.branch) {
          // Check if user has access to this specific branch
          if (!hasBranchAccess(user.role, mongoFilter.branch)) {
            throw new Error('Access denied to this branch');
          }
          // Convert to ObjectId if it's a string
          if (typeof mongoFilter.branch === 'string') {
            mongoFilter.branch = new mongoose.Types.ObjectId(mongoFilter.branch);
          }
        } else {
          // Get user's allowed branch IDs
          const allowedBranchIds = getUserBranchIds(user.role);
          
          if (allowedBranchIds === null) {
            // User has access to all branches, no filtering needed
          } else if (Array.isArray(allowedBranchIds) && allowedBranchIds.length > 0) {
            // Filter by user's allowed branches - convert to ObjectIds
            mongoFilter.branch = { 
              $in: allowedBranchIds.map(id => {
                try {
                  return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
                } catch (error) {
                  // If ObjectId conversion fails, skip this ID
                  return null;
                }
              }).filter(id => id !== null)
            };
            
            // If all IDs were invalid, user has no valid branch access
            if (mongoFilter.branch.$in.length === 0) {
              throw new Error('No valid branch access granted');
            }
          } else {
            // User has no branch access
            throw new Error('No branch access granted');
          }
        }
      } catch (error) {
        // If branch access check fails, throw the error
        throw error;
      }
    }

    // Handle client filters (businessType, entityType, clientCategory, turnover, client search) by finding client IDs first
    if (clientSearch || businessType || entityType || clientCategory || turnover) {
      const clientFilter = {};
      
      if (clientSearch) {
        const searchRegex = { $regex: clientSearch, $options: 'i' };
        clientFilter.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex }
        ];
      }
      
      if (businessType) {
        clientFilter.businessType = { $regex: businessType, $options: 'i' };
      }
      
      if (entityType) {
        clientFilter.entityType = { $regex: entityType, $options: 'i' };
      }
      
      if (clientCategory) {
        clientFilter.category = clientCategory;
      }
      
      // Handle turnover filter separately if it's a range
      let turnoverRange = null;
      if (turnover) {
        // Parse turnover range (e.g., "10000 to 500000" or "10000-500000")
        const rangeMatch = turnover.trim().match(/^(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)$/i);
        
        if (rangeMatch) {
          // Store range for aggregation query
          turnoverRange = {
            min: parseFloat(rangeMatch[1]),
            max: parseFloat(rangeMatch[2])
          };
        } else {
          // Single value or text search
          if (turnoverYear) {
            clientFilter.turnoverHistory = {
              $elemMatch: { year: turnoverYear, turnover: { $regex: turnover, $options: 'i' } }
            };
          } else {
            clientFilter.turnover = { $regex: turnover, $options: 'i' };
          }
        }
      }
      
      let matchingClients = [];
      if (turnoverRange) {
        const pipeline = [];
        if (Object.keys(clientFilter).length > 0) {
          pipeline.push({ $match: clientFilter });
        }
        if (turnoverYear) {
          pipeline.push({
            $addFields: {
              yearEntry: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: { $ifNull: ['$turnoverHistory', []] },
                      as: 't',
                      cond: { $eq: ['$$t.year', turnoverYear] }
                    }
                  },
                  0
                ]
              }
            }
          });
          pipeline.push({
            $addFields: {
              cleanedTurnover: {
                $replaceAll: {
                  input: { $replaceAll: { input: { $ifNull: ['$yearEntry.turnover', ''] }, find: ',', replacement: '' } },
                  find: ' ',
                  replacement: ''
                }
              }
            }
          });
          pipeline.push({
            $addFields: {
              turnoverNumber: {
                $convert: { input: '$cleanedTurnover', to: 'double', onError: null, onNull: null }
              }
            }
          });
          pipeline.push({
            $match: {
              yearEntry: { $ne: null },
              turnoverNumber: { $gte: turnoverRange.min, $lte: turnoverRange.max }
            }
          });
        } else {
          pipeline.push({
            $addFields: {
              cleanedTurnover: {
                $replaceAll: {
                  input: { $replaceAll: { input: { $ifNull: ['$turnover', ''] }, find: ',', replacement: '' } },
                  find: ' ',
                  replacement: ''
                }
              }
            }
          });
          pipeline.push({
            $addFields: {
              turnoverNumber: {
                $convert: { input: '$cleanedTurnover', to: 'double', onError: null, onNull: null }
              }
            }
          });
          pipeline.push({
            $match: {
              turnover: { $ne: null, $ne: '' },
              turnoverNumber: { $gte: turnoverRange.min, $lte: turnoverRange.max }
            }
          });
        }
        pipeline.push({ $project: { _id: 1 } });
        matchingClients = await Client.aggregate(pipeline);
      } else if (Object.keys(clientFilter).length > 0) {
        matchingClients = await Client.find(clientFilter).select('_id').lean();
      }
      
      // Extract client IDs from matching clients
      if (matchingClients && matchingClients.length > 0) {
        const clientIds = matchingClients.map(c => c._id || c);
        
        if (clientIds.length > 0) {
          if (mongoFilter.client) {
            // If client filter already exists, intersect with found IDs
            const existingClientId = mongoose.Types.ObjectId.isValid(mongoFilter.client) 
              ? new mongoose.Types.ObjectId(mongoFilter.client) 
              : null;
            if (existingClientId && clientIds.some(id => id.toString() === existingClientId.toString())) {
              mongoFilter.client = existingClientId;
            } else {
              mongoFilter.client = { $in: clientIds };
            }
          } else {
            mongoFilter.client = { $in: clientIds };
          }
        } else {
          // No matching clients found, return empty result
          return {
            results: [],
            page: parseInt(options.page) || 1,
            limit: parseInt(options.limit) || 50,
            totalPages: 0,
            totalResults: 0,
            hasNextPage: false,
            hasPrevPage: false
          };
        }
      } else if (clientSearch || businessType || entityType || clientCategory || turnover) {
        // Client filters were applied but no clients matched
        return {
          results: [],
          page: parseInt(options.page) || 1,
          limit: parseInt(options.limit) || 50,
          totalPages: 0,
          totalResults: 0,
          hasNextPage: false,
          hasPrevPage: false
        };
      }
    }

    // Handle subactivity search filter
    if (subactivitySearch) {
      // Subactivity is stored as embedded document, so we need to filter after query
      // We'll handle this in post-processing
    }

    // Handle date range filters
    if (filter.startDate || filter.endDate) {
      const dateConditions = [];
      if (filter.startDate) {
        dateConditions.push({ startDate: { $gte: new Date(filter.startDate) } });
        dateConditions.push({ endDate: { $gte: new Date(filter.startDate) } });
        dateConditions.push({ dueDate: { $gte: new Date(filter.startDate) } });
        dateConditions.push({ createdAt: { $gte: new Date(filter.startDate) } });
      }
      if (filter.endDate) {
        dateConditions.push({ startDate: { $lte: new Date(filter.endDate) } });
        dateConditions.push({ endDate: { $lte: new Date(filter.endDate) } });
        dateConditions.push({ dueDate: { $lte: new Date(filter.endDate) } });
        dateConditions.push({ createdAt: { $lte: new Date(filter.endDate) } });
      }
      if (dateConditions.length > 0) {
        mongoFilter.$or = (mongoFilter.$or || []).concat(dateConditions);
      }
    }

    // Clean up mongoFilter - remove undefined/null values
    Object.keys(mongoFilter).forEach(key => {
      if (mongoFilter[key] === undefined || mongoFilter[key] === null || mongoFilter[key] === '') {
        delete mongoFilter[key];
      }
    });

    // Get pagination options
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 50;

    // Get sorting options - handle activityName sort
    let sortOptions = {};
    if (options.sortBy) {
      const sortFields = options.sortBy.split(',');
      sortFields.forEach(sortField => {
        const [field, order] = sortField.split(':');
        // Map activityName to activity.name (will be handled in post-processing)
        if (field === 'activityName') {
          // We'll sort by activity name after population
          sortOptions.createdAt = order === 'desc' ? -1 : 1; // Temporary sort
        } else {
          sortOptions[field] = order === 'desc' ? -1 : 1;
        }
      });
    } else {
      sortOptions = { createdAt: -1 }; // Default sort by creation date descending
    }

    // Check if we need post-query filtering (requires fetching all results first)
    const needsPostQueryFilter = subactivitySearch || globalSearch || (options.sortBy && options.sortBy.includes('activityName'));
    
    let result;
    let allResults = [];
    
    if (needsPostQueryFilter) {
      // For post-query filters, we need to fetch ALL results first
      // Build sort query for fetching all
      let sort = '';
      if (options.sortBy && !options.sortBy.includes('activityName')) {
        const sortingCriteria = [];
        options.sortBy.split(',').forEach((sortOption) => {
          const [key, order] = sortOption.split(':');
          sortingCriteria.push((order === 'desc' ? '-' : '') + key);
        });
        sort = sortingCriteria.join(' ');
      } else {
        sort = '-createdAt'; // Default sort
      }
      
      // Get ALL documents matching the filter (no pagination)
      allResults = await Timeline.find(mongoFilter).sort(sort).lean();
      
      // Populate all results
      if (allResults.length > 0) {
        await Timeline.populate(allResults, [
          { path: 'activity', select: 'name sortOrder subactivities', strictPopulate: false },
          { path: 'client', select: 'name email phone address district state country businessType entityType pan gstNumbers', strictPopulate: false },
          { path: 'branch', select: 'name address city state country pinCode', strictPopulate: false }
        ]);
        
        // Process subactivity data
        allResults.forEach(timeline => {
          if (timeline.subactivity && timeline.subactivity._id && timeline.activity && timeline.activity.subactivities) {
            const subactivity = timeline.activity.subactivities.find(
              sub => sub._id.toString() === timeline.subactivity._id.toString()
            );
            if (subactivity) {
              timeline.subactivity = subactivity;
            }
          }
        });
        
        // Apply post-query filters
        if (subactivitySearch) {
          const subactivityRegex = new RegExp(subactivitySearch, 'i');
          allResults = allResults.filter(timeline => 
            timeline.subactivity && timeline.subactivity.name && subactivityRegex.test(timeline.subactivity.name)
          );
        }
        
        if (globalSearch) {
          const searchRegex = new RegExp(globalSearch, 'i');
          allResults = allResults.filter(timeline => {
            return (
              (timeline.client && (
                (timeline.client.name && searchRegex.test(timeline.client.name)) ||
                (timeline.client.email && searchRegex.test(timeline.client.email)) ||
                (timeline.client.phone && searchRegex.test(timeline.client.phone))
              )) ||
              (timeline.activity && timeline.activity.name && searchRegex.test(timeline.activity.name)) ||
              (timeline.subactivity && timeline.subactivity.name && searchRegex.test(timeline.subactivity.name)) ||
              (timeline.period && searchRegex.test(timeline.period)) ||
              (timeline.financialYear && searchRegex.test(timeline.financialYear))
            );
          });
        }
        
        // Handle activityName sorting
        if (options.sortBy && options.sortBy.includes('activityName')) {
          const [field, order] = options.sortBy.split(':');
          allResults.sort((a, b) => {
            const aName = a.activity && a.activity.name ? a.activity.name.toLowerCase() : '';
            const bName = b.activity && b.activity.name ? b.activity.name.toLowerCase() : '';
            if (order === 'desc') {
              return bName.localeCompare(aName);
            } else {
              return aName.localeCompare(bName);
            }
          });
        }
      }
      
      // Apply pagination after filtering
      const totalFiltered = allResults.length;
      const skip = (page - 1) * limit;
      const paginatedResults = allResults.slice(skip, skip + limit);
      
      result = {
        results: paginatedResults,
        page,
        limit,
        totalPages: Math.ceil(totalFiltered / limit),
        totalResults: totalFiltered,
        hasNextPage: page < Math.ceil(totalFiltered / limit),
        hasPrevPage: page > 1
      };
    } else {
      // No post-query filters needed - use paginate directly for better performance
      const mappedOptions = {
        ...options,
        sortBy: Object.keys(sortOptions).map(key => `${key}:${sortOptions[key] === -1 ? 'desc' : 'asc'}`).join(',')
      };

      // Query timelines with pagination
      result = await Timeline.paginate(mongoFilter, mappedOptions);
      
      // Populate the results
      if (result.results && result.results.length > 0) {
        await Timeline.populate(result.results, [
          { path: 'activity', select: 'name sortOrder subactivities', strictPopulate: false },
          { path: 'client', select: 'name email phone address district state country businessType entityType pan gstNumbers', strictPopulate: false },
          { path: 'branch', select: 'name address city state country pinCode', strictPopulate: false }
        ]);
        
        // Process subactivity data
        result.results.forEach(timeline => {
          if (timeline.subactivity && timeline.subactivity._id && timeline.activity && timeline.activity.subactivities) {
            const subactivity = timeline.activity.subactivities.find(
              sub => sub._id.toString() === timeline.subactivity._id.toString()
            );
            if (subactivity) {
              timeline.subactivity = subactivity;
            }
          }
        });
      }
    }
    
    const timelines = result.results || [];

    // Get task counts for these timelines
    const timelineIds = timelines.map(t => t._id);
    const tasks = timelineIds.length > 0 ? await Task.find({ timeline: { $in: timelineIds } })
      .select('timeline status')
      .lean() : [];

    // Process timelines to add task information
    const processedTimelines = timelines.map(timeline => {
      // Get tasks for this timeline
      const timelineTasks = tasks.filter(task => {
        if (Array.isArray(task.timeline)) {
          return task.timeline.some(tId => tId.toString() === timeline._id.toString());
        }
        return task.timeline && task.timeline.toString() === timeline._id.toString();
      });

      // Calculate task status counts
      const taskStatusCounts = timelineTasks.reduce((acc, task) => {
        const status = task.status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      // Ensure all status fields are present even if count is 0
      const allStatuses = ['pending', 'ongoing', 'completed', 'on_hold', 'delayed', 'cancelled'];
      allStatuses.forEach(status => {
        if (!taskStatusCounts[status]) {
          taskStatusCounts[status] = 0;
        }
      });

      return {
        _id: timeline._id,
        id: timeline._id,
        // Timeline Details
        status: timeline.status,
        period: timeline.period,
        dueDate: timeline.dueDate,
        startDate: timeline.startDate,
        endDate: timeline.endDate,
        completedAt: timeline.completedAt,
        frequency: timeline.frequency,
        frequencyConfig: timeline.frequencyConfig,
        timelineType: timeline.timelineType,
        financialYear: timeline.financialYear,
        fields: timeline.fields || [],
        metadata: timeline.metadata || {},
        createdAt: timeline.createdAt,
        updatedAt: timeline.updatedAt,
        
        // Subactivity Information
        subactivity: timeline.subactivity ? {
          _id: timeline.subactivity._id,
          id: timeline.subactivity._id,
          name: timeline.subactivity.name,
          frequency: timeline.subactivity.frequency,
          frequencyConfig: timeline.subactivity.frequencyConfig,
          fields: timeline.subactivity.fields || []
        } : null,
        
        // Client Information
        client: timeline.client ? {
          _id: timeline.client._id,
          id: timeline.client._id,
          name: timeline.client.name,
          email: timeline.client.email,
          phone: timeline.client.phone,
          address: timeline.client.address,
          district: timeline.client.district,
          state: timeline.client.state,
          country: timeline.client.country,
          businessType: timeline.client.businessType,
          entityType: timeline.client.entityType,
          pan: timeline.client.pan,
          gstNumbers: timeline.client.gstNumbers || []
        } : null,
        
        // Activity Information
        activity: timeline.activity ? {
          _id: timeline.activity._id,
          id: timeline.activity._id,
          name: timeline.activity.name,
          sortOrder: timeline.activity.sortOrder,
          subactivities: timeline.activity.subactivities || []
        } : null,
        
        // Branch Information
        branch: timeline.branch ? {
          _id: timeline.branch._id,
          id: timeline.branch._id,
          name: timeline.branch.name,
          address: timeline.branch.address,
          city: timeline.branch.city,
          state: timeline.branch.state,
          country: timeline.branch.country,
          pinCode: timeline.branch.pinCode
        } : timeline.branch, // Keep as ID if not populated
        
        // Task Information
        tasks: {
          total: timelineTasks.length,
          byStatus: taskStatusCounts,
          status: {
            pending: taskStatusCounts.pending || 0,
            ongoing: taskStatusCounts.ongoing || 0,
            completed: taskStatusCounts.completed || 0,
            on_hold: taskStatusCounts.on_hold || 0,
            delayed: taskStatusCounts.delayed || 0,
            cancelled: taskStatusCounts.cancelled || 0
          }
        }
      };
    });

    return {
      results: processedTimelines,
      page: result.page || page,
      limit: result.limit || limit,
      totalPages: result.totalPages || 0,
      totalResults: result.totalResults || 0,
      hasNextPage: result.hasNextPage || false,
      hasPrevPage: result.hasPrevPage || false
    };
  } catch (error) {
    throw new Error(`Failed to get timelines table data: ${error.message}`);
  }
};

/**
 * Get detailed overview for a specific timeline
 * @param {ObjectId} timelineId - Timeline ID
 * @param {Object} filters - Filter options for tasks
 * @param {Object} options - Query options including pagination
 * @returns {Promise<Object>} Timeline detailed overview
 */
const getTimelineDetailsOverview = async (timelineId, filters = {}, options = {}) => {
  try {
    // Get timeline basic information
    const timeline = await Timeline.findById(timelineId)
      .populate('client', 'name email phone address district state country businessType entityType pan gstNumbers')
      .populate('activity', 'name sortOrder subactivities')
      .populate('branch', 'name address city state country pinCode');

    if (!timeline) {
      throw new Error('Timeline not found');
    }

    // Get all tasks related to this timeline (timeline is an array in Task model)
    let tasks = await Task.find({ timeline: { $in: [timelineId] } })
      .populate('teamMember', 'name email phone skills branch')
      .populate('assignedBy', 'name email')
      .populate('branch', 'name address city state country pinCode')
      .sort({ createdAt: -1 });

    // Apply filters to tasks
    if (filters) {
      // Filter by team member
      if (filters.teamMemberId) {
        tasks = tasks.filter(task => 
          task.teamMember && 
          task.teamMember._id.toString() === filters.teamMemberId.toString()
        );
      }

      // Filter by date range
      if (filters.startDate || filters.endDate) {
        tasks = tasks.filter(task => {
          if (!task.startDate || !task.endDate) return false;
          
          const taskStartDate = new Date(task.startDate);
          const taskEndDate = new Date(task.endDate);
           
          if (filters.startDate && filters.endDate) {
            const filterStartDate = new Date(filters.startDate);
            const filterEndDate = new Date(filters.endDate);
            return taskStartDate >= filterStartDate && taskEndDate <= filterEndDate;
          } else if (filters.startDate) {
            const filterStartDate = new Date(filters.startDate);
            return taskStartDate >= filterStartDate;
          } else if (filters.endDate) {
            const filterEndDate = new Date(filters.endDate);
            return taskEndDate <= filterEndDate;
          }
          return true;
        });
      }

      // Filter by priority
      if (filters.priority) {
        tasks = tasks.filter(task => task.priority === filters.priority);
      }

      // Filter by status
      if (filters.status) {
        tasks = tasks.filter(task => task.status === filters.status);
      }
    }

    // Calculate performance metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const ongoingTasks = tasks.filter(task => task.status === 'ongoing').length;
    const pendingTasks = tasks.filter(task => task.status === 'pending').length;
    const onHoldTasks = tasks.filter(task => task.status === 'on_hold').length;
    const delayedTasks = tasks.filter(task => task.status === 'delayed').length;

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;

    // Calculate current month metrics
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const currentMonthTasks = tasks.filter(task => 
      task.createdAt >= currentMonthStart && task.createdAt <= currentMonthEnd
    );
    const currentMonthCompleted = currentMonthTasks.filter(task => task.status === 'completed').length;

    // Group tasks by status
    const tasksByStatus = {
      pending: tasks.filter(task => task.status === 'pending'),
      ongoing: tasks.filter(task => task.status === 'ongoing'),
      completed: tasks.filter(task => task.status === 'completed'),
      on_hold: tasks.filter(task => task.status === 'on_hold'),
      delayed: tasks.filter(task => task.status === 'delayed'),
      cancelled: tasks.filter(task => task.status === 'cancelled')
    };

    // Group tasks by priority
    const tasksByPriority = tasks.reduce((acc, task) => {
      const priority = task.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    // Group tasks by team member
    const tasksByTeamMember = tasks.reduce((acc, task) => {
      if (task.teamMember && task.teamMember._id) {
        const memberId = task.teamMember._id.toString();
        if (!acc[memberId]) {
          acc[memberId] = {
            teamMember: task.teamMember,
            tasks: [],
            totalTasks: 0,
            completedTasks: 0,
            completionRate: 0
          };
        }
        acc[memberId].tasks.push(task);
        acc[memberId].totalTasks += 1;
        if (task.status === 'completed') {
          acc[memberId].completedTasks += 1;
        }
      }
      return acc;
    }, {});

    // Calculate completion rates for team members
    Object.values(tasksByTeamMember).forEach(member => {
      member.completionRate = member.totalTasks > 0 ? 
        (member.completedTasks / member.totalTasks * 100).toFixed(1) : 0;
    });

    // Monthly distribution for the last 6 months
    const monthlyDistribution = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      
      const monthTasks = tasks.filter(task => 
        task.createdAt >= monthDate && task.createdAt <= monthEnd
      );
      const monthCompleted = monthTasks.filter(task => task.status === 'completed').length;
      
      monthlyDistribution.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        total: monthTasks.length,
        completed: monthCompleted,
        completionRate: monthTasks.length > 0 ? (monthCompleted / monthTasks.length * 100).toFixed(1) : 0
      });
    }

    // Recent activities with pagination
    const sortedTasks = tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Get pagination options
    const page = parseInt(options.page) || 1;
    const hasLimit = options.limit && parseInt(options.limit) > 0;
    const limit = hasLimit ? parseInt(options.limit) : null;
    const skip = hasLimit ? (page - 1) * limit : 0;
    
    const recentActivities = hasLimit 
      ? sortedTasks.slice(skip, skip + limit)
      : sortedTasks
      .map(task => ({
        id: task._id,
        status: task.status,
        priority: task.priority,
        remarks: task.remarks,
        startDate: task.startDate,
        endDate: task.endDate,
        createdAt: task.createdAt,
        teamMember: task.teamMember ? {
          id: task.teamMember._id,
          name: task.teamMember.name,
          email: task.teamMember.email
        } : null,
        attachments: task.attachments || []
      }));

    return {
      timeline: {
        _id: timeline._id,
        status: timeline.status,
        period: timeline.period,
        dueDate: timeline.dueDate,
        startDate: timeline.startDate,
        endDate: timeline.endDate,
        completedAt: timeline.completedAt,
        frequency: timeline.frequency,
        frequencyConfig: timeline.frequencyConfig,
        timelineType: timeline.timelineType,
        financialYear: timeline.financialYear,
        fields: timeline.fields || [],
        metadata: timeline.metadata || {},
        createdAt: timeline.createdAt,
        updatedAt: timeline.updatedAt,
        subactivity: timeline.subactivity ? {
          _id: timeline.subactivity._id,
          name: timeline.subactivity.name,
          frequency: timeline.subactivity.frequency,
          frequencyConfig: timeline.subactivity.frequencyConfig,
          fields: timeline.subactivity.fields || []
        } : null,
        client: timeline.client ? {
          _id: timeline.client._id,
          name: timeline.client.name,
          email: timeline.client.email,
          phone: timeline.client.phone,
          address: timeline.client.address,
          district: timeline.client.district,
          state: timeline.client.state,
          country: timeline.client.country,
          businessType: timeline.client.businessType,
          entityType: timeline.client.entityType,
          pan: timeline.client.pan,
          gstNumbers: timeline.client.gstNumbers || []
        } : null,
        activity: timeline.activity ? {
          _id: timeline.activity._id,
          name: timeline.activity.name,
          sortOrder: timeline.activity.sortOrder
        } : null,
        branch: timeline.branch ? {
          _id: timeline.branch._id,
          name: timeline.branch.name,
          address: timeline.branch.address,
          city: timeline.branch.city,
          state: timeline.branch.state,
          country: timeline.branch.country,
          pinCode: timeline.branch.pinCode
        } : null
      },
      performance: {
        totalTasks,
        completedTasks,
        completionRate: parseFloat(completionRate),
        currentMonthCompleted: currentMonthCompleted,
        ongoingTasks,
        pendingTasks,
        onHoldTasks,
        delayedTasks
      },
      currentMonth: {
        start: currentMonthStart,
        end: currentMonthEnd,
        completedTasks: currentMonthCompleted,
        totalTasks: currentMonthTasks.length
      },
      tasks: {
        byStatus: tasksByStatus,
        byPriority: tasksByPriority,
        byTeamMember: Object.values(tasksByTeamMember),
        recent: recentActivities,
        monthlyDistribution,
        pagination: {
          page,
          limit,
          totalTasks: tasks.length,
          totalPages: Math.ceil(tasks.length / limit),
          hasNextPage: page < Math.ceil(tasks.length / limit),
          hasPrevPage: page > 1
        }
      },
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to get timeline overview: ${error.message}`);
  }
};

export default {
  getAllTimelinesTableData,
  getTimelineDetailsOverview
};

