import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Activity from '../models/activity.model.js';
import TeamMember from '../models/teamMember.model.js';
import Branch from '../models/branch.model.js';
import Client from '../models/client.model.js';
import Timeline from '../models/timeline.model.js';
import ApiError from '../utils/ApiError.js';
import { getUserBranchIds, hasBranchAccess } from './role.service.js';

/**
 * Get total count of activities
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<number>}
 */
const getTotalActivities = async () => {
  const count = await Activity.countDocuments();
  return count;
};

/**
 * Get total count of team members for a specific branch
 * @param {Object} user - User object with role information
 * @param {string} branchId - Branch ID to get count for
 * @returns {Promise<number>}
 */
const getTotalTeams = async (user, branchId) => {
  // Check if user has access to the specified branch
  if (!user.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
  }

  if (!hasBranchAccess(user.role, branchId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
  }

  // Verify the branch exists
  const branch = await Branch.findById(branchId);
  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }
  
  const count = await TeamMember.countDocuments({ branch: branchId });
  return count;
};

/**
 * Get total count of branches
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<number>}
 */
const getTotalBranches = async (user = null) => {
  let filter = {};
  
  // Apply branch filtering based on user's access
  if (user && user.role) {
    const allowedBranchIds = getUserBranchIds(user.role);
    
    if (allowedBranchIds === null) {
      // User has access to all branches, no filtering needed
    } else if (allowedBranchIds.length > 0) {
      // Filter by user's allowed branches
      filter._id = { $in: allowedBranchIds };
    } else {
      // User has no branch access
      throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
    }
  }
  
  const count = await Branch.countDocuments(filter);
  return count;
};

/**
 * Get total count of clients for a specific branch
 * @param {Object} user - User object with role information
 * @param {string} branchId - Branch ID to get count for
 * @returns {Promise<number>}
 */
const getTotalClients = async (user, branchId) => {
  // Check if user has access to the specified branch
  if (!user.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
  }

  if (!hasBranchAccess(user.role, branchId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
  }

  // Verify the branch exists
  const branch = await Branch.findById(branchId);
  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }
  
  const count = await Client.countDocuments({ branch: branchId });
  return count;
};

/**
 * Get total count of ongoing tasks for a specific branch
 * @param {Object} user - User object with role information
 * @param {string} branchId - Branch ID to get count for
 * @returns {Promise<number>}
 */
const getTotalOngoingTasks = async (user, branchId) => {
  // Check if user has access to the specified branch
  if (!user.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
  }

  if (!hasBranchAccess(user.role, branchId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
  }

  // Verify the branch exists
  const branch = await Branch.findById(branchId);
  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }
  
  const count = await Timeline.countDocuments({ branch: branchId, status: 'ongoing' });
  return count;
};

/**
 * Get timeline counts by status for a specific branch
 * @param {Object} user - User object with role information
 * @param {string} branchId - Branch ID to get counts for
 * @returns {Promise<Object>}
 */
const getTimelineCountsByBranch = async (user, branchId) => {
  // Check if user has access to the specified branch
  if (!user.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
  }

  if (!hasBranchAccess(user.role, branchId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
  }

  // Verify the branch exists
  const branch = await Branch.findById(branchId);
  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }

  // Get counts for each status
  const [pending, ongoing, completed, delayed] = await Promise.all([
    Timeline.countDocuments({ branch: branchId, status: 'pending' }),
    Timeline.countDocuments({ branch: branchId, status: 'ongoing' }),
    Timeline.countDocuments({ branch: branchId, status: 'completed' }),
    Timeline.countDocuments({ branch: branchId, status: 'delayed' }),
  ]);

  return {
    branch: {
      id: branch._id,
      name: branch.name,
    },
    counts: {
      pending,
      ongoing,
      completed,
      delayed,
      total: pending + ongoing + completed + delayed,
    },
  };
};

/**
 * Get count of tasks with startDate in the past twelve months for a specific branch
 * @param {Object} user - User object with role information
 * @param {string} branchId - Branch ID to get counts for
 * @returns {Promise<Object>}
 */
const getAssignedTaskCounts = async (user, branchId) => {
  // Check if user has access to the specified branch
  if (!user.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
  }

  if (!hasBranchAccess(user.role, branchId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
  }

  // Verify the branch exists
  const branch = await Branch.findById(branchId);
  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }

  // Calculate the past 12 months
  const months = [];
  const assigned = [];
  
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
    
    // Build filter for tasks with startDate in this month
    const filter = {
      branch: branchId,
      startDate: {
        $exists: true,
        $ne: null,
        $ne: "",
        $gte: monthStart,
        $lte: monthEnd
      }
    };
    
    // Count tasks for this month
    const monthCount = await Timeline.countDocuments(filter);
    assigned.push(monthCount);
  }
  
  return {
    assigned,
    months
  };
};

/**
 * Get top 5 clients based on timeline count for a specific branch
 * @param {Object} user - User object with role information
 * @param {string} branchId - Branch ID to get top clients for
 * @returns {Promise<Array>}
 */
const getTopClients = async (user, branchId) => {
  // Check if user has access to the specified branch
  if (!user.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
  }

  if (!hasBranchAccess(user.role, branchId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
  }

  // Verify the branch exists
  const branch = await Branch.findById(branchId);
  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }

  // Aggregate to get top 5 clients by timeline count
  const topClients = await Timeline.aggregate([
    { $match: { branch: new mongoose.Types.ObjectId(branchId) } },
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
 * @param {string} branchId - Branch ID to get top activities for
 * @returns {Promise<Array>}
 */
const getTopActivities = async (user, branchId) => {
  // Check if user has access to the specified branch
  if (!user.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
  }

  if (!hasBranchAccess(user.role, branchId)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
  }

  // Verify the branch exists
  const branch = await Branch.findById(branchId);
  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }

  // Aggregate to get top 5 activities by timeline count
  const topActivities = await Timeline.aggregate([
    { $match: { branch: new mongoose.Types.ObjectId(branchId) } },
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
  getTotalActivities, 
  getTotalTeams, 
  getTotalBranches, 
  getTotalClients, 
  getTotalOngoingTasks,
  getTimelineCountsByBranch,
  getAssignedTaskCounts,
  getTopClients,
  getTopActivities
}; 