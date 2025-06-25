# Branch Access Examples and Setup Guide

This guide shows how to set up different types of branch access for users in the VSC CRM system.

## 1. Role Setup Examples

### Single Branch Access Role
```json
{
  "name": "Branch Manager",
  "description": "Can manage a single branch",
  "navigationPermissions": {
    "dashboard": true,
    "clients": true,
    "groups": true,
    "teams": true,
    "timelines": true,
    "analytics": true,
    "settings": {
      "activities": false,
      "branches": false,
      "users": false,
      "roles": false
    }
  },
  "apiPermissions": {
    "getUsers": false,
    "manageUsers": false,
    "getTeamMembers": true,
    "manageTeamMembers": true,
    "getActivities": true,
    "manageActivities": false,
    "getBranches": false,
    "manageBranches": false,
    "getClients": true,
    "manageClients": true,
    "getGroups": true,
    "manageGroups": true,
    "getTimelines": true,
    "manageTimelines": true,
    "getRoles": false,
    "manageRoles": false
  },
  "branchAccess": ["507f1f77bcf86cd799439011"],
  "allBranchesAccess": false,
  "isActive": true
}
```

### Multiple Branch Access Role
```json
{
  "name": "Regional Manager",
  "description": "Can manage multiple branches in a region",
  "navigationPermissions": {
    "dashboard": true,
    "clients": true,
    "groups": true,
    "teams": true,
    "timelines": true,
    "analytics": true,
    "settings": {
      "activities": false,
      "branches": false,
      "users": false,
      "roles": false
    }
  },
  "apiPermissions": {
    "getUsers": false,
    "manageUsers": false,
    "getTeamMembers": true,
    "manageTeamMembers": true,
    "getActivities": true,
    "manageActivities": false,
    "getBranches": false,
    "manageBranches": false,
    "getClients": true,
    "manageClients": true,
    "getGroups": true,
    "manageGroups": true,
    "getTimelines": true,
    "manageTimelines": true,
    "getRoles": false,
    "manageRoles": false
  },
  "branchAccess": [
    "507f1f77bcf86cd799439011",
    "507f1f77bcf86cd799439012",
    "507f1f77bcf86cd799439013"
  ],
  "allBranchesAccess": false,
  "isActive": true
}
```

### All Branch Access Role
```json
{
  "name": "System Administrator",
  "description": "Can access all branches and manage system settings",
  "navigationPermissions": {
    "dashboard": true,
    "clients": true,
    "groups": true,
    "teams": true,
    "timelines": true,
    "analytics": true,
    "settings": {
      "activities": true,
      "branches": true,
      "users": true,
      "roles": true
    }
  },
  "apiPermissions": {
    "getUsers": true,
    "manageUsers": true,
    "getTeamMembers": true,
    "manageTeamMembers": true,
    "getActivities": true,
    "manageActivities": true,
    "getBranches": true,
    "manageBranches": true,
    "getClients": true,
    "manageClients": true,
    "getGroups": true,
    "manageGroups": true,
    "getTimelines": true,
    "manageTimelines": true,
    "getRoles": true,
    "manageRoles": true
  },
  "branchAccess": [],
  "allBranchesAccess": true,
  "isActive": true
}
```

## 2. API Usage Examples

### Creating a Role
```bash
POST /v1/roles
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Branch Manager",
  "description": "Can manage a single branch",
  "navigationPermissions": {
    "dashboard": true,
    "clients": true,
    "groups": true,
    "teams": true,
    "timelines": true,
    "analytics": true,
    "settings": {
      "activities": false,
      "branches": false,
      "users": false,
      "roles": false
    }
  },
  "apiPermissions": {
    "getTeamMembers": true,
    "manageTeamMembers": true,
    "getClients": true,
    "manageClients": true,
    "getGroups": true,
    "manageGroups": true,
    "getTimelines": true,
    "manageTimelines": true
  },
  "branchAccess": ["507f1f77bcf86cd799439011"],
  "allBranchesAccess": false,
  "isActive": true
}
```

### Creating a User with Role
```bash
POST /v1/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "507f1f77bcf86cd799439021"
}
```

## 3. Data Access Examples

### Single Branch User Accessing Team Members
```bash
# This user can only see team members from their assigned branch
GET /v1/team-members
Authorization: Bearer <branch_manager_token>

# Response will only include team members from branch 507f1f77bcf86cd799439011
```

