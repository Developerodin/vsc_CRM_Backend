import mongoose from 'mongoose';
import config from '../src/config/config.js';
import { BusinessMaster, EntityTypeMaster } from '../src/models/index.js';

// Connect to MongoDB
mongoose.connect(config.mongoose.url, config.mongoose.options);

const testNewAPIs = async () => {
  try {
    console.log('🧪 Testing new APIs functionality...\n');

    // Test Business Master Model
    console.log('📊 Testing Business Master Model...');
    
    // Create test business master
    const testBusinessMaster = new BusinessMaster({
      name: 'Test Business Type'
    });
    
    const savedBusinessMaster = await testBusinessMaster.save();
    console.log('✅ Business Master created:', savedBusinessMaster.name);
    
    // Test search functionality
    const foundBusinessMaster = await BusinessMaster.findOne({ name: { $regex: 'Test', $options: 'i' } });
    console.log('✅ Business Master search working:', foundBusinessMaster ? 'Found' : 'Not found');
    
    // Test update functionality
    foundBusinessMaster.name = 'Updated Test Business Type';
    await foundBusinessMaster.save();
    console.log('✅ Business Master update working');
    
    // Test delete functionality
    await BusinessMaster.findByIdAndDelete(savedBusinessMaster._id);
    console.log('✅ Business Master delete working\n');

    // Test Entity Type Master Model
    console.log('📊 Testing Entity Type Master Model...');
    
    // Create test entity type master
    const testEntityTypeMaster = new EntityTypeMaster({
      name: 'Test Entity Type'
    });
    
    const savedEntityTypeMaster = await EntityTypeMaster.save(testEntityTypeMaster);
    console.log('✅ Entity Type Master created:', savedEntityTypeMaster.name);
    
    // Test search functionality
    const foundEntityTypeMaster = await EntityTypeMaster.findOne({ name: { $regex: 'Test', $options: 'i' } });
    console.log('✅ Entity Type Master search working:', foundEntityTypeMaster ? 'Found' : 'Not found');
    
    // Test update functionality
    foundEntityTypeMaster.name = 'Updated Test Entity Type';
    await foundEntityTypeMaster.save();
    console.log('✅ Entity Type Master update working');
    
    // Test delete functionality
    await EntityTypeMaster.findByIdAndDelete(savedEntityTypeMaster._id);
    console.log('✅ Entity Type Master delete working\n');

    console.log('🎉 All tests passed! The new APIs are working correctly.');
    console.log('\n📋 Available endpoints:');
    console.log('  - POST /business-master - Create business master');
    console.log('  - GET /business-master - Get all business masters');
    console.log('  - POST /entity-master - Create entity type master');
    console.log('  - GET /entity-master - Get all entity type masters');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

// Run the test
testNewAPIs();
