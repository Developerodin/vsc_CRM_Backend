import mongoose from 'mongoose';
import Client from '../models/client.model.js';
import config from '../config/config.js';

/**
 * Migration script to add category field to existing clients
 * This script sets the default category value 'C' for all clients that don't have a category
 */
const migrateClientCategory = async () => {
  try {
    console.log('🚀 Starting client category migration...');
    
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB');

    // Find all clients without a category field
    const clientsWithoutCategory = await Client.countDocuments({
      $or: [
        { category: { $exists: false } },
        { category: null },
        { category: '' }
      ]
    });

    console.log(`📊 Found ${clientsWithoutCategory} clients without category`);

    if (clientsWithoutCategory === 0) {
      console.log('✅ All clients already have a category. No migration needed.');
      await mongoose.connection.close();
      return;
    }

    // Update all clients without category to have default value 'C'
    const result = await Client.updateMany(
      {
        $or: [
          { category: { $exists: false } },
          { category: null },
          { category: '' }
        ]
      },
      {
        $set: { category: 'C' }
      }
    );

    console.log(`✅ Successfully updated ${result.modifiedCount} clients with category 'C'`);
    console.log(`📊 Matched: ${result.matchedCount}, Modified: ${result.modifiedCount}`);

    // Verify the migration
    const remainingClientsWithoutCategory = await Client.countDocuments({
      $or: [
        { category: { $exists: false } },
        { category: null },
        { category: '' }
      ]
    });

    if (remainingClientsWithoutCategory === 0) {
      console.log('✅ Migration completed successfully! All clients now have a category.');
    } else {
      console.log(`⚠️ Warning: ${remainingClientsWithoutCategory} clients still without category`);
    }

    // Show distribution of categories
    const categoryDistribution = await Client.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    console.log('\n📊 Category distribution after migration:');
    categoryDistribution.forEach(item => {
      console.log(`   Category ${item._id}: ${item.count} clients`);
    });

    // Close the connection
    await mongoose.connection.close();
    console.log('\n✅ Migration completed and database connection closed');
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateClientCategory()
    .then(() => {
      console.log('✅ Migration script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

export default migrateClientCategory;
