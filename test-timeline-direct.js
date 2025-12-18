import mongoose from 'mongoose';
import config from './src/config/config.js';
import { Timeline } from './src/models/index.js';

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test direct timeline fetch
const testDirectTimeline = async () => {
  try {
    console.log('\n🧪 Testing Direct Timeline Fetch...\n');
    
    const timelineIds = [
      '6932a39807fc564f9cbfa9fa',
      '6932a39807fc564f9cbfaa12',
      '6932a39807fc564f9cbfaa15'
    ];
    
    console.log(`📊 Fetching ${timelineIds.length} timelines directly...`);
    
    const timelines = await Timeline.find({ _id: { $in: timelineIds } })
      .populate({
        path: 'client',
        select: 'name email phone company address city state country pinCode gst branch status'
      })
      .populate({
        path: 'activity',
        select: 'name description category'
      })
      .lean();
    
    console.log(`✅ Found ${timelines.length} timelines\n`);
    
    timelines.forEach((timeline, index) => {
      console.log(`\n📅 Timeline ${index + 1}:`);
      console.log(`   ID: ${timeline._id}`);
      console.log(`   Status: ${timeline.status || 'N/A'}`);
      console.log(`   Frequency: ${timeline.frequency || 'N/A'}`);
      console.log(`   Timeline Type: ${timeline.timelineType || 'N/A'}`);
      
      // Check client
      if (timeline.client) {
        if (typeof timeline.client === 'string') {
          console.log(`   ❌ Client is ID string: ${timeline.client}`);
        } else if (typeof timeline.client === 'object') {
          console.log(`   ✅ Client is populated:`);
          console.log(`      Name: ${timeline.client.name || 'N/A'}`);
          console.log(`      Email: ${timeline.client.email || 'N/A'}`);
          console.log(`      Phone: ${timeline.client.phone || 'N/A'}`);
        }
      } else {
        console.log(`   ⚠️ Client is null or undefined`);
      }
      
      // Check activity
      if (timeline.activity) {
        if (typeof timeline.activity === 'string') {
          console.log(`   ❌ Activity is ID string: ${timeline.activity}`);
        } else if (typeof timeline.activity === 'object') {
          console.log(`   ✅ Activity is populated:`);
          console.log(`      Name: ${timeline.activity.name || 'N/A'}`);
          console.log(`      Description: ${timeline.activity.description || 'N/A'}`);
        }
      } else {
        console.log(`   ⚠️ Activity is null or undefined`);
      }
    });
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.error(error.stack);
  }
};

// Main function
const runTest = async () => {
  try {
    await connectDB();
    await testDirectTimeline();
    console.log('\n✅ Test completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

runTest();

