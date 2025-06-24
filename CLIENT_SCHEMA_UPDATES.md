# Client Schema Updates

## Overview
The client schema has been updated to include new fields and modify existing ones. All fields are now optional to provide more flexibility in data entry.

## Changes Made

### New Fields Added
1. **F.No.** (`fNo`) - String field for file number
2. **PAN** (`pan`) - String field with validation for Indian PAN format (5 letters + 4 digits + 1 letter)
3. **DOB** (`dob`) - Date field with validation to ensure it's not in the future
4. **Email2** (`email2`) - Secondary email field with email validation

### Modified Fields
1. **City** → **District** (`district`) - Renamed from city to district
2. **PinCode** - Removed entirely from the schema

### Field Requirements
- **All fields are now optional** - No single field is required
- Validation still applies when values are provided:
  - Email and Email2 must be valid email formats
  - Phone must be a valid mobile number (when provided)
  - PAN must match the Indian PAN format (when provided)
  - DOB cannot be in the future (when provided)

## Updated Files

### 1. Model (`src/models/client.model.js`)
- Added new fields: `fNo`, `pan`, `dob`, `email2`
- Changed `city` to `district`
- Removed `pinCode` field
- Made all fields optional by removing `required: true`
- Updated validation to only run when values are provided

### 2. Validation (`src/validations/client.validation.js`)
- Updated all validation schemas to include new fields
- Removed `pinCode` from all schemas
- Changed `city` to `district`
- Made all fields optional by removing `.required()`
- Added PAN format validation pattern
- Added DOB validation to ensure it's not in the future

### 3. Service (`src/services/client.service.js`)
- Updated bulk import operations to handle new fields
- Updated unique field validation to only check when values are provided
- Updated bulk update operations to include all new fields

### 4. Controller (`src/controllers/client.controller.js`)
- Updated query filters to include new fields (`fNo`, `pan`)
- Removed `pinCode` from filters
- Changed `city` to `district` in filters

## API Endpoints

All existing endpoints continue to work with the new schema:

- `POST /v1/clients` - Create client (all fields optional)
- `GET /v1/clients` - Query clients (supports filtering by new fields)
- `GET /v1/clients/:clientId` - Get specific client
- `PATCH /v1/clients/:clientId` - Update client
- `DELETE /v1/clients/:clientId` - Delete client
- `POST /v1/clients/bulk-import` - Bulk import clients

## Example Request Body

```json
{
  "name": "John Doe",
  "phone": "+1234567890",
  "email": "john@example.com",
  "email2": "john.backup@example.com",
  "address": "123 Main St",
  "district": "Central District",
  "state": "California",
  "country": "USA",
  "fNo": "F12345",
  "pan": "ABCDE1234F",
  "dob": "1990-01-01",
  "sortOrder": 1
}
```

## Migration Notes

- Existing clients in the database will continue to work
- The `city` field will be automatically mapped to `district` in queries
- The `pinCode` field will be ignored in new requests
- All new fields will be `null` for existing records until updated

## Validation Rules

1. **Email/Email2**: Must be valid email format when provided
2. **Phone**: Must be valid mobile number when provided
3. **PAN**: Must match pattern `^[A-Z]{5}[0-9]{4}[A-Z]{1}$` when provided
4. **DOB**: Cannot be in the future when provided
5. **Unique Constraints**: Email and phone remain unique when provided 