# Team Members Table API Guide

## Overview

The Team Members Table API provides a comprehensive view of all team members in the system with detailed information including personal details, branch information, skills, tasks, timelines, and clients they work with. This API supports advanced filtering, searching, and pagination.

## Endpoint

```
GET /v1/analytics/team-members/table
```

## Authentication

This endpoint requires authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Query Parameters

### Pagination Parameters
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of results per page (default: 50, max: 10000)

### Sorting Parameters
- `sortBy` (optional): Sort field and direction in format `field:direction`
  - Examples: `name:asc`, `createdAt:desc`, `email:asc`
  - Default: `name:asc`

### Filter Parameters
- `name` (optional): Filter by team member name (case-insensitive)
- `email` (optional): Filter by team member email (case-insensitive)
- `phone` (optional): Filter by team member phone (case-insensitive)
- `city` (optional): Filter by team member city (case-insensitive)
- `state` (optional): Filter by team member state (case-insensitive)
- `country` (optional): Filter by team member country (case-insensitive)
- `branch` (optional): Filter by branch ID

### Search Parameter
- `search` (optional): Global search across multiple fields including:
  - name, email, phone, city, state, country

## Response Structure

```json
{
  "success": true,
  "message": "Team members table data retrieved successfully",
  "data": {
    "results": [
      {
        "_id": "team_member_id",
        "name": "Team Member Name",
        "email": "email@example.com",
        "phone": "+1234567890",
        "address": "Full Address",
        "city": "City Name",
        "state": "State Name",
        "country": "Country Name",
        "pinCode": "123456",
        "sortOrder": 1,
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-01-15T10:30:00.000Z",
        
        "branch": {
          "_id": "branch_id",
          "name": "Branch Name",
          "address": "Branch Address",
          "city": "Branch City",
          "state": "Branch State",
          "country": "Branch Country",
          "pinCode": "123456"
        },
        
        "skills": {
          "total": 3,
          "list": [
            {
              "_id": "skill_id",
              "name": "Skill Name",
              "description": "Skill Description",
              "category": "Skill Category"
            }
          ]
        },
        
        "tasks": {
          "total": 15,
          "byStatus": {
            "pending": 5,
            "ongoing": 3,
            "completed": 6,
            "on_hold": 1,
            "delayed": 0,
            "cancelled": 0
          },
          "byPriority": {
            "low": 2,
            "medium": 8,
            "high": 3,
            "urgent": 1,
            "critical": 1
          },
          "overdue": 2,
          "currentMonth": {
            "total": 8,
            "completed": 5
          },
          "status": {
            "pending": 5,
            "ongoing": 3,
            "completed": 6,
            "on_hold": 1,
            "delayed": 0,
            "cancelled": 0
          },
          "completionRate": 40.0
        },
        
        "timelines": {
          "total": 8,
          "summary": [
            {
              "_id": "timeline_id",
              "status": "ongoing",
              "startDate": "2025-01-01T00:00:00.000Z",
              "endDate": "2025-12-31T23:59:59.999Z",
              "frequency": "Monthly",
              "client": {
                "_id": "client_id",
                "name": "Client Name",
                "email": "client@example.com",
                "phone": "+1234567890",
                "company": "Company Name"
              },
              "activity": {
                "_id": "activity_id",
                "name": "Activity Name",
                "description": "Activity Description",
                "category": "Activity Category"
              }
            }
          ]
        },
        
        "clients": {
          "total": 5,
          "list": [
            {
              "_id": "client_id",
              "name": "Client Name",
              "email": "client@example.com",
              "phone": "+1234567890",
              "company": "Company Name",
              "address": "Client Address",
              "city": "Client City",
              "state": "Client State",
              "country": "Client Country",
              "businessType": "Private Limited",
              "entityType": "Corporation"
            }
          ]
        }
      }
    ],
    "page": 1,
    "limit": 50,
    "totalPages": 3,
    "totalResults": 125,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

## Data Structure Details

### Personal Details
- **Basic Info**: name, email, phone, address
- **Location**: city, state, country, pinCode
- **Metadata**: sortOrder, timestamps (createdAt, updatedAt)

### Branch Information
- **Details**: name, address, city, state, country, pinCode
- **Access Control**: Automatically filtered based on user's branch permissions

### Skills Information
- **Total Count**: Number of skills assigned
- **Skill Details**: name, description, category for each skill

### Task Information
- **Total Tasks**: Total number of tasks assigned
- **Status Breakdown**: Count of tasks by status (pending, ongoing, completed, on_hold, delayed, cancelled)
- **Priority Breakdown**: Count of tasks by priority (low, medium, high, urgent, critical)
- **Overdue Tasks**: Number of tasks past their end date
- **Current Month**: Tasks created and completed in current month
- **Completion Rate**: Percentage of completed tasks

### Timeline Information
- **Total Timelines**: Total number of timelines assigned
- **Timeline Details**: status, startDate, endDate, frequency
- **Client Information**: Associated client details
- **Activity Information**: Associated activity details

### Client Information
- **Total Clients**: Total number of clients worked with
- **Client Details**: name, email, phone, company, address, business information

## Security Features

### Branch Access Control
- Users can only see team members from branches they have access to
- Branch filtering is automatically applied based on user permissions
- Users with "all branches access" can see all team members
- Users with specific branch access are limited to those branches

### Data Filtering
- All sensitive information is properly filtered
- User permissions are validated on each request

## Usage Examples

### Basic Request
```bash
curl -X GET "http://localhost:3000/v1/analytics/team-members/table" \
  -H "Authorization: Bearer <your_token>"
```

### With Pagination
```bash
curl -X GET "http://localhost:3000/v1/analytics/team-members/table?page=1&limit=100" \
  -H "Authorization: Bearer <your_token>"
```

### With Sorting
```bash
curl -X GET "http://localhost:3000/v1/analytics/team-members/table?sortBy=name:asc" \
  -H "Authorization: Bearer <your_token>"
```

### With Search
```bash
curl -X GET "http://localhost:3000/v1/analytics/team-members/table?search=John" \
  -H "Authorization: Bearer <your_token>"
```

### With Filters
```bash
curl -X GET "http://localhost:3000/v1/analytics/team-members/table?city=Mumbai&state=Maharashtra" \
  -H "Authorization: Bearer <your_token>"
```

### With Branch Filter
```bash
curl -X GET "http://localhost:3000/v1/analytics/team-members/table?branch=507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <your_token>"
```

## Performance Considerations

- **Pagination**: Use appropriate limit values to avoid large data transfers
- **Filtering**: Apply specific filters to reduce data processing
- **Search**: Use search parameter for quick text-based filtering
- **Branch Access**: Branch filtering is automatically optimized

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "limit",
      "message": "\"limit\" must be less than or equal to 10000"
    }
  ]
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "message": "Please authenticate"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "message": "Access denied to this branch"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Failed to retrieve team members table data: Database connection error"
}
```

## Rate Limiting

This endpoint is subject to rate limiting. Please implement appropriate retry logic and exponential backoff for production applications.

## Versioning

This API is part of version 1 (`/v1/`). Future versions may introduce breaking changes.

## Support

For technical support or questions about this API, please refer to the main API documentation or contact the development team.
