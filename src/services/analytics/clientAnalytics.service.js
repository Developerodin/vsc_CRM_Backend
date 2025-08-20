import mongoose from 'mongoose';
import Client from '../../models/client.model.js';
import Task from '../../models/task.model.js';
import Timeline from '../../models/timeline.model.js';
import Activity from '../../models/activity.model.js';
import TeamMember from '../../models/teamMember.model.js';
import Branch from '../../models/branch.model.js';

/**
 * Get comprehensive client details overview
 * @param {ObjectId} clientId - Client ID
 * @returns {Promise<Object>} Client detailed overview
 */
const getClientDetailsOverview = async (clientId) => {
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
    const tasks = await Task.find({ timeline: { $in: timelineIds } })
      .populate('teamMember', 'name email phone skills branch')
      .populate('assignedBy', 'name email')
      .populate('branch', 'name address city state country pinCode')
      .populate({
        path: 'timeline',
        populate: [
          { path: 'client', select: 'name email phone company' },
          { path: 'activity', select: 'name description category' }
        ]
      })
      .sort({ createdAt: -1 });

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

    // Group tasks by activity
    const tasksByActivity = tasks.reduce((acc, task) => {
      if (task.timeline && task.timeline.activity && task.timeline.activity._id) {
        const activityId = task.timeline.activity._id.toString();
        if (!acc[activityId]) {
          acc[activityId] = {
            activity: task.timeline.activity,
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

    // Recent activities (last 10)
    const recentActivities = tasks
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
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
        activity: task.timeline && task.timeline.activity ? {
          id: task.timeline.activity._id,
          name: task.timeline.activity.name,
          category: task.timeline.activity.category
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
          frequency: activity.frequency,
          frequencyConfig: activity.frequencyConfig
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
        monthlyDistribution
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

export default {
  getClientDetailsOverview
};
