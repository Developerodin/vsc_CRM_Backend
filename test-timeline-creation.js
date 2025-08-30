import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Client from './src/models/client.model.js';
import Activity from './src/models/activity.model.js';
import Timeline from './src/models/timeline.model.js';
import { getCurrentFinancialYear } from './src/utils/financialYear.js';

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

// Create test activity with subactivities
const createTestActivity = async () => {
  try {
    // Check if test activity already exists
    let testActivity = await Activity.findOne({ name: 'Test Activity for Timeline' });
    
    if (!testActivity) {
      testActivity = await Activity.create({
        name: 'Test Activity for Timeline',
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
          },
          {
            name: 'Yearly Audit',
            frequency: 'Yearly',
            frequencyConfig: {
              yearlyMonth: 'March',
              yearlyDate: 31,
              yearlyTime: '02:00 PM'
            }
          },
          {
            name: 'One-time Setup',
            frequency: 'OneTime'
          }
        ]
      });
      console.log('✅ Test activity created:', testActivity.name);
    } else {
      console.log('✅ Test activity already exists:', testActivity.name);
    }
    
    return testActivity;
  } catch (error) {
    console.error('❌ Error creating test activity:', error);
    throw error;
  }
};

// Create test client
const createTestClient = async (testActivity) => {
  try {
    // Check if test client already exists
    let testClient = await Client.findOne({ name: 'Test Client for Timeline' });
    
    if (!testClient) {
      testClient = await Client.create({
        name: 'Test Client for Timeline',
        email: 'test@example.com',
        phone: '+919876543210',
        branch: new mongoose.Types.ObjectId(), // You'll need to replace this with a real branch ID
        activities: [
          {
            activity: testActivity._id,
            status: 'active'
          }
        ]
      });
      console.log('✅ Test client created:', testClient.name);
    } else {
      console.log('✅ Test client already exists:', testClient.name);
    }
    
    return testClient;
  } catch (error) {
    console.error('❌ Error creating test client:', error);
    throw error;
  }
};

// Check created timelines
const checkTimelines = async (testClient) => {
  try {
    const timelines = await Timeline.find({ client: testClient._id });
    console.log(`\n📊 Found ${timelines.length} timelines for test client`);
    
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
      });
    }
    
    return timelines;
  } catch (error) {
    console.error('❌ Error checking timelines:', error);
    throw error;
  }
};

// Test financial year calculation
const testFinancialYear = () => {
  console.log('\n📅 Testing financial year calculation:');
  const fy = getCurrentFinancialYear();
  console.log(`Current Financial Year: ${fy.yearString}`);
  console.log(`Start Date: ${fy.start.toDateString()}`);
  console.log(`End Date: ${fy.end.toDateString()}`);
};

// Main test function
const runTest = async () => {
  try {
    await connectDB();
    
    console.log('\n🧪 Starting timeline creation test...\n');
    
    // Test financial year calculation
    testFinancialYear();
    
    // Create test activity
    const testActivity = await createTestActivity();
    
    // Create test client (this should trigger timeline creation)
    const testClient = await createTestClient(testActivity);
    
    // Wait a bit for the post-save middleware to complete
    console.log('\n⏳ Waiting for timeline creation...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check created timelines
    const timelines = await checkTimelines(testClient);
    
    if (timelines.length > 0) {
      console.log('\n🎉 SUCCESS: Timeline creation is working correctly!');
    } else {
      console.log('\n⚠️  WARNING: No timelines were created. Check the logs above for errors.');
    }
    
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
runTest();
