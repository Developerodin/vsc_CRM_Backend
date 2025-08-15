# Task Management API Documentation

## Overview
This document provides comprehensive documentation for the Task Management API endpoints. The API allows you to create, manage, and track tasks assigned to team members with various filtering and management capabilities.

**Base URL:** `http://localhost:4000/v1/tasks`

**Authentication:** All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Data Models

### Task Object Structure
```json
{
  "_id": "ObjectId",
  "teamMember": "ObjectId (required) - Reference to TeamMember",
  "startDate": "Date (required) - Task start date",
  "endDate": "Date (required) - Task end date",
  "priority": "String (required) - One of: low, medium, high, urgent, critical",
  "branch": "ObjectId (required) - Reference to Branch",
  "assignedBy": "ObjectId (optional) - Reference to User who assigned the task",
  "timeline": ["ObjectId"] (optional) - Array of Timeline references",
  "remarks": "String (optional) - Additional task notes",
  "status": "String (optional) - One of: pending, ongoing, completed, on_hold, cancelled, delayed",
  "metadata": "Object (optional) - Flexible field for additional data",
  "attachments": [
    {
      "fileName": "String (required)",
      "fileUrl": "String (required) - URL to the file",
      "uploadedAt": "Date"
    }
  ],
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### Priority Levels
- `low` - Low priority task
- `medium` - Medium priority task (default)
- `high` - High priority task
- `urgent` - Urgent priority task
- `critical` - Critical priority task

### Status Values
- `pending` - Task is pending (default)
- `ongoing` - Task is in progress
- `completed` - Task is completed
- `on_hold` - Task is on hold
- `cancelled` - Task is cancelled
- `delayed` - Task is delayed

## API Endpoints

### 1. Create Task
**POST** `/tasks`

**Request Body:**
```json
{
  "teamMember": "64f8a1b2c3d4e5f6a7b8c9d0",
  "startDate": "2024-01-15T00:00:00.000Z",
  "endDate": "2024-01-20T23:59:59.000Z",
  "priority": "high",
  "branch": "64f8a1b2c3d4e5f6a7b8c9d1",
  "assignedBy": "64f8a1b2c3d4e5f6a7b8c9d2",
  "timeline": ["64f8a1b2c3d4e5f6a7b8c9d3", "64f8a1b2c3d4e5f6a7b8c9d4"],
  "remarks": "Complete the client onboarding process",
  "status": "pending",
  "metadata": {
    "clientType": "enterprise",
    "urgency": "high"
  }
}
```

**Response (201 Created):**
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d5",
  "teamMember": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "startDate": "2024-01-15T00:00:00.000Z",
  "endDate": "2024-01-20T23:59:59.000Z",
  "priority": "high",
  "branch": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "name": "Main Office",
    "location": "New York"
  },
  "assignedBy": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d2",
    "name": "Manager Name",
    "email": "manager@example.com"
  },
  "timeline": [
    {
      "id": "64f8a1b2c3d4e5f6a7b8c9d3",
      "activity": "Client Onboarding",
      "client": "ABC Corp",
      "status": "active"
    }
  ],
  "remarks": "Complete the client onboarding process",
  "status": "pending",
  "metadata": {
    "clientType": "enterprise",
    "urgency": "high"
  },
  "attachments": [],
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

### 2. Get All Tasks (with filtering)
**GET** `/tasks`

**Query Parameters:**
- `teamMember` - Filter by team member ID
- `assignedBy` - Filter by user who assigned the task
- `timeline` - Filter by timeline ID (single or array)
- `branch` - Filter by branch ID
- `status` - Filter by task status
- `priority` - Filter by priority level
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `startDateRange` - Start date for range filtering
- `endDateRange` - End date for range filtering
- `today` - Filter tasks due today (true/false or "true"/"false")
- `sortBy` - Sort field (e.g., "createdAt:desc", "priority:asc")
- `limit` - Number of results per page (default: 10)
- `page` - Page number (default: 1)

**Note:** All filter parameters are optional. Empty strings will be ignored. Use the `today` parameter to quickly filter tasks due today.

**Example Request:**
```
GET /tasks?status=pending&priority=high&limit=20&page=1&sortBy=createdAt:desc
```

**Response (200 OK):**
```json
{
  "results": [
    {
      "id": "64f8a1b2c3d4e5f6a7b8c9d5",
      "teamMember": {
        "id": "64f8a1b2c3d4e5f6a7b8c9d0",
        "name": "John Doe",
        "email": "john@example.com"
      },
      "startDate": "2024-01-15T00:00:00.000Z",
      "endDate": "2024-01-20T23:59:59.000Z",
      "priority": "high",
      "status": "pending",
      "remarks": "Complete the client onboarding process"
    }
  ],
  "page": 1,
  "limit": 20,
  "totalPages": 5,
  "totalResults": 100,
  "hasNextPage": true,
  "hasPrevPage": false
}
```

### 3. Get Task by ID
**GET** `/tasks/:taskId`

**Path Parameters:**
- `taskId` - Task ID

**Example Request:**
```
GET /tasks/64f8a1b2c3d4e5f6a7b8c9d5
```

**Response (200 OK):**
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d5",
  "teamMember": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "startDate": "2024-01-15T00:00:00.000Z",
  "endDate": "2024-01-20T23:59:59.000Z",
  "priority": "high",
  "branch": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d1",
    "name": "Main Office",
    "location": "New York"
  },
  "assignedBy": {
    "id": "64f8a1b2c3d4e5f6a7b8c9d2",
    "name": "Manager Name",
    "email": "manager@example.com"
  },
  "timeline": [
    {
      "id": "64f8a1b2c3d4e5f6a7b8c9d3",
      "activity": "Client Onboarding",
      "client": "ABC Corp",
      "status": "active"
    }
  ],
  "remarks": "Complete the client onboarding process",
  "status": "pending",
  "metadata": {
    "clientType": "enterprise",
    "urgency": "high"
  },
  "attachments": [],
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:00:00.000Z"
}
```

