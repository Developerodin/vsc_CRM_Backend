/**
 * Backfill timeline entries for the previous financial year.
 * Uses upsert: if an entry for that period already exists, it is skipped (no duplicate).
 * No changes to cron — this is a one-time/on-demand script so users can enter previous year data.
 *
 * Usage: node src/scripts/backfillPreviousFyTimelines.js
 * Optional: node src/scripts/backfillPreviousFyTimelines.js --dry-run  (report only, no insert)
 */
import mongoose from 'mongoose';
import config from '../config/config.js';
import { Client } from '../models/index.js';
import { upsertRecurringTimeline } from '../services/timelineUpsert.service.js';
import { calculateDueDate } from '../jobs/timelineGenerator/dueDate.js';
import {
  getMonthlyPeriodsForFY,
  getQuarterlyPeriodsForFY,
  getYearlyPeriodForFY,
  getPreviousFYStartYear,
} from './previousFyPeriods.js';

const run = async () => {
  const dryRun = process.argv.includes('--dry-run');
  const prevFYStart = getPreviousFYStartYear();
  const prevFYString = `${prevFYStart}-${prevFYStart + 1}`;

  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');
    console.log(`📅 Backfilling timelines for previous FY: ${prevFYString}`);
    if (dryRun) console.log('   (dry run — no inserts)\n');
    else console.log('');

    const clients = await Client.find({
      'activities.0': { $exists: true },
      status: 'active',
    }).populate('activities.activity');

    let totalProcessed = 0;
    let totalCreated = 0;

    const monthlyPeriods = getMonthlyPeriodsForFY(prevFYStart);
    const quarterlyPeriods = getQuarterlyPeriodsForFY(prevFYStart);
    const yearlyPeriod = getYearlyPeriodForFY(prevFYStart);

    for (const client of clients) {
      for (const clientActivity of client.activities) {
        if (clientActivity.status !== 'active') continue;

        const activity = clientActivity.activity;
        if (!activity?.subactivities) continue;

        for (const subactivity of activity.subactivities) {
          const freq = subactivity.frequency;
          if (freq !== 'Monthly' && freq !== 'Quarterly' && freq !== 'Yearly') continue;

          if (clientActivity.subactivity) {
            const assignedId = clientActivity.subactivity._id || clientActivity.subactivity;
            if (assignedId.toString() !== subactivity._id.toString()) continue;
          }

          const periods =
            freq === 'Monthly'
              ? monthlyPeriods
              : freq === 'Quarterly'
                ? quarterlyPeriods
                : [yearlyPeriod];

          for (const period of periods) {
            totalProcessed++;
            if (dryRun) continue;

            const dueDate = calculateDueDate(freq, subactivity.frequencyConfig || {}, period);
            const { created } = await upsertRecurringTimeline({
              clientId: client._id,
              activityId: activity._id,
              branchId: client.branch,
              period,
              dueDate,
              subactivity,
              financialYear: prevFYString,
            });
            if (created) totalCreated++;
          }
        }
      }
    }

    if (dryRun) {
      console.log(`📊 Would process ${totalProcessed} period(s) for previous FY ${prevFYString}.`);
    } else {
      console.log(`📊 Processed ${totalProcessed} period(s), created ${totalCreated} new timeline(s).`);
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
