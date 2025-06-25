# Multiple Branch Access System

This document describes the multiple branch access functionality implemented in the VSC CRM Backend, which allows users to have access to multiple branches while maintaining proper security and data isolation.

## Overview

The system supports three types of branch access:

1. **All Branches Access**: Users can access all branches in the system
2. **Multiple Specific Branches**: Users can access a specific set of branches
3. **Single Branch Access**: Users can access only one specific branch
4. **No Branch Access**: Users cannot access any branch-specific data

## Key Features

### 1. Branch-Based Data Filtering
- All queries automatically filter data based on user's branch access
- Users can only see data from branches they have access to
- Support for filtering by specific branch when user has access to multiple branches

### 2. Branch Access Validation
- Validation during creation and updates to ensure users can only assign records to accessible branches
- Prevents unauthorized access to branches through API calls

### 3. Flexible Branch Assignment
- Users can be assigned to multiple branches through their role
- Support for both string and ObjectId branch references
- Automatic conversion and validation of branch IDs

## Implementation Details

### Role Model Structure

```javascript
{
  // ... other fields
  branchAccess: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
  }],
  allBranchesAccess: {
    type: Boolean,
    default: false,
  }
}
```

### Branch Access Functions

#### `hasBranchAccess(userRole, branchId)`
Checks if a user has access to a specific branch.

```javascript
// Returns true if user has access to the branch
const hasAccess = hasBranchAccess(user.role, '507f1f77bcf86cd799439011');
```

#### `getUserBranchIds(userRole)`
Returns an array of branch IDs that the user has access to.

```javascript
// Returns array of branch IDs or null for all branches access
const branchIds = getUserBranchIds(user.role);
// Returns: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012']
// Or null if user has access to all branches
```

#### `hasAnyBranchAccess(userRole, branchIds)`
Checks if a user has access to any of the provided branches.

```javascript
// Returns true if user has access to any of the branches
const hasAccess = hasAnyBranchAccess(user.role, ['branch1', 'branch2']);
```

### Service Layer Implementation

#### Query Filtering
All service query functions automatically apply branch filtering:

```javascript
const queryClients = async (filter, options, user) => {
  const mongoFilter = { ...filter };
  
  // Apply branch filtering based on user's access
  if (user && user.role) {
    if (mongoFilter.branch) {
      // Check if user has access to this specific branch
      if (!hasBranchAccess(user.role, mongoFilter.branch)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
      }
    } else {
      // Get user's allowed branch IDs
      const allowedBranchIds = getUserBranchIds(user.role);
      
      if (allowedBranchIds === null) {
        // User has access to all branches, no filtering needed
      } else if (allowedBranchIds.length > 0) {
        // Filter by user's allowed branches
        mongoFilter.branch = { $in: allowedBranchIds };
      } else {
        // User has no branch access
        throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
      }
    }
  }
  
  return Client.paginate(mongoFilter, options);
};
```

#### Creation and Update Validation
All create and update functions validate branch access:

```javascript
const createClient = async (clientBody, user = null) => {
  // Validate branch access if user is provided
  if (user && user.role && clientBody.branch) {
    if (!hasBranchAccess(user.role, clientBody.branch)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
  }
  
  return Client.create(clientBody);
};
```

## API Usage Examples

### 1. Get All Data from Accessible Branches

```bash
GET /v1/clients
Authorization: Bearer <token>
```

**Response**: Returns clients from all branches the user has access to.

### 2. Filter by Specific Branch

```bash
GET /v1/clients?branch=507f1f77bcf86cd799439011
Authorization: Bearer <token>
```

**Response**: Returns clients only from the specified branch (if user has access).

### 3. Create Record in Specific Branch

```bash
POST /v1/clients
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Client",
  "email": "client@example.com",
  "phone": "+1234567890",
  "branch": "507f1f77bcf86cd799439011",
  "address": "123 Main St",
  "district": "Central",
  "state": "State",
  "country": "Country",
  "sortOrder": 1
}
```

**Response**: Creates client in the specified branch (if user has access).

### 4. Update Record Branch Assignment

```bash
PATCH /v1/clients/507f1f77bcf86cd799439011
Authorization: Bearer <token>
Content-Type: application/json

{
  "branch": "507f1f77bcf86cd799439012"
}
```

**Response**: Updates client's branch assignment (if user has access to the new branch).

## Error Handling

### Access Denied Errors

```json
{
  "code": 403,
  "message": "Access denied to this branch",
  "stack": "..."
}
```

### No Branch Access Errors

```json
{
  "code": 403,
  "message": "No branch access granted",
  "stack": "..."
}
```

## Security Considerations

### 1. Data Isolation
- Users can only access data from branches they have permission to access
- Automatic filtering prevents data leakage across branches

### 2. Input Validation
- All branch assignments are validated against user permissions
- Prevents unauthorized branch assignments during creation and updates

### 3. Query Security
- MongoDB queries are automatically filtered based on user permissions
- No manual filtering required in controllers

### 4. Role-Based Access
- Branch access is controlled through the role system
- Easy to manage and audit branch permissions

## Testing

### Test Scenarios

1. **Multiple Branch Access**: User with access to multiple branches can see data from all accessible branches
2. **Specific Branch Filtering**: User can filter data by specific accessible branches
3. **Access Denied**: User cannot access data from non-accessible branches
4. **Creation Validation**: User cannot create records in non-accessible branches
5. **Update Validation**: User cannot update records to non-accessible branches

### Running Tests

```bash
npm test -- --testNamePattern="Multiple Branch Access"
```

## Migration Guide

### For Existing Data

1. **Add Branch Field**: All existing records need a branch field
2. **Update Roles**: Assign appropriate branch access to existing roles
3. **Data Migration**: Migrate existing data to appropriate branches

### Example Migration Script

```javascript
// Example migration script
const migrateDataToBranches = async () => {
  // Get default branch
  const defaultBranch = await Branch.findOne({ name: 'Default Branch' });
  
  // Update all clients without branch
  await Client.updateMany(
    { branch: { $exists: false } },
    { branch: defaultBranch._id }
  );
  
  // Update all groups without branch
  await Group.updateMany(
    { branch: { $exists: false } },
    { branch: defaultBranch._id }
  );
  
  // Update all timelines without branch
  await Timeline.updateMany(
    { branch: { $exists: false } },
    { branch: defaultBranch._id }
  );
};
```

## Best Practices

### 1. Role Design
- Design roles with specific branch access rather than all branches access
- Use all branches access only for super administrators

### 2. Branch Organization
- Organize branches logically (by region, department, etc.)
- Use descriptive branch names for easy management

### 3. Permission Management
- Regularly review and update branch access permissions
- Remove access to branches when users change roles or leave

### 4. Monitoring
- Monitor branch access patterns for security
- Log branch access attempts for audit purposes

## Troubleshooting

### Common Issues

1. **"Access denied to this branch" Error**
   - Check if user's role has access to the specified branch
   - Verify branch ID format and existence

2. **"No branch access granted" Error**
   - User's role has no branch access configured
   - Add branch access to the user's role

3. **Data Not Showing**
   - Check if user has access to the branch where data is stored
   - Verify branch filtering is working correctly

4. **Cannot Create/Update Records**
   - Ensure user has access to the target branch
   - Check if branch ID is valid and exists

### Debug Tips

1. **Check User Role**: Verify user's role and branch access configuration
2. **Test Branch Access**: Use `hasBranchAccess()` function to test access
3. **Check Branch IDs**: Ensure branch IDs are valid ObjectIds
 