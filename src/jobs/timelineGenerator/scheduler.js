import cron from 'node-cron';
import logger from '../../config/logger.js';
import { processMonthlyTimelines, processQuarterlyTimelines, processYearlyTimelines } from './processors.js';

/**
 * Main timeline generation function (runs all).
 */
const generateRecurringTimelines = async () => {
  const startTime = Date.now();
  logger.info('🚀 Starting recurring timeline generation job...');

  const results = {
    monthly: await processMonthlyTimelines(),
    quarterly: await processQuarterlyTimelines(),
    yearly: await processYearlyTimelines(),
  };

  const totalProcessed = results.monthly.processed + results.quarterly.processed + results.yearly.processed;
  const totalCreated = results.monthly.created + results.quarterly.created + results.yearly.created;
  const duration = (Date.now() - startTime) / 1000;

  logger.info(`🎉 Timeline generation job completed in ${duration}s`);
  logger.info(`📊 Summary: ${totalProcessed} processed, ${totalCreated} created`);

  return results;
};

/**
 * Schedule cron jobs for timeline generation.
 */
const scheduleTimelineJobs = () => {
  // Run daily at 1:00 AM to check for new periods
  const dailyJob = cron.schedule(
    '0 1 * * *',
    async () => {
      logger.info('⏰ Daily timeline generation job triggered');
      try {
        await generateRecurringTimelines();
      } catch (error) {
        logger.error('❌ Daily timeline job failed:', error);
      }
    },
    { scheduled: false, timezone: 'Asia/Kolkata' }
  );

  // Run on 1st of every month at 2:00 AM for monthly timelines
  const monthlyJob = cron.schedule(
    '0 2 1 * *',
    async () => {
      logger.info('⏰ Monthly timeline generation job triggered');
      try {
        await processMonthlyTimelines();
      } catch (error) {
        logger.error('❌ Monthly timeline job failed:', error);
      }
    },
    { scheduled: false, timezone: 'Asia/Kolkata' }
  );

  // Run on 1st of every quarter at 3:00 AM (Jan, Apr, Jul, Oct)
  const quarterlyJob = cron.schedule(
    '0 3 1 1,4,7,10 *',
    async () => {
      logger.info('⏰ Quarterly timeline generation job triggered');
      try {
        await processQuarterlyTimelines();
      } catch (error) {
        logger.error('❌ Quarterly timeline job failed:', error);
      }
    },
    { scheduled: false, timezone: 'Asia/Kolkata' }
  );

  // Run on April 1st at 4:00 AM for yearly timelines (financial year start)
  const yearlyJob = cron.schedule(
    '0 4 1 4 *',
    async () => {
      logger.info('⏰ Yearly timeline generation job triggered');
      try {
        await processYearlyTimelines();
      } catch (error) {
        logger.error('❌ Yearly timeline job failed:', error);
      }
    },
    { scheduled: false, timezone: 'Asia/Kolkata' }
  );

  return {
    dailyJob,
    monthlyJob,
    quarterlyJob,
    yearlyJob,
    start: () => {
      dailyJob.start();
      monthlyJob.start();
      quarterlyJob.start();
      yearlyJob.start();
      logger.info('✅ All timeline generation cron jobs started');
    },
    stop: () => {
      dailyJob.stop();
      monthlyJob.stop();
      quarterlyJob.stop();
      yearlyJob.stop();
      logger.info('⏹️ All timeline generation cron jobs stopped');
    },
  };
};

export { generateRecurringTimelines, scheduleTimelineJobs };

