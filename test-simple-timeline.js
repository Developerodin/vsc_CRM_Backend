import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Timeline from './src/models/timeline.model.js';

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

// Simple test to check timeline fields
const testTimelineFields = async () => {
  try {
    console.log('\n🧪 Testing timeline fields...');
    
    // Find a timeline with fields
    const timeline = await Timeline.findOne({ 
      fields: { $exists: true, $ne: [] } 
    });
    
    if (timeline) {
      console.log('✅ Found timeline with fields');
      console.log(`📋 Timeline ID: ${timeline._id}`);
      console.log(`📋 Fields count: ${timeline.fields.length}`);
      
      timeline.fields.forEach((field, index) => {
        console.log(`   ${index + 1}. ${field.fileName} (${field.fieldType}): ${field.fieldValue || 'null'}`);
      });
      
      // Check if fields are properly structured
      const hasValidFields = timeline.fields.every(field => 
        field.fileName && field.fieldType && field.hasOwnProperty('fieldValue')
      );
      
      console.log(`\n📊 Field validation: ${hasValidFields ? '✅ All fields valid' : '❌ Some fields invalid'}`);
      
    } else {
      console.log('⚠️ No timeline with fields found');
      
      // Check total timelines
      const totalTimelines = await Timeline.countDocuments();
      console.log(`📊 Total timelines in database: ${totalTimelines}`);
      
      // Check timelines without fields
      const timelinesWithoutFields = await Timeline.countDocuments({ 
        $or: [
          { fields: { $exists: false } },
          { fields: [] }
        ]
      });
      console.log(`📊 Timelines without fields: ${timelinesWithoutFields}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing timeline fields:', error);
  }
};

// Test timeline creation with fields
const testTimelineCreation = async () => {
  try {
    console.log('\n🧪 Testing timeline creation with fields...');
    
    // Create a test timeline with fields
    const testTimeline = new Timeline({
      activity: new mongoose.Types.ObjectId(),
      client: new mongoose.Types.ObjectId(),
      branch: new mongoose.Types.ObjectId(),
      status: 'pending',
      frequency: 'Monthly',
      timelineType: 'recurring',
      financialYear: '2025-2026',
      period: 'Test-Period',
      fields: [
        {
          fileName: 'Test Field 1',
          fieldType: 'text',
          fieldValue: null
        },
        {
          fileName: 'Test Field 2',
          fieldType: 'date',
          fieldValue: null
        }
      ]
    });
    
    const savedTimeline = await testTimeline.save();
    console.log('✅ Test timeline created successfully');
    console.log(`📋 Timeline ID: ${savedTimeline._id}`);
    console.log(`📋 Fields count: ${savedTimeline.fields.length}`);
    
    // Verify fields were saved
    savedTimeline.fields.forEach((field, index) => {
      console.log(`   ${index + 1}. ${field.fileName} (${field.fieldType}): ${field.fieldValue || 'null'}`);
    });
    
    // Clean up test timeline
    await Timeline.deleteOne({ _id: savedTimeline._id });
    console.log('🧹 Test timeline cleaned up');
    
  } catch (error) {
    console.error('❌ Error testing timeline creation:', error);
  }
};

// Main function
const runTest = async () => {
  try {
    await connectDB();
    
    console.log('\n🧪 Starting simple timeline test...\n');
    
    // Test existing timeline fields
    await testTimelineFields();
    
    // Test timeline creation with fields
    await testTimelineCreation();
    
    console.log('\n✅ Simple timeline test completed!');
    
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
console.log('🚀 Starting simple timeline test...');
runTest();
