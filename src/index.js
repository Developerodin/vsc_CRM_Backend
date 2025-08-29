import mongoose from 'mongoose';
import app from './app.js';
import config from './config/config.js';
import logger from './config/logger.js';
import { initializeCronJobs } from './services/cron.service.js';
import taskStatusCronService from './services/taskStatusCron.service.js';

let server;
mongoose.connect(config.mongoose.url, config.mongoose.options).then(() => {
  logger.info('Connected to MongoDB');
  server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(`Listening to port ${config.port}`);
    
    // Initialize existing cron jobs (email reminders) after server starts
    try {
      initializeCronJobs();
      logger.info('✅ Email reminder cron jobs initialized successfully');
    } catch (error) {
      logger.error('❌ Failed to initialize email reminder cron jobs:', error);
    }

    // Initialize task status cron service after server starts
    try {
      taskStatusCronService.start();
      logger.info('✅ Task status cron service started successfully');
    } catch (error) {
      logger.error('❌ Failed to start task status cron service:', error);
    }
  });
});

const exitHandler = () => {
  if (server) {
    // Stop task status cron service before closing server
    try {
      taskStatusCronService.stop();
      logger.info('Task status cron service stopped');
    } catch (error) {
      logger.error('Error stopping task status cron service:', error);
    }
    
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
