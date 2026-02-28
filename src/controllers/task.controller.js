import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';
import taskService from '../services/task.service.js';

/**
 * Create a task
 * @route POST /v1/tasks
 * @access Private
 * Sets assigner from logged-in user when not provided: User -> assignedBy, Team member -> assignedByTeamMember.
 */
const createTask = catchAsync(async (req, res) => {
  const body = { ...req.body };
  const assignerProvided = body.assignedBy != null && body.assignedBy !== '';
  const assignerTeamMemberProvided = body.assignedByTeamMember != null && body.assignedByTeamMember !== '';
  if (!assignerProvided && !assignerTeamMemberProvided) {
    if (req.user?.userType === 'teamMember') {
      body.assignedByTeamMember = req.user.id ?? null;
      body.assignedBy = null;
    } else {
      body.assignedBy = req.user?.id ?? req.user?._id?.toString() ?? null;
    }
  }
  const task = await taskService.createTask(body);
  res.status(httpStatus.CREATED).send(task);
});

/**
 * Get tasks with filtering and pagination
 * @route GET /v1/tasks
 * @access Private
 */
const getTasks = catchAsync(async (req, res) => {
  const filter = pick(req.query, [
    'teamMember', 'assignedBy', 'timeline', 'branch', 'status', 'priority',
    'startDate', 'endDate', 'startDateRange', 'endDateRange', 'today', 'group'
  ]);
  
  // Filter out empty strings and convert them to undefined
  Object.keys(filter).forEach(key => {
    if (filter[key] === '') {
      delete filter[key];
    }
  });
  
  // Handle date range filtering
  if (filter.startDateRange && filter.endDateRange) {
    const startDate = new Date(filter.startDateRange);
    const endDate = new Date(filter.endDateRange);
    delete filter.startDate;
    delete filter.endDate;
    filter.startDateRange = startDate;
    filter.endDateRange = endDate;
  }
  
  // Handle today parameter
  if (filter.today === 'true' || filter.today === true) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    filter.startDate = today;
    filter.endDate = tomorrow;
    delete filter.today;
  }
  
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await taskService.queryTasks(filter, options);
  res.send(result);
});

/**
 * Get task by id
 * @route GET /v1/tasks/:taskId
 * @access Private
 */
const getTask = catchAsync(async (req, res) => {
  const task = await taskService.getTaskById(req.params.taskId);
  res.send(task);
});

/**
 * Update task by id
 * @route PATCH /v1/tasks/:taskId
 * @access Private
 */
const updateTask = catchAsync(async (req, res) => {
  const task = await taskService.updateTaskById(req.params.taskId, req.body);
  res.send(task);
});

/**
 * Delete task by id
 * @route DELETE /v1/tasks/:taskId
 * @access Private
 */
const deleteTask = catchAsync(async (req, res) => {
  await taskService.deleteTaskById(req.params.taskId);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Get tasks by team member
 * @route GET /v1/tasks/team-member/:teamMemberId
 * @access Private
 */
const getTasksByTeamMember = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await taskService.getTasksByTeamMember(req.params.teamMemberId, options);
  res.send(result);
});

/**
 * Get tasks by timeline
 * @route GET /v1/tasks/timeline/:timelineId
 * @access Private
 */
const getTasksByTimeline = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await taskService.getTasksByTimeline(req.params.timelineId, options);
  res.send(result);
});

/**
 * Get tasks by assigned by user
 * @route GET /v1/tasks/assigned-by/:userId
 * @access Private
 */
const getTasksByAssignedBy = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await taskService.getTasksByAssignedBy(req.params.userId, options);
  res.send(result);
});

/**
 * Get tasks by branch
 * @route GET /v1/tasks/branch/:branchId
 * @access Private
 */
const getTasksByBranch = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await taskService.getTasksByBranch(req.params.branchId, options);
  res.send(result);
});

/**
 * Get tasks by status
 * @route GET /v1/tasks/status/:status
 * @access Private
 */
const getTasksByStatus = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await taskService.getTasksByStatus(req.params.status, options);
  res.send(result);
});

/**
 * Get tasks by priority
 * @route GET /v1/tasks/priority/:priority
 * @access Private
 */
const getTasksByPriority = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await taskService.getTasksByPriority(req.params.priority, options);
  res.send(result);
});

/**
 * Get tasks by date range
 * @route GET /v1/tasks/date-range
 * @access Private
 */
const getTasksByDateRange = catchAsync(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Start date and end date are required');
  }
  
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await taskService.getTasksByDateRange(
    new Date(startDate),
    new Date(endDate),
    options
  );
  res.send(result);
});

/**
 * Get overdue tasks
 * @route GET /v1/tasks/overdue
 * @access Private
 */
const getOverdueTasks = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await taskService.getOverdueTasks(options);
  res.send(result);
});

/**
 * Get high priority tasks
 * @route GET /v1/tasks/high-priority
 * @access Private
 */
