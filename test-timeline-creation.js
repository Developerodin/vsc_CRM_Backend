import mongoose from 'mongoose';
import Client from './src/models/client.model.js';
import Activity from './src/models/activity.model.js';
import Timeline from './src/models/timeline.model.js';
import config from './src/config/config.js';

// Connect to MongoDB
mongoose.connect(config.mongoose.url, config.mongoose.options);

async function testTimelineCreation() {
  try {
    console.log('Testing timeline creation...');
    
    // Create a test activity with frequency
    const testActivity = new Activity({
      name: 'Test Activity',
      sortOrder: 1,
      frequency: 'Daily',
      frequencyConfig: {
        dailyTime: '09:00 AM'
      }
    });
    
    await testActivity.save();
    console.log('Created test activity:', testActivity._id);
    
    // Create a test client with the activity
    const testClient = new Client({
      name: 'Test Client',
      phone: '+1234567890',
      email: 'test@example.com',
      branch: new mongoose.Types.ObjectId(), // Mock branch ID
      activities: [{
        activity: testActivity._id,
        assignedTeamMember: new mongoose.Types.ObjectId(), // Mock team member ID
        assignedDate: new Date(),
        notes: 'Test assignment'
      }]
    });
    
    await testClient.save();
    console.log('Created test client:', testClient._id);
    
    // Check if timeline was created
    const timelines = await Timeline.find({ client: testClient._id });
    console.log('Created timelines:', timelines.length);
    
    if (timelines.length > 0) {
      console.log('Timeline details:', {
        id: timelines[0]._id,
        activity: timelines[0].activity,
        client: timelines[0].client,
        frequency: timelines[0].frequency,
        startDate: timelines[0].startDate,
        endDate: timelines[0].endDate,
        status: timelines[0].status,
        frequencyStatusCount: timelines[0].frequencyStatus.length
      });
    }
    
    // Cleanup
    await Timeline.deleteMany({ client: testClient._id });
    await Client.deleteOne({ _id: testClient._id });
    await Activity.deleteOne({ _id: testActivity._id });
    
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
}

testTimelineCreation();
