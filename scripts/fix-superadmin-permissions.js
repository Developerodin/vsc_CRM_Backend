import mongoose from 'mongoose';
import config from '../src/config/config.js';
import logger from '../src/config/logger.js';
import Role from '../src/models/role.model.js';

/**
 * Script to fix superadmin role permissions - ensures superadmin has ALL permissions enabled
 */
const fixSuperadminPermissions = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('Connected to MongoDB');

    // Find the superadmin role
    const superadminRole = await Role.findOne({ name: 'superadmin' });
    
    if (!superadminRole) {
      logger.error('Superadmin role not found!');
      process.exit(1);
    }

    logger.info(`Found superadmin role: ${superadminRole.name}`);

    // Define ALL possible permissions that should be true for superadmin
    const allNavigationPermissions = {
      dashboard: true,
      clients: true,
      groups: true,
      teams: true,
      timelines: true,
      analytics: true,
      fileManager: true,
      settings: {
        activities: true,
        branches: true,
        users: true,
        roles: true,
      },
    };

    const allApiPermissions = {
      // User permissions
      getUsers: true,
      manageUsers: true,
      // Team member permissions
      getTeamMembers: true,
      manageTeamMembers: true,
      // Activity permissions
      getActivities: true,
      manageActivities: true,
      // Branch permissions
      getBranches: true,
      manageBranches: true,
      // Client permissions
      getClients: true,
      manageClients: true,
      // Group permissions
      getGroups: true,
      manageGroups: true,
      // Timeline permissions
      getTimelines: true,
      manageTimelines: true,
      // Role permissions
      getRoles: true,
      manageRoles: true,
      // File Manager permissions
      getFileManager: true,
      manageFileManager: true,
    };

    // Update the superadmin role with ALL permissions
    const updatedRole = await Role.findByIdAndUpdate(
      superadminRole._id,
      {
        $set: {
          navigationPermissions: allNavigationPermissions,
          apiPermissions: allApiPermissions,
          allBranchesAccess: true, // Superadmin should have access to all branches
        }
      },
      { new: true }
    );

    logger.info('✅ Superadmin role updated successfully!');
    logger.info('\n=== UPDATED SUPERADMIN PERMISSIONS ===');
    logger.info('Navigation Permissions:');
    Object.keys(updatedRole.navigationPermissions).forEach(key => {
      if (key === 'settings') {
        logger.info(`  ${key}:`);
        Object.keys(updatedRole.navigationPermissions[key]).forEach(subKey => {
          logger.info(`    ${subKey}: ${updatedRole.navigationPermissions[key][subKey]}`);
        });
      } else {
        logger.info(`  ${key}: ${updatedRole.navigationPermissions[key]}`);
      }
    });

    logger.info('\nAPI Permissions:');
    Object.keys(updatedRole.apiPermissions).forEach(key => {
      logger.info(`  ${key}: ${updatedRole.apiPermissions[key]}`);
    });

    logger.info(`\nAll Branches Access: ${updatedRole.allBranchesAccess}`);

    // Verify that all permissions are true
    const allNavTrue = Object.keys(updatedRole.navigationPermissions).every(key => {
      if (key === 'settings') {
        return Object.keys(updatedRole.navigationPermissions[key]).every(subKey => 
          updatedRole.navigationPermissions[key][subKey] === true
        );
      }
      return updatedRole.navigationPermissions[key] === true;
    });

    const allApiTrue = Object.keys(updatedRole.apiPermissions).every(key => 
      updatedRole.apiPermissions[key] === true
    );

    if (allNavTrue && allApiTrue && updatedRole.allBranchesAccess) {
      logger.info('\n✅ VERIFICATION: All superadmin permissions are correctly set to true!');
    } else {
      logger.error('\n❌ VERIFICATION FAILED: Some permissions are not set to true!');
    }

    process.exit(0);
  } catch (error) {
    logger.error('Failed to fix superadmin permissions:', error);
    process.exit(1);
  }
};

// Run script if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixSuperadminPermissions();
}

export { fixSuperadminPermissions }; 