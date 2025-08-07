import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import config from './src/config/config.js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Import models
import Client from './src/models/client.model.js';
import Branch from './src/models/branch.model.js';

async function createTestClient() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    // Create a test branch if it doesn't exist
    let testBranch = await Branch.findOne({ name: 'Test Branch' });
    if (!testBranch) {
      testBranch = await Branch.create({
        name: 'Test Branch',
        address: 'Test Address',
        phone: '1234567890',
        email: 'test@branch.com',
        manager: 'Test Manager'
      });
      console.log('Created test branch:', testBranch.name);
    }

    // Create a test client
    const testClient = await Client.create({
      name: 'Test Client',
      email: 'test@example.com',
      phone: '9876543210',
      address: 'Test Client Address',
      district: 'Test District',
      state: 'Test State',
      country: 'Test Country',
      branch: testBranch._id
    });

    console.log('✅ Test client created successfully:');
    console.log('   Name:', testClient.name);
    console.log('   Email:', testClient.email);
    console.log('   ID:', testClient._id);
    console.log('   Branch:', testBranch.name);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error creating test client:', error.message);
    process.exit(1);
  }
}

createTestClient();
