# Enhanced Search Functions for File Manager

## Overview

The file manager service now includes enhanced search capabilities that can search through subfolders, folder paths, and provide recursive search functionality. This solves the issue where the original search only looked at root-level names.

## What Was Fixed

### 1. **Enhanced Subfolder Search Support**
- Added `includeSubfolders` parameter to file-manager search validation
- Updated controller to properly handle subfolder search requests
- Fixed service logic to maintain search capabilities when filtering by userId
- Default behavior now includes subfolder searches by default

### 2. **Search Parameters**
The search endpoint now supports:
- `query`: Required search term
- `type`: Optional filter for 'folder' or 'file'
- `userId`: Optional filter for specific user's items
- `includeSubfolders`: Optional boolean (defaults to true)
- `sortBy`: Optional sorting
- `limit`: Optional pagination limit (1-100)
- `page`: Optional page number

### 3. **Subfolder Search Examples**

#### Search for Client Subfolders
```bash
GET /v1/file-manager/search?query=ClientName&includeSubfolders=true
```

#### Search for Specific Subfolder Paths
```bash
GET /v1/file-manager/search?query=Abh&includeSubfolders=true
```

#### Search Only Files (exclude subfolder search)
```bash
GET /v1/file-manager/search?query=document&type=file&includeSubfolders=false
```

#### Search with User Filter
```bash
GET /v1/file-manager/search?query=project&userId=123&includeSubfolders=true
```

### 4. **What Gets Searched**
When `includeSubfolders=true` (default):
- Folder names
- File names  
- Folder paths (including subfolder paths)
- Folder descriptions
- File metadata

### 5. **Performance Notes**
- Subfolder search is enabled by default for better user experience
- Use `includeSubfolders=false` only when you specifically want to exclude path-based searches
- The search uses case-insensitive regex matching for comprehensive results

## New Search Functions

### 1. Enhanced `searchItems` Function

**What it does:**
- Searches in folder names, file names, folder paths, and descriptions
- Includes option to specifically search subfolders
- Maintains backward compatibility

**Usage:**
```javascript
// Basic search (now enhanced)
const results = await fileManagerService.searchItems({
  query: 'client',
  includeSubfolders: true
}, { limit: 10, page: 1 });

// Search with user filter
const results = await fileManagerService.searchItems({
  query: 'report',
  userId: 'userId123',
  type: 'file'
}, { limit: 20, page: 1 });
```

**Search Fields:**
- `folder.name` - Folder names
- `file.fileName` - File names  
- `folder.path` - Full folder paths (e.g., `/Clients/JohnDoe/Documents`)
- `folder.description` - Folder descriptions

### 2. New `searchItemsRecursive` Function

**What it does:**
- Performs comprehensive search through ALL subfolders
- Combines folder and file results
- Provides detailed logging for debugging
- Handles pagination manually for combined results

**Usage:**
```javascript
const results = await fileManagerService.searchItemsRecursive({
  query: 'subfolder'
}, { limit: 15, page: 1 });
```

**Features:**
- Searches both folders and files simultaneously
- Combines results and sorts them (folders first, then files)
- Applies pagination to combined results
- Detailed logging for troubleshooting

### 3. New `searchSubfoldersByName` Function

**What it does:**
- Specifically designed for finding subfolders
- Can search by name or path
- Optional filtering by parent folder or user
- Optimized for subfolder searches

**Usage:**
```javascript
// Search all subfolders with name containing "client"
const results = await fileManagerService.searchSubfoldersByName('client', {
  limit: 10,
  page: 1
});

// Search subfolders within a specific parent folder
const results = await fileManagerService.searchSubfoldersByName('documents', {
  parentFolder: 'parentFolderId123',
  limit: 5,
  page: 1
});

// Search subfolders created by specific user
const results = await fileManagerService.searchSubfoldersByName('project', {
  userId: 'userId123',
  limit: 10,
  page: 1
});
```

## Search Examples

### Example 1: Find All Client Subfolders

```javascript
// This will find folders like:
// - /Clients/JohnDoe
// - /Clients/JaneSmith  
// - /Clients/CompanyABC
const clientFolders = await fileManagerService.searchSubfoldersByName('client', {
  limit: 50,
  page: 1
});
```

### Example 2: Search by Path

```javascript
// This will find items in paths containing "/Clients"
const clientItems = await fileManagerService.searchItems({
  query: '/Clients',
  includeSubfolders: true
}, { limit: 20, page: 1 });
```

### Example 3: Recursive Search for Documents

```javascript
// This will search ALL subfolders for documents
const allDocuments = await fileManagerService.searchItemsRecursive({
  query: 'document'
}, { limit: 30, page: 1 });
```

