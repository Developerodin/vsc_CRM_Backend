# Excel Activities Import Guide

## Overview

This guide explains how to import client activities using Excel files. The system supports importing activities along with client data or as separate activity assignments.

## Excel Template Options

### Option 1: Single Sheet with Activities (Recommended)

Create one Excel sheet with both client and activity information:

| clientName | phone | email | businessType | activity | assignedTeamMember | notes |
|------------|-------|-------|--------------|----------|-------------------|-------|
| John Doe   | 123   | john@email.com | Proprietorship | 68944d750b032706b481ae50 | 689475ac3b10670b30522328 | Q4 taxes due |
| John Doe   | 123   | john@email.com | Proprietorship | 68944d750b032706b481ae51 | 689475ac3b10670b30522329 | Monthly filing |
| Jane Smith | 456   | jane@email.com | Private Limited | 68944d750b032706b481ae52 | 689475ac3b10670b30522330 | Annual audit |

**Rules:**
- Multiple rows for same client = multiple activities
- System will group activities by client
- Duplicate client info is allowed (will be merged)

### Option 2: Separate Sheets

**Clients Sheet:**
| clientName | phone | email | businessType | gstNumber |
|------------|-------|-------|--------------|-----------|
| John Doe   | 123   | john@email.com | Proprietorship | GST123 |
| Jane Smith | 456   | jane@email.com | Private Limited | GST456 |

**Activities Sheet:**
| clientName | activity | assignedTeamMember | notes |
|------------|----------|-------------------|-------|
| John Doe   | 68944d750b032706b481ae50 | 689475ac3b10670b30522328 | Q4 taxes due |
| John Doe   | 68944d750b032706b481ae51 | 689475ac3b10670b30522329 | Monthly filing |
| Jane Smith | 68944d750b032706b481ae52 | 689475ac3b10670b30522330 | Annual audit |

## Field Descriptions

### Client Fields
- **clientName** (required): Name of the client
- **phone**: Phone number
- **email**: Primary email address
- **email2**: Secondary email address
- **address**: Physical address
- **district**: District name
- **state**: State name
- **country**: Country name
- **fNo**: File number
- **pan**: PAN card number
- **dob**: Date of birth (YYYY-MM-DD)
- **branch**: Branch ID or name
- **sortOrder**: Display order
- **businessType**: Type of business
- **gstNumber**: GST registration number
- **tanNumber**: TAN number
- **cinNumber**: CIN number
- **udyamNumber**: Udyam registration number
- **iecCode**: Import/Export code
- **entityType**: Business entity type

### Activity Fields
- **activity** (required): Activity ID from the system
- **assignedTeamMember** (required): Team member ID from the system
- **notes**: Additional notes about the activity

## Implementation Details

### 1. Enhanced Bulk Import Function

The `bulkImportClients` function has been enhanced to handle activities from frontend data:

```javascript
// Helper function to validate and process activities from frontend data
const processActivitiesFromFrontend = async (activityData) => {
  if (!activityData || !Array.isArray(activityData)) {
    return { isValid: true, activities: [], errors: [] };
  }

  const activities = [];
  const errors = [];
  
  for (const activityRow of activityData) {
    try {
      // Validate that activity exists by ID
      const activity = await Activity.findById(activityRow.activity);
      
      // Validate that team member exists by ID
      const teamMember = await TeamMember.findById(activityRow.assignedTeamMember);
      
      if (activity && teamMember) {
        // Use the IDs directly from frontend (no need to convert)
        activities.push({
          activity: activityRow.activity, // Keep the original ID
          assignedTeamMember: activityRow.assignedTeamMember, // Keep the original ID
          assignedDate: new Date(), // System automatically sets current date
          notes: activityRow.notes || ''
        });
      } else {
        // Add validation error
        if (!activity) {
          errors.push({
            type: 'ACTIVITY_NOT_FOUND',
            message: `Activity with ID '${activityRow.activity}' not found`,
            data: activityRow
          });
        }
        if (!teamMember) {
          errors.push({
            type: 'TEAM_MEMBER_NOT_FOUND',
            message: `Team member with ID '${activityRow.assignedTeamMember}' not found`,
            data: activityRow
          });
        }
      }
    } catch (error) {
      console.error('Error validating activity row:', error, activityRow);
      errors.push({
        type: 'VALIDATION_ERROR',
        message: 'Error validating activity data',
        data: activityRow
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    activities,
    errors
  };
};
```

