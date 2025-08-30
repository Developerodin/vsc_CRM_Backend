import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Activity from './src/models/activity.model.js';
import Client from './src/models/client.model.js';
import Timeline from './src/models/timeline.model.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create test data
const createTestData = async () => {
  try {
    console.log('\n🧪 Creating test data...');
    
    // Create test activity
    const testActivity = await Activity.create({
      name: 'Test Activity for Timeline DB',
      sortOrder: 1,
      subactivities: [
        {
          name: 'Monthly GST Filing',
          frequency: 'Monthly',
          frequencyConfig: {
            monthlyDay: 20,
            monthlyTime: '09:00 AM'
          }
        },
        {
          name: 'Quarterly TDS Filing',
          frequency: 'Quarterly',
          frequencyConfig: {
            quarterlyMonths: ['April', 'July', 'October', 'January'],
            quarterlyDay: 15,
            quarterlyTime: '10:00 AM'
          }
        }
      ]
    });
    console.log('✅ Test activity created:', testActivity.name);
    
    // Create test client (this should trigger timeline creation)
    const testClient = await Client.create({
      name: 'Test Client for Timeline DB',
      email: 'testdb@example.com',
      phone: '+919876543212',
      branch: new mongoose.Types.ObjectId(), // Mock branch ID
      activities: [
        {
          activity: testActivity._id,
          status: 'active'
        }
      ]
    });
    console.log('✅ Test client created:', testClient.name);
    
    return { testActivity, testClient };
  } catch (error) {
    console.error('❌ Error creating test data:', error);
    throw error;
  }
};

// Check created timelines
const checkTimelines = async (testClient) => {
  try {
    console.log('\n📊 Checking created timelines...');
    
    const timelines = await Timeline.find({ client: testClient._id });
    console.log(`Found ${timelines.length} timelines for test client`);
    
    if (timelines.length > 0) {
      console.log('\n📅 Timeline details:');
      timelines.forEach((timeline, index) => {
        console.log(`\n${index + 1}. Activity: ${timeline.activity}`);
        console.log(`   Subactivity: ${timeline.subactivity || 'None'}`);
        console.log(`   Status: ${timeline.status}`);
        console.log(`   Due Date: ${timeline.dueDate}`);
        console.log(`   Frequency: ${timeline.frequency}`);
        console.log(`   Timeline Type: ${timeline.timelineType}`);
        console.log(`   Financial Year: ${timeline.financialYear}`);
        console.log(`   Period: ${timeline.period}`);
        console.log(`   Branch: ${timeline.branch}`);
      });
      
      return timelines;
    } else {
      console.log('⚠️  No timelines were created');
      return [];
    }
  } catch (error) {
    console.error('❌ Error checking timelines:', error);
    throw error;
  }
};

// Clean up test data
const cleanupTestData = async (testActivity, testClient) => {
  try {
    console.log('\n🧹 Cleaning up test data...');
    
    await Timeline.deleteMany({ client: testClient._id });
    await Client.deleteMany({ _id: testClient._id });
    await Activity.deleteMany({ _id: testActivity._id });
    
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error);
  }
};

// Main test function
const runTest = async () => {
  let testActivity, testClient;
  
  try {
    await connectDB();
    
    console.log('\n🧪 Starting timeline creation database test...\n');
    
    // Create test data
    const testData = await createTestData();
    testActivity = testData.testActivity;
    testClient = testData.testClient;
    
    // Wait a bit for the post-save middleware to complete
    console.log('\n⏳ Waiting for timeline creation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check created timelines
    const timelines = await checkTimelines(testClient);
    
    if (timelines.length > 0) {
      console.log('\n🎉 SUCCESS: Timeline creation is working correctly in the database!');
      console.log(`   Created ${timelines.length} timelines for the test client.`);
      
      // Additional validation
      const monthlyTimelines = timelines.filter(t => t.frequency === 'Monthly');
      const quarterlyTimelines = timelines.filter(t => t.frequency === 'Quarterly');
      
      console.log(`   - Monthly timelines: ${monthlyTimelines.length}`);
      console.log(`   - Quarterly timelines: ${quarterlyTimelines.length}`);
      
      // Check financial year
      const currentFY = new Date().getMonth() >= 3 
        ? `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
        : `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
      
      const allSameFY = timelines.every(t => t.financialYear === currentFY);
      console.log(`   - All timelines in current financial year: ${allSameFY ? '✅ Yes' : '❌ No'}`);
      
    } else {
      console.log('\n⚠️  WARNING: No timelines were created. There might be an issue with the post-save middleware.');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    // Clean up test data
    if (testActivity && testClient) {
      await cleanupTestData(testActivity, testClient);
    }
    
    // Close database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the test
runTest();
