import mongoose from 'mongoose';
import { Timeline } from '../models/index.js';

/**
 * Atomically upsert a recurring timeline (idempotent).
 *
 * Why:
 * - cron can run twice (multiple processes/instances, overlap on restart, etc)
 * - findOne + create is not safe under concurrency
 *
 * Behavior:
 * - If a matching recurring timeline already exists: returns it (no duplicate created)
 * - Else: inserts a new one using $setOnInsert
 *
 * @param {Object} params
 * @param {mongoose.Types.ObjectId|string} params.clientId
 * @param {mongoose.Types.ObjectId|string} params.activityId
 * @param {mongoose.Types.ObjectId|string} params.branchId
 * @param {string} params.period
 * @param {Date} params.dueDate
 * @param {Object} params.subactivity - subactivity snapshot (must include _id, name, frequency, frequencyConfig, fields)
 * @param {string} params.financialYear
 * @returns {Promise<{timeline: any, created: boolean}>}
 */
const upsertRecurringTimeline = async ({
  clientId,
  activityId,
  branchId,
  period,
  dueDate,
  subactivity,
  financialYear,
}) => {
  const subactivityId = subactivity?._id ? new mongoose.Types.ObjectId(subactivity._id) : null;
  if (!subactivityId) {
    throw new Error('upsertRecurringTimeline requires subactivity._id');
  }
  if (!period) {
    throw new Error('upsertRecurringTimeline requires period');
  }

  const filter = {
    client: new mongoose.Types.ObjectId(clientId),
    activity: new mongoose.Types.ObjectId(activityId),
    subactivityId,
    period,
    timelineType: 'recurring',
  };

  const timelineData = {
    activity: new mongoose.Types.ObjectId(activityId),
    client: new mongoose.Types.ObjectId(clientId),
    status: 'pending',
    dueDate,
    startDate: dueDate,
    endDate: dueDate,
    period,
    branch: new mongoose.Types.ObjectId(branchId),
    financialYear,
    fields:
      subactivity?.fields && subactivity.fields.length > 0
        ? subactivity.fields.map((field) => ({
            fileName: field.name,
            fieldType: field.type,
            fieldValue: null,
          }))
        : [],
    subactivity: {
      _id: subactivityId,
      name: subactivity.name,
      frequency: subactivity.frequency,
      frequencyConfig: subactivity.frequencyConfig,
      fields: subactivity.fields,
    },
    subactivityId,
    frequency: subactivity.frequency,
    frequencyConfig: subactivity.frequencyConfig,
    timelineType: 'recurring',
  };

  // Use rawResult so we can reliably detect "created vs existing"
  const result = await Timeline.findOneAndUpdate(
    filter,
    { $setOnInsert: timelineData },
    {
      upsert: true,
      new: true,
      rawResult: true,
    }
  );

  return {
    timeline: result.value,
    created: !result.lastErrorObject?.updatedExisting,
  };
};

export { upsertRecurringTimeline };

