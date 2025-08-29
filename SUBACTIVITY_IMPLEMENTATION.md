# Subactivity Implementation

## Overview
Added subactivity support to the Activity model, allowing activities to have multiple subactivities. Each subactivity is a simple object with just a name field.

## Model Changes

### Activity Model (`src/models/activity.model.js`)
- Added `subactivitySchema` with only a `name` field (optional)
- Added `subactivities` array field to the main activity schema
- Subactivities have timestamps and unique IDs

## Validation (`src/validations/activity.validation.js`)
- `createSubactivity`: Validates subactivity creation
- `updateSubactivity`: Validates subactivity updates  
- `deleteSubactivity`: Validates subactivity deletion
- All validations include proper parameter validation for activityId and subactivityId

## Service Layer (`src/services/activity.service.js`)
- `createSubactivity(activityId, subactivityBody)`: Adds new subactivity to an activity
- `updateSubactivity(activityId, subactivityId, updateBody)`: Updates existing subactivity
- `deleteSubactivity(activityId, subactivityId)`: Removes subactivity from activity

## Controller Layer (`src/controllers/activity.controller.js`)
- `createSubactivity`: Handles POST requests to create subactivities
- `updateSubactivity`: Handles PATCH requests to update subactivities
- `deleteSubactivity`: Handles DELETE requests to remove subactivities

## Routes (`src/routes/v1/activity.route.js`)
- `POST /:activityId/subactivities` - Create new subactivity
- `PATCH /:activityId/subactivities/:subactivityId` - Update existing subactivity
- `DELETE /:activityId/subactivities/:subactivityId` - Delete subactivity

## API Usage Examples

### Create Subactivity
```bash
POST /api/v1/activities/:activityId/subactivities
{
  "name": "Subactivity Name"
}
```

### Update Subactivity
```bash
PATCH /api/v1/activities/:activityId/subactivities/:subactivityId
{
  "name": "Updated Subactivity Name"
}
```

### Delete Subactivity
```bash
DELETE /api/v1/activities/:activityId/subactivities/:subactivityId
```

## Features
- ✅ Subactivities can be added to any activity
- ✅ Subactivities can be updated individually
- ✅ Subactivities can be deleted individually
- ✅ Each subactivity gets unique ID and timestamps
- ✅ Validation ensures proper activity and subactivity IDs
- ✅ Error handling for non-existent activities/subactivities

## Database Schema
```javascript
subactivities: [{
  name: String,        // Optional subactivity name
  createdAt: Date,     // Auto-generated timestamp
  updatedAt: Date      // Auto-generated timestamp
}]
```

## Notes
- Subactivities are embedded documents within the Activity model
- No separate collection is created for subactivities
- Subactivities inherit the activity's lifecycle
- The name field is optional as per requirements
