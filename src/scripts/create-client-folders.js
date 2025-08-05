import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set default NODE_ENV if not provided
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

import Client from '../models/client.model.js';
import FileManager from '../models/fileManager.model.js';
import User from '../models/user.model.js';

// Connect to MongoDB directly
const MONGODB_URL = process.env.MONGODB_URL;
if (!MONGODB_URL) {
  console.error('MONGODB_URL is required in environment variables');
  process.exit(1);
}

mongoose.connect(MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const createClientFolders = async () => {
  try {
    console.log('Starting to create client folders...');

    // Find a default user for createdBy field
    const defaultUser = await User.findOne({});
    if (!defaultUser) {
      console.error('No users found in database. Please create a user first.');
      return;
    }

    // Ensure Clients parent folder exists
    let clientsParentFolder = await FileManager.findOne({
      type: 'folder',
      'folder.name': 'Clients',
      'folder.isRoot': true,
      isDeleted: false
    });

    if (!clientsParentFolder) {
      console.log('Creating Clients parent folder...');
      clientsParentFolder = await FileManager.create({
        type: 'folder',
        folder: {
          name: 'Clients',
          description: 'Parent folder for all client subfolders',
          parentFolder: null,
          createdBy: defaultUser._id, // Use default user for parent folder
          isRoot: true,
          path: '/Clients'
        }
      });
      console.log('Clients parent folder created successfully');
    } else {
      console.log('Clients parent folder already exists');
    }

    // Get all clients
    const clients = await Client.find({});
    console.log(`Found ${clients.length} clients to process`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const client of clients) {
      // Check if client folder already exists
      const existingClientFolder = await FileManager.findOne({
        type: 'folder',
        'folder.name': client.name,
        'folder.parentFolder': clientsParentFolder._id,
        isDeleted: false
      });

      if (existingClientFolder) {
        console.log(`Skipping client "${client.name}" - folder already exists`);
        skippedCount++;
        continue;
      }

      // Try to find a user associated with the client's branch
      let createdByUser = defaultUser._id;
      if (client.branch) {
        const branchUser = await User.findOne({ branch: client.branch });
        if (branchUser) {
          createdByUser = branchUser._id;
        }
      }

      // Create client subfolder
      await FileManager.create({
        type: 'folder',
        folder: {
          name: client.name,
          description: `Folder for client: ${client.name}`,
          parentFolder: clientsParentFolder._id,
          createdBy: createdByUser, // Use user associated with client's branch or default user
          isRoot: false,
          path: `/Clients/${client.name}`,
          metadata: {
            clientId: client._id,
            clientName: client.name
          }
        }
      });

      console.log(`Created folder for client: ${client.name}`);
      createdCount++;
    }

    console.log('\n=== Summary ===');
    console.log(`Total clients processed: ${clients.length}`);
    console.log(`Folders created: ${createdCount}`);
    console.log(`Folders skipped (already existed): ${skippedCount}`);
    console.log('Client folder creation completed successfully!');

  } catch (error) {
    console.error('Error creating client folders:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
};

// Run the script
createClientFolders(); 