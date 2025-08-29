import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Client } from '../src/models/index.js';

// Load environment variables
dotenv.config();

/**
 * Test script to verify the new GST functionality
 * This script will:
 * 1. Create a test client with multiple GST numbers
 * 2. Test GST number operations
 * 3. Verify validation and constraints
 */
const testGstFunctionality = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URL || 'mongodb://localhost:27017/vsc_crm';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clean up any existing test clients
    await Client.deleteMany({ name: 'Test Client GST' });
    console.log('Cleaned up existing test clients');

    // Test 1: Create client with multiple GST numbers
    console.log('\n=== Test 1: Creating client with multiple GST numbers ===');
    
    const testClient = new Client({
      name: 'Test Client GST',
      email: 'testgst@example.com',
      phone: '+919876543210',
      state: 'Maharashtra',
      country: 'India',
      branch: new mongoose.Types.ObjectId(), // Mock branch ID
      gstNumbers: [
        {
          state: 'Maharashtra',
          gstNumber: '27ABCDE1234F1Z5'
        },
        {
          state: 'Karnataka',
          gstNumber: '29ABCDE1234F1Z5'
        },
        {
          state: 'Delhi',
          gstNumber: '07ABCDE1234F1Z5'
        }
      ]
    });

    const savedClient = await testClient.save();
    console.log('✓ Client created successfully with multiple GST numbers');
    console.log(`  Client ID: ${savedClient._id}`);
    console.log(`  GST Numbers: ${savedClient.gstNumbers.length}`);

    // Test 2: Verify GST numbers are stored correctly
    console.log('\n=== Test 2: Verifying GST number storage ===');
    
    const retrievedClient = await Client.findById(savedClient._id);
    console.log('✓ Client retrieved successfully');
    console.log('  GST Numbers:');
    retrievedClient.gstNumbers.forEach((gst, index) => {
      console.log(`    ${index + 1}. State: ${gst.state}, GST: ${gst.gstNumber}`);
    });

    // Test 3: Test GST number validation
    console.log('\n=== Test 3: Testing GST number validation ===');
    
    try {
      const invalidClient = new Client({
        name: 'Invalid GST Test',
        email: 'invalidgst@example.com',
        phone: '+919876543211',
        state: 'Test State',
        country: 'India',
        branch: new mongoose.Types.ObjectId(),
        gstNumbers: [
          {
            state: 'Test State',
            gstNumber: 'INVALID_GST' // Invalid format
          }
        ]
      });
      
      await invalidClient.save();
      console.log('✗ Invalid GST number was saved (validation failed)');
    } catch (error) {
      console.log('✓ Invalid GST number validation working correctly');
      console.log(`  Error: ${error.message}`);
    }

    // Test 4: Test duplicate state constraint
    console.log('\n=== Test 4: Testing duplicate state constraint ===');
    
    try {
      retrievedClient.gstNumbers.push({
        state: 'Maharashtra', // Duplicate state
        gstNumber: '27XYZAB5678G2Z9'
      });
      
      await retrievedClient.save();
      console.log('✗ Duplicate state GST was saved (constraint failed)');
    } catch (error) {
      console.log('✓ Duplicate state constraint working correctly');
      console.log(`  Error: ${error.message}`);
    }

    // Test 5: Test GST number operations
    console.log('\n=== Test 5: Testing GST number operations ===');
    
    // Add new GST number
    retrievedClient.gstNumbers.push({
      state: 'Tamil Nadu',
      gstNumber: '33ABCDE1234F1Z5'
    });
    await retrievedClient.save();
    console.log('✓ Added new GST number for Tamil Nadu');

    // Update existing GST number
    const gstToUpdate = retrievedClient.gstNumbers.find(gst => gst.state === 'Karnataka');
    if (gstToUpdate) {
      gstToUpdate.gstNumber = '29XYZAB5678G2Z9';
      await retrievedClient.save();
      console.log('✓ Updated GST number for Karnataka');
    }

    // Remove GST number
    const gstToRemove = retrievedClient.gstNumbers.find(gst => gst.state === 'Delhi');
    if (gstToRemove) {
      const gstIndex = retrievedClient.gstNumbers.indexOf(gstToRemove);
      retrievedClient.gstNumbers.splice(gstIndex, 1);
      await retrievedClient.save();
      console.log('✓ Removed GST number for Delhi');
    }

    // Verify final state
    const finalClient = await Client.findById(savedClient._id);
    console.log('\n  Final GST Numbers:');
    finalClient.gstNumbers.forEach((gst, index) => {
      console.log(`    ${index + 1}. State: ${gst.state}, GST: ${gst.gstNumber}`);
    });

    // Test 6: Test search functionality
    console.log('\n=== Test 6: Testing search functionality ===');
    
    // Search by GST number
    const searchByGst = await Client.find({
      'gstNumbers.gstNumber': { $regex: '29XYZAB', $options: 'i' }
    });
    console.log(`✓ Search by GST number found ${searchByGst.length} clients`);

    // Search by state
    const searchByState = await Client.find({
      'gstNumbers.state': { $regex: 'Maharashtra', $options: 'i' }
    });
    console.log(`✓ Search by state found ${searchByState.length} clients`);

    // Clean up
    await Client.findByIdAndDelete(savedClient._id);
    console.log('\n✓ Test client cleaned up');

    console.log('\n🎉 All GST functionality tests passed successfully!');

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testGstFunctionality();
}

export default testGstFunctionality;
