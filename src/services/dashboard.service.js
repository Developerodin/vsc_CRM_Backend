import httpStatus from 'http-status';
import mongoose from 'mongoose';
import Activity from '../models/activity.model.js';
import TeamMember from '../models/teamMember.model.js';
import Branch from '../models/branch.model.js';
import Client from '../models/client.model.js';
import Timeline from '../models/timeline.model.js';
import Task from '../models/task.model.js';
import ApiError from '../utils/ApiError.js';
import { getUserBranchIds, hasBranchAccess } from './role.service.js';
import cache from '../utils/cache.js';

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
  results.forEach(result => {
    if (result._id >= 0 && result._id < 12) {
      assigned[result._id] = result.count;
    }
  });
  
  const result = {
    assigned,
    months
  };
  
  // Cache the result for 2 minutes
  cache.set(cacheKey, result, 2 * 60 * 1000);
  
  return result;
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

/**
 * Get timeline status breakdown by frequency type
 * @param {Object} user - User object with role information
 * @param {Object} params - Parameters including branchId, startDate, endDate, frequency, status
 * @returns {Promise<Object>}
 */
const getTimelineStatusByFrequency = async (user, { branchId, startDate, endDate, frequency, status }) => {
  // Build base filter
  let filter = {
    frequency
  };

  // Add branch filter if specified
  if (branchId) {
    if (!user.role) {
      throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
    }
    if (!hasBranchAccess(user.role, branchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
    filter.branch = branchId;
  } else {
    // Apply user's branch access restrictions
    if (user.role) {
      const allowedBranchIds = getUserBranchIds(user.role);
      if (allowedBranchIds !== null && allowedBranchIds.length > 0) {
        filter.branch = { $in: allowedBranchIds };
      } else if (allowedBranchIds !== null) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
      }
    }
  }

  // First, get all timelines that match the basic criteria
  const timelines = await Timeline.find(filter).populate('activity', 'name').populate('client', 'name').populate('branch', 'name');

  // Process timelines and generate frequency status if missing
  const processedTimelines = [];
  for (const timeline of timelines) {
    let frequencyStatus = timeline.frequencyStatus || [];
    
    // If frequencyStatus is empty, generate it based on frequency config
    if (frequencyStatus.length === 0 && timeline.frequency && timeline.frequencyConfig) {
      // Since startDate and endDate are no longer part of the timeline model,
      // we'll need to generate frequency status based on the current date range
      // For now, we'll skip this generation and use empty array
      frequencyStatus = [];
      
      // Update the timeline with generated frequency status
      timeline.frequencyStatus = frequencyStatus;
      await timeline.save();
    }
    
    // Filter frequency status by date range if dates are provided
    let filteredStatus = frequencyStatus;
    if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
      const periodRegex = getPeriodRegex(timeline.frequency, startDate, endDate);
      filteredStatus = frequencyStatus.filter(fs => {
        const matchesPeriod = periodRegex.test(fs.period);
        const matchesStatus = !status || fs.status === status;
        return matchesPeriod && matchesStatus;
      });
    } else {
      // If no dates provided, just filter by status if specified
      if (status && status.trim() !== '') {
        filteredStatus = frequencyStatus.filter(fs => fs.status === status);
      }
    }
    
    if (filteredStatus.length > 0) {
      processedTimelines.push({
        ...timeline.toObject(),
        frequencyStatus: filteredStatus
      });
    }
  }

  // Group by frequency and status
  const frequencyGroups = {};
  processedTimelines.forEach(timeline => {
    const freq = timeline.frequency;
    if (!frequencyGroups[freq]) {
      frequencyGroups[freq] = {
        frequency: freq,
        totalPeriods: 0,
        statusBreakdown: {
          pending: { count: 0, periods: [] },
          completed: { count: 0, periods: [] },
          delayed: { count: 0, periods: [] },
          ongoing: { count: 0, periods: [] }
        }
      };
    }
    
    timeline.frequencyStatus.forEach(fs => {
      frequencyGroups[freq].totalPeriods++;
      frequencyGroups[freq].statusBreakdown[fs.status].count++;
      if (!frequencyGroups[freq].statusBreakdown[fs.status].periods.includes(fs.period)) {
        frequencyGroups[freq].statusBreakdown[fs.status].periods.push(fs.period);
      }
    });
  });

  const results = Object.values(frequencyGroups);

  return {
    dateRange: startDate && endDate ? { startDate, endDate } : null,
    filters: { frequency, status },
    results
  };
};

