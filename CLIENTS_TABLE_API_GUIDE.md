# Clients Table API Guide

## Overview

The Clients Table API provides a comprehensive view of all clients in the system with detailed information including personal details, branch information, activities, team members, and task status. This API supports advanced filtering, searching, and pagination.

## Endpoint

```
GET /v1/analytics/clients/table
```

## Authentication

This endpoint requires authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Query Parameters

### Pagination Parameters
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of results per page (default: 50, max: 100)

### Sorting Parameters
- `sortBy` (optional): Sort field and direction in format `field:direction`
  - Examples: `name:asc`, `createdAt:desc`, `email:asc`
  - Default: `name:asc`

### Filter Parameters
- `name` (optional): Filter by client name (case-insensitive)
- `email` (optional): Filter by client email (case-insensitive)
- `phone` (optional): Filter by client phone (case-insensitive)
- `district` (optional): Filter by client district (case-insensitive)
- `state` (optional): Filter by client state (case-insensitive)
- `country` (optional): Filter by client country (case-insensitive)
- `fNo` (optional): Filter by client fNo (case-insensitive)
- `pan` (optional): Filter by client PAN (case-insensitive)
- `businessType` (optional): Filter by business type (case-insensitive)
- `gstNumber` (optional): Filter by GST number (case-insensitive)
- `tanNumber` (optional): Filter by TAN number (case-insensitive)
- `cinNumber` (optional): Filter by CIN number (case-insensitive)
- `udyamNumber` (optional): Filter by UDYAM number (case-insensitive)
- `iecCode` (optional): Filter by IEC code (case-insensitive)
- `entityType` (optional): Filter by entity type (case-insensitive)
- `branch` (optional): Filter by branch ID

### Search Parameter
- `search` (optional): Global search across multiple fields including:
  - Client name
  - Email
  - Phone
  - District
  - Business type
  - PAN
  - GST number
  - TAN number
  - CIN number
  - UDYAM number
  - IEC code

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "message": "Clients table data retrieved successfully",
  "data": {
    "results": [
      {
        "_id": "client_id",
        "name": "Client Name",
        "email": "client@example.com",
        "email2": "client2@example.com",
        "phone": "+1234567890",
        "address": "Client Address",
        "district": "District Name",
        "state": "State Name",
        "country": "Country Name",
        "fNo": "F123456",
        "pan": "ABCDE1234F",
        "dob": "1990-01-01T00:00:00.000Z",
        "businessType": "Private Limited",
        "gstNumber": "12ABCDE1234F1Z5",
        "tanNumber": "ABCD12345E",
        "cinNumber": "A12345BC6789DEF0123",
        "udyamNumber": "UDYAM-AB-12-1234567",
        "iecCode": "1234567890",
        "entityType": "Private Limited",
        "sortOrder": 1,
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z",
        "branch": {
          "_id": "branch_id",
          "name": "Branch Name",
          "address": "Branch Address",
          "city": "City Name",
          "state": "State Name",
          "country": "Country Name",
          "pinCode": "123456"
        },
        "activities": {
          "assigned": [],
          "total": 0,
          "summary": []
        },
        "teamMembers": {
          "total": 2,
          "members": [
            {
              "_id": "member_id",
              "name": "Team Member Name",
              "email": "member@example.com",
              "phone": "+1234567890"
            }
          ]
        },
        "tasks": {
          "total": 5,
          "byStatus": {
            "pending": 2,
            "ongoing": 1,
            "completed": 1,
            "on_hold": 0,
            "delayed": 1,
            "cancelled": 0
          },
          "status": {
            "pending": 2,
            "ongoing": 1,
            "completed": 1,
            "on_hold": 0,
            "delayed": 1,
            "cancelled": 0
          }
        },
        "timelines": {
          "total": 3
        }
      }
    ],
    "page": 1,
    "limit": 50,
    "totalPages": 5,
    "totalResults": 250,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "limit",
      "message": "limit must be a number"
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
  "message": "Failed to retrieve clients table data"
}
```

## Usage Examples

### Basic Usage
```bash
curl -X GET "http://localhost:3000/v1/analytics/clients/table" \
  -H "Authorization: Bearer <your_token>"
```

### With Pagination
```bash
curl -X GET "http://localhost:3000/v1/analytics/clients/table?page=2&limit=25" \
  -H "Authorization: Bearer <your_token>"
