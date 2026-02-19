import { Client } from '../../models/index.js';
import { getCurrentFinancialYear } from '../../utils/financialYear.js';
import logger from '../../config/logger.js';
import { upsertRecurringTimeline } from '../../services/timelineUpsert.service.js';
import { calculateDueDate } from './dueDate.js';
import { getPeriodFromDate } from './period.js';

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
 * Shared processor for Daily / Monthly / Quarterly / Yearly.
 * Important: uses atomic upsert so even if cron runs twice, it won't create duplicates.
 * Each frequency runs only on its own cron so yearly doesn't run every day, etc.
 *
 * @param {'Daily'|'Monthly'|'Quarterly'|'Yearly'} frequency
 */
const processRecurringTimelinesByFrequency = async (frequency) => {
  logger.info(`🔄 Processing ${frequency.toLowerCase()} timeline generation...`);

  const now = new Date();
  const currentPeriod = getPeriodFromDate(now, frequency);
  const { yearString: financialYear } = getCurrentFinancialYear();

  const clients = await Client.find({
    'activities.0': { $exists: true },
    status: 'active',
  }).populate('activities.activity');

  let processedCount = 0;
  let createdCount = 0;

  for (const client of clients) {
    for (const clientActivity of client.activities) {
      if (clientActivity.status !== 'active') continue;

      const activity = clientActivity.activity;
      if (!activity?.subactivities) continue;

      for (const subactivity of activity.subactivities) {
        if (subactivity.frequency !== frequency) continue;

        // If the client has a specific subactivity assigned, only generate for that one.
        if (clientActivity.subactivity) {
          const assignedSubactivityId = clientActivity.subactivity._id || clientActivity.subactivity;
          if (assignedSubactivityId.toString() !== subactivity._id.toString()) continue;
        }

        processedCount++;

        const isGstSubactivity = isGstRelatedSubactivity(subactivity);
        const clientGstNumbers = Array.isArray(client.gstNumbers) ? client.gstNumbers : [];

        if (isGstSubactivity && clientGstNumbers.length > 0) {
          for (const gstNumber of clientGstNumbers) {
            const dueDate = calculateDueDate(frequency, subactivity.frequencyConfig, currentPeriod);
            const { created } = await upsertRecurringTimeline({
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

            if (created) {
              createdCount++;
              logger.info(
                `Created GST timeline for ${client.name} - ${activity.name} - ${subactivity.name} - ${gstNumber.state} - ${currentPeriod}`
              );
            }
          }
          continue;
        }

        const dueDate = calculateDueDate(frequency, subactivity.frequencyConfig, currentPeriod);
        const { created } = await upsertRecurringTimeline({
          clientId: client._id,
          activityId: activity._id,
          branchId: client.branch,
          period: currentPeriod,
          dueDate,
          subactivity,
          financialYear,
        });

        if (created) {
          createdCount++;
          logger.info(
            `Created timeline for ${client.name} - ${activity.name} - ${subactivity.name} - ${currentPeriod}`
          );
        }
      }
    }
  }

  logger.info(`✅ ${frequency} processing complete: ${processedCount} processed, ${createdCount} created`);
  return { processed: processedCount, created: createdCount };
};

const processDailyTimelines = async () => processRecurringTimelinesByFrequency('Daily');
const processMonthlyTimelines = async () => processRecurringTimelinesByFrequency('Monthly');
const processQuarterlyTimelines = async () => processRecurringTimelinesByFrequency('Quarterly');
const processYearlyTimelines = async () => processRecurringTimelinesByFrequency('Yearly');

export {
  processDailyTimelines,
  processMonthlyTimelines,
  processQuarterlyTimelines,
  processYearlyTimelines,
};

