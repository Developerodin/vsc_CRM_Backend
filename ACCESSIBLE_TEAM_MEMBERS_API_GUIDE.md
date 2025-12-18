# Accessible Team Members API Documentation

This guide documents all APIs related to accessible team members functionality, allowing team members to manage and assign tasks to other team members they have access to.

## Table of Contents
1. [Team Member Management APIs](#team-member-management-apis)
2. [Task Management APIs (Admin/User)](#task-management-apis-adminuser)
3. [Team Member Auth APIs](#team-member-auth-apis)

---

## Team Member Management APIs

### 1. Get Accessible Team Members

Get list of team members that a specific team member can access.

**Endpoint:** `GET /v1/team-members/:teamMemberId/accessible-members`

**Authentication:** Required (User token)

**Request:**
```http
GET /v1/team-members/507f1f77bcf86cd799439011/accessible-members
Authorization: Bearer <user_token>
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "pinCode": "10001",
  "branch": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Main Branch"
  },
  "skills": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "JavaScript"
    }
  ],
  "accessibleTeamMembers": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1234567891",
      "branch": "507f1f77bcf86cd799439012",
      "skills": []
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "name": "Bob Johnson",
      "email": "bob@example.com",
      "phone": "+1234567892",
      "branch": "507f1f77bcf86cd799439012",
      "skills": []
    }
  ],
  "sortOrder": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### 2. Update Accessible Team Members

Update the list of team members that a specific team member can access.

**Endpoint:** `PATCH /v1/team-members/:teamMemberId/accessible-members`

**Authentication:** Required (User token)

**Request:**
```http
PATCH /v1/team-members/507f1f77bcf86cd799439011/accessible-members
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "accessibleTeamMembers": [
    "507f1f77bcf86cd799439014",
    "507f1f77bcf86cd799439015",
    "507f1f77bcf86cd799439016"
  ]
}
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "city": "New York",
  "state": "NY",
  "country": "USA",
  "pinCode": "10001",
  "branch": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Main Branch"
  },
  "skills": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "name": "JavaScript"
    }
  ],
  "accessibleTeamMembers": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1234567891"
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "name": "Bob Johnson",
      "email": "bob@example.com",
      "phone": "+1234567892"
    },
    {
      "_id": "507f1f77bcf86cd799439016",
      "name": "Alice Brown",
      "email": "alice@example.com",
      "phone": "+1234567893"
    }
  ],
  "sortOrder": 1,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Response (400 Bad Request):**
```json
{
  "code": 400,
  "message": "One or more accessible team member IDs are invalid"
}
```

---

## Task Management APIs (Admin/User)

### 3. Get Tasks of Accessible Team Members

Get all tasks assigned to team members that a specific team member can access (including their own tasks).

**Endpoint:** `GET /v1/tasks/accessible-team-members/:teamMemberId`

**Authentication:** Required (User token)

