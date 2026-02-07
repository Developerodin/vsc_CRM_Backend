import mongoose from 'mongoose';
import config from '../config/config.js';
import Timeline from '../models/timeline.model.js';

/**
 * Reset timelines that have referenceNumber or completedAt set:
 * - Unset referenceNumber and completedAt
 * - Set status to 'pending'
 *
 * Usage:
 *   node src/scripts/resetTimelineReferenceAndCompleted.js           # run update
 *   node src/scripts/resetTimelineReferenceAndCompleted.js --dry-run   # only count, no update
 */
const run = async () => {
  const dryRun = process.argv.includes('--dry-run');

  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');

    const filter = {
      $or: [
        { referenceNumber: { $exists: true, $nin: [null, ''] } },
        { completedAt: { $exists: true, $ne: null } },
      ],
    };

    const count = await Timeline.countDocuments(filter);
    console.log(`📊 Timelines with referenceNumber or completedAt set: ${count}`);

    if (count === 0) {
      console.log('✅ Nothing to update.');
      await mongoose.connection.close();
      return;
    }

    if (dryRun) {
      console.log('🔍 Dry run: no updates applied. Run without --dry-run to apply.');
      await mongoose.connection.close();
      return;
    }

    const result = await Timeline.updateMany(filter, {
      $unset: { referenceNumber: '', completedAt: '' },
      $set: { status: 'pending' },
    });

    console.log(`✅ Updated ${result.modifiedCount} timeline(s).`);
    await mongoose.connection.close();
    console.log('\n✅ Done.');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

run();
