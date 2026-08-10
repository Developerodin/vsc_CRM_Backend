/**
 * Background worker process — runs cron jobs only (no HTTP server).
 * Start via PM2 app name "worker" so API process stays free for requests.
 */
import mongoose from 'mongoose';
import config from './config/config.js';
import logger from './config/logger.js';
import { initializeCronJobs } from './services/cron.service.js';
import taskStatusCronService from './services/taskStatusCron.service.js';
import cronManager from './jobs/cronManager.js';

mongoose
  .connect(config.mongoose.url, config.mongoose.options)
  .then(async () => {
    logger.info('[worker] Connected to MongoDB');

    try {
      initializeCronJobs();
      logger.info('[worker] Email reminder cron jobs initialized');
    } catch (error) {
      logger.error('[worker] Failed to initialize email reminder cron jobs:', error);
    }

    try {
      taskStatusCronService.start();
      logger.info('[worker] Task status cron service started');
    } catch (error) {
      logger.error('[worker] Failed to start task status cron service:', error);
    }

    try {
      await cronManager.start();
      logger.info('[worker] Timeline cron manager started');
    } catch (error) {
      logger.error('[worker] Failed to start cron manager:', error);
    }
  })
  .catch((err) => {
    logger.error('[worker] MongoDB connection error:', err);
    process.exit(1);
  });

/**
 * Graceful shutdown for worker process.
 */
const shutdown = async (signal) => {
  logger.info(`[worker] ${signal} received`);
  try {
    taskStatusCronService.stop();
  } catch (error) {
    logger.error('[worker] Error stopping task status cron:', error);
  }
  try {
    await cronManager.stop();
  } catch (error) {
    logger.error('[worker] Error stopping cron manager:', error);
  }
  await mongoose.disconnect();
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  logger.error('[worker] uncaughtException', error);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (error) => {
  logger.error('[worker] unhandledRejection', error);
  shutdown('unhandledRejection');
});
