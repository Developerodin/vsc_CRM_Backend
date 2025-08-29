# Team Member Authentication API Guide

This guide explains how to use the Team Member Authentication API, which provides OTP-based login similar to the Client Auth system.

## Base URL
```
/api/v1/team-member-auth
```

## Endpoints

### 1. Generate OTP
**POST** `/generate-otp`

Generate a 6-digit OTP and send it to the team member's email.

**Request Body:**
```json
{
  "email": "team.member@company.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your email",
  "data": {
    "email": "team.member@company.com",
    "message": "Please check your email for the OTP"
  }
}
```

### 2. Verify OTP and Login
**POST** `/verify-otp`

Verify the OTP and login the team member.

**Request Body:**
```json
{
  "email": "team.member@company.com",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "teamMember": {
      "id": "team_member_id",
      "name": "John Doe",
      "email": "team.member@company.com",
      "phone": "+1234567890",
      "branch": "branch_id",
      "skills": ["skill1_id", "skill2_id"]
    },
    "tokens": {
      "access": {
        "token": "access_token_here",
        "expires": "2024-12-31T23:59:59.000Z"
      },
      "refresh": {
        "token": "refresh_token_here",
        "expires": "2025-01-30T23:59:59.000Z"
      }
    }
  }
}
```

### 3. Get Profile
**GET** `/profile`

Get the authenticated team member's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "id": "team_member_id",
    "name": "John Doe",
    "email": "team.member@company.com",
    "phone": "+1234567890",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "USA",
    "pinCode": "10001",
    "branch": {
      "id": "branch_id",
      "name": "Main Office",
      "address": "456 Business Ave",
      "city": "New York",
      "state": "NY",
      "country": "USA"
    },
    "skills": [
      {
        "id": "skill1_id",
        "name": "GST Filing",
        "description": "Goods and Services Tax filing",
        "category": "Tax"
      }
    ]
  }
}
```

### 4. Update Profile
**PATCH** `/profile`

Update the authenticated team member's profile.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "phone": "+1987654321",
  "address": "789 Oak St",
  "city": "Los Angeles",
  "state": "CA",
  "country": "USA",
  "pinCode": "90210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    // Updated profile data
  }
}
```

### 5. Logout
**POST** `/logout`

Logout the team member and invalidate the refresh token.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

### 6. Refresh Tokens
**POST** `/refresh-tokens`

Refresh the access token using a valid refresh token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tokens refreshed successfully",
  "data": {
    "access": {
      "token": "new_access_token",
      "expires": "2024-12-31T23:59:59.000Z"
    },
    "refresh": {
      "token": "new_refresh_token",
      "expires": "2025-01-30T23:59:59.000Z"
    }
  }
}
```

### 7. Get My Tasks
**GET** `/tasks`

Get all tasks assigned to the authenticated team member with filtering and pagination.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status` (optional): Filter by task status (pending, ongoing, completed, on_hold, cancelled, delayed)
- `priority` (optional): Filter by priority (low, medium, high, urgent, critical)
- `startDate` (optional): Filter tasks from this date (ISO format)
- `endDate` (optional): Filter tasks until this date (ISO format)
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of tasks per page (default: 10, max: 100)

