import mongoose from 'mongoose';
import config from '../config/config.js';
import Timeline from '../models/timeline.model.js';

/**
 * Normalize existing OneTime timelines: set period = 'OneTime', unset dueDate/startDate/endDate.
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   node src/scripts/normalizeOneTimeTimelines.js           # run update
 *   node src/scripts/normalizeOneTimeTimelines.js --dry-run # only report, no write
 */
const run = async () => {
  const dryRun = process.argv.includes('--dry-run');

  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');

    const filter = {
      $or: [
        { frequency: 'OneTime' },
        { timelineType: 'oneTime' },
      ],
    };

    const count = await Timeline.countDocuments(filter);
    console.log(`📊 Found ${count} timeline(s) with frequency OneTime or timelineType oneTime.\n`);

    if (count === 0) {
      console.log('Nothing to update.');
      await mongoose.connection.close();
      return;
    }

    if (dryRun) {
      const sample = await Timeline.find(filter).limit(5).lean();
      console.log('Sample (up to 5):');
      sample.forEach((t, i) => {
        console.log(
          `  ${i + 1}. _id=${t._id} period=${t.period} dueDate=${t.dueDate} frequency=${t.frequency} timelineType=${t.timelineType}`
        );
      });
      console.log('\nWould set period="OneTime" and unset dueDate, startDate, endDate for all above.');
      console.log('Run without --dry-run to apply.');
      await mongoose.connection.close();
      return;
    }

    const result = await Timeline.updateMany(filter, {
      $set: { period: 'OneTime' },
      $unset: {
        dueDate: '',
        startDate: '',
        endDate: '',
      },
    });

    // Mongoose / driver can return modifiedCount/matchedCount or legacy n/nModified
    const modified = result.modifiedCount ?? result.nModified ?? 0;
    const matched = result.matchedCount ?? result.n ?? 0;
    console.log(`✅ Updated ${modified} timeline(s). Matched: ${matched}.`);
    await mongoose.connection.close();
    console.log('\n✅ Done.');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

run();
