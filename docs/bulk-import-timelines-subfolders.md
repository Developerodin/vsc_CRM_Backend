# Bulk Import with Automatic Timeline and Subfolder Creation

## Overview

The client bulk import system has been enhanced to automatically create timelines and subfolders for each imported client, even when using `insertMany()` operations that don't trigger individual `save` events.

## What's New

### 1. Enhanced Bulk Import Function
The `bulkImportClients` function now:
- Creates client subfolders in the FileManager system
- Generates timelines for activities with frequency configurations
- Processes these operations in optimized batches to handle large datasets (like 893 clients)
- Provides detailed progress logging and error handling

### 2. Helper Functions
- `createClientSubfolder()` - Creates/ensures client subfolder exists
- `createClientTimelines()` - Creates timelines for client activities
- `reprocessExistingClients()` - Reprocesses existing clients to create missing timelines/subfolders

### 3. Progress Monitoring
- Real-time progress logging during bulk operations
- Batch processing information
- Performance metrics (time taken, success rates)
- Detailed error reporting

## How It Works

### During Bulk Import
1. **Client Creation**: Clients are inserted using `insertMany()`
2. **Post-Processing**: After successful insertion, subfolders and timelines are created
3. **Batch Processing**: Operations are processed in smaller batches (20 clients at a time) to avoid overwhelming the system
4. **Error Handling**: Individual failures don't stop the entire process

### Timeline Creation Logic
- Only creates timelines for activities that have `frequency` and `frequencyConfig` set
- Sets start date to current date
- Sets end date to 1 year from current date
- Status is set to 'pending'

### Subfolder Creation Logic
- Creates a parent 'Clients' folder if it doesn't exist
- Creates individual client subfolders under the parent
- Uses client name for folder naming
- Includes metadata linking to the client

## Usage

### Standard Bulk Import
```javascript
import { bulkImportClients } from '../services/client.service.js';

const results = await bulkImportClients(clients);
console.log(`Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors.length}`);
```

### Reprocessing Existing Clients
```javascript
import { reprocessExistingClients } from '../services/client.service.js';

// Reprocess all clients
const results = await reprocessExistingClients();

// Reprocess specific clients (e.g., by branch)
const results = await reprocessExistingClients({ branch: 'branch-id' });

// Custom batch size
const results = await reprocessExistingClients({}, 100);
```

### Using the Utility Script
```bash
# Navigate to your project directory
cd /path/to/your/project

# Run the reprocessing script
node scripts/reprocess-clients.js
```

## Configuration

### Batch Sizes
- **Main Import**: 100 clients per batch (configurable via `BATCH_SIZE`)
- **Post-Processing**: 20 clients per batch (configurable via `POST_PROCESS_BATCH_SIZE`)
- **Reprocessing**: 50 clients per batch (configurable)

### Performance Considerations
- Larger batch sizes = faster processing but higher memory usage
- Smaller batch sizes = slower processing but more stable
- Recommended: Start with default values and adjust based on your system performance

## Error Handling

### Types of Errors
1. **Import Errors**: Issues during client creation/update
2. **Post-Processing Errors**: Issues during subfolder/timeline creation
3. **Validation Errors**: Data validation failures

### Error Recovery
- Individual client failures don't stop the entire process
- All errors are logged with detailed information
- Failed clients can be reprocessed using the reprocessing function

## Monitoring and Logging

### Console Output
```
Starting bulk import of 893 clients...
Processing 893 clients for creation in batches of 100...
Processing creation batch 1/9 (100 clients)...
Creating subfolders and timelines for 100 newly created clients...
Post-processing batch 1/5...
...
Bulk import completed in 45.23 seconds
Results: 893 created, 0 updated, 0 errors
Total processed: 893/893
```

### Performance Metrics
- Total processing time
- Clients processed per second
- Success/failure rates
- Memory usage patterns

## Troubleshooting

### Common Issues
1. **Memory Issues**: Reduce batch sizes
2. **Timeout Errors**: Increase timeout limits or reduce batch sizes
3. **Duplicate Folders**: The system automatically handles existing folders
4. **Timeline Creation Failures**: Check activity frequency configurations

### Debug Mode
Enable detailed logging by setting environment variable:
```bash
DEBUG=bulk-import node your-script.js
```

## Best Practices

1. **Test First**: Always test with a small dataset before processing large imports
2. **Monitor Resources**: Watch memory and CPU usage during large imports
3. **Backup Data**: Ensure you have backups before running large operations
4. **Off-Peak Hours**: Run large imports during low-traffic periods
5. **Incremental Processing**: For very large datasets, consider processing in chunks over time

## Example: Processing 893 Clients

```javascript
// Import 893 clients with automatic timeline/subfolder creation
const clients = [/* your 893 client objects */];

try {
  const results = await bulkImportClients(clients);
  
  if (results.errors.length > 0) {
    console.log('Some clients had issues during post-processing:');
    results.errors.forEach(error => {
      console.log(`- ${error.data.name}: ${error.error}`);
    });
  }
  
  console.log(`Successfully processed ${results.created + results.updated} clients`);
  
} catch (error) {
  console.error('Bulk import failed:', error);
}
```

## Support

If you encounter issues:
1. Check the console logs for detailed error information
2. Verify your MongoDB connection and permissions
3. Ensure all required models (FileManager, Timeline) are properly configured
4. Check that activities have proper frequency configurations for timeline creation
