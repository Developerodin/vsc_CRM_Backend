/**
 * Backfill GST timelines per state for existing clients.
 * Creates/upsserts one recurring timeline per GST number/state for GST-related subactivities.
 *
 * Usage:
 *   node src/scripts/backfillGstTimelines.js
 *   node src/scripts/backfillGstTimelines.js --dry-run  (report only)
 */
import mongoose from 'mongoose';
import config from '../config/config.js';
import { Client } from '../models/index.js';
import { upsertRecurringTimeline } from '../services/timelineUpsert.service.js';
import { calculateDueDate } from '../jobs/timelineGenerator/dueDate.js';
import { getPeriodFromDate } from '../jobs/timelineGenerator/period.js';
import { getCurrentFinancialYear } from '../utils/financialYear.js';

const isGstRelatedSubactivity = (subactivity) => {
  if (!subactivity) return false;
  const name = (subactivity.name || '').toLowerCase();
  if (name.includes('gst')) return true;
  if (Array.isArray(subactivity.fields)) {
    return subactivity.fields.some((field) => (field.name || '').toLowerCase().includes('gst'));
  }
  return false;
};

const run = async () => {
  const dryRun = process.argv.includes('--dry-run');
  const { yearString: financialYear } = getCurrentFinancialYear();

  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');
    console.log(`📌 Backfilling GST timelines (per state) for existing clients${dryRun ? ' [dry-run]' : ''}`);

    const clients = await Client.find({
      'activities.0': { $exists: true },
      'gstNumbers.0': { $exists: true },
      status: 'active',
    }).populate('activities.activity');

    let processed = 0;
    let created = 0;
    let skippedInvalidDate = 0;
    let duplicateKeySkipped = 0;

    for (const client of clients) {
      for (const clientActivity of client.activities) {
        if (clientActivity.status !== 'active') continue;
        const activity = clientActivity.activity;
        if (!activity?.subactivities) continue;

        for (const subactivity of activity.subactivities) {
          // Only handle recurring GST subactivities
          const freq = subactivity.frequency;
          if (!freq || !['Daily', 'Monthly', 'Quarterly', 'Yearly'].includes(freq)) continue;

          // Respect explicitly assigned subactivity
          if (clientActivity.subactivity) {
            const assignedSubactivityId = clientActivity.subactivity._id || clientActivity.subactivity;
            if (assignedSubactivityId.toString() !== subactivity._id.toString()) continue;
          }

          if (!isGstRelatedSubactivity(subactivity)) continue;
          const gstNumbers = Array.isArray(client.gstNumbers) ? client.gstNumbers : [];
          if (gstNumbers.length === 0) continue;

          for (const gstNumber of gstNumbers) {
            processed++;

            const currentPeriod = getPeriodFromDate(new Date(), freq);
            const dueDate = calculateDueDate(freq, subactivity.frequencyConfig || {}, currentPeriod);
            if (!dueDate || Number.isNaN(dueDate.getTime())) {
              skippedInvalidDate++;
              continue;
            }

            if (dryRun) continue;

            try {
              const { created: wasCreated } = await upsertRecurringTimeline({
                clientId: client._id,
                activityId: activity._id,
                branchId: client.branch,
                period: currentPeriod,
                dueDate,
                subactivity,
                financialYear,
                state: gstNumber.state,
                metadata: {
                  gstNumber: gstNumber.gstNumber,
                  gstState: gstNumber.state,
                  gstUserId: gstNumber.gstUserId,
                  gstId: gstNumber._id?.toString() || gstNumber._id,
                },
              });

              if (wasCreated) {
                created++;
                console.log(
                  `✅ Created GST timeline | Client: ${client.name} | Activity: ${activity.name} | Subactivity: ${subactivity.name} | State: ${gstNumber.state} | Period: ${currentPeriod}`
                );
              }
            } catch (err) {
              // Handle legacy unique index (client, activity, subactivityId, period) blocking per-state inserts
              if (err?.code === 11000) {
                duplicateKeySkipped++;
                if (duplicateKeySkipped === 1) {
                  console.warn(
                    '⚠️ Duplicate key on (client, activity, subactivityId, period). Drop legacy index `client_1_activity_1_subactivityId_1_period_1` to allow per-state GST timelines.'
                  );
                }
                continue;
              }
              throw err;
            }
          }
        }
      }
    }

    if (dryRun) {
      console.log(
        `\n📊 Dry-run summary: would process ${processed} GST timelines. Invalid dates skipped: ${skippedInvalidDate}. Duplicate-key skips: ${duplicateKeySkipped}.`
      );
    } else {
      console.log(
        `\n📊 Done. Processed ${processed} GST timeline candidates. Created ${created}. Invalid dates skipped: ${skippedInvalidDate}. Duplicate-key skips: ${duplicateKeySkipped}.`
      );
    }

    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed.');
  } catch (error) {
    console.error('❌ Error during GST timeline backfill:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

run();
