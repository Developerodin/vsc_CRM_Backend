import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

console.log('Fix frequency status script starting...');

/**
 * Validate and clean frequency status array
 * @param {Array} frequencyStatus - Frequency status array
 * @returns {Array} - Cleaned frequency status array
 */
const validateAndCleanFrequencyStatus = (frequencyStatus) => {
  if (!Array.isArray(frequencyStatus)) {
    return [];
  }
  
  return frequencyStatus.filter(fs => 
    fs && 
    typeof fs === 'object' && 
    fs.period && 
    typeof fs.period === 'string' &&
    fs.status && 
    ['pending', 'completed', 'delayed', 'ongoing'].includes(fs.status)
  );
};

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
    
    // Find all timelines with frequency status
    const timelines = await Timeline.find({
      frequencyStatus: { $exists: true, $ne: [] }
    });
    
    console.log(`Found ${timelines.length} timelines with frequency status`);
    
    let fixedCount = 0;
    let errorCount = 0;
    
    for (const timeline of timelines) {
      try {
        const originalLength = timeline.frequencyStatus.length;
        const cleanedFrequencyStatus = validateAndCleanFrequencyStatus(timeline.frequencyStatus);
        
        if (cleanedFrequencyStatus.length !== originalLength) {
          console.log(`Fixing timeline ${timeline._id}: ${originalLength} -> ${cleanedFrequencyStatus.length} entries`);
          
          // Update the timeline with cleaned frequency status
          await Timeline.updateOne(
            { _id: timeline._id },
            { $set: { frequencyStatus: cleanedFrequencyStatus } }
          );
          
          fixedCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`Error fixing timeline ${timeline._id}: ${error.message}`);
      }
    }
    
    console.log(`\nFix completed!`);
    console.log(`- Fixed: ${fixedCount} timelines`);
    console.log(`- Errors: ${errorCount} timelines`);
    
    // Verify the fix
    const totalTimelines = await Timeline.countDocuments({
      frequencyStatus: { $exists: true, $ne: [] }
    });
    
    console.log(`\nVerification:`);
    console.log(`- Total timelines with frequency status: ${totalTimelines}`);
    
    console.log('Fix script completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error(`Fix script failed: ${error.message}`);
    process.exit(1);
  }
};

main(); 