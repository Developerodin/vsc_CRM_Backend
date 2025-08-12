# Bulk Import Update Guide

## Overview

The bulk import functionality in the CRM system allows administrators to import multiple clients at once, either creating new records or updating existing ones. However, there's a critical limitation: **when new fields are added to the client model, the bulk import function must be manually updated to handle these new fields**.

## How Bulk Import Currently Works

### 1. Function Location
The bulk import functionality is implemented in:
- **File**: `src/services/client.service.js`
- **Function**: `bulkImportClients(clients)`

### 2. Current Process Flow

```javascript
const bulkImportClients = async (clients) => {
  // 1. Separate clients into two groups
  const toCreate = clients.filter((client) => !client.id);  // New clients
  const toUpdate = clients.filter((client) => client.id);   // Existing clients
  
  // 2. Process creation in batches
  // 3. Process updates in batches
}
```

### 3. Current Update Fields (Limited Set)

The function currently only updates these fields during bulk updates:

```javascript
const updateOps = batch.map((client) => ({
  updateOne: {
    filter: { _id: client.id },
    update: {
      $set: {
        name: client.name,
        phone: client.phone,
        email: client.email,
        email2: client.email2,
        address: client.address,
        district: client.district,
        state: client.state,
        country: client.country,
        fNo: client.fNo,
        pan: client.pan,
        dob: client.dob,
        branch: client.branch,
        sortOrder: client.sortOrder,
        // ❌ MISSING: All new business fields
      },
    },
    upsert: false,
  },
}));
```

## The Problem

### New Fields Added to Client Model

The client model has been enhanced with new business-related fields:

```javascript
// Business Information
businessType: String,        // Type of business or trade
gstNumber: String,          // GST Registration Number
tanNumber: String,          // Tax Deduction and Collection Account Number
cinNumber: String,          // Corporate Identity Number
udyamNumber: String,        // Udyam Registration Number (MSME)
iecCode: String,            // Import Export Code
entityType: String,         // Type of business entity
metadata: Mixed,            // Additional flexible data storage
activities: Array           // Activity assignments
```

### Why Bulk Import Doesn't Update These Fields

1. **Hardcoded Field List**: The update operation uses a hardcoded `$set` object
2. **No Dynamic Field Detection**: The function doesn't automatically detect model changes
3. **Manual Maintenance Required**: Developers must remember to update the function when the model changes

## Solutions

### Solution 1: Update the Hardcoded Field List (Quick Fix)

Add the new fields to the existing update operation:

```javascript
const updateOps = batch.map((client) => ({
  updateOne: {
    filter: { _id: client.id },
    update: {
      $set: {
        // Existing fields
        name: client.name,
        phone: client.phone,
        email: client.email,
        email2: client.email2,
        address: client.address,
        district: client.district,
        state: client.state,
        country: client.country,
        fNo: client.fNo,
        pan: client.pan,
        dob: client.dob,
        branch: client.branch,
        sortOrder: client.sortOrder,
        
        // New business fields
        businessType: client.businessType,
        gstNumber: client.gstNumber,
        tanNumber: client.tanNumber,
        cinNumber: client.cinNumber,
        udyamNumber: client.udyamNumber,
        iecCode: client.iecCode,
        entityType: client.entityType,
        metadata: client.metadata,
        activities: client.activities,
      },
    },
    upsert: false,
  },
}));
```

### Solution 2: Dynamic Field Detection (Recommended)

Create a more robust solution that automatically handles all model fields:

```javascript
const bulkImportClients = async (clients) => {
  // ... existing code ...

  // Get all schema fields dynamically
  const schemaFields = Object.keys(Client.schema.paths).filter(
    path => !['_id', '__v', 'createdAt', 'updatedAt'].includes(path)
  );

  // Process updates in batches
  if (toUpdate.length > 0) {
    for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
      const batch = toUpdate.slice(i, i + BATCH_SIZE);

      try {
        const updateOps = batch.map((client) => {
          // Build update object dynamically
          const updateData = {};
          schemaFields.forEach(field => {
            if (client[field] !== undefined) {
              updateData[field] = client[field];
            }
          });

          return {
            updateOne: {
              filter: { _id: client.id },
              update: { $set: updateData },
              upsert: false,
            },
          };
        });

        // ... rest of the update logic
      } catch (error) {
        // ... error handling
      }
    }
  }

  // ... rest of the function
};
```

### Solution 3: Configuration-Based Approach

Create a configuration file that defines which fields should be included in bulk updates:

```javascript
// config/bulkImportFields.js
export const CLIENT_BULK_UPDATE_FIELDS = [
  'name', 'phone', 'email', 'email2', 'address', 'district', 'state', 'country',
  'fNo', 'pan', 'dob', 'branch', 'sortOrder', 'businessType', 'gstNumber',
  'tanNumber', 'cinNumber', 'udyamNumber', 'iecCode', 'entityType', 'metadata'
];

// In the service:
import { CLIENT_BULK_UPDATE_FIELDS } from '../config/bulkImportFields.js';

const updateData = {};
CLIENT_BULK_UPDATE_FIELDS.forEach(field => {
  if (client[field] !== undefined) {
    updateData[field] = client[field];
  }
});
```

## Best Practices

### 1. Always Update Bulk Import When Model Changes
- Add new fields to the bulk import function
- Test with sample data to ensure updates work correctly
- Update documentation

### 2. Consider Using Dynamic Field Detection
- Automatically handles new fields
- Reduces maintenance overhead
- More robust and future-proof

### 3. Field Validation
- Validate field types before bulk operations
- Handle required vs optional fields appropriately
- Consider field-level permissions

### 4. Testing
- Test bulk import with new fields
- Verify that existing functionality isn't broken
- Test edge cases (empty values, invalid data)

## Current Status

**Status**: ❌ **Outdated** - Bulk import doesn't handle new business fields

**Fields Missing from Bulk Updates**:
- businessType
- gstNumber
- tanNumber
- cinNumber
- udyamNumber
- iecCode
- entityType
- metadata
- activities

## Recommended Action

1. **Immediate**: Update the hardcoded field list (Solution 1)
2. **Long-term**: Implement dynamic field detection (Solution 2)
3. **Testing**: Verify that bulk updates work with new fields
4. **Documentation**: Update this guide after implementation

## Related Files

- `src/models/client.model.js` - Client schema definition
- `src/services/client.service.js` - Bulk import implementation
- `src/controllers/client.controller.js` - API endpoints
- `src/routes/v1/client.route.js` - Route definitions

## Migration Considerations

When adding new fields to existing clients:

1. **Default Values**: Consider setting default values for existing records
2. **Data Migration**: Plan migration scripts if needed
3. **Backward Compatibility**: Ensure API responses handle missing fields gracefully
4. **Validation**: Update validation schemas to include new fields
