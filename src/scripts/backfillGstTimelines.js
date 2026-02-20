/**
 * Backfill GST timelines per state for existing clients.
 * Creates/upserts one recurring timeline per GST number/state for GST-related subactivities.
 * Includes current FY periods (current + all previous months/quarters) so historical GST
 * data shows entries for every state.
 *
 * Usage:
 *   node src/scripts/backfillGstTimelines.js
 *   node src/scripts/backfillGstTimelines.js --dry-run  (report only)
 *   node src/scripts/backfillGstTimelines.js --include-previous-fy  (current + previous FY)
 */
import mongoose from 'mongoose';
import config from '../config/config.js';
import { Client } from '../models/index.js';
import { upsertRecurringTimeline } from '../services/timelineUpsert.service.js';
import { calculateDueDate } from '../jobs/timelineGenerator/dueDate.js';
import { getPeriodFromDate } from '../jobs/timelineGenerator/period.js';
import { getCurrentFinancialYear } from '../utils/financialYear.js';
import {
  getMonthlyPeriodsForFY,
  getQuarterlyPeriodsForFY,
  getYearlyPeriodForFY,
} from './previousFyPeriods.js';

const isGstRelatedSubactivity = (subactivity) => {
  if (!subactivity) return false;
  const name = (subactivity.name || '').toLowerCase();
  if (name.includes('gst')) return true;
  if (Array.isArray(subactivity.fields)) {
    return subactivity.fields.some((field) => (field.name || '').toLowerCase().includes('gst'));
  }
  return false;
};

/**
 * Get all period strings for a frequency in the given FY (and optionally previous FY).
 * @param {'Daily'|'Monthly'|'Quarterly'|'Yearly'} freq
 * @param {number} fyStartYear - e.g. 2025 for FY 2025-2026
 * @param {boolean} includePreviousFy
 * @returns {string[]}
 */
const getPeriodsForFrequency = (freq, fyStartYear, includePreviousFy) => {
  const periods = [];
  const years = includePreviousFy ? [fyStartYear - 1, fyStartYear] : [fyStartYear];
  for (const fyStart of years) {
    if (freq === 'Monthly') {
      periods.push(...getMonthlyPeriodsForFY(fyStart));
    } else if (freq === 'Quarterly') {
      periods.push(...getQuarterlyPeriodsForFY(fyStart));
    } else if (freq === 'Yearly') {
      periods.push(getYearlyPeriodForFY(fyStart));
    }
    // Daily: only current period (backfilling all days in FY would be very large)
  }
  return periods;
};

const run = async () => {
  const dryRun = process.argv.includes('--dry-run');
  const includePreviousFy = process.argv.includes('--include-previous-fy');
  const { yearString: financialYear } = getCurrentFinancialYear();
  const fyStartYear = parseInt(financialYear.split('-')[0], 10);

  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');
    console.log(
      `📌 Backfilling GST timelines (per state, all periods in current FY${includePreviousFy ? ' + previous FY' : ''})${dryRun ? ' [dry-run]' : ''}`
    );

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
          const freq = subactivity.frequency;
          if (!freq || !['Daily', 'Monthly', 'Quarterly', 'Yearly'].includes(freq)) continue;

          if (clientActivity.subactivity) {
            const assignedSubactivityId = clientActivity.subactivity._id || clientActivity.subactivity;
            if (assignedSubactivityId.toString() !== subactivity._id.toString()) continue;
          }

          if (!isGstRelatedSubactivity(subactivity)) continue;
          const gstNumbers = Array.isArray(client.gstNumbers) ? client.gstNumbers : [];
          if (gstNumbers.length === 0) continue;

          const periods =
            freq === 'Daily'
              ? [getPeriodFromDate(new Date(), 'Daily')]
              : getPeriodsForFrequency(freq, fyStartYear, includePreviousFy);
          const financialYearForPeriod = (period) => {
            if (freq === 'Yearly') return period;
            const parts = period.split('-');
            const y = parseInt(parts[parts.length - 1], 10);
            const first = parts[0];
            const fyStart = first === 'Q3' || first === 'January' || first === 'February' || first === 'March' ? y - 1 : y;
            return `${fyStart}-${fyStart + 1}`;
          };

          for (const gstNumber of gstNumbers) {
            for (const period of periods) {
              processed++;
              const fy = financialYearForPeriod(period);
              const dueDate = calculateDueDate(freq, subactivity.frequencyConfig || {}, period);
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
                  period,
                  dueDate,
                  subactivity,
                  financialYear: fy,
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
                    `✅ Created GST timeline | Client: ${client.name} | ${activity.name} | ${subactivity.name} | State: ${gstNumber.state} | Period: ${period}`
                  );
                }
              } catch (err) {
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
    }

    if (dryRun) {
      console.log(
        `\n📊 Dry-run summary: would process ${processed} GST timeline candidates. Invalid dates skipped: ${skippedInvalidDate}. Duplicate-key skips: ${duplicateKeySkipped}.`
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
