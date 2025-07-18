import mongoose from 'mongoose';
import Timeline from '../src/models/timeline.model.js';
import config from '../src/config/config.js';

/**
 * Script to regenerate frequency status for existing timelines
 * This will fix timelines that have empty frequencyStatus arrays
 */
async function regenerateFrequencyStatus() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    // Find timelines with empty frequencyStatus arrays
    const timelines = await Timeline.find({
      frequency: { $exists: true },
      frequencyConfig: { $exists: true },
      startDate: { $exists: true },
      endDate: { $exists: true },
      $or: [
        { frequencyStatus: { $exists: false } },
        { frequencyStatus: { $size: 0 } }
      ]
    });

    console.log(`Found ${timelines.length} timelines with empty frequency status`);

    if (timelines.length === 0) {
      console.log('No timelines need frequency status regeneration');
      return;
    }

    // Regenerate frequency status for each timeline
    let updatedCount = 0;
    for (const timeline of timelines) {
      try {
        console.log(`Processing timeline ID: ${timeline._id}`);
        console.log(`  Frequency: ${timeline.frequency}`);
        console.log(`  Start Date: ${timeline.startDate}`);
        console.log(`  End Date: ${timeline.endDate}`);
        
        // Regenerate frequency status
        await timeline.regenerateFrequencyStatus();
        
        console.log(`  ✅ Updated - Generated ${timeline.frequencyStatus.length} periods`);
        updatedCount++;
      } catch (error) {
        console.error(`  ❌ Error updating timeline ${timeline._id}:`, error.message);
      }
    }

    console.log(`\n✅ Successfully updated ${updatedCount} out of ${timelines.length} timelines`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
regenerateFrequencyStatus(); 