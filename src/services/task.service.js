import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { Task, TeamMember } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { sendEmail, generateTaskAssignmentHTML } from './email.service.js';

/**
 * Send task assignment email to team member
 * @param {Object} task - Created task object
 * @param {Object} teamMember - Team member details
 * @param {Object} assignedBy - User who assigned the task
 * @returns {Promise<void>}
 */
const sendTaskAssignmentEmail = async (task, teamMember, assignedBy = null) => {
  try {
    if (!teamMember || !teamMember.email) {
      console.warn('No team member email found, skipping email notification');
      return;
    }

    const taskData = {
      taskTitle: `Task: ${task.remarks || 'New Task Assigned'}`,
      taskDescription: task.remarks || 'A new task has been assigned to you',
      assignedBy: assignedBy ? assignedBy.name : 'System',
      dueDate: task.endDate ? task.endDate.toLocaleDateString() : null,
      priority: task.priority || 'medium',
      taskId: task._id ? task._id.toString() : null
    };

    // Generate HTML email
    const html = generateTaskAssignmentHTML(taskData);

    // Send email
    await sendEmail(
      teamMember.email,
      `🎯 New Task Assigned: ${taskData.taskTitle}`,
      `You have been assigned a new task.\n\nTask: ${taskData.taskTitle}\nDescription: ${taskData.taskDescription}\nPriority: ${taskData.priority.toUpperCase()}\nDue Date: ${taskData.dueDate || 'Not specified'}\nAssigned By: ${taskData.assignedBy}`,
      html
    );

    console.log(`✅ Task assignment email sent to ${teamMember.email}`);
  } catch (error) {
    console.error('❌ Error sending task assignment email:', error);
    // Don't throw error - email failure shouldn't prevent task creation
  }
};

/**
 * Create a task
 * @param {Object} taskBody
 * @returns {Promise<Task>}
 */
const createTask = async (taskBody) => {
  try {
    // Create the task
    const task = await Task.create(taskBody);
    
    // Populate team member and assigned by details for email
    const populatedTask = await Task.findById(task._id)
      .populate('teamMember', 'name email phone')
      .populate('assignedBy', 'name email')
      .populate('branch', 'name location');

    // Send email notification to team member
    if (populatedTask.teamMember) {
      await sendTaskAssignmentEmail(populatedTask, populatedTask.teamMember, populatedTask.assignedBy);
    }

    return populatedTask;
  } catch (error) {
    console.error('❌ Error creating task:', error);
    throw error;
  }
};

/**
 * Get task by id
 * @param {ObjectId} id
 * @returns {Promise<Task>}
 */
const getTaskById = async (id) => {
  const task = await Task.findById(id)
    .populate('teamMember', 'name email phone')
    .populate('assignedBy', 'name email')
    .populate('timeline', 'activity client status')
    .populate('branch', 'name location');
  
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }
  return task;
};

/**
 * Get task by id with minimal population
 * @param {ObjectId} id
 * @returns {Promise<Task>}
 */
const getTaskByIdMinimal = async (id) => {
  const task = await Task.findById(id);
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }
  return task;
};

/**
 * Get all tasks with filtering and pagination
 * @param {Object} filter - Mongoose filter object
 * @param {Object} options - Query options
 * @param {string} [options.sortBy] - Sort option in the format: sortField:(desc|asc)
 * @param {number} [options.limit] - Maximum number of results per page (default = 10)
 * @param {number} [options.page] - Current page (default = 1)
 * @returns {Promise<QueryResult>}
 */
