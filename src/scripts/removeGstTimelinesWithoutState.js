/**
 * Remove GST timelines that do not have a state set.
 * Only deletes timelines whose activity is GST and state is null/empty/missing.
 * Does not touch non-GST timelines or GST timelines that have state.
 *
 * Usage:
 *   node src/scripts/removeGstTimelinesWithoutState.js
 *   node src/scripts/removeGstTimelinesWithoutState.js --dry-run  (report only, no delete)
 */
import mongoose from 'mongoose';
import config from '../config/config.js';
import { Timeline, Activity } from '../models/index.js';

const run = async () => {
  const dryRun = process.argv.includes('--dry-run');

  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');
    console.log(`📌 Removing GST timelines without state${dryRun ? ' [dry-run]' : ''}\n`);

    const gstActivities = await Activity.find({ name: /GST/i }).select('_id name').lean();
    const gstActivityIds = gstActivities.map((a) => a._id);

    if (gstActivityIds.length === 0) {
      console.log('ℹ️ No GST activities found. Nothing to remove.');
      await mongoose.connection.close();
      return;
    }

    const filter = {
      activity: { $in: gstActivityIds },
      $or: [{ state: null }, { state: { $exists: false } }, { state: '' }],
    };

    const count = await Timeline.countDocuments(filter);
    console.log(`📊 Found ${count} GST timeline(s) without state.`);

    if (count === 0) {
      console.log('✅ Nothing to remove.');
      await mongoose.connection.close();
      return;
    }

    if (dryRun) {
      console.log('🔒 Dry run: no documents deleted. Run without --dry-run to delete.');
      await mongoose.connection.close();
      return;
    }

    const result = await Timeline.deleteMany(filter);
    console.log(`✅ Deleted ${result.deletedCount} GST timeline(s) without state.`);

    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed.');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

run();
