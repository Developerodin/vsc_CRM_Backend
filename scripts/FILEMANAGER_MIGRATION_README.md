# FileManager Permissions Migration

This directory contains migration scripts to add fileManager permissions to existing roles in your database.

## Scripts Available

### 1. Basic Migration Script
**File:** `add-filemanager-permissions.js`

This script adds fileManager permissions to all existing roles with the following defaults:
- `navigationPermissions.fileManager`: `true`
- `apiPermissions.getFileManager`: `true`
- `apiPermissions.manageFileManager`: `true`

**Usage:**
```bash
node scripts/add-filemanager-permissions.js
```

### 2. Advanced Migration Script
**File:** `add-filemanager-permissions-advanced.js`

This script adds fileManager permissions with role-specific configurations:

- **Admin Role**: Full access (navigation: true, getFileManager: true, manageFileManager: true)
- **Manager Role**: Full access (navigation: true, getFileManager: true, manageFileManager: true)
- **User Role**: View-only access (navigation: true, getFileManager: true, manageFileManager: false)
- **Other Roles**: Default to view-only access

**Usage:**
```bash
node scripts/add-filemanager-permissions-advanced.js
```

## When to Use Each Script

### Use Basic Script When:
- You want all roles to have full fileManager access
- You have a simple role structure
- You want to quickly enable fileManager for all users

### Use Advanced Script When:
- You want different permission levels for different role types
- You want to follow the principle of least privilege
- You have a more complex role hierarchy

## What the Scripts Do

1. **Connect to Database**: Uses your existing MongoDB configuration
2. **Find All Roles**: Retrieves all existing roles from the database
3. **Check Current Permissions**: Verifies if fileManager permissions already exist
4. **Update Permissions**: Adds missing fileManager permissions
5. **Log Progress**: Shows detailed logs of what's being updated
6. **Verify Results**: Displays a summary of final permissions

## Example Output

```
info: Connected to MongoDB
info: Found 3 roles to update
info: Adding fileManager navigation permission (true) to role: Admin
info: Adding getFileManager API permission (true) to role: Admin
info: Adding manageFileManager API permission (true) to role: Admin
info: Successfully updated role: Admin
info: Adding fileManager navigation permission (true) to role: User
info: Adding getFileManager API permission (true) to role: User
info: Adding manageFileManager API permission (false) to role: User
info: Successfully updated role: User
info: Migration completed successfully!
info: Updated: 2 roles
info: Skipped: 1 roles (already had permissions)

=== FINAL ROLE PERMISSIONS SUMMARY ===
Admin:
  Navigation fileManager: true
  API getFileManager: true
  API manageFileManager: true
User:
  Navigation fileManager: true
  API getFileManager: true
  API manageFileManager: false
```

## Safety Features

- **Idempotent**: Can be run multiple times safely
- **Non-destructive**: Only adds missing permissions, doesn't remove existing ones
- **Logging**: Detailed logs show exactly what's being changed
- **Verification**: Shows final state of all roles after migration

## Prerequisites

1. Ensure your MongoDB is running
2. Make sure you have existing roles in the database
3. If no roles exist, run the default roles script first:
   ```bash
   node src/scripts/createDefaultRoles.js
   ```

## Troubleshooting

### No Roles Found
If the script shows "Found 0 roles to update", run the default roles script first:
```bash
node src/scripts/createDefaultRoles.js
```

### Permission Denied
Make sure your MongoDB connection has write permissions to the roles collection.

### Script Not Found
Ensure you're running the script from the project root directory (vsc_CRM_Backend/).

## After Migration

Once the migration is complete, your roles will have fileManager permissions and you can:

1. Use the permissions in your middleware:
   ```javascript
   router.get('/files', auth('getFileManager'), fileController.getFiles);
   router.post('/files', auth('manageFileManager'), fileController.uploadFile);
   ```

2. Check permissions in your code:
   ```javascript
   import { hasPermission, hasNavigationAccess } from '../services/role.service.js';
   
   const canViewFiles = hasPermission(user.role, 'getFileManager');
   const canManageFiles = hasPermission(user.role, 'manageFileManager');
   const canAccessFileManager = hasNavigationAccess(user.role, '/file-manager');
   ```

3. Use the permissions API endpoints:
   - `GET /v1/roles/available-permissions`
   - `GET /v1/roles/available-navigation-permissions`
   - `GET /v1/roles/available-api-permissions` 