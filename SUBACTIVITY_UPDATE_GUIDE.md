# Subactivity Update Guide

This guide explains how to update activities with subactivity modifications using the enhanced API.

## Overview

The activity update API now supports three ways to handle subactivities:

1. **Complete Replacement** - Replace entire subactivities array
2. **Selective Operations** - Add, update, or remove specific subactivities
3. **No Changes** - Update other fields without touching subactivities

## API Endpoint

```
PUT /api/v1/activities/:activityId
```

## Update Methods

### 1. Complete Subactivity Replacement

Replace the entire subactivities array with new data:

```json
{
  "name": "Updated Activity Name",
  "subactivities": [
    { "name": "New Subactivity 1" },
    { "name": "New Subactivity 2" },
    { "name": "New Subactivity 3" }
  ]
}
```

**Use Case**: When you want to completely replace all subactivities with a new set.

### 2. Add New Subactivities

Add new subactivities to existing ones:

```json
{
  "name": "Activity with Added Subactivities",
  "subactivities": {
    "add": [
      { "name": "Additional Subactivity 1" },
      { "name": "Additional Subactivity 2" }
    ]
  }
}
```

**Use Case**: When you want to add new subactivities without affecting existing ones.

### 3. Update Existing Subactivities

Update specific subactivities by their ID:

```json
{
  "name": "Activity with Updated Subactivities",
  "subactivities": {
    "update": [
      { "_id": "existing_subactivity_id_1", "name": "Updated Name 1" },
      { "_id": "existing_subactivity_id_2", "name": "Updated Name 2" }
    ]
  }
}
```

**Important**: Each update object must include the `_id` field to identify which subactivity to update.

**Use Case**: When you want to modify specific existing subactivities.

### 4. Remove Specific Subactivities

Remove subactivities by their ID:

```json
{
  "name": "Activity with Removed Subactivities",
  "subactivities": {
    "remove": ["subactivity_id_to_remove_1", "subactivity_id_to_remove_2"]
  }
}
```

**Use Case**: When you want to delete specific subactivities.

### 5. Mixed Operations

Combine add, update, and remove operations:

```json
{
  "name": "Activity with Mixed Subactivity Operations",
  "subactivities": {
    "add": [
      { "name": "New Subactivity" }
    ],
    "update": [
      { "_id": "existing_id", "name": "Updated Name" }
    ],
    "remove": ["subactivity_id_to_remove"]
  }
}
```

**Use Case**: When you need to perform multiple types of subactivity operations in one request.

### 6. No Subactivity Changes

Update other fields without modifying subactivities:

```json
{
  "name": "Activity with No Subactivity Changes",
  "frequency": "Daily",
  "dueDate": "2024-12-31T00:00:00.000Z"
}
```

**Use Case**: When you only want to update activity fields, not subactivities.

## Validation Rules

- **add**: Must be an array of subactivity objects
- **update**: Must be an array of objects with `_id` field
- **remove**: Must be an array of subactivity IDs (strings)
- All operations are optional - you can use any combination

## Error Handling

The API will return appropriate error messages for:
- Invalid subactivity operation structure
- Missing `_id` in update operations
- Non-existent subactivity IDs in update/remove operations
- Invalid data types for operation arrays

## Examples

### Frontend JavaScript

```javascript
// Update activity with new subactivities
const updateActivity = async (activityId, updateData) => {
  try {
    const response = await fetch(`/api/v1/activities/${activityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      throw new Error('Update failed');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
};

// Example usage
const updateData = {
  name: "Updated Activity",
  subactivities: {
    add: [{ name: "New Task" }],
    update: [{ _id: "existing_id", name: "Updated Task" }]
  }
};

await updateActivity("activity_id", updateData);
```

### cURL Examples

```bash
# Complete replacement
curl -X PUT \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Updated Activity",
    "subactivities": [
      {"name": "Task 1"},
      {"name": "Task 2"}
    ]
  }' \
  http://localhost:3000/api/v1/activities/ACTIVITY_ID

# Add new subactivities
curl -X PUT \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "subactivities": {
      "add": [{"name": "New Task"}]
    }
  }' \
  http://localhost:3000/api/v1/activities/ACTIVITY_ID
```

## Best Practices

1. **Use selective operations** when you only need to modify specific subactivities
2. **Use complete replacement** when you want to ensure a specific subactivity state
3. **Always include `_id`** when updating existing subactivities
4. **Validate subactivity IDs** before sending update requests
5. **Handle errors gracefully** on the frontend

## Migration from Old API

The old API behavior is preserved - if you don't include subactivities in the update body, nothing changes. The new functionality is additive and backward-compatible.

## Testing

Use the provided test script to verify functionality:

```bash
node test-subactivity-updates.js
```

This will show examples of all update patterns and expected API usage.
