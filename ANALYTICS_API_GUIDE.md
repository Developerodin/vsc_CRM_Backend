# Team Member Analytics API Guide

This document provides comprehensive information about the Team Member Analytics system, including API endpoints, data structures, and usage examples.

## Overview

The Team Member Analytics system provides comprehensive insights into team member performance, task completion rates, and workload distribution. It's designed as a modular system that can be easily extended for future analytics services.

## Architecture

```
src/
├── services/
│   └── analytics/
│       ├── index.js                    # Main analytics service exports
│       └── teamMemberAnalytics.service.js  # Team member specific analytics
├── controllers/
│   └── analytics.controller.js         # Common analytics controller
├── routes/
│   └── v1/
│       └── analytics.route.js          # Analytics routes
└── validations/
    └── analytics.validation.js         # Input validation schemas
```

## API Endpoints

### Base URL
```
/v1/analytics
```

### 1. Get Analytics Information
**GET** `/v1/analytics`

Returns information about all available analytics endpoints.

**Response:**
```json
{
  "success": true,
  "message": "Analytics endpoints information",
  "data": {
    "available": ["team-members", "clients"],
    "endpoints": {
      "team-members": {
        "description": "Team member performance analytics",
        "endpoints": [...]
      },
      "clients": {
        "description": "Client performance and relationship analytics",
        "endpoints": [
          {
            "path": "/v1/analytics/clients/:clientId/overview",
            "method": "GET",
            "description": "Get detailed overview for a specific client",
            "params": {
              "clientId": "Client ID (required)"
            }
          }
        ]
      }
    }
  }
}
```

### 2. Dashboard Overview Cards
**GET** `/v1/analytics/team-members/dashboard-cards`

Returns 4 key metric cards for the dashboard with month-over-month growth indicators.

**Response:**
```json
{
  "success": true,
  "message": "Dashboard cards retrieved successfully",
  "data": {
    "totalTeamMembers": {
      "value": 45,
      "growth": "+2%",
      "period": "this month"
    },
    "completionRate": {
      "value": "78.5%",
      "growth": "+12.5%",
      "period": "vs last month"
    },
    "tasksCompleted": {
      "value": 156,
      "growth": "+15",
      "period": "vs last month"
    },
    "workloadBalance": {
      "value": "85.2%",
      "growth": "+3.2%",
      "period": "vs last month"
    }
  }
}
```

**Metrics Explained:**
- **Total Team Members**: Current total count with monthly growth
- **Completion Rate**: Percentage of tasks completed this month vs last month
- **Tasks Completed**: Number of tasks completed this month vs last month
- **Workload Balance**: Distribution balance percentage (higher = better distribution)

### 3. Task Completion Trends
**GET** `/v1/analytics/team-members/completion-trends?months=6`

Returns task completion trends for bar chart visualization.

**Query Parameters:**
- `months` (optional): Number of months to analyze (1-24, default: 6)

**Response:**
```json
{
  "success": true,
  "message": "Task completion trends retrieved successfully",
  "data": {
    "trends": [
      {
        "month": "Jan 24",
        "completed": 45,
        "total": 60,
        "completionRate": 75.0
      },
      {
        "month": "Feb 24",
        "completed": 52,
        "total": 65,
        "completionRate": 80.0
      }
    ],
    "summary": {
      "totalCompleted": 97,
      "totalTasks": 125,
      "averageCompletionRate": "77.5"
    }
  }
}
```

### 4. Top Team Members by Completion
**GET** `/v1/analytics/team-members/top-by-completion?limit=10&branch=branchId&startDate=2024-01-01&endDate=2024-01-31`

Returns top performing team members based on task completion.

**Query Parameters:**
- `limit` (optional): Number of top members (1-100, default: 10)
- `branch` (optional): Branch ID filter
- `startDate` (optional): Start date filter (ISO format)
- `endDate` (optional): End date filter (ISO format)

**Response:**
```json
{
  "success": true,
  "message": "Top team members by completion retrieved successfully",
  "data": {
    "topMembers": [
      {
        "_id": "memberId",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "branch": "Main Branch",
        "completedTasks": 25,
        "totalTasks": 25,
        "completionRate": "100.0%"
      }
    ],
    "summary": {
      "totalCompleted": 25,
      "averageCompletion": "25.0"
    }
  }
}
```

### 5. Top Team Members by Branch
**GET** `/v1/analytics/team-members/top-by-branch?branchId=branchId&limit=5`

Returns top performing team members grouped by branch.

**Query Parameters:**
- `branchId` (optional): Specific branch ID filter
- `limit` (optional): Number of top members per branch (1-50, default: 5)

