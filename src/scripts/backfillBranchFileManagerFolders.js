import mongoose from 'mongoose';
import config from '../config/config.js';
import logger from '../config/logger.js';
import { backfillAllBranchFileManagerFolders } from '../services/branchFileManager.service.js';

/**
 * Backfill Documents/Clients root folders for all branches and client subfolders.
 */
const run = async () => {
  await mongoose.connect(config.mongoose.url, config.mongoose.options);
  logger.info('Starting branch file manager backfill...');

  const summary = await backfillAllBranchFileManagerFolders();

  logger.info('Branch file manager backfill completed');
  logger.info(JSON.stringify(summary, null, 2));

  await mongoose.disconnect();
};

run().catch(async (error) => {
  logger.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
