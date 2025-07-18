import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('Test migration script starting...');

const main = async () => {
  try {
    console.log('Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
    
    // Import the Timeline model
    await import('../src/models/timeline.model.js');
    const Timeline = mongoose.model('Timeline');
    
    // Get a few timelines to check
    const timelines = await Timeline.find().limit(5);
    
    console.log(`\nFound ${timelines.length} timelines to test`);
    
    for (const timeline of timelines) {
      console.log(`\nTimeline ID: ${timeline._id}`);
      console.log(`Frequency: ${timeline.frequency}`);
      console.log(`Status: ${timeline.status}`);
      console.log(`Start Date: ${timeline.startDate}`);
      console.log(`End Date: ${timeline.endDate}`);
      console.log(`Has frequencyStatus: ${timeline.frequencyStatus ? 'Yes' : 'No'}`);
      
      if (timeline.frequencyStatus && timeline.frequencyStatus.length > 0) {
        console.log(`Frequency Status Count: ${timeline.frequencyStatus.length}`);
        console.log(`First Period: ${timeline.frequencyStatus[0].period}`);
        console.log(`First Status: ${timeline.frequencyStatus[0].status}`);
        
        // Show all periods for this timeline
        console.log('All periods:');
        timeline.frequencyStatus.forEach((fs, index) => {
          console.log(`  ${index + 1}. ${fs.period} - ${fs.status}`);
        });
      } else {
        console.log('No frequency status found');
      }
    }
    
    // Check overall statistics
    const totalTimelines = await Timeline.countDocuments();
    const timelinesWithFrequencyStatus = await Timeline.countDocuments({
      frequencyStatus: { $exists: true, $ne: [] }
    });
    
    console.log(`\nOverall Statistics:`);
    console.log(`- Total timelines: ${totalTimelines}`);
    console.log(`- Timelines with frequency status: ${timelinesWithFrequencyStatus}`);
    console.log(`- Migration coverage: ${((timelinesWithFrequencyStatus / totalTimelines) * 100).toFixed(2)}%`);
    
    console.log('\nTest completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    process.exit(1);
  }
};

main(); 