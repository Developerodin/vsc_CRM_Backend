import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from './src/models/client.model.js';
import Activity from './src/models/activity.model.js';
import Timeline from './src/models/timeline.model.js';

// Load environment variables
dotenv.config();

// Your specific IDs
const ACTIVITY_ID = '68b1a141564f514accb9b501';
const SUBACTIVITY_ID = '68b1a141564f514accb9b502';

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

// Check existing timelines and their fields
const checkTimelineFields = async () => {
  try {
    console.log('\n🔍 Checking existing timelines and their fields...');
    
    // Find the test client
    const testClient = await Client.findOne({ name: 'Test Client Timeline Debug' });
    if (!testClient) {
      console.log('⚠️ Test client not found. Please run the timeline creation test first.');
      return;
    }
    
    console.log(`✅ Found test client: ${testClient.name} (ID: ${testClient._id})`);
    
    // Get timelines for this client
    const timelines = await Timeline.find({ client: testClient._id }).populate([
      { path: 'activity', select: 'name' },
      { path: 'subactivity', select: 'name fields' }
    ]);
    
    console.log(`📊 Found ${timelines.length} timelines for the test client`);
    
    if (timelines.length > 0) {
      console.log('\n📅 Timeline details with fields:');
      
      timelines.forEach((timeline, index) => {
        console.log(`\n${index + 1}. Timeline ID: ${timeline._id}`);
        console.log(`   Activity: ${timeline.activity?.name || 'N/A'}`);
        console.log(`   Subactivity: ${timeline.subactivity?.name || 'N/A'}`);
        console.log(`   Status: ${timeline.status}`);
        console.log(`   Due Date: ${timeline.dueDate}`);
        console.log(`   Frequency: ${timeline.frequency}`);
        console.log(`   Timeline Type: ${timeline.timelineType}`);
        console.log(`   Financial Year: ${timeline.financialYear}`);
        console.log(`   Period: ${timeline.period}`);
        
        // Check fields
        console.log(`   📋 Fields count: ${timeline.fields?.length || 0}`);
        if (timeline.fields && timeline.fields.length > 0) {
          timeline.fields.forEach((field, fieldIndex) => {
            console.log(`      ${fieldIndex + 1}. ${field.fileName} (${field.fieldType}): ${field.fieldValue || 'null'}`);
          });
        } else {
          console.log('      ⚠️ No fields found in timeline');
        }
        
        // Check subactivity fields for comparison
        if (timeline.subactivity && timeline.subactivity.fields) {
          console.log(`   🔍 Subactivity fields count: ${timeline.subactivity.fields.length}`);
          timeline.subactivity.fields.forEach((field, fieldIndex) => {
            console.log(`      ${fieldIndex + 1}. ${field.name} (${field.type}): ${field.required ? 'required' : 'optional'}`);
          });
        }
      });
      
      // Summary
      const timelinesWithFields = timelines.filter(t => t.fields && t.fields.length > 0);
      const timelinesWithoutFields = timelines.filter(t => !t.fields || t.fields.length === 0);
      
      console.log('\n📊 Summary:');
      console.log(`   - Timelines with fields: ${timelinesWithFields.length}`);
      console.log(`   - Timelines without fields: ${timelinesWithoutFields.length}`);
      
      if (timelinesWithFields.length > 0) {
        console.log('   ✅ Fields are being copied to timelines correctly!');
      } else {
        console.log('   ❌ No fields are being copied to timelines');
      }
      
    } else {
      console.log('⚠️ No timelines found for the test client');
    }
    
  } catch (error) {
    console.error('❌ Error checking timeline fields:', error);
  }
};

// Create a new test client with an activity that has fields to test field copying
const createTestClientWithFields = async () => {
  try {
    console.log('\n🧪 Creating new test client to test field copying...');
    
    // First, let's check if the activity has fields
    const activity = await Activity.findById(ACTIVITY_ID);
    if (!activity) {
      console.log('❌ Activity not found');
      return;
    }
    
    console.log(`✅ Found activity: ${activity.name}`);
    
    // Find the specific subactivity
    const subactivity = activity.subactivities?.find(sub => sub._id.toString() === SUBACTIVITY_ID);
    if (subactivity) {
      console.log(`✅ Found subactivity: ${subactivity.name}`);
      console.log(`📋 Subactivity has ${subactivity.fields?.length || 0} fields`);
      
      if (subactivity.fields && subactivity.fields.length > 0) {
        subactivity.fields.forEach((field, index) => {
          console.log(`   ${index + 1}. ${field.name} (${field.type}): ${field.required ? 'required' : 'optional'}`);
        });
      }
    }
    
    // Create a new test client with a different name
    const testClientData = {
      name: 'Test Client Fields Debug',
      email: 'test-fields@example.com',
      phone: '+919876543214',
      branch: new mongoose.Types.ObjectId(),
      activities: [
        {
          activity: ACTIVITY_ID,
          subactivity: SUBACTIVITY_ID,
          status: 'active'
        }
      ]
    };
    
    const testClient = await Client.create(testClientData);
    console.log('✅ New test client created successfully');
    console.log(`📋 Client ID: ${testClient._id}`);
    
    // Wait for timeline creation
    console.log('⏳ Waiting for timeline creation...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check the new timelines
    const newTimelines = await Timeline.find({ client: testClient._id });
    console.log(`📊 Created ${newTimelines.length} new timelines`);
    
    // Check fields in new timelines
    if (newTimelines.length > 0) {
      const firstTimeline = newTimelines[0];
      console.log('\n📋 First timeline fields:');
      console.log(`   Fields count: ${firstTimeline.fields?.length || 0}`);
      
      if (firstTimeline.fields && firstTimeline.fields.length > 0) {
        firstTimeline.fields.forEach((field, index) => {
          console.log(`   ${index + 1}. ${field.fileName} (${field.fieldType}): ${field.fieldValue || 'null'}`);
        });
      }
    }
    
    return testClient;
    
  } catch (error) {
    console.error('❌ Error creating test client with fields:', error);
  }
};

// Main function
const runTest = async () => {
  try {
    await connectDB();
    
    console.log('\n🧪 Starting timeline fields test...\n');
    
    // Check existing timelines
    await checkTimelineFields();
    
    // Create new test client to test field copying
    await createTestClientWithFields();
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the test
console.log('🚀 Starting timeline fields test...');
runTest();
