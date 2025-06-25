import mongoose from 'mongoose';
import config from '../config/config.js';
import logger from '../config/logger.js';
import * as userService from '../services/user.service.js';
import * as roleService from '../services/role.service.js';
import * as branchService from '../services/branch.service.js';
import * as teamMemberService from '../services/teamMember.service.js';
import * as clientService from '../services/client.service.js';
import * as groupService from '../services/group.service.js';
import * as timelineService from '../services/timeline.service.js';
import * as activityService from '../services/activity.service.js';

/**
 * Clear existing test data to avoid conflicts
 */
const clearTestData = async () => {
  try {
    logger.info('Clearing existing test data...');
    
    // Import models directly for cleanup
    const User = mongoose.model('User');
    const Role = mongoose.model('Role');
    const Branch = mongoose.model('Branch');
    const TeamMember = mongoose.model('TeamMember');
    const Client = mongoose.model('Client');
    const Group = mongoose.model('Group');
    const Timeline = mongoose.model('Timeline');
    const Activity = mongoose.model('Activity');

    // Delete test data in reverse dependency order
    await Timeline.deleteMany({});
    await Group.deleteMany({});
    await Client.deleteMany({});
    await TeamMember.deleteMany({});
    await Activity.deleteMany({});
    await User.deleteMany({});
    await Role.deleteMany({});
    await Branch.deleteMany({});

    logger.info('Test data cleared successfully');
  } catch (error) {
    logger.warn('Could not clear test data:', error.message);
  }
};

/**
 * Check existing users and their roles
 */
const checkExistingUsers = async () => {
  try {
    logger.info('Checking existing users...');
    
    // Import models directly
    const User = mongoose.model('User');
    const Role = mongoose.model('Role');
    
    const users = await User.find({}).populate('role');
    logger.info(`Found ${users.length} users:`);
    
    users.forEach(user => {
      logger.info(`- ${user.email} (${user.name}) - Role: ${user.role ? user.role.name : 'No role'}`);
      if (user.role) {
        logger.info(`  Role permissions:`, user.role.apiPermissions);
      }
    });
    
    const roles = await Role.find({});
    logger.info(`Found ${roles.length} roles:`);
    
    roles.forEach(role => {
      logger.info(`- ${role.name} - Permissions:`, role.apiPermissions);
    });
    
  } catch (error) {
    logger.error('Error checking users:', error);
  }
};

// Helper function to create permissions object
const createPermissionsObject = (permissionsToEnable = []) => {
  const availableNavigationPermissions = roleService.getAvailableNavigationPermissions();
  const availableApiPermissions = roleService.getAvailableApiPermissions();
  
  const navigationPermissions = {};
  const apiPermissions = {};
  
  // Initialize navigation permissions
  Object.keys(availableNavigationPermissions).forEach(key => {
    if (key === 'settings') {
      navigationPermissions[key] = {};
      Object.keys(availableNavigationPermissions[key].children || {}).forEach(childKey => {
        navigationPermissions[key][childKey] = permissionsToEnable.includes(`settings.${childKey}`);
      });
    } else {
      navigationPermissions[key] = permissionsToEnable.includes(key);
    }
  });
  
  // Initialize API permissions
  Object.keys(availableApiPermissions).forEach(key => {
    apiPermissions[key] = permissionsToEnable.includes(key);
  });
  
  return { navigationPermissions, apiPermissions };
};

/**
 * Setup script to create test data for branch access testing
 */
