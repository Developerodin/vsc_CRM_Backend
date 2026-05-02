/**
 * Backfill metadata.gstState from timeline.state for GST activity rows where metadata is missing/out of sync.
 * Preserves existing metadata keys via $mergeObjects.
 *
 * Usage:
 *   node src/scripts/backfillGstMetadataFromTimelineState.js
 *   node src/scripts/backfillGstMetadataFromTimelineState.js --dry-run
 */
import mongoose from 'mongoose';
import config from '../config/config.js';
import { Timeline, Activity } from '../models/index.js';

const run = async () => {
  const dryRun = process.argv.includes('--dry-run');

  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');
    console.log(`📌 Backfill metadata.gstState from timeline.state${dryRun ? ' [dry-run]' : ''}\n`);

    const gstActivities = await Activity.find({ name: /GST/i }).select('_id name').lean();
    const gstActivityIds = gstActivities.map((a) => a._id);

    if (gstActivityIds.length === 0) {
      console.log('ℹ️ No GST activities found.');
      await mongoose.connection.close();
      return;
    }

    const filter = {
      activity: { $in: gstActivityIds },
      state: { $exists: true, $nin: [null, ''] },
      $or: [
        { metadata: { $exists: false } },
        { 'metadata.gstState': { $exists: false } },
        { 'metadata.gstState': null },
        { 'metadata.gstState': '' },
      ],
    };

    const count = await Timeline.countDocuments(filter);
    console.log(`📊 GST timelines with state set but missing metadata.gstState: ${count}`);

    if (count === 0) {
      await mongoose.connection.close();
      return;
    }

    if (dryRun) {
      const sample = await Timeline.find(filter).select('_id state metadata').limit(5).lean();
      console.log('🔒 Dry run sample:', JSON.stringify(sample, null, 2));
      console.log('🔒 Dry run: no updates. Run without --dry-run to apply.');
      await mongoose.connection.close();
      return;
    }

    const result = await Timeline.collection.updateMany(filter, [
      {
        $set: {
          metadata: {
            $mergeObjects: [{ $ifNull: ['$metadata', {}] }, { gstState: '$state' }],
          },
        },
      },
    ]);

    console.log(`✅ Matched ${result.matchedCount}, modified ${result.modifiedCount}`);
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed.');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

run();
