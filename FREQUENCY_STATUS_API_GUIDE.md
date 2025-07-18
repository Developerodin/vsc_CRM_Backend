# Frequency-Wise Status Tracking API Guide

## Overview

The timeline system has been enhanced to support frequency-wise status tracking. Instead of having a single status for the entire timeline, users can now track completion status for individual frequency periods (e.g., monthly status for yearly frequency).

## Key Changes

### 1. Timeline Model Updates

#### New Schema Fields
- `frequencyStatus`: Array of frequency status objects
- Updated `status` field with automatic computation based on frequency status

#### Frequency Status Schema
```javascript
{
  period: String,        // Period identifier (e.g., "2024-01" for monthly)
  status: String,        // 'pending', 'completed', 'delayed', 'ongoing'
  completedAt: Date,     // Timestamp when completed
  notes: String          // Optional notes for the period
}
```

#### Period Format Examples
- **Hourly**: `"2024-01-15-14"` (YYYY-MM-DD-HH)
- **Daily**: `"2024-01-15"` (YYYY-MM-DD)
- **Weekly**: `"2024-W03"` (YYYY-WweekNumber)
- **Monthly**: `"2024-01"` (YYYY-MM)
- **Quarterly**: `"2024-Q1"` (YYYY-QquarterNumber)
- **Yearly**: `"2024"` (YYYY)

### 2. Automatic Status Computation

The overall timeline status is automatically computed based on frequency status:
- **Completed**: All frequency periods are completed
- **Delayed**: Any frequency period is delayed
- **Ongoing**: Any frequency period is ongoing
- **Pending**: All frequency periods are pending

## API Endpoints

### 1. Get Frequency Status
**GET** `/v1/timelines/:timelineId/frequency-status`

