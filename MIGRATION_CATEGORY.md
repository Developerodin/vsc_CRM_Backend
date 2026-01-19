# Client Category Field Migration

## Overview
This migration adds a mandatory `category` field to all Client records in the database. The field accepts only three values: `A`, `B`, or `C`, with `C` as the default.

## Changes Made

### 1. Database Schema Updates
- Added `category` field to Client model
- Field configuration:
  - **Type**: String
  - **Required**: Yes
  - **Enum**: ['A', 'B', 'C']
  - **Default**: 'C'
  - **Indexed**: Yes (for better query performance)

### 2. API Validation Updates
- `createClient`: Validates category and sets default 'C' if not provided
- `updateClientById`: Validates category value when updating
- `bulkImportClients`: Handles category validation for bulk operations
- `queryClients`: Supports filtering by category

### 3. Validation Rules
- Only accepts values: `A`, `B`, or `C`
- If no category is provided during client creation, defaults to `C`
- Returns error if invalid category value is provided

## Running the Migration

### Option 1: Using the Migration Script (Recommended)

Run the migration script to update all existing clients:

```bash
node src/scripts/migrateClientCategory.js
```

This script will:
- Connect to your MongoDB database
- Find all clients without a category
- Set their category to 'C' (default value)
- Display statistics about the migration
- Show the category distribution after migration

### Option 2: Using MongoDB Shell

If you prefer to run the migration manually:

```javascript
// Connect to your database
use your_database_name;

// Update all clients without category
db.clients.updateMany(
  {
    $or: [
      { category: { $exists: false } },
      { category: null },
      { category: '' }
    ]
  },
  {
    $set: { category: 'C' }
  }
);

// Verify the migration
db.clients.countDocuments({
  $or: [
    { category: { $exists: false } },
    { category: null },
    { category: '' }
  ]
});
// Should return 0

// Check category distribution
db.clients.aggregate([
  {
    $group: {
      _id: '$category',
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]);
```

### Option 3: Using MongoDB Compass

1. Open MongoDB Compass and connect to your database
2. Navigate to the `clients` collection
3. Open the Aggregation tab
4. Run the following aggregation:

```javascript
[
  {
    $match: {
      $or: [
        { category: { $exists: false } },
        { category: null },
        { category: '' }
      ]
    }
  },
  {
    $addFields: {
      category: 'C'
    }
  },
  {
    $merge: {
      into: 'clients',
      whenMatched: 'merge'
    }
  }
]
```

## Verification

After running the migration, verify that all clients have a category:

```javascript
// Count clients without category (should be 0)
db.clients.countDocuments({
  $or: [
    { category: { $exists: false } },
    { category: null },
    { category: '' }
  ]
});

// View category distribution
db.clients.aggregate([
  {
    $group: {
      _id: '$category',
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: 1 } }
]);
```

## API Usage Examples

### Creating a Client with Category

```javascript
// With explicit category
POST /clients
{
  "name": "John Doe",
  "branch": "branch_id",
  "category": "A",
  // ... other fields
}

// Without category (defaults to 'C')
POST /clients
{
  "name": "Jane Smith",
  "branch": "branch_id",
  // category will be set to 'C' automatically
  // ... other fields
}
```

### Updating Client Category

```javascript
PATCH /clients/:id
{
  "category": "B"
}
```

### Filtering Clients by Category

```javascript
GET /clients?category=A
GET /clients?category=B
GET /clients?category=C
```

## Error Handling

If an invalid category value is provided, the API will return:

```json
{
  "code": 400,
  "message": "Invalid category. Allowed values are: A, B, C"
}
```

## Rollback (If Needed)

If you need to rollback the migration:

```javascript
// Remove category field from all clients
db.clients.updateMany(
  {},
  {
    $unset: { category: "" }
  }
);
```

**Note**: Rolling back will require reverting the code changes as well, since the field is now required in the schema.

## Support

For any issues or questions regarding this migration, please contact the development team.
