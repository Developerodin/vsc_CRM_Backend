#!/usr/bin/env node

/**
 * Test script for Dashboard APIs
 * This script tests all dashboard endpoints to ensure they return data correctly
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from '../src/config/config.js';

// Load environment variables
dotenv.config();

// Import models
import User from '../src/models/user.model.js';
import Timeline from '../src/models/timeline.model.js';
import Activity from '../src/models/activity.model.js';
import Client from '../src/models/client.model.js';
import Branch from '../src/models/branch.model.js';
import TeamMember from '../src/models/teamMember.model.js';

// Import services
import { dashboardService } from '../src/services/index.js';

// Test user data
const testUser = {
  _id: new mongoose.Types.ObjectId(),
  name: 'Test User',
  email: 'test@example.com',
  role: {
    _id: new mongoose.Types.ObjectId(),
    name: 'Admin',
    permissions: ['getTimelines', 'getActivities', 'getClients', 'getBranches', 'getTeamMembers'],
    branchAccess: null // Access to all branches
  }
};

// Test data with unique identifiers
const timestamp = Date.now();
const testBranch = {
  _id: new mongoose.Types.ObjectId(),
  name: `Test Branch ${timestamp}`,
  email: `testbranch${timestamp}@example.com`,
  phone: `123456${timestamp.toString().slice(-4)}`,
  address: 'Test Address',
  city: 'Test City',
  state: 'Test State',
  country: 'Test Country',
  pinCode: '12345',
  sortOrder: 1
};

const testActivity = {
  _id: new mongoose.Types.ObjectId(),
  name: `Test Activity ${timestamp}`,
  description: 'Test Activity Description',
  sortOrder: 1
};

const testClient = {
  _id: new mongoose.Types.ObjectId(),
  name: `Test Client ${timestamp}`,
  email: `client${timestamp}@example.com`,
  phone: `123456${timestamp.toString().slice(-4)}`,
  branch: testBranch._id
};

const testTeamMember = {
  _id: new mongoose.Types.ObjectId(),
  name: `Test Team Member ${timestamp}`,
  email: `member${timestamp}@example.com`,
  phone: `123456${timestamp.toString().slice(-4)}`,
  address: 'Test Address',
  city: 'Test City',
  state: 'Test State',
  country: 'Test Country',
  pinCode: '12345',
  branch: testBranch._id,
  sortOrder: 1,
  skills: [testActivity._id]
};

const testTimeline = {
  _id: new mongoose.Types.ObjectId(),
  activity: testActivity._id,
  client: testClient._id,
  status: 'ongoing',
  frequency: 'Daily',
  frequencyConfig: {
    dailyTime: '09:00 AM'
  },
  frequencyStatus: [
    {
      period: '2024-01-15',
      status: 'completed',
      completedAt: new Date('2024-01-15T09:00:00Z'),
      notes: 'Completed on time'
    },
    {
      period: '2024-01-16',
      status: 'pending',
      completedAt: null,
      notes: ''
    },
    {
      period: '2024-01-17',
      status: 'ongoing',
      completedAt: null,
      notes: 'In progress'
    }
  ],
  assignedMember: testTeamMember._id,
  branch: testBranch._id,
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31')
};

async function setupTestData() {
  console.log('Setting up test data...');
  
  try {
    // Create test data
    await Branch.create(testBranch);
    await Activity.create(testActivity);
    await Client.create(testClient);
    await TeamMember.create(testTeamMember);
    await Timeline.create(testTimeline);
    
    console.log('✅ Test data created successfully');
  } catch (error) {
    console.error('❌ Error creating test data:', error.message);
    throw error;
  }
}

async function cleanupTestData() {
  console.log('Cleaning up test data...');
  
  try {
    await Timeline.deleteOne({ _id: testTimeline._id });
    await TeamMember.deleteOne({ _id: testTeamMember._id });
    await Client.deleteOne({ _id: testClient._id });
    await Activity.deleteOne({ _id: testActivity._id });
    await Branch.deleteOne({ _id: testBranch._id });
    
    console.log('✅ Test data cleaned up successfully');
  } catch (error) {
    console.error('❌ Error cleaning up test data:', error.message);
  }
}

async function testDashboardAPIs() {
  console.log('\n🧪 Testing Dashboard APIs...\n');
  
  const tests = [
    {
      name: 'getTotalActivities',
      test: async () => {
        const result = await dashboardService.getTotalActivities();
        console.log(`Total Activities: ${result}`);
        return result >= 0;
      }
    },
    {
      name: 'getTotalTeams',
      test: async () => {
        const result = await dashboardService.getTotalTeams(testUser, testBranch._id.toString());
        console.log(`Total Teams (with branch): ${result}`);
        return result >= 0;
      }
    },
    {
      name: 'getTotalTeams (no branch)',
      test: async () => {
        const result = await dashboardService.getTotalTeams(testUser);
        console.log(`Total Teams (no branch): ${result}`);
        return result >= 0;
      }
    },
    {
      name: 'getTotalBranches',
      test: async () => {
        const result = await dashboardService.getTotalBranches(testUser);
        console.log(`Total Branches: ${result}`);
        return result >= 0;
      }
    },
    {
      name: 'getTotalClients',
      test: async () => {
        const result = await dashboardService.getTotalClients(testUser, testBranch._id.toString());
        console.log(`Total Clients (with branch): ${result}`);
        return result >= 0;
      }
    },
    {
      name: 'getTotalClients (no branch)',
      test: async () => {
        const result = await dashboardService.getTotalClients(testUser);
        console.log(`Total Clients (no branch): ${result}`);
        return result >= 0;
      }
    },
    {
      name: 'getTotalOngoingTasks',
      test: async () => {
        const result = await dashboardService.getTotalOngoingTasks(testUser, testBranch._id.toString());
        console.log(`Total Ongoing Tasks (with branch): ${result}`);
        return result >= 0;
      }
    },
    {
      name: 'getTotalOngoingTasks (no branch)',
      test: async () => {
        const result = await dashboardService.getTotalOngoingTasks(testUser);
        console.log(`Total Ongoing Tasks (no branch): ${result}`);
        return result >= 0;
      }
    },
    {
      name: 'getTimelineCountsByBranch',
      test: async () => {
        const result = await dashboardService.getTimelineCountsByBranch(testUser, testBranch._id.toString());
        console.log(`Timeline Counts by Branch:`, JSON.stringify(result, null, 2));
        return result && result.counts;
      }
    },
    {
      name: 'getTimelineCountsByBranch (no branch)',
      test: async () => {
        const result = await dashboardService.getTimelineCountsByBranch(testUser);
        console.log(`Timeline Counts by Branch (no branch):`, JSON.stringify(result, null, 2));
        return result && result.counts;
      }
    },
    {
      name: 'getAssignedTaskCounts',
      test: async () => {
        const result = await dashboardService.getAssignedTaskCounts(testUser, testBranch._id.toString());
        console.log(`Assigned Task Counts:`, JSON.stringify(result, null, 2));
        return result && result.assigned && result.months;
      }
    },
    {
      name: 'getTopClients',
      test: async () => {
        const result = await dashboardService.getTopClients(testUser, testBranch._id.toString());
        console.log(`Top Clients:`, JSON.stringify(result, null, 2));
        return Array.isArray(result);
      }
    },
    {
      name: 'getTopActivities',
      test: async () => {
        const result = await dashboardService.getTopActivities(testUser, testBranch._id.toString());
        console.log(`Top Activities:`, JSON.stringify(result, null, 2));
        return Array.isArray(result);
      }
    },
    {
      name: 'getTimelineStatusByFrequency',
      test: async () => {
        const result = await dashboardService.getTimelineStatusByFrequency(testUser, {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          frequency: 'Daily'
        });
        console.log(`Timeline Status by Frequency:`, JSON.stringify(result, null, 2));
        return result && result.results;
      }
    },
    {
      name: 'getTimelineStatusByPeriod',
      test: async () => {
        const result = await dashboardService.getTimelineStatusByPeriod(testUser, {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          frequency: 'Daily',
          period: '2024-01-15'
        });
        console.log(`Timeline Status by Period:`, JSON.stringify(result, null, 2));
        return result && result.periods;
      }
    },
    {
      name: 'getTimelineFrequencyAnalytics',
      test: async () => {
        const result = await dashboardService.getTimelineFrequencyAnalytics(testUser, {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          groupBy: 'frequency'
        });
        console.log(`Timeline Frequency Analytics:`, JSON.stringify(result, null, 2));
        return result && result.analytics;
      }
    },
    {
      name: 'getTimelineStatusTrends',
      test: async () => {
        const result = await dashboardService.getTimelineStatusTrends(testUser, {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          frequency: 'Daily',
          interval: 'day'
        });
        console.log(`Timeline Status Trends:`, JSON.stringify(result, null, 2));
        return result && result.trends;
      }
    },
    {
      name: 'getTimelineCompletionRates',
      test: async () => {
        const result = await dashboardService.getTimelineCompletionRates(testUser, {
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          frequency: 'Daily'
        });
        console.log(`Timeline Completion Rates:`, JSON.stringify(result, null, 2));
        return result && result.overallStats;
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      console.log(`\n📋 Testing: ${test.name}`);
      const success = await test.test();
      
      if (success) {
        console.log(`✅ ${test.name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAILED`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB');
    
    // Setup test data
    await setupTestData();
    
    // Run tests
    const results = await testDashboardAPIs();
    
    // Cleanup
    await cleanupTestData();
    
    // Disconnect
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the test
main(); 