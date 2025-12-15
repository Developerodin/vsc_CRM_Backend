# Group Analytics API Documentation

## Overview
Two analytics APIs for groups that provide comprehensive insights into group performance, client statistics, tasks, and timelines.

---

## 1. Get All Groups Analytics

### Endpoint
```
GET /v1/groups/analytics
```

### Authentication
Requires `getGroups` permission

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | string | No | Filter by group name (case-insensitive) |
| `branch` | string (ObjectId) | No | Filter by branch ID |
| `search` | string | No | Search groups by name |

### Example Request
```bash
# Get analytics for all groups
GET /v1/groups/analytics

# Get analytics filtered by branch
GET /v1/groups/analytics?branch=685140f7a5039eb69705aed6

# Search groups by name
GET /v1/groups/analytics?search=Enterprise
```

### Example Response
```json
{
  "totalGroups": 3,
  "totalClients": 15,
  "groups": [
    {
      "groupId": "675a1b2c3d4e5f6g7h8i9j0k",
      "groupName": "Enterprise Clients",
      "branch": {
        "_id": "685140f7a5039eb69705aed6",
        "name": "Mumbai Branch"
      },
      "numberOfClients": 8,
      "taskStatus": {
        "total": 45,
        "pending": 12,
        "ongoing": 8,
        "completed": 20,
        "on_hold": 2,
        "cancelled": 1,
        "delayed": 2
      },
      "timelineStatus": {
        "total": 120,
        "pending": 35,
        "ongoing": 15,
        "completed": 60,
        "delayed": 10
      }
    },
    {
      "groupId": "675a1b2c3d4e5f6g7h8i9j0l",
      "groupName": "SME Clients",
      "branch": {
        "_id": "685140f7a5039eb69705aed6",
        "name": "Mumbai Branch"
      },
      "numberOfClients": 5,
      "taskStatus": {
        "total": 28,
        "pending": 8,
        "ongoing": 5,
        "completed": 12,
        "on_hold": 1,
        "cancelled": 0,
        "delayed": 2
      },
      "timelineStatus": {
        "total": 75,
        "pending": 20,
        "ongoing": 10,
        "completed": 40,
        "delayed": 5
      }
    },
    {
      "groupId": "675a1b2c3d4e5f6g7h8i9j0m",
      "groupName": "Startup Clients",
      "branch": {
        "_id": "685140f7a5039eb69705aed6",
        "name": "Mumbai Branch"
      },
      "numberOfClients": 2,
      "taskStatus": {
        "total": 0,
        "pending": 0,
        "ongoing": 0,
        "completed": 0,
        "on_hold": 0,
        "cancelled": 0,
        "delayed": 0
      },
      "timelineStatus": {
        "total": 0,
        "pending": 0,
        "ongoing": 0,
        "completed": 0,
        "delayed": 0
      }
    }
  ],
  "summary": {
    "taskStatus": {
      "total": 73,
      "pending": 20,
      "ongoing": 13,
      "completed": 32,
      "on_hold": 3,
      "cancelled": 1,
      "delayed": 4
    },
    "timelineStatus": {
      "total": 195,
      "pending": 55,
      "ongoing": 25,
      "completed": 100,
      "delayed": 15
    }
  }
}
```

### Response Fields
- **totalGroups**: Total number of groups matching the filter
- **totalClients**: Total number of unique clients across all groups
- **groups**: Array of group analytics objects
  - **groupId**: Group ID
  - **groupName**: Group name
  - **branch**: Branch information
  - **numberOfClients**: Number of clients in this group
  - **taskStatus**: Task statistics breakdown
  - **timelineStatus**: Timeline statistics breakdown
- **summary**: Aggregated statistics across all groups

---

## 2. Get Single Group Analytics

### Endpoint
```
GET /v1/groups/:groupId/analytics
```

### Authentication
Requires `getGroups` permission

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `groupId` | string (ObjectId) | Yes | Group ID |

### Example Request
```bash
# Get detailed analytics for a specific group
GET /v1/groups/675a1b2c3d4e5f6g7h8i9j0k/analytics
```

