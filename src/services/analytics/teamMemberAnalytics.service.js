import mongoose from 'mongoose';
import TeamMember from '../../models/teamMember.model.js';
import Task from '../../models/task.model.js';
import Branch from '../../models/branch.model.js';
import Timeline from '../../models/timeline.model.js';
import Client from '../../models/client.model.js';

/**
 * Get current month and last month date ranges
 * @returns {Object} Date ranges for current and last month
 */
const getMonthRanges = () => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  
  return {
    currentMonthStart,
    currentMonthEnd,
    lastMonthStart,
    lastMonthEnd
  };
};

/**
 * Get dashboard overview cards data
 * @returns {Promise<Object>} Dashboard cards data
 */
const getDashboardCards = async () => {
  const { currentMonthStart, currentMonthEnd, lastMonthStart, lastMonthEnd } = getMonthRanges();
  
  try {
    // Get total team members count
    const totalTeamMembers = await TeamMember.countDocuments();
    
    // Get team members count for current month
    const currentMonthTeamMembers = await TeamMember.countDocuments({
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
    });
    
    // Get team members count for last month
    const lastMonthTeamMembers = await TeamMember.countDocuments({
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    
    // Calculate team members growth
    const teamMembersGrowth = lastMonthTeamMembers > 0 
      ? ((currentMonthTeamMembers - lastMonthTeamMembers) / lastMonthTeamMembers * 100).toFixed(1)
      : currentMonthTeamMembers > 0 ? 100 : 0;
    
    // Get task completion data for current month
    const currentMonthTasks = await Task.aggregate([
      {
        $match: {
          updatedAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          completed: { $sum: 1 }
        }
      }
    ]);
    
    const currentMonthCompleted = currentMonthTasks[0] && currentMonthTasks[0].completed ? currentMonthTasks[0].completed : 0;
    
    // Get total tasks for current month
    const currentMonthTotalTasks = await Task.countDocuments({
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
    });
    
    // Get task completion data for last month
    const lastMonthTasks = await Task.aggregate([
      {
        $match: {
          updatedAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          completed: { $sum: 1 }
        }
      }
    ]);
    
    const lastMonthCompleted = lastMonthTasks[0] && lastMonthTasks[0].completed ? lastMonthTasks[0].completed : 0;
    
    // Calculate completion rate
    const currentCompletionRate = currentMonthTotalTasks > 0 
      ? (currentMonthCompleted / currentMonthTotalTasks * 100).toFixed(1)
      : 0;
    
    const lastMonthTotalTasks = await Task.countDocuments({
      createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
    });
    
    const lastMonthCompletionRate = lastMonthTotalTasks > 0 
      ? (lastMonthCompleted / lastMonthTotalTasks * 100).toFixed(1)
      : 0;
    
    const completionRateGrowth = lastMonthCompletionRate > 0 
      ? ((parseFloat(currentCompletionRate) - parseFloat(lastMonthCompletionRate)) / parseFloat(lastMonthCompletionRate) * 100).toFixed(1)
      : currentCompletionRate > 0 ? 100 : 0;
    
    // Calculate tasks completed growth
    const tasksCompletedGrowth = lastMonthCompleted > 0 
      ? (currentMonthCompleted - lastMonthCompleted)
      : currentMonthCompleted;
    
    // Calculate workload balance (average tasks per team member)
    const currentMonthWorkload = await Task.aggregate([
      {
        $match: {
          createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd }
        }
      },
      {
        $group: {
          _id: '$teamMember',
          taskCount: { $sum: 1 }
        }
      }
    ]);
    
    const lastMonthWorkload = await Task.aggregate([
      {
        $match: {
          createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd }
        }
      },
      {
        $group: {
          _id: '$teamMember',
          taskCount: { $sum: 1 }
        }
      }
    ]);
    
    // Calculate average workload and balance percentage
    const currentAvgWorkload = currentMonthWorkload.length > 0 
      ? currentMonthWorkload.reduce((sum, item) => sum + item.taskCount, 0) / currentMonthWorkload.length
      : 0;
    
    const lastAvgWorkload = lastMonthWorkload.length > 0 
      ? lastMonthWorkload.reduce((sum, item) => sum + item.taskCount, 0) / lastMonthWorkload.length
      : 0;
    
    // Calculate workload balance (lower variance = better balance)
    const currentWorkloadVariance = currentMonthWorkload.length > 0 
      ? currentMonthWorkload.reduce((sum, item) => sum + Math.pow(item.taskCount - currentAvgWorkload, 2), 0) / currentMonthWorkload.length
      : 0;
    
    const lastWorkloadVariance = lastMonthWorkload.length > 0 
      ? lastMonthWorkload.reduce((sum, item) => sum + Math.pow(item.taskCount - lastAvgWorkload, 2), 0) / lastMonthWorkload.length
      : 0;
    
    // Convert variance to balance percentage (lower variance = higher balance)
    const maxVariance = Math.max(currentWorkloadVariance, lastWorkloadVariance, 1);
    const currentWorkloadBalance = Math.max(0, (1 - currentWorkloadVariance / maxVariance) * 100).toFixed(1);
    const lastWorkloadBalance = Math.max(0, (1 - lastWorkloadVariance / maxVariance) * 100).toFixed(1);
    
    const workloadBalanceGrowth = lastWorkloadBalance > 0 
      ? ((parseFloat(currentWorkloadBalance) - parseFloat(lastWorkloadBalance)) / parseFloat(lastWorkloadBalance) * 100).toFixed(1)
      : currentWorkloadBalance > 0 ? 100 : 0;
    
    return {
      totalTeamMembers: {
        value: totalTeamMembers,
        growth: `+${teamMembersGrowth}%`,
        period: 'this month'
      },
      completionRate: {
        value: `${currentCompletionRate}%`,
        growth: `${completionRateGrowth >= 0 ? '+' : ''}${completionRateGrowth}%`,
        period: 'vs last month'
      },
      tasksCompleted: {
        value: currentMonthCompleted,
        growth: `${tasksCompletedGrowth >= 0 ? '+' : ''}${tasksCompletedGrowth}`,
        period: 'vs last month'
      },
      workloadBalance: {
        value: `${currentWorkloadBalance}%`,
        growth: `${workloadBalanceGrowth >= 0 ? '+' : ''}${workloadBalanceGrowth}%`,
        period: 'vs last month'
      }
    };
  } catch (error) {
    console.error('Error getting dashboard cards:', error);
    throw error;
  }
};

