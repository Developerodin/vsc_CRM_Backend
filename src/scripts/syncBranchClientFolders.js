import mongoose from 'mongoose';
import config from '../config/config.js';
import logger from '../config/logger.js';
import { Branch } from '../models/index.js';
import {
  ensureBranchRootFolders,
  syncBranchClientFolders,
} from '../services/branchFileManager.service.js';

/**
 * Sync client folders for one branch by name or id.
 */
const run = async () => {
  const branchArg = process.argv[2];
  if (!branchArg) {
    throw new Error('Usage: node src/scripts/syncBranchClientFolders.js <branchNameOrId>');
  }

  await mongoose.connect(config.mongoose.url, config.mongoose.options);

  const branch = mongoose.Types.ObjectId.isValid(branchArg)
    ? await Branch.findById(branchArg)
    : await Branch.findOne({ name: new RegExp(`^${branchArg}$`, 'i') });

  if (!branch) {
    throw new Error(`Branch not found: ${branchArg}`);
  }

  logger.info(`Syncing client folders for branch: ${branch.name} (${branch._id})`);
  await ensureBranchRootFolders(branch._id);
  const syncedCount = await syncBranchClientFolders(branch._id);
  logger.info(`Synced ${syncedCount} client folders for ${branch.name}`);

  await mongoose.disconnect();
};

run().catch(async (error) => {
  logger.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
