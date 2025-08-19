# Task Dashboard APIs Documentation

This document describes the new task-related dashboard APIs that provide comprehensive task analytics and visualization data.

## Overview

The task dashboard APIs offer three main functionalities:
1. **Total Tasks and Status Breakdown** - Get overall task counts by status
2. **Task Analytics** - Detailed analytics with date filtering and grouping options
3. **Task Trends** - Time-based trends for graph visualization

## API Endpoints

### 1. Get Total Tasks and Status Breakdown

**Endpoint:** `GET /v1/dashboard/total-tasks-and-status`

**Description:** Returns the total count of tasks and their breakdown by status (pending, ongoing, completed, on_hold, cancelled, delayed).

**Query Parameters:**
- `branchId` (optional): Specific branch ID to filter tasks

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response Example:**
```json
{
  "branch": {
    "id": "507f1f77bcf86cd799439011"
  },
  "total": 150,
  "statusBreakdown": {
    "pending": 45,
    "ongoing": 30,
    "completed": 50,
    "on_hold": 10,
    "cancelled": 5,
    "delayed": 10
  }
}
```

**Use Case:** Dashboard widgets showing total task counts and status distribution.

---

### 2. Get Task Analytics

**Endpoint:** `GET /v1/dashboard/task-analytics`

**Description:** Provides detailed task analytics with date filtering and multiple grouping options for comprehensive data analysis.


**Query Parameters:**
- `branchId` (optional): Specific branch ID to filter tasks
- `startDate` (optional): Start date for filtering (ISO format: YYYY-MM-DD)
- `endDate` (optional): End date for filtering (ISO format: YYYY-MM-DD)
- `groupBy` (optional): Grouping criteria (default: "status")
  - `status`: Group by task status
  - `priority`: Group by task priority
  - `branch`: Group by branch
  - `teamMember`: Group by assigned team member
  - `month`: Group by month based on start date
  - `week`: Group by week based on start date

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response Example:**
```json
{
  "groupBy": "status",
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  },
  "totalTasks": 150,
  "totalGroups": 6,
  "analytics": [
    {
      "status": "pending",
      "count": 45,
      "tasks": [
        {
          "id": "507f1f77bcf86cd799439011",
          "title": "Review quarterly reports",
          "status": "pending",
          "priority": "high",
          "startDate": "2024-01-15T00:00:00.000Z",
          "endDate": "2024-01-20T00:00:00.000Z",
          "teamMember": "John Doe",
          "assignedBy": "Jane Smith"
        }
      ],
      "statusBreakdown": {
        "pending": 45,
        "ongoing": 0,
        "completed": 0,
        "on_hold": 0,
        "cancelled": 0,
        "delayed": 0
      },
      "priorityBreakdown": {
        "low": 5,
        "medium": 20,
        "high": 15,
        "urgent": 3,
        "critical": 2
      }
    }
  ]
}
```

**Use Case:** Detailed analytics dashboards, reports, and data visualization.

---

### 3. Get Task Trends

**Endpoint:** `GET /v1/dashboard/task-trends`

**Description:** Provides time-based task trends for graph visualization, showing how task counts change over time.

**Query Parameters:**
- `branchId` (optional): Specific branch ID to filter tasks
- `startDate` (optional): Start date for filtering (ISO format: YYYY-MM-DD)
- `endDate` (optional): End date for filtering (ISO format: YYYY-MM-DD)
- `interval` (optional): Time interval for grouping (default: "month")
  - `day`: Daily intervals
  - `week`: Weekly intervals
  - `month`: Monthly intervals

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response Example:**
```json
{
  "interval": "month",
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  },
  "totalTasks": 150,
  "trends": [
    {
      "interval": "2024-01",
      "totalTasks": 25,
      "statusBreakdown": {
        "pending": 10,
        "ongoing": 8,
        "completed": 5,
        "on_hold": 1,
        "cancelled": 0,
        "delayed": 1
      },
      "priorityBreakdown": {
        "low": 3,
        "medium": 12,
        "high": 8,
        "urgent": 1,
        "critical": 1
      }
    },
    {
      "interval": "2024-02",
      "totalTasks": 30,
      "statusBreakdown": {
        "pending": 12,
        "ongoing": 10,
        "completed": 6,
        "on_hold": 1,
        "cancelled": 0,
        "delayed": 1
      },
      "priorityBreakdown": {
        "low": 4,
        "medium": 15,
        "high": 9,
        "urgent": 1,
        "critical": 1
      }
    }
  ]
}
```

**Use Case:** Line charts, trend analysis, and performance tracking over time.

---

## Date Filtering Logic

The APIs use intelligent date filtering that captures tasks that fall within the specified date range:

- **Tasks starting within the range**
- **Tasks ending within the range**
- **Tasks spanning across the range**
- **Tasks that overlap with the range boundaries**

This ensures comprehensive coverage of all relevant tasks regardless of their duration.

## Grouping Options

### Status Grouping
Groups tasks by their current status (pending, ongoing, completed, on_hold, cancelled, delayed).

### Priority Grouping
Groups tasks by priority level (low, medium, high, urgent, critical).

### Branch Grouping
Groups tasks by the branch they belong to.

### Team Member Grouping
Groups tasks by the assigned team member.

### Time-based Grouping
- **Month**: Groups by month based on task start date
- **Week**: Groups by week number based on task start date

## Authentication & Authorization

All endpoints require:
- Valid JWT authentication token
- User must have appropriate role and branch access permissions
- Branch filtering is automatically applied based on user's access level

## Error Handling

The APIs return appropriate HTTP status codes:
- `200 OK`: Successful response
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions or no branch access
- `404 Not Found`: Branch not found
- `500 Internal Server Error`: Server-side errors

## Rate Limiting

All endpoints are subject to the application's rate limiting policies.

## Example Usage

### Frontend Dashboard Widget
```javascript
// Get total tasks for dashboard widget
const response = await fetch('/v1/dashboard/total-tasks-and-status', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();

// Update dashboard widget
updateTaskWidget(data.total, data.statusBreakdown);
```

### Analytics Chart
```javascript
// Get task trends for line chart
const response = await fetch('/v1/dashboard/task-trends?interval=month&startDate=2024-01-01&endDate=2024-12-31', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();

// Create chart data
const chartData = data.trends.map(trend => ({
  x: trend.interval,
  y: trend.totalTasks
}));
```

### Priority Analysis
```javascript
// Get tasks grouped by priority
const response = await fetch('/v1/dashboard/task-analytics?groupBy=priority', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();

// Create priority distribution chart
const priorityData = data.analytics.map(item => ({
  priority: item.priority,
  count: item.count
}));
```

## Performance Considerations

- All queries are optimized with proper database indexes
- Population of related data is limited to essential fields
- Task details in analytics are limited to 10 per group to prevent large responses
- Date filtering uses efficient MongoDB date range queries

## Future Enhancements

Potential improvements for future versions:
- Additional grouping options (e.g., by activity type, client)
- More granular time intervals (e.g., quarter, year)
- Export functionality for analytics data
- Real-time updates via WebSocket
- Caching for frequently accessed analytics