/**
 * Get task completion trends for bar chart
 * @param {number} months - Number of months to get trends for (default: 6)
 * @returns {Promise<Object>} Task completion trends data
 */
const getTaskCompletionTrends = async (months = 6) => {
  try {
    const trends = [];
    const now = new Date();
    
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      
      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      // Get completed tasks for this month
      const completedTasks = await Task.countDocuments({
        updatedAt: { $gte: monthStart, $lte: monthEnd },
        status: 'completed'
      });
      
      // Get total tasks for this month
      const totalTasks = await Task.countDocuments({
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });
      
      // Get completion rate
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;
      
      trends.push({
        month: monthName,
        completed: completedTasks,
        total: totalTasks,
        completionRate: parseFloat(completionRate)
      });
    }
    
    return {
      trends,
      summary: {
        totalCompleted: trends.reduce((sum, item) => sum + item.completed, 0),
        totalTasks: trends.reduce((sum, item) => sum + item.total, 0),
        averageCompletionRate: (trends.reduce((sum, item) => sum + item.completionRate, 0) / trends.length).toFixed(1)
      }
    };
  } catch (error) {
    console.error('Error getting task completion trends:', error);
    throw error;
  }
};

/**
 * Get top team members by task completion
 * @param {number} limit - Number of top members to return (default: 10)
 * @param {Object} filter - Additional filters (branch, date range, etc.)
 * @returns {Promise<Object>} Top team members data
 */
const getTopTeamMembersByCompletion = async (limit = 10, filter = {}) => {
  try {
    const { currentMonthStart, currentMonthEnd } = getMonthRanges();
    
    const matchStage = {
      updatedAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
      status: 'completed',
      ...filter
    };
    
    const topMembers = await Task.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$teamMember',
          completedTasks: { $sum: 1 },
          totalTasks: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'teammembers',
          localField: '_id',
          foreignField: '_id',
          as: 'teamMemberDetails'
        }
      },
      {
        $unwind: '$teamMemberDetails'
      },
      {
        $lookup: {
          from: 'branches',
          localField: 'teamMemberDetails.branch',
          foreignField: '_id',
          as: 'branchDetails'
        }
      },
      {
        $unwind: '$branchDetails'
      },
      {
        $project: {
          _id: 1,
          name: '$teamMemberDetails.name',
          email: '$teamMemberDetails.email',
          phone: '$teamMemberDetails.phone',
          branch: '$branchDetails.name',
          completedTasks: 1,
          totalTasks: 1,
          completionRate: { $multiply: [100, { $divide: ['$completedTasks', '$totalTasks'] }] }
        }
      },
      { $sort: { completedTasks: -1 } },
      { $limit: limit }
    ]);
    
    // Calculate completion rate percentage
    const result = topMembers.map(member => ({
      ...member,
      completionRate: member.completionRate.toFixed(1) + '%'
    }));
    
    return {
      topMembers: result,
      summary: {
        totalCompleted: result.reduce((sum, member) => sum + member.completedTasks, 0),
        averageCompletion: (result.reduce((sum, member) => sum + member.completedTasks, 0) / result.length).toFixed(1)
      }
    };
  } catch (error) {
    console.error('Error getting top team members by completion:', error);
    throw error;
  }
};

