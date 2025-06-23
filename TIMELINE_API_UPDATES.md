# Timeline API Updates

## Overview
The timeline API has been updated to support multiple clients, new frequency options, and dynamic frequency configuration based on the frequency type.

## Key Changes

### 1. Multiple Clients Support
- Changed from single `client` field to `clients` array
- Admin can now select one or multiple clients for a timeline
- All clients are validated before creation/update

### 2. New Frequency Options
Updated frequency enum to include:
- `Hourly`
- `Daily` 
- `Weekly`
- `Monthly`
- `Quarterly`
- `Yearly`

### 3. Dynamic Frequency Configuration
Replaced `frequencyCount` with `frequencyConfig` object that changes based on frequency type:

#### Hourly
```json
{
  "frequency": "Hourly",
  "frequencyConfig": {
    "hourlyInterval": 3  // Every 3 hours (1-24)
  }
}
```

#### Daily
```json
{
  "frequency": "Daily",
  "frequencyConfig": {
    "dailyTime": "09:30 AM"  // Format: "HH:MM AM/PM"
  }
}
```

#### Weekly
```json
{
  "frequency": "Weekly",
  "frequencyConfig": {
    "weeklyDays": ["Monday", "Wednesday", "Friday"],
    "weeklyTime": "02:15 PM"
  }
}
```

#### Monthly
```json
{
  "frequency": "Monthly",
  "frequencyConfig": {
    "monthlyDay": 15,  // Day of month (1-31)
    "monthlyTime": "10:00 AM"
  }
}
```

#### Quarterly
```json
{
  "frequency": "Quarterly",
  "frequencyConfig": {
    "quarterlyTime": "03:00 PM"
  }
}
```

#### Yearly
```json
{
  "frequency": "Yearly",
  "frequencyConfig": {
    "yearlyMonth": "December",
    "yearlyDate": 25,  // Day of month (1-31)
    "yearlyTime": "12:00 PM"
  }
}
```

### 4. End Date Field
Added optional `endDate` field to specify when the timeline should end.

## API Examples

### Create Timeline
```javascript
POST /v1/timelines
{
  "activity": "507f1f77bcf86cd799439011",
  "clients": ["507f1f77bcf86cd799439012", "507f1f77bcf86cd799439013"],
  "status": "pending",
  "frequency": "Weekly",
  "frequencyConfig": {
    "weeklyDays": ["Monday", "Wednesday"],
    "weeklyTime": "09:00 AM"
  },
  "udin": "UDIN123456",
  "turnover": 50000,
  "assignedMember": "507f1f77bcf86cd799439014",
  "startDate": "2024-12-31T23:59:59.000Z",
  "endDate": "2025-12-31T23:59:59.000Z"
}
```

### Update Timeline
```javascript
PATCH /v1/timelines/:timelineId
{
  "clients": ["507f1f77bcf86cd799439012"],
  "frequency": "Daily",
  "frequencyConfig": {
    "dailyTime": "10:30 AM"
  },
  "status": "ongoing"
}
```

### Query Timelines
```javascript
GET /v1/timelines?client=507f1f77bcf86cd799439012&frequency=Weekly&status=pending
```

## Validation Rules

### Frequency Configuration Validation
- **Hourly**: `hourlyInterval` must be 1-24
- **Daily**: `dailyTime` must match format "HH:MM AM/PM"
- **Weekly**: `weeklyDays` array required, `weeklyTime` required
- **Monthly**: `monthlyDay` 1-31, `monthlyTime` required
- **Quarterly**: `quarterlyTime` required
- **Yearly**: `yearlyMonth`, `yearlyDate` 1-31, `yearlyTime` required

### Client Validation
- At least one client required
- All client IDs must be valid ObjectIds
- All clients must exist in the database

### Time Format
All time fields use 12-hour format with AM/PM:
- Valid: "09:30 AM", "02:15 PM", "12:00 PM"
- Invalid: "24:00", "13:30", "9:30"

## Migration Notes

### Database Migration
Existing timelines with single client will need to be migrated:
```javascript
// Convert single client to array
db.timelines.updateMany(
  { client: { $exists: true } },
  [{ $set: { clients: ["$client"] } }, { $unset: "client" }]
);
```

### Frontend Updates
- Update forms to support multiple client selection
- Implement dynamic frequency configuration UI based on frequency type
- Add end date field to timeline forms
- Update timeline display to show multiple clients

## Error Handling

### Validation Errors
- Invalid frequency configuration returns detailed error messages
- Missing required fields for specific frequency types
- Invalid time format validation
- Client validation errors

### Bulk Import
- Partial success handling for bulk operations
- Detailed error reporting for failed records
- Validation before bulk insertion

## Benefits

1. **Flexibility**: Support for multiple clients per timeline
2. **Precision**: Detailed frequency configuration for different types
3. **Scalability**: Better handling of complex scheduling requirements
4. **User Experience**: More intuitive frequency setup
5. **Data Integrity**: Comprehensive validation rules 