export const setupBranchAccess = async () => {
  try {
    // Check existing users first
    await checkExistingUsers();
    
    // Clear existing test data first
    // await clearTestData();

    // Create test branches
    logger.info('Creating test branches...');
    const branch1 = await branchService.createBranch({
      name: 'New York Branch',
      address: '123 Main St, New York, NY 10001',
      phone: '8290918154',
      email: 'ny@company.com',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      pinCode: '10001',
      sortOrder: 1
    });

    const branch2 = await branchService.createBranch({
      name: 'Los Angeles Branch',
      address: '456 Oak Ave, Los Angeles, CA 90210',
      phone: '9314239246',
      email: 'la@company.com',
      city: 'Los Angeles',
      state: 'CA',
      country: 'USA',
      pinCode: '90210',
      sortOrder: 2
    });

    const branch3 = await branchService.createBranch({
      name: 'Chicago Branch',
      address: '789 Pine St, Chicago, IL 60601',
      phone: '9610212064',
      email: 'chicago@company.com',
      city: 'Chicago',
      state: 'IL',
      country: 'USA',
      pinCode: '60601',
      sortOrder: 3
    });

    logger.info('Branches created:', { branch1: branch1._id, branch2: branch2._id, branch3: branch3._id });

    // Create test roles
    logger.info('Creating test roles...');

    // Single branch access role
    const singleBranchPermissions = createPermissionsObject([
      'dashboard', 'clients', 'groups', 'teams', 'timelines', 'analytics',
      'getTeamMembers', 'manageTeamMembers', 'getActivities', 'getClients', 
      'manageClients', 'getGroups', 'manageGroups', 'getTimelines', 'manageTimelines'
    ]);

    const singleBranchRole = await roleService.createRole({
      name: 'Branch Manager',
      description: 'Can manage a single branch',
      ...singleBranchPermissions,
      branchAccess: [branch1._id],
      allBranchesAccess: false,
      isActive: true
    });

    // Multiple branch access role
    const multiBranchPermissions = createPermissionsObject([
      'dashboard', 'clients', 'groups', 'teams', 'timelines', 'analytics',
      'getTeamMembers', 'manageTeamMembers', 'getActivities', 'getClients', 
      'manageClients', 'getGroups', 'manageGroups', 'getTimelines', 'manageTimelines'
    ]);

    const multiBranchRole = await roleService.createRole({
      name: 'Regional Manager',
      description: 'Can manage multiple branches in a region',
      ...multiBranchPermissions,
      branchAccess: [branch1._id, branch2._id],
      allBranchesAccess: false,
      isActive: true
    });

    // All branch access role
    const adminPermissions = createPermissionsObject([
      'dashboard', 'clients', 'groups', 'teams', 'timelines', 'analytics',
      'settings.activities', 'settings.branches', 'settings.users', 'settings.roles',
      'getUsers', 'manageUsers', 'getTeamMembers', 'manageTeamMembers', 'getActivities', 
      'manageActivities', 'getBranches', 'manageBranches', 'getClients', 'manageClients', 
      'getGroups', 'manageGroups', 'getTimelines', 'manageTimelines', 'getRoles', 'manageRoles'
    ]);

    const adminRole = await roleService.createRole({
      name: 'System Administrator',
      description: 'Can access all branches and manage system settings',
      ...adminPermissions,
      branchAccess: [],
      allBranchesAccess: true,
      isActive: true
    });

    logger.info('Roles created:', { 
      singleBranchRole: singleBranchRole._id, 
      multiBranchRole: multiBranchRole._id, 
      adminRole: adminRole._id 
    });

    // Create test users
    logger.info('Creating test users...');

    const singleBranchUser = await userService.createUser({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: singleBranchRole._id
    });

    const multiBranchUser = await userService.createUser({
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: 'password123',
      role: multiBranchRole._id
    });

    const adminUser = await userService.createUser({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'password123',
      role: adminRole._id
    });

    logger.info('Users created:', { 
      singleBranchUser: singleBranchUser._id, 
      multiBranchUser: multiBranchUser._id, 
      adminUser: adminUser._id 
    });

    // Create test activities (skills) - Activity model requires name and sortOrder
    logger.info('Creating test activities...');
    const activity1 = await activityService.createActivity({
      name: 'Sales',
      sortOrder: 1
    });

    const activity2 = await activityService.createActivity({
      name: 'Support',
      sortOrder: 2
    });

    logger.info('Activities created:', { activity1: activity1._id, activity2: activity2._id });

    // Create test team members
    logger.info('Creating test team members...');

    // Team member for branch 1
    await teamMemberService.createTeamMember({
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '9876543210',
      address: '123 Oak St, New York, NY',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      pinCode: '10001',
      branch: branch1._id,
      sortOrder: 1,
      skills: [activity1._id]
    });

    // Team member for branch 2
    await teamMemberService.createTeamMember({
      name: 'Bob Wilson',
      email: 'bob@example.com',
      phone: '9876543211',
      address: '456 Pine St, Los Angeles, CA',
      city: 'Los Angeles',
      state: 'CA',
      country: 'USA',
      pinCode: '90210',
      branch: branch2._id,
      sortOrder: 1,
      skills: [activity2._id]
    });

    // Team member for branch 3
    await teamMemberService.createTeamMember({
      name: 'Carol Davis',
      email: 'carol@example.com',
      phone: '9876543212',
      address: '789 Elm St, Chicago, IL',
      city: 'Chicago',
      state: 'IL',
      country: 'USA',
      pinCode: '60601',
      branch: branch3._id,
      sortOrder: 1,
      skills: [activity1._id, activity2._id]
    });

    // Create test clients
    logger.info('Creating test clients...');

    await clientService.createClient({
      name: 'Client A',
      email: 'clienta@example.com',
      phone: '9876543213',
      address: '100 Business Ave, New York, NY',
      branch: branch1._id
    });

    await clientService.createClient({
      name: 'Client B',
      email: 'clientb@example.com',
      phone: '9876543222',
      address: '200 Business Blvd, Los Angeles, CA',
      branch: branch2._id
    });

    // Create test groups - Group model requires name, numberOfClients, branch, and sortOrder
    logger.info('Creating test groups...');

    await groupService.createGroup({
      name: 'Group A',
      numberOfClients: 0,
      branch: branch1._id,
      sortOrder: 1
    });

    await groupService.createGroup({
      name: 'Group B',
      numberOfClients: 0,
      branch: branch2._id,
      sortOrder: 2
    });

    // Create test timelines - Timeline model requires activity, client, status, frequency, frequencyConfig, assignedMember, branch
    logger.info('Creating test timelines...');

    // First create a client for timeline
    const timelineClient1 = await clientService.createClient({
      name: 'Timeline Client 1',
      email: 'timeline1@example.com',
      phone: '19876543231',
      address: '300 Timeline St, New York, NY',
      branch: branch1._id
    });

    const timelineClient2 = await clientService.createClient({
      name: 'Timeline Client 2',
      email: 'timeline2@example.com',
      phone: '9876543245',
      address: '400 Timeline Ave, Los Angeles, CA',
      branch: branch2._id
    });

    // Get the first team member for assignment
    const teamMember1 = await teamMemberService.getTeamMemberByEmail('alice@example.com');
    const teamMember2 = await teamMemberService.getTeamMemberByEmail('bob@example.com');

    await timelineService.createTimeline({
      activity: activity1._id,
      client: timelineClient1._id,
      status: 'pending',
      frequency: 'Daily',
      frequencyConfig: {
        dailyTime: '09:00 AM'
      },
      assignedMember: teamMember1._id,
      branch: branch1._id
    });

    await timelineService.createTimeline({
      activity: activity2._id,
      client: timelineClient2._id,
      status: 'pending',
      frequency: 'Weekly',
      frequencyConfig: {
        weeklyDays: ['Monday', 'Wednesday', 'Friday'],
        weeklyTime: '10:00 AM'
      },
      assignedMember: teamMember2._id,
      branch: branch2._id
    });

    logger.info('✅ Branch access setup completed successfully!');
    logger.info('');
    logger.info('📋 Test Data Summary:');
    logger.info(`   Branches: ${branch1.name}, ${branch2.name}, ${branch3.name}`);
    logger.info(`   Roles: ${singleBranchRole.name}, ${multiBranchRole.name}, ${adminRole.name}`);
    logger.info(`   Users: ${singleBranchUser.email}, ${multiBranchUser.email}, ${adminUser.email}`);
    logger.info('');
    logger.info('🔑 Test Credentials:');
    logger.info(`   Single Branch User: ${singleBranchUser.email} / password123`);
    logger.info(`   Multi Branch User: ${multiBranchUser.email} / password123`);
    logger.info(`   Admin User: ${adminUser.email} / password123`);
    logger.info('');
    logger.info('🧪 Test Scenarios:');
    logger.info('   1. Login as single branch user - should only see data from branch 1');
    logger.info('   2. Login as multi branch user - should see data from branches 1 and 2');
    logger.info('   3. Login as admin user - should see data from all branches');
    logger.info('');
    logger.info('📖 See BRANCH_ACCESS_EXAMPLES.md for detailed API usage examples');

  } catch (error) {
    logger.error('❌ Error setting up branch access:', error);
  }
};

// Create a standalone script to run the setup