const queryTasks = async (filter, options) => {
  // Create a new filter object to avoid modifying the original
  const mongoFilter = { ...filter };
  
  // Handle global search across multiple fields
  if (mongoFilter.search && mongoFilter.search.trim() !== '') {
    const searchValue = mongoFilter.search.trim();
    const searchRegex = { $regex: searchValue, $options: 'i' };
    
    // Create an $or condition to search across multiple fields
    // Note: We'll need to handle this after population since some fields are references
    mongoFilter.searchValue = searchValue; // Store for later processing
    delete mongoFilter.search;
  }
  
  // Handle team member name search
  if (mongoFilter.teamMember && !mongoose.Types.ObjectId.isValid(mongoFilter.teamMember)) {
    try {
      // Search for team member by name (case-insensitive)
      const teamMember = await TeamMember.findOne({
        name: { $regex: mongoFilter.teamMember, $options: 'i' }
      });
      
      if (teamMember) {
        // Replace the name with the actual ObjectId
        mongoFilter.teamMember = teamMember._id;
        console.log(`🔍 Found team member: ${teamMember.name} (ID: ${teamMember._id})`);
      } else {
        // If no team member found, return empty results
        console.log(`🔍 No team member found with name: ${mongoFilter.teamMember}`);
        return {
          results: [],
          page: options.page || 1,
          limit: options.limit || 10,
          totalPages: 0,
          totalResults: 0
        };
      }
    } catch (error) {
      console.error('🔍 Error searching for team member:', error);
      // If there's an error, return empty results
      return {
        results: [],
        page: options.page || 1,
        limit: options.limit || 10,
        totalPages: 0,
        totalResults: 0
      };
    }
  }
  
  // Handle date range filtering
  if (mongoFilter.startDateRange && mongoFilter.endDateRange) {
    mongoFilter.$or = [
      { startDate: { $gte: mongoFilter.startDateRange, $lte: mongoFilter.endDateRange } },
      { endDate: { $gte: mongoFilter.startDateRange, $lte: mongoFilter.endDateRange } },
      { 
        startDate: { $lte: mongoFilter.startDateRange },
        endDate: { $gte: mongoFilter.endDateRange }
      }
    ];
    delete mongoFilter.startDateRange;
    delete mongoFilter.endDateRange;
  }
  
  // Handle today filtering
  if (mongoFilter.startDate && mongoFilter.endDate) {
    // If both dates are set, they're already handled
  }
  
  console.log('🔍 Final task filter:', JSON.stringify(mongoFilter));
  
  const tasks = await Task.paginate(mongoFilter, {
    ...options,
    populate: [
      { path: 'teamMember', select: 'name email phone' },
      { path: 'assignedBy', select: 'name email' },
      { path: 'timeline', select: 'activity client status' },
      { path: 'branch', select: 'name location' }
    ],
  });
  
  // Handle search filtering after population
  if (mongoFilter.searchValue) {
    const searchValue = mongoFilter.searchValue.toLowerCase();
    tasks.results = tasks.results.filter(task => {
      // Search in team member name
      if (task.teamMember && task.teamMember.name && 
          task.teamMember.name.toLowerCase().includes(searchValue)) {
        return true;
      }
      
      // Search in assigned by name
      if (task.assignedBy && task.assignedBy.name && 
          task.assignedBy.name.toLowerCase().includes(searchValue)) {
        return true;
      }
      
      // Search in timeline activity
      if (task.timeline && task.timeline.activity && 
          task.timeline.activity.toLowerCase().includes(searchValue)) {
        return true;
      }
      
      // Search in timeline client
      if (task.timeline && task.timeline.client && 
          task.timeline.client.toLowerCase().includes(searchValue)) {
        return true;
      }
      
      // Search in branch name
      if (task.branch && task.branch.name && 
          task.branch.name.toLowerCase().includes(searchValue)) {
        return true;
      }
      
      // Search in status
      if (task.status && task.status.toLowerCase().includes(searchValue)) {
        return true;
      }
      
      // Search in priority
      if (task.priority && task.priority.toLowerCase().includes(searchValue)) {
        return true;
      }
      
      // Search in remarks
      if (task.remarks && task.remarks.toLowerCase().includes(searchValue)) {
        return true;
      }
      
      return false;
    });
    
    // Update total results count
    tasks.totalResults = tasks.results.length;
    tasks.totalPages = Math.ceil(tasks.totalResults / (options.limit || 10));
  }
  
  console.log(`🔍 Task search results: Found ${tasks.results.length} tasks`);
  
  return tasks;
};

