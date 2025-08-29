import cron from 'node-cron';
import { Task } from '../models/index.js';
import logger from '../config/logger.js';

class TaskStatusCronService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start task status cron jobs
   */
  start() {
    if (this.isRunning) {
      logger.info('Task status cron service is already running');
      return;
    }

    // Run task status check every day at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
      logger.info('🕛 Starting daily task status check...');
      try {
        const result = await Task.checkAndUpdateAllTaskStatuses();
        logger.info(`✅ Daily task status check completed: ${result.delayedCount} delayed, ${result.pendingCount} reverted to pending`);
      } catch (error) {
        logger.error('❌ Error in daily task status check:', error);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    // Also run every hour for more frequent checks (optional)
    cron.schedule('0 * * * *', async () => {
      logger.info('🕐 Starting hourly task status check...');
      try {
        const result = await Task.checkAndUpdateAllTaskStatuses();
        if (result.delayedCount > 0 || result.pendingCount > 0) {
          logger.info(`🔄 Hourly task status check: ${result.delayedCount} delayed, ${result.pendingCount} reverted to pending`);
        }
      } catch (error) {
        logger.error('❌ Error in hourly task status check:', error);
      }
    }, {
      scheduled: true,
      timezone: "UTC"
    });

    this.isRunning = true;
    logger.info('✅ Task status cron service started successfully');
  }

  /**
   * Stop task status cron jobs
   */
  stop() {
    if (!this.isRunning) {
      logger.info('Task status cron service is not running');
      return;
    }

    // Stop only our scheduled jobs
    const tasks = cron.getTasks();
    tasks.forEach((task, name) => {
      if (name.includes('task-status')) {
        task.stop();
        logger.info(`Stopped task status cron job: ${name}`);
      }
    });

    this.isRunning = false;
    logger.info('⏹️ Task status cron service stopped successfully');
  }

  /**
   * Manually trigger task status check
   */
  async manualTaskStatusCheck() {
    logger.info('🔄 Manual task status check triggered');
    try {
      const result = await Task.checkAndUpdateAllTaskStatuses();
      logger.info(`✅ Manual task status check completed: ${result.delayedCount} delayed, ${result.pendingCount} reverted to pending`);
      return result;
    } catch (error) {
      logger.error('❌ Error in manual task status check:', error);
      throw error;
    }
  }

  /**
   * Get task status cron service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeJobs: cron.getTasks().size
    };
  }
}

export default new TaskStatusCronService();
