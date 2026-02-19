/**
 * One-time script: drop legacy unique index on timelines so per-state GST timelines can be created.
 * Safe to run on MongoDB Atlas (uses your MONGODB_URL from .env).
 *
 * Usage: node src/scripts/dropLegacyTimelineIndex.js
 */
import mongoose from 'mongoose';
import config from '../config/config.js';
import Timeline from '../models/timeline.model.js';

const LEGACY_INDEX = 'client_1_activity_1_subactivityId_1_period_1';

const run = async () => {
  try {
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('✅ Connected to MongoDB\n');

    const coll = Timeline.collection;
    const indexes = await coll.indexes();

    if (!indexes.some((i) => i.name === LEGACY_INDEX)) {
      console.log(`ℹ️ Index "${LEGACY_INDEX}" not found (already dropped or never created).`);
    } else {
      await coll.dropIndex(LEGACY_INDEX);
      console.log(`✅ Dropped legacy index: ${LEGACY_INDEX}`);
    }

    await Timeline.syncIndexes();
    console.log('✅ Synced indexes (per-state unique index ensured).\n');

    await mongoose.connection.close();
    console.log('Done. Re-run: node src/scripts/backfillGstTimelines.js');
  } catch (err) {
    if (err.code === 27 || err.codeName === 'IndexNotFound') {
      console.log(`ℹ️ Index "${LEGACY_INDEX}" not found.`);
      await Timeline.syncIndexes();
      await mongoose.connection.close();
      return;
    }
    console.error('❌ Error:', err.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

run();
