import express from 'express';
import cronController from '../../controllers/cron.controller.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth());

// Cron job management routes
router
  .route('/initialize')
  .post(auth('manageSystem'), cronController.initializeCronJobs);

router
  .route('/stop')
  .post(auth('manageSystem'), cronController.stopCronJobs);

router
  .route('/status')
  .get(auth('getSystem'), cronController.getCronJobStatus);

router
  .route('/trigger-reminders')
  .post(auth('manageSystem'), cronController.triggerDailyReminders);

export default router;
