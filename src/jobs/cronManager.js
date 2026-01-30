/**
 * Cron Job Manager
 * 
 * Manages all cron jobs for the application including timeline generation
 */

import { scheduleTimelineJobs } from './timelineGenerator.job.js';
import logger from '../config/logger.js';

class CronManager {
  constructor() {
    this.jobs = {};
    this.isRunning = false;
  }

  /**
   * Initialize and start all cron jobs
   */
  async start() {
    try {
      logger.info('🚀 Starting cron job manager...');
      
      // Initialize timeline generation jobs
      this.jobs.timelineJobs = scheduleTimelineJobs();
      
      // Start all jobs
      this.jobs.timelineJobs.start();
      
      this.isRunning = true;
      logger.info('✅ All cron jobs started successfully');
      
      // Log job schedules (each frequency runs only when its period changes)
      logger.info('📅 Scheduled jobs:');
      logger.info('   - Daily timelines (Daily freq only): 1:00 AM IST');
      logger.info('   - Monthly timelines (Monthly freq only): 1st of month, 2:00 AM IST');
      logger.info('   - Quarterly timelines (Quarterly freq only): 1st of quarter, 3:00 AM IST');
      logger.info('   - Yearly timelines (Yearly freq only): April 1st, 4:00 AM IST');
      
    } catch (error) {
      logger.error('❌ Failed to start cron jobs:', error);
      throw error;
    }
  }

  /**
   * Stop all cron jobs
   */
  async stop() {
    try {
      logger.info('⏹️ Stopping cron job manager...');
      
      if (this.jobs.timelineJobs) {
        this.jobs.timelineJobs.stop();
      }
      
      this.isRunning = false;
      logger.info('✅ All cron jobs stopped');
      
    } catch (error) {
      logger.error('❌ Failed to stop cron jobs:', error);
      throw error;
    }
  }

  /**
   * Get status of all cron jobs
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobs: {
        timelineJobs: !!this.jobs.timelineJobs
      }
    };
  }

  /**
   * Restart all cron jobs
   */
  async restart() {
    await this.stop();
    await this.start();
  }
}

// Create singleton instance
const cronManager = new CronManager();

export default cronManager;