### 4. Update Task
**PATCH** `/tasks/:taskId`

**Path Parameters:**
- `taskId` - Task ID

**Request Body:**
```json
{
  "status": "ongoing",
  "remarks": "Task is now in progress",
  "metadata": {
    "progress": "25%",
    "notes": "Started initial setup"
  }
}
```

**Response (200 OK):**
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d5",
  "status": "ongoing",
  "remarks": "Task is now in progress",
  "metadata": {
    "progress": "25%",
    "notes": "Started initial setup"
  },
  "updatedAt": "2024-01-15T11:00:00.000Z"
}
```

### 5. Delete Task
**DELETE** `/tasks/:taskId`

**Path Parameters:**
- `taskId` - Task ID

**Response (204 No Content)**

### 6. Get Tasks by Team Member
**GET** `/tasks/team-member/:teamMemberId`

**Path Parameters:**
- `teamMemberId` - Team Member ID

**Query Parameters:**
- `status` - Filter by status
- `sortBy` - Sort field
- `limit` - Results per page
- `page` - Page number

**Example Request:**
```
GET /tasks/team-member/64f8a1b2c3d4e5f6a7b8c9d0?status=pending&limit=10
```

### 7. Get Tasks by Timeline
**GET** `/tasks/timeline/:timelineId`

**Path Parameters:**
- `timelineId` - Timeline ID

**Query Parameters:**
- `sortBy` - Sort field
- `limit` - Results per page
- `page` - Page number

### 8. Get Tasks by Assigned By User
**GET** `/tasks/assigned-by/:userId`

**Path Parameters:**
- `userId` - User ID who assigned the tasks

**Query Parameters:**
- `sortBy` - Sort field
- `limit` - Results per page
- `page` - Page number

### 9. Get Tasks by Branch
**GET** `/tasks/branch/:branchId`

**Path Parameters:**
- `branchId` - Branch ID

**Query Parameters:**
- `sortBy` - Sort field
- `limit` - Results per page
- `page` - Page number

### 10. Get Tasks by Status
**GET** `/tasks/status/:status`

**Path Parameters:**
- `status` - Task status (pending, ongoing, completed, on_hold, cancelled, delayed)

**Query Parameters:**
- `sortBy` - Sort field
- `limit` - Results per page
- `page` - Page number

### 11. Get Tasks by Priority
**GET** `/tasks/priority/:priority`

**Path Parameters:**
- `priority` - Priority level (low, medium, high, urgent, critical)

**Query Parameters:**
- `sortBy` - Sort field
- `limit` - Results per page
- `page` - Page number

### 12. Get Tasks by Date Range
**GET** `/tasks/date-range`

**Query Parameters:**
- `startDate` - Start date (required)
- `endDate` - End date (required)
- `sortBy` - Sort field
- `limit` - Results per page
- `page` - Page number

**Example Request:**
```
GET /tasks/date-range?startDate=2024-01-01T00:00:00.000Z&endDate=2024-01-31T23:59:59.000Z
```

### 13. Get Overdue Tasks
**GET** `/tasks/overdue`

**Query Parameters:**
- `sortBy` - Sort field
- `limit` - Results per page
- `page` - Page number

### 14. Get High Priority Tasks
**GET** `/tasks/high-priority`

**Query Parameters:**
- `sortBy` - Sort field
- `limit` - Results per page
- `page` - Page number

### 15. Get Tasks Due Today
**GET** `/tasks/due-today`

**Query Parameters:**
- `sortBy` - Sort field
- `limit` - Results per page
- `page` - Page number

### 16. Get Tasks Due This Week
**GET** `/tasks/due-this-week`

**Query Parameters:**
- `sortBy` - Sort field
- `limit` - Results per page
- `page` - Page number

### 17. Get Tasks Due This Month
**GET** `/tasks/due-this-month`

**Query Parameters:**
- `sortBy` - Sort field
- `limit` - Results per page
- `page` - Page number

### 18. Search Tasks
**GET** `/tasks/search`

**Query Parameters:**
- `q` - Search query (required)
- `sortBy` - Sort field
- `limit` - Results per page
- `page` - Page number

**Example Request:**
```
GET /tasks/search?q=client onboarding&limit=20
```

### 19. Get Task Statistics
**GET** `/tasks/statistics`

**Query Parameters:**
- `branchId` - Optional branch filter

**Response (200 OK):**
```json
{
  "total": 150,
  "pending": 45,
  "ongoing": 30,
  "completed": 60,
  "onHold": 10,
  "cancelled": 3,
  "delayed": 2,
  "low": 20,
  "medium": 50,
  "high": 40,
  "urgent": 25,
  "critical": 15
}
```

### 20. Bulk Update Task Status
**PATCH** `/tasks/bulk/status`

**Request Body:**
```json
{
  "taskIds": [
    "64f8a1b2c3d4e5f6a7b8c9d5",
    "64f8a1b2c3d4e5f6a7b8c9d6",
    "64f8a1b2c3d4e5f6a7b8c9d7"
  ],
  "status": "completed"
}
```

**Response (200 OK):**
```json
{
  "acknowledged": true,
  "modifiedCount": 3,
  "upsertedId": null,
  "upsertedCount": 0,
  "matchedCount": 3
}
```

### 21. Bulk Delete Tasks
**DELETE** `/tasks/bulk`

**Request Body:**
```json
{
  "taskIds": [
    "64f8a1b2c3d4e5f6a7b8c9d5",
    "64f8a1b2c3d4e5f6a7b8c9d6"
  ]
}
```

**Response (200 OK):**
```json
{
  "acknowledged": true,
  "deletedCount": 2
}
```

### 22. Add Attachment to Task
**POST** `/tasks/:taskId/attachments`

**Path Parameters:**
- `taskId` - Task ID

**Request Body:**
```json
{
  "fileName": "document.pdf",
  "fileUrl": "https://example.com/files/document.pdf"
}
```

**Response (200 OK):**
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d5",
  "attachments": [
    {
      "fileName": "document.pdf",
      "fileUrl": "https://example.com/files/document.pdf",
      "uploadedAt": "2024-01-15T12:00:00.000Z"
    }
  ]
}
```

