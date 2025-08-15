import mongoose from 'mongoose';
import { reprocessExistingClients } from '../src/services/client.service.js';
import config from '../src/config/config.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Main function
const main = async () => {
  try {
    await connectDB();
    
    console.log('Starting client reprocessing...');
    
    // You can customize the filter here if you want to process specific clients
    // For example, to process only clients from a specific branch:
    // const filter = { branch: 'your-branch-id' };
    
    // To process all clients (default)
    const filter = {};
    
    // Process in batches of 50 (you can adjust this)
    const batchSize = 50;
    
    const results = await reprocessExistingClients(filter, batchSize);
    
    console.log('\n=== REPROCESSING COMPLETED ===');
    console.log(`Total clients found: ${results.totalClients}`);
    console.log(`Successfully processed: ${results.processed}`);
    console.log(`Subfolders created: ${results.subfoldersCreated}`);
    console.log(`Timelines created: ${results.timelinesCreated}`);
    console.log(`Errors: ${results.errors.length}`);
    
    if (results.errors.length > 0) {
      console.log('\n=== ERRORS ===');
      results.errors.forEach((error, index) => {
        console.log(`${index + 1}. Client: ${error.clientName} (${error.clientId})`);
        console.log(`   Error: ${error.error}`);
      });
    }
    
  } catch (error) {
    console.error('Error during reprocessing:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Run the main function
main();