**Query Parameters:**
- `status` (optional): Filter by status (`pending`, `ongoing`, `completed`, `on_hold`, `cancelled`, `delayed`)
- `priority` (optional): Filter by priority (`low`, `medium`, `high`, `urgent`, `critical`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page
- `sortBy` (optional): Sort field and direction (e.g., `createdAt:desc`)

**Request:**
```http
GET /v1/tasks/accessible-team-members/507f1f77bcf86cd799439011?status=pending&priority=high&page=1&limit=10
Authorization: Bearer <user_token>
```

**Response (200 OK):**
```json
{
  "results": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "teamMember": {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890"
      },
      "startDate": "2024-01-15T00:00:00.000Z",
      "endDate": "2024-01-20T00:00:00.000Z",
      "priority": "high",
      "status": "pending",
      "branch": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Main Branch",
        "location": "New York"
      },
      "assignedBy": {
        "_id": "507f1f77bcf86cd799439021",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "timeline": [
        {
          "_id": "507f1f77bcf86cd799439022",
          "activity": "Follow-up",
          "client": "Client ABC",
          "status": "active"
        }
      ],
      "remarks": "Complete the follow-up call",
      "metadata": {},
      "attachments": [],
      "createdAt": "2024-01-10T00:00:00.000Z",
      "updatedAt": "2024-01-10T00:00:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439023",
      "teamMember": {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "phone": "+1234567891"
      },
      "startDate": "2024-01-16T00:00:00.000Z",
      "endDate": "2024-01-21T00:00:00.000Z",
      "priority": "high",
      "status": "pending",
      "branch": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Main Branch",
        "location": "New York"
      },
      "assignedBy": null,
      "timeline": [],
      "remarks": "Review client documents",
      "metadata": {},
      "attachments": [],
      "createdAt": "2024-01-11T00:00:00.000Z",
      "updatedAt": "2024-01-11T00:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "totalResults": 2
}
```

---

### 4. Assign Task to Accessible Team Member

Create a new task and assign it to a team member that the specified team member has access to.

**Endpoint:** `POST /v1/tasks/assign-to-accessible/:teamMemberId`

**Authentication:** Required (User token)

**Request:**
```http
POST /v1/tasks/assign-to-accessible/507f1f77bcf86cd799439011
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "teamMember": "507f1f77bcf86cd799439014",
  "startDate": "2024-01-15T00:00:00.000Z",
  "endDate": "2024-01-20T00:00:00.000Z",
  "priority": "high",
  "branch": "507f1f77bcf86cd799439012",
  "timeline": ["507f1f77bcf86cd799439022"],
  "remarks": "Complete the follow-up call with client",
  "status": "pending",
  "metadata": {
    "clientId": "507f1f77bcf86cd799439024",
    "notes": "Important client"
  },
  "attachments": []
}
```

**Response (201 Created):**
```json
{
  "_id": "507f1f77bcf86cd799439025",
  "teamMember": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1234567891"
  },
  "startDate": "2024-01-15T00:00:00.000Z",
  "endDate": "2024-01-20T00:00:00.000Z",
  "priority": "high",
  "status": "pending",
  "branch": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Main Branch",
    "location": "New York"
  },
  "assignedBy": null,
  "timeline": [
    {
      "_id": "507f1f77bcf86cd799439022",
      "activity": "Follow-up",
      "client": "Client ABC",
      "status": "active"
    }
  ],
  "remarks": "Complete the follow-up call with client",
  "metadata": {
    "clientId": "507f1f77bcf86cd799439024",
    "notes": "Important client"
  },
  "attachments": [],
  "createdAt": "2024-01-12T00:00:00.000Z",
  "updatedAt": "2024-01-12T00:00:00.000Z"
}
```

**Error Response (403 Forbidden):**
```json
{
  "code": 403,
  "message": "You do not have access to assign tasks to this team member"
}
```

---

### 5. Update Task of Accessible Team Member

Update a task that belongs to an accessible team member.

**Endpoint:** `PATCH /v1/tasks/accessible/:taskId/:teamMemberId`

**Authentication:** Required (User token)

**Request:**
```http
PATCH /v1/tasks/accessible/507f1f77bcf86cd799439025/507f1f77bcf86cd799439011
Authorization: Bearer <user_token>
Content-Type: application/json

{
  "status": "ongoing",
  "remarks": "Task in progress, will complete by end date",
  "priority": "urgent"
}
```

**Response (200 OK):**
```json
{
  "_id": "507f1f77bcf86cd799439025",
  "teamMember": {
    "_id": "507f1f77bcf86cd799439014",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "+1234567891"
  },
  "startDate": "2024-01-15T00:00:00.000Z",
  "endDate": "2024-01-20T00:00:00.000Z",
  "priority": "urgent",
  "status": "ongoing",
  "branch": {
    "_id": "507f1f77bcf86cd799439012",
    "name": "Main Branch",
    "location": "New York"
  },
  "assignedBy": null,
  "timeline": [
    {
      "_id": "507f1f77bcf86cd799439022",
      "activity": "Follow-up",
      "client": "Client ABC",
      "status": "active"
    }
  ],
  "remarks": "Task in progress, will complete by end date",
  "metadata": {
    "clientId": "507f1f77bcf86cd799439024",
    "notes": "Important client"
  },
  "attachments": [],
  "createdAt": "2024-01-12T00:00:00.000Z",
  "updatedAt": "2024-01-13T00:00:00.000Z"
}
```

**Error Response (403 Forbidden):**
```json
{
  "code": 403,
  "message": "You do not have access to update tasks for this team member"
}
```

---

## Team Member Auth APIs

These APIs are for authenticated team members (using team member auth token).

### 6. Get Tasks of Accessible Team Members (Team Member Auth)

Get all tasks assigned to team members that the authenticated team member can access (including their own tasks).

**Endpoint:** `GET /v1/team-member-auth/tasks/accessible-team-members`

**Authentication:** Required (Team Member token)

**Query Parameters:**
- `status` (optional): Filter by status
- `priority` (optional): Filter by priority
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page
- `sortBy` (optional): Sort field and direction

**Request:**
```http
GET /v1/team-member-auth/tasks/accessible-team-members?status=pending&page=1&limit=10
Authorization: Bearer <team_member_token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "data": {
    "results": [
      {
        "_id": "507f1f77bcf86cd799439020",
        "teamMember": {
          "_id": "507f1f77bcf86cd799439011",
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "+1234567890"
        },
        "startDate": "2024-01-15T00:00:00.000Z",
        "endDate": "2024-01-20T00:00:00.000Z",
        "priority": "high",
        "status": "pending",
        "branch": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Main Branch",
          "location": "New York"
        },
        "assignedBy": null,
        "timeline": [],
        "remarks": "Complete the follow-up call",
        "metadata": {},
        "attachments": [],
        "createdAt": "2024-01-10T00:00:00.000Z",
        "updatedAt": "2024-01-10T00:00:00.000Z"
      }
    ],
    "page": 1,
    "limit": 10,
    "totalPages": 1,
    "totalResults": 1
  }
}
```

---

### 7. Assign Task to Accessible Team Member (Team Member Auth)

Create a new task and assign it to a team member that the authenticated team member has access to.

**Endpoint:** `POST /v1/team-member-auth/tasks/assign`

**Authentication:** Required (Team Member token)

**Request:**
```http
POST /v1/team-member-auth/tasks/assign
Authorization: Bearer <team_member_token>
Content-Type: application/json

{
  "teamMember": "507f1f77bcf86cd799439014",
  "startDate": "2024-01-15T00:00:00.000Z",
  "endDate": "2024-01-20T00:00:00.000Z",
  "priority": "high",
  "branch": "507f1f77bcf86cd799439012",
  "timeline": ["507f1f77bcf86cd799439022"],
  "remarks": "Complete the follow-up call with client",
  "status": "pending",
  "metadata": {
    "clientId": "507f1f77bcf86cd799439024"
  },
  "attachments": []
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Task assigned successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439025",
    "teamMember": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1234567891"
    },
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-01-20T00:00:00.000Z",
    "priority": "high",
    "status": "pending",
    "branch": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Main Branch",
      "location": "New York"
    },
    "assignedBy": null,
    "timeline": [
      {
        "_id": "507f1f77bcf86cd799439022",
        "activity": "Follow-up",
        "client": "Client ABC",
        "status": "active"
      }
    ],
    "remarks": "Complete the follow-up call with client",
    "metadata": {
      "clientId": "507f1f77bcf86cd799439024"
    },
    "attachments": [],
    "createdAt": "2024-01-12T00:00:00.000Z",
    "updatedAt": "2024-01-12T00:00:00.000Z"
  }
}
```

**Error Response (403 Forbidden):**
```json
{
  "code": 403,
  "message": "You do not have access to assign tasks to this team member"
}
```

---

### 8. Update Task of Accessible Team Member (Team Member Auth)

Update a task that belongs to an accessible team member.

**Endpoint:** `PATCH /v1/team-member-auth/tasks/accessible/:taskId`

**Authentication:** Required (Team Member token)

**Request:**
```http
PATCH /v1/team-member-auth/tasks/accessible/507f1f77bcf86cd799439025
Authorization: Bearer <team_member_token>
Content-Type: application/json

{
  "status": "ongoing",
  "remarks": "Task in progress",
  "priority": "urgent"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439025",
    "teamMember": {
      "_id": "507f1f77bcf86cd799439014",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "phone": "+1234567891"
    },
    "startDate": "2024-01-15T00:00:00.000Z",
    "endDate": "2024-01-20T00:00:00.000Z",
    "priority": "urgent",
    "status": "ongoing",
    "branch": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Main Branch",
      "location": "New York"
    },
    "assignedBy": null,
    "timeline": [],
    "remarks": "Task in progress",
    "metadata": {},
    "attachments": [],
    "createdAt": "2024-01-12T00:00:00.000Z",
    "updatedAt": "2024-01-13T00:00:00.000Z"
  }
}
```

**Error Response (403 Forbidden):**
```json
{
  "code": 403,
  "message": "You do not have access to update tasks for this team member"
}
```

---

## Error Responses

All APIs may return the following error responses:

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Invalid request data"
}
```

### 401 Unauthorized
```json
{
  "code": 401,
  "message": "Please authenticate"
}
```

### 403 Forbidden
```json
{
  "code": 403,
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "code": 500,
  "message": "Internal server error"
}
```

---

## Frontend Integration Examples

### JavaScript/TypeScript Example

```typescript
// Get accessible team members
async function getAccessibleTeamMembers(teamMemberId: string) {
  const response = await fetch(
    `/v1/team-members/${teamMemberId}/accessible-members`,
    {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return await response.json();
}

// Update accessible team members
async function updateAccessibleTeamMembers(
  teamMemberId: string,
  accessibleTeamMemberIds: string[]
) {
  const response = await fetch(
    `/v1/team-members/${teamMemberId}/accessible-members`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accessibleTeamMembers: accessibleTeamMemberIds
      })
    }
  );
  return await response.json();
}