const getHighPriorityTasks = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await taskService.getHighPriorityTasks(options);
  res.send(result);
});

/**
 * Get tasks due today
 * @route GET /v1/tasks/due-today
 * @access Private
 */
const getTasksDueToday = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await taskService.getTasksDueToday(options);
  res.send(result);
});

/**
 * Get tasks due this week
 * @route GET /v1/tasks/due-this-week
 * @access Private
 */
const getTasksDueThisWeek = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await taskService.getTasksDueThisWeek(options);
  res.send(result);
});

/**
 * Get tasks due this month
 * @route GET /v1/tasks/due-this-month
 * @access Private
 */
const getTasksDueThisMonth = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await taskService.getTasksDueThisMonth(options);
  res.send(result);
});

/**
 * Search tasks by text
 * @route GET /v1/tasks/search
 * @access Private
 */
const searchTasks = catchAsync(async (req, res) => {
  const { q } = req.query;
  
  if (!q) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Search query is required');
  }
  
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await taskService.searchTasks(q, options);
  res.send(result);
});

/**
 * Get task statistics
 * @route GET /v1/tasks/statistics
 * @access Private
 */
const getTaskStatistics = catchAsync(async (req, res) => {
  const { branchId } = req.query;
  // Convert empty string to null/undefined
  const normalizedBranchId = branchId && branchId.trim() !== '' ? branchId : null;
  const stats = await taskService.getTaskStatistics(normalizedBranchId);
  res.send(stats);
});

/**
 * Bulk update task status
 * @route PATCH /v1/tasks/bulk/status
 * @access Private
 */
const bulkUpdateTaskStatus = catchAsync(async (req, res) => {
  const { taskIds, status } = req.body;
  
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Task IDs array is required');
  }
  
  if (!status) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Status is required');
  }
  
  const result = await taskService.bulkUpdateTaskStatus(taskIds, status);
  res.send(result);
});

/**
 * Bulk create tasks with email notifications
 * @route POST /v1/tasks/bulk
 * @access Private
 */
const bulkCreateTasks = catchAsync(async (req, res) => {
  const { tasks } = req.body;
  
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Tasks array is required');
  }
  
  if (tasks.length > 100) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Maximum 100 tasks can be created at once');
  }
  
  const result = await taskService.bulkCreateTasks(tasks);
  res.status(httpStatus.CREATED).send(result);
});

/**
 * Bulk delete tasks
 * @route DELETE /v1/tasks/bulk
 * @access Private
 */
const bulkDeleteTasks = catchAsync(async (req, res) => {
  const { taskIds } = req.body;
  
  if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Task IDs array is required');
  }
  
  const result = await taskService.bulkDeleteTasks(taskIds);
  res.send(result);
});

/**
 * Add attachment to task
 * @route POST /v1/tasks/:taskId/attachments
 * @access Private
 */
const addAttachment = catchAsync(async (req, res) => {
  const { fileName, fileUrl } = req.body;
  
  if (!fileName || !fileUrl) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'File name and file URL are required');
  }
  
  const task = await taskService.getTaskById(req.params.taskId);
  await task.addAttachment(fileName, fileUrl);
  res.send(task);
});

/**
 * Remove attachment from task
 * @route DELETE /v1/tasks/:taskId/attachments/:fileName
 * @access Private
 */
const removeAttachment = catchAsync(async (req, res) => {
  const { fileName } = req.params;
  const task = await taskService.getTaskById(req.params.taskId);
  await task.removeAttachment(fileName);
  res.send(task);
});

/**
 * Get tasks of accessible team members
 * @route GET /v1/tasks/accessible-team-members/:teamMemberId
 * @access Private
 */
const getTasksOfAccessibleTeamMembers = catchAsync(async (req, res) => {
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'status', 'priority']);
  const result = await taskService.getTasksOfAccessibleTeamMembers(
    req.params.teamMemberId,
    options
  );
  res.send(result);
});

/**
 * Create task for accessible team member
 * @route POST /v1/tasks/assign-to-accessible/:teamMemberId
 * @access Private
 */
const createTaskForAccessibleTeamMember = catchAsync(async (req, res) => {
  const task = await taskService.createTaskForAccessibleTeamMember(
    req.params.teamMemberId,
    req.body
  );
  res.status(httpStatus.CREATED).send(task);
});

/**
 * Update task of accessible team member
 * @route PATCH /v1/tasks/accessible/:taskId/:teamMemberId
 * @access Private
 */
const updateTaskOfAccessibleTeamMember = catchAsync(async (req, res) => {
  const task = await taskService.updateTaskOfAccessibleTeamMember(
    req.params.teamMemberId,
    req.params.taskId,
    req.body
  );
  res.send(task);
});

export default {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
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
  addAttachment,
  removeAttachment,
  getTasksOfAccessibleTeamMembers,
  createTaskForAccessibleTeamMember,
  updateTaskOfAccessibleTeamMember,
};