/**
 * Get top team members by branch
 * @param {ObjectId} branchId - Branch ID to filter by (optional)
 * @param {number} limit - Number of top members per branch (default: 5)
 * @returns {Promise<Object>} Top team members by branch data
 */
const getTopTeamMembersByBranch = async (branchId = null, limit = 5) => {
  try {
    const { currentMonthStart, currentMonthEnd } = getMonthRanges();
    
    const matchStage = {
      updatedAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
      status: 'completed'
    };
    
    if (branchId) {
      matchStage.branch = branchId;
    }
    
    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'teammembers',
          localField: 'teamMember',
          foreignField: '_id',
          as: 'teamMemberDetails'
        }
      },
      {
        $unwind: '$teamMemberDetails'
      },
      {
        $lookup: {
          from: 'branches',
          localField: 'teamMemberDetails.branch',
          foreignField: '_id',
          as: 'branchDetails'
        }
      },
      {
        $unwind: '$branchDetails'
      },
      {
        $group: {
          _id: {
            teamMember: '$teamMember',
            branch: '$branchDetails._id',
            branchName: '$branchDetails.name'
          },
          completedTasks: { $sum: 1 },
          totalTasks: { $sum: 1 },
          teamMemberDetails: { $first: '$teamMemberDetails' },
          branchDetails: { $first: '$branchDetails' }
        }
      },
      {
        $project: {
          _id: '$teamMember',
          name: '$teamMemberDetails.name',
          email: '$teamMemberDetails.email',
          phone: '$teamMemberDetails.phone',
          branch: '$branchName',
          branchId: '$branch',
          completedTasks: 1,
          totalTasks: 1,
          completionRate: { $multiply: [100, { $divide: ['$completedTasks', '$totalTasks'] }] }
        }
      },
      { $sort: { completedTasks: -1 } }
    ];
    
    if (branchId) {
      // Single branch - get top members
      pipeline.push({ $limit: limit });
      const topMembers = await Task.aggregate(pipeline);
      
      return {
        branchId,
        branchName: topMembers[0] && topMembers[0].branch ? topMembers[0].branch : 'Unknown',
        topMembers: topMembers.map(member => ({
          ...member,
          completionRate: member.completionRate.toFixed(1) + '%'
        })),
        summary: {
          totalCompleted: topMembers.reduce((sum, member) => sum + member.completedTasks, 0),
          averageCompletion: topMembers.length > 0 ? (topMembers.reduce((sum, member) => sum + member.completedTasks, 0) / topMembers.length).toFixed(1) : 0
        }
      };
    } else {
      // All branches - get top members per branch
      const allMembers = await Task.aggregate(pipeline);
      
      // Group by branch and get top members for each
      const branchGroups = {};
      allMembers.forEach(member => {
        if (!branchGroups[member.branchId]) {
          branchGroups[member.branchId] = {
            branchId: member.branchId,
            branchName: member.branch,
            members: []
          };
        }
        branchGroups[member.branchId].members.push(member);
      });
      
      // Get top members for each branch
      const result = Object.values(branchGroups).map(branch => ({
        ...branch,
        topMembers: branch.members
          .slice(0, limit)
          .map(member => ({
            ...member,
            completionRate: member.completionRate.toFixed(1) + '%'
          })),
        summary: {
          totalCompleted: branch.members.reduce((sum, member) => sum + member.completedTasks, 0),
          averageCompletion: branch.members.length > 0 ? (branch.members.reduce((sum, member) => sum + member.completedTasks, 0) / branch.members.length).toFixed(1) : 0
        }
      }));
      
      return {
        branches: result,
        summary: {
          totalBranches: result.length,
          totalCompleted: result.reduce((sum, branch) => sum + branch.summary.totalCompleted, 0),
          averageCompletion: result.length > 0 ? (result.reduce((sum, branch) => sum + branch.summary.averageCompletion, 0) / result.length).toFixed(1) : 0
        }
      };
    }
  } catch (error) {
    console.error('Error getting top team members by branch:', error);
    throw error;
  }
};

