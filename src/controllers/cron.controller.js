import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { cronService } from '../services/index.js';

/**
 * Initialize cron jobs
 * @route POST /v1/cron/initialize
 * @access Private
 */
const initializeCronJobs = catchAsync(async (req, res) => {
  cronService.initializeCronJobs();
  res.status(httpStatus.OK).send({
    message: 'Cron jobs initialized successfully',
    status: 'initialized'
  });
});

/**
 * Stop all cron jobs
 * @route POST /v1/cron/stop
 * @access Private
 */
const stopCronJobs = catchAsync(async (req, res) => {
  cronService.stopCronJobs();
  res.status(httpStatus.OK).send({
    message: 'All cron jobs stopped successfully',
    status: 'stopped'
  });
});

/**
 * Get cron job status
 * @route GET /v1/cron/status
 * @access Private
 */
const getCronJobStatus = catchAsync(async (req, res) => {
  const status = cronService.getCronJobStatus();
  res.status(httpStatus.OK).send(status);
});

/**
 * Manually trigger daily task reminders (for testing)
 * @route POST /v1/cron/trigger-reminders
 * @access Private
 */
const triggerDailyReminders = catchAsync(async (req, res) => {
  await cronService.sendDailyTaskReminders();
  res.status(httpStatus.OK).send({
    message: 'Daily task reminders triggered manually',
    status: 'triggered'
  });
});

export default {
  initializeCronJobs,
  stopCronJobs,
  getCronJobStatus,
  triggerDailyReminders
};
