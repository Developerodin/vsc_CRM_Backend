# Frequency Status Migration Guide

This guide explains how to migrate existing timeline data to include the new `frequencyStatus` field.

## Overview

The migration script will:
1. Find all existing timelines without `frequencyStatus` field
2. Generate frequency periods based on timeline frequency and date range
3. Set appropriate initial status based on existing timeline status
4. Update the database with the new frequency status data

## Prerequisites

- Node.js installed
- MongoDB connection configured
- Environment variables set up (`.env` file)

## Running the Migration

### 1. Run the Migration Script

```bash
npm run migrate:frequency-status
```

Or directly:

```bash
node scripts/migrate-frequency-status-console.js
```

### 2. Test the Migration

After running the migration, verify it worked correctly:

```bash
npm run test:migration
```

Or directly:

```bash
node scripts/test-migration-console.js
```

## What the Migration Does

### For Timelines with Start/End Dates

The script will generate frequency periods based on the timeline's frequency type:

- **Hourly**: Creates periods like "2024-01-15-14" (YYYY-MM-DD-HH)
- **Daily**: Creates periods like "2024-01-15" (YYYY-MM-DD)
- **Weekly**: Creates periods like "2024-W03" (YYYY-WweekNumber)
- **Monthly**: Creates periods like "2024-01" (YYYY-MM)
- **Quarterly**: Creates periods like "2024-Q1" (YYYY-QquarterNumber)
- **Yearly**: Creates periods like "2024" (YYYY)

### For Timelines without Start/End Dates

The script will create a single period based on the current date and frequency type.

### Status Mapping

The migration maps existing timeline status to frequency status:

- **Completed timelines**: All periods marked as completed
- **Delayed timelines**: First period marked as delayed, rest as pending
- **Ongoing timelines**: First period marked as ongoing, rest as pending
- **Pending timelines**: All periods marked as pending

## Example Migration Output

```
Starting frequency status migration...
Found 14 timelines to migrate
Migrated timeline 685beaabbc78e6a52fdfe691 with 1 frequency periods
Migrated timeline 685cd3febd1d4a19f158375e with 1 frequency periods
Migrated timeline 685cd432bd1d4a19f1583794 with 1 frequency periods
Migrated timeline 685cd466bd1d4a19f15837ca with 11 frequency periods
...
Migration completed!
- Migrated: 14 timelines
- Skipped: 0 timelines
- Errors: 0 timelines
Verification:
- Total timelines: 14
- Timelines with frequency status: 14
```

## Rollback (If Needed)

If you need to rollback the migration, you can run this MongoDB command:

```javascript
// Connect to your MongoDB database
db.timelines.updateMany(
  { frequencyStatus: { $exists: true } },
  { $unset: { frequencyStatus: 1 } }
);
```

## Troubleshooting

### Common Issues

1. **Connection Error**: Make sure your `.env` file has the correct `MONGODB_URL`
2. **Permission Error**: Ensure your MongoDB user has write permissions
3. **Memory Error**: For large datasets, the script processes timelines one by one to avoid memory issues

### Logs

The script provides detailed logging:
- Progress updates for each timeline
- Error messages for failed migrations
- Final statistics and verification

### Manual Verification

You can manually check the migration by querying your database:

```javascript
// Check timelines with frequency status
db.timelines.find({ frequencyStatus: { $exists: true } }).count()

// Check a specific timeline
db.timelines.findOne({ _id: ObjectId("your-timeline-id") })
```

## Post-Migration

After the migration:

1. **Test the new API endpoints** to ensure they work with the migrated data
2. **Update your frontend** to use the new frequency status features
3. **Monitor the application** to ensure everything works as expected

## Support

If you encounter any issues during migration:

1. Check the logs for specific error messages
2. Verify your database connection and permissions
3. Test with a small subset of data first
4. Contact the development team if issues persist 