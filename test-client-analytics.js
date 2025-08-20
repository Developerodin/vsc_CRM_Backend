import mongoose from 'mongoose';
import { config } from './src/config/config.js';
import { clientAnalytics } from './src/services/analytics/index.js';

// Connect to MongoDB
mongoose.connect(config.mongodb.url, config.mongodb.options)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    runTests();
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  });

async function runTests() {
  try {
    console.log('🚀 Starting Client Analytics Tests...\n');

    // Test 1: Client Details Overview
    console.log('1️⃣ Testing Client Details Overview...');
    try {
      // You can replace this with an actual client ID from your database
      const sampleClientId = '689ec6414a57b93af0c4c1f4'; // Sample ObjectId from your data
      const overview = await clientAnalytics.getClientDetailsOverview(sampleClientId);
      console.log('✅ Client Overview:', JSON.stringify(overview, null, 2));
    } catch (error) {
      console.log('⚠️ Client Overview test failed:', error.message);
    }

    console.log('\n🎉 All tests completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}
