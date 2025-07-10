import httpStatus from 'http-status';
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
 * Get total count of team members
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<number>}
 */
const getTotalTeams = async (user = null) => {
  let filter = {};
  
  // Apply branch filtering based on user's access
  if (user && user.role) {
    const allowedBranchIds = getUserBranchIds(user.role);
    
    if (allowedBranchIds === null) {
      // User has access to all branches, no filtering needed
    } else if (allowedBranchIds.length > 0) {
      // Filter by user's allowed branches
      filter.branch = { $in: allowedBranchIds };
    } else {
      // User has no branch access
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
 * Get total count of clients
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<number>}
 */
const getTotalClients = async (user = null) => {
  let filter = {};
  
  // Apply branch filtering based on user's access
  if (user && user.role) {
    const allowedBranchIds = getUserBranchIds(user.role);
    
    if (allowedBranchIds === null) {
      // User has access to all branches, no filtering needed
    } else if (allowedBranchIds.length > 0) {
      // Filter by user's allowed branches
      filter.branch = { $in: allowedBranchIds };
    } else {
      // User has no branch access
      throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
    }
  }
  
  const count = await Client.countDocuments(filter);
  return count;
};

/**
 * Get total count of ongoing tasks
 * @param {Object} user - User object with role information (optional)
 * @returns {Promise<number>}
 */
const getTotalOngoingTasks = async (user = null) => {
  let filter = { status: 'ongoing' };
  
  // Apply branch filtering based on user's access
  if (user && user.role) {
    const allowedBranchIds = getUserBranchIds(user.role);
    
    if (allowedBranchIds === null) {
      // User has access to all branches, no filtering needed
    } else if (allowedBranchIds.length > 0) {
      // Filter by user's allowed branches
      filter.branch = { $in: allowedBranchIds };
    } else {
      // User has no branch access
      throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
    }
  }
  
  const count = await Timeline.countDocuments(filter);
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
 * Get count of tasks with startDate in the given date range for a specific branch
 * @param {Object} user - User object with role information
 * @param {string} branchId - Branch ID to get counts for
 * @param {Date} startDate - Start date of the range
 * @param {Date} endDate - End date of the range
 * @returns {Promise<number>}
 */
const getAssignedTaskCounts = async (user, branchId, startDate, endDate) => {
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

  // Parse and validate dates
  const startDateValue = startDate.toISOString();
  const endDateValue = endDate.toISOString();
  
  let startYear, startMonth, startDay;
  let endYear, endMonth, endDay;
  
  if (startDateValue.includes('T')) {
    const startDatePart = startDateValue.split('T')[0];
    [startYear, startMonth, startDay] = startDatePart.split('-').map(Number);
  } else {
    [startYear, startMonth, startDay] = startDateValue.split('-').map(Number);
  }
  
  if (endDateValue.includes('T')) {
    const endDatePart = endDateValue.split('T')[0];
    [endYear, endMonth, endDay] = endDatePart.split('-').map(Number);
  } else {
    [endYear, endMonth, endDay] = endDateValue.split('-').map(Number);
  }
  
  // Validate the dates
  const tempStartDate = new Date(startYear, startMonth - 1, startDay);
  if (tempStartDate.getFullYear() !== startYear || tempStartDate.getMonth() !== startMonth - 1 || tempStartDate.getDate() !== startDay) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid startDate: ${startDateValue}. Please use YYYY-MM-DD format.`);
  }
  
  const tempEndDate = new Date(endYear, endMonth - 1, endDay);
  if (tempEndDate.getFullYear() !== endYear || tempEndDate.getMonth() !== endMonth - 1 || tempEndDate.getDate() !== endDay) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid endDate: ${endDateValue}. Please use YYYY-MM-DD format.`);
  }
  
  // Create date objects for filtering
  const filterStartDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0);
  const filterEndDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);
  
  // Build the filter for tasks with startDate in the given range
  const filter = {
    branch: branchId,
    startDate: {
      $exists: true,
      $ne: null,
      $ne: "",
      $gte: filterStartDate,
      $lte: filterEndDate
    }
  };
  
  // Count tasks that have startDate in the specified range
  const count = await Timeline.countDocuments(filter);
  
  return count;
};

export { 
  getTotalActivities, 
  getTotalTeams, 
  getTotalBranches, 
  getTotalClients, 
  getTotalOngoingTasks,
  getTimelineCountsByBranch,
  getAssignedTaskCounts
}; 