import httpStatus from 'http-status';
import Activity from '../models/activity.model.js';
import TeamMember from '../models/teamMember.model.js';
import Branch from '../models/branch.model.js';
import Client from '../models/client.model.js';
import Timeline from '../models/timeline.model.js';
import Task from '../models/task.model.js';
import ApiError from '../utils/ApiError.js';
import { getUserBranchIds, hasBranchAccess } from './role.service.js';
import cache from '../utils/cache.js';
import {
  getTimelineStatusByFrequency,
  getTimelineStatusByPeriod,
  getTimelineFrequencyAnalytics,
  getTimelineStatusTrends,
  getTimelineCompletionRates,
  getTaskAnalytics,
  getTaskTrends,
} from './dashboardAnalytics.service.js';
import {
  getAssignedTaskCounts,
  getTopClients,
  getTopActivities,
} from './dashboardCharts.service.js';

// Re-export summary without importing it (avoids circular dependency with dashboardSummary.service)
export { getDashboardSummary } from './dashboardSummary.service.js';

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
 * @param {string} branchId - Branch ID to get count for (optional)
 * @returns {Promise<number>}
 */
const getTotalTeams = async (user, branchId) => {
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
  
  const count = await TeamMember.countDocuments(filter);
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
 * @param {string} branchId - Branch ID to get count for (optional)
 * @returns {Promise<number>}
 */
const getTotalClients = async (user, branchId) => {
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
  
  const count = await Client.countDocuments(filter);
  return count;
};

/**
 * Get total count of ongoing tasks for a specific branch
 * @param {Object} user - User object with role information
 * @param {string} branchId - Branch ID to get count for (optional)
 * @returns {Promise<number>}
 */
const getTotalOngoingTasks = async (user, branchId) => {
  if (!user.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
  }

  let filter = { status: 'ongoing' };
  
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
  
  const count = await Timeline.countDocuments(filter);
  return count;
};

/**
 * Get timeline counts by status for a specific branch
 * @param {Object} user - User object with role information
 * @param {string} branchId - Branch ID to get counts for (optional)
 * @returns {Promise<Object>}
 */
const getTimelineCountsByBranch = async (user, branchId) => {
  if (!user.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
  }

  let filter = {};
  let branchInfo = null;
  
  if (branchId) {
    // Check if user has access to the specified branch
    if (!hasBranchAccess(user.role, branchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }

    // Verify the branch exists
    branchInfo = await Branch.findById(branchId);
    if (!branchInfo) {
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

  // Get counts for each status
  const [pending, ongoing, completed, delayed] = await Promise.all([
    Timeline.countDocuments({ ...filter, status: 'pending' }),
    Timeline.countDocuments({ ...filter, status: 'ongoing' }),
    Timeline.countDocuments({ ...filter, status: 'completed' }),
    Timeline.countDocuments({ ...filter, status: 'delayed' }),
  ]);

  return {
    branch: branchInfo ? {
      id: branchInfo._id,
      name: branchInfo.name,
    } : null,
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
 * Get total count of tasks and their status breakdown
 * @param {Object} user
 * @param {string} branchId
 * @returns {Promise<Object>}
 */
const getTotalTasksAndStatus = async (user, branchId) => {
  if (!user.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
  }

  let filter = {};

  if (branchId) {
    if (!hasBranchAccess(user.role, branchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
    filter.branch = branchId;
  } else {
    const allowedBranchIds = getUserBranchIds(user.role);
    if (allowedBranchIds !== null && allowedBranchIds.length > 0) {
      filter.branch = { $in: allowedBranchIds };
    } else if (allowedBranchIds !== null) {
      throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
    }
  }

  const [pending, ongoing, completed, on_hold, cancelled, delayed] = await Promise.all([
    Task.countDocuments({ ...filter, status: 'pending' }),
    Task.countDocuments({ ...filter, status: 'ongoing' }),
    Task.countDocuments({ ...filter, status: 'completed' }),
    Task.countDocuments({ ...filter, status: 'on_hold' }),
    Task.countDocuments({ ...filter, status: 'cancelled' }),
    Task.countDocuments({ ...filter, status: 'delayed' }),
  ]);

  const total = pending + ongoing + completed + on_hold + cancelled + delayed;

  return {
    branch: branchId ? { id: branchId } : null,
    total,
    statusBreakdown: {
      pending,
      ongoing,
      completed,
      on_hold,
      cancelled,
      delayed,
    },
  };
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
  getTopActivities,
  getTimelineStatusByFrequency,
  getTimelineStatusByPeriod,
  getTimelineFrequencyAnalytics,
  getTimelineStatusTrends,
  getTimelineCompletionRates,
  getTotalTasksAndStatus,
  getTaskAnalytics,
  getTaskTrends,
};
