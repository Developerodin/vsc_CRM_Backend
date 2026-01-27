#!/usr/bin/env node

/**
 * Get TDS activity data: activity, subactivities, their frequency, and all details.
 * TDS = Tax Deducted at Source; typically includes quarterly subactivities (24Q, 26Q, 27Q, 27EQ).
 */

import { fileURLToPath } from 'url';
import path from 'path';
import mongoose from 'mongoose';
import config from '../src/config/config.js';
import Activity from '../src/models/activity.model.js';

const __filename = fileURLToPath(import.meta.url);
const isRunDirect = process.argv[1] && path.resolve(process.argv[1]) === __filename;

/**
 * Fetches TDS activity and all its subactivities with frequency and config.
 * @returns {Promise<Object|null>} TDS activity document (lean) or null
 */
export async function getTdsActivityData() {
  const tds = await Activity.findOne({ name: 'TDS' }).lean();
  return tds;
}

/**
 * Pretty-print TDS activity for inspection.
 * @param {Object} tds - TDS activity document (plain object)
 */
function printTdsDetails(tds) {
  if (!tds) {
    console.log('No TDS activity found in DB.');
    return;
  }

  console.log('\n=== TDS ACTIVITY ===\n');
  console.log('Activity ID:', tds._id);
  console.log('Name:', tds.name);
  console.log('Sort order:', tds.sortOrder);
  console.log('Subactivities count:', (tds.subactivities || []).length);
  console.log('');

  (tds.subactivities || []).forEach((sub, i) => {
    console.log(`--- Subactivity ${i + 1}: ${sub.name} ---`);
    console.log('  _id:', sub._id);
    console.log('  name:', sub.name);
    console.log('  dueDate:', sub.dueDate);
    console.log('  frequency:', sub.frequency);
    if (sub.frequencyConfig) {
      console.log('  frequencyConfig:', JSON.stringify(sub.frequencyConfig, null, 4));
      if (sub.frequency === 'Quarterly' && sub.frequencyConfig.quarterlyMonths) {
        console.log('  quarterly months:', sub.frequencyConfig.quarterlyMonths.join(', '));
        console.log('  quarterly day:', sub.frequencyConfig.quarterlyDay);
        console.log('  quarterly time:', sub.frequencyConfig.quarterlyTime);
      }
    }
    if (sub.fields && sub.fields.length) {
      console.log('  fields:', sub.fields.length);
      sub.fields.forEach((f, j) => {
        console.log(`    [${j}] ${f.name} (${f.type})${f.required ? ' required' : ''}`);
      });
    }
    console.log('');
  });
}

/**
 * Returns TDS data as a minimal object suitable for use in other scripts/APIs.
 * @param {Object} tds - TDS activity document (plain object)
 * @returns {Object|null} { activityId, name, sortOrder, subactivities: [{ id, name, frequency, frequencyConfig, fields }] }
 */
export function toTdsDataShape(tds) {
  if (!tds) return null;
  return {
    activityId: tds._id?.toString(),
    name: tds.name,
    sortOrder: tds.sortOrder,
    subactivities: (tds.subactivities || []).map((sub) => ({
      id: sub._id?.toString(),
      name: sub.name,
      dueDate: sub.dueDate,
      frequency: sub.frequency,
      frequencyConfig: sub.frequencyConfig || null,
      fields: sub.fields || [],
    })),
  };
}

const main = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URL);
    console.log('Connected.\n');

    const tds = await getTdsActivityData();
    printTdsDetails(tds);

    console.log('\n=== TDS DATA (for scripts/API use) ===\n');
    const data = toTdsDataShape(tds);
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nConnection closed.');
  }
};

if (isRunDirect) {
  main();
}