### Multiple Branch User Accessing Team Members
```bash
# This user can see team members from all their assigned branches
GET /v1/team-members
Authorization: Bearer <regional_manager_token>

# Response includes team members from branches: 507f1f77bcf86cd799439011, 507f1f77bcf86cd799439012, 507f1f77bcf86cd799439013

# Filter by specific branch
GET /v1/team-members?branch=507f1f77bcf86cd799439011
Authorization: Bearer <regional_manager_token>

# Response only includes team members from the specified branch
```

### All Branch User Accessing Team Members
```bash
# This user can see team members from all branches
GET /v1/team-members
Authorization: Bearer <admin_token>

# Response includes team members from all branches

# Filter by specific branch
GET /v1/team-members?branch=507f1f77bcf86cd799439011
Authorization: Bearer <admin_token>

# Response only includes team members from the specified branch
```

## 4. Creating Records with Branch Assignment

### Single Branch User Creating Team Member
```bash
POST /v1/team-members
Authorization: Bearer <branch_manager_token>
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "address": "456 Oak St",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "pinCode": "10002",
  "branch": "507f1f77bcf86cd799439011",
  "sortOrder": 2,
  "skills": ["507f1f77bcf86cd799439031"]
}

# Success - User has access to this branch
```

### Single Branch User Trying to Create Team Member in Different Branch
```bash
POST /v1/team-members
Authorization: Bearer <branch_manager_token>
Content-Type: application/json

{
  "name": "Bob Wilson",
  "email": "bob@example.com",
  "phone": "+1234567891",
  "address": "789 Pine St",
  "city": "Los Angeles",
  "state": "CA",
  "country": "USA",
  "pinCode": "90210",
  "branch": "507f1f77bcf86cd799439012",
  "sortOrder": 3,
  "skills": ["507f1f77bcf86cd799439031"]
}

# Error: 403 Forbidden - "Access denied to this branch"
```

## 5. Error Handling Examples

### No Authentication
```bash
GET /v1/team-members

# Response: 401 Unauthorized - "Please authenticate"
```

### No Permissions
```bash
GET /v1/team-members
Authorization: Bearer <user_without_permissions_token>

# Response: 403 Forbidden - "Forbidden"
```

### No Branch Access
```bash
GET /v1/team-members
Authorization: Bearer <user_with_no_branch_access_token>

# Response: 403 Forbidden - "No branch access granted"
```

### Access Denied to Specific Branch
```bash
GET /v1/team-members?branch=507f1f77bcf86cd799439099
Authorization: Bearer <user_with_limited_access_token>

# Response: 403 Forbidden - "Access denied to this branch"
```

## 6. Frontend Implementation

### React Component Example
```javascript
import React, { useState, useEffect } from 'react';

const TeamMembersList = () => {
  const [teamMembers, setTeamMembers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
    fetchUserBranches();
  }, [selectedBranch]);

  const fetchTeamMembers = async () => {
    setLoading(true);
    try {
      let url = '/v1/team-members';
      if (selectedBranch) {
        url += `?branch=${selectedBranch}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.results);
      } else {
        console.error('Failed to fetch team members');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserBranches = async () => {
    try {
      const response = await fetch('/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const user = await response.json();
        if (user.role && user.role.branchAccess) {
          setBranches(user.role.branchAccess);
        }
      }
    } catch (error) {
      console.error('Error fetching user branches:', error);
    }
  };

  return (
    <div>
      <h2>Team Members</h2>
      
      {branches.length > 1 && (
        <div>
          <label>Filter by Branch:</label>
          <select 
            value={selectedBranch} 
            onChange={(e) => setSelectedBranch(e.target.value)}
          >
            <option value="">All Branches</option>
            {branches.map(branch => (
              <option key={branch._id} value={branch._id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      )}
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div>
          {teamMembers.map(member => (
            <div key={member._id}>
              <h3>{member.name}</h3>
              <p>Email: {member.email}</p>
              <p>Branch: {member.branch.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamMembersList;
```

## 7. Testing the Setup

### 1. Create Test Branches
```bash
POST /v1/branches
{
  "name": "New York Branch",
  "address": "123 Main St, New York, NY",
  "phone": "+1-555-0123",
  "email": "ny@company.com"
}

POST /v1/branches
{
  "name": "Los Angeles Branch",
  "address": "456 Oak Ave, Los Angeles, CA",
  "phone": "+1-555-0456",
  "email": "la@company.com"
}
```

### 2. Create Test Roles
Use the role examples above to create different types of roles.

### 3. Create Test Users
Create users with different roles and test their access.

### 4. Test API Endpoints
Use the API examples above to test different scenarios.

This setup provides a complete branch-based access control system that ensures users can only access data from branches they're authorized for, while providing flexibility for users with multiple branch access. 