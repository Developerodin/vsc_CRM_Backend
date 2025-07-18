import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from '../src/config/config.js';
import logger from '../src/config/logger.js';

// Import the Timeline model to register the schema
import '../src/models/timeline.model.js';

// Load environment variables
dotenv.config();

/**
 * Generate frequency periods based on frequency type and configuration
 * @param {string} frequency - Frequency type
 * @param {Object} frequencyConfig - Frequency configuration
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array<string>} - Array of period identifiers
 */
const generateFrequencyPeriods = (frequency, frequencyConfig, startDate, endDate) => {
  const periods = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  switch (frequency) {
    case 'Hourly':
      let currentHour = new Date(start);
      while (currentHour <= end) {
        const period = currentHour.toISOString().slice(0, 13).replace('T', '-');
        periods.push(period);
        currentHour.setHours(currentHour.getHours() + (frequencyConfig.hourlyInterval || 1));
      }
      break;
      
    case 'Daily':
      let currentDay = new Date(start);
      while (currentDay <= end) {
        const period = currentDay.toISOString().slice(0, 10);
        periods.push(period);
        currentDay.setDate(currentDay.getDate() + 1);
      }
      break;
      
    case 'Weekly':
      let currentWeek = new Date(start);
      while (currentWeek <= end) {
        const year = currentWeek.getFullYear();
        const weekNumber = Math.ceil((currentWeek.getDate() + new Date(year, 0, 1).getDay()) / 7);
        const period = `${year}-W${weekNumber.toString().padStart(2, '0')}`;
        periods.push(period);
        currentWeek.setDate(currentWeek.getDate() + 7);
      }
      break;
      
    case 'Monthly':
      let currentMonth = new Date(start);
      while (currentMonth <= end) {
        const period = currentMonth.toISOString().slice(0, 7);
        periods.push(period);
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
      break;
      
    case 'Quarterly':
      let currentQuarter = new Date(start);
      while (currentQuarter <= end) {
        const year = currentQuarter.getFullYear();
        const month = currentQuarter.getMonth();
        const quarter = Math.floor(month / 3) + 1;
        const period = `${year}-Q${quarter}`;
        periods.push(period);
        currentQuarter.setMonth(currentQuarter.getMonth() + 3);
      }
      break;
      
    case 'Yearly':
      let currentYear = new Date(start);
      while (currentYear <= end) {
        const period = currentYear.getFullYear().toString();
        periods.push(period);
        currentYear.setFullYear(currentYear.getFullYear() + 1);
      }
      break;
  }
  
  return periods;
};

/**
 * Initialize frequency status for a timeline
 * @param {Object} timeline - Timeline object
 * @returns {Array} - Array of frequency status objects
 */
const initializeFrequencyStatus = (timeline) => {
  if (!timeline.startDate || !timeline.endDate) {
    return [];
  }
  
  const periods = generateFrequencyPeriods(
    timeline.frequency,
    timeline.frequencyConfig,
    timeline.startDate,
    timeline.endDate
  );
  
  return periods.map(period => ({
    period,
    status: 'pending',
    completedAt: null,
    notes: ''
  }));
};

/**
 * Determine initial status based on existing timeline status
 * @param {string} timelineStatus - Current timeline status
 * @returns {string} - Initial frequency status
 */
const getInitialFrequencyStatus = (timelineStatus) => {
  switch (timelineStatus) {
    case 'completed':
      return 'completed';
    case 'delayed':
      return 'delayed';
    case 'ongoing':
      return 'ongoing';
    default:
      return 'pending';
  }
};

/**
 * Migrate existing timelines to include frequency status
 */
const migrateFrequencyStatus = async () => {
  try {
    logger.info('Starting frequency status migration...');
    
    // Get the Timeline model after schema registration
    const Timeline = mongoose.model('Timeline');
    
    // Get all timelines that don't have frequencyStatus field
    const timelines = await Timeline.find({
      $or: [
        { frequencyStatus: { $exists: false } },
        { frequencyStatus: { $size: 0 } }
      ]
    });
    
    logger.info(`Found ${timelines.length} timelines to migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const timeline of timelines) {
      try {
        let frequencyStatus = [];
        
        // If timeline has start and end dates, generate frequency periods
        if (timeline.startDate && timeline.endDate) {
          frequencyStatus = initializeFrequencyStatus(timeline);
          
          // If timeline is already completed, mark all periods as completed
          if (timeline.status === 'completed') {
            frequencyStatus = frequencyStatus.map(fs => ({
              ...fs,
              status: 'completed',
              completedAt: timeline.updatedAt || new Date()
            }));
          } else if (timeline.status === 'delayed') {
            // Mark first period as delayed, rest as pending
            frequencyStatus = frequencyStatus.map((fs, index) => ({
              ...fs,
              status: index === 0 ? 'delayed' : 'pending'
            }));
          } else if (timeline.status === 'ongoing') {
            // Mark first period as ongoing, rest as pending
            frequencyStatus = frequencyStatus.map((fs, index) => ({
              ...fs,
              status: index === 0 ? 'ongoing' : 'pending'
            }));
          }
        } else {
          // For timelines without start/end dates, create a single period
          const currentYear = new Date().getFullYear();
          let period = currentYear.toString();
          
          // Adjust period based on frequency
          switch (timeline.frequency) {
            case 'Hourly':
              period = new Date().toISOString().slice(0, 13).replace('T', '-');
              break;
            case 'Daily':
              period = new Date().toISOString().slice(0, 10);
              break;
            case 'Weekly':
              const weekNumber = Math.ceil((new Date().getDate() + new Date(currentYear, 0, 1).getDay()) / 7);
              period = `${currentYear}-W${weekNumber.toString().padStart(2, '0')}`;
              break;
            case 'Monthly':
              period = new Date().toISOString().slice(0, 7);
              break;
            case 'Quarterly':
              const month = new Date().getMonth();
              const quarter = Math.floor(month / 3) + 1;
              period = `${currentYear}-Q${quarter}`;
              break;
          }
          
          frequencyStatus = [{
            period,
            status: getInitialFrequencyStatus(timeline.status),
            completedAt: timeline.status === 'completed' ? (timeline.updatedAt || new Date()) : null,
            notes: ''
          }];
        }
        
        // Update the timeline with frequency status
        await Timeline.updateOne(
          { _id: timeline._id },
          { 
            $set: { frequencyStatus },
            $unset: { __v: 1 } // Remove version key if it exists
          }
        );
        
        migratedCount++;
        logger.info(`Migrated timeline ${timeline._id} with ${frequencyStatus.length} frequency periods`);
        
      } catch (error) {
        errorCount++;
        logger.error(`Error migrating timeline ${timeline._id}: ${error.message}`);
      }
    }
    
    logger.info(`Migration completed!`);
    logger.info(`- Migrated: ${migratedCount} timelines`);
    logger.info(`- Skipped: ${skippedCount} timelines`);
    logger.info(`- Errors: ${errorCount} timelines`);
    
    // Verify migration
    const totalTimelines = await Timeline.countDocuments();
    const timelinesWithFrequencyStatus = await Timeline.countDocuments({
      frequencyStatus: { $exists: true, $ne: [] }
    });
    
    logger.info(`Verification:`);
    logger.info(`- Total timelines: ${totalTimelines}`);
    logger.info(`- Timelines with frequency status: ${timelinesWithFrequencyStatus}`);
    
  } catch (error) {
    logger.error(`Migration failed: ${error.message}`);
    throw error;
  }
};

/**
 * Main execution function
 */
const main = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('Connected to MongoDB');
    
    // Run migration
    await migrateFrequencyStatus();
    
    logger.info('Migration script completed successfully');
    process.exit(0);
    
  } catch (error) {
    logger.error(`Migration script failed: ${error.message}`);
    process.exit(1);
  }
};

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { migrateFrequencyStatus }; 