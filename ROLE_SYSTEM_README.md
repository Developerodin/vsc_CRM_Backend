# Dynamic Role-Based Access Control System

This document describes the new dynamic role-based access control (RBAC) system implemented in the VSC CRM Backend.

## Overview

The system has been upgraded from static roles to a dynamic role system where administrators can create custom roles with granular permissions for both frontend navigation and backend API access.

## Key Features

### 1. Dynamic Role Creation
- Create unlimited custom roles
- Granular permissions for frontend navigation
- Granular permissions for backend API endpoints
- Branch-specific access control

### 2. Frontend Navigation Permissions
The system controls access to different pages in the CRM frontend:

- **Dashboard** (`/dashboard`)
- **Clients** (`/clients`)
- **Groups** (`/groups`)
- **Teams** (`/teams`)
- **Timeline** (`/timelines`)
- **Analytics** (`/analytics`)
- **Settings**:
  - Activities (`/activities`)
  - Branches (`/branches`)
  - Users (empty - for future use)
  - Roles (empty - for future use)

### 3. Backend API Permissions
The system controls access to various API endpoints:

- **User Management**: `getUsers`, `manageUsers`
- **Team Management**: `getTeamMembers`, `manageTeamMembers`
- **Activity Management**: `getActivities`, `manageActivities`
- **Branch Management**: `getBranches`, `manageBranches`
- **Client Management**: `getClients`, `manageClients`
- **Group Management**: `getGroups`, `manageGroups`
- **Role Management**: `getRoles`, `manageRoles`

### 4. Branch Access Control
- Assign specific branches to roles
- Option to grant access to all branches
- Users can be assigned to specific branches

## Database Schema

### Role Model (`src/models/role.model.js`)
```javascript
{
  name: String,                    // Unique role name
  description: String,             // Role description
  navigationPermissions: {         // Frontend navigation access
    dashboard: Boolean,
    clients: Boolean,
    groups: Boolean,
    teams: Boolean,
    timelines: Boolean,
    analytics: Boolean,
    settings: {
      activities: Boolean,
      branches: Boolean,
      users: Boolean,
      roles: Boolean,
    }
  },
  apiPermissions: {               // Backend API access
    getUsers: Boolean,
    manageUsers: Boolean,
    // ... other permissions
  },
  branchAccess: [ObjectId],       // Array of branch IDs
  allBranchesAccess: Boolean,     // Access to all branches
  isActive: Boolean,              // Role status
  createdBy: ObjectId,            // User who created the role
  timestamps: true
}
```

### Updated User Model
```javascript
{
  // ... existing fields
  role: ObjectId,                 // Reference to Role model
  assignedBranch: ObjectId,       // User's assigned branch
  // ... other fields
}
```

## API Endpoints

### Role Management
- `POST /v1/roles` - Create a new role
- `GET /v1/roles` - Get all roles (paginated)
- `GET /v1/roles/active` - Get active roles
- `GET /v1/roles/:roleId` - Get specific role
- `PATCH /v1/roles/:roleId` - Update role
- `DELETE /v1/roles/:roleId` - Delete role
- `GET /v1/roles/permissions` - Get current user's permissions

### User Management (Updated)
- `POST /v1/users` - Create user (now requires role ID)
- `GET /v1/users` - Get users (populated with role and branch info)
- `PATCH /v1/users/:userId` - Update user (can update role and branch)

## Default Roles

The system creates three default roles during migration:

### 1. Admin Role
- **Full access** to all navigation and API endpoints
- **All branches access**
- Can manage all aspects of the system

### 2. Manager Role
- **Moderate permissions**
- Access to most features except user and role management
- **Branch-specific access** (not all branches)

### 3. User Role
- **Basic permissions**
- Limited access to view-only features
- **Branch-specific access** (not all branches)

## Migration

### Running the Migration
```bash
node src/scripts/createDefaultRoles.js
```

This script will:
1. Create default roles (Admin, Manager, User)
2. Migrate existing users to have the default "User" role
3. Set up the basic permission structure

### Manual Migration Steps
1. Run the migration script
2. Update existing users to assign appropriate roles
3. Configure branch access for each role
4. Test the new permission system

## Usage Examples

### Creating a Custom Role
```javascript
// Example: Create a "Branch Manager" role
const branchManagerRole = {
  name: "Branch Manager",
  description: "Manages specific branches",
  navigationPermissions: {
    dashboard: true,
    clients: true,
    groups: true,
    teams: true,
    timelines: true,
    analytics: true,
    settings: {
      activities: true,
      branches: true,
      users: false,
      roles: false,
    }
  },
  apiPermissions: {
    getUsers: false,
    manageUsers: false,
    getTeamMembers: true,
    manageTeamMembers: true,
    getActivities: true,
    manageActivities: true,
    getBranches: true,
    manageBranches: true,
    getClients: true,
    manageClients: true,
    getGroups: true,
    manageGroups: true,
    getRoles: false,
    manageRoles: false,
  },
  branchAccess: ["branchId1", "branchId2"], // Specific branches
  allBranchesAccess: false,
  isActive: true
};
```

### Checking Permissions in Code
```javascript
import { hasPermission, hasNavigationAccess, hasBranchAccess } from '../services/role.service.js';

// Check API permission
if (hasPermission(user.role, 'manageUsers')) {
  // User can manage users
}

// Check navigation access
if (hasNavigationAccess(user.role, 'dashboard')) {
  // User can access dashboard
}

// Check branch access
if (hasBranchAccess(user.role, branchId)) {
  // User can access this branch
}
```

## Frontend Integration

### Getting User Permissions
The frontend can call `GET /v1/roles/permissions` to get the current user's permissions:

```javascript
// Response structure
{
  apiPermissions: {
    getUsers: true,
    manageUsers: false,
    // ... other permissions
  },
  navigationPermissions: {
    dashboard: true,
    clients: true,
    // ... other navigation permissions
  },
  branchAccess: [
    { _id: "branchId1", name: "Branch 1" },
    { _id: "branchId2", name: "Branch 2" }
  ],
  allBranchesAccess: false
}
```

### Conditional Rendering
```javascript
// Example: Show/hide navigation items based on permissions
const MenuItems = [
  {
    title: "Dashboard",
    path: "/dashboard",
    show: userPermissions.navigationPermissions.dashboard
  },
  {
    title: "Settings",
    show: userPermissions.navigationPermissions.settings.roles,
    children: [
      {
        title: "Roles",
        show: userPermissions.navigationPermissions.settings.roles
      }
    ]
  }
].filter(item => item.show);
```

## Security Considerations

1. **Role Hierarchy**: Consider implementing role hierarchy for better permission management
2. **Audit Logging**: Log all role and permission changes
3. **Regular Reviews**: Periodically review and update role permissions
4. **Least Privilege**: Follow the principle of least privilege when assigning permissions

## Troubleshooting

### Common Issues

1. **User has no role assigned**
   - Run the migration script
   - Manually assign a role to the user

2. **Permission denied errors**
   - Check if the user's role has the required permissions
   - Verify branch access for branch-specific operations

3. **Role not found errors**
   - Ensure the role exists and is active
   - Check if the role ID is correct

### Debugging
- Use the `/v1/roles/permissions` endpoint to check current user permissions
- Check the user's role and branch assignments
- Verify role permissions in the database

## Future Enhancements

1. **Role Hierarchy**: Implement role inheritance
2. **Temporary Permissions**: Time-based permission grants
3. **Permission Groups**: Group related permissions
4. **Advanced Branch Logic**: More complex branch access rules
5. **Audit Trail**: Track permission changes and access logs 