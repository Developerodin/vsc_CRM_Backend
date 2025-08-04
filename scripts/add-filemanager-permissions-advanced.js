import mongoose from 'mongoose';
import config from '../src/config/config.js';
import logger from '../src/config/logger.js';
import Role from '../src/models/role.model.js';

/**
 * Advanced migration script to add fileManager permissions to existing roles
 * with customizable permission levels based on role types
 */
const addFileManagerPermissionsAdvanced = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('Connected to MongoDB');

    // Define permission levels for different role types
    const rolePermissionLevels = {
      'Admin': {
        navigation: true,
        getFileManager: true,
        manageFileManager: true,
      },
      'Manager': {
        navigation: true,
        getFileManager: true,
        manageFileManager: true,
      },
      'User': {
        navigation: true,
        getFileManager: true,
        manageFileManager: false, // Users can view but not manage files
      },
      // Default for any other role types
      'default': {
        navigation: true,
        getFileManager: true,
        manageFileManager: false,
      }
    };

    // Get all existing roles
    const roles = await Role.find({});
    logger.info(`Found ${roles.length} roles to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const role of roles) {
      // Determine permission level based on role name
      const permissionLevel = rolePermissionLevels[role.name] || rolePermissionLevels.default;
      
      let needsUpdate = false;
      const updates = {};

      // Check and update navigation permissions
      if (!role.navigationPermissions.hasOwnProperty('fileManager')) {
        updates['navigationPermissions.fileManager'] = permissionLevel.navigation;
        needsUpdate = true;
        logger.info(`Adding fileManager navigation permission (${permissionLevel.navigation}) to role: ${role.name}`);
      }

      // Check and update API permissions
      if (!role.apiPermissions.hasOwnProperty('getFileManager')) {
        updates['apiPermissions.getFileManager'] = permissionLevel.getFileManager;
        needsUpdate = true;
        logger.info(`Adding getFileManager API permission (${permissionLevel.getFileManager}) to role: ${role.name}`);
      }

      if (!role.apiPermissions.hasOwnProperty('manageFileManager')) {
        updates['apiPermissions.manageFileManager'] = permissionLevel.manageFileManager;
        needsUpdate = true;
        logger.info(`Adding manageFileManager API permission (${permissionLevel.manageFileManager}) to role: ${role.name}`);
      }

      if (needsUpdate) {
        // Update the role with new permissions
        await Role.findByIdAndUpdate(
          role._id,
          { $set: updates },
          { new: true }
        );
        updatedCount++;
        logger.info(`Successfully updated role: ${role.name}`);
      } else {
        skippedCount++;
        logger.info(`Role ${role.name} already has fileManager permissions, skipping`);
      }
    }

    logger.info(`Migration completed successfully!`);
    logger.info(`Updated: ${updatedCount} roles`);
    logger.info(`Skipped: ${skippedCount} roles (already had permissions)`);

    // Show summary of all roles and their fileManager permissions
    logger.info('\n=== FINAL ROLE PERMISSIONS SUMMARY ===');
    const finalRoles = await Role.find({});
    for (const role of finalRoles) {
      logger.info(`${role.name}:`);
      logger.info(`  Navigation fileManager: ${role.navigationPermissions.fileManager || false}`);
      logger.info(`  API getFileManager: ${role.apiPermissions.getFileManager || false}`);
      logger.info(`  API manageFileManager: ${role.apiPermissions.manageFileManager || false}`);
    }

    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addFileManagerPermissionsAdvanced();
}

export { addFileManagerPermissionsAdvanced }; 