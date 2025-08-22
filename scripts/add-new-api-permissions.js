import mongoose from 'mongoose';
import config from '../src/config/config.js';
import { Role } from '../src/models/index.js';

// Connect to MongoDB
mongoose.connect(config.mongoose.url, config.mongoose.options);

const addNewPermissions = async () => {
  try {
    console.log('🔧 Adding new API permissions to roles...');

    // New permissions to add
    const newPermissions = {
      getBusinessMasters: true,
      manageBusinessMasters: true,
      getEntityTypeMasters: true,
      manageEntityTypeMasters: true
    };

    // Update superadmin role first
    const superadminRole = await Role.findOne({ name: 'superadmin' });
    if (superadminRole) {
      console.log('📝 Updating superadmin role...');
      
      // Add new permissions to apiPermissions
      superadminRole.apiPermissions = {
        ...superadminRole.apiPermissions,
        ...newPermissions
      };
      
      await superadminRole.save();
      console.log('✅ Superadmin role updated successfully');
    } else {
      console.log('⚠️ Superadmin role not found');
    }

    // Update all other roles
    const otherRoles = await Role.find({ name: { $ne: 'superadmin' } });
    console.log(`📝 Updating ${otherRoles.length} other roles...`);

    for (const role of otherRoles) {
      // Add new permissions to apiPermissions
      role.apiPermissions = {
        ...role.apiPermissions,
        ...newPermissions
      };
      
      await role.save();
      console.log(`✅ Role '${role.name}' updated successfully`);
    }

    console.log('\n🎉 All roles have been updated with new permissions!');
    console.log('\nNew permissions added:');
    Object.keys(newPermissions).forEach(permission => {
      console.log(`  - ${permission}`);
    });

    console.log('\n📋 You can now use the new APIs:');
    console.log('  - Business Master API: /business-master');
    console.log('  - Entity Type Master API: /entity-master');

  } catch (error) {
    console.error('❌ Error updating roles:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
};

// Run the script
addNewPermissions();
