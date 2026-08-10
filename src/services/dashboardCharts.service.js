import mongoose from 'mongoose';
import httpStatus from 'http-status';
import Task from '../models/task.model.js';
import Timeline from '../models/timeline.model.js';
import Branch from '../models/branch.model.js';
import ApiError from '../utils/ApiError.js';
import { getUserBranchIds, hasBranchAccess } from './role.service.js';
import cache from '../utils/cache.js';

/**
 * Get count of tasks with startDate in the past twelve months for a specific branch
 * @param {Object} user - User object with role information
 * @param {string} branchId - Branch ID to get counts for (optional)
 * @returns {Promise<Object>}
 */
const getAssignedTaskCounts = async (user, branchId) => {
  if (!user.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
  }

  // Check cache first
  const cacheKey = cache.generateKey('assigned-task-counts', { 
    userId: user._id.toString(), 
    branchId: branchId || 'all' 
  });
  
  const cachedResult = cache.get(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  let filter = {};
  
  if (branchId) {
    // Check if user has access to the specified branch
    if (!hasBranchAccess(user.role, branchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }

    // Verify the branch exists
    const branch = await Branch.findById(branchId);
    if (!branch) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
    }
    
    filter.branch = branchId;
  } else {
    // Apply user's branch access restrictions
    const allowedBranchIds = getUserBranchIds(user.role);
    if (allowedBranchIds !== null && allowedBranchIds.length > 0) {
      filter.branch = { $in: allowedBranchIds };
    } else if (allowedBranchIds !== null) {
      throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
    }
  }

  // Calculate the past 12 months date ranges
  const months = [];
  const monthRanges = [];
  
  for (let i = 11; i >= 0; i--) {
    const currentDate = new Date();
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    
    // Calculate start and end of the month
    const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);
    
    // Add month to months array (Aug 24 format)
    const monthName = targetDate.toLocaleString('default', { month: 'short' });
    const year = targetDate.getFullYear().toString().slice(-2);
    months.push(`${monthName} ${year}`);
    monthRanges.push({ start: monthStart, end: monthEnd });
  }
  
  // Use aggregation pipeline to get all counts in one query
  const pipeline = [
    {
      $match: {
        ...filter,
        startDate: { $exists: true, $ne: null, $ne: "" }
      }
    },
    {
      $addFields: {
        monthIndex: {
          $switch: {
            branches: monthRanges.map((range, index) => ({
              case: {
                $and: [
                  { $gte: ['$startDate', range.start] },
                  { $lte: ['$startDate', range.end] }
                ]
              },
              then: index
            })),
            default: -1
          }
        }
      }
    },
    {
      $match: { monthIndex: { $ne: -1 } }
    },
    {
      $group: {
        _id: '$monthIndex',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ];
  
  const results = await Timeline.aggregate(pipeline);
  
  // Initialize assigned array with zeros
  const assigned = new Array(12).fill(0);
  
  // Fill in the actual counts
  results.forEach(item => {
    if (item._id >= 0 && item._id < 12) {
      assigned[item._id] = item.count;
    }
  });
  
  const finalResult = {
    assigned,
    months
  };
  
  // Cache the result for 2 minutes
  cache.set(cacheKey, finalResult, 2 * 60 * 1000);
  
  return finalResult;
};

/**
 * Get top 5 clients based on timeline count for a specific branch
 * @param {Object} user - User object with role information
 * @param {string} branchId - Branch ID to get top clients for (optional)
 * @returns {Promise<Array>}
 */
const getTopClients = async (user, branchId) => {
  if (!user.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
  }

  let filter = {};
  
  if (branchId) {
    // Check if user has access to the specified branch
    if (!hasBranchAccess(user.role, branchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }

    // Verify the branch exists
    const branch = await Branch.findById(branchId);
    if (!branch) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
    }
    
    filter.branch = new mongoose.Types.ObjectId(branchId);
  } else {
    // Apply user's branch access restrictions
    const allowedBranchIds = getUserBranchIds(user.role);
    if (allowedBranchIds !== null && allowedBranchIds.length > 0) {
      filter.branch = { $in: allowedBranchIds.map(id => new mongoose.Types.ObjectId(id)) };
    } else if (allowedBranchIds !== null) {
      throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
    }
  }

  // Aggregate to get top 5 clients by timeline count
  const topClients = await Timeline.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$client',
        timelineCount: { $sum: 1 }
      }
    },
    { $sort: { timelineCount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'clients',
        localField: '_id',
        foreignField: '_id',
        as: 'clientInfo'
      }
    },
    { $unwind: '$clientInfo' },
    {
      $project: {
        _id: 0,
        name: '$clientInfo.name',
        frequency: '$timelineCount'
      }
    }
  ]);

  // Add ranking manually
  const topClientsWithRanking = topClients.map((client, index) => ({
    ...client,
    ranking: index + 1
  }));

  return topClientsWithRanking;
};

/**
 * Get top 5 activities based on timeline count for a specific branch
 * @param {Object} user - User object with role information
 * @param {string} branchId - Branch ID to get top activities for (optional)
 * @returns {Promise<Array>}
 */
const getTopActivities = async (user, branchId) => {
  if (!user.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
  }

  let filter = {};
  
  if (branchId) {
    // Check if user has access to the specified branch
    if (!hasBranchAccess(user.role, branchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }

    // Verify the branch exists
    const branch = await Branch.findById(branchId);
    if (!branch) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
    }
    
    filter.branch = new mongoose.Types.ObjectId(branchId);
  } else {
    // Apply user's branch access restrictions
    const allowedBranchIds = getUserBranchIds(user.role);
    if (allowedBranchIds !== null && allowedBranchIds.length > 0) {
      filter.branch = { $in: allowedBranchIds.map(id => new mongoose.Types.ObjectId(id)) };
    } else if (allowedBranchIds !== null) {
      throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
    }
  }

  // Aggregate to get top 5 activities by timeline count
  const topActivities = await Timeline.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$activity',
        timelineCount: { $sum: 1 }
      }
    },
    { $sort: { timelineCount: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'activities',
        localField: '_id',
        foreignField: '_id',
        as: 'activityInfo'
      }
    },
    { $unwind: '$activityInfo' },
    {
      $project: {
        _id: 0,
        name: '$activityInfo.name',
        frequency: '$timelineCount'
      }
    }
  ]);

  // Add ranking manually
  const topActivitiesWithRanking = topActivities.map((activity, index) => ({
    ...activity,
    ranking: index + 1
  }));

  return topActivitiesWithRanking;
};


export {
  getAssignedTaskCounts,
  getTopClients,
  getTopActivities,
};