### 23. Remove Attachment from Task
**DELETE** `/tasks/:taskId/attachments/:fileName`

**Path Parameters:**
- `taskId` - Task ID
- `fileName` - Name of the file to remove

**Response (200 OK):**
```json
{
  "id": "64f8a1b2c3d4e5f6a7b8c9d5",
  "attachments": []
}
```

## Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Validation error",
  "details": [
    {
      "field": "endDate",
      "message": "endDate must be greater than startDate"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "code": 401,
  "message": "Please authenticate"
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "Task not found"
}
```

### 500 Internal Server Error
```json
{
  "code": 500,
  "message": "Internal server error"
}
```

## Frontend Integration Examples

### React Hook Example
```javascript
import { useState, useEffect } from 'react';

const useTasks = (filters = {}) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`/api/v1/tasks?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch tasks');
      
      const data = await response.json();
      setTasks(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [JSON.stringify(filters)]);

  return { tasks, loading, error, refetch: fetchTasks };
};
```

### Create Task Example
```javascript
const createTask = async (taskData) => {
  try {
    const response = await fetch('/api/v1/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(taskData)
    });
    
    if (!response.ok) throw new Error('Failed to create task');
    
    const task = await response.json();
    return task;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

// Usage
const newTask = await createTask({
  teamMember: '64f8a1b2c3d4e5f6a7b8c9d0',
  startDate: new Date('2024-01-15'),
  endDate: new Date('2024-01-20'),
  priority: 'high',
  branch: '64f8a1b2c3d4e5f6a7b8c9d1',
  remarks: 'New client onboarding task'
});
```

### Update Task Status Example
```javascript
const updateTaskStatus = async (taskId, status) => {
  try {
    const response = await fetch(`/api/v1/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) throw new Error('Failed to update task');
    
    const task = await response.json();
    return task;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};
```

## Best Practices

1. **Pagination**: Always implement pagination for large datasets using `limit` and `page` parameters
2. **Error Handling**: Implement proper error handling for all API calls
3. **Loading States**: Show loading indicators during API calls
4. **Validation**: Validate data before sending to the API
5. **Caching**: Consider caching frequently accessed data
6. **Real-time Updates**: Use WebSockets or polling for real-time task updates
7. **File Uploads**: Handle file uploads separately and pass URLs to the API

## Rate Limiting

The API implements rate limiting to prevent abuse. Respect the rate limits and implement exponential backoff for retries.

## Support

For API support or questions, please contact the development team or refer to the internal documentation.
