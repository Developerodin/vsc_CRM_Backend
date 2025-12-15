/**
 * Timeline Generator Cron Job
 * 
 * This job runs periodically to create new timelines for recurring activities:
 * - Monthly: Creates new timeline when month changes
 * - Quarterly: Creates new timeline when quarter changes  
 * - Yearly: Creates new timeline when year changes
 * - OneTime: No recurring generation needed
 */

import cron from 'node-cron';
import mongoose from 'mongoose';
import { Client, Timeline, Activity } from '../models/index.js';
import { getCurrentFinancialYear, generateTimelineDates } from '../utils/financialYear.js';
import logger from '../config/logger.js';

/**
 * Get period string from date for different frequencies
 */
const getPeriodFromDate = (date, frequency) => {
  const month = date.getMonth();
  const year = date.getFullYear();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  switch (frequency) {
    case 'Monthly':
      return `${monthNames[month]}-${year}`;
    case 'Quarterly':
      const quarter = Math.floor(month / 3) + 1;
      return `Q${quarter}-${year}`;
    case 'Yearly':
      // For yearly, use financial year format
      const financialYearStart = month >= 3 ? year : year - 1;
      const financialYearEnd = financialYearStart + 1;
      return `${financialYearStart}-${financialYearEnd}`;
    default:
      return `${monthNames[month]}-${year}`;
  }
};

/**
 * Check if a timeline already exists for a specific period
 */
const timelineExistsForPeriod = async (clientId, activityId, subactivityId, period) => {
  const query = {
    client: clientId,
    activity: activityId,
    period: period
  };
  
  if (subactivityId) {
    query['subactivity._id'] = subactivityId;
  } else {
    query['subactivity'] = null;
  }
  
  const existingTimeline = await Timeline.findOne(query);
  return !!existingTimeline;
};

/**
 * Create a new timeline for a specific period
 */
const createTimelineForPeriod = async (client, activity, subactivity, period, dueDate) => {
  try {
    const { yearString: financialYear } = getCurrentFinancialYear();
    
    const timelineData = {
      activity: activity._id,
      client: client._id,
      status: 'pending',
      dueDate: dueDate,
      startDate: dueDate,
      endDate: dueDate,
      period: period,
      branch: client.branch,
      financialYear: financialYear,
      fields: []
    };
    
    if (subactivity) {
      timelineData.subactivity = {
        _id: subactivity._id,
        name: subactivity.name,
        frequency: subactivity.frequency,
        frequencyConfig: subactivity.frequencyConfig,
        fields: subactivity.fields
      };
      timelineData.frequency = subactivity.frequency;
      timelineData.frequencyConfig = subactivity.frequencyConfig;
      timelineData.timelineType = 'recurring';
      
      // Copy fields from subactivity
      if (subactivity.fields && subactivity.fields.length > 0) {
        timelineData.fields = subactivity.fields.map(field => ({
          fileName: field.name,
          fieldType: field.type,
          fieldValue: null
        }));
      }
    } else {
      timelineData.frequency = 'OneTime';
      timelineData.timelineType = 'oneTime';
      timelineData.subactivity = null;
    }
    
    const timeline = await Timeline.create(timelineData);
    logger.info(`Created timeline for ${client.name} - ${activity.name}${subactivity ? ` - ${subactivity.name}` : ''} - ${period}`);
    
    return timeline;
  } catch (error) {
    logger.error(`Error creating timeline for ${client.name}: ${error.message}`);
    throw error;
  }
};

/**
 * Calculate due date based on frequency and period
 */
const calculateDueDate = (frequency, frequencyConfig, period) => {
  const now = new Date();
  
  switch (frequency) {
    case 'Monthly':
      if (frequencyConfig && frequencyConfig.monthlyDay) {
        const [monthName, year] = period.split('-');
        const monthIndex = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ].indexOf(monthName);
        
        const dueDate = new Date(parseInt(year), monthIndex, frequencyConfig.monthlyDay);
        
        // If monthlyTime is specified, set the time
        if (frequencyConfig.monthlyTime) {
          const timeParts = frequencyConfig.monthlyTime.match(/(\d+):(\d+)(?:\s*(AM|PM))?/);
          if (timeParts) {
            let hours = parseInt(timeParts[1]);
            const minutes = parseInt(timeParts[2]);
            const ampm = timeParts[3];
            
            if (ampm === 'PM' && hours !== 12) hours += 12;
            if (ampm === 'AM' && hours === 12) hours = 0;
            
            dueDate.setHours(hours, minutes, 0, 0);
          }
        }
        
        return dueDate;
      }
      break;
      
    case 'Quarterly':
      if (frequencyConfig && frequencyConfig.quarterlyDay) {
        const [quarter, year] = period.split('-');
        const quarterNum = parseInt(quarter.replace('Q', ''));
        
        // Get the first month of the quarter
        const quarterStartMonth = (quarterNum - 1) * 3;
        const dueDate = new Date(parseInt(year), quarterStartMonth, frequencyConfig.quarterlyDay);
        
        return dueDate;
      }
      break;
      
    case 'Yearly':
      if (frequencyConfig && frequencyConfig.yearlyMonth && frequencyConfig.yearlyDate) {
        const [startYear] = period.split('-');
        // Handle both array and string for backward compatibility
        const monthValue = Array.isArray(frequencyConfig.yearlyMonth) 
          ? frequencyConfig.yearlyMonth[0] 
          : frequencyConfig.yearlyMonth;
        const monthIndex = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ].indexOf(monthValue);
        
        // For financial year, determine correct year for the month
        const year = monthIndex >= 3 ? parseInt(startYear) : parseInt(startYear) + 1;
        const dueDate = new Date(year, monthIndex, frequencyConfig.yearlyDate);
        
        return dueDate;
      }
      break;
  }
  
  // Default: first day of current month
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