// Get tasks of accessible team members (Team Member Auth)
async function getAccessibleTeamMemberTasks(
  status?: string,
  priority?: string,
  page: number = 1,
  limit: number = 10
) {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString()
  });
  if (status) params.append('status', status);
  if (priority) params.append('priority', priority);

  const response = await fetch(
    `/v1/team-member-auth/tasks/accessible-team-members?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${teamMemberToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return await response.json();
}

// Assign task to accessible team member (Team Member Auth)
async function assignTaskToAccessibleTeamMember(taskData: {
  teamMember: string;
  startDate: string;
  endDate: string;
  priority: string;
  branch: string;
  remarks?: string;
  timeline?: string[];
}) {
  const response = await fetch(
    `/v1/team-member-auth/tasks/assign`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${teamMemberToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    }
  );
  return await response.json();
}

// Update task of accessible team member (Team Member Auth)
async function updateAccessibleTeamMemberTask(
  taskId: string,
  updates: {
    status?: string;
    remarks?: string;
    priority?: string;
  }
) {
  const response = await fetch(
    `/v1/team-member-auth/tasks/accessible/${taskId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${teamMemberToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }
  );
  return await response.json();
}
```

### React Hook Example

```typescript
import { useState, useEffect } from 'react';

function useAccessibleTeamMembers(teamMemberId: string) {
  const [accessibleMembers, setAccessibleMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAccessibleMembers() {
      try {
        setLoading(true);
        const data = await getAccessibleTeamMembers(teamMemberId);
        setAccessibleMembers(data.accessibleTeamMembers || []);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (teamMemberId) {
      fetchAccessibleMembers();
    }
  }, [teamMemberId]);

  return { accessibleMembers, loading, error };
}

function useAccessibleTeamMemberTasks(filters: {
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}) {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchTasks() {
      try {
        setLoading(true);
        const response = await getAccessibleTeamMemberTasks(
          filters.status,
          filters.priority,
          filters.page || 1,
          filters.limit || 10
        );
        setTasks(response.data.results || []);
        setPagination(response.data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTasks();
  }, [filters.status, filters.priority, filters.page, filters.limit]);

  return { tasks, pagination, loading, error };
}
```

---

## Notes

1. **Access Control**: Team members can only access/assign tasks to team members in their `accessibleTeamMembers` array. They always have access to their own tasks.

2. **Self-Reference Prevention**: A team member cannot add themselves to their own `accessibleTeamMembers` array (automatically filtered).

3. **Validation**: All team member IDs are validated to ensure they exist before being added to the accessible list.

4. **Pagination**: Task list APIs support pagination with `page` and `limit` query parameters.

5. **Filtering**: Task APIs support filtering by `status` and `priority`.

6. **Sorting**: Task APIs support sorting with the `sortBy` parameter (e.g., `createdAt:desc`, `priority:asc`).

