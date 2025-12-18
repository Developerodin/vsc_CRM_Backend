import express from 'express';
import auth from '../../middlewares/auth.js';
import validate from '../../middlewares/validate.js';
import taskValidation from '../../validations/task.validation.js';
import taskController from '../../controllers/task.controller.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth());

// Basic CRUD operations
router
  .route('/')
  .post(validate(taskValidation.createTask), taskController.createTask)
  .get(validate(taskValidation.getTasks), taskController.getTasks);

// Search and statistics - MUST be before /:taskId routes
router
  .route('/search')
  .get(validate(taskValidation.searchTasks), taskController.searchTasks);

router
  .route('/statistics')
  .get(validate(taskValidation.getTaskStatistics), taskController.getTaskStatistics);

// Bulk operations - MUST be before /:taskId routes
router
  .route('/bulk')
  .post(validate(taskValidation.bulkCreateTasks), taskController.bulkCreateTasks)
  .delete(validate(taskValidation.bulkDeleteTasks), taskController.bulkDeleteTasks);

router
  .route('/bulk/status')
  .patch(validate(taskValidation.bulkUpdateTaskStatus), taskController.bulkUpdateTaskStatus);

// Date-based routes - MUST be before /:taskId routes
router
  .route('/date-range')
  .get(validate(taskValidation.getTasksByDateRange), taskController.getTasksByDateRange);

router
  .route('/overdue')
  .get(validate(taskValidation.getOverdueTasks), taskController.getOverdueTasks);

router
  .route('/high-priority')
  .get(validate(taskValidation.getHighPriorityTasks), taskController.getHighPriorityTasks);

router
  .route('/due-today')
  .get(validate(taskValidation.getTasksDueToday), taskController.getTasksDueToday);

router
  .route('/due-this-week')
  .get(validate(taskValidation.getTasksDueThisWeek), taskController.getTasksDueThisWeek);

router
  .route('/due-this-month')
  .get(validate(taskValidation.getTasksDueThisMonth), taskController.getTasksDueThisMonth);

// Filtering routes - MUST be before /:taskId routes
router
  .route('/team-member/:teamMemberId')
  .get(validate(taskValidation.getTasksByTeamMember), taskController.getTasksByTeamMember);

router
  .route('/timeline/:timelineId')
  .get(validate(taskValidation.getTasksByTimeline), taskController.getTasksByTimeline);

router
  .route('/assigned-by/:userId')
  .get(validate(taskValidation.getTasksByAssignedBy), taskController.getTasksByAssignedBy);

router
  .route('/branch/:branchId')
  .get(validate(taskValidation.getTasksByBranch), taskController.getTasksByBranch);

router
  .route('/status/:status')
  .get(validate(taskValidation.getTasksByStatus), taskController.getTasksByStatus);

router
  .route('/priority/:priority')
  .get(validate(taskValidation.getTasksByPriority), taskController.getTasksByPriority);

// Parameterized routes - MUST be last
router
  .route('/:taskId')
  .get(validate(taskValidation.getTask), taskController.getTask)
  .patch(validate(taskValidation.updateTask), taskController.updateTask)
  .delete(validate(taskValidation.deleteTask), taskController.deleteTask);

// Attachment management
router
  .route('/:taskId/attachments')
  .post(validate(taskValidation.addAttachment), taskController.addAttachment);

router
  .route('/:taskId/attachments/:fileName')
  .delete(validate(taskValidation.removeAttachment), taskController.removeAttachment);

export default router;
