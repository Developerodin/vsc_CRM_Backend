import express from 'express';
import { dashboardController } from '../../controllers/index.js';
import auth from '../../middlewares/auth.js';
import validate from '../../middlewares/validate.js';
import { dashboardValidation } from '../../validations/index.js';

const router = express.Router();

router
  .route('/total-activities')
  .get(auth(), dashboardController.getTotalActivities);

router
  .route('/total-teams')
  .get(auth(), validate(dashboardValidation.getTotalTeams), dashboardController.getTotalTeams);

router
  .route('/total-branches')
  .get(auth(), dashboardController.getTotalBranches);

router
  .route('/total-clients')
  .get(auth(), validate(dashboardValidation.getTotalClients), dashboardController.getTotalClients);

router
  .route('/total-ongoing-tasks')
  .get(auth(), validate(dashboardValidation.getTotalOngoingTasks), dashboardController.getTotalOngoingTasks);

router
  .route('/timeline-counts-by-branch')
  .get(auth(), validate(dashboardValidation.getTimelineCountsByBranch), dashboardController.getTimelineCountsByBranch);

router
  .route('/assigned-task-counts')
  .get(auth(), validate(dashboardValidation.getAssignedTaskCounts), dashboardController.getAssignedTaskCounts);

router
  .route('/top-clients')
  .get(auth(), validate(dashboardValidation.getTopClients), dashboardController.getTopClients);

router
  .route('/top-activities')
  .get(auth(), validate(dashboardValidation.getTopActivities), dashboardController.getTopActivities);

// New frequency-based timeline analysis routes
router
  .route('/timeline-status-by-frequency')
  .get(auth(), validate(dashboardValidation.getTimelineStatusByFrequency), dashboardController.getTimelineStatusByFrequency);

router
  .route('/timeline-status-by-period')
  .get(auth(), validate(dashboardValidation.getTimelineStatusByPeriod), dashboardController.getTimelineStatusByPeriod);

router
  .route('/timeline-frequency-analytics')
  .get(auth(), validate(dashboardValidation.getTimelineFrequencyAnalytics), dashboardController.getTimelineFrequencyAnalytics);

router
  .route('/timeline-status-trends')
  .get(auth(), validate(dashboardValidation.getTimelineStatusTrends), dashboardController.getTimelineStatusTrends);

router
  .route('/timeline-completion-rates')
  .get(auth(), validate(dashboardValidation.getTimelineCompletionRates), dashboardController.getTimelineCompletionRates);

// New task analytics routes
router
  .route('/total-tasks-and-status')
  .get(auth(), validate(dashboardValidation.getTotalTasksAndStatus), dashboardController.getTotalTasksAndStatus);

router
  .route('/task-analytics')
  .get(auth(), validate(dashboardValidation.getTaskAnalytics), dashboardController.getTaskAnalytics);

router
  .route('/task-trends')
  .get(auth(), validate(dashboardValidation.getTaskTrends), dashboardController.getTaskTrends);

export default router;