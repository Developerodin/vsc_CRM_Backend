# Dashboard Frequency-Based Timeline Analysis APIs

This document provides comprehensive documentation for the new dashboard APIs that analyze timeline status based on frequency configurations and frequency status tracking.

## Overview

The new APIs provide detailed analytics for timeline tasks based on their frequency settings (Hourly, Daily, Weekly, Monthly, Quarterly, Yearly) and individual frequency status tracking. These APIs enable dashboard visualization of task completion rates, status trends, and performance metrics.

## Base URL
```
GET /v1/dashboard/{endpoint}
```

## Authentication
All endpoints require authentication with appropriate permissions:
- `getTimelines` permission required for all endpoints
- Branch access validation based on user role

## API Endpoints

### 1. Timeline Status by Frequency

**Endpoint:** `GET /v1/dashboard/timeline-status-by-frequency`

**Description:** Get timeline status breakdown by frequency type for a specific date range.

**Query Parameters:**
- `startDate` (required): Start date in ISO format (YYYY-MM-DD)
- `endDate` (required): End date in ISO format (YYYY-MM-DD)
- `branchId` (optional): Specific branch ID to filter by
- `frequency` (optional): Filter by specific frequency type
- `status` (optional): Filter by specific status

**Example Request:**
```bash
GET /v1/dashboard/timeline-status-by-frequency?startDate=2024-01-01&endDate=2024-01-31&frequency=Daily&status=pending
```

**Response:**
```json
{
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "filters": {
    "frequency": "Daily",
    "status": "pending"
  },
  "results": [
    {
      "frequency": "Daily",
      "totalPeriods": 150,
      "statusBreakdown": {
        "pending": {
          "count": 45,
          "periods": ["2024-01-15", "2024-01-16", "2024-01-17"]
        },
        "completed": {
          "count": 95,
          "periods": ["2024-01-01", "2024-01-02", "2024-01-03"]
        },
        "delayed": {
          "count": 8,
          "periods": ["2024-01-10", "2024-01-11"]
        },
        "ongoing": {
          "count": 2,
          "periods": ["2024-01-20"]
        }
      }
    }
  ]
}
```

### 2. Timeline Status by Period

**Endpoint:** `GET /v1/dashboard/timeline-status-by-period`

**Description:** Get detailed timeline status for specific periods within a frequency type.

**Query Parameters:**
- `startDate` (required): Start date in ISO format (YYYY-MM-DD)
- `endDate` (required): End date in ISO format (YYYY-MM-DD)
- `frequency` (required): Frequency type to analyze
- `branchId` (optional): Specific branch ID to filter by
- `period` (optional): Specific period to filter by

**Example Request:**
```bash
GET /v1/dashboard/timeline-status-by-period?startDate=2024-01-01&endDate=2024-01-31&frequency=Daily&period=2024-01-15
```

**Response:**
```json
{
  "frequency": "Daily",
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "period": "2024-01-15",
  "totalPeriods": 25,
  "periods": [
    {
      "period": "2024-01-15",
      "status": "pending",
      "completedAt": null,
      "notes": "Waiting for client approval",
      "timelineId": "507f1f77bcf86cd799439011",
      "activity": "Client Meeting",
      "client": "ABC Corporation",
      "assignedMember": "John Doe",
      "branch": "Main Branch"
    }
  ]
}
```

### 3. Timeline Frequency Analytics

**Endpoint:** `GET /v1/dashboard/timeline-frequency-analytics`

**Description:** Get comprehensive analytics grouped by various criteria (frequency, status, branch, activity).

**Query Parameters:**
- `startDate` (required): Start date in ISO format (YYYY-MM-DD)
- `endDate` (required): End date in ISO format (YYYY-MM-DD)
- `branchId` (optional): Specific branch ID to filter by
- `groupBy` (optional): Grouping criteria (frequency, status, branch, activity) - defaults to "frequency"

**Example Request:**
```bash
GET /v1/dashboard/timeline-frequency-analytics?startDate=2024-01-01&endDate=2024-01-31&groupBy=activity
```

**Response:**
```json
{
  "groupBy": "activity",
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "totalAnalytics": 5,
  "analytics": [
    {
      "activity": "Client Meeting",
      "activityId": "507f1f77bcf86cd799439011",
      "totalPeriods": 120,
      "pendingCount": 15,
      "completedCount": 95,
      "delayedCount": 8,
      "ongoingCount": 2,
      "completionRate": 79.17
    }
  ]
}
```

### 4. Timeline Status Trends

**Endpoint:** `GET /v1/dashboard/timeline-status-trends`

**Description:** Get timeline status trends over time with configurable intervals.

**Query Parameters:**
- `startDate` (required): Start date in ISO format (YYYY-MM-DD)
- `endDate` (required): End date in ISO format (YYYY-MM-DD)
- `branchId` (optional): Specific branch ID to filter by
- `frequency` (optional): Filter by specific frequency type
- `interval` (optional): Time interval for grouping (day, week, month) - defaults to "day"

**Example Request:**
```bash
GET /v1/dashboard/timeline-status-trends?startDate=2024-01-01&endDate=2024-01-31&frequency=Daily&interval=week
```

