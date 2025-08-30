import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getAllTimelines, getClientTimelines } from './src/services/timeline.service.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test timeline population
const testTimelinePopulation = async () => {
  try {
    console.log('\n🧪 Testing timeline population...');
    
    // Get all timelines with populated data
    console.log('📊 Getting all timelines with populated data...');
    const allTimelines = await getAllTimelines({}, { limit: 5 });
    
    console.log(`✅ Found ${allTimelines.length} timelines`);
    
    if (allTimelines.length > 0) {
      console.log('\n📅 Sample timeline with populated data:');
      const sampleTimeline = allTimelines[0];
      
      console.log(`   Timeline ID: ${sampleTimeline._id}`);
      console.log(`   Status: ${sampleTimeline.status}`);
      console.log(`   Due Date: ${sampleTimeline.dueDate}`);
      console.log(`   Frequency: ${sampleTimeline.frequency}`);
      console.log(`   Timeline Type: ${sampleTimeline.timelineType}`);
      console.log(`   Financial Year: ${sampleTimeline.financialYear}`);
      console.log(`   Period: ${sampleTimeline.period}`);
      
      // Check populated activity
      if (sampleTimeline.activity) {
        console.log(`\n   📋 Activity (Populated):`);
        console.log(`      Name: ${sampleTimeline.activity.name}`);
        console.log(`      Sort Order: ${sampleTimeline.activity.sortOrder}`);
        console.log(`      Subactivities Count: ${sampleTimeline.activity.subactivities?.length || 0}`);
      } else {
        console.log(`\n   ⚠️ Activity not populated`);
      }
      
      // Check populated subactivity
      if (sampleTimeline.subactivity) {
        console.log(`\n   📋 Subactivity (Populated):`);
        console.log(`      Name: ${sampleTimeline.subactivity.name}`);
        console.log(`      Frequency: ${sampleTimeline.subactivity.frequency}`);
        console.log(`      Fields Count: ${sampleTimeline.subactivity.fields?.length || 0}`);
        
        if (sampleTimeline.subactivity.fields && sampleTimeline.subactivity.fields.length > 0) {
          console.log(`      Fields:`);
          sampleTimeline.subactivity.fields.forEach((field, index) => {
            console.log(`         ${index + 1}. ${field.name} (${field.type}): ${field.required ? 'required' : 'optional'}`);
          });
        }
      } else {
        console.log(`\n   ⚠️ Subactivity not populated`);
      }
      
      // Check populated client
      if (sampleTimeline.client) {
        console.log(`\n   📋 Client (Populated):`);
        console.log(`      Name: ${sampleTimeline.client.name}`);
        console.log(`      Email: ${sampleTimeline.client.email}`);
        console.log(`      Phone: ${sampleTimeline.client.phone}`);
      } else {
        console.log(`\n   ⚠️ Client not populated`);
      }
      
      // Check timeline fields
      console.log(`\n   📋 Timeline Fields:`);
      console.log(`      Fields Count: ${sampleTimeline.fields?.length || 0}`);
      
      if (sampleTimeline.fields && sampleTimeline.fields.length > 0) {
        sampleTimeline.fields.forEach((field, index) => {
          console.log(`         ${index + 1}. ${field.fileName} (${field.fieldType}): ${field.fieldValue || 'null'}`);
        });
      }
      
      // Summary
      console.log('\n📊 Population Summary:');
      console.log(`   - Activity populated: ${sampleTimeline.activity ? '✅ Yes' : '❌ No'}`);
      console.log(`   - Subactivity populated: ${sampleTimeline.subactivity ? '✅ Yes' : '❌ No'}`);
      console.log(`   - Client populated: ${sampleTimeline.client ? '✅ Yes' : '❌ No'}`);
      console.log(`   - Fields copied: ${sampleTimeline.fields && sampleTimeline.fields.length > 0 ? '✅ Yes' : '❌ No'}`);
      
    } else {
      console.log('⚠️ No timelines found');
    }
    
  } catch (error) {
    console.error('❌ Error testing timeline population:', error);
  }
};

// Test client-specific timeline population
const testClientTimelinePopulation = async () => {
  try {
    console.log('\n🧪 Testing client-specific timeline population...');
    
    // Find a test client
    const Client = mongoose.model('Client');
    const testClient = await Client.findOne({ name: { $regex: /Test Client/ } });
    
    if (!testClient) {
      console.log('⚠️ No test client found');
      return;
    }
    
    console.log(`✅ Found test client: ${testClient.name} (ID: ${testClient._id})`);
    
    // Get timelines for this client with populated data
    const clientTimelines = await getClientTimelines(testClient._id, testClient.branch);
    
    console.log(`📊 Found ${clientTimelines.length} timelines for the test client`);
    
    if (clientTimelines.length > 0) {
      console.log('\n📅 Client timeline with populated data:');
      const sampleTimeline = clientTimelines[0];
      
      console.log(`   Timeline ID: ${sampleTimeline._id}`);
      console.log(`   Activity: ${sampleTimeline.activity?.name || 'N/A'}`);
      console.log(`   Subactivity: ${sampleTimeline.subactivity?.name || 'N/A'}`);
      console.log(`   Client: ${sampleTimeline.client?.name || 'N/A'}`);
      console.log(`   Fields: ${sampleTimeline.fields?.length || 0} fields`);
      
      // Check if fields are properly copied
      if (sampleTimeline.fields && sampleTimeline.fields.length > 0) {
        console.log(`   📋 Timeline Fields:`);
        sampleTimeline.fields.forEach((field, index) => {
          console.log(`      ${index + 1}. ${field.fileName} (${field.fieldType}): ${field.fieldValue || 'null'}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error testing client timeline population:', error);
  }
};

// Main function
const runTest = async () => {
  try {
    await connectDB();
    
    console.log('\n🧪 Starting timeline population test...\n');
    
    // Test general timeline population
    await testTimelinePopulation();
    
    // Test client-specific timeline population
    await testClientTimelinePopulation();
    
    console.log('\n✅ Timeline population test completed!');
    
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
console.log('🚀 Starting timeline population test...');
runTest();
