import mongoose from 'mongoose';
import Activity from './src/models/activity.model.js';

// Test creating activity with subactivities
async function testActivityWithSubactivities() {
  try {
    console.log('🧪 Testing Activity Creation with Subactivities...\n');

    // Test 1: Create activity with subactivities in same request
    const activityWithSubs = new Activity({
      name: 'Project Planning',
      sortOrder: 1,
      subactivities: [
        { name: 'Define Scope' },
        { name: 'Create Timeline' },
        { name: 'Assign Resources' }
      ]
    });

    await activityWithSubs.save();
    console.log('✅ Activity created with subactivities:');
    console.log(`   Name: ${activityWithSubs.name}`);
    console.log(`   Subactivities: ${activityWithSubs.subactivities.length}`);
    activityWithSubs.subactivities.forEach((sub, index) => {
      console.log(`     ${index + 1}. ${sub.name} (ID: ${sub._id})`);
    });

    // Test 2: Add more subactivities to existing activity
    activityWithSubs.subactivities.push({ name: 'Risk Assessment' });
    await activityWithSubs.save();
    console.log('\n✅ Added another subactivity:');
    console.log(`   Total subactivities: ${activityWithSubs.subactivities.length}`);

    // Test 3: Update a subactivity
    const subToUpdate = activityWithSubs.subactivities[0];
    subToUpdate.name = 'Define Project Scope';
    await activityWithSubs.save();
    console.log('\n✅ Updated subactivity:');
    console.log(`   Updated: ${subToUpdate.name}`);

    // Test 4: Delete a subactivity
    const subToDelete = activityWithSubs.subactivities[1];
    subToDelete.deleteOne();
    await activityWithSubs.save();
    console.log('\n✅ Deleted subactivity:');
    console.log(`   Remaining: ${activityWithSubs.subactivities.length}`);

    // Clean up
    await Activity.deleteOne({ _id: activityWithSubs._id });
    console.log('\n✅ Test cleanup completed');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testActivityWithSubactivities();
}

export default testActivityWithSubactivities;