**Response:**
```json
{
  "interval": "week",
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "frequency": "Daily",
  "trends": [
    {
      "interval": "2024-W01",
      "totalCount": 35,
      "statusBreakdown": {
        "pending": 5,
        "completed": 28,
        "delayed": 2,
        "ongoing": 0
      }
    },
    {
      "interval": "2024-W02",
      "totalCount": 42,
      "statusBreakdown": {
        "pending": 8,
        "completed": 32,
        "delayed": 1,
        "ongoing": 1
      }
    }
  ]
}
```

### 5. Timeline Completion Rates

**Endpoint:** `GET /v1/dashboard/timeline-completion-rates`

**Description:** Get completion rates and performance metrics for timelines.

**Query Parameters:**
- `startDate` (required): Start date in ISO format (YYYY-MM-DD)
- `endDate` (required): End date in ISO format (YYYY-MM-DD)
- `branchId` (optional): Specific branch ID to filter by
- `frequency` (optional): Filter by specific frequency type

**Example Request:**
```bash
GET /v1/dashboard/timeline-completion-rates?startDate=2024-01-01&endDate=2024-01-31&frequency=Daily
```

**Response:**
```json
{
  "dateRange": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "frequency": "Daily",
  "overallStats": {
    "totalPeriods": 450,
    "completedPeriods": 380,
    "delayedPeriods": 45,
    "ongoingPeriods": 15,
    "pendingPeriods": 10,
    "completionRate": 84.44,
    "onTimeRate": 87.78
  },
  "frequencyBreakdown": [
    {
      "frequency": "Daily",
      "totalPeriods": 300,
      "completedPeriods": 260,
      "delayedPeriods": 30,
      "ongoingPeriods": 8,
      "pendingPeriods": 2,
      "completionRate": 86.67,
      "onTimeRate": 89.33
    },
    {
      "frequency": "Weekly",
      "totalPeriods": 150,
      "completedPeriods": 120,
      "delayedPeriods": 15,
      "ongoingPeriods": 7,
      "pendingPeriods": 8,
      "completionRate": 80.00,
      "onTimeRate": 84.67
    }
  ]
}
```

## Frequency Types and Period Formats

### Supported Frequency Types:
- **Hourly**: Every X hours
- **Daily**: At specific time each day
- **Weekly**: On specific days of the week
- **Monthly**: On specific day of the month
- **Quarterly**: On specific months and days
- **Yearly**: On specific month and date

### Period Format Examples:
- **Hourly**: `2024-01-15-14` (YYYY-MM-DD-HH)
- **Daily**: `2024-01-15` (YYYY-MM-DD)
- **Weekly**: `2024-W03` (YYYY-WweekNumber)
- **Monthly**: `2024-01` (YYYY-MM)
- **Quarterly**: `2024-Q1` (YYYY-QquarterNumber)
- **Yearly**: `2024-January` (YYYY-MonthName)

## Status Types

- **pending**: Task not yet started
- **completed**: Task successfully completed
- **delayed**: Task past due date
- **ongoing**: Task currently in progress

## Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Validation Error",
  "details": [
    {
      "field": "startDate",
      "message": "startDate is required"
    }
  ]
}
```

### 403 Forbidden
```json
{
  "code": 403,
  "message": "Access denied to this branch"
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "Branch not found"
}
```

## Dashboard Integration Examples

### 1. Frequency Status Overview Chart
```javascript
// Get data for pie chart showing status breakdown by frequency
const response = await fetch('/v1/dashboard/timeline-status-by-frequency?startDate=2024-01-01&endDate=2024-01-31');
const data = await response.json();

// Chart.js example
const chartData = {
  labels: data.results.map(r => r.frequency),
  datasets: [{
    data: data.results.map(r => r.statusBreakdown.pending?.count || 0),
    label: 'Pending'
  }, {
    data: data.results.map(r => r.statusBreakdown.completed?.count || 0),
    label: 'Completed'
  }]
};
```

### 2. Completion Rate Trend Line
```javascript
// Get trend data for line chart
const response = await fetch('/v1/dashboard/timeline-status-trends?startDate=2024-01-01&endDate=2024-01-31&interval=week');
const data = await response.json();

// Chart.js example
const chartData = {
  labels: data.trends.map(t => t.interval),
  datasets: [{
    data: data.trends.map(t => (t.statusBreakdown.completed / t.totalCount) * 100),
    label: 'Completion Rate %'
  }]
};
```

### 3. Performance Metrics Dashboard
```javascript
// Get completion rates for KPI cards
const response = await fetch('/v1/dashboard/timeline-completion-rates?startDate=2024-01-01&endDate=2024-01-31');
const data = await response.json();

// Display metrics
document.getElementById('completion-rate').textContent = `${data.overallStats.completionRate.toFixed(1)}%`;
document.getElementById('on-time-rate').textContent = `${data.overallStats.onTimeRate.toFixed(1)}%`;
document.getElementById('total-tasks').textContent = data.overallStats.totalPeriods;
```

## Best Practices

1. **Date Range Selection**: Use reasonable date ranges (e.g., 1-3 months) to avoid performance issues
2. **Branch Filtering**: Always specify branchId when possible for better performance
3. **Caching**: Consider caching results for frequently accessed data
4. **Pagination**: For large datasets, consider implementing pagination
5. **Error Handling**: Always handle API errors gracefully in frontend applications

## Performance Considerations

- Large date ranges may impact query performance
- Complex aggregations are optimized for MongoDB
- Consider using indexes on frequently queried fields
- Branch filtering significantly improves query performance 