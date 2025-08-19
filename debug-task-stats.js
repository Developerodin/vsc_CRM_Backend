const mongoose = require('mongoose');
const config = require('./src/config/config.js');

// Connect to MongoDB
mongoose.connect(config.mongoose.url, config.mongoose.options);

async function debugTaskStats() {
  try {
    console.log('🔍 Debugging Task Statistics...\n');

    // 1. Check if there are any tasks
    const Task = mongoose.model('Task');
    const totalTasks = await Task.countDocuments();
    console.log(`📊 Total tasks in database: ${totalTasks}`);

    if (totalTasks === 0) {
      console.log('❌ No tasks found in database!');
      return;
    }

    // 2. Check a few sample tasks
    const sampleTasks = await Task.find().limit(3).populate('timeline');
    console.log('\n📋 Sample tasks:');
    sampleTasks.forEach((task, index) => {
      console.log(`  Task ${index + 1}:`);
      console.log(`    ID: ${task._id}`);
      console.log(`    Status: ${task.status}`);
      console.log(`    Timeline count: ${task.timeline ? task.timeline.length : 0}`);
      console.log(`    Timeline IDs: ${task.timeline ? task.timeline.map(t => t._id) : 'None'}`);
    });

    // 3. Check if there are any timelines
    const Timeline = mongoose.model('Timeline');
    const totalTimelines = await Timeline.countDocuments();
    console.log(`\n📅 Total timelines in database: ${totalTimelines}`);

    if (totalTimelines === 0) {
      console.log('❌ No timelines found in database!');
      return;
    }

    // 4. Check a few sample timelines
    const sampleTimelines = await Timeline.find().limit(3).populate('client');
    console.log('\n📋 Sample timelines:');
    sampleTimelines.forEach((timeline, index) => {
      console.log(`  Timeline ${index + 1}:`);
      console.log(`    ID: ${timeline._id}`);
      console.log(`    Client: ${timeline.client ? timeline.client.name : 'No client'}`);
      console.log(`    Client ID: ${timeline.client ? timeline.client._id : 'No client'}`);
      console.log(`    Status: ${timeline.status}`);
    });

    // 5. Test the aggregation pipeline
    console.log('\n🧪 Testing aggregation pipeline...');
    
    const aggregationResult = await Task.aggregate([
      // Match tasks that have timelines
      {
        $match: {
          timeline: { $exists: true, $ne: [] }
        }
      },
      // Unwind timeline array
      {
        $unwind: '$timeline'
      },
      // Lookup timeline details
      {
        $lookup: {
          from: 'timelines',
          localField: 'timeline',
          foreignField: '_id',
          as: 'timelineDetails'
        }
      },
      // Unwind timeline details
      {
        $unwind: '$timelineDetails'
      },
      // Lookup client details from timeline
      {
        $lookup: {
          from: 'clients',
          localField: 'timelineDetails.client',
          foreignField: '_id',
          as: 'clientDetails'
        }
      },
      // Unwind client details
      {
        $unwind: '$clientDetails'
      },
      // Group by client and status
      {
        $group: {
          _id: {
            clientId: '$clientDetails._id',
            clientName: '$clientDetails.name',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    console.log(`\n📊 Aggregation result: ${aggregationResult.length} records`);
    aggregationResult.forEach((result, index) => {
      console.log(`  Record ${index + 1}:`);
      console.log(`    Client: ${result._id.clientName} (${result._id.clientId})`);
      console.log(`    Status: ${result._id.status}`);
      console.log(`    Count: ${result.count}`);
    });

    // 6. Check if there are any clients
    const Client = mongoose.model('Client');
    const totalClients = await Client.countDocuments();
    console.log(`\n👥 Total clients in database: ${totalClients}`);

    if (totalClients === 0) {
      console.log('❌ No clients found in database!');
      return;
    }

    // 7. Check a few sample clients
    const sampleClients = await Client.find().limit(3);
    console.log('\n📋 Sample clients:');
    sampleClients.forEach((client, index) => {
      console.log(`  Client ${index + 1}:`);
      console.log(`    ID: ${client._id}`);
      console.log(`    Name: ${client.name}`);
      console.log(`    Branch: ${client.branch}`);
    });

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

debugTaskStats();
