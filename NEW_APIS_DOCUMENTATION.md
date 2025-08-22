# New APIs Documentation

## Overview
Two new master data APIs have been created for the CRM Backend system:
1. **Business Master API** - Manages business types/categories
2. **Entity Type Master API** - Manages entity types (Proprietorship, Partnership, etc.)

## 1. Business Master API

### Base URL
```
/business-master
```

### Endpoints

#### Create Business Master
- **POST** `/business-master`
- **Auth**: `manageBusinessMasters` permission required
- **Body**:
  ```json
  {
    "name": "Retail Business"
  }
  ```
- **Response**: 201 Created with created business master object

#### Get All Business Masters
- **GET** `/business-master`
- **Auth**: `getBusinessMasters` permission required
- **Query Parameters**:
  - `name`: Filter by name (case-insensitive)
  - `search`: Global search across all fields
  - `sortBy`: Sort field (e.g., `name:asc`, `createdAt:desc`)
  - `limit`: Results per page (default: 10)
  - `page`: Page number (default: 1)
- **Response**: Paginated list of business masters

#### Get Business Master by ID
- **GET** `/business-master/:businessMasterId`
- **Auth**: `getBusinessMasters` permission required
- **Response**: Business master object

#### Update Business Master
- **PATCH** `/business-master/:businessMasterId`
- **Auth**: `manageBusinessMasters` permission required
- **Body**:
  ```json
  {
    "name": "Updated Business Name"
  }
  ```
- **Response**: Updated business master object

#### Delete Business Master
- **DELETE** `/business-master/:businessMasterId`
- **Auth**: `manageBusinessMasters` permission required
- **Response**: 204 No Content

#### Bulk Import Business Masters
- **POST** `/business-master/bulk-import`
- **Auth**: `manageBusinessMasters` permission required
- **Body**:
  ```json
  {
    "businessMasters": [
      { "name": "Business Type 1" },
      { "name": "Business Type 2" },
      { "name": "Business Type 3" }
    ]
  }
  ```
- **Response**: Import results with success/error details

## 2. Entity Type Master API

### Base URL
```
/entity-master
```

### Endpoints

#### Create Entity Type Master
- **POST** `/entity-master`
- **Auth**: `manageEntityTypeMasters` permission required
- **Body**:
  ```json
  {
    "name": "Proprietorship"
  }
  ```
- **Response**: 201 Created with created entity type master object

#### Get All Entity Type Masters
- **GET** `/entity-master`
- **Auth**: `getEntityTypeMasters` permission required
- **Query Parameters**:
  - `name`: Filter by name (case-insensitive)
  - `search`: Global search across all fields
  - `sortBy`: Sort field (e.g., `name:asc`, `createdAt:desc`)
  - `limit`: Results per page (default: 10)
  - `page`: Page number (default: 1)
- **Response**: Paginated list of entity type masters

#### Get Entity Type Master by ID
- **GET** `/entity-master/:entityTypeMasterId`
- **Auth**: `getEntityTypeMasters` permission required
- **Response**: Entity type master object

#### Update Entity Type Master
- **PATCH** `/entity-master/:entityTypeMasterId`
- **Auth**: `manageEntityTypeMasters` permission required
- **Body**:
  ```json
  {
    "name": "Updated Entity Type"
  }
  ```
- **Response**: Updated entity type master object

#### Delete Entity Type Master
- **DELETE** `/entity-master/:entityTypeMasterId`
- **Auth**: `manageEntityTypeMasters` permission required
- **Response**: 204 No Content

#### Bulk Import Entity Type Masters
- **POST** `/entity-master/bulk-import`
- **Auth**: `manageEntityTypeMasters` permission required
- **Body**:
  ```json
  {
    "entityTypeMasters": [
      { "name": "Proprietorship" },
      { "name": "Partnership" },
      { "name": "Private Limited" }
    ]
  }
  ```
- **Response**: Import results with success/error details

## Data Models

### Business Master Model
```javascript
{
  _id: ObjectId,
  name: String (required, unique, trimmed),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

### Entity Type Master Model
```javascript
{
  _id: ObjectId,
  name: String (required, unique, trimmed),
  createdAt: Date (auto-generated),
  updatedAt: Date (auto-generated)
}
```

## Features

### ✅ CRUD Operations
- Create, Read, Update, Delete operations for both models
- Proper error handling and validation
- Authentication and authorization checks

### ✅ Search & Filtering
- Global search across all fields
- Individual field filtering
- Case-insensitive search
- Pagination support

### ✅ Bulk Import
- Import multiple records at once
- Error handling for individual records
- Detailed success/error reporting

### ✅ Validation
- Input validation using Joi schemas
- Required field validation
- Unique constraint on name field
- ObjectId validation for parameters

### ✅ Security
- Role-based access control
- Authentication middleware
- Input sanitization

## Required Permissions

The following permissions need to be configured in your role system:

### Business Masters
- `getBusinessMasters` - Read access
- `manageBusinessMasters` - Full CRUD access

### Entity Type Masters
- `getEntityTypeMasters` - Read access
- `manageEntityTypeMasters` - Full CRUD access

## Example Usage

### Creating a Business Master
```bash
curl -X POST http://localhost:3000/v1/business-master \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Technology Business"}'
```

### Searching Business Masters
```bash
curl -X GET "http://localhost:3000/v1/business-master?search=tech&limit=5" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Bulk Import
```bash
curl -X POST http://localhost:3000/v1/business-master/bulk-import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessMasters": [
      {"name": "Retail Business"},
      {"name": "Manufacturing Business"},
      {"name": "Service Business"}
    ]
  }'
```

## Integration with Existing System

These new APIs follow the same patterns as your existing system:
- Same middleware structure
- Same validation approach
- Same error handling
- Same authentication system
- Same response formats
- Same pagination system

The models are automatically included in your main models index and can be used throughout the system.

## ⚠️ IMPORTANT: Permission Setup Required

**Before using these APIs, you must add the following permissions to your role system:**

1. **For Business Master API:**
   - `getBusinessMasters` - Read access
   - `manageBusinessMasters` - Full CRUD access

2. **For Entity Type Master API:**
   - `getEntityTypeMasters` - Read access
   - `manageEntityTypeMasters` - Full CRUD access

**Current Issue:** The superadmin role doesn't have these permissions, which is why you're getting a 403 Forbidden error.

**Solution:** Add these permissions to your superadmin role or create a script to update existing roles with the new permissions.
