# Timeline Analytics API Guide

This guide provides comprehensive documentation for the Timeline Analytics API endpoints. These APIs allow you to search, filter, and analyze timelines by client, activity, subactivity, business type, entity type, and more.

## Base URL

All endpoints are prefixed with `/v1/analytics/timelines`

## Authentication

All endpoints require authentication. Include the authentication token in the request headers:

```
Authorization: Bearer <your-token>
```

---

## Endpoints

### 1. Get All Timelines Table Data

Get paginated timeline data with comprehensive filtering options.

**Endpoint:** `GET /v1/analytics/timelines/table`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `client` | string (ObjectId) | No | Filter by specific client ID |
| `clientSearch` | string | No | Search clients by name, email, or phone (case-insensitive) |
| `businessType` | string | No | Filter by client business type (case-insensitive) |
| `entityType` | string | No | Filter by client entity type (case-insensitive) |
| `activity` | string (ObjectId) | No | Filter by specific activity ID |
| `activitySearch` | string | No | Search activities by name or description (case-insensitive) |
| `subactivity` | string (ObjectId) | No | Filter by specific subactivity ID |
| `subactivitySearch` | string | No | Search subactivities by name (case-insensitive) |
| `status` | string | No | Filter by timeline status: `pending`, `completed`, `delayed`, `ongoing` |
| `frequency` | string | No | Filter by frequency: `None`, `OneTime`, `Hourly`, `Daily`, `Weekly`, `Monthly`, `Quarterly`, `Yearly` |
| `timelineType` | string | No | Filter by timeline type: `oneTime`, `recurring` |
| `period` | string | No | Filter by period (e.g., "April-2024", "Q1-2024") |
| `financialYear` | string | No | Filter by financial year (e.g., "2024-2025") |
| `startDate` | string (ISO date) | No | Filter by start date (ISO format) |
| `endDate` | string (ISO date) | No | Filter by end date (ISO format, must be after startDate) |
| `branch` | string (ObjectId) | No | Filter by branch ID |
| `search` | string | No | Global search across client name, email, phone, activity name, subactivity name, period, financial year |
| `sortBy` | string | No | Sort field and order (e.g., `createdAt:desc`, `status:asc`) |
| `limit` | number | No | Number of results per page (1-10000, default: 50) |
| `page` | number | No | Page number (default: 1) |

**Example Request:**

```bash
GET /v1/analytics/timelines/table?clientSearch=John&businessType=Retail&status=pending&page=1&limit=20&sortBy=createdAt:desc
```

**Example Response:**

