# Client Folder Setup

This document explains the automatic client folder creation system in FileManager.

## How It Works

### 1. Automatic Folder Creation for New Clients
When a new client is created, the system automatically:
- Ensures a "Clients" parent folder exists in FileManager
- Creates a subfolder with the client's name under the "Clients" folder
- Stores the client ID in the folder's metadata

### 2. Folder Structure
```
/Clients (Parent Folder)
├── Client Name 1 (Subfolder)
│   └── metadata: { clientId: "client_id", clientName: "Client Name 1" }
├── Client Name 2 (Subfolder)
│   └── metadata: { clientId: "client_id", clientName: "Client Name 2" }
└── ...
```

## Script for Existing Clients

To create folders for all existing clients, run:

```bash
node src/scripts/create-client-folders.js
```

This script will:
- Create the "Clients" parent folder if it doesn't exist
- Create subfolders for all existing clients
- Skip clients that already have folders
- Show a summary of created/skipped folders

## Features

- **Automatic Creation**: New clients get folders automatically
- **Client ID Storage**: Each folder stores the client ID in metadata
- **No Duplicates**: System checks for existing folders before creating
- **Error Handling**: Graceful error handling with console logging

## Folder Metadata

Each client subfolder contains:
```json
{
  "clientId": "client_object_id",
  "clientName": "Client Name"
}
```

## Notes

- The "Clients" parent folder is created as a root folder (`isRoot: true`)
- Client folders are created with `isRoot: false`
- All folders use the client's branch as `createdBy`
- Path format: `/Clients/{clientName}` 