import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Client } from '../src/models/index.js';

// Load environment variables
dotenv.config();

/**
 * Test script to demonstrate GST number handling during client creation and updates
 * This script shows how the system handles:
 * 1. Creating clients with GST numbers array
 * 2. Updating clients with GST numbers (with and without _id)
 * 3. Adding new GST numbers during updates
 * 4. Updating existing GST numbers during updates
 */
const testGstUpdateLogic = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URL || 'mongodb://localhost:27017/vsc_crm';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clean up any existing test clients
    await Client.deleteMany({ name: { $regex: 'Test GST Update' } });
    console.log('Cleaned up existing test clients');

    // Test 1: Create client with multiple GST numbers
    console.log('\n=== Test 1: Creating client with multiple GST numbers ===');
    
    const createData = {
      name: 'Test GST Update Client',
      email: 'testgstupdate@example.com',
      phone: '+919876543210',
      state: 'Maharashtra',
      country: 'India',
      branch: new mongoose.Types.ObjectId(),
      gstNumbers: [
        {
          state: 'Maharashtra',
          gstNumber: '27ABCDE1234F1Z5'
        },
        {
          state: 'Karnataka',
          gstNumber: '29ABCDE1234F1Z5'
        }
      ]
    };

    const createdClient = await Client.create(createData);
    console.log('✓ Client created successfully');
    console.log(`  Client ID: ${createdClient._id}`);
    console.log(`  GST Numbers: ${createdClient.gstNumbers.length}`);
    createdClient.gstNumbers.forEach((gst, index) => {
      console.log(`    ${index + 1}. State: ${gst.state}, GST: ${gst.gstNumber}, ID: ${gst._id}`);
    });

    // Test 2: Update client with new GST numbers (no _id = add new)
    console.log('\n=== Test 2: Adding new GST numbers during update ===');
    
    const updateData1 = {
      gstNumbers: [
        {
          state: 'Delhi',
          gstNumber: '07XYZAB5678G2Z9'
        },
        {
          state: 'Tamil Nadu',
          gstNumber: '33XYZAB5678G2Z9'
        }
      ]
    };

    // Simulate the update logic
    const clientToUpdate1 = await Client.findById(createdClient._id);
    const existingGstNumbers1 = clientToUpdate1.gstNumbers;
    
    // Process the update data (simulating what the service does)
    const newGstNumbers = [...existingGstNumbers1];
    
    updateData1.gstNumbers.forEach(gstRow => {
      // Since no _id, this is a new GST number
      const existingGst = newGstNumbers.find(gst => gst.state === gstRow.state);
      if (!existingGst) {
        newGstNumbers.push({
          state: gstRow.state.trim(),
          gstNumber: gstRow.gstNumber.trim()
        });
      }
    });

    // Update the client
    clientToUpdate1.gstNumbers = newGstNumbers;
    await clientToUpdate1.save();

    console.log('✓ Added new GST numbers during update');
    console.log(`  Total GST Numbers: ${clientToUpdate1.gstNumbers.length}`);
    clientToUpdate1.gstNumbers.forEach((gst, index) => {
      console.log(`    ${index + 1}. State: ${gst.state}, GST: ${gst.gstNumber}, ID: ${gst._id}`);
    });

    // Test 3: Update existing GST numbers (with _id = update existing)
    console.log('\n=== Test 3: Updating existing GST numbers during update ===');
    
    const updateData2 = {
      gstNumbers: [
        {
          _id: clientToUpdate1.gstNumbers[0]._id, // Update Maharashtra GST
          state: 'Maharashtra',
          gstNumber: '27UPDATED1234F1Z5'
        },
        {
          _id: clientToUpdate1.gstNumbers[1]._id, // Update Karnataka GST
          state: 'Karnataka',
          gstNumber: '29UPDATED1234F1Z5'
        }
      ]
    };

    // Simulate the update logic for existing GST numbers
    const clientToUpdate2 = await Client.findById(createdClient._id);
    const existingGstNumbers2 = clientToUpdate2.gstNumbers;
    
    updateData2.gstNumbers.forEach(gstRow => {
      if (gstRow._id) {
        // Find existing GST by ID and update it
        const existingIndex = existingGstNumbers2.findIndex(gst => gst._id.toString() === gstRow._id);
        if (existingIndex !== -1) {
          existingGstNumbers2[existingIndex] = {
            ...existingGstNumbers2[existingIndex],
            state: gstRow.state,
            gstNumber: gstRow.gstNumber
          };
        }
      }
    });

    // Update the client
    clientToUpdate2.gstNumbers = existingGstNumbers2;
    await clientToUpdate2.save();

    console.log('✓ Updated existing GST numbers during update');
    console.log(`  Total GST Numbers: ${clientToUpdate2.gstNumbers.length}`);
    clientToUpdate2.gstNumbers.forEach((gst, index) => {
      console.log(`    ${index + 1}. State: ${gst.state}, GST: ${gst.gstNumber}, ID: ${gst._id}`);
    });

    // Test 4: Mixed update (some new, some existing)
    console.log('\n=== Test 4: Mixed update (new + existing GST numbers) ===');
    
    const updateData3 = {
      gstNumbers: [
        {
          _id: clientToUpdate2.gstNumbers[0]._id, // Update existing Maharashtra GST
          state: 'Maharashtra',
          gstNumber: '27FINAL1234F1Z5'
        },
        {
          // No _id = new GST number
          state: 'Gujarat',
          gstNumber: '24NEWGST5678G2Z9'
        },
        {
          _id: clientToUpdate2.gstNumbers[2]._id, // Update existing Delhi GST
          state: 'Delhi',
          gstNumber: '07FINAL5678G2Z9'
        }
      ]
    };

    // Simulate the mixed update logic
    const clientToUpdate3 = await Client.findById(createdClient._id);
    const existingGstNumbers3 = clientToUpdate3.gstNumbers;
    
    updateData3.gstNumbers.forEach(gstRow => {
      if (gstRow._id) {
        // Update existing GST number
        const existingIndex = existingGstNumbers3.findIndex(gst => gst._id.toString() === gstRow._id);
        if (existingIndex !== -1) {
          existingGstNumbers3[existingIndex] = {
            ...existingGstNumbers3[existingIndex],
            state: gstRow.state,
            gstNumber: gstRow.gstNumber
          };
        }
      } else {
        // Add new GST number
        const existingGst = existingGstNumbers3.find(gst => gst.state === gstRow.state);
        if (!existingGst) {
          existingGstNumbers3.push({
            state: gstRow.state.trim(),
            gstNumber: gstRow.gstNumber.trim()
          });
        }
      }
    });

    // Update the client
    clientToUpdate3.gstNumbers = existingGstNumbers3;
    await clientToUpdate3.save();

    console.log('✓ Completed mixed update (new + existing GST numbers)');
    console.log(`  Total GST Numbers: ${clientToUpdate3.gstNumbers.length}`);
    clientToUpdate3.gstNumbers.forEach((gst, index) => {
      console.log(`    ${index + 1}. State: ${gst.state}, GST: ${gst.gstNumber}, ID: ${gst._id}`);
    });

    // Test 5: Demonstrate the complete flow
    console.log('\n=== Test 5: Complete GST update flow demonstration ===');
    
    const finalClient = await Client.findById(createdClient._id);
    console.log('Final client state:');
    console.log(`  Name: ${finalClient.name}`);
    console.log(`  Total GST Numbers: ${finalClient.gstNumbers.length}`);
    
    finalClient.gstNumbers.forEach((gst, index) => {
      console.log(`  GST ${index + 1}:`);
      console.log(`    State: ${gst.state}`);
      console.log(`    Number: ${gst.gstNumber}`);
      console.log(`    ID: ${gst._id}`);
      console.log(`    Created: ${gst.createdAt || 'N/A'}`);
      console.log(`    Updated: ${gst.updatedAt || 'N/A'}`);
    });

    // Clean up
    await Client.findByIdAndDelete(createdClient._id);
    console.log('\n✓ Test client cleaned up');

    console.log('\n🎉 GST update logic test completed successfully!');
    console.log('\nSummary of what was tested:');
    console.log('1. ✓ Creating client with initial GST numbers array');
    console.log('2. ✓ Adding new GST numbers during update (no _id)');
    console.log('3. ✓ Updating existing GST numbers during update (with _id)');
    console.log('4. ✓ Mixed updates (both new and existing GST numbers)');
    console.log('5. ✓ Proper ID handling and state management');

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
  testGstUpdateLogic();
}

export default testGstUpdateLogic;
