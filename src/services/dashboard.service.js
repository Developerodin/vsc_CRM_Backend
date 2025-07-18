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
    const monthFilter = {
      ...filter,
      startDate: {
        $exists: true,
        $ne: null,
        $ne: "",
        $gte: monthStart,
        $lte: monthEnd
      }
    };
    
    // Count tasks for this month
    const monthCount = await Timeline.countDocuments(monthFilter);
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
  let filter = {};

  // Add date filters only if both startDate and endDate are provided
  if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
    filter.startDate = { $lte: new Date(endDate) };
    filter.endDate = { $gte: new Date(startDate) };
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

  // Add frequency filter if specified
  if (frequency && frequency.trim() !== '') {
    filter.frequency = frequency;
  }

  // First, get all timelines that match the basic criteria
  const timelines = await Timeline.find(filter).populate('activity', 'name').populate('client', 'name').populate('branch', 'name');

  // Process timelines and generate frequency status if missing
  const processedTimelines = [];
  for (const timeline of timelines) {
    let frequencyStatus = timeline.frequencyStatus || [];
    
    // If frequencyStatus is empty, generate it
    if (frequencyStatus.length === 0 && timeline.frequency && timeline.frequencyConfig && timeline.startDate && timeline.endDate) {
      const { generateFrequencyPeriods } = await import('../utils/frequencyGenerator.js');
      frequencyStatus = generateFrequencyPeriods(
        timeline.frequency,
        timeline.frequencyConfig,
        timeline.startDate,
        timeline.endDate
      );
      
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

  // Add date filters only if both startDate and endDate are provided
  if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
    filter.startDate = { $lte: new Date(endDate) };
    filter.endDate = { $gte: new Date(startDate) };
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
    if (frequencyStatus.length === 0 && timeline.frequencyConfig && timeline.startDate && timeline.endDate) {
      const { generateFrequencyPeriods } = await import('../utils/frequencyGenerator.js');
      frequencyStatus = generateFrequencyPeriods(
        timeline.frequency,
        timeline.frequencyConfig,
        timeline.startDate,
        timeline.endDate
      );
      
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

  // Add date filters only if both startDate and endDate are provided
  if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
    filter.startDate = { $lte: new Date(endDate) };
    filter.endDate = { $gte: new Date(startDate) };
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

  // Get timelines and populate related data
  const populateOptions = ['activity', 'client', 'branch'];
  const timelines = await Timeline.find(filter).populate(populateOptions);

  // Process timelines and generate frequency status if missing
  const analyticsData = {};
  
  for (const timeline of timelines) {
    let frequencyStatus = timeline.frequencyStatus || [];
    
    // Generate frequency status if missing
    if (frequencyStatus.length === 0 && timeline.frequency && timeline.frequencyConfig && timeline.startDate && timeline.endDate) {
      const { generateFrequencyPeriods } = await import('../utils/frequencyGenerator.js');
      frequencyStatus = generateFrequencyPeriods(
        timeline.frequency,
        timeline.frequencyConfig,
        timeline.startDate,
        timeline.endDate
      );
      
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
  let filter = {};

  // Add date filters only if both startDate and endDate are provided
  if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
    filter.startDate = { $lte: new Date(endDate) };
    filter.endDate = { $gte: new Date(startDate) };
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
    if (frequencyStatus.length === 0 && timeline.frequency && timeline.frequencyConfig && timeline.startDate && timeline.endDate) {
      const { generateFrequencyPeriods } = await import('../utils/frequencyGenerator.js');
      frequencyStatus = generateFrequencyPeriods(
        timeline.frequency,
        timeline.frequencyConfig,
        timeline.startDate,
        timeline.endDate
      );
      
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

  // Add date filters only if both startDate and endDate are provided
  if (startDate && endDate && startDate.trim() !== '' && endDate.trim() !== '') {
    filter.startDate = { $lte: new Date(endDate) };
    filter.endDate = { $gte: new Date(startDate) };
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

  // Add frequency filter if specified
  if (frequency && frequency.trim() !== '') {
    filter.frequency = frequency;
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
    if (frequencyStatus.length === 0 && timeline.frequency && timeline.frequencyConfig && timeline.startDate && timeline.endDate) {
      const { generateFrequencyPeriods } = await import('../utils/frequencyGenerator.js');
      frequencyStatus = generateFrequencyPeriods(
        timeline.frequency,
        timeline.frequencyConfig,
        timeline.startDate,
        timeline.endDate
      );
      
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
  getTimelineCompletionRates
}; 