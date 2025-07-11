import express from 'express';
import { dashboardController } from '../../controllers/index.js';
import auth from '../../middlewares/auth.js';
import validate from '../../middlewares/validate.js';
import { dashboardValidation } from '../../validations/index.js';

const router = express.Router();

router
  .route('/total-activities')
  .get(auth('getActivities'), dashboardController.getTotalActivities);

router
  .route('/total-teams')
  .get(auth('getTeamMembers'), validate(dashboardValidation.getTotalTeams), dashboardController.getTotalTeams);

router
  .route('/total-branches')
  .get(auth('getBranches'), dashboardController.getTotalBranches);

router
  .route('/total-clients')
  .get(auth('getClients'), validate(dashboardValidation.getTotalClients), dashboardController.getTotalClients);

router
  .route('/total-ongoing-tasks')
  .get(auth('getTimelines'), validate(dashboardValidation.getTotalOngoingTasks), dashboardController.getTotalOngoingTasks);

router
  .route('/timeline-counts-by-branch')
  .get(auth('getTimelines'), validate(dashboardValidation.getTimelineCountsByBranch), dashboardController.getTimelineCountsByBranch);

router
  .route('/assigned-task-counts')
  .get(auth('getTimelines'), validate(dashboardValidation.getAssignedTaskCounts), dashboardController.getAssignedTaskCounts);

router
  .route('/top-clients')
  .get(auth('getClients'), validate(dashboardValidation.getTopClients), dashboardController.getTopClients);

router
  .route('/top-activities')
  .get(auth('getActivities'), validate(dashboardValidation.getTopActivities), dashboardController.getTopActivities);

export default router;