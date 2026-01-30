/**
 * 1. Remove ALL recurring timelines for the previous financial year (GST, TDS, ROC, ITR, etc.).
 * 2. Create previous FY timelines ONLY for ITR (Income Tax > Income Tax Return) so users can enter previous year ITR.
 *
 * Usage: node src/scripts/backfillPreviousFyItrOnly.js
 *        node src/scripts/backfillPreviousFyItrOnly.js --dry-run  (report only, no delete/insert)
 */
import mongoose from 'mongoose';
import config from '../config/config.js';
import { Client, Activity, Timeline } from '../models/index.js';
import { upsertRecurringTimeline } from '../services/timelineUpsert.service.js';
import { calculateDueDate } from '../jobs/timelineGenerator/dueDate.js';
import {
  getAllPeriodsForFY,
  getYearlyPeriodForFY,
  getPreviousFYStartYear,
} from './previousFyPeriods.js';

const ITR_ACTIVITY_NAME = 'Income Tax';
const ITR_SUBACTIVITY_NAME = 'Income Tax Return';

const run = async () => {
  const dryRun = process.argv.includes('--dry-run');
  const prevFYStart = getPreviousFYStartYear();
  const prevFYString = `${prevFYStart}-${prevFYStart + 1}`;
  const previousFYPeriods = getAllPeriodsForFY(prevFYStart);

  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');
    console.log(`📅 Previous FY: ${prevFYString}`);
    if (dryRun) console.log('   (dry run — no delete/insert)\n');
    else console.log('');

    // Step 1: Delete all recurring timelines whose period is in previous FY
    const deleteFilter = {
      timelineType: 'recurring',
      period: { $in: previousFYPeriods },
    };
    const toDelete = await Timeline.countDocuments(deleteFilter);
    console.log(`🗑  Step 1: Found ${toDelete} recurring timeline(s) for previous FY (all activities).`);

    if (!dryRun && toDelete > 0) {
      const deleteResult = await Timeline.deleteMany(deleteFilter);
      console.log(`   Deleted ${deleteResult.deletedCount} timeline(s).\n`);
    } else if (dryRun && toDelete > 0) {
      console.log(`   Would delete ${toDelete} timeline(s).\n`);
    } else {
      console.log('   Nothing to delete.\n');
    }

    // Step 2: Create previous FY timelines only for ITR (Income Tax > Income Tax Return)
    const incomeTaxActivity = await Activity.findOne({ name: ITR_ACTIVITY_NAME });
    if (!incomeTaxActivity) {
      console.log(`⚠️  Activity "${ITR_ACTIVITY_NAME}" not found. Skipping ITR backfill.`);
      await mongoose.connection.close();
      console.log('\n✅ Done.');
      return;
    }

    const itrSubactivity = incomeTaxActivity.subactivities?.find(
      (s) => (s.name || '').trim() === ITR_SUBACTIVITY_NAME
    );
    if (!itrSubactivity) {
      console.log(`⚠️  Subactivity "${ITR_SUBACTIVITY_NAME}" not found in "${ITR_ACTIVITY_NAME}". Skipping ITR backfill.`);
      await mongoose.connection.close();
      console.log('\n✅ Done.');
      return;
    }

    const clients = await Client.find({
      'activities.0': { $exists: true },
      status: 'active',
    }).populate('activities.activity');

    let itrProcessed = 0;
    let itrCreated = 0;
    const yearlyPeriod = getYearlyPeriodForFY(prevFYStart);

    for (const client of clients) {
      const clientActivity = client.activities?.find(
        (a) =>
          a.status === 'active' &&
          a.activity &&
          (a.activity._id?.toString() === incomeTaxActivity._id.toString() || a.activity.name === ITR_ACTIVITY_NAME)
      );
      if (!clientActivity) continue;

      const assignedSub = clientActivity.subactivity?._id || clientActivity.subactivity;
      if (assignedSub && assignedSub.toString() !== itrSubactivity._id.toString()) continue;

      itrProcessed++;
      if (dryRun) {
        itrCreated++;
        continue;
      }

      const dueDate = calculateDueDate('Yearly', itrSubactivity.frequencyConfig || {}, yearlyPeriod);
      const { created } = await upsertRecurringTimeline({
        clientId: client._id,
        activityId: incomeTaxActivity._id,
        branchId: client.branch,
        period: yearlyPeriod,
        dueDate,
        subactivity: itrSubactivity,
        financialYear: prevFYString,
      });
      if (created) itrCreated++;
    }

    console.log(`📋 Step 2: ITR (Income Tax Return) for previous FY ${prevFYString}`);
    if (dryRun) {
      console.log(`   Would ensure timelines for ${itrProcessed} client(s); would create up to ${itrProcessed} if missing.`);
    } else {
      console.log(`   Processed ${itrProcessed} client(s), created ${itrCreated} new ITR timeline(s).`);
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