/**
 * Process monthly timeline generation
 */
const processMonthlyTimelines = async () => {
  logger.info('🔄 Processing monthly timeline generation...');
  
  try {
    const now = new Date();
    const currentPeriod = getPeriodFromDate(now, 'Monthly');
    
    // Find all clients with monthly activities
    const clients = await Client.find({
      'activities.0': { $exists: true },
      status: 'active'
    }).populate('activities.activity');
    
    let processedCount = 0;
    let createdCount = 0;
    
    for (const client of clients) {
      for (const clientActivity of client.activities) {
        if (clientActivity.status !== 'active') continue;
        
        const activity = clientActivity.activity;
        if (!activity || !activity.subactivities) continue;
        
        for (const subactivity of activity.subactivities) {
          if (subactivity.frequency !== 'Monthly') continue;
          
          // Check if client is assigned this specific subactivity
          if (clientActivity.subactivity) {
            const assignedSubactivityId = clientActivity.subactivity._id || clientActivity.subactivity;
            if (assignedSubactivityId.toString() !== subactivity._id.toString()) {
              continue;
            }
          }
          
          processedCount++;
          
          // Check if timeline already exists for current period
          const exists = await timelineExistsForPeriod(
            client._id, 
            activity._id, 
            subactivity._id, 
            currentPeriod
          );
          
          if (!exists) {
            const dueDate = calculateDueDate('Monthly', subactivity.frequencyConfig, currentPeriod);
            await createTimelineForPeriod(client, activity, subactivity, currentPeriod, dueDate);
            createdCount++;
          }
        }
      }
    }
    
    logger.info(`✅ Monthly processing complete: ${processedCount} processed, ${createdCount} created`);
    return { processed: processedCount, created: createdCount };
    
  } catch (error) {
    logger.error(`❌ Error in monthly timeline processing: ${error.message}`);
    throw error;
  }
};

/**
 * Process quarterly timeline generation
 */
const processQuarterlyTimelines = async () => {
  logger.info('🔄 Processing quarterly timeline generation...');
  
  try {
    const now = new Date();
    const currentPeriod = getPeriodFromDate(now, 'Quarterly');
    
    // Find all clients with quarterly activities
    const clients = await Client.find({
      'activities.0': { $exists: true },
      status: 'active'
    }).populate('activities.activity');
    
    let processedCount = 0;
    let createdCount = 0;
    
    for (const client of clients) {
      for (const clientActivity of client.activities) {
        if (clientActivity.status !== 'active') continue;
        
        const activity = clientActivity.activity;
        if (!activity || !activity.subactivities) continue;
        
        for (const subactivity of activity.subactivities) {
          if (subactivity.frequency !== 'Quarterly') continue;
          
          // Check if client is assigned this specific subactivity
          if (clientActivity.subactivity) {
            const assignedSubactivityId = clientActivity.subactivity._id || clientActivity.subactivity;
            if (assignedSubactivityId.toString() !== subactivity._id.toString()) {
              continue;
            }
          }
          
          processedCount++;
          
          // Check if timeline already exists for current period
          const exists = await timelineExistsForPeriod(
            client._id, 
            activity._id, 
            subactivity._id, 
            currentPeriod
          );
          
          if (!exists) {
            const dueDate = calculateDueDate('Quarterly', subactivity.frequencyConfig, currentPeriod);
            await createTimelineForPeriod(client, activity, subactivity, currentPeriod, dueDate);
            createdCount++;
          }
        }
      }
    }
    
    logger.info(`✅ Quarterly processing complete: ${processedCount} processed, ${createdCount} created`);
    return { processed: processedCount, created: createdCount };
    
  } catch (error) {
    logger.error(`❌ Error in quarterly timeline processing: ${error.message}`);
    throw error;
  }
};

/**
 * Process yearly timeline generation
 */
