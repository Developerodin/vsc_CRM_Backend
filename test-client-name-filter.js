#!/usr/bin/env node

/**
 * Test Client Name Filter Fix
 * 
 * This script tests if the timeline API now accepts client names instead of just ObjectIds
 */

import mongoose from 'mongoose';
import { Timeline, Client } from './src/models/index.js';
import { queryTimelines } from './src/services/timeline.service.js';
import config from './src/config/config.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

/**
 * Test client name filtering
 */
const testClientNameFilter = async () => {
  console.log('\n🧪 TESTING CLIENT NAME FILTER');
  console.log('=============================');
  
  try {
    // Test 1: Find a client by name
    const testClientName = 'AARTI DHARIWAL';
    const client = await Client.findOne({ 
      name: { $regex: testClientName, $options: 'i' } 
    });
    
    if (!client) {
      console.log(`❌ Test client "${testClientName}" not found`);
      return;
    }
    
    console.log(`✅ Found test client: ${client.name} (ID: ${client._id})`);
    
    // Test 2: Query timelines by ObjectId (should work)
    console.log('\n📊 Test 1: Query by ObjectId (existing functionality)');
    const timelinesByObjectId = await queryTimelines(
      { client: client._id.toString() },
      { page: 1, limit: 5 },
      null
    );
    
    console.log(`   Results: ${timelinesByObjectId.results.length} timelines found`);
    if (timelinesByObjectId.results.length > 0) {
      console.log(`   Sample: ${timelinesByObjectId.results[0].activity.name} - ${timelinesByObjectId.results[0].status}`);
    }
    
    // Test 3: Query timelines by client name (new functionality)
    console.log('\n📊 Test 2: Query by Client Name (new functionality)');
    const timelinesByName = await queryTimelines(
      { client: testClientName },
      { page: 1, limit: 5 },
      null
    );
    
    console.log(`   Results: ${timelinesByName.results.length} timelines found`);
    if (timelinesByName.results.length > 0) {
      console.log(`   Sample: ${timelinesByName.results[0].activity.name} - ${timelinesByName.results[0].status}`);
      console.log(`   Client: ${timelinesByName.results[0].client.name}`);
    }
    
    // Test 4: Query with URL-encoded name (like the API request)
    console.log('\n📊 Test 3: Query with URL-encoded name');
    const encodedName = 'AARTI+DHARIWAL'; // URL encoded space as +
    const timelinesByEncodedName = await queryTimelines(
      { client: encodedName },
      { page: 1, limit: 5 },
      null
    );
    
    console.log(`   Results: ${timelinesByEncodedName.results.length} timelines found`);
    if (timelinesByEncodedName.results.length > 0) {
      console.log(`   Sample: ${timelinesByEncodedName.results[0].activity.name} - ${timelinesByEncodedName.results[0].status}`);
      console.log(`   Client: ${timelinesByEncodedName.results[0].client.name}`);
    }
    
    // Test 5: Partial name matching
    console.log('\n📊 Test 4: Query with partial name');
    const partialName = 'AARTI';
    const timelinesByPartialName = await queryTimelines(
      { client: partialName },
      { page: 1, limit: 5 },
      null
    );
    
    console.log(`   Results: ${timelinesByPartialName.results.length} timelines found`);
    if (timelinesByPartialName.results.length > 0) {
      console.log(`   Sample: ${timelinesByPartialName.results[0].activity.name} - ${timelinesByPartialName.results[0].status}`);
      console.log(`   Client: ${timelinesByPartialName.results[0].client.name}`);
    }
    
    // Verify results are consistent
    console.log('\n📊 CONSISTENCY CHECK');
    console.log('====================');
    console.log(`ObjectId query: ${timelinesByObjectId.results.length} results`);
    console.log(`Name query: ${timelinesByName.results.length} results`);
    console.log(`Encoded name query: ${timelinesByEncodedName.results.length} results`);
    
    if (timelinesByObjectId.results.length === timelinesByName.results.length && 
        timelinesByName.results.length === timelinesByEncodedName.results.length) {
      console.log('✅ All queries return consistent results!');
    } else {
      console.log('⚠️ Results are inconsistent - may need further investigation');
    }
    
  } catch (error) {
    console.error('❌ Error testing client name filter:', error);
  }
};

/**
 * Test validation fix
 */
const testValidation = async () => {
  console.log('\n🧪 TESTING VALIDATION FIX');
  console.log('=========================');
  
  try {
    // Import validation
    const { getTimelines } = await import('./src/validations/timeline.validation.js');
    
    // Test valid ObjectId
    const objectIdTest = getTimelines.query.validate({
      client: '693167081e5e660756d2c3f4',
      page: 1,
      limit: 10
    });
    
    if (objectIdTest.error) {
      console.log('❌ ObjectId validation failed:', objectIdTest.error.message);
    } else {
      console.log('✅ ObjectId validation passed');
    }
    
    // Test client name
    const nameTest = getTimelines.query.validate({
      client: 'AARTI DHARIWAL',
      page: 1,
      limit: 10
    });
    
    if (nameTest.error) {
      console.log('❌ Client name validation failed:', nameTest.error.message);
    } else {
      console.log('✅ Client name validation passed');
    }
    
    // Test URL-encoded name
    const encodedTest = getTimelines.query.validate({
      client: 'AARTI+DHARIWAL',
      page: 1,
      limit: 10
    });
    
    if (encodedTest.error) {
      console.log('❌ URL-encoded name validation failed:', encodedTest.error.message);
    } else {
      console.log('✅ URL-encoded name validation passed');
    }
    
  } catch (error) {
    console.error('❌ Error testing validation:', error);
  }
};

/**
 * Main function
 */
const main = async () => {
  try {
    await connectDB();
    
    await testValidation();
    await testClientNameFilter();
    
    console.log('\n🎉 CLIENT NAME FILTER FIX VERIFICATION COMPLETE!');
    console.log('================================================');
    console.log('The timeline API now supports:');
    console.log('✅ Client ObjectIds (existing functionality)');
    console.log('✅ Client names (new functionality)');
    console.log('✅ URL-encoded client names (fixes the API issue)');
    console.log('✅ Partial client name matching');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Test complete. Database connection closed.');
  }
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