### Example 4: Find Specific Subfolder Structure

```javascript
// Find all folders named "Documents" anywhere in the structure
const documentFolders = await fileManagerService.searchSubfoldersByName('Documents', {
  limit: 100,
  page: 1
});

// Results might include:
// - /Clients/JohnDoe/Documents
// - /Clients/JaneSmith/Documents  
// - /Projects/ProjectA/Documents
// - /Internal/HR/Documents
```

## API Integration

### Controller Usage

```javascript
// In your file manager controller
const searchFiles = catchAsync(async (req, res) => {
  const { query, type, userId, includeSubfolders } = req.query;
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  
  let results;
  
  if (req.query.recursive === 'true') {
    // Use recursive search
    results = await fileManagerService.searchItemsRecursive(
      { query, type, userId }, 
      options
    );
  } else if (req.query.subfolders === 'true') {
    // Use subfolder-specific search
    results = await fileManagerService.searchSubfoldersByName(
      query, 
      { ...options, userId }
    );
  } else {
    // Use enhanced basic search
    results = await fileManagerService.searchItems(
      { query, type, userId, includeSubfolders }, 
      options
    );
  }
  
  res.send(results);
});
```

### Route Configuration

```javascript
// In your routes
router.get('/search', auth('getFileManager'), fileManagerController.searchFiles);

// Query parameters:
// - query: Search term
// - type: 'folder' or 'file' (optional)
// - userId: Filter by user (optional)
// - includeSubfolders: 'true' to include path search
// - recursive: 'true' for recursive search
// - subfolders: 'true' for subfolder-specific search
```

## Performance Considerations

### 1. **Indexing**
Ensure you have proper MongoDB indexes for optimal performance:

```javascript
// Recommended indexes
db.filemanagers.createIndex({ "folder.name": 1, "type": 1, "isDeleted": 1 });
db.filemanagers.createIndex({ "folder.path": 1, "type": 1, "isDeleted": 1 });
db.filemanagers.createIndex({ "file.fileName": 1, "type": 1, "isDeleted": 1 });
db.filemanagers.createIndex({ "folder.createdBy": 1, "type": 1, "isDeleted": 1 });
db.filemanagers.createIndex({ "file.uploadedBy": 1, "type": 1, "isDeleted": 1 });
```

### 2. **Pagination**
- Use reasonable limits (10-50 items per page)
- Implement cursor-based pagination for large datasets
- Consider caching frequently searched results

### 3. **Search Optimization**
- Use specific search functions for targeted queries
- Avoid recursive search for simple name searches
- Consider implementing search result caching

## Troubleshooting

### Common Issues

1. **No Results Found**
   - Check if the search term exists in paths
   - Verify the item is not soft-deleted
   - Check user permissions and branch access

2. **Slow Search Performance**
   - Ensure proper indexes are in place
   - Use specific search functions instead of recursive
   - Implement result caching

3. **Missing Subfolders**
   - Verify the folder structure is properly created
   - Check if parent-child relationships are correct
   - Ensure folder paths are properly set

### Debug Logging

The enhanced search functions include comprehensive logging:

```javascript
// Enable debug logging
console.log('🔍 Starting recursive search with filter:', filter);
console.log(`🔍 Found ${matchingFolders.length} matching folders`);
console.log(`🔍 Found ${matchingFiles.length} matching files`);
console.log(`🔍 Recursive search completed. Found ${totalResults} total items`);
```

## Migration Guide

### From Old Search to New Search

**Before (Limited):**
```javascript
const results = await fileManagerService.searchItems({
  query: 'client'
});
```

**After (Enhanced):**
```javascript
// Basic enhanced search
const results = await fileManagerService.searchItems({
  query: 'client',
  includeSubfolders: true
});

// Or use subfolder-specific search
const results = await fileManagerService.searchSubfoldersByName('client');

// Or use recursive search for comprehensive results
const results = await fileManagerService.searchItemsRecursive({
  query: 'client'
});
```

## Benefits

1. **🔍 Better Discovery**: Find files and folders anywhere in the structure
2. **📁 Subfolder Support**: Specifically designed for subfolder searches
3. **🛤️ Path-Based Search**: Search by folder paths and hierarchies
4. **⚡ Performance**: Optimized queries with proper indexing
5. **🔄 Flexibility**: Multiple search strategies for different use cases
6. **📊 Comprehensive Results**: Find items regardless of nesting level

## Future Enhancements

Potential improvements could include:
- Full-text search with Elasticsearch integration
- Search result highlighting
- Advanced filtering (date ranges, file types, sizes)
- Search result ranking and relevance scoring
- Search history and suggestions
- Bulk search operations