/**
 * Update task by id
 * @param {ObjectId} taskId
 * @param {Object} updateBody
 * @returns {Promise<Task>}
 */
const updateTaskById = async (taskId, updateBody) => {
  const task = await getTaskByIdMinimal(taskId);
  
  // Check if teamMember is being updated and validate
  if (updateBody.teamMember && updateBody.teamMember !== task.teamMember.toString()) {
    // You can add additional validation here if needed
  }
  
  Object.assign(task, updateBody);
  await task.save();
  return getTaskById(taskId);
};

/**
 * Delete task by id
 * @param {ObjectId} taskId
 * @returns {Promise<Task>}
 */
const deleteTaskById = async (taskId) => {
  const task = await getTaskByIdMinimal(taskId);
  await Task.deleteOne({ _id: taskId });
  return task;
};

/**
 * Get tasks by team member
 * @param {ObjectId} teamMemberId
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getTasksByTeamMember = async (teamMemberId, options = {}) => {
  const filter = { teamMember: teamMemberId };
  return queryTasks(filter, options);
};

/**
 * Get tasks by timeline
 * @param {ObjectId|Array<ObjectId>} timelineId
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getTasksByTimeline = async (timelineId, options = {}) => {
  const filter = { timeline: timelineId };
  return queryTasks(filter, options);
};

/**
 * Get tasks by assigned by user
 * @param {ObjectId} userId
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getTasksByAssignedBy = async (userId, options = {}) => {
  const filter = { assignedBy: userId };
  return queryTasks(filter, options);
};

/**
 * Get tasks by branch
 * @param {ObjectId} branchId
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getTasksByBranch = async (branchId, options = {}) => {
  const filter = { branch: branchId };
  return queryTasks(filter, options);
};

/**
 * Get tasks by status
 * @param {string} status
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getTasksByStatus = async (status, options = {}) => {
  const filter = { status };
  return queryTasks(filter, options);
};

/**
 * Get tasks by priority
 * @param {string} priority
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getTasksByPriority = async (priority, options = {}) => {
  const filter = { priority };
  return queryTasks(filter, options);
};

/**
 * Get tasks by date range
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getTasksByDateRange = async (startDate, endDate, options = {}) => {
  const filter = {
    $or: [
      { startDate: { $gte: startDate, $lte: endDate } },
      { endDate: { $gte: startDate, $lte: endDate } },
      { 
        startDate: { $lte: startDate },
        endDate: { $gte: endDate }
      }
    ]
  };
  return queryTasks(filter, options);
};

/**
 * Get overdue tasks
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getOverdueTasks = async (options = {}) => {
  const now = new Date();
  const filter = {
    endDate: { $lt: now },
    status: { $nin: ['completed', 'cancelled'] }
  };
  return queryTasks(filter, options);
};

/**
 * Get high priority tasks
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getHighPriorityTasks = async (options = {}) => {
  const filter = {
    priority: { $in: ['high', 'urgent', 'critical'] },
    status: { $nin: ['completed', 'cancelled'] }
  };
  return queryTasks(filter, options);
};

/**
 * Get tasks due today
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getTasksDueToday = async (options = {}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const filter = {
    endDate: { $gte: today, $lt: tomorrow },
    status: { $nin: ['completed', 'cancelled'] }
  };
  return queryTasks(filter, options);
};

/**
 * Get tasks due this week
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getTasksDueThisWeek = async (options = {}) => {
  const today = new Date();
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 7);
  
  const filter = {
    endDate: { $gte: today, $lte: endOfWeek },
    status: { $nin: ['completed', 'cancelled'] }
  };
  return queryTasks(filter, options);
};

/**
 * Get tasks due this month
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getTasksDueThisMonth = async (options = {}) => {
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const filter = {
    endDate: { $gte: today, $lte: endOfMonth },
    status: { $nin: ['completed', 'cancelled'] }
  };
  return queryTasks(filter, options);
};

/**
 * Search tasks by text (searches in remarks and metadata)
 * @param {string} searchText
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const searchTasks = async (searchText, options = {}) => {
  const filter = {
    $or: [
      { remarks: { $regex: searchText, $options: 'i' } },
      { 'metadata': { $regex: searchText, $options: 'i' } }
    ]
  };
  return queryTasks(filter, options);
};

/**
 * Get task statistics
 * @param {ObjectId} [branchId] - Optional branch filter
 * @returns {Promise<Object>}
 */