### Example Response
```json
{
  "group": {
    "_id": "675a1b2c3d4e5f6g7h8i9j0k",
    "name": "Enterprise Clients",
    "branch": {
      "_id": "685140f7a5039eb69705aed6",
      "name": "Mumbai Branch"
    },
    "numberOfClients": 8
  },
  "clients": [
    {
      "_id": "6932a42907fc564f9cc00fcd",
      "name": "ABC Corporation",
      "email": "contact@abccorp.com",
      "phone": "+919876543210",
      "branch": "685140f7a5039eb69705aed6",
      "taskCount": 12,
      "timelineCount": 25
    },
    {
      "_id": "6932a42907fc564f9cc00fce",
      "name": "XYZ Industries",
      "email": "info@xyzind.com",
      "phone": "+919876543211",
      "branch": "685140f7a5039eb69705aed6",
      "taskCount": 8,
      "timelineCount": 18
    },
    {
      "_id": "6932a42907fc564f9cc00fcf",
      "name": "Tech Solutions Ltd",
      "email": "hello@techsol.com",
      "phone": "+919876543212",
      "branch": "685140f7a5039eb69705aed6",
      "taskCount": 15,
      "timelineCount": 30
    }
  ],
  "taskAnalytics": {
    "total": 45,
    "statusBreakdown": {
      "pending": 12,
      "ongoing": 8,
      "completed": 20,
      "on_hold": 2,
      "cancelled": 1,
      "delayed": 2
    },
    "priorityBreakdown": {
      "low": 5,
      "medium": 20,
      "high": 15,
      "urgent": 4,
      "critical": 1
    }
  },
  "timelineAnalytics": {
    "total": 120,
    "statusBreakdown": {
      "pending": 35,
      "ongoing": 15,
      "completed": 60,
      "delayed": 10
    },
    "frequencyBreakdown": {
      "None": 5,
      "OneTime": 10,
      "Hourly": 0,
      "Daily": 15,
      "Weekly": 20,
      "Monthly": 35,
      "Quarterly": 20,
      "Yearly": 15
    }
  }
}
```

### Response Fields
- **group**: Group information
  - **_id**: Group ID
  - **name**: Group name
  - **branch**: Branch information
  - **numberOfClients**: Number of clients in the group
- **clients**: Array of clients in the group with their statistics
  - **_id**: Client ID
  - **name**: Client name
  - **email**: Client email
  - **phone**: Client phone
  - **branch**: Branch ID
  - **taskCount**: Number of tasks for this client
  - **timelineCount**: Number of timelines for this client
- **taskAnalytics**: Comprehensive task statistics
  - **total**: Total number of tasks
  - **statusBreakdown**: Tasks grouped by status
  - **priorityBreakdown**: Tasks grouped by priority
- **timelineAnalytics**: Comprehensive timeline statistics
  - **total**: Total number of timelines
  - **statusBreakdown**: Timelines grouped by status
  - **frequencyBreakdown**: Timelines grouped by frequency type

---

## Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Invalid group ID format"
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
  "message": "Group not found"
}
```

### 500 Internal Server Error
```json
{
  "code": 500,
  "message": "Error fetching group analytics"
}
```

---

## Notes

1. **Branch Access Control**: Both APIs respect user branch access permissions. Users can only see analytics for groups in branches they have access to.

2. **Empty Groups**: Groups with no clients will return zero counts for all statistics.

3. **Performance**: The APIs use efficient MongoDB aggregation pipelines for optimal performance.

4. **Task Relationship**: Tasks are linked to timelines, and timelines are linked to clients. The analytics count tasks that have associated timelines with clients in the group.

5. **Timeline Relationship**: Timelines are directly linked to clients, so all timelines for clients in a group are included in the analytics.

---

## Usage Examples

### cURL Examples

```bash
# Get all groups analytics
curl -X GET "http://localhost:4000/v1/groups/analytics" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get analytics for a specific group
curl -X GET "http://localhost:4000/v1/groups/675a1b2c3d4e5f6g7h8i9j0k/analytics" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Filter by branch
curl -X GET "http://localhost:4000/v1/groups/analytics?branch=685140f7a5039eb69705aed6" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### JavaScript/Fetch Examples

```javascript
// Get all groups analytics
const response = await fetch('http://localhost:4000/v1/groups/analytics', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const data = await response.json();
console.log(data);

// Get specific group analytics
const groupId = '675a1b2c3d4e5f6g7h8i9j0k';
const groupResponse = await fetch(`http://localhost:4000/v1/groups/${groupId}/analytics`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
const groupData = await groupResponse.json();
console.log(groupData);
```

