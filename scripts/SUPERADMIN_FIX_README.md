# Superadmin Permissions Fix

This directory contains scripts to fix and ensure the superadmin role has ALL permissions enabled.

## Problem

The superadmin role was missing some permissions, particularly in the settings section:
- `settings.activities: false` (should be `true`)
- `settings.branches: false` (should be `true`) 
- `settings.users: false` (should be `true`)
- `settings.roles: false` (should be `true`)

## Solution

### Script: `fix-superadmin-permissions.js`

This script ensures the superadmin role has **ALL** permissions enabled:

**Navigation Permissions:**
- ✅ `dashboard: true`
- ✅ `clients: true`
- ✅ `groups: true`
- ✅ `teams: true`
- ✅ `timelines: true`
- ✅ `analytics: true`
- ✅ `fileManager: true`
- ✅ `settings.activities: true`
- ✅ `settings.branches: true`
- ✅ `settings.users: true`
- ✅ `settings.roles: true`

**API Permissions:**
- ✅ `getUsers: true`
- ✅ `manageUsers: true`
- ✅ `getTeamMembers: true`
- ✅ `manageTeamMembers: true`
- ✅ `getActivities: true`
- ✅ `manageActivities: true`
- ✅ `getBranches: true`
- ✅ `manageBranches: true`
- ✅ `getClients: true`
- ✅ `manageClients: true`
- ✅ `getGroups: true`
- ✅ `manageGroups: true`
- ✅ `getTimelines: true`
- ✅ `manageTimelines: true`
- ✅ `getRoles: true`
- ✅ `manageRoles: true`
- ✅ `getFileManager: true`
- ✅ `manageFileManager: true`

**Branch Access:**
- ✅ `allBranchesAccess: true`

## Usage

### Fix Existing Superadmin Role
```bash
node scripts/fix-superadmin-permissions.js
```

### Recreate All Default Roles (Including Superadmin)
```bash
node src/scripts/createDefaultRoles.js
```

## What the Script Does

1. **Connects** to MongoDB
2. **Finds** the superadmin role
3. **Updates** ALL permissions to `true`
4. **Sets** `allBranchesAccess` to `true`
5. **Verifies** all permissions are correctly set
6. **Logs** detailed results

## Example Output

```
info: Connected to MongoDB
info: Found superadmin role: superadmin
info: ✅ Superadmin role updated successfully!

=== UPDATED SUPERADMIN PERMISSIONS ===
Navigation Permissions:
  dashboard: true
  clients: true
  groups: true
  teams: true
  timelines: true
  analytics: true
  fileManager: true
  settings:
    activities: true
    branches: true
    users: true
    roles: true

API Permissions:
  getUsers: true
  manageUsers: true
  getTeamMembers: true
  manageTeamMembers: true
  getActivities: true
  manageActivities: true
  getBranches: true
  manageBranches: true
  getClients: true
  manageClients: true
  getGroups: true
  manageGroups: true
  getTimelines: true
  manageTimelines: true
  getRoles: true
  manageRoles: true
  getFileManager: true
  manageFileManager: true

All Branches Access: true

✅ VERIFICATION: All superadmin permissions are correctly set to true!
```

## Verification

After running the script, the superadmin user should have access to:

### Navigation Access
- ✅ Dashboard
- ✅ Clients
- ✅ Groups  
- ✅ Teams
- ✅ Timelines
- ✅ Analytics
- ✅ File Manager
- ✅ Settings → Activities
- ✅ Settings → Branches
- ✅ Settings → Users
- ✅ Settings → Roles

### API Access
- ✅ All GET endpoints
- ✅ All POST/PUT/DELETE endpoints
- ✅ All management operations
- ✅ File manager operations

### Branch Access
- ✅ Access to ALL branches

## Safety Features

- **Non-destructive**: Only updates permissions, doesn't remove anything
- **Verification**: Checks that all permissions are correctly set
- **Detailed logging**: Shows exactly what was updated
- **Idempotent**: Can be run multiple times safely

## Troubleshooting

### Superadmin Role Not Found
If the script shows "Superadmin role not found", run the default roles script first:
```bash
node src/scripts/createDefaultRoles.js
```

### Permissions Still Not Working
1. Check if the user is assigned the superadmin role
2. Verify the role name is exactly "superadmin" (lowercase)
3. Check if the user's role is properly populated in the database

### Database Connection Issues
Ensure MongoDB is running and the connection string is correct in your config.

## After Fix

Once the superadmin permissions are fixed, the superadmin user will have:

1. **Complete system access** - can access all features and settings
2. **All branch access** - can view and manage all branches
3. **Full file manager access** - can upload, download, and manage files
4. **Complete user management** - can create, edit, and delete users
5. **Full role management** - can create, edit, and delete roles
6. **All settings access** - can access all system settings

The superadmin role now truly has "super admin" privileges across the entire system! 