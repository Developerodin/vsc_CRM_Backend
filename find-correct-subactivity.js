import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Find the correct subactivity ID
const findCorrectSubactivity = async () => {
  try {
    console.log('\n🔍 Finding Correct Subactivity ID...\n');
    
    const Timeline = mongoose.model('Timeline');
    const Activity = mongoose.model('Activity');
    
    // Get the specific timeline you mentioned
    const timeline = await Timeline.findById('68b29f707724b444a07a48f5');
    
    if (!timeline) {
      console.log('❌ Timeline not found');
      return;
    }
    
    console.log('📋 Timeline Details:');
    console.log(`   ID: ${timeline._id}`);
    console.log(`   Activity: ${timeline.activity}`);
    console.log(`   Period: ${timeline.period}`);
    console.log(`   Frequency: ${timeline.frequency}`);
    console.log(`   Subactivity ID: ${timeline.subactivity._id}`);
    console.log(`   Subactivity Name: ${timeline.subactivity.name}`);
    
    // Get the activity to see all subactivities
    const activity = await Activity.findById(timeline.activity);
    
    if (!activity) {
      console.log('❌ Activity not found');
      return;
    }
    
    console.log(`\n📋 Activity: ${activity.name}`);
    console.log(`📊 Total Subactivities: ${activity.subactivities.length}`);
    
    console.log('\n📅 All Subactivities in this Activity:');
    activity.subactivities.forEach((subactivity, index) => {
      console.log(`\n${index + 1}. Subactivity ID: ${subactivity._id}`);
      console.log(`   Name: ${subactivity.name}`);
      console.log(`   Frequency: ${subactivity.frequency}`);
      console.log(`   Frequency Config: ${JSON.stringify(subactivity.frequencyConfig, null, 2)}`);
    });
    
    // Find the subactivity that matches your timeline
    const matchingSubactivity = activity.subactivities.find(
      sub => sub._id.toString() === timeline.subactivity._id.toString()
    );
    
    if (matchingSubactivity) {
      console.log(`\n✅ MATCHING SUBACTIVITY FOUND:`);
      console.log(`   ID: ${matchingSubactivity._id}`);
      console.log(`   Name: ${matchingSubactivity.name}`);
      console.log(`   Frequency: ${matchingSubactivity.frequency}`);
    } else {
      console.log('\n❌ No matching subactivity found in activity');
    }
    
    // Now let's test the API call with the CORRECT subactivity ID
    console.log('\n🧪 Testing API Call with CORRECT Subactivity ID...');
    
    const correctSubactivityId = timeline.subactivity._id;
    const testFilter = {
      activity: timeline.activity,
      'subactivity._id': correctSubactivityId,
      frequency: { $regex: 'Quarterly', $options: 'i' },
      period: { $regex: 'April-2025', $options: 'i' }
    };
    
    console.log('\n🔍 Filter Applied:');
    console.log(JSON.stringify(testFilter, null, 2));
    
    const results = await Timeline.find(testFilter);
    
    console.log(`\n📊 Results: Found ${results.length} timelines`);
    
    if (results.length > 0) {
      console.log('\n📅 Timeline Details:');
      results.forEach((timeline, index) => {
        console.log(`\n${index + 1}. Timeline ID: ${timeline._id}`);
        console.log(`   Activity: ${timeline.activity}`);
        console.log(`   Subactivity: ${timeline.subactivity.name} (ID: ${timeline.subactivity._id})`);
        console.log(`   Frequency: ${timeline.frequency}`);
        console.log(`   Period: ${timeline.period}`);
        console.log(`   Status: ${timeline.status}`);
      });
      
      console.log('\n🎉 SUCCESS: Your API call should work with the CORRECT subactivity ID!');
      console.log(`\n💡 Correct API Call:`);
      console.log(`GET /v1/timelines?limit=1000&activity=${timeline.activity}&subactivity=${correctSubactivityId}&frequency=Quarterly&period=April-2025`);
      
    } else {
      console.log('\n⚠️ Still no results found. Check the filter logic.');
    }
    
    return matchingSubactivity;
    
  } catch (error) {
    console.error('❌ Error finding subactivity:', error);
    throw error;
  }
};

// Main function
const runTest = async () => {
  try {
    await connectDB();
    
    console.log('🚀 Finding Correct Subactivity ID...\n');
    
    // Find correct subactivity
    await findCorrectSubactivity();
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error stack:', error.stack);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the test
console.log('🚀 Starting subactivity ID finder...');
runTest();
