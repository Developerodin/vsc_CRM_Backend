import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Set default NODE_ENV if not provided
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

import Client from './src/models/client.model.js';
import FileManager from './src/models/fileManager.model.js';

// Connect to MongoDB directly
const MONGODB_URL = process.env.MONGODB_URL;
if (!MONGODB_URL) {
  console.error('MONGODB_URL is required in environment variables');
  process.exit(1);
}

mongoose.connect(MONGODB_URL, {
  useNewUrlParser: true,
  useUnifiedUrlParser: true,
});

const debugClientFolder = async () => {
  try {
    console.log('🔍 Starting client folder diagnostic...\n');

    const clientId = '689ec6414a57b93af0c4c1ec';
    console.log(`📋 Checking for client ID: ${clientId}\n`);

    // 1. Check if client exists
    console.log('1️⃣ Checking if client exists...');
    const client = await Client.findById(clientId);
    if (!client) {
      console.log('❌ Client not found in database');
      return;
    }
    console.log(`✅ Client found: ${client.name} (${client.email})`);
    console.log(`   Branch: ${client.branch || 'No branch'}`);
    console.log(`   Created: ${client.createdAt}`);
    console.log('');

    // 2. Check for client folder with metadata.clientId
    console.log('2️⃣ Checking for client folder with metadata.clientId...');
    const clientFolderByMetadata = await FileManager.findOne({
      type: 'folder',
      'folder.metadata.clientId': new mongoose.Types.ObjectId(clientId),
      isDeleted: false,
    });
    
    if (clientFolderByMetadata) {
      console.log('✅ Client folder found by metadata.clientId:');
      console.log(`   ID: ${clientFolderByMetadata._id}`);
      console.log(`   Name: ${clientFolderByMetadata.folder.name}`);
      console.log(`   Path: ${clientFolderByMetadata.folder.path}`);
      console.log(`   Parent: ${clientFolderByMetadata.folder.parentFolder}`);
      console.log(`   Metadata:`, clientFolderByMetadata.folder.metadata);
    } else {
      console.log('❌ No client folder found by metadata.clientId');
    }
    console.log('');

    // 3. Check for client folder by name
    console.log('3️⃣ Checking for client folder by name...');
    const clientFolderByName = await FileManager.findOne({
      type: 'folder',
      'folder.name': client.name,
      isDeleted: false,
    });
    
    if (clientFolderByName) {
      console.log('✅ Client folder found by name:');
      console.log(`   ID: ${clientFolderByName._id}`);
      console.log(`   Name: ${clientFolderByName.folder.name}`);
      console.log(`   Path: ${clientFolderByName.folder.path}`);
      console.log(`   Parent: ${clientFolderByName.folder.parentFolder}`);
      console.log(`   Metadata:`, clientFolderByName.folder.metadata);
    } else {
      console.log('❌ No client folder found by name');
    }
    console.log('');

    // 4. Check for Clients parent folder
    console.log('4️⃣ Checking for Clients parent folder...');
    const clientsParentFolder = await FileManager.findOne({
      type: 'folder',
      'folder.name': 'Clients',
      'folder.isRoot': true,
      isDeleted: false,
    });
    
    if (clientsParentFolder) {
      console.log('✅ Clients parent folder found:');
      console.log(`   ID: ${clientsParentFolder._id}`);
      console.log(`   Name: ${clientsParentFolder.folder.name}`);
      console.log(`   Path: ${clientsParentFolder.folder.path}`);
      console.log(`   Is Root: ${clientsParentFolder.folder.isRoot}`);
    } else {
      console.log('❌ No Clients parent folder found');
    }
    console.log('');

    // 5. Check all folders under Clients parent
    if (clientsParentFolder) {
      console.log('5️⃣ Checking all subfolders under Clients parent...');
      const clientSubfolders = await FileManager.find({
        type: 'folder',
        'folder.parentFolder': clientsParentFolder._id,
        isDeleted: false,
      });
      
      console.log(`Found ${clientSubfolders.length} subfolders under Clients:`);
      clientSubfolders.forEach(folder => {
        console.log(`   - ${folder.folder.name} (ID: ${folder._id})`);
        if (folder.folder.metadata) {
          console.log(`     Metadata:`, folder.folder.metadata);
        }
      });
    }
    console.log('');

    // 6. Check for any folders with similar metadata
    console.log('6️⃣ Checking for any folders with client-related metadata...');
    const foldersWithClientMetadata = await FileManager.find({
      type: 'folder',
      'folder.metadata.clientId': { $exists: true },
      isDeleted: false,
    });
    
    console.log(`Found ${foldersWithClientMetadata.length} folders with client metadata:`);
    foldersWithClientMetadata.forEach(folder => {
      console.log(`   - ${folder.folder.name} (ID: ${folder._id})`);
      console.log(`     Client ID: ${folder.folder.metadata.clientId}`);
      console.log(`     Client Name: ${folder.folder.metadata.clientName || 'N/A'}`);
    });
    console.log('');

    // 7. Check for any folders with client name in path
    console.log('7️⃣ Checking for any folders with client name in path...');
    const foldersWithClientPath = await FileManager.find({
      type: 'folder',
      'folder.path': { $regex: client.name, $options: 'i' },
      isDeleted: false,
    });
    
    console.log(`Found ${foldersWithClientPath.length} folders with client name in path:`);
    foldersWithClientPath.forEach(folder => {
      console.log(`   - ${folder.folder.name} (ID: ${folder._id})`);
      console.log(`     Path: ${folder.folder.path}`);
      console.log(`     Metadata:`, folder.folder.metadata);
    });

  } catch (error) {
    console.error('❌ Error during diagnostic:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
};

// Run the diagnostic
debugClientFolder();
