import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from '../src/config/config.js';
import logger from '../src/config/logger.js';

// Import the Timeline model to register the schema
import '../src/models/timeline.model.js';

// Load environment variables
dotenv.config();

/**
 * Test the migration by checking a few timelines
 */
const testMigration = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('Connected to MongoDB');
    
    // Get the Timeline model after schema registration
    const Timeline = mongoose.model('Timeline');
    
    // Get a few timelines to check
    const timelines = await Timeline.find().limit(5);
    
    logger.info(`Found ${timelines.length} timelines to test`);
    
    for (const timeline of timelines) {
      logger.info(`\nTimeline ID: ${timeline._id}`);
      logger.info(`Frequency: ${timeline.frequency}`);
      logger.info(`Status: ${timeline.status}`);
      logger.info(`Start Date: ${timeline.startDate}`);
      logger.info(`End Date: ${timeline.endDate}`);
      logger.info(`Has frequencyStatus: ${timeline.frequencyStatus ? 'Yes' : 'No'}`);
      
      if (timeline.frequencyStatus && timeline.frequencyStatus.length > 0) {
        logger.info(`Frequency Status Count: ${timeline.frequencyStatus.length}`);
        logger.info(`First Period: ${timeline.frequencyStatus[0].period}`);
        logger.info(`First Status: ${timeline.frequencyStatus[0].status}`);
      } else {
        logger.info('No frequency status found');
      }
    }
    
    // Check overall statistics
    const totalTimelines = await Timeline.countDocuments();
    const timelinesWithFrequencyStatus = await Timeline.countDocuments({
      frequencyStatus: { $exists: true, $ne: [] }
    });
    
    logger.info(`\nOverall Statistics:`);
    logger.info(`- Total timelines: ${totalTimelines}`);
    logger.info(`- Timelines with frequency status: ${timelinesWithFrequencyStatus}`);
    logger.info(`- Migration coverage: ${((timelinesWithFrequencyStatus / totalTimelines) * 100).toFixed(2)}%`);
    
    logger.info('Test completed successfully');
    process.exit(0);
    
  } catch (error) {
    logger.error(`Test failed: ${error.message}`);
    process.exit(1);
  }
};

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testMigration();
}

export { testMigration }; 