```json
{
  "success": true,
  "message": "Timelines table data retrieved successfully",
  "data": {
    "results": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "status": "pending",
        "period": "April-2024",
        "dueDate": "2024-04-30T00:00:00.000Z",
        "startDate": "2024-04-01T00:00:00.000Z",
        "endDate": "2024-04-30T23:59:59.999Z",
        "completedAt": null,
        "frequency": "Monthly",
        "frequencyConfig": {
          "monthlyDay": 1,
          "monthlyTime": "09:00 AM"
        },
        "timelineType": "recurring",
        "financialYear": "2024-2025",
        "fields": [],
        "metadata": {},
        "createdAt": "2024-03-15T10:30:00.000Z",
        "updatedAt": "2024-03-15T10:30:00.000Z",
        "subactivity": {
          "_id": "507f1f77bcf86cd799439012",
          "name": "Monthly GST Filing",
          "frequency": "Monthly",
          "frequencyConfig": {
            "monthlyDay": 1,
            "monthlyTime": "09:00 AM"
          },
          "fields": []
        },
        "client": {
          "_id": "507f1f77bcf86cd799439013",
          "name": "John Doe & Associates",
          "email": "john@example.com",
          "phone": "+1234567890",
          "address": "123 Main St",
          "district": "Downtown",
          "state": "California",
          "country": "USA",
          "businessType": "Retail",
          "entityType": "Partnership",
          "pan": "ABCDE1234F",
          "gstNumbers": []
        },
        "activity": {
          "_id": "507f1f77bcf86cd799439014",
          "name": "Tax Compliance",
          "sortOrder": 1
        },
        "branch": {
          "_id": "507f1f77bcf86cd799439015",
          "name": "Main Branch",
          "address": "456 Oak Ave",
          "city": "Los Angeles",
          "state": "California",
          "country": "USA"
        },
        "tasks": {
          "total": 5,
          "byStatus": {
            "pending": 2,
            "ongoing": 1,
            "completed": 2,
            "on_hold": 0,
            "delayed": 0,
            "cancelled": 0
          },
          "status": {
            "pending": 2,
            "ongoing": 1,
            "completed": 2,
            "on_hold": 0,
            "delayed": 0,
            "cancelled": 0
          }
        }
      }
    ],
    "page": 1,
    "limit": 20,
    "totalPages": 5,
    "totalResults": 100,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

**Response Fields:**

- `results`: Array of timeline objects
  - `_id`: Timeline ID
  - `status`: Timeline status
  - `period`: Period string (e.g., "April-2024")
  - `dueDate`, `startDate`, `endDate`, `completedAt`: Date fields
  - `frequency`: Frequency type
  - `frequencyConfig`: Frequency configuration object
  - `timelineType`: Type of timeline
  - `financialYear`: Financial year string
  - `fields`: Array of field objects
  - `metadata`: Additional metadata object
  - `subactivity`: Subactivity object (if exists)
  - `client`: Client information object
  - `activity`: Activity information object
  - `branch`: Branch information object
  - `tasks`: Task statistics object

---

### 2. Get Timeline Details Overview

Get detailed overview for a specific timeline including task analytics and performance metrics.

**Endpoint:** `GET /v1/analytics/timelines/:timelineId/overview`

**URL Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `timelineId` | string (ObjectId) | Yes | Timeline ID |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `teamMemberId` | string (ObjectId) | No | Filter tasks by assigned team member ID |
| `startDate` | string (ISO date) | No | Filter tasks by start date (ISO format) |
| `endDate` | string (ISO date) | No | Filter tasks by end date (ISO format, must be after startDate) |
| `priority` | string | No | Filter tasks by priority: `low`, `medium`, `high`, `urgent` |
| `status` | string | No | Filter tasks by status: `pending`, `ongoing`, `completed`, `on_hold`, `delayed`, `cancelled` |
| `limit` | number | No | Number of recent tasks to return (1-100, default: all) |
| `page` | number | No | Page number for pagination (default: 1) |

**Example Request:**

```bash
GET /v1/analytics/timelines/507f1f77bcf86cd799439011/overview?status=completed&limit=10&page=1
```

**Example Response:**

```json
{
  "success": true,
  "message": "Timeline details overview retrieved successfully",
  "data": {
    "timeline": {
      "_id": "507f1f77bcf86cd799439011",
      "status": "pending",
      "period": "April-2024",
      "dueDate": "2024-04-30T00:00:00.000Z",
      "startDate": "2024-04-01T00:00:00.000Z",
      "endDate": "2024-04-30T23:59:59.999Z",
      "completedAt": null,
      "frequency": "Monthly",
      "frequencyConfig": {
        "monthlyDay": 1,
        "monthlyTime": "09:00 AM"
      },
      "timelineType": "recurring",
      "financialYear": "2024-2025",
      "fields": [],
      "metadata": {},
      "createdAt": "2024-03-15T10:30:00.000Z",
      "updatedAt": "2024-03-15T10:30:00.000Z",
      "subactivity": {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Monthly GST Filing",
        "frequency": "Monthly",
        "frequencyConfig": {
          "monthlyDay": 1,
          "monthlyTime": "09:00 AM"
        },
        "fields": []
      },
      "client": {
        "_id": "507f1f77bcf86cd799439013",
        "name": "John Doe & Associates",
        "email": "john@example.com",
        "phone": "+1234567890",
        "address": "123 Main St",
        "district": "Downtown",
        "state": "California",
        "country": "USA",
        "businessType": "Retail",
        "entityType": "Partnership",
        "pan": "ABCDE1234F",
        "gstNumbers": []
      },
      "activity": {
        "_id": "507f1f77bcf86cd799439014",
        "name": "Tax Compliance",
        "sortOrder": 1
      },
      "branch": {
        "_id": "507f1f77bcf86cd799439015",
        "name": "Main Branch",
        "address": "456 Oak Ave",
        "city": "Los Angeles",
        "state": "California",
        "country": "USA",
        "pinCode": "90001"
      }
    },
    "performance": {
      "totalTasks": 10,
      "completedTasks": 7,
      "completionRate": 70.0,
      "currentMonthCompleted": 3,
      "ongoingTasks": 2,
      "pendingTasks": 1,
      "onHoldTasks": 0,
      "delayedTasks": 0
    },
    "currentMonth": {
      "start": "2024-04-01T00:00:00.000Z",
      "end": "2024-04-30T23:59:59.999Z",
      "completedTasks": 3,
      "totalTasks": 5
    },
    "tasks": {
      "byStatus": {
        "pending": [/* task objects */],
        "ongoing": [/* task objects */],
        "completed": [/* task objects */],
        "on_hold": [],
        "delayed": [],
        "cancelled": []
      },
      "byPriority": {
        "low": 2,
        "medium": 5,
        "high": 2,
        "urgent": 1
      },
      "byTeamMember": [
        {
          "teamMember": {
            "_id": "507f1f77bcf86cd799439016",
            "name": "Jane Smith",
            "email": "jane@example.com",
            "phone": "+1234567891"
          },
          "tasks": [/* task objects */],
          "totalTasks": 5,
          "completedTasks": 4,
          "completionRate": "80.0"
        }
      ],
      "recent": [
        {
          "id": "507f1f77bcf86cd799439017",
          "status": "completed",
          "priority": "high",
          "remarks": "Completed successfully",
          "startDate": "2024-04-15T00:00:00.000Z",
          "endDate": "2024-04-20T00:00:00.000Z",
          "createdAt": "2024-04-15T08:00:00.000Z",
          "teamMember": {
            "id": "507f1f77bcf86cd799439016",
            "name": "Jane Smith",
            "email": "jane@example.com"
          },
          "attachments": []
        }
      ],
      "monthlyDistribution": [
        {
          "month": "Nov 23",
          "total": 2,
          "completed": 2,
          "completionRate": "100.0"
        },
        {
          "month": "Dec 23",
          "total": 3,
          "completed": 2,
          "completionRate": "66.7"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 10,
        "totalTasks": 10,
        "totalPages": 1,
        "hasNextPage": false,
        "hasPrevPage": false
      }
    },
    "generatedAt": "2024-04-20T12:00:00.000Z"
  }
}
```

---

## Common Use Cases

### 1. Search Timelines by Client Name

```javascript
// Frontend example (JavaScript/React)
const searchTimelinesByClient = async (clientName) => {
  const response = await fetch(
    `/v1/analytics/timelines/table?clientSearch=${encodeURIComponent(clientName)}&page=1&limit=20`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  return data.data;
};
```

### 2. Filter by Business Type and Entity Type

```javascript
const filterByBusinessAndEntity = async (businessType, entityType) => {
  const params = new URLSearchParams({
    businessType,
    entityType,
    page: 1,
    limit: 20
  });
  
  const response = await fetch(
    `/v1/analytics/timelines/table?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  return data.data;
};
```

### 3. Filter by Activity and Subactivity

```javascript
const filterByActivitySubactivity = async (activityId, subactivityId) => {
  const params = new URLSearchParams({
    activity: activityId,
    subactivity: subactivityId,
    page: 1,
    limit: 20
  });
  
  const response = await fetch(
    `/v1/analytics/timelines/table?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  return data.data;
};
```

### 4. Get Timeline Details with Task Analytics

```javascript
const getTimelineDetails = async (timelineId, filters = {}) => {
  const params = new URLSearchParams({
    ...filters,
    page: filters.page || 1,
    limit: filters.limit || 10
  });
  
  const response = await fetch(
    `/v1/analytics/timelines/${timelineId}/overview?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  return data.data;
};
```

### 5. Advanced Search with Multiple Filters

```javascript
const advancedSearch = async (searchParams) => {
  const params = new URLSearchParams({
    clientSearch: searchParams.clientName || '',
    businessType: searchParams.businessType || '',
    entityType: searchParams.entityType || '',
    activitySearch: searchParams.activityName || '',
    subactivitySearch: searchParams.subactivityName || '',
    status: searchParams.status || '',
    frequency: searchParams.frequency || '',
    startDate: searchParams.startDate || '',
    endDate: searchParams.endDate || '',
    sortBy: searchParams.sortBy || 'createdAt:desc',
    page: searchParams.page || 1,
    limit: searchParams.limit || 20
  });
  
  const response = await fetch(
    `/v1/analytics/timelines/table?${params.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  const data = await response.json();
  return data.data;
};
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
  "success": false,
  "message": "Timeline ID is required"
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "message": "Please authenticate"
}
```

### 403 Forbidden

```json
{
  "success": false,
  "message": "Access denied to this branch"
}
```

### 404 Not Found

```json
{
  "success": false,
  "message": "Timeline not found"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to retrieve timelines table data"
}
```

---

## Notes

1. **Branch Access Control**: The API automatically filters results based on the authenticated user's branch access permissions. Users can only see timelines from branches they have access to.

2. **Pagination**: Default page size is 50. Maximum page size is 10,000. Use pagination for large datasets.

3. **Date Formats**: All dates should be in ISO 8601 format (e.g., `2024-04-20T00:00:00.000Z`).

4. **Search Behavior**: 
   - `clientSearch` searches across client name, email, and phone
   - `activitySearch` searches across activity name and description
   - `subactivitySearch` searches across subactivity name
   - `search` is a global search across all searchable fields

5. **Sorting**: Use format `field:order` where order is `asc` or `desc`. Default sort is `createdAt:desc`.

6. **Filtering**: Multiple filters can be combined. All filters are applied with AND logic.

---

## Integration Checklist

- [ ] Set up authentication token handling
- [ ] Implement timeline table component with filters
- [ ] Add client search functionality
- [ ] Add activity/subactivity filter dropdowns
- [ ] Add business type and entity type filters
- [ ] Implement pagination controls
- [ ] Add sorting functionality
- [ ] Create timeline detail view component
- [ ] Implement task filtering in detail view
- [ ] Add error handling for API responses
- [ ] Add loading states for async operations
- [ ] Test with various filter combinations
- [ ] Handle empty states gracefully

---

## Support

For issues or questions, please refer to the main API documentation or contact the development team.

