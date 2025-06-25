# Timeline Date Filtering API

The timeline API supports advanced date filtering capabilities to help you find timelines based on their date fields.

## Available Filters

### 1. Today Filter
Filter timelines that are active today or were created today.

**Query Parameter:** `today=true`

**Example:**
```
GET /v1/timelines?today=true
```

This will return all timelines where:
- The start date is today, OR
- The end date is today, OR  
- The timeline spans across today (start date is before today and end date is after today), OR
- The timeline was created today (fallback for timelines without startDate/endDate)

### 2. Date Range Filter
Filter timelines within a specific date range.

**Query Parameters:** 
- `startDate` - Start of the date range (ISO date format: YYYY-MM-DD)
- `endDate` - End of the date range (ISO date format: YYYY-MM-DD)

**Examples:**

Filter timelines from a specific start date:
```
GET /v1/timelines?startDate=2024-01-01
```

Filter timelines up to a specific end date:
```
GET /v1/timelines?endDate=2024-12-31
```

Filter timelines within a date range:
```
GET /v1/timelines?startDate=2024-01-01&endDate=2024-12-31
```

### 3. Combined Filters
You can combine date filters with other existing filters:

**Example:**
```
GET /v1/timelines?today=true&status=pending&frequency=Daily
```

This will return timelines that are active today, have pending status, and are configured for daily frequency.

## Date Filter Logic

The date filtering uses MongoDB's `$or` operator to match timelines that meet any of these conditions:

1. **startDate falls within the filter range**
2. **endDate falls within the filter range**  
3. **Timeline spans across the filter range** (startDate is before the range and endDate is after the range)
4. **Timeline was created within the filter range** (fallback for timelines without startDate/endDate)

## Important Notes

- **startDate and endDate are optional fields** in the timeline model
- If a timeline doesn't have startDate or endDate set, the filter will fall back to using the `createdAt` field
- This ensures that timelines created on a specific date will be found even if they don't have explicit start/end dates
- The `createdAt` field is automatically set by MongoDB when a document is first inserted

## Date Format

All dates should be provided in ISO format: `YYYY-MM-DD`

**Examples:**
- `2024-01-15` - January 15, 2024
- `2024-12-31` - December 31, 2024

## Response Format

The API returns the same paginated response format as before, but filtered according to the date criteria:

```json
{
  "results": [
    {
      "_id": "timeline_id",
      "activity": {
        "_id": "activity_id",
        "name": "Activity Name"
      },
      "client": {
        "_id": "client_id", 
        "name": "Client Name",
        "email": "client@example.com"
      },
      "status": "pending",
      "frequency": "Daily",
      "startDate": "2024-01-15T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.999Z",
      "assignedMember": {
        "_id": "member_id",
        "name": "Member Name",
        "email": "member@example.com"
      },
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 5,
  "totalResults": 50
}
```

## Error Handling

- Invalid date formats will result in a 400 Bad Request error
- Invalid filter values (e.g., `today=invalid`) will result in a 400 Bad Request error
- The API gracefully handles empty or missing date parameters

## Performance Notes

- Date filtering is optimized using MongoDB indexes
- The `$or` operator ensures comprehensive date range matching
- All existing filters (status, frequency, activity, etc.) continue to work alongside date filters 