**Response:**
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
    },
    {
      "period": "2025",
      "status": "pending",
      "completedAt": null,
      "notes": ""
    }
  ]
}
```

### 2. Update Frequency Status
**PATCH** `/v1/timelines/:timelineId/frequency-status/:period`

**Request Body:**
```json
{
  "status": "completed",
  "notes": "Task completed successfully"
}
```

**Response:** Updated timeline object

### 3. Initialize/Regenerate Frequency Status
**POST** `/v1/timelines/:timelineId/frequency-status`

**Response:** Timeline with initialized frequency status

## Frontend Integration

### 1. API Routes

```javascript
// Get frequency status
const getFrequencyStatus = async (timelineId) => {
  const response = await fetch(`/v1/timelines/${timelineId}/frequency-status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
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
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};
```

### 2. Frontend Implementation Examples

#### Display Frequency Status
```javascript
const FrequencyStatusDisplay = ({ timelineId }) => {
  const [frequencyStatus, setFrequencyStatus] = useState(null);
  
  useEffect(() => {
    const loadFrequencyStatus = async () => {
      const data = await getFrequencyStatus(timelineId);
      setFrequencyStatus(data);
    };
    loadFrequencyStatus();
  }, [timelineId]);
  
  const handleStatusUpdate = async (period, newStatus, notes) => {
    await updateFrequencyStatus(timelineId, period, {
      status: newStatus,
      notes: notes
    });
    // Reload frequency status
    const data = await getFrequencyStatus(timelineId);
    setFrequencyStatus(data);
  };
  
  return (
    <div>
      <h3>Frequency Status</h3>
      <p>Overall Status: {frequencyStatus?.overallStatus}</p>
      <div>
        {frequencyStatus?.frequencyStatus.map((fs) => (
          <div key={fs.period}>
            <span>Period: {fs.period}</span>
            <span>Status: {fs.status}</span>
            <button onClick={() => handleStatusUpdate(fs.period, 'completed', '')}>
              Mark Complete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### Timeline Creation with Frequency Status
```javascript
const createTimelineWithFrequency = async (timelineData) => {
  // Create timeline
  const timeline = await createTimeline(timelineData);
  
  // Initialize frequency status if start/end dates provided
  if (timelineData.startDate && timelineData.endDate) {
    await initializeFrequencyStatus(timeline._id);
  }
  
  return timeline;
};
```

### 3. UI Components

#### Status Badge Component
```javascript
const StatusBadge = ({ status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'green';
      case 'delayed': return 'red';
      case 'ongoing': return 'blue';
      default: return 'gray';
    }
  };
  
  return (
    <span className={`badge badge-${getStatusColor(status)}`}>
      {status}
    </span>
  );
};
```

#### Frequency Status Table
```javascript
const FrequencyStatusTable = ({ frequencyStatus, onStatusUpdate }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Period</th>
          <th>Status</th>
          <th>Completed At</th>
          <th>Notes</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {frequencyStatus.map((fs) => (
          <tr key={fs.period}>
            <td>{fs.period}</td>
            <td><StatusBadge status={fs.status} /></td>
            <td>{fs.completedAt ? new Date(fs.completedAt).toLocaleDateString() : '-'}</td>
            <td>{fs.notes || '-'}</td>
            <td>
              <select 
                value={fs.status} 
                onChange={(e) => onStatusUpdate(fs.period, e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="delayed">Delayed</option>
              </select>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

## Migration Notes

### Existing Timelines
- Existing timelines will continue to work with the single status field
- To enable frequency-wise tracking, call the initialize endpoint
- Frequency status will be automatically generated based on start/end dates

### Data Migration
```javascript
// Migrate existing timeline to frequency status
const migrateTimeline = async (timelineId) => {
  const timeline = await getTimeline(timelineId);
  
  if (timeline.startDate && timeline.endDate) {
    await initializeFrequencyStatus(timelineId);
    console.log('Timeline migrated to frequency status tracking');
  } else {
    console.log('Timeline needs start/end dates for frequency status');
  }
};
```

### Fix Corrupted Data
If you encounter validation errors with frequency status, run the fix script:

```bash
npm run fix:frequency-status
```

This script will:
- Find timelines with corrupted frequency status data
- Clean and validate the frequency status arrays
- Remove invalid entries that don't have required fields
- Preserve valid frequency status entries

## Error Handling

### Common Error Responses
```json
{
  "code": 404,
  "message": "Frequency period '2024-01' not found for this timeline"
}
```

```json
{
  "code": 400,
  "message": "Start date and end date are required to initialize frequency status"
}
```

```json
{
  "code": 400,
  "message": "Invalid frequency status data. Please check the period and status values."
}
```

### Error Codes
- **400 Bad Request**: Invalid data or validation errors
- **404 Not Found**: Timeline or frequency period not found
- **403 Forbidden**: Access denied to timeline branch
- **500 Internal Server Error**: Server-side errors

## Best Practices

1. **Initialize Frequency Status**: Always initialize frequency status after creating timelines with start/end dates
2. **Period Validation**: Ensure period format matches the frequency type
3. **Status Updates**: Update individual periods rather than the overall status
4. **Notes**: Use notes field to provide context for status changes
5. **Real-time Updates**: Refresh frequency status after updates to show current state
6. **Error Handling**: Always handle API errors gracefully in frontend
7. **Data Validation**: Validate period format before sending API requests

## Testing

### API Testing Examples
```javascript
// Test frequency status update
const testFrequencyStatusUpdate = async () => {
  const timelineId = '507f1f77bcf86cd799439011';
  const period = '2024-01';
  
  try {
    // Update status
    await updateFrequencyStatus(timelineId, period, {
      status: 'completed',
      notes: 'Test completion'
    });
    
    // Verify update
    const status = await getFrequencyStatus(timelineId);
    const updatedPeriod = status.frequencyStatus.find(fs => fs.period === period);
    console.log('Updated period:', updatedPeriod);
  } catch (error) {
    console.error('Error updating frequency status:', error.message);
  }
};

// Test error handling
const testErrorHandling = async () => {
  try {
    await updateFrequencyStatus('invalid-id', 'invalid-period', {
      status: 'completed'
    });
  } catch (error) {
    if (error.code === 404) {
      console.log('Timeline or period not found');
    } else if (error.code === 400) {
      console.log('Invalid data provided');
    }
  }
};
```

This implementation provides granular control over timeline completion tracking while maintaining backward compatibility with existing timelines. 