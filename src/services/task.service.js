import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { Task, TeamMember, Timeline } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { sendEmail, generateTaskAssignmentHTML } from './email.service.js';

// Simple email queue for background processing
const emailQueue = [];
let isProcessingEmails = false;

/**
 * Process email queue in background
 */
const processEmailQueue = async () => {
  if (isProcessingEmails || emailQueue.length === 0) {
    return;
  }

  isProcessingEmails = true;
  
  while (emailQueue.length > 0) {
    const emailJob = emailQueue.shift();
    try {
      await sendTaskAssignmentEmail(emailJob.task, emailJob.teamMember, emailJob.assignedBy);
    } catch (error) {
      // Log error but continue processing
    }
  }
  
  isProcessingEmails = false;
};

/**
 * Add email to queue for background processing
 */
const queueTaskAssignmentEmail = (task, teamMember, assignedBy) => {
  emailQueue.push({ task, teamMember, assignedBy });
  
  // Process queue asynchronously
  setImmediate(() => processEmailQueue());
};

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

  } catch (error) {
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
    
    // Populate the created task efficiently
    const populatedTask = await Task.findById(task._id)
      .populate('teamMember', 'name email phone')
      .populate('assignedBy', 'name email')
      .populate('branch', 'name location');

    // Queue email notification for background processing
    if (populatedTask.teamMember && populatedTask.teamMember.email) {
      queueTaskAssignmentEmail(populatedTask, populatedTask.teamMember, populatedTask.assignedBy);
    }

    return populatedTask;
  } catch (error) {
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
 * @param {number} [options.limit] - Maximum number of results per page (if not provided, returns all results)
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
  
  // Handle team member name search (only if teamMember is a string, not an object with $in)
  if (mongoFilter.teamMember && 
      typeof mongoFilter.teamMember === 'string' && 
      !mongoose.Types.ObjectId.isValid(mongoFilter.teamMember)) {
    try {
      // Search for team member by name (case-insensitive)
      const teamMember = await TeamMember.findOne({
        name: { $regex: mongoFilter.teamMember, $options: 'i' }
      });
      
      if (teamMember) {
        // Replace the name with the actual ObjectId
        mongoFilter.teamMember = teamMember._id;

      } else {
        // If no team member found, return empty results

        return {
          results: [],
          page: options.page || 1,
          limit: options.limit || 0,
          totalPages: 0,
          totalResults: 0
        };
      }
    } catch (error) {

      // If there's an error, return empty results
      return {
        results: [],
        page: options.page || 1,
        limit: options.limit || 0,
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

  const tasks = await Task.paginate(mongoFilter, {
    ...options,
    populate: [
      { path: 'teamMember', select: 'name email phone' },
      { path: 'assignedBy', select: 'name email' },
      { path: 'timeline' },
      { path: 'branch', select: 'name location' }
    ],
  });
  
  // Manually populate timeline array with activity and client (batch operation for performance)
  if (tasks.results && tasks.results.length > 0) {
    // Collect all unique timeline IDs from all tasks
    const allTimelineIds = [];
    const timelineMap = new Map(); // Map timeline ID to timeline object
    
    tasks.results.forEach(task => {
      if (task.timeline && Array.isArray(task.timeline) && task.timeline.length > 0) {
        task.timeline.forEach(timeline => {
          const timelineId = timeline._id || timeline;
          if (timelineId && !timelineMap.has(timelineId.toString())) {
            allTimelineIds.push(timelineId);
            timelineMap.set(timelineId.toString(), timeline);
          }
        });
      }
    });
    
    // Batch populate all timelines in a single query
    if (allTimelineIds.length > 0) {
      const populatedTimelines = await Timeline.find({ _id: { $in: allTimelineIds } })
        .populate('activity', 'name description category')
        .populate('client', 'name email phone company address city state country pinCode businessType entityType')
        .lean();
      
      // Create a map of populated timelines for quick lookup
      const populatedMap = new Map();
      populatedTimelines.forEach(timeline => {
        populatedMap.set(timeline._id.toString(), timeline);
      });
      
      // Merge populated activity and client into existing timeline objects
      tasks.results.forEach(task => {
        if (task.timeline && Array.isArray(task.timeline)) {
          task.timeline = task.timeline.map(timeline => {
            const timelineId = (timeline._id || timeline).toString();
            const populatedTimeline = populatedMap.get(timelineId);
            if (populatedTimeline) {
              // Merge populated fields into existing timeline object
              return {
                ...timeline,
                activity: populatedTimeline.activity,
                client: populatedTimeline.client
              };
            }
            return timeline;
          });
        }
      });
    }
  }
  
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
      
      // Search in timeline activity (handle array of timelines)
      if (task.timeline && Array.isArray(task.timeline)) {
        for (const timeline of task.timeline) {
          if (timeline && timeline.activity) {
            const activityName = typeof timeline.activity === 'object' 
              ? timeline.activity.name 
              : String(timeline.activity);
            if (activityName && activityName.toLowerCase().includes(searchValue)) {
              return true;
            }
          }
          if (timeline && timeline.client) {
            const clientName = typeof timeline.client === 'object' 
              ? timeline.client.name 
              : String(timeline.client);
            if (clientName && clientName.toLowerCase().includes(searchValue)) {
              return true;
            }
          }
        }
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
    const hasLimit = options.limit && parseInt(options.limit, 10) > 0;
    tasks.totalPages = hasLimit ? Math.ceil(tasks.totalResults / parseInt(options.limit, 10)) : 1;
  }

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
    // Use insertMany for better performance
    const createdTasks = await Task.insertMany(tasks, { ordered: false });
    
    // Populate all created tasks in one query
    const populatedTasks = await Task.find({ 
      _id: { $in: createdTasks.map(task => task._id) } 
    })
    .populate('teamMember', 'name email phone')
    .populate('assignedBy', 'name email')
    .populate('branch', 'name location');

    // Queue emails for background processing
    populatedTasks.forEach(task => {
      if (task.teamMember && task.teamMember.email) {
        queueTaskAssignmentEmail(task, task.teamMember, task.assignedBy);
      }
    });

    results.created = createdTasks.length;
    results.totalProcessed = tasks.length;

  } catch (error) {
    // Handle bulk insert errors
    if (error.writeErrors) {
      results.created = error.insertedCount || 0;
      error.writeErrors.forEach((writeError, index) => {
        results.errors.push({
          index: writeError.index,
          error: writeError.errmsg,
          data: tasks[writeError.index]
        });
      });
      results.totalProcessed = tasks.length;
    } else {
      throw error;
    }
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

/**
 * Get tasks of accessible team members for a team member
 * @param {ObjectId|string} teamMemberId - The team member requesting access
 * @param {Object} options - Query options
 * @returns {Promise<QueryResult>}
 */
const getTasksOfAccessibleTeamMembers = async (teamMemberId, options = {}) => {
  // Validate and convert teamMemberId to ObjectId
  if (!mongoose.Types.ObjectId.isValid(teamMemberId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid team member ID format');
  }
  
  const teamMemberObjectId = typeof teamMemberId === 'string' 
    ? new mongoose.Types.ObjectId(teamMemberId) 
    : teamMemberId;
  
  // Get the team member (without populating accessibleTeamMembers to get raw ObjectIds)
  const teamMember = await TeamMember.findById(teamMemberObjectId).lean();
  if (!teamMember) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found');
  }
  
  // Build list of accessible team member IDs
  // Include the team member themselves in the list
  const accessibleTeamMemberIds = [teamMemberObjectId];
  
  // Add accessible team members (they are already ObjectIds in the database)
  if (teamMember.accessibleTeamMembers && teamMember.accessibleTeamMembers.length > 0) {
    teamMember.accessibleTeamMembers.forEach(id => {
      // Convert to ObjectId if needed (should already be ObjectId, but handle string case)
      const objectId = mongoose.Types.ObjectId.isValid(id) 
        ? (typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id)
        : null;
      if (objectId && !accessibleTeamMemberIds.some(existing => existing.toString() === objectId.toString())) {
        accessibleTeamMemberIds.push(objectId);
      }
    });
  }
  
  // Filter tasks by accessible team members
  const filter = { teamMember: { $in: accessibleTeamMemberIds } };
  
  // Merge with any additional filters from options
  if (options.status) {
    filter.status = options.status;
  }
  if (options.priority) {
    filter.priority = options.priority;
  }
  
  return queryTasks(filter, options);
};

/**
 * Create task for an accessible team member (with validation)
 * @param {ObjectId} assignedByTeamMemberId - Team member assigning the task
 * @param {Object} taskBody - Task data
 * @returns {Promise<Task>}
 */
const createTaskForAccessibleTeamMember = async (assignedByTeamMemberId, taskBody) => {
  // Validate that the assigned team member is accessible
  const hasAccess = await TeamMember.hasAccessToTeamMember(
    assignedByTeamMemberId,
    taskBody.teamMember
  );
  
  if (!hasAccess) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'You do not have access to assign tasks to this team member'
    );
  }
  
  // Create the task with assignedBy set to the team member
  const taskData = {
    ...taskBody,
    assignedBy: null, // Team members don't have User reference, can be null or we can track differently
  };
  
  return createTask(taskData);
};

/**
 * Update task assigned to accessible team member (with validation)
 * @param {ObjectId} teamMemberId - Team member trying to update
 * @param {ObjectId} taskId - Task ID
 * @param {Object} updateBody - Update data
 * @returns {Promise<Task>}
 */
const updateTaskOfAccessibleTeamMember = async (teamMemberId, taskId, updateBody) => {
  // Get the task first
  const task = await getTaskByIdMinimal(taskId);
  
  // Validate that the team member has access to the task's team member
  const hasAccess = await TeamMember.hasAccessToTeamMember(
    teamMemberId,
    task.teamMember
  );
  
  if (!hasAccess) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'You do not have access to update tasks for this team member'
    );
  }
  
  // If teamMember is being updated, validate access to new team member
  if (updateBody.teamMember && updateBody.teamMember !== task.teamMember.toString()) {
    const hasAccessToNew = await TeamMember.hasAccessToTeamMember(
      teamMemberId,
      updateBody.teamMember
    );
    
    if (!hasAccessToNew) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'You do not have access to assign tasks to this team member'
      );
    }
  }
  
  return updateTaskById(taskId, updateBody);
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
  getTasksOfAccessibleTeamMembers,
  createTaskForAccessibleTeamMember,
  updateTaskOfAccessibleTeamMember,
};
