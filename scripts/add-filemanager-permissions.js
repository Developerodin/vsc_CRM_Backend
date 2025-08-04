import mongoose from 'mongoose';
import config from '../src/config/config.js';
import logger from '../src/config/logger.js';
import Role from '../src/models/role.model.js';

/**
 * Migration script to add fileManager permissions to existing roles
 */
const addFileManagerPermissions = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    logger.info('Connected to MongoDB');

    // Get all existing roles
    const roles = await Role.find({});
    logger.info(`Found ${roles.length} roles to update`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const role of roles) {
      let needsUpdate = false;
      const updates = {};

      // Check and update navigation permissions
      if (!role.navigationPermissions.hasOwnProperty('fileManager')) {
        updates['navigationPermissions.fileManager'] = true;
        needsUpdate = true;
        logger.info(`Adding fileManager navigation permission to role: ${role.name}`);
      }

      // Check and update API permissions
      if (!role.apiPermissions.hasOwnProperty('getFileManager')) {
        updates['apiPermissions.getFileManager'] = true;
        needsUpdate = true;
        logger.info(`Adding getFileManager API permission to role: ${role.name}`);
      }

      if (!role.apiPermissions.hasOwnProperty('manageFileManager')) {
        updates['apiPermissions.manageFileManager'] = true;
        needsUpdate = true;
        logger.info(`Adding manageFileManager API permission to role: ${role.name}`);
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

    // Verify the update by fetching a sample role
    const sampleRole = await Role.findOne({});
    if (sampleRole) {
      logger.info('Verification - Sample role permissions:');
      logger.info(`Navigation fileManager: ${sampleRole.navigationPermissions.fileManager}`);
      logger.info(`API getFileManager: ${sampleRole.apiPermissions.getFileManager}`);
      logger.info(`API manageFileManager: ${sampleRole.apiPermissions.manageFileManager}`);
    }

    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addFileManagerPermissions();
}

export { addFileManagerPermissions }; 