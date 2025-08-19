const mongoose = require('mongoose');
const config = require('./src/config/config.js');

// Connect to MongoDB
mongoose.connect(config.mongoose.url, config.mongoose.options);

async function checkTasks() {
  try {
    console.log('🔍 Checking for tasks in the system...\n');

    // Check if there are any tasks
    const Task = mongoose.model('Task');
    const totalTasks = await Task.countDocuments();
    console.log(`📊 Total tasks in database: ${totalTasks}`);

    if (totalTasks === 0) {
      console.log('❌ No tasks found in database!');
      console.log('💡 This explains why the task statistics API returns 0 for all clients.');
      console.log('💡 Tasks need to be created first before statistics can be generated.');
      return;
    }

    // Check tasks by status
    const statusCounts = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\n📋 Tasks by status:');
    statusCounts.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count}`);
    });

    // Check tasks by branch
    const branchCounts = await Task.aggregate([
      {
        $group: {
          _id: '$branch',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\n🏢 Tasks by branch:');
    branchCounts.forEach(stat => {
      console.log(`  Branch ${stat._id}: ${stat.count} tasks`);
    });

    // Check if any tasks have timeline references
    const tasksWithTimelines = await Task.countDocuments({ timeline: { $exists: true, $ne: [] } });
    console.log(`\n📅 Tasks with timeline references: ${tasksWithTimelines}`);

    if (tasksWithTimelines === 0) {
      console.log('💡 No tasks have timeline references.');
      console.log('💡 This means the timeline-based aggregation will return no results.');
    }

    // Sample a few tasks
    const sampleTasks = await Task.find().limit(3);
    console.log('\n📋 Sample tasks:');
    sampleTasks.forEach((task, index) => {
      console.log(`  Task ${index + 1}:`);
      console.log(`    ID: ${task._id}`);
      console.log(`    Status: ${task.status}`);
      console.log(`    Priority: ${task.priority}`);
      console.log(`    Branch: ${task.branch}`);
      console.log(`    Timeline count: ${task.timeline ? task.timeline.length : 0}`);
      console.log(`    Start Date: ${task.startDate}`);
      console.log(`    End Date: ${task.endDate}`);
    });

  } catch (error) {
    console.error('❌ Error during task check:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

checkTasks();
