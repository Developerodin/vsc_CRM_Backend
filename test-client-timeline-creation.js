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

// Verify activity and subactivity exist
const verifyActivityData = async () => {
  try {
    console.log('\n🔍 Verifying activity and subactivity data...');
    
    const activity = await Activity.findById(ACTIVITY_ID);
    if (!activity) {
      throw new Error(`Activity with ID ${ACTIVITY_ID} not found`);
    }
    
    console.log(`✅ Found activity: ${activity.name}`);
    console.log(`📊 Activity has ${activity.subactivities?.length || 0} subactivities`);
    
    if (activity.subactivities && activity.subactivities.length > 0) {
      const subactivity = activity.subactivities.find(sub => sub._id.toString() === SUBACTIVITY_ID);
      if (subactivity) {
        console.log(`✅ Found subactivity: ${subactivity.name}`);
        console.log(`📅 Subactivity frequency: ${subactivity.frequency}`);
        console.log(`⚙️ Subactivity frequency config:`, subactivity.frequencyConfig);
      } else {
        console.log(`⚠️ Subactivity with ID ${SUBACTIVITY_ID} not found in activity`);
        console.log(`📋 Available subactivity IDs:`, activity.subactivities.map(sub => sub._id.toString()));
      }
    }
    
    return activity;
  } catch (error) {
    console.error('❌ Error verifying activity data:', error);
    throw error;
  }
};

// Create test client
const createTestClient = async (activity) => {
  try {
    console.log('\n🧪 Creating test client...');
    
    // Check if test client already exists
    let testClient = await Client.findOne({ name: 'Test Client Timeline Debug' });
    
    if (testClient) {
      console.log('⚠️ Test client already exists, deleting old one...');
      await Client.deleteOne({ _id: testClient._id });
      await Timeline.deleteMany({ client: testClient._id });
    }
    
    // Create new test client
    const testClientData = {
      name: 'Test Client Timeline Debug',
      email: 'test-timeline@example.com',
      phone: '+919876543213',
      branch: new mongoose.Types.ObjectId(), // Mock branch ID
      activities: [
        {
          activity: ACTIVITY_ID,
          subactivity: SUBACTIVITY_ID, // Assign specific subactivity
          status: 'active'
        }
      ]
    };
    
    console.log('📝 Client data to create:', JSON.stringify(testClientData, null, 2));
    
    testClient = await Client.create(testClientData);
    console.log('✅ Test client created successfully');
    console.log(`📋 Client ID: ${testClient._id}`);
    console.log(`📋 Client activities:`, testClient.activities);
    
    return testClient;
  } catch (error) {
    console.error('❌ Error creating test client:', error);
    throw error;
  }
};

// Check created timelines
const checkTimelines = async (testClient) => {
  try {
    console.log('\n📊 Checking created timelines...');
    
    // Wait a bit for the post-save middleware to complete
    console.log('⏳ Waiting for timeline creation to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const timelines = await Timeline.find({ client: testClient._id });
    console.log(`📊 Found ${timelines.length} timelines for test client`);
    
    if (timelines.length > 0) {
      console.log('\n📅 Timeline details:');
      timelines.forEach((timeline, index) => {
        console.log(`\n${index + 1}. Timeline ID: ${timeline._id}`);
        console.log(`   Activity: ${timeline.activity}`);
        if (timeline.subactivity && typeof timeline.subactivity === 'object') {
          console.log(`   Subactivity: ${timeline.subactivity.name || 'Unnamed'} (ID: ${timeline.subactivity._id})`);
        } else {
          console.log(`   Subactivity: ${timeline.subactivity || 'None'}`);
        }
        console.log(`   Status: ${timeline.status}`);
        console.log(`   Due Date: ${timeline.dueDate}`);
        console.log(`   Start Date: ${timeline.startDate}`);
        console.log(`   End Date: ${timeline.endDate}`);
        console.log(`   Frequency: ${timeline.frequency}`);
        console.log(`   Timeline Type: ${timeline.timelineType}`);
        console.log(`   Financial Year: ${timeline.financialYear}`);
        console.log(`   Period: ${timeline.period}`);
        console.log(`   Branch: ${timeline.branch}`);
        console.log(`   Created At: ${timeline.createdAt}`);
      });
      
      return timelines;
    } else {
      console.log('⚠️ No timelines were created');
      return [];
    }
  } catch (error) {
    console.error('❌ Error checking timelines:', error);
    throw error;
  }
};

// Clean up test data
const cleanupTestData = async (testClient) => {
  try {
    console.log('\n🧹 Skipping cleanup - keeping data for inspection...');
    
    if (testClient) {
      console.log(`📋 Client ID to keep: ${testClient._id}`);
      console.log(`📋 Client name: ${testClient.name}`);
      console.log(`📋 Client email: ${testClient.email}`);
      
      // Count timelines
      const timelineCount = await Timeline.countDocuments({ client: testClient._id });
      console.log(`📊 Total timelines created: ${timelineCount}`);
    }
    
    console.log('✅ Data kept for inspection');
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
};

// Main test function
const runTest = async () => {
  let testClient;
  
  try {
    await connectDB();
    
    console.log('\n🧪 Starting timeline creation debug test...\n');
    console.log(`🎯 Testing with Activity ID: ${ACTIVITY_ID}`);
    console.log(`🎯 Testing with Subactivity ID: ${SUBACTIVITY_ID}\n`);
    
    // Verify activity data exists
    const activity = await verifyActivityData();
    
    // Create test client
    testClient = await createTestClient(activity);
    
    // Check created timelines
    const timelines = await checkTimelines(testClient);
    
    if (timelines.length > 0) {
      console.log('\n🎉 SUCCESS: Timeline creation is working!');
      console.log(`   Created ${timelines.length} timelines for the test client.`);
      
      // Additional analysis
      const recurringTimelines = timelines.filter(t => t.timelineType === 'recurring');
      const oneTimeTimelines = timelines.filter(t => t.timelineType === 'oneTime');
      
      console.log(`   - Recurring timelines: ${recurringTimelines.length}`);
      console.log(`   - One-time timelines: ${oneTimeTimelines.length}`);
      
      // Check if timelines are in current financial year
      const currentFY = new Date().getMonth() >= 3 
        ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
        : `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
      
      const allSameFY = timelines.every(t => t.financialYear === currentFY);
      console.log(`   - All timelines in current financial year (${currentFY}): ${allSameFY ? '✅ Yes' : '❌ No'}`);
      
    } else {
      console.log('\n⚠️ WARNING: No timelines were created!');
      console.log('   This indicates there is an issue with the timeline creation process.');
      console.log('   Check the console logs above for any errors or issues.');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Error stack:', error.stack);
  } finally {
    // Clean up test data
    if (testClient) {
      await cleanupTestData(testClient);
    }
    
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the test
console.log('🚀 Starting timeline creation debug test...');
runTest();