/**
 * Get timeline status for specific periods within a frequency
 * @param {Object} user - User object with role information
 * @param {Object} params - Parameters including branchId, startDate, endDate, frequency, period
 * @returns {Promise<Object>}
 */
const getTimelineStatusByPeriod = async (user, { branchId, startDate, endDate, frequency, period }) => {
  // Build base filter
  let filter = {
    frequency
  };

  // Add branch filter if specified
  if (branchId) {
    if (!user.role) {
      throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
    }
    if (!hasBranchAccess(user.role, branchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
    filter.branch = branchId;
  } else {
    // Apply user's branch access restrictions
    if (user.role) {
      const allowedBranchIds = getUserBranchIds(user.role);
      if (allowedBranchIds !== null && allowedBranchIds.length > 0) {
        filter.branch = { $in: allowedBranchIds };
      } else if (allowedBranchIds !== null) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
      }
    }
  }

  // Get timelines and populate related data
  const timelines = await Timeline.find(filter)
    .populate('activity', 'name')
    .populate('client', 'name')
    .populate('branch', 'name')
    .populate('assignedMember', 'name');

  // Process timelines and collect period data
  const periodData = [];
  
  for (const timeline of timelines) {
    let frequencyStatus = timeline.frequencyStatus || [];
    
    // Generate frequency status if missing
    if (frequencyStatus.length === 0 && timeline.frequencyConfig) {
      // Since startDate and endDate are no longer part of the timeline model,
      // we'll need to generate frequency status based on the current date range
      // For now, we'll skip this generation and use empty array
      frequencyStatus = [];
      
      timeline.frequencyStatus = frequencyStatus;
      await timeline.save();
    }
    
    // Filter by period if specified
    let filteredStatus = frequencyStatus;
    if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
      const periodRegex = getPeriodRegex(timeline.frequency, startDate, endDate);
      filteredStatus = frequencyStatus.filter(fs => {
        const matchesPeriod = periodRegex.test(fs.period);
        const matchesSpecificPeriod = !period || fs.period === period;
        return matchesPeriod && matchesSpecificPeriod;
      });
    } else {
      // If no dates provided, just filter by specific period if specified
      if (period && period.trim() !== '') {
        filteredStatus = frequencyStatus.filter(fs => fs.period === period);
      }
    }
    
    filteredStatus.forEach(fs => {
      periodData.push({
        period: fs.period,
        status: fs.status,
        completedAt: fs.completedAt,
        notes: fs.notes,
        timelineId: timeline._id,
        activity: timeline.activity?.name || 'Unknown Activity',
        client: timeline.client?.name || 'Unknown Client',
        assignedMember: timeline.assignedMember?.name || 'Unassigned',
        branch: timeline.branch?.name || 'Unknown Branch'
      });
    });
  }

  return {
    frequency,
    dateRange: startDate && endDate ? { startDate, endDate } : null,
    period,
    totalPeriods: periodData.length,
    periods: periodData
  };
};

/**
 * Get timeline frequency analytics grouped by various criteria
 * @param {Object} user - User object with role information
 * @param {Object} params - Parameters including branchId, startDate, endDate, groupBy
 * @returns {Promise<Object>}
 */