**Response (All Branches):**
```json
{
  "success": true,
  "message": "Top team members by branch retrieved successfully",
  "data": {
    "branches": [
      {
        "branchId": "branch1",
        "branchName": "Main Branch",
        "topMembers": [...],
        "summary": {
          "totalCompleted": 45,
          "averageCompletion": "15.0"
        }
      }
    ],
    "summary": {
      "totalBranches": 3,
      "totalCompleted": 120,
      "averageCompletion": "18.5"
    }
  }
}
```

**Response (Single Branch):**
```json
{
  "success": true,
  "message": "Top team members by branch retrieved successfully",
  "data": {
    "branchId": "branch1",
    "branchName": "Main Branch",
    "topMembers": [...],
    "summary": {
      "totalCompleted": 45,
      "averageCompletion": "15.0"
    }
  }
}
```

### 6. Complete Analytics Summary
**GET** `/v1/analytics/team-members/summary`

Returns a comprehensive summary of all analytics data in a single request.

### 7. Team Member Details Overview
**GET** `/v1/analytics/team-members/:teamMemberId/overview`

Returns comprehensive details for a specific team member including personal information, performance metrics, tasks, and clients handled.

**Response:**
```json
{
  "success": true,
  "message": "Team member analytics summary retrieved successfully",
  "data": {
    "dashboardCards": {...},
    "trends": {...},
    "topMembers": {...},
    "topMembersByBranch": {...},
    "generatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Parameters:**
- `teamMemberId` (required): Team member ID in the URL path

**Response:**
```json
{
  "success": true,
  "message": "Team member details overview retrieved successfully",
  "data": {
    "teamMember": {
      "_id": "memberId",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "country": "USA",
      "pinCode": "10001",
      "skills": [...],
      "branch": {...},
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "performance": {
      "totalTasks": 45,
      "completedTasks": 38,
      "completionRate": 84.4,
      "currentMonthCompleted": 12,
      "activeTasks": 5,
      "overdueTasks": 2,
      "averageCompletionTime": 3
    },
    "currentMonth": {
      "start": "2024-01-01T00:00:00.000Z",
      "end": "2024-01-31T23:59:59.999Z",
      "completedTasks": 12,
      "totalTasks": 15
    },
    "tasks": {
      "byStatus": {...},
      "byPriority": {...},
      "recent": [...],
      "monthlyDistribution": [...]
    },
         "clients": {
       "total": 8,
       "summary": [
         {
           "client": {
             "id": "clientId",
             "name": "Client Name",
             "email": "client@email.com",
             "phone": "+1234567890",
             "company": "Company Name"
           },
           "timelines": [...],
           "totalTasks": 5,
           "completedTasks": 3,
           "completionRate": "60.0",
           "activities": [...],
           "totalActivities": 2
         }
       ],
       "timelines": [...],
       "timelineDetails": [
         {
           "taskId": "taskId",
           "taskStatus": "ongoing",
           "taskPriority": "medium",
           "taskRemarks": "Task description",
           "taskStartDate": "2024-01-01T00:00:00.000Z",
           "taskEndDate": "2024-01-31T23:59:59.999Z",
           "timeline": {
             "id": "timelineId",
             "status": "pending",
             "startDate": "2024-01-01T00:00:00.000Z",
             "endDate": "2024-01-31T23:59:59.999Z",
             "client": {
               "id": "clientId",
               "name": "Client Name",
               "email": "client@email.com",
               "phone": "+1234567890",
               "company": "Company Name"
             },
             "activity": {
               "id": "activityId",
               "name": "Activity Name",
               "description": "Activity Description"
             }
           }
         }
       ]
     },
    "generatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## Data Calculations

### Dashboard Cards Logic

1. **Total Team Members Growth**
   - Counts team members created in current month vs last month
   - Calculates percentage growth

2. **Completion Rate**
   - `(Completed Tasks / Total Tasks) × 100`
   - Compares current month vs last month
   - Shows percentage improvement

3. **Tasks Completed Growth**
   - Absolute difference in completed tasks between months
   - Shows actual task count improvement

4. **Workload Balance**
   - Calculates variance in task distribution among team members
   - Lower variance = better balance
   - Converts to percentage scale (0-100%)

### Trends Calculation

- Analyzes task completion over specified months
- Calculates completion rate for each month
- Provides summary statistics

### Top Members Ranking

- Aggregates completed tasks by team member
- Includes branch information
- Calculates individual completion rates
- Supports filtering by branch and date range

### Client Information

The API now provides comprehensive client information extracted from timeline data:

- **Client Summary**: Aggregated client data with task counts and completion rates
- **Timeline Details**: Detailed breakdown of each task with its associated timeline, client, and activity information
- **Activity Tracking**: Shows which activities are being performed for each client
- **Task-Client Mapping**: Clear relationship between tasks, timelines, and clients

This ensures that even when client data is nested within timeline structures, it's properly extracted and presented in a user-friendly format.

## Client Analytics

### Client Overview API

**GET** `/v1/analytics/clients/:clientId/overview`

Get comprehensive overview of a specific client including personal information, activities, tasks, team members, and timeline relationships.

#### Parameters
- `clientId` (path, required): Client ID

#### Response Structure
```json
{
  "success": true,
  "message": "Client details overview retrieved successfully",
  "data": {
    "client": {
      "_id": "clientId",
      "name": "Client Name",
      "email": "client@email.com",
      "phone": "+1234567890",
      "address": "Client Address",
      "businessType": "Proprietorship",
      "gstNumber": "GST123456789",
      "entityType": "Private Limited",
      "branch": {
        "name": "Branch Name",
        "address": "Branch Address",
        "city": "City",
        "state": "State"
      }
    },
    "performance": {
      "totalTasks": 15,
      "completedTasks": 12,
      "completionRate": 80.0,
      "totalTimelines": 8,
      "totalActivities": 5,
      "totalTeamMembers": 3
    },
    "activities": {
      "assigned": [...],
      "summary": [
        {
          "id": "activityId",
          "name": "GST Filing",
          "description": "Monthly GST return filing",
          "category": "Tax",
          "frequency": "Monthly"
        }
      ],
      "byCategory": {
        "Tax": [...],
        "Compliance": [...]
      }
    },
    "tasks": {
      "byStatus": {
        "completed": [...],
        "ongoing": [...],
        "pending": [...]
      },
      "byPriority": {
        "high": 5,
        "medium": 8,
        "low": 2
      },
      "byTeamMember": [...],
      "byActivity": [...],
      "recent": [...],
      "monthlyDistribution": [...]
    },
    "teamMembers": {
      "total": 3,
      "summary": [
        {
          "id": "memberId",
          "name": "Team Member Name",
          "email": "member@email.com",
          "skills": [...],
          "taskStats": {
            "totalTasks": 8,
            "completedTasks": 6,
            "completionRate": "75.0"
          }
        }
      ],
      "performance": [...]
    },
    "timelines": {
      "total": 8,
      "summary": [
        {
          "id": "timelineId",
          "status": "ongoing",
          "frequency": "Monthly",
          "activity": {...},
          "totalPeriods": 12,
          "completedPeriods": 8
        }
      ],
      "byStatus": {...},
      "byActivity": {...}
    }
  }
}
```

#### Key Features
- **Client Personal Information**: Complete client details including business information
- **Activity Overview**: All activities assigned to the client with frequency configurations
- **Task Performance**: Comprehensive task breakdown by status, priority, and team member
- **Team Member Analysis**: Shows which team members are working on this client's tasks
- **Timeline Management**: Detailed timeline information with frequency status tracking
- **Performance Metrics**: Completion rates, task distribution, and monthly trends

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (validation errors)
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Internal Server Error

## Authentication & Authorization

All analytics endpoints require authentication via the `auth()` middleware. Users must have valid JWT tokens to access the analytics data.

## Performance Considerations

- Analytics queries use MongoDB aggregation pipelines for efficient data processing
- Date ranges are optimized for current month calculations
- Results are cached where possible to improve response times
- Large datasets are paginated to prevent memory issues

## Extending the System

To add new analytics services:

1. **Create Service**: Add new service file in `src/services/analytics/`
2. **Update Index**: Export from `src/services/analytics/index.js`
3. **Add Controller**: Extend `analytics.controller.js`
4. **Add Routes**: Extend `analytics.route.js`
5. **Add Validation**: Extend `analytics.validation.js`

Example structure for a new service:
```javascript
// src/services/analytics/clientAnalytics.service.js
const getClientMetrics = async () => {
  // Implementation
};

export default {
  getClientMetrics
};
```

## Testing

Use the provided test script to verify functionality:

```bash
node test-analytics.js
```

## Future Enhancements

Potential areas for expansion:
- Real-time analytics with WebSocket support
- Advanced filtering and date range selection
- Export functionality (CSV, PDF reports)
- Custom dashboard configurations
- Performance benchmarking
- Predictive analytics
- Integration with external BI tools

## Support

For questions or issues with the analytics system, please refer to the main project documentation or create an issue in the project repository.
