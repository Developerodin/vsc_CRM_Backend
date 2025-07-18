# Frequency Status API Reference

## Base URL
```
http://localhost:5000/v1
```

## Authentication
All endpoints require Bearer token authentication:
```
Authorization: Bearer <your-jwt-token>
```

---

## 1. Get Frequency Status

**GET** `/timelines/:timelineId/frequency-status`

### Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timelineId` | String | ✅ | Timeline ID |

### Response
```json
{
  "timelineId": "507f1f77bcf86cd799439011",
  "frequency": "Yearly",
  "overallStatus": "pending",
  "frequencyStatus": [
    {
      "period": "2024",
      "status": "completed",
      "completedAt": "2024-12-31T23:59:59.999Z",
      "notes": "Successfully completed"
    }
  ]
}
```

---

## 2. Update Frequency Status

**PATCH** `/timelines/:timelineId/frequency-status/:period`

### Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timelineId` | String | ✅ | Timeline ID |
| `period` | String | ✅ | Period identifier (e.g., "2024-01", "2024-W03") |

### Request Body
```json
{
  "status": "completed",
  "notes": "Task completed successfully"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | String | ✅ | Status: "pending", "completed", "delayed", "ongoing" |
| `notes` | String | ❌ | Optional notes |

### Response
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "status": "completed",
  "frequencyStatus": [...],
  // ... other timeline fields
}
```

---

## 3. Initialize Frequency Status

**POST** `/timelines/:timelineId/frequency-status`

### Parameters
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `timelineId` | String | ✅ | Timeline ID |

### Request Body
```json
{}
```
*No body required*

### Response
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "frequencyStatus": [...],
  // ... other timeline fields
}
```

---

## Period Format Reference

| Frequency | Period Format | Example |
|-----------|---------------|---------|
| Hourly | `YYYY-MM-DD-HH` | `2024-01-15-14` |
| Daily | `YYYY-MM-DD` | `2024-01-15` |
| Weekly | `YYYY-WweekNumber` | `2024-W03` |
| Monthly | `YYYY-MM` | `2024-01` |
| Quarterly | `YYYY-QquarterNumber` | `2024-Q1` |
| Yearly | `YYYY` | `2024` |

---

## Status Values

| Status | Description |
|--------|-------------|
| `pending` | Not started yet |
| `ongoing` | Currently in progress |
| `completed` | Finished successfully |
| `delayed` | Behind schedule |

---

## Error Responses

### 400 Bad Request
```json
{
  "code": 400,
  "message": "Invalid frequency status data. Please check the period and status values."
}
```

### 404 Not Found
```json
{
  "code": 404,
  "message": "Frequency period '2024-01' not found for this timeline"
}
```

### 403 Forbidden
```json
{
  "code": 403,
  "message": "Access denied to this branch"
}
```

---

## Frontend Usage Examples

### JavaScript/React
```javascript
// Get frequency status
const getFrequencyStatus = async (timelineId) => {
  const response = await fetch(`/v1/timelines/${timelineId}/frequency-status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Update frequency status
const updateFrequencyStatus = async (timelineId, period, statusData) => {
  const response = await fetch(`/v1/timelines/${timelineId}/frequency-status/${period}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(statusData)
  });
  return response.json();
};

// Initialize frequency status
const initializeFrequencyStatus = async (timelineId) => {
  const response = await fetch(`/v1/timelines/${timelineId}/frequency-status`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};
```

### cURL Examples
```bash
# Get frequency status
curl -X GET "http://localhost:5000/v1/timelines/507f1f77bcf86cd799439011/frequency-status" \
  -H "Authorization: Bearer your-token"

# Update frequency status
curl -X PATCH "http://localhost:5000/v1/timelines/507f1f77bcf86cd799439011/frequency-status/2024-01" \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "notes": "Done!"}'

# Initialize frequency status
curl -X POST "http://localhost:5000/v1/timelines/507f1f77bcf86cd799439011/frequency-status" \
  -H "Authorization: Bearer your-token"
```

---

## Quick Reference

| Action | Method | Endpoint | Required Fields |
|--------|--------|----------|-----------------|
| Get Status | GET | `/timelines/:id/frequency-status` | `timelineId` |
| Update Status | PATCH | `/timelines/:id/frequency-status/:period` | `timelineId`, `period`, `status` |
| Initialize | POST | `/timelines/:id/frequency-status` | `timelineId` | 