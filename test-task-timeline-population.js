import mongoose from 'mongoose';
import config from './src/config/config.js';
import { Task, TeamMember, Timeline } from './src/models/index.js';
import taskService from './src/services/task.service.js';

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

// Test task timeline population
const testTaskTimelinePopulation = async () => {
  try {
    console.log('\n🧪 Testing Task Timeline Population...\n');
    
    // Find team member by email
    const teamMemberEmail = 'akshay96102@gmail.com';
    const teamMember = await TeamMember.findOne({ email: teamMemberEmail });
    
    if (!teamMember) {
      console.log(`❌ Team member with email ${teamMemberEmail} not found`);
      console.log('📋 Available team members:');
      const allTeamMembers = await TeamMember.find({}).select('name email').limit(5);
      allTeamMembers.forEach(tm => {
        console.log(`   - ${tm.name} (${tm.email})`);
      });
      return;
    }
    
    console.log(`✅ Found team member: ${teamMember.name} (${teamMember.email})`);
    console.log(`   ID: ${teamMember._id}\n`);
    
    // Get tasks for this team member using the service
    console.log('📊 Fetching tasks using taskService.getTasksOfAccessibleTeamMembers...');
    const result = await taskService.getTasksOfAccessibleTeamMembers(
      teamMember._id.toString(),
      { page: 1, limit: 10 }
    );
    
    console.log(`✅ Found ${result.results.length} tasks\n`);
    
    if (result.results.length === 0) {
      console.log('⚠️ No tasks found for this team member');
      return;
    }
    
    // Debug: Check what timeline looks like before processing
    const firstTask = result.results[0];
    if (firstTask.timeline && firstTask.timeline.length > 0) {
      const tl = firstTask.timeline[0];
      console.log('🔍 Debug: First timeline item from result:');
      console.log(`   Type: ${typeof tl}`);
      console.log(`   Has _id: ${tl._id ? 'Yes' : 'No'}`);
      console.log(`   Has id: ${tl.id ? 'Yes' : 'No'}`);
      if (tl.id) {
        console.log(`   id type: ${typeof tl.id}`);
        console.log(`   id value: ${tl.id}`);
        console.log(`   id toString: ${tl.id.toString()}`);
      }
      console.log(`   Has client: ${tl.client ? 'Yes' : 'No'}`);
      console.log(`   Has activity: ${tl.activity ? 'Yes' : 'No'}`);
      console.log(`   Keys: ${Object.keys(tl || {}).join(', ')}`);
      console.log(`   Full object: ${JSON.stringify(tl)}\n`);
    }
    
    // Check each task's timeline
    result.results.forEach((task, index) => {
      console.log(`\n📋 Task ${index + 1}:`);
      console.log(`   ID: ${task.id}`);
      console.log(`   Status: ${task.status}`);
      console.log(`   Priority: ${task.priority}`);
      console.log(`   Remarks: ${task.remarks || 'N/A'}`);
      console.log(`   Timeline Count: ${task.timeline?.length || 0}`);
      
      if (task.timeline && task.timeline.length > 0) {
        console.log(`\n   📅 Timeline Details:`);
        task.timeline.forEach((timeline, tIndex) => {
          console.log(`\n   Timeline ${tIndex + 1}:`);
          
          // Check if timeline is populated or just an ID
          if (typeof timeline === 'string') {
            console.log(`      ❌ Timeline is just an ID string: ${timeline}`);
            console.log(`      ⚠️ Population failed - timeline not populated`);
          } else if (timeline && typeof timeline === 'object') {
            console.log(`      ✅ Timeline is an object`);
            console.log(`      Timeline ID: ${timeline._id || timeline.id}`);
            console.log(`      Status: ${timeline.status || 'N/A'}`);
            console.log(`      Frequency: ${timeline.frequency || 'N/A'}`);
            console.log(`      Timeline Type: ${timeline.timelineType || 'N/A'}`);
            
            // Check client population
            if (timeline.client) {
              if (typeof timeline.client === 'string') {
                console.log(`      ❌ Client is just an ID: ${timeline.client}`);
              } else if (timeline.client && typeof timeline.client === 'object') {
                console.log(`      ✅ Client is populated:`);
                console.log(`         Name: ${timeline.client.name || 'N/A'}`);
                console.log(`         Email: ${timeline.client.email || 'N/A'}`);
                console.log(`         Phone: ${timeline.client.phone || 'N/A'}`);
                console.log(`         Company: ${timeline.client.company || 'N/A'}`);
                console.log(`         City: ${timeline.client.city || 'N/A'}`);
                console.log(`         State: ${timeline.client.state || 'N/A'}`);
              }
            } else {
              console.log(`      ⚠️ Client not found in timeline`);
            }
            
            // Check activity population
            if (timeline.activity) {
              if (typeof timeline.activity === 'string') {
                console.log(`      ❌ Activity is just an ID: ${timeline.activity}`);
              } else if (timeline.activity && typeof timeline.activity === 'object') {
                console.log(`      ✅ Activity is populated:`);
                console.log(`         Name: ${timeline.activity.name || 'N/A'}`);
                console.log(`         Description: ${timeline.activity.description || 'N/A'}`);
                console.log(`         Category: ${timeline.activity.category || 'N/A'}`);
              }
            } else {
              console.log(`      ⚠️ Activity not found in timeline`);
            }
            
            // Check subactivity
            if (timeline.subactivity) {
              console.log(`      ✅ Subactivity: ${timeline.subactivity.name || 'N/A'}`);
            }
          } else {
            console.log(`      ❌ Unexpected timeline format: ${typeof timeline}`);
          }
        });
      } else {
        console.log(`   ⚠️ No timelines in this task`);
      }
    });
    
    // Summary
    console.log(`\n\n📊 Summary:`);
    const tasksWithTimelines = result.results.filter(t => t.timeline && t.timeline.length > 0);
    const totalTimelines = result.results.reduce((sum, t) => sum + (t.timeline?.length || 0), 0);
    const populatedTimelines = result.results.reduce((sum, t) => {
      if (!t.timeline || !Array.isArray(t.timeline)) return sum;
      return sum + t.timeline.filter(tl => typeof tl === 'object' && tl.client && typeof tl.client === 'object').length;
    }, 0);
    
    console.log(`   Total Tasks: ${result.results.length}`);
    console.log(`   Tasks with Timelines: ${tasksWithTimelines.length}`);
    console.log(`   Total Timelines: ${totalTimelines}`);
    console.log(`   Populated Timelines (with client object): ${populatedTimelines}`);
    
    if (populatedTimelines < totalTimelines) {
      console.log(`\n   ⚠️ WARNING: ${totalTimelines - populatedTimelines} timelines are not properly populated!`);
    } else if (totalTimelines > 0) {
      console.log(`\n   ✅ SUCCESS: All timelines are properly populated!`);
    }
    
  } catch (error) {
    console.error('\n❌ Error testing task timeline population:', error);
    console.error(error.stack);
  }
};

// Main function
const runTest = async () => {
  try {
    await connectDB();
    await testTaskTimelinePopulation();
    console.log('\n✅ Test completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the test
console.log('🚀 Starting task timeline population test...');
runTest();

