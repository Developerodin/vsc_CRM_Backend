# Bulk Timeline Creation API

This endpoint allows you to create timelines for multiple clients at once by selecting an activity and optionally a subactivity.

## Endpoint

```
POST /v1/activity/bulk-create-timelines
```

## Features

- Create timelines for 1 to 1000 clients simultaneously
- Select an activity and optional subactivity
- Automatically creates timeline entries for all selected clients
- Supports all timeline fields (status, dueDate, frequency, etc.)
- Returns detailed results including success/failure counts

## Request Body

```json
{
  "clientIds": ["client_id_1", "client_id_2", "client_id_3", ...],
  "activityId": "activity_id",
  "subactivityId": "subactivity_id",  // Optional - dueDate is auto-picked from subactivity if provided
  "status": "pending",  // pending | completed | delayed | ongoing
  "dueDate": "2024-12-31T00:00:00.000Z",  // Optional - auto-picked from subactivity if not provided
  "startDate": "2024-01-01T00:00:00.000Z",  // Optional
  "endDate": "2024-12-31T00:00:00.000Z",  // Optional
  "frequency": "OneTime",  // None | OneTime | Hourly | Daily | Weekly | Monthly | Quarterly | Yearly
  "frequencyConfig": {  // Optional, based on frequency
    "dailyTime": "09:00 AM",
    "weeklyDays": ["Monday", "Wednesday", "Friday"],
    "monthlyDay": 15
  },
  "timelineType": "oneTime",  // oneTime | recurring
  "period": "April-2024",  // Optional
  "financialYear": "2024-2025",  // Optional
  "referenceNumber": "REF-001",  // Optional
  "fields": [  // Optional custom fields
    {
      "fileName": "Document Name",
      "fieldType": "text",
      "fieldValue": "Some value"
    }
  ],
  "metadata": {},  // Optional
  "state": "California"  // Optional
}
```

## Required Fields

- `clientIds`: Array of client IDs (minimum 1, maximum 1000)
- `activityId`: ID of the activity

## Auto-Filled Fields

- `branch`: Automatically picked from each client's branch (no need to provide)
- `dueDate`: Automatically picked from subactivity's dueDate (if subactivityId is provided and dueDate is not explicitly set)

## Optional Fields

- `subactivityId`: ID of the subactivity (if selecting a specific subactivity)
- `status`: Timeline status (default: "pending")
- `dueDate`: Due date for the timeline
- `startDate`: Start date
- `endDate`: End date
- `frequency`: How often the timeline recurs (default: "OneTime")
- `frequencyConfig`: Configuration for recurring timelines
- `timelineType`: Type of timeline (default: "oneTime")
- `period`: Period identifier (e.g., "April-2024")
- `financialYear`: Financial year (e.g., "2024-2025")
- `referenceNumber`: Reference number for tracking
- `fields`: Array of custom field values
- `metadata`: Additional metadata
- `state`: State for GST-related timelines

## Response

```json
{
  "created": 95,
  "failed": 5,
  "errors": [
    {
      "clientId": "invalid_client_id",
      "error": "Timeline creation failed"
    }
  ]
}
```

### Response Fields

- `created`: Number of timelines successfully created
- `failed`: Number of timelines that failed to create
- `errors`: Array of errors with client IDs and error messages

## Example Usage

### Example 1: Simple Timeline Creation for Multiple Clients

```javascript
// Create a simple timeline for 100 clients
// Branch is auto-picked from each client's branch
// DueDate is auto-picked from the subactivity
POST /v1/activity/bulk-create-timelines
{
  "clientIds": ["client1_id", "client2_id", ..., "client100_id"],
  "activityId": "64f5a1b2c3d4e5f6a7b8c9d0",
  "subactivityId": "64f5a1b2c3d4e5f6a7b8c9d1",
  "status": "pending"
}
```

### Example 2: Recurring Timeline with Frequency

```javascript
// Create a weekly recurring timeline
// Branch is auto-filled from each client's branch
POST /v1/activity/bulk-create-timelines
{
  "clientIds": ["client1_id", "client2_id"],
  "activityId": "64f5a1b2c3d4e5f6a7b8c9d0",
  "status": "pending",
  "frequency": "Weekly",
  "frequencyConfig": {
    "weeklyDays": ["Monday", "Wednesday", "Friday"],
    "weeklyTime": "09:00 AM"
  },
  "timelineType": "recurring"
}
```

### Example 3: Timeline with Custom Fields

```javascript
// Create timeline with custom field values
// Branch is auto-filled from each client's branch
// DueDate is auto-picked from subactivity
POST /v1/activity/bulk-create-timelines
{
  "clientIds": ["client1_id", "client2_id"],
  "activityId": "64f5a1b2c3d4e5f6a7b8c9d0",
  "subactivityId": "64f5a1b2c3d4e5f6a7b8c9d1",
  "status": "pending",
  "fields": [
    {
      "fileName": "Tax Return Type",
      "fieldType": "select",
      "fieldValue": "Individual"
    },
    {
      "fileName": "Notes",
      "fieldType": "textarea",
      "fieldValue": "Important client"
    }
  ]
}
```

### Example 4: Override Subactivity DueDate

```javascript
// Override the subactivity's dueDate with a custom one
POST /v1/activity/bulk-create-timelines
{
  "clientIds": ["client1_id", "client2_id"],
  "activityId": "64f5a1b2c3d4e5f6a7b8c9d0",
  "subactivityId": "64f5a1b2c3d4e5f6a7b8c9d1",
  "status": "pending",
  "dueDate": "2025-01-15T00:00:00.000Z"  // This overrides subactivity's dueDate
}
```

## Error Handling

### Validation Errors

If validation fails, you'll receive a 400 Bad Request with details:

```json
{
  "code": 400,
  "message": "\"clientIds\" must contain at most 1000 items"
}
```

### Common Errors

- **400 Bad Request**: Invalid request body or validation error
- **404 Not Found**: Activity or subactivity not found
- **403 Forbidden**: No access to the specified branch

### Partial Success

The endpoint uses bulk operations with `ordered: false`, which means:
- If some timeline creations fail, others will still be created
- The response will indicate how many succeeded and which failed
- Failed timelines will be listed in the `errors` array

## Performance Notes

- The endpoint can handle up to 1000 clients in a single request
- Bulk insert operations are optimized for performance
- Failed insertions don't stop the entire operation
- Consider using smaller batches (100-200 clients) for better performance

## Use Cases

1. **Onboarding Multiple Clients**: When adding a new service, quickly assign it to all existing clients
2. **Recurring Tasks**: Set up recurring activities (like monthly GST filing) for multiple clients
3. **Seasonal Activities**: Assign year-end activities to all relevant clients at once
4. **Bulk Assignment**: After creating a new activity/subactivity, assign it to a specific group of clients

## Notes

- **Auto-Fill Features**:
  - `branch`: Automatically picked from each client's branch field (clients can belong to different branches)
  - `dueDate`: Automatically picked from the subactivity's dueDate if `subactivityId` is provided and `dueDate` is not explicitly set
  - If you provide an explicit `dueDate`, it will override the subactivity's dueDate
- If a `subactivityId` is provided, the subactivity data will be embedded in the timeline
- The endpoint validates that all client IDs exist before creating any timelines
- All clients must have a branch assigned, otherwise an error will be thrown
- Branch access is validated based on the user's role and permissions
- Team members can only create timelines for clients in their assigned branch
- The endpoint supports all timeline features including custom fields and frequency configurations