const getTimelineFrequencyAnalytics = async (user, { branchId, startDate, endDate, groupBy }) => {
  // Build base filter
  let filter = {};

  // Add branch filter if specified
  if (branchId) {
    if (!user.role) {
      throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
    }
    if (!hasBranchAccess(user.role, branchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
    filter.branch = branchId;
  } else {
    // Apply user's branch access restrictions
    if (user.role) {
      const allowedBranchIds = getUserBranchIds(user.role);
      if (allowedBranchIds !== null && allowedBranchIds.length > 0) {
        filter.branch = { $in: allowedBranchIds };
      } else if (allowedBranchIds !== null) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
      }
    }
  }

  // Get timelines and populate related data
  const populateOptions = ['activity', 'client', 'branch'];
  const timelines = await Timeline.find(filter).populate(populateOptions);

  // Process timelines and generate frequency status if missing
  const analyticsData = {};
  
  for (const timeline of timelines) {
    let frequencyStatus = timeline.frequencyStatus || [];
    
    // Generate frequency status if missing
    if (frequencyStatus.length === 0 && timeline.frequency && timeline.frequencyConfig) {
      // Since startDate and endDate are no longer part of the timeline model,
      // we'll need to generate frequency status based on the current date range
      // For now, we'll skip this generation and use empty array
      frequencyStatus = [];
      
      timeline.frequencyStatus = frequencyStatus;
      await timeline.save();
    }
    
    // Filter frequency status by date range if dates are provided
    let filteredStatus = frequencyStatus;
    if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
      const periodRegex = getPeriodRegex(timeline.frequency, startDate, endDate);
      filteredStatus = frequencyStatus.filter(fs => periodRegex.test(fs.period));
    }
    
    if (filteredStatus.length === 0) continue;
    
    // Determine group key based on groupBy parameter
    let groupKey;
    switch (groupBy) {
      case 'frequency':
        groupKey = timeline.frequency;
        break;
      case 'status':
        // Group by the most common status in this timeline
        const statusCounts = {};
        filteredStatus.forEach(fs => {
          statusCounts[fs.status] = (statusCounts[fs.status] || 0) + 1;
        });
        groupKey = Object.keys(statusCounts).reduce((a, b) => statusCounts[a] > statusCounts[b] ? a : b);
        break;
      case 'branch':
        groupKey = timeline.branch?._id?.toString() || 'unknown';
        break;
      case 'activity':
        groupKey = timeline.activity?._id?.toString() || 'unknown';
        break;
      default:
        groupKey = timeline.frequency;
    }
    
    if (!analyticsData[groupKey]) {
      analyticsData[groupKey] = {
        totalPeriods: 0,
        pendingCount: 0,
        completedCount: 0,
        delayedCount: 0,
        ongoingCount: 0
      };
      
      // Add group-specific fields
      switch (groupBy) {
        case 'frequency':
          analyticsData[groupKey].frequency = groupKey;
          break;
        case 'status':
          analyticsData[groupKey].status = groupKey;
          break;
        case 'branch':
          analyticsData[groupKey].branch = timeline.branch?.name || 'Unknown Branch';
          analyticsData[groupKey].branchId = groupKey;
          break;
        case 'activity':
          analyticsData[groupKey].activity = timeline.activity?.name || 'Unknown Activity';
          analyticsData[groupKey].activityId = groupKey;
          break;
      }
    }
    
    // Aggregate counts
    filteredStatus.forEach(fs => {
      analyticsData[groupKey].totalPeriods++;
      analyticsData[groupKey][`${fs.status}Count`]++;
    });
  }
  
  // Calculate completion rates and format results
  const analytics = Object.values(analyticsData).map(item => ({
    ...item,
    completionRate: item.totalPeriods > 0 ? (item.completedCount / item.totalPeriods) * 100 : 0
  }));
  
  // Sort by total periods descending
  analytics.sort((a, b) => b.totalPeriods - a.totalPeriods);

  return {
    groupBy,
    dateRange: startDate && endDate ? { startDate, endDate } : null,
    totalAnalytics: analytics.length,
    analytics
  };
};

/**
 * Get timeline status trends over time
 * @param {Object} user - User object with role information
 * @param {Object} params - Parameters including branchId, startDate, endDate, frequency, interval
 * @returns {Promise<Object>}
 */
