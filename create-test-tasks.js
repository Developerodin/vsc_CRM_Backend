const mongoose = require('mongoose');
const config = require('./src/config/config.js');

// Connect to MongoDB
mongoose.connect(config.mongoose.url, config.mongoose.options);

async function createTestTasks() {
  try {
    console.log('🔧 Creating test tasks...\n');

    // Get models
    const Task = mongoose.model('Task');
    const TeamMember = mongoose.model('TeamMember');
    const Branch = mongoose.model('Branch');
    const User = mongoose.model('User');

    // Check if we have the required data
    const totalTeamMembers = await TeamMember.countDocuments();
    const totalBranches = await Branch.countDocuments();
    const totalUsers = await User.countDocuments();

    console.log(`📊 Current data in system:`);
    console.log(`  Team Members: ${totalTeamMembers}`);
    console.log(`  Branches: ${totalBranches}`);
    console.log(`  Users: ${totalUsers}`);

    if (totalTeamMembers === 0 || totalBranches === 0) {
      console.log('❌ Need at least one team member and one branch to create tasks.');
      return;
    }

    // Get first available team member and branch
    const teamMember = await TeamMember.findOne();
    const branch = await Branch.findOne();
    const user = await User.findOne();

    console.log(`\n🔧 Using:`);
    console.log(`  Team Member: ${teamMember.name} (${teamMember._id})`);
    console.log(`  Branch: ${branch.name} (${branch._id})`);
    console.log(`  User: ${user ? user.name : 'None'} (${user ? user._id : 'None'})`);

    // Create test tasks
    const testTasks = [
      {
        teamMember: teamMember._id,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-20'),
        priority: 'high',
        branch: branch._id,
        assignedBy: user ? user._id : undefined,
        remarks: 'Test task 1 - High priority',
        status: 'pending'
      },
      {
        teamMember: teamMember._id,
        startDate: new Date('2024-01-16'),
        endDate: new Date('2024-01-22'),
        priority: 'medium',
        branch: branch._id,
        assignedBy: user ? user._id : undefined,
        remarks: 'Test task 2 - Medium priority',
        status: 'ongoing'
      },
      {
        teamMember: teamMember._id,
        startDate: new Date('2024-01-10'),
        endDate: new Date('2024-01-15'),
        priority: 'low',
        branch: branch._id,
        assignedBy: user ? user._id : undefined,
        remarks: 'Test task 3 - Low priority (completed)',
        status: 'completed'
      },
      {
        teamMember: teamMember._id,
        startDate: new Date('2024-01-12'),
        endDate: new Date('2024-01-18'),
        priority: 'urgent',
        branch: branch._id,
        assignedBy: user ? user._id : undefined,
        remarks: 'Test task 4 - Urgent priority',
        status: 'pending'
      },
      {
        teamMember: teamMember._id,
        startDate: new Date('2024-01-08'),
        endDate: new Date('2024-01-14'),
        priority: 'critical',
        branch: branch._id,
        assignedBy: user ? user._id : undefined,
        remarks: 'Test task 5 - Critical priority (delayed)',
        status: 'delayed'
      }
    ];

    console.log('\n📝 Creating test tasks...');
    
    // Delete existing test tasks first
    await Task.deleteMany({ remarks: { $regex: /^Test task/ } });
    console.log('🧹 Cleaned up existing test tasks');

    // Create new test tasks
    const createdTasks = await Task.insertMany(testTasks);
    console.log(`✅ Created ${createdTasks.length} test tasks`);

    // Verify the tasks were created
    const totalTasks = await Task.countDocuments();
    console.log(`📊 Total tasks in database now: ${totalTasks}`);

    // Show task details
    console.log('\n📋 Created tasks:');
    createdTasks.forEach((task, index) => {
      console.log(`  Task ${index + 1}:`);
      console.log(`    ID: ${task._id}`);
      console.log(`    Remarks: ${task.remarks}`);
      console.log(`    Status: ${task.status}`);
      console.log(`    Priority: ${task.priority}`);
      console.log(`    Start: ${task.startDate.toDateString()}`);
      console.log(`    End: ${task.endDate.toDateString()}`);
    });

    console.log('\n🎉 Test tasks created successfully!');
    console.log('💡 Now you can test the task statistics API.');

  } catch (error) {
    console.error('❌ Error creating test tasks:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

createTestTasks();