/**
 * Get comprehensive team member details overview
 * @param {ObjectId} teamMemberId - Team member ID
 * @returns {Promise<Object>} Team member detailed overview
 */
const getTeamMemberDetailsOverview = async (teamMemberId) => {
  try {
    // Get team member basic information
    const teamMember = await TeamMember.findById(teamMemberId)
      .populate('skills', 'name description')
      .populate('branch', 'name location address city state country pinCode');
    
    if (!teamMember) {
      throw new Error('Team member not found');
    }

    const { currentMonthStart, currentMonthEnd } = getMonthRanges();
    
    // Get all tasks for this team member
    const allTasks = await Task.find({ teamMember: teamMemberId })
      .populate({
        path: 'timeline',
        populate: [
          { path: 'client', select: 'name email phone company address city state country pinCode' },
          { path: 'activity', select: 'name description' }
        ]
      })
      .populate('assignedBy', 'name email')
      .populate('branch', 'name location')
      .sort({ createdAt: -1 });

    // Get completed tasks for current month
    const currentMonthCompletedTasks = allTasks.filter(task => 
      task.status === 'completed' && 
      task.updatedAt >= currentMonthStart && 
      task.updatedAt <= currentMonthEnd
    );

    // Get pending/ongoing tasks
    const activeTasks = allTasks.filter(task => 
      ['pending', 'ongoing', 'on_hold'].includes(task.status)
    );

    // Get overdue tasks
    const overdueTasks = allTasks.filter(task => 
      task.endDate && 
      task.endDate < new Date() && 
      !['completed', 'cancelled'].includes(task.status)
    );

    // Get timeline information (clients handled)
    const timelineIds = [...new Set(allTasks.map(task => task.timeline && task.timeline._id).filter(Boolean))];
    
    const timelines = await Timeline.find({ _id: { $in: timelineIds } })
      .populate('client', 'name email phone company address city state country pinCode')
      .populate('activity', 'name description')
      .populate('branch', 'name location')
      .sort({ startDate: -1 });

    // Also get client details directly from tasks for better population
    const clientIds = [...new Set(allTasks.map(task => {
      if (task.timeline && task.timeline.client) {
        return task.timeline.client._id || task.timeline.client;
      }
      return null;
    }).filter(Boolean))];

    const clients = await Client.find({ _id: { $in: clientIds } })
      .select('name email phone company address city state country pinCode');

    // Group tasks by status
    const tasksByStatus = allTasks.reduce((acc, task) => {
      const status = task.status || 'unknown';
      if (!acc[status]) acc[status] = [];
      acc[status].push(task);
      return acc;
    }, {});

    // Calculate performance metrics
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.status === 'completed').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks * 100).toFixed(1) : 0;

    // Calculate average task completion time (for completed tasks)
    const completedTasksWithTime = allTasks.filter(task => 
      task.status === 'completed' && task.createdAt && task.updatedAt
    );
    
    const averageCompletionTime = completedTasksWithTime.length > 0 
      ? completedTasksWithTime.reduce((sum, task) => {
          const completionTime = task.updatedAt - task.createdAt;
          return sum + completionTime;
        }, 0) / completedTasksWithTime.length
      : 0;

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTasks = allTasks.filter(task => 
      task.updatedAt >= thirtyDaysAgo
    );

    // Get task distribution by priority
    const tasksByPriority = allTasks.reduce((acc, task) => {
      const priority = task.priority || 'medium';
      if (!acc[priority]) acc[priority] = 0;
      acc[priority]++;
      return acc;
    }, {});

    // Get task distribution by month (last 6 months)
    const monthlyTaskDistribution = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i, 1);
      monthStart.setHours(0, 0, 0, 0);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      
      const monthName = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      const monthTasks = allTasks.filter(task => 
        task.createdAt >= monthStart && task.createdAt <= monthEnd
      );
      
      const monthCompleted = monthTasks.filter(task => task.status === 'completed').length;
      
      monthlyTaskDistribution.push({
        month: monthName,
        total: monthTasks.length,
        completed: monthCompleted,
        completionRate: monthTasks.length > 0 ? (monthCompleted / monthTasks.length * 100).toFixed(1) : 0
      });
    }

    // Get client summary from tasks and timelines
    const clientSummary = {};
    
    // Process each task to extract client information
    allTasks.forEach(task => {
      if (task.timeline && task.timeline.client) {
        const clientId = task.timeline.client._id ? task.timeline.client._id.toString() : task.timeline.client.toString();
        
        if (!clientSummary[clientId]) {
          // Find client details from populated data or from clients array
          let clientDetails = null;
          if (task.timeline.client._id) {
            // Client is populated
            clientDetails = task.timeline.client;
          } else {
            // Client is just an ID, find it in clients array
            clientDetails = clients.find(c => c._id.toString() === clientId);
          }
          
          clientSummary[clientId] = {
            client: clientDetails || { _id: clientId },
            timelines: [],
            totalTasks: 0,
            completedTasks: 0,
            activities: new Set()
          };
        }
        
        // Add timeline if not already present
        const timelineExists = clientSummary[clientId].timelines.some(t => t._id.toString() === task.timeline._id.toString());
        if (!timelineExists) {
          clientSummary[clientId].timelines.push(task.timeline);
        }
        
        // Count tasks
        clientSummary[clientId].totalTasks += 1;
        if (task.status === 'completed') {
          clientSummary[clientId].completedTasks += 1;
        }
        
        // Add activity if available
        if (task.timeline.activity) {
          clientSummary[clientId].activities.add(task.timeline.activity);
        }
      }
    });

    // Convert client summary to array and add completion rates
    const clientSummaryArray = Object.values(clientSummary).map(client => ({
      ...client,
      completionRate: client.totalTasks > 0 ? (client.completedTasks / client.totalTasks * 100).toFixed(1) : 0,
      activities: Array.from(client.activities), // Convert Set to Array
      totalActivities: client.activities.size
    }));

    return {
      teamMember: {
        _id: teamMember._id,
        name: teamMember.name,
        email: teamMember.email,
        phone: teamMember.phone,
        address: teamMember.address,
        city: teamMember.city,
        state: teamMember.state,
        country: teamMember.country,
        pinCode: teamMember.pinCode,
        skills: teamMember.skills,
        branch: teamMember.branch,
        sortOrder: teamMember.sortOrder,
        createdAt: teamMember.createdAt,
        updatedAt: teamMember.updatedAt
      },
      performance: {
        totalTasks,
        completedTasks,
        completionRate: parseFloat(completionRate),
        currentMonthCompleted: currentMonthCompletedTasks.length,
        activeTasks: activeTasks.length,
        overdueTasks: overdueTasks.length,
        averageCompletionTime: Math.round(averageCompletionTime / (1000 * 60 * 60 * 24)) // Convert to days
      },
      currentMonth: {
        start: currentMonthStart,
        end: currentMonthEnd,
        completedTasks: currentMonthCompletedTasks.length,
        totalTasks: allTasks.filter(task => 
          task.createdAt >= currentMonthStart && task.createdAt <= currentMonthEnd
        ).length
      },
      tasks: {
        byStatus: tasksByStatus,
        byPriority: tasksByPriority,
        recent: recentTasks.slice(0, 10), // Last 10 recent tasks
        monthlyDistribution: monthlyTaskDistribution
      },
      clients: {
        total: clientSummaryArray.length,
        summary: clientSummaryArray,
        timelines: timelines,
        timelineDetails: allTasks.map(task => ({
          taskId: task._id,
          taskStatus: task.status,
          taskPriority: task.priority,
          taskRemarks: task.remarks,
          taskStartDate: task.startDate,
          taskEndDate: task.endDate,
          timeline: task.timeline ? {
            id: task.timeline._id,
            status: task.timeline.status,
            startDate: task.timeline.startDate,
            endDate: task.timeline.endDate,
            client: task.timeline.client ? {
              id: task.timeline.client._id,
              name: task.timeline.client.name,
              email: task.timeline.client.email,
              phone: task.timeline.client.phone,
              company: task.timeline.client.company
            } : null,
            activity: task.timeline.activity ? {
              id: task.timeline.activity._id,
              name: task.timeline.activity.name,
              description: task.timeline.activity.description
            } : null
          } : null
        }))
      },
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting team member details overview:', error);
    throw error;
  }
};

/**
 * Get comprehensive analytics summary
 * @returns {Promise<Object>} Complete analytics summary
 */
const getAnalyticsSummary = async () => {
  try {
    const [dashboardCards, trends, topMembers, topMembersByBranch] = await Promise.all([
      getDashboardCards(),
      getTaskCompletionTrends(),
      getTopTeamMembersByCompletion(),
      getTopTeamMembersByBranch()
    ]);
    
    return {
      dashboardCards,
      trends,
      topMembers,
      topMembersByBranch,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting analytics summary:', error);
    throw error;
  }
};

export default {
  getDashboardCards,
  getTaskCompletionTrends,
  getTopTeamMembersByCompletion,
  getTopTeamMembersByBranch,
  getTeamMemberDetailsOverview,
  getAnalyticsSummary
};
