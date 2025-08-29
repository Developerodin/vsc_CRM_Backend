# GST Migration Guide

## Overview

The client model has been updated to support multiple GST numbers per state, allowing clients to have different GST registrations for different states where they conduct business.

## Changes Made

### 1. Model Updates (`src/models/client.model.js`)

- **Old Structure**: Single `gstNumber` field
- **New Structure**: `gstNumbers` array with objects containing:
  - `state`: State name (required)
  - `gstNumber`: GST registration number (required, validated)

```javascript
gstNumbers: [{
  state: {
    type: String,
    trim: true,
    required: true,
    description: 'State for which GST number is registered'
  },
  gstNumber: {
    type: String,
    trim: true,
    required: true,
    validate(value) {
      if (value && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value)) {
        throw new Error('Invalid GST number format');
      }
    },
    description: 'GST Registration Number for the specific state'
  }
}]
```

### 2. API Endpoints

#### New GST Management Endpoints

- `GET /v1/clients/:clientId/gst-numbers` - Get all GST numbers for a client
- `POST /v1/clients/:clientId/gst-numbers` - Add new GST number
- `PATCH /v1/clients/:clientId/gst-numbers/:gstId` - Update existing GST number
- `DELETE /v1/clients/:clientId/gst-numbers/:gstId` - Remove GST number

#### Request/Response Examples

**Add GST Number:**
```bash
POST /v1/clients/:clientId/gst-numbers
{
  "state": "Maharashtra",
  "gstNumber": "27ABCDE1234F1Z5"
}
```

**Update GST Number:**
```bash
PATCH /v1/clients/:clientId/gst-numbers/:gstId
{
  "state": "Karnataka",
  "gstNumber": "29ABCDE1234F1Z5"
}
```

### 3. Validation Updates

All validation schemas have been updated to support the new GST structure:

- `createClient` - Requires array of GST numbers
- `updateClient` - Accepts array of GST numbers
- `getClients` - Supports filtering by GST numbers
- `bulkImportClients` - Supports array format

### 4. Search Functionality

The search functionality now includes:
- GST number search
- State search within GST numbers
- Enhanced filtering capabilities

## Migration Process

### Automatic Migration Script

Run the migration script to convert existing clients:

```bash
node scripts/migrate-gst-to-array.js
```

The script will:
1. Find all clients with existing `gstNumber` field
2. Convert them to the new `gstNumbers` array format
3. Use the client's existing `state` field (or 'Unknown' if not available)
4. Remove the old `gstNumber` field
5. Provide detailed migration report

### Manual Migration

If you prefer manual migration, update each client document:

```javascript
// Old format
{
  "gstNumber": "27ABCDE1234F1Z5"
}

// New format
{
  "gstNumbers": [
    {
      "state": "Maharashtra",
      "gstNumber": "27ABCDE1234F1Z5"
    }
  ]
}
```

## Benefits

1. **Multi-state Support**: Clients can now have GST numbers for multiple states
2. **Better Organization**: Clear separation of GST numbers by state
3. **Enhanced Search**: Search by state or GST number
4. **Scalability**: Easy to add/remove GST numbers as business expands
5. **Data Integrity**: Validation ensures proper GST number format

## Breaking Changes

- **API Changes**: Old `gstNumber` field is no longer supported
- **Validation**: All GST-related requests must use the new array format
- **Search**: GST number filtering now works on the array structure

## Testing

Test the new functionality with:

```bash
# Test GST number creation
curl -X POST /v1/clients/:clientId/gst-numbers \
  -H "Content-Type: application/json" \
  -d '{"state": "Maharashtra", "gstNumber": "27ABCDE1234F1Z5"}'

# Test GST number retrieval
curl -X GET /v1/clients/:clientId/gst-numbers

# Test GST number update
curl -X PATCH /v1/clients/:clientId/gst-numbers/:gstId \
  -H "Content-Type: application/json" \
  -d '{"state": "Karnataka"}'

# Test GST number deletion
curl -X DELETE /v1/clients/:clientId/gst-numbers/:gstId
```

## Rollback Plan

If rollback is needed:

1. Restore the old model structure
2. Update validation schemas
3. Modify controllers and services
4. Update routes
5. Run reverse migration script

## Support

For issues or questions regarding the GST migration:
1. Check the migration logs
2. Verify database connectivity
3. Ensure proper permissions
4. Review validation errors