```

### With Sorting
```bash
curl -X GET "http://localhost:3000/v1/analytics/clients/table?sortBy=createdAt:desc" \
  -H "Authorization: Bearer <your_token>"
```

### With Filters
```bash
curl -X GET "http://localhost:3000/v1/analytics/clients/table?businessType=Private%20Limited&state=Mumbai" \
  -H "Authorization: Bearer <your_token>"
```

### With Global Search
```bash
curl -X GET "http://localhost:3000/v1/analytics/clients/table?search=ABC%20Company" \
  -H "Authorization: Bearer <your_token>"
```

### With Branch Filter
```bash
curl -X GET "http://localhost:3000/v1/analytics/clients/table?branch=507f1f77bcf86cd799439011" \
  -H "Authorization: Bearer <your_token>"
```

## Data Structure Details

### Personal Details
- **Basic Info**: name, email, phone, address
- **Location**: district, state, country
- **Business Info**: fNo, businessType, entityType
- **Tax Numbers**: pan, gstNumber, tanNumber, cinNumber
- **Other**: udyamNumber, iecCode, dob, sortOrder
- **Timestamps**: createdAt, updatedAt

### Branch Information
- **Details**: name, address, city, state, country, pinCode
- **Access Control**: Automatically filtered based on user's branch permissions

### Activity Information
- **Assigned Activities**: Array of activities assigned to the client
- **Summary**: Count and details of activities by category
- **Total Count**: Total number of activities

### Team Member Information
- **Members**: Array of team members working on this client
- **Details**: name, email, phone for each member
- **Total Count**: Total number of team members

### Task Status Information
- **Total Tasks**: Total number of tasks for the client
- **Status Breakdown**: Count of tasks by status (pending, ongoing, completed, on_hold, delayed, cancelled)
- **Detailed Status**: Both object and individual count formats

### Timeline Information
- **Total Timelines**: Total number of timelines for the client

## Security Features

### Branch Access Control
- Users can only see clients from branches they have access to
- Branch filtering is automatically applied based on user permissions
- Users with "all branches access" can see all clients
- Users with specific branch access are limited to those branches

### Data Filtering
- All sensitive information is properly filtered
- User permissions are validated on each request
- Input validation prevents injection attacks

## Performance Considerations

### Pagination
- Default page size is 50 records
- Maximum page size is 100 records
- Efficient database queries with proper indexing

### Caching
- Consider implementing caching for frequently accessed data
- Cache invalidation on data updates

### Database Optimization
- Uses lean queries for better performance
- Proper population of related data
- Efficient aggregation for task statistics

## Error Handling

### Validation Errors
- All input parameters are validated
- Clear error messages for invalid inputs
- Proper HTTP status codes

### Permission Errors
- Clear messages for access denied scenarios
- Proper handling of branch access restrictions

### System Errors
- Graceful error handling for database issues
- Proper error logging for debugging

## Testing

### Test File
A test file `test-clients-table-api.js` is provided for testing the API:

```bash
node test-clients-table-api.js
```

### Test Scenarios
1. Basic endpoint access
2. Pagination functionality
3. Sorting functionality
4. Filtering functionality
5. Search functionality
6. Error handling
7. Permission validation

## Integration Examples

### Frontend Integration (React)
```javascript
const fetchClientsTable = async (filters = {}, page = 1, limit = 50) => {
  try {
    const params = new URLSearchParams({
      page,
      limit,
      ...filters
    });
    
    const response = await fetch(`/v1/analytics/clients/table?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch clients');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
};
```

### Backend Integration (Node.js)
```javascript
const getClientsTableData = async (req, res) => {
  try {
    const filter = pick(req.query, ['name', 'email', 'search', 'branch']);
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    
    const result = await clientAnalytics.getAllClientsTableData(filter, options, req.user);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure valid JWT token is provided
   - Check token expiration
   - Verify token format

2. **Permission Errors**
   - Verify user has access to requested branches
   - Check user role permissions
   - Ensure proper branch access configuration

3. **Validation Errors**
   - Check parameter formats
   - Verify required fields
   - Ensure proper data types

4. **Performance Issues**
   - Reduce page size for large datasets
   - Use specific filters instead of global search
   - Implement proper caching

### Debug Information
- Check server logs for detailed error information
- Verify database connectivity
- Test with minimal parameters first
- Use the provided test file for validation

## Support

For additional support or questions about this API:
- Check the main API documentation
- Review the analytics service implementation
- Contact the development team
- Check the system logs for detailed error information