const getTimelineStatusTrends = async (user, { branchId, startDate, endDate, frequency, interval }) => {
  // Build base filter
  let filter = {
    frequency
  };

  // Add branch filter if specified
  if (branchId) {
    if (!user.role) {
      throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
    }
    if (!hasBranchAccess(user.role, branchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
    filter.branch = branchId;
  } else {
    // Apply user's branch access restrictions
    if (user.role) {
      const allowedBranchIds = getUserBranchIds(user.role);
      if (allowedBranchIds !== null && allowedBranchIds.length > 0) {
        filter.branch = { $in: allowedBranchIds };
      } else if (allowedBranchIds !== null) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
      }
    }
  }

  // Add frequency filter if specified
  if (frequency && frequency.trim() !== '') {
    filter.frequency = frequency;
  }

  // Get timelines and populate related data
  const timelines = await Timeline.find(filter);

  // Process timelines and collect trend data
  const trendData = {};
  
  for (const timeline of timelines) {
    let frequencyStatus = timeline.frequencyStatus || [];
    
    // Generate frequency status if missing
    if (frequencyStatus.length === 0 && timeline.frequency && timeline.frequencyConfig) {
      // Since startDate and endDate are no longer part of the timeline model,
      // we'll need to generate frequency status based on the current date range
      // For now, we'll skip this generation and use empty array
      frequencyStatus = [];
      
      timeline.frequencyStatus = frequencyStatus;
      await timeline.save();
    }
    
    // Filter frequency status by date range if dates are provided
    let filteredStatus = frequencyStatus;
    if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
      const periodRegex = getPeriodRegex(timeline.frequency, startDate, endDate);
      filteredStatus = frequencyStatus.filter(fs => periodRegex.test(fs.period));
    }
    
    if (filteredStatus.length === 0) continue;
    
    // Group by interval
    filteredStatus.forEach(fs => {
      const intervalKey = getIntervalKey(fs.period, timeline.frequency, interval);
      
      if (!trendData[intervalKey]) {
        trendData[intervalKey] = {
          interval: intervalKey,
          totalCount: 0,
          statusBreakdown: {
            pending: 0,
            completed: 0,
            delayed: 0,
            ongoing: 0
          }
        };
      }
      
      trendData[intervalKey].totalCount++;
      trendData[intervalKey].statusBreakdown[fs.status]++;
    });
  }
  
  // Convert to array and sort by interval
  const trends = Object.values(trendData).sort((a, b) => {
    // Sort based on interval type
    if (interval === 'day') {
      return new Date(a.interval) - new Date(b.interval);
    } else if (interval === 'week') {
      return a.interval.localeCompare(b.interval);
    } else if (interval === 'month') {
      return a.interval.localeCompare(b.interval);
    }
    return 0;
  });

  return {
    interval,
    dateRange: startDate && endDate ? { startDate, endDate } : null,
    frequency,
    trends
  };
};

/**
 * Get timeline completion rates and performance metrics
 * @param {Object} user - User object with role information
 * @param {Object} params - Parameters including branchId, startDate, endDate, frequency
 * @returns {Promise<Object>}
 */