const getTaskStatistics = async (branchId = null) => {
  const matchStage = branchId ? { branch: branchId } : {};
  
  const stats = await Task.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        ongoing: { $sum: { $cond: [{ $eq: ['$status', 'ongoing'] }, 1, 0] } },
        completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        onHold: { $sum: { $cond: [{ $eq: ['$status', 'on_hold'] }, 1, 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        delayed: { $sum: { $cond: [{ $eq: ['$status', 'delayed'] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ['$priority', 'low'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$priority', 'medium'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] } },
        urgent: { $sum: { $cond: [{ $eq: ['$priority', 'urgent'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$priority', 'critical'] }, 1, 0] } }
      }
    }
  ]);
  
  return stats[0] || {
    total: 0, pending: 0, ongoing: 0, completed: 0, onHold: 0, cancelled: 0, delayed: 0,
    low: 0, medium: 0, high: 0, urgent: 0, critical: 0
  };
};

/**
 * Bulk update task status
 * @param {Array<ObjectId>} taskIds
 * @param {string} status
 * @returns {Promise<Object>}
 */
const bulkUpdateTaskStatus = async (taskIds, status) => {
  const result = await Task.updateMany(
    { _id: { $in: taskIds } },
    { $set: { status } }
  );
  return result;
};

/**
 * Bulk create tasks with email notifications
 * @param {Array<Object>} tasks - Array of task objects
 * @returns {Promise<Object>} - Result with created count and errors
 */
const bulkCreateTasks = async (tasks) => {
  const results = {
    created: 0,
    errors: [],
    totalProcessed: 0
  };

  try {
    console.log(`📧 Starting bulk creation of ${tasks.length} tasks with email notifications...`);
    
    for (let i = 0; i < tasks.length; i++) {
      try {
        const task = tasks[i];
        
        // Create the task
        const createdTask = await Task.create(task);
        
        // Populate details for email
        const populatedTask = await Task.findById(createdTask._id)
          .populate('teamMember', 'name email phone')
          .populate('assignedBy', 'name email')
          .populate('branch', 'name location');

        // Send email notification
        if (populatedTask.teamMember) {
          await sendTaskAssignmentEmail(
            populatedTask, 
            populatedTask.teamMember, 
            populatedTask.assignedBy
          );
        }

        results.created++;
        results.totalProcessed++;
        
      } catch (error) {
        console.error(`❌ Error creating task ${i + 1}:`, error);
        results.errors.push({
          index: i,
          error: error.message,
          data: tasks[i]
        });
        results.totalProcessed++;
      }
    }
    
    console.log(`✅ Bulk task creation completed: ${results.created} created, ${results.errors.length} errors`);
    
  } catch (error) {
    console.error('❌ Error in bulk task creation:', error);
    throw error;
  }

  return results;
};

/**
 * Bulk delete tasks
 * @param {Array<ObjectId>} taskIds
 * @returns {Promise<Object>}
 */
const bulkDeleteTasks = async (taskIds) => {
  const result = await Task.deleteMany({ _id: { $in: taskIds } });
  return result;
};

export default {
  createTask,
  getTaskById,
  getTaskByIdMinimal,
  queryTasks,
  updateTaskById,
  deleteTaskById,
  getTasksByTeamMember,
  getTasksByTimeline,
  getTasksByAssignedBy,
  getTasksByBranch,
  getTasksByStatus,
  getTasksByPriority,
  getTasksByDateRange,
  getOverdueTasks,
  getHighPriorityTasks,
  getTasksDueToday,
  getTasksDueThisWeek,
  getTasksDueThisMonth,
  searchTasks,
  getTaskStatistics,
  bulkCreateTasks,
  bulkUpdateTaskStatus,
  bulkDeleteTasks,
};
