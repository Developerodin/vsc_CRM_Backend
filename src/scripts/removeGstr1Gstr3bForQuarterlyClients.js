/**
 * For clients that have GST with GSTR-1-Q or GSTR-3B-Q (quarterly):
 * 1. Remove GSTR-1 and GSTR-3B subactivities from those clients.
 * 2. Delete all timelines for those clients that are for GSTR-1 or GSTR-3B.
 *
 * Usage: node src/scripts/removeGstr1Gstr3bForQuarterlyClients.js
 *        node src/scripts/removeGstr1Gstr3bForQuarterlyClients.js --dry-run
 */
import mongoose from 'mongoose';
import config from '../config/config.js';
import { Client, Activity, Timeline } from '../models/index.js';

const GST_ACTIVITY_NAME = 'GST';
const MONTHLY_NAMES = ['GSTR-1', 'GSTR-3B'];
const QUARTERLY_NAMES = ['GSTR-1-Q', 'GSTR-3B-Q'];

const run = async () => {
  const dryRun = process.argv.includes('--dry-run');

  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');
    if (dryRun) console.log('   (dry run — no updates/deletes)\n');

    const gstActivity = await Activity.findOne({ name: GST_ACTIVITY_NAME });
    if (!gstActivity || !gstActivity.subactivities?.length) {
      console.log('⚠️ GST activity or subactivities not found.');
      await mongoose.connection.close();
      return;
    }

    const getSubactivityIds = (names) =>
      names
        .map((name) => gstActivity.subactivities.find((s) => (s.name || '').trim() === name)?._id)
        .filter(Boolean);

    const monthlyIds = getSubactivityIds(MONTHLY_NAMES);
    const quarterlyIds = getSubactivityIds(QUARTERLY_NAMES);

    if (monthlyIds.length === 0 || quarterlyIds.length === 0) {
      console.log('⚠️ Could not find subactivities. Monthly:', MONTHLY_NAMES, 'Quarterly:', QUARTERLY_NAMES);
      await mongoose.connection.close();
      return;
    }

    const gstId = gstActivity._id.toString();
    const monthlyIdSet = new Set(monthlyIds.map((id) => id.toString()));
    const quarterlyIdSet = new Set(quarterlyIds.map((id) => id.toString()));

    // Clients that have GST with at least one of GSTR-1-Q or GSTR-3B-Q (any status)
    const clients = await Client.find({
      'activities.activity': gstActivity._id,
    }).populate('activities.activity');

    const clientIdsToUpdate = [];
    for (const client of clients) {
      const hasQuarterly = client.activities.some((a) => {
        const actId = (a.activity?._id || a.activity)?.toString();
        if (actId !== gstId) return false;
        const subId = a.subactivity?._id ?? a.subactivity;
        const subIdStr = subId ? subId.toString() : null;
        const subName = (a.subactivity?.name ?? '').trim();
        return (subIdStr && quarterlyIdSet.has(subIdStr)) || QUARTERLY_NAMES.includes(subName);
      });
      if (hasQuarterly) clientIdsToUpdate.push(client._id);
    }

    console.log(`📋 Found ${clientIdsToUpdate.length} client(s) with GST and (GSTR-1-Q or GSTR-3B-Q).\n`);

    if (clientIdsToUpdate.length === 0) {
      console.log('Nothing to update.');
      await mongoose.connection.close();
      return;
    }

    // 1. Remove GSTR-1 / GSTR-3B from those clients' activities (when quarterly is present)
    const isMonthlyGst = (a) => {
      const actId = (a.activity?._id ?? a.activity)?.toString();
      if (actId !== gstId) return false;
      const subId = a.subactivity?._id ?? a.subactivity;
      const subIdStr = subId ? subId.toString() : null;
      const subName = (a.subactivity?.name ?? '').trim();
      return monthlyIdSet.has(subIdStr) || MONTHLY_NAMES.includes(subName);
    };

    let clientsUpdated = 0;
    if (!dryRun) {
      for (const clientId of clientIdsToUpdate) {
        const client = await Client.findById(clientId);
        if (!client) continue;
        const before = client.activities.length;
        client.activities = client.activities.filter((a) => !isMonthlyGst(a));
        if (client.activities.length < before) {
          await client.save();
          clientsUpdated++;
        }
      }
      console.log(`🗑  Removed GSTR-1/GSTR-3B from ${clientsUpdated} client(s).\n`);
    } else {
      console.log(`   Would remove GSTR-1/GSTR-3B from activities for ${clientIdsToUpdate.length} client(s).\n`);
    }

    // 2. Delete timelines: client in list, activity = GST, subactivity = GSTR-1 or GSTR-3B (monthly)
    const timelineFilter = {
      client: { $in: clientIdsToUpdate },
      activity: gstActivity._id,
      $or: [
        { subactivityId: { $in: monthlyIds } },
        { 'subactivity._id': { $in: monthlyIds } },
        { 'subactivity.name': { $in: MONTHLY_NAMES } },
      ],
    };
    const timelinesToDelete = await Timeline.countDocuments(timelineFilter);
    console.log(`📋 Found ${timelinesToDelete} timeline(s) for GSTR-1/GSTR-3B for these clients.`);

    if (!dryRun && timelinesToDelete > 0) {
      const deleteResult = await Timeline.deleteMany(timelineFilter);
      console.log(`   Deleted ${deleteResult.deletedCount} timeline(s).\n`);
    } else if (dryRun && timelinesToDelete > 0) {
      console.log(`   Would delete ${timelinesToDelete} timeline(s).\n`);
    } else {
      console.log('   No timelines to delete.\n');
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
