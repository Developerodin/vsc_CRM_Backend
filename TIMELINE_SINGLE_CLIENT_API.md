# Timeline Single Client API Documentation

## Overview

The Timeline API has been updated to handle both single client and multiple clients in the same endpoint. When you provide multiple clients, the system automatically creates separate timeline entries for each client while maintaining the same activity, status, frequency, and other properties.

## API Endpoint

### Create Timeline(s)
```http
POST /v1/timelines
```

## Request Body Structure

The `client` field can now accept either:
1. **Single client**: `"client": "clientId"` (string)
2. **Multiple clients**: `"client": ["clientId1", "clientId2", "clientId3"]` (array)

## Examples

### Example 1: Single Client (Creates 1 entry)
```json
{
  "activity": "684ff05d7478a6a40398ec43",
  "client": "6850fce71edeb64c14abc350",
  "status": "pending",
  "frequency": "Weekly",
  "frequencyConfig": {
    "weeklyDays": ["Monday", "Wednesday", "Friday"],
    "weeklyTime": "02:15 PM"
  },
  "udin": "UDIN123456",
  "turnover": 50000,
  "assignedMember": "68514be61edeb64c14abc949",
  "startDate": "2024-12-31T23:59:59.000Z"
}
```

**Response:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "activity": "684ff05d7478a6a40398ec43",
  "client": "6850fce71edeb64c14abc350",
  "status": "pending",
  "frequency": "Weekly",
  "frequencyConfig": {
    "weeklyDays": ["Monday", "Wednesday", "Friday"],
    "weeklyTime": "02:15 PM"
  },
  "udin": "UDIN123456",
  "turnover": 50000,
  "assignedMember": "68514be61edeb64c14abc949",
  "startDate": "2024-12-31T23:59:59.000Z",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Example 2: Multiple Clients (Creates 2 separate entries)
```json
{
  "activity": "684ff05d7478a6a40398ec43",
  "client": ["6850fce71edeb64c14abc350", "685100191edeb64c14abc414"],
  "status": "pending",
  "frequency": "Weekly",
  "frequencyConfig": {
    "weeklyDays": ["Monday", "Wednesday", "Friday"],
    "weeklyTime": "02:15 PM"
  },
  "udin": "UDIN123456",
  "turnover": 50000,
  "assignedMember": "68514be61edeb64c14abc949",
  "startDate": "2024-12-31T23:59:59.000Z"
}
```

**Response:**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "activity": "684ff05d7478a6a40398ec43",
    "client": "6850fce71edeb64c14abc350",
    "status": "pending",
    "frequency": "Weekly",
    "frequencyConfig": {
      "weeklyDays": ["Monday", "Wednesday", "Friday"],
      "weeklyTime": "02:15 PM"
    },
    "udin": "UDIN123456",
    "turnover": 50000,
    "assignedMember": "68514be61edeb64c14abc949",
    "startDate": "2024-12-31T23:59:59.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "_id": "507f1f77bcf86cd799439012",
    "activity": "684ff05d7478a6a40398ec43",
    "client": "685100191edeb64c14abc414",
    "status": "pending",
    "frequency": "Weekly",
    "frequencyConfig": {
      "weeklyDays": ["Monday", "Wednesday", "Friday"],
      "weeklyTime": "02:15 PM"
    },
    "udin": "UDIN123456",
    "turnover": 50000,
    "assignedMember": "68514be61edeb64c14abc949",
    "startDate": "2024-12-31T23:59:59.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

## Validation Rules

### Required Fields
- `activity`: Valid ObjectId reference to Activity
- `client`: Either a string (single client) or array of strings (multiple clients)
- `status`: One of ['pending', 'completed', 'delayed', 'ongoing']
- `frequency`: One of ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly']
- `frequencyConfig`: Object with configuration based on frequency type
- `assignedMember`: Valid ObjectId reference to TeamMember

### Optional Fields
- `udin`: String (trimmed)
- `turnover`: Number
- `startDate`: Date
- `endDate`: Date

## Response Format

- **Single client**: Returns a single timeline object
- **Multiple clients**: Returns an array of timeline objects

## Error Handling

### Validation Errors
```json
{
  "code": 400,
  "message": "Invalid client: 507f1f77bcf86cd799439099"
}
```

### Missing Required Fields
```json
{
  "code": 400,
  "message": "\"client\" is required"
}
```

## Frontend Integration

### JavaScript/TypeScript Example
```javascript
// Create timeline with single client
const createSingleTimeline = async (timelineData) => {
  const response = await fetch('/v1/timelines', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      activity: 'activityId',
      client: 'clientId', // Single client
      status: 'pending',
      frequency: 'Daily',
      frequencyConfig: { dailyTime: '09:00 AM' },
      assignedMember: 'memberId'
    })
  });

  const timeline = await response.json();
  console.log('Created timeline:', timeline);
  return timeline;
};

// Create timeline with multiple clients
const createMultipleTimelines = async (timelineData) => {
  const response = await fetch('/v1/timelines', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      activity: 'activityId',
      client: ['clientId1', 'clientId2', 'clientId3'], // Multiple clients
      status: 'pending',
      frequency: 'Daily',
      frequencyConfig: { dailyTime: '09:00 AM' },
      assignedMember: 'memberId'
    })
  });

  const timelines = await response.json();
  console.log(`Created ${timelines.length} timelines:`, timelines);
  return timelines;
};

// Handle response dynamically
const createTimeline = async (timelineData) => {
  const response = await fetch('/v1/timelines', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(timelineData)
  });

  const result = await response.json();
  
  if (Array.isArray(result)) {
    console.log(`Created ${result.length} timelines for multiple clients`);
  } else {
    console.log('Created single timeline');
  }
  
  return result;
};
```

### React Example
```jsx
import React, { useState } from 'react';

const TimelineForm = () => {
  const [formData, setFormData] = useState({
    activity: '',
    client: '',
    status: 'pending',
    frequency: 'Daily',
    frequencyConfig: { dailyTime: '09:00 AM' },
    assignedMember: ''
  });

  const [selectedClients, setSelectedClients] = useState([]);
  const [isMultipleClients, setIsMultipleClients] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const timelineData = {
      ...formData,
      client: isMultipleClients ? selectedClients : formData.client
    };

    try {
      const response = await fetch('/v1/timelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(timelineData)
      });

      const result = await response.json();
      
      if (Array.isArray(result)) {
        alert(`Successfully created ${result.length} timelines!`);
      } else {
        alert('Successfully created timeline!');
      }
    } catch (error) {
      console.error('Error creating timeline:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={isMultipleClients}
            onChange={(e) => setIsMultipleClients(e.target.checked)}
          />
          Multiple Clients
        </label>
      </div>
      
      {isMultipleClients ? (
        <div>
          <label>Select Clients:</label>
          {/* Client selection component */}
        </div>
      ) : (
        <div>
          <label>Client:</label>
          <input
            type="text"
            value={formData.client}
            onChange={(e) => setFormData({...formData, client: e.target.value})}
          />
        </div>
      )}
      
      <button type="submit">Create Timeline</button>
    </form>
  );
};
```

## Performance Considerations

1. **Single Client**: Uses `Timeline.create()` for optimal performance
2. **Multiple Clients**: Uses `Timeline.insertMany()` for bulk creation
3. **Validation**: Validates all clients before creation to ensure data integrity
4. **Populate**: Automatically populates related data (activity, client, assignedMember)

## Migration Notes

- Existing single client requests will continue to work without changes
- New multiple client functionality is backward compatible
- Response format changes based on input (single object vs array)
- All existing validation and error handling remains the same 