/**
 * Migrate existing quarterly timelines to register quarter periods.
 * Register: July=Q1, October=Q2, January=Q3, May=Q4.
 *
 * Run: node scripts/migrate-quarterly-timeline-periods.js
 * Requires: MONGODB_URL in .env
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

/** Get period from dueDate using register quarters (July=Q1, Oct=Q2, Jan=Q3, May=Q4). */
function getPeriodFromDateRegister(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) return null;
  const month = date.getMonth();
  const year = date.getFullYear();
  const quarter = month <= 2 ? 'Q3' : month <= 5 ? 'Q4' : month <= 8 ? 'Q1' : 'Q2';
  return `${quarter}-${year}`;
}

const main = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const { default: Timeline } = await import('../src/models/timeline.model.js');

    const query = {
      $or: [
        { frequency: 'Quarterly' },
        { 'subactivity.frequency': 'Quarterly' },
      ],
    };
    const timelines = await Timeline.find(query).lean();
    console.log(`Found ${timelines.length} quarterly timelines`);

    let updated = 0;
    let skipped = 0;
    let noDueDate = 0;

    for (const doc of timelines) {
      const dueDate = doc.dueDate ? new Date(doc.dueDate) : null;
      if (!dueDate || isNaN(dueDate.getTime())) {
        noDueDate += 1;
        continue;
      }
      const correctPeriod = getPeriodFromDateRegister(dueDate);
      if (!correctPeriod) {
        skipped += 1;
        continue;
      }
      if (doc.period === correctPeriod) {
        skipped += 1;
        continue;
      }
      await Timeline.updateOne({ _id: doc._id }, { $set: { period: correctPeriod } });
      updated += 1;
      console.log(`  ${doc._id}: ${doc.period} -> ${correctPeriod}`);
    }

    console.log('\nDone.');
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped (unchanged or no dueDate): ${skipped + noDueDate}`);
    console.log(`  No dueDate: ${noDueDate}`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

main();