### 2. How It Works

1. **Data Processing**: Excel data is parsed into client objects
2. **Activity Extraction**: Activities are extracted from each client row
3. **Reference Resolution**: Activity and team member names are converted to ObjectIds
4. **Bulk Operations**: Clients are created/updated with their activities

### 3. Data Flow

```
Excel → Parse → Group by Client → Process Activities → Bulk Import → Database
```

## Excel Formatting Requirements

### Date Format
- **assignedDate** is automatically set by the system to the current date
- No need to specify dates in Excel
- All activities will be marked as assigned on the import date

### Text Fields
- No special formatting required
- Leading/trailing spaces are automatically trimmed
- Case-sensitive matching for activity and team member names

### Required Fields
- **clientName**: Must be provided
- **activity**: Must be a valid activity ID from the system
- **assignedTeamMember**: Must be a valid team member ID from the system

## Sample Excel Files

### Sample 1: Simple Activities Import
[Download Sample 1](sample_activities_simple.xlsx)

### Sample 2: Complex Client with Activities
[Download Sample 2](sample_client_activities.xlsx)

### Sample 3: Multiple Activities per Client
[Download Sample 3](sample_multiple_activities.xlsx)

## Error Handling

### Common Errors

1. **Activity Not Found**
   - Error: "Activity with ID '68944d750b032706b481ae50' not found"
   - Solution: Verify activity ID exists in system

2. **Team Member Not Found**
   - Error: "Team member with ID '689475ac3b10670b30522328' not found"
   - Solution: Verify team member ID exists in system

3. **Invalid Data Format**
   - Error: "Invalid data format"
   - Solution: Check Excel formatting and required fields

### Error Response Format

```json
{
  "created": 5,
  "updated": 2,
  "errors": [
    {
      "index": 3,
      "error": "Activity 'Tax Filing' not found",
             "data": {
         "clientName": "John Doe",
         "activity": "68944d750b032706b481ae50",
         "assignedTeamMember": "689475ac3b10670b30522328",
         "notes": "Q4 taxes due"
       }
    }
  ],
  "totalProcessed": 8
}
```

## Best Practices

### 1. Data Preparation
- Verify all activity names exist in the system
- Verify all team member names exist in the system
- Use consistent naming conventions
- Test with small datasets first

### 2. Excel Structure
- Use clear, descriptive column headers
- Avoid merged cells or complex formatting
- Keep one activity per row
- Use consistent date formats

### 3. Validation
- Check for duplicate activities
- Validate date ranges
- Ensure required fields are populated
- Review error logs after import

## API Usage

### Endpoint
```
POST /v1/clients/bulk-import
```

### Request Body
```json
{
  "clients": [
    {
      "name": "John Doe",
      "phone": "1234567890",
      "email": "john@email.com",
             "activities": [
         {
           "activity": "68944d750b032706b481ae50",
           "assignedTeamMember": "689475ac3b10670b30522328",
           "notes": "Q4 taxes due"
         }
       ]
    }
  ]
}
```

### Response
```json
{
  "created": 1,
  "updated": 0,
  "errors": [],
  "totalProcessed": 1
}
```

## Troubleshooting

### Import Fails Completely
1. Check Excel format and required fields
2. Verify activity and team member names exist
3. Check system logs for detailed error messages
4. Ensure all required fields are populated

### Partial Import Success
1. Review error array in response
2. Fix data issues in Excel
3. Re-import only failed records
4. Check for duplicate or invalid data

### Performance Issues
1. Reduce batch size (currently 100)
2. Split large imports into smaller files
3. Process during off-peak hours
4. Monitor database performance

## Future Enhancements

### Planned Features
1. **Activity Templates**: Pre-defined activity sets
2. **Bulk Activity Assignment**: Assign same activity to multiple clients
3. **Activity Scheduling**: Import with scheduling information
4. **Validation Rules**: Custom validation for specific business rules
5. **Import History**: Track and review previous imports

### Customization Options
1. **Field Mapping**: Customize Excel column names
2. **Business Rules**: Add custom validation logic
3. **Notification System**: Email alerts for failed imports
4. **Rollback Functionality**: Undo failed imports

## Support

For technical support or questions:
1. Check system logs for error details
2. Review this documentation
3. Contact system administrator
4. Submit bug reports with sample data
