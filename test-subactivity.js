import mongoose from 'mongoose';
import Activity from './src/models/activity.model.js';

// Test subactivity functionality
async function testSubactivity() {
  try {
    // Create a test activity
    const activity = new Activity({
      name: 'Test Activity',
      sortOrder: 1,
      subactivities: [
        { name: 'Subactivity 1' },
        { name: 'Subactivity 2' }
      ]
    });

    await activity.save();
    console.log('✅ Activity created with subactivities:', activity);

    // Add a new subactivity
    activity.subactivities.push({ name: 'Subactivity 3' });
    await activity.save();
    console.log('✅ New subactivity added:', activity.subactivities);

    // Update a subactivity
    const subactivityToUpdate = activity.subactivities[0];
    subactivityToUpdate.name = 'Updated Subactivity 1';
    await activity.save();
    console.log('✅ Subactivity updated:', subactivityToUpdate);

    // Delete a subactivity
    const subactivityToDelete = activity.subactivities[1];
    subactivityToDelete.deleteOne();
    await activity.save();
    console.log('✅ Subactivity deleted. Remaining:', activity.subactivities);

    // Clean up
    await Activity.deleteOne({ _id: activity._id });
    console.log('✅ Test cleanup completed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSubactivity();
}

export default testSubactivity;
