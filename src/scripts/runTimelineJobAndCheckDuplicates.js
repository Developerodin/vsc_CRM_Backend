/**
 * Run timeline generation (all frequencies) then check for duplicate recurring timelines.
 * Usage: node src/scripts/runTimelineJobAndCheckDuplicates.js
 */
import mongoose from 'mongoose';
import config from '../config/config.js';
import { generateRecurringTimelines } from '../jobs/timelineGenerator.job.js';
import { findDuplicateRecurringTimelines } from '../services/timelineDedupe.service.js';

const run = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');

    console.log('🔄 Running timeline generation (Daily + Monthly + Quarterly + Yearly)...\n');
    const results = await generateRecurringTimelines();
    console.log('\n📊 Timeline generation result:');
    console.log('   Daily:    processed', results.daily?.processed, 'created', results.daily?.created);
    console.log('   Monthly:  processed', results.monthly?.processed, 'created', results.monthly?.created);
    console.log('   Quarterly: processed', results.quarterly?.processed, 'created', results.quarterly?.created);
    console.log('   Yearly:   processed', results.yearly?.processed, 'created', results.yearly?.created);

    console.log('\n🔍 Checking for duplicate recurring timelines...');
    const { duplicateGroups, totalWouldDelete } = await findDuplicateRecurringTimelines();

    if (duplicateGroups.length === 0) {
      console.log('✅ No duplicate groups found. Cron did not create duplicates.\n');
    } else {
      console.log(`❌ Found ${duplicateGroups.length} duplicate group(s), ${totalWouldDelete} duplicate doc(s) would be removed:`);
      duplicateGroups.slice(0, 10).forEach((g, i) => {
        console.log(`   ${i + 1}. client=${g.client} activity=${g.activity} period=${g.period} count=${g.count}`);
      });
      if (duplicateGroups.length > 10) {
        console.log(`   ... and ${duplicateGroups.length - 10} more`);
      }
      console.log('');
    }

    await mongoose.connection.close();
    console.log('✅ Done.');
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

run();
