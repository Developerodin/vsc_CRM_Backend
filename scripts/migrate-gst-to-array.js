import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Client } from '../src/models/index.js';

// Load environment variables
dotenv.config();

/**
 * Migration script to convert existing gstNumber field to gstNumbers array
 * This script will:
 * 1. Find all clients with gstNumber field
 * 2. Convert them to gstNumbers array format
 * 3. Remove the old gstNumber field
 */
const migrateGstToArray = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URL || 'mongodb://localhost:27017/vsc_crm';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all clients with gstNumber field
    const clientsWithGst = await Client.find({
      gstNumber: { $exists: true, $ne: null, $ne: '' }
    });

    console.log(`Found ${clientsWithGst.length} clients with gstNumber field`);

    if (clientsWithGst.length === 0) {
      console.log('No clients to migrate');
      return;
    }

    let migratedCount = 0;
    let errorCount = 0;

    for (const client of clientsWithGst) {
      try {
        // Get the state from client record (default to 'Unknown' if not available)
        const state = client.state || 'Unknown';
        
        // Create gstNumbers array with existing gstNumber
        const gstNumbers = [{
          state: state,
          gstNumber: client.gstNumber
        }];

        // Update the client
        await Client.findByIdAndUpdate(client._id, {
          $set: { gstNumbers: gstNumbers },
          $unset: { gstNumber: 1 }
        });

        console.log(`✓ Migrated client: ${client.name} (${client._id})`);
        migratedCount++;
      } catch (error) {
        console.error(`✗ Error migrating client ${client.name} (${client._id}):`, error.message);
        errorCount++;
      }
    }

    console.log('\nMigration completed!');
    console.log(`Total clients processed: ${clientsWithGst.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Errors: ${errorCount}`);

    // Verify migration
    const remainingClientsWithOldField = await Client.find({
      gstNumber: { $exists: true, $ne: null, $ne: '' }
    });

    if (remainingClientsWithOldField.length === 0) {
      console.log('✓ All clients have been successfully migrated');
    } else {
      console.log(`⚠ ${remainingClientsWithOldField.length} clients still have the old gstNumber field`);
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run migration if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateGstToArray();
}

export default migrateGstToArray;
