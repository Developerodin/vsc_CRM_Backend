import { setupBranchAccess } from '../src/scripts/setup-branch-access.js';
import mongoose from 'mongoose';
import logger from '../src/config/logger.js';

const runSetup = async () => {
  try {
    // Set NODE_ENV if not already set
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'development';
    }
    
    // Import config after setting NODE_ENV
    const config = await import('../src/config/config.js');
    
    // Connect to database
    await mongoose.connect(config.default.mongoose.url, config.default.mongoose.options);
    logger.info('Connected to MongoDB');
    
    // Run the setup
    await setupBranchAccess();
    
  } catch (error) {
    logger.error('❌ Error in setup script:', error);
  } finally {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the setup
runSetup(); 