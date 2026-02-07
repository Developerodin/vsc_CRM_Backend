/**
 * Create timeline entries for FY 2024-2025 for clients that have
 * Auditing, ROC - PVT. LTD., or ROC - LLP activities.
 *
 * Uses upsert: existing timeline for same (client, activity, subactivity, period) is skipped.
 *
 * Usage:
 *   node src/scripts/createAuditingRocTimelines2024_2025.js           # run
 *   node src/scripts/createAuditingRocTimelines2024_2025.js --dry-run  # report only
 */
import mongoose from 'mongoose';
import config from '../config/config.js';
import { Client, Activity } from '../models/index.js';
import { upsertRecurringTimeline } from '../services/timelineUpsert.service.js';
import { calculateDueDate } from '../jobs/timelineGenerator/dueDate.js';
import {
  getMonthlyPeriodsForFY,
  getQuarterlyPeriodsForFY,
  getYearlyPeriodForFY,
} from './previousFyPeriods.js';

const TARGET_ACTIVITY_NAMES = ['Auditing', 'ROC - PVT. LTD.', 'ROC - LLP'];
const FY_START_YEAR = 2024;
const FY_STRING = `${FY_START_YEAR}-${FY_START_YEAR + 1}`;

const run = async () => {
  const dryRun = process.argv.includes('--dry-run');

  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');
    console.log(`📅 Creating timelines for FY: ${FY_STRING}`);
    console.log(`   Activities: ${TARGET_ACTIVITY_NAMES.join(', ')}`);
    if (dryRun) console.log('   (dry run — no inserts)\n');
    else console.log('');

    const activities = await Activity.find({
      name: { $in: TARGET_ACTIVITY_NAMES },
    });
    if (activities.length === 0) {
      console.log('❌ No activities found with names:', TARGET_ACTIVITY_NAMES);
      await mongoose.connection.close();
      process.exit(1);
    }
    const activityIds = activities.map((a) => a._id);
    console.log(`   Found ${activities.length} activity/activities: ${activities.map((a) => a.name).join(', ')}\n`);

    const clients = await Client.find({
      'activities.activity': { $in: activityIds },
      status: 'active',
    }).populate('activities.activity');

    console.log(`   Clients with these activities: ${clients.length}\n`);

    const monthlyPeriods = getMonthlyPeriodsForFY(FY_START_YEAR);
    const quarterlyPeriods = getQuarterlyPeriodsForFY(FY_START_YEAR);
    const yearlyPeriod = getYearlyPeriodForFY(FY_START_YEAR);

    let totalProcessed = 0;
    let totalCreated = 0;

    for (const client of clients) {
      for (const clientActivity of client.activities) {
        if (clientActivity.status !== 'active') continue;

        const activity = clientActivity.activity;
        if (!activity || !activityIds.some((id) => id.toString() === activity._id.toString())) continue;
        if (!activity.subactivities?.length) continue;

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
              financialYear: FY_STRING,
            });
            if (created) totalCreated++;
          }
        }
      }
    }

    if (dryRun) {
      console.log(`📊 Would process ${totalProcessed} period(s) for FY ${FY_STRING}.`);
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