**Response:**
```json
{
  "success": true,
  "message": "Tasks retrieved successfully",
  "data": {
    "tasks": [
      {
        "id": "task_id",
        "status": "ongoing",
        "priority": "high",
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-01-31T23:59:59.000Z",
        "remarks": "Complete GST filing for client",
        "assignedBy": {
          "id": "user_id",
          "name": "Manager Name",
          "email": "manager@company.com"
        },
        "branch": {
          "id": "branch_id",
          "name": "Main Office",
          "address": "123 Business St",
          "city": "New York",
          "state": "NY"
        },
        "timeline": [
          {
            "id": "timeline_id",
            "client": {
              "id": "client_id",
              "name": "Client Company",
              "email": "client@company.com",
              "phone": "+1234567890",
              "company": "Client Company Ltd"
            },
            "activity": {
              "id": "activity_id",
              "name": "GST Filing",
              "description": "Monthly GST return filing",
              "category": "Tax"
            }
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalTasks": 25,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

### 8. Get Task Details
**GET** `/tasks/:taskId`

Get detailed information about a specific task.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `taskId`: The ID of the task to retrieve

**Response:**
```json
{
  "success": true,
  "message": "Task details retrieved successfully",
  "data": {
    "id": "task_id",
    "status": "ongoing",
    "priority": "high",
    "startDate": "2024-01-01T00:00:00.000Z",
    "endDate": "2024-01-31T23:59:59.000Z",
    "remarks": "Complete GST filing for client",
    "assignedBy": {
      "id": "user_id",
      "name": "Manager Name",
      "email": "manager@company.com",
      "phone": "+1234567890"
    },
    "branch": {
      "id": "branch_id",
      "name": "Main Office",
      "address": "123 Business St",
      "city": "New York",
      "state": "NY",
      "country": "USA"
    },
    "teamMember": {
      "id": "team_member_id",
      "name": "John Doe",
      "email": "john@company.com",
      "phone": "+1987654321"
    },
    "timeline": [
      {
        "id": "timeline_id",
        "client": {
          "id": "client_id",
          "name": "Client Company",
          "email": "client@company.com",
          "phone": "+1234567890",
          "company": "Client Company Ltd",
          "address": "456 Client Ave",
          "city": "Los Angeles",
          "state": "CA",
          "country": "USA"
        },
        "activity": {
          "id": "activity_id",
          "name": "GST Filing",
          "description": "Monthly GST return filing",
          "category": "Tax"
        }
      }
    ],
    "attachments": [
      {
        "fileName": "gst_document.pdf",
        "fileUrl": "https://example.com/files/gst_document.pdf",
        "uploadedAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "metadata": {
      "clientCategory": "Premium",
      "urgency": "High"
    }
  }
}
```

### 9. Update Task
**PATCH** `/tasks/:taskId`

Update task status, remarks, or metadata.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Path Parameters:**
- `taskId`: The ID of the task to update

**Request Body:**
```json
{
  "status": "completed",
  "remarks": "GST filing completed successfully. All documents submitted.",
  "metadata": {
    "completionNotes": "Client satisfied with the service",
    "nextAction": "Follow up for next month"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task updated successfully",
  "data": {
    // Updated task data
  }
}
```

## Authentication Flow

1. **Generate OTP**: Team member requests OTP by providing email
2. **Receive OTP**: OTP is sent to team member's email
3. **Verify OTP**: Team member submits OTP for verification
4. **Login**: Upon successful verification, access and refresh tokens are issued
5. **Use API**: Include `Authorization: Bearer <access_token>` header for protected endpoints
6. **Refresh**: Use refresh token to get new access token when current one expires
7. **Logout**: Invalidate refresh token on logout

## Error Responses

**Invalid Email:**
```json
{
  "success": false,
  "message": "Team member not found with this email",
  "statusCode": 404
}
```

**Invalid OTP:**
```json
{
  "success": false,
  "message": "Invalid OTP format",
  "statusCode": 400
}
```

**Unauthorized:**
```json
{
  "success": false,
  "message": "Access token required",
  "statusCode": 401
}
```

## Task Management Features

### **📋 Task Retrieval:**
- **Get All Tasks**: Fetch all tasks assigned to the team member with filtering and pagination
- **Get Task Details**: Get comprehensive information about a specific task
- **Filtering Options**: By status, priority, date range
- **Pagination**: Configurable page size and navigation

### **✏️ Task Updates:**
- **Status Updates**: Change task status (pending → ongoing → completed)
- **Add Remarks**: Include notes, progress updates, or completion details
- **Metadata**: Store additional information like completion notes, next actions
- **Security**: Team members can only update their own assigned tasks

### **🔒 Security Features:**
- **Authentication Required**: All task endpoints require valid access token
- **Ownership Verification**: Team members can only access/update their assigned tasks
- **Field Restrictions**: Limited to status, remarks, and metadata updates
- **Audit Trail**: All updates are logged with team member information

## Notes

- OTP is valid for 10 minutes
- Access tokens expire based on JWT configuration
- Refresh tokens have longer expiration
- Profile updates are restricted (email, branch, skills cannot be changed)
- Task updates are restricted to status, remarks, and metadata only
- The system uses the same token structure as the existing authentication system