const processYearlyTimelines = async () => {
  logger.info('🔄 Processing yearly timeline generation...');
  
  try {
    const now = new Date();
    const currentPeriod = getPeriodFromDate(now, 'Yearly');
    
    // Find all clients with yearly activities
    const clients = await Client.find({
      'activities.0': { $exists: true },
      status: 'active'
    }).populate('activities.activity');
    
    let processedCount = 0;
    let createdCount = 0;
    
    for (const client of clients) {
      for (const clientActivity of client.activities) {
        if (clientActivity.status !== 'active') continue;
        
        const activity = clientActivity.activity;
        if (!activity || !activity.subactivities) continue;
        
        for (const subactivity of activity.subactivities) {
          if (subactivity.frequency !== 'Yearly') continue;
          
          // Check if client is assigned this specific subactivity
          if (clientActivity.subactivity) {
            const assignedSubactivityId = clientActivity.subactivity._id || clientActivity.subactivity;
            if (assignedSubactivityId.toString() !== subactivity._id.toString()) {
              continue;
            }
          }
          
          processedCount++;
          
          // Check if timeline already exists for current period
          const exists = await timelineExistsForPeriod(
            client._id, 
            activity._id, 
            subactivity._id, 
            currentPeriod
          );
          
          if (!exists) {
            const dueDate = calculateDueDate('Yearly', subactivity.frequencyConfig, currentPeriod);
            await createTimelineForPeriod(client, activity, subactivity, currentPeriod, dueDate);
            createdCount++;
          }
        }
      }
    }
    
    logger.info(`✅ Yearly processing complete: ${processedCount} processed, ${createdCount} created`);
    return { processed: processedCount, created: createdCount };
    
  } catch (error) {
    logger.error(`❌ Error in yearly timeline processing: ${error.message}`);
    throw error;
  }
};

/**
 * Main timeline generation function
 */
const generateRecurringTimelines = async () => {
  const startTime = Date.now();
  logger.info('🚀 Starting recurring timeline generation job...');
  
  try {
    const results = {
      monthly: await processMonthlyTimelines(),
      quarterly: await processQuarterlyTimelines(),
      yearly: await processYearlyTimelines()
    };
    
    const totalProcessed = results.monthly.processed + results.quarterly.processed + results.yearly.processed;
    const totalCreated = results.monthly.created + results.quarterly.created + results.yearly.created;
    
    const duration = (Date.now() - startTime) / 1000;
    
    logger.info(`🎉 Timeline generation job completed in ${duration}s`);
    logger.info(`📊 Summary: ${totalProcessed} processed, ${totalCreated} created`);
    logger.info(`   Monthly: ${results.monthly.processed} processed, ${results.monthly.created} created`);
    logger.info(`   Quarterly: ${results.quarterly.processed} processed, ${results.quarterly.created} created`);
    logger.info(`   Yearly: ${results.yearly.processed} processed, ${results.yearly.created} created`);
    
    return results;
    
  } catch (error) {
    logger.error(`❌ Timeline generation job failed: ${error.message}`);
    logger.error(error.stack);
    throw error;
  }
};

/**
 * Schedule cron jobs
 */
const scheduleTimelineJobs = () => {
  // Run daily at 1:00 AM to check for new periods
  const dailyJob = cron.schedule('0 1 * * *', async () => {
    logger.info('⏰ Daily timeline generation job triggered');
    try {
      await generateRecurringTimelines();
    } catch (error) {
      logger.error('❌ Daily timeline job failed:', error);
    }
  }, {
    scheduled: false,
    timezone: 'Asia/Kolkata'
  });
  
  // Run on 1st of every month at 2:00 AM for monthly timelines
  const monthlyJob = cron.schedule('0 2 1 * *', async () => {
    logger.info('⏰ Monthly timeline generation job triggered');
    try {
      await processMonthlyTimelines();
    } catch (error) {
      logger.error('❌ Monthly timeline job failed:', error);
    }
  }, {
    scheduled: false,
    timezone: 'Asia/Kolkata'
  });
  
  // Run on 1st of every quarter at 3:00 AM (Jan, Apr, Jul, Oct)
  const quarterlyJob = cron.schedule('0 3 1 1,4,7,10 *', async () => {
    logger.info('⏰ Quarterly timeline generation job triggered');
    try {
      await processQuarterlyTimelines();
    } catch (error) {
      logger.error('❌ Quarterly timeline job failed:', error);
    }
  }, {
    scheduled: false,
    timezone: 'Asia/Kolkata'
  });
  
  // Run on April 1st at 4:00 AM for yearly timelines (financial year start)
  const yearlyJob = cron.schedule('0 4 1 4 *', async () => {
    logger.info('⏰ Yearly timeline generation job triggered');
    try {
      await processYearlyTimelines();
    } catch (error) {
      logger.error('❌ Yearly timeline job failed:', error);
    }
  }, {
    scheduled: false,
    timezone: 'Asia/Kolkata'
  });
  
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
    }
  };
};

export {
  generateRecurringTimelines,
  processMonthlyTimelines,
  processQuarterlyTimelines,
  processYearlyTimelines,
  scheduleTimelineJobs
};