const getTimelineCompletionRates = async (user, { branchId, startDate, endDate, frequency }) => {
  // Build base filter
  let filter = {};

  // Add frequency filter if specified
  if (frequency && frequency.trim() !== '') {
    filter.frequency = frequency;
  }

  // Add branch filter if specified
  if (branchId) {
    if (!user.role) {
      throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
    }
    if (!hasBranchAccess(user.role, branchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
    filter.branch = branchId;
  } else {
    // Apply user's branch access restrictions
    if (user.role) {
      const allowedBranchIds = getUserBranchIds(user.role);
      if (allowedBranchIds !== null && allowedBranchIds.length > 0) {
        filter.branch = { $in: allowedBranchIds };
      } else if (allowedBranchIds !== null) {
        throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
      }
    }
  }

  // Get timelines
  const timelines = await Timeline.find(filter);

  // Process timelines and collect completion data
  const frequencyStats = {};
  const overallStats = {
    totalPeriods: 0,
    completedPeriods: 0,
    delayedPeriods: 0,
    ongoingPeriods: 0,
    pendingPeriods: 0
  };
  
  for (const timeline of timelines) {
    let frequencyStatus = timeline.frequencyStatus || [];
    
    // Generate frequency status if missing
    if (frequencyStatus.length === 0 && timeline.frequency && timeline.frequencyConfig) {
      // Since startDate and endDate are no longer part of the timeline model,
      // we'll need to generate frequency status based on the current date range
      // For now, we'll skip this generation and use empty array
      frequencyStatus = [];
      
      timeline.frequencyStatus = frequencyStatus;
      await timeline.save();
    }
    
    // Filter frequency status by date range if dates are provided
    let filteredStatus = frequencyStatus;
    if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
      const periodRegex = getPeriodRegex(timeline.frequency, startDate, endDate);
      filteredStatus = frequencyStatus.filter(fs => periodRegex.test(fs.period));
    }
    
    if (filteredStatus.length === 0) continue;
    
    // Initialize frequency stats if not exists
    if (!frequencyStats[timeline.frequency]) {
      frequencyStats[timeline.frequency] = {
        frequency: timeline.frequency,
        totalPeriods: 0,
        completedPeriods: 0,
        delayedPeriods: 0,
        ongoingPeriods: 0,
        pendingPeriods: 0
      };
    }
    
    // Aggregate counts
    filteredStatus.forEach(fs => {
      // Overall stats
      overallStats.totalPeriods++;
      overallStats[`${fs.status}Periods`]++;
      
      // Frequency-specific stats
      frequencyStats[timeline.frequency].totalPeriods++;
      frequencyStats[timeline.frequency][`${fs.status}Periods`]++;
    });
  }
  
  // Calculate rates for overall stats
  overallStats.completionRate = overallStats.totalPeriods > 0 
    ? (overallStats.completedPeriods / overallStats.totalPeriods) * 100 
    : 0;
  overallStats.onTimeRate = overallStats.totalPeriods > 0 
    ? ((overallStats.completedPeriods + overallStats.ongoingPeriods) / overallStats.totalPeriods) * 100 
    : 0;
  
  // Calculate rates for frequency breakdown
  const frequencyBreakdown = Object.values(frequencyStats).map(stats => ({
    ...stats,
    completionRate: stats.totalPeriods > 0 ? (stats.completedPeriods / stats.totalPeriods) * 100 : 0,
    onTimeRate: stats.totalPeriods > 0 ? ((stats.completedPeriods + stats.ongoingPeriods) / stats.totalPeriods) * 100 : 0
  }));
  
  // Sort by completion rate descending
  frequencyBreakdown.sort((a, b) => b.completionRate - a.completionRate);

  return {
    dateRange: startDate && endDate ? { startDate, endDate } : null,
    frequency,
    overallStats,
    frequencyBreakdown
  };
};

// Helper functions
const getPeriodRegex = (frequency, startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (frequency === 'Hourly') {
    return `^${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}-\\d{2}$`;
  } else if (frequency === 'Daily') {
    return `^${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-\\d{2}$`;
  } else if (frequency === 'Weekly') {
    return `^${start.getFullYear()}-W\\d{2}$`;
  } else if (frequency === 'Monthly') {
    return `^${start.getFullYear()}-\\d{2}$`;
  } else if (frequency === 'Quarterly') {
    return `^${start.getFullYear()}-Q[1-4]$`;
  } else if (frequency === 'Yearly') {
    return `^${start.getFullYear()}-[A-Za-z]+$`;
  }
  
  // Generic regex for all frequencies
  return `^${start.getFullYear()}`;
};

const getIntervalGrouping = (interval) => {
  switch (interval) {
    case 'day':
      return { $dateToString: { format: '%Y-%m-%d', date: '$periodDate' } };
    case 'week':
      return { $dateToString: { format: '%Y-W%V', date: '$periodDate' } };
    case 'month':
      return { $dateToString: { format: '%Y-%m', date: '$periodDate' } };
    default:
      return { $dateToString: { format: '%Y-%m-%d', date: '$periodDate' } };
  }
};

// Helper function to get interval key
const getIntervalKey = (period, frequency, interval) => {
  if (interval === 'day') {
    // For daily intervals, return the date
    if (frequency === 'Daily') {
      return period; // Already in YYYY-MM-DD format
    } else if (frequency === 'Hourly') {
      return period.split('-').slice(0, 3).join('-'); // Extract YYYY-MM-DD from YYYY-MM-DD-HH
    }
  } else if (interval === 'week') {
    // For weekly intervals, return week number
    if (frequency === 'Weekly') {
      return period; // Already in YYYY-WNN format
    }
  } else if (interval === 'month') {
    // For monthly intervals, return month
    if (frequency === 'Monthly') {
      return period; // Already in YYYY-MM format
    } else if (frequency === 'Quarterly') {
      return period; // Already in YYYY-QN format
    } else if (frequency === 'Yearly') {
      return period; // Already in YYYY-MonthName format
    }
  }
  
  // Default fallback
  return period;
};

/**
 * Get total count of tasks and their status breakdown
 * @param {Object} user - User object with role information
 * @param {string} branchId - Branch ID to get counts for (optional)
 * @returns {Promise<Object>}
 */
const getTotalTasksAndStatus = async (user, branchId) => {
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

  // Get counts for each status
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

/**
 * Get task analytics with date filtering for graph visualization
 * @param {Object} user - User object with role information
 * @param {Object} params - Parameters including branchId, startDate, endDate, groupBy
 * @returns {Promise<Object>}
 */
const getTaskAnalytics = async (user, { branchId, startDate, endDate, groupBy = 'status' }) => {
  if (!user.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
  }

  let filter = {};
  
  // Add branch filter if specified
  if (branchId) {
    if (!hasBranchAccess(user.role, branchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
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

  // Add date range filter if dates are provided
  if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Filter tasks that fall within the date range
    filter.$or = [
      // Tasks that start within the range
      { startDate: { $gte: start, $lte: end } },
      // Tasks that end within the range
      { endDate: { $gte: start, $lte: end } },
      // Tasks that span across the range
      { startDate: { $lte: start }, endDate: { $gte: end } },
      // Tasks that start before range and end after range
      { startDate: { $lte: start }, endDate: { $gte: start } },
      { startDate: { $lte: end }, endDate: { $gte: end } }
    ];
  }

  // Get tasks and populate related data
  const tasks = await Task.find(filter)
    .populate('teamMember', 'name')
    .populate('assignedBy', 'name')
    .populate('branch', 'name');

  // Process tasks based on groupBy parameter
  const analyticsData = {};
  
  tasks.forEach(task => {
    let groupKey;
    
    switch (groupBy) {
      case 'status':
        groupKey = task.status;
        break;
      case 'priority':
        groupKey = task.priority;
        break;
      case 'branch':
        groupKey = task.branch?._id?.toString() || 'unknown';
        break;
      case 'teamMember':
        groupKey = task.teamMember?._id?.toString() || 'unknown';
        break;
      case 'month':
        // Group by month based on start date
        const startMonth = new Date(task.startDate);
        groupKey = `${startMonth.getFullYear()}-${String(startMonth.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'week':
        // Group by week based on start date
        const startWeek = new Date(task.startDate);
        const weekNumber = getWeekNumber(startWeek);
        groupKey = `${startWeek.getFullYear()}-W${weekNumber}`;
        break;
      default:
        groupKey = task.status;
    }
    
    if (!analyticsData[groupKey]) {
      analyticsData[groupKey] = {
        count: 0,
        tasks: [],
        statusBreakdown: {
          pending: 0,
          ongoing: 0,
          completed: 0,
          on_hold: 0,
          cancelled: 0,
          delayed: 0
        },
        priorityBreakdown: {
          low: 0,
          medium: 0,
          high: 0,
          urgent: 0,
          critical: 0
        }
      };
      
      // Add group-specific fields
      switch (groupBy) {
        case 'status':
          analyticsData[groupKey].status = groupKey;
          break;
        case 'priority':
          analyticsData[groupKey].priority = groupKey;
          break;
        case 'branch':
          analyticsData[groupKey].branch = task.branch?.name || 'Unknown Branch';
          analyticsData[groupKey].branchId = groupKey;
          break;
        case 'teamMember':
          analyticsData[groupKey].teamMember = task.teamMember?.name || 'Unknown Member';
          analyticsData[groupKey].teamMemberId = groupKey;
          break;
        case 'month':
          analyticsData[groupKey].month = groupKey;
          break;
        case 'week':
          analyticsData[groupKey].week = groupKey;
          break;
      }
    }
    
    // Aggregate counts
    analyticsData[groupKey].count++;
    analyticsData[groupKey].statusBreakdown[task.status]++;
    analyticsData[groupKey].priorityBreakdown[task.priority]++;
    
    // Add task details (limited to avoid large responses)
    if (analyticsData[groupKey].tasks.length < 10) {
      analyticsData[groupKey].tasks.push({
        id: task._id,
        title: task.remarks || 'No Title',
        status: task.status,
        priority: task.priority,
        startDate: task.startDate,
        endDate: task.endDate,
        teamMember: task.teamMember?.name || 'Unknown',
        assignedBy: task.assignedBy?.name || 'Unknown'
      });
    }
  });
  
  // Convert to array and sort by count descending
  const analytics = Object.values(analyticsData).sort((a, b) => b.count - a.count);

  return {
    groupBy,
    dateRange: startDate && endDate ? { startDate, endDate } : null,
    totalTasks: tasks.length,
    totalGroups: analytics.length,
    analytics
  };
};

/**
 * Get task trends over time for graph visualization
 * @param {Object} user - User object with role information
 * @param {Object} params - Parameters including branchId, startDate, endDate, interval
 * @returns {Promise<Object>}
 */
const getTaskTrends = async (user, { branchId, startDate, endDate, interval = 'month' }) => {
  if (!user.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
  }

  let filter = {};
  
  // Add branch filter if specified
  if (branchId) {
    if (!hasBranchAccess(user.role, branchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
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

  // Add date range filter if dates are provided
  if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Filter tasks that fall within the date range
    filter.$or = [
      { startDate: { $gte: start, $lte: end } },
      { endDate: { $gte: start, $lte: end } },
      { startDate: { $lte: start }, endDate: { $gte: end } },
      { startDate: { $lte: start }, endDate: { $gte: start } },
      { startDate: { $lte: end }, endDate: { $gte: end } }
    ];
  }

  // Get tasks
  const tasks = await Task.find(filter);

  // Process tasks and group by interval
  const trendData = {};
  
  tasks.forEach(task => {
    const intervalKey = getTaskIntervalKey(task.startDate, interval);
    
    if (!trendData[intervalKey]) {
      trendData[intervalKey] = {
        interval: intervalKey,
        totalTasks: 0,
        statusBreakdown: {
          pending: 0,
          ongoing: 0,
          completed: 0,
          on_hold: 0,
          cancelled: 0,
          delayed: 0
        },
        priorityBreakdown: {
          low: 0,
          medium: 0,
          high: 0,
          urgent: 0,
          critical: 0
        }
      };
    }
    
    trendData[intervalKey].totalTasks++;
    trendData[intervalKey].statusBreakdown[task.status]++;
    trendData[intervalKey].priorityBreakdown[task.priority]++;
  });
  
  // Convert to array and sort by interval
  const trends = Object.values(trendData).sort((a, b) => {
    if (interval === 'month') {
      return a.interval.localeCompare(b.interval);
    } else if (interval === 'week') {
      return a.interval.localeCompare(b.interval);
    } else if (interval === 'day') {
      return new Date(a.interval) - new Date(b.interval);
    }
    return 0;
  });

  return {
    interval,
    dateRange: startDate && endDate ? { startDate, endDate } : null,
    totalTasks: tasks.length,
    trends
  };
};

// Helper function to get week number
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Helper function to get task interval key
const getTaskIntervalKey = (date, interval) => {
  if (interval === 'day') {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  } else if (interval === 'week') {
    const weekNumber = getWeekNumber(date);
    return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
  } else if (interval === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  return date.toISOString().split('T')[0];
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
  getTaskTrends
}; 