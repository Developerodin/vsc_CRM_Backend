#!/usr/bin/env node

/**
 * Debug script for bulk import clients
 * This script helps debug why clients are not being created during bulk import
 */

import mongoose from 'mongoose';
import { Client, Branch, Activity } from './src/models/index.js';
import { bulkImportClients } from './src/services/client.service.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/vsc_crm', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample test data
const createSampleData = async () => {
  console.log('🔍 Creating sample test data...');
  
  // Find or create a test branch
  let branch = await Branch.findOne({ name: 'Test Branch' });
  if (!branch) {
    branch = await Branch.create({
      name: 'Test Branch',
      address: 'Test Address',
      phone: '1234567890',
      email: 'test@branch.com'
    });
    console.log('✅ Created test branch:', branch._id);
  } else {
    console.log('✅ Found existing test branch:', branch._id);
  }

  // Find or create a test activity
  let activity = await Activity.findOne({ name: 'Test Activity' });
  if (!activity) {
    activity = await Activity.create({
      name: 'Test Activity',
      description: 'Test activity for bulk import',
      fields: [
        {
          fieldName: 'Test Field',
          fieldType: 'text',
          isRequired: false
        }
      ]
    });
    console.log('✅ Created test activity:', activity._id);
  } else {
    console.log('✅ Found existing test activity:', activity._id);
  }

  return { branch, activity };
};

// Test bulk import with sample clients
const testBulkImport = async () => {
  try {
    console.log('🚀 Starting bulk import debug test...\n');

    await connectDB();
    const { branch, activity } = await createSampleData();

    // Create sample clients for testing
    const testClients = [
      {
        name: 'Test Client 1',
        email: 'client1@test.com',
        phone: '9876543210',
        address: 'Test Address 1',
        branch: branch._id,
        activities: [
          {
            activity: activity._id,
            status: 'active',
            notes: 'Test activity assignment'
          }
        ]
      },
      {
        name: 'Test Client 2',
        email: 'client2@test.com',
        phone: '9876543211',
        address: 'Test Address 2',
        branch: branch._id,
        activities: [
          {
            activity: activity._id,
            status: 'active',
            notes: 'Test activity assignment 2'
          }
        ]
      },
      {
        // Test client with missing required field
        email: 'client3@test.com',
        phone: '9876543212',
        address: 'Test Address 3',
        // Missing branch - should cause error
        activities: [
          {
            activity: activity._id,
            status: 'active',
            notes: 'Test activity assignment 3'
          }
        ]
      }
    ];

    console.log(`📊 Testing bulk import with ${testClients.length} clients...\n`);

    // Run bulk import
    const result = await bulkImportClients(testClients);

    console.log('\n📋 BULK IMPORT RESULTS:');
    console.log('='.repeat(50));
    console.log(`Total Processed: ${result.totalProcessed}`);
    console.log(`Created: ${result.created}`);
    console.log(`Updated: ${result.updated}`);
    console.log(`Errors: ${result.errors.length}`);

    if (result.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      result.errors.forEach((error, index) => {
        console.log(`${index + 1}. Index ${error.index}: ${error.error}`);
        if (error.data && error.data.name) {
          console.log(`   Client: ${error.data.name}`);
        }
      });
    }

    // Verify clients were created
    console.log('\n🔍 VERIFICATION:');
    const createdClients = await Client.find({ 
      name: { $in: ['Test Client 1', 'Test Client 2'] } 
    }).populate('activities.activity');
    
    console.log(`Found ${createdClients.length} clients in database:`);
    createdClients.forEach(client => {
      console.log(`- ${client.name} (${client._id}) - ${client.activities.length} activities`);
    });

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await Client.deleteMany({ name: { $regex: /^Test Client/ } });
    console.log('✅ Cleaned up test clients');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the test
testBulkImport();
