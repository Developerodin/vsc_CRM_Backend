import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set default NODE_ENV if not provided
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

import Client from './src/services/client.service.js';

// Connect to MongoDB directly
const MONGODB_URL = process.env.MONGODB_URL;
if (!MONGODB_URL) {
  console.error('MONGODB_URL is required in environment variables');
  process.exit(1);
}

mongoose.connect(MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedUrlParser: true,
});

const debugGstValidation = async () => {
  try {
    console.log('🔍 Starting GST validation debug...\n');

    const clientId = '68b1785c9f67d61ac42141f4';
    console.log(`📋 Checking client ID: ${clientId}\n`);

    // 1. Get the client data
    console.log('1️⃣ Getting client data...');
    const client = await Client.getClientById(clientId);
    if (!client) {
      console.log('❌ Client not found');
      return;
    }
    console.log('✅ Client found');
    console.log(`   Name: ${client.name}`);
    console.log(`   Email: ${client.email}`);
    console.log(`   GST Numbers:`, client.gstNumbers || 'None');
    console.log('');

    // 2. Check what GST data is being sent from frontend
    console.log('2️⃣ Simulating GST validation with sample data...');
    
    // Simulate the data that might be causing issues
    const sampleGstData = [
      {
        state: 'Gujrat',
        gstNumber: '24ABCDE1234F1Z2'
      }
    ];

    console.log('Sample GST data being sent:');
    console.log(JSON.stringify(sampleGstData, null, 2));
    console.log('');

    // 3. Check existing GST numbers in the client
    console.log('3️⃣ Checking existing GST numbers structure...');
    if (client.gstNumbers && Array.isArray(client.gstNumbers)) {
      console.log(`Found ${client.gstNumbers.length} existing GST numbers:`);
      client.gstNumbers.forEach((gst, index) => {
        console.log(`   ${index + 1}. State: ${gst.state}, GST: ${gst.gstNumber}`);
        console.log(`      _id: ${gst._id} (type: ${typeof gst._id})`);
        console.log(`      Has _id: ${!!gst._id}`);
        console.log(`      _id.toString(): ${gst._id ? gst._id.toString() : 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('No existing GST numbers found');
    }

    // 4. Test the validation logic manually
    console.log('4️⃣ Testing validation logic manually...');
    
    // Simulate the validation process
    const existingGstNumbers = client.gstNumbers || [];
    const gstNumbersData = sampleGstData;
    
    console.log('Existing GST numbers count:', existingGstNumbers.length);
    console.log('New GST data count:', gstNumbersData.length);
    
    // Test the findIndex logic that was failing
    if (gstNumbersData[0]._id) {
      console.log('Testing findIndex with _id:', gstNumbersData[0]._id);
      const existingIndex = existingGstNumbers.findIndex(gst => gst._id && gst._id.toString() === gstNumbersData[0]._id);
      console.log('Existing index found:', existingIndex);
    } else {
      console.log('No _id in new GST data, testing state conflict check...');
      const existingGst = existingGstNumbers.find(gst => gst.state === gstNumbersData[0].state);
      if (existingGst) {
        console.log('State conflict found with existing GST:', existingGst);
        console.log('This would cause validation to fail');
      } else {
        console.log('No state conflict found');
      }
    }

  } catch (error) {
    console.error('❌ Error during debug:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
};

// Run the debug
debugGstValidation();
