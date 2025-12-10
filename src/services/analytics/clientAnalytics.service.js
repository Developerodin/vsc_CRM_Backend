import mongoose from 'mongoose';
import Client from '../../models/client.model.js';
import Task from '../../models/task.model.js';
import Timeline from '../../models/timeline.model.js';
import Activity from '../../models/activity.model.js';
import TeamMember from '../../models/teamMember.model.js';
import Branch from '../../models/branch.model.js';
import { hasBranchAccess, getUserBranchIds } from '../role.service.js';

/**
 * Get comprehensive client details overview
 * @param {ObjectId} clientId - Client ID
 * @param {Object} filters - Filter options for tasks
 * @param {Object} options - Query options including pagination
 * @returns {Promise<Object>} Client detailed overview
 */
const getClientDetailsOverview = async (clientId, filters = {}, options = {}) => {
  try {
    // Get client basic information
    const client = await Client.findById(clientId)
      .populate('branch', 'name address city state country pinCode')
      .populate('activities.activity', 'name description category');

    if (!client) {
      throw new Error('Client not found');
    }

    // Get all timelines for this client
    const timelines = await Timeline.find({ client: clientId })
      .populate('activity', 'name description category')
      .populate('branch', 'name address city state country pinCode')
      .sort({ startDate: -1 });

    // Get all tasks related to this client's timelines
    const timelineIds = timelines.map(timeline => timeline._id);
    let tasks = await Task.find({ timeline: { $in: timelineIds } })
      .populate('teamMember', 'name email phone skills branch')
      .populate('assignedBy', 'name email')
      .populate('branch', 'name address city state country pinCode')
      .populate({
        path: 'timeline',
        match: { client: clientId }, // Only populate timelines for this client
        populate: [
          { path: 'client', select: 'name email phone company' },
          { path: 'activity', select: 'name description category' }
        ]
      })
      .sort({ createdAt: -1 });

        // Apply filters to tasks
    if (filters) {
      // Filter by activity search
      if (filters.activitySearch) {
        const activitySearchRegex = new RegExp(filters.activitySearch, 'i');
        tasks = tasks.filter(task => 
          task.timeline && 
          task.timeline.length > 0 && 
          task.timeline[0].activity && 
          (activitySearchRegex.test(task.timeline[0].activity.name) ||
           activitySearchRegex.test(task.timeline[0].activity.description) ||
           activitySearchRegex.test(task.timeline[0].activity.category))
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

      // Filter by team member
      if (filters.teamMemberId) {
        tasks = tasks.filter(task => 
          task.teamMember && 
          task.teamMember._id.toString() === filters.teamMemberId.toString()
        );
      }
    }

    // Get unique team members working on this client
    const teamMemberIds = [...new Set(tasks.map(task => task.teamMember && task.teamMember._id).filter(Boolean))];
    const teamMembers = await TeamMember.find({ _id: { $in: teamMemberIds } })
      .populate('branch', 'name address city state country pinCode')
      .populate('skills', 'name description');

    // Get unique activities for this client
    const activityIds = [...new Set(timelines.map(timeline => timeline.activity && timeline.activity._id).filter(Boolean))];
    const activities = await Activity.find({ _id: { $in: activityIds } })
      .select('name description category frequency frequencyConfig');

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

    // Group tasks by activity - only include tasks with timelines for this client
    const tasksByActivity = tasks.reduce((acc, task) => {
      if (task.timeline && task.timeline.length > 0 && task.timeline[0].activity && task.timeline[0].activity._id) {
        const activityId = task.timeline[0].activity._id.toString();
        if (!acc[activityId]) {
          acc[activityId] = {
            activity: task.timeline[0].activity,
            tasks: [],
            totalTasks: 0,
            completedTasks: 0,
            completionRate: 0
          };
        }
        acc[activityId].tasks.push(task);
        acc[activityId].totalTasks += 1;
        if (task.status === 'completed') {
          acc[activityId].completedTasks += 1;
        }
      }
      return acc;
    }, {});

    // Calculate completion rates for activities
    Object.values(tasksByActivity).forEach(activity => {
      activity.completionRate = activity.totalTasks > 0 ? 
        (activity.completedTasks / activity.totalTasks * 100).toFixed(1) : 0;
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

    // Timeline summary
    const timelineSummary = timelines.map(timeline => ({
      id: timeline._id,
      status: timeline.status,
      startDate: timeline.startDate,
      endDate: timeline.endDate,
      frequency: timeline.frequency,
      activity: timeline.activity ? {
        id: timeline.activity._id,
        name: timeline.activity.name,
        description: timeline.activity.description,
        category: timeline.activity.category
      } : null,
      branch: timeline.branch ? {
        id: timeline.branch._id,
        name: timeline.branch.name,
        address: timeline.branch.address,
        city: timeline.branch.city,
        state: timeline.branch.state
      } : null,
      frequencyStatus: timeline.frequencyStatus || [],
      totalPeriods: timeline.frequencyStatus ? timeline.frequencyStatus.length : 0,
      completedPeriods: timeline.frequencyStatus ? 
        timeline.frequencyStatus.filter(fs => fs.status === 'completed').length : 0
    }));

    // Recent activities with pagination - only include tasks with timelines for this client
    const filteredTasks = tasks.filter(task => task.timeline && task.timeline.length > 0);
    const sortedTasks = filteredTasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
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
        activity: task.timeline && task.timeline[0] && task.timeline[0].activity ? {
          id: task.timeline[0].activity._id,
          name: task.timeline[0].activity.name,
          category: task.timeline[0].activity.category
        } : null,
        attachments: task.attachments || []
      }));

    return {
      client: {
        _id: client._id,
        name: client.name,
        email: client.email,
        email2: client.email2,
        phone: client.phone,
        address: client.address,
        district: client.district,
        state: client.state,
        country: client.country,
        fNo: client.fNo,
        pan: client.pan,
        dob: client.dob,
        businessType: client.businessType,
        gstNumber: client.gstNumber,
        tanNumber: client.tanNumber,
        cinNumber: client.cinNumber,
        udyamNumber: client.udyamNumber,
        iecCode: client.iecCode,
        entityType: client.entityType,
        branch: client.branch ? {
          name: client.branch.name,
          address: client.branch.address,
          city: client.branch.city,
          state: client.branch.state,
          country: client.branch.country,
          pinCode: client.branch.pinCode,
          id: client.branch._id
        } : null,
        sortOrder: client.sortOrder,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt
      },
      performance: {
        totalTasks,
        completedTasks,
        completionRate: parseFloat(completionRate),
        currentMonthCompleted: currentMonthCompleted,
        ongoingTasks,
        pendingTasks,
        onHoldTasks,
        delayedTasks,
        totalTimelines: timelines.length,
        totalActivities: activities.length,
        totalTeamMembers: teamMembers.length
      },
      currentMonth: {
        start: currentMonthStart,
        end: currentMonthEnd,
        completedTasks: currentMonthCompleted,
        totalTasks: currentMonthTasks.length
      },
      activities: {
        assigned: client.activities || [],
        summary: activities.map(activity => ({
          id: activity._id,
          name: activity.name,
          description: activity.description,
          category: activity.category,
          subactivities: activity.subactivities ? activity.subactivities.map(sub => ({
            id: sub._id,
            name: sub.name,
            frequency: sub.frequency || 'None',
            frequencyConfig: sub.frequencyConfig
          })) : []
        })),
        byCategory: activities.reduce((acc, activity) => {
          const category = activity.category || 'Uncategorized';
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(activity);
          return acc;
        }, {})
      },
      tasks: {
        byStatus: tasksByStatus,
        byPriority: tasksByPriority,
        byTeamMember: Object.values(tasksByTeamMember),
        byActivity: Object.values(tasksByActivity),
        recent: recentActivities,
        monthlyDistribution,
        pagination: {
          page,
          limit,
          totalTasks: filteredTasks.length,
          totalPages: Math.ceil(filteredTasks.length / limit),
          hasNextPage: page < Math.ceil(filteredTasks.length / limit),
          hasPrevPage: page > 1
        }
      },
      teamMembers: {
        total: teamMembers.length,
        summary: teamMembers.map(member => ({
          id: member._id,
          name: member.name,
          email: member.email,
          phone: member.phone,
          skills: member.skills || [],
          branch: member.branch ? {
            name: member.branch.name,
            address: member.branch.address,
            city: member.branch.city,
            state: member.branch.state
          } : null,
          taskStats: tasksByTeamMember[member._id.toString()] || {
            totalTasks: 0,
            completedTasks: 0,
            completionRate: 0
          }
        })),
        performance: Object.values(tasksByTeamMember).map(member => ({
          memberId: member.teamMember._id,
          memberName: member.teamMember.name,
          totalTasks: member.totalTasks,
          completedTasks: member.completedTasks,
          completionRate: member.completionRate
        }))
      },
      timelines: {
        total: timelines.length,
        summary: timelineSummary,
        byStatus: timelines.reduce((acc, timeline) => {
          const status = timeline.status || 'pending';
          if (!acc[status]) {
            acc[status] = [];
          }
          acc[status].push(timeline);
          return acc;
        }, {}),
        byActivity: timelines.reduce((acc, timeline) => {
          if (timeline.activity && timeline.activity._id) {
            const activityId = timeline.activity._id.toString();
            if (!acc[activityId]) {
              acc[activityId] = [];
            }
            acc[activityId].push(timeline);
          }
          return acc;
        }, {})
      },
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    throw new Error(`Failed to get client overview: ${error.message}`);
  }
};

/**
 * Get all clients table data with comprehensive information
 * @param {Object} filter - Filter options
 * @param {Object} options - Query options including pagination
 * @param {Object} user - User object with role information
 * @returns {Promise<Object>} Clients table data with pagination
 */
const getAllClientsTableData = async (filter = {}, options = {}, user = null) => {
  try {
    // Create a new filter object to avoid modifying the original
    const mongoFilter = { ...filter };
    
    // Handle search parameter (searches across multiple fields)
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
        { gstNumber: searchRegex },
        { tanNumber: searchRegex },
        { cinNumber: searchRegex },
        { udyamNumber: searchRegex },
        { iecCode: searchRegex },
        { 'activities.activity.name': searchRegex },
        { 'activities.activity.description': searchRegex },
        { 'activities.activity.category': searchRegex }
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
          throw new Error('Access denied to this branch');
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
          throw new Error('No branch access granted');
        }
      }
    }

    // Get pagination options
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 50;
    const skip = (page - 1) * limit;

    // Get sorting options
    let sortOptions = {};
    if (options.sortBy) {
      const [field, order] = options.sortBy.split(':');
      sortOptions[field] = order === 'desc' ? -1 : 1;
    } else {
      sortOptions = { name: 1 }; // Default sort by name ascending
    }

    // First, get the clients that match the filter with pagination
    const clients = await Client.find(mongoFilter)
      .populate('branch', 'name address city state country pinCode')
      .populate('activities.activity', 'name description category')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalClients = await Client.countDocuments(mongoFilter);

    // Get all client IDs we're interested in
    const clientIds = clients.map(c => c._id);

    // Get timelines for these clients
    const timelines = await Timeline.find({ client: { $in: clientIds } })
      .select('_id client activity')
      .lean();

    // Get tasks for these clients' timelines (only if there are timelines)
    let tasks = [];
    let teamMembers = [];
    
    if (timelines.length > 0) {
      const timelineIds = timelines.map(timeline => timeline._id);
      // Since timeline field is an array in Task model, we need to use $elemMatch or $in with array field
      tasks = await Task.find({ timeline: { $in: timelineIds } })
        .select('timeline status teamMember')
        .populate('teamMember', 'name email phone')
        .lean();

      // Get team members for these clients
      const teamMemberIds = [...new Set(tasks.map(task => task.teamMember && task.teamMember._id).filter(Boolean))];
      if (teamMemberIds.length > 0) {
        teamMembers = await TeamMember.find({ _id: { $in: teamMemberIds } })
          .select('name email phone')
          .lean();
      }
    }

    // Process each client to add the required information
    const processedClients = clients.map(client => {
      // Get client's timelines
      const clientTimelines = timelines.filter(timeline => 
        timeline.client.toString() === client._id.toString()
      );
      const clientTimelineIds = clientTimelines.map(timeline => timeline._id);

      // Get client's tasks (timeline is an array in Task model)
      const clientTasks = tasks.filter(task => 
        task.timeline && 
        Array.isArray(task.timeline) &&
        task.timeline.some(timelineId => 
          clientTimelineIds.some(clientTimelineId => 
            timelineId.toString() === clientTimelineId.toString()
          )
        )
      );

      // Debug: Check if tasks have team members
      if (clientTasks.length > 0 && client.name === 'A V & ASSOCIATES') {

      }

      // Get unique team members working on this client
      const clientTeamMemberIds = [...new Set(clientTasks.map(task => 
        task.teamMember && task.teamMember._id
      ).filter(Boolean))];
      
      const clientTeamMembers = teamMembers.filter(member => 
        clientTeamMemberIds.some(id => id.toString() === member._id.toString())
      );

      // Calculate task status counts
      const taskStatusCounts = clientTasks.reduce((acc, task) => {
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

      // Get activities for this client
      const clientActivities = client.activities || [];

      return {
        _id: client._id,
        // Personal Details
        name: client.name,
        email: client.email,
        email2: client.email2,
        phone: client.phone,
        address: client.address,
        district: client.district,
        state: client.state,
        country: client.country,
        fNo: client.fNo,
        pan: client.pan,
        dob: client.dob,
        businessType: client.businessType,
        gstNumber: client.gstNumber,
        tanNumber: client.tanNumber,
        cinNumber: client.cinNumber,
        udyamNumber: client.udyamNumber,
        iecCode: client.iecCode,
        entityType: client.entityType,
        sortOrder: client.sortOrder,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        
        // Branch Information
        branch: client.branch ? {
          _id: client.branch._id,
          name: client.branch.name,
          address: client.branch.address,
          city: client.branch.city,
          state: client.branch.state,
          country: client.branch.country,
          pinCode: client.branch.pinCode
        } : null,
        
        // Activity Information
        activities: {
          assigned: clientActivities,
          total: clientActivities.length,
          summary: clientActivities.map(act => ({
            id: act.activity ? act.activity._id : null,
            name: act.activity ? act.activity.name : 'Unknown',
            description: act.activity ? act.activity.description : '',
            category: act.activity ? act.activity.category : 'Uncategorized'
          }))
        },
        
        // Team Member Information
        teamMembers: {
          total: clientTeamMembers.length,
          members: clientTeamMembers.map(member => ({
            _id: member._id,
            name: member.name,
            email: member.email,
            phone: member.phone
          }))
        },
        
        // Task Status Information
        tasks: {
          total: clientTasks.length,
          byStatus: taskStatusCounts,
          status: {
            pending: taskStatusCounts.pending || 0,
            ongoing: taskStatusCounts.ongoing || 0,
            completed: taskStatusCounts.completed || 0,
            on_hold: taskStatusCounts.on_hold || 0,
            delayed: taskStatusCounts.delayed || 0,
            cancelled: taskStatusCounts.cancelled || 0
          }
        },
        
        // Timeline Information
        timelines: {
          total: clientTimelineIds.length,
          summary: clientTimelines.map(timeline => ({
            id: timeline._id,
            client: timeline.client
          })),
          hasTimelines: clientTimelineIds.length > 0
        }
      };
    });

    return {
      results: processedClients,
      page,
      limit,
      totalPages: Math.ceil(totalClients / limit),
      totalResults: totalClients,
      hasNextPage: page < Math.ceil(totalClients / limit),
      hasPrevPage: page > 1
    };
  } catch (error) {
    throw new Error(`Failed to get clients table data: ${error.message}`);
  }
};

export default {
  getClientDetailsOverview,
  getAllClientsTableData
};
