import mongoose from 'mongoose';
import config from '../config/config.js';
import {
  findDuplicateRecurringTimelines,
  removeDuplicateRecurringTimelines,
} from '../services/timelineDedupe.service.js';

/**
 * Script to find and remove duplicate recurring timelines.
 * Duplicates = same (client, activity, subactivityId, period). Keeps oldest (by createdAt), deletes rest.
 *
 * Usage:
 *   node src/scripts/removeDuplicateTimelines.js           # run cleanup
 *   node src/scripts/removeDuplicateTimelines.js --dry-run # only report, no delete
 */
const run = async () => {
  const dryRun = process.argv.includes('--dry-run');

  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');

    if (dryRun) {
      console.log('🔍 Dry run: finding duplicate recurring timelines (no delete)...\n');
      const { duplicateGroups, totalWouldDelete } = await findDuplicateRecurringTimelines();

      if (duplicateGroups.length === 0) {
        console.log('✅ No duplicate groups found.');
        await mongoose.connection.close();
        return;
      }

      console.log(`📊 Found ${duplicateGroups.length} duplicate group(s), ${totalWouldDelete} timeline(s) would be deleted:\n`);
      duplicateGroups.forEach((g, i) => {
        console.log(`   ${i + 1}. client=${g.client} activity=${g.activity} subactivityId=${g.subactivityId} period=${g.period} count=${g.count} → would delete ${g.wouldDelete}`);
      });
      console.log(`\nRun without --dry-run to remove duplicates.`);
    } else {
      console.log('🧹 Removing duplicate recurring timelines (keeping oldest per group)...\n');
      const result = await removeDuplicateRecurringTimelines();

      if (result.deleted === 0) {
        console.log('✅ No duplicates found; nothing deleted.');
      } else {
        console.log(`✅ Deleted ${result.deleted} duplicate timeline(s) across ${result.duplicateGroups} group(s).`);
      }
    }

    await mongoose.connection.close();
    console.log('\n✅ Done.');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

run();
