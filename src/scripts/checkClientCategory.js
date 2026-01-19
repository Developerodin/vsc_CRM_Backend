import mongoose from 'mongoose';
import Client from '../models/client.model.js';
import config from '../config/config.js';

/**
 * Script to check the status of client category field
 * This script provides a quick overview of category distribution and identifies any issues
 */
const checkClientCategory = async () => {
  try {
    console.log('🔍 Checking client category field status...\n');
    
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');

    // Get total client count
    const totalClients = await Client.countDocuments();
    console.log(`📊 Total Clients: ${totalClients}`);

    // Count clients without category
    const clientsWithoutCategory = await Client.countDocuments({
      $or: [
        { category: { $exists: false } },
        { category: null },
        { category: '' }
      ]
    });

    console.log(`📊 Clients without category: ${clientsWithoutCategory}`);

    if (clientsWithoutCategory > 0) {
      console.log('\n⚠️  WARNING: Some clients do not have a category field!');
      console.log('   Please run the migration script:');
      console.log('   node src/scripts/migrateClientCategory.js\n');
    } else {
      console.log('\n✅ All clients have a category field!\n');
    }

    // Get category distribution
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

    console.log('📊 Category Distribution:');
    console.log('─────────────────────────');
    
    let totalCategorized = 0;
    const categories = { A: 0, B: 0, C: 0 };
    
    categoryDistribution.forEach(item => {
      if (item._id === null) {
        console.log(`   NULL/Undefined: ${item.count} clients`);
      } else if (['A', 'B', 'C'].includes(item._id)) {
        categories[item._id] = item.count;
        totalCategorized += item.count;
        const percentage = ((item.count / totalClients) * 100).toFixed(2);
        console.log(`   Category ${item._id}: ${item.count} clients (${percentage}%)`);
      } else {
        console.log(`   Invalid category '${item._id}': ${item.count} clients ⚠️`);
      }
    });

    // Check for clients with invalid categories
    const invalidCategories = await Client.countDocuments({
      category: { $exists: true, $nin: ['A', 'B', 'C', null, ''] }
    });

    if (invalidCategories > 0) {
      console.log(`\n⚠️  WARNING: ${invalidCategories} clients have invalid category values!`);
      console.log('   Valid categories are: A, B, C');
      
      // Show invalid category values
      const invalidCategoryValues = await Client.aggregate([
        {
          $match: {
            category: { $exists: true, $nin: ['A', 'B', 'C', null, ''] }
          }
        },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            examples: { $push: '$name' }
          }
        }
      ]);

      console.log('\n   Invalid category values found:');
      invalidCategoryValues.forEach(item => {
        console.log(`   - '${item._id}': ${item.count} clients`);
        console.log(`     Examples: ${item.examples.slice(0, 3).join(', ')}`);
      });
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log('─────────────────────────');
    console.log(`   Total Clients: ${totalClients}`);
    console.log(`   With Valid Category: ${totalCategorized} (${((totalCategorized / totalClients) * 100).toFixed(2)}%)`);
    console.log(`   Without Category: ${clientsWithoutCategory}`);
    console.log(`   Invalid Category: ${invalidCategories}`);

    // Health check
    console.log('\n🏥 Health Check:');
    console.log('─────────────────────────');
    
    if (clientsWithoutCategory === 0 && invalidCategories === 0) {
      console.log('   ✅ HEALTHY - All clients have valid categories');
    } else {
      console.log('   ⚠️  ATTENTION NEEDED');
      if (clientsWithoutCategory > 0) {
        console.log(`   - ${clientsWithoutCategory} clients need category assignment`);
      }
      if (invalidCategories > 0) {
        console.log(`   - ${invalidCategories} clients have invalid categories`);
      }
      console.log('\n   Recommended Action:');
      console.log('   Run: node src/scripts/migrateClientCategory.js');
    }

    // Sample clients from each category
    console.log('\n📋 Sample Clients by Category:');
    console.log('─────────────────────────');
    
    for (const cat of ['A', 'B', 'C']) {
      const samples = await Client.find({ category: cat })
        .select('name category')
        .limit(3)
        .lean();
      
      if (samples.length > 0) {
        console.log(`\n   Category ${cat}:`);
        samples.forEach((client, index) => {
          console.log(`   ${index + 1}. ${client.name}`);
        });
      }
    }

    // Close the connection
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed\n');
    
  } catch (error) {
    console.error('❌ Error during check:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run the check if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkClientCategory()
    .then(() => {
      console.log('✅ Check completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Check failed:', error);
      process.exit(1);
    });
}

export default checkClientCategory;
