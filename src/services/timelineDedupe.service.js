import { Timeline } from '../models/index.js';

/**
 * Find and remove duplicate recurring timelines.
 * Duplicates = same (client, activity, subactivityId, period); we keep the oldest (by createdAt) and delete the rest.
 * Also handles recurring docs where subactivityId is null (use subactivity._id for grouping).
 *
 * @returns {{ deleted: number, duplicateGroups: number, keptPerGroup: number }}
 */
const removeDuplicateRecurringTimelines = async () => {
  const matchStage = {
    $match: {
      timelineType: 'recurring',
      period: { $exists: true, $ne: null, $type: 'string' },
    },
  };

  // Sort by createdAt so we keep the oldest in each group
  const sortStage = {
    $sort: { client: 1, activity: 1, subactivityId: 1, period: 1, createdAt: 1 },
  };

  // Normalize subactivityId: use subactivityId if set, else subactivity._id
  const groupStage = {
    $group: {
      _id: {
        client: '$client',
        activity: '$activity',
        subactivityId: { $ifNull: ['$subactivityId', '$subactivity._id'] },
        period: { $trim: { input: '$period' } },
      },
      ids: { $push: '$_id' },
      keepId: { $first: '$_id' },
      count: { $sum: 1 },
    },
  };

  const pipeline = [
    matchStage,
    sortStage,
    groupStage,
    { $match: { count: { $gt: 1 } } },
    { $project: { ids: 1, keepId: 1, count: 1, subactivityId: '$_id.subactivityId' } },
  ];

  const duplicateGroups = await Timeline.aggregate(pipeline);

  if (duplicateGroups.length === 0) {
    return { deleted: 0, duplicateGroups: 0, keptPerGroup: 0, updated: 0 };
  }

  let totalDeleted = 0;
  let totalUpdated = 0;

  for (const group of duplicateGroups) {
    const toDelete = group.ids.filter((id) => !id.equals(group.keepId));
    if (toDelete.length === 0) continue;

    const result = await Timeline.deleteMany({ _id: { $in: toDelete } });
    totalDeleted += result.deletedCount;

    // Ensure kept doc has subactivityId set so future cron upserts match (unique index requires it)
    if (group.subactivityId) {
      const up = await Timeline.updateOne(
        { _id: group.keepId, $or: [{ subactivityId: null }, { subactivityId: { $exists: false } }] },
        { $set: { subactivityId: group.subactivityId } }
      );
      if (up.modifiedCount) totalUpdated += 1;
    }
  }

  return {
    deleted: totalDeleted,
    duplicateGroups: duplicateGroups.length,
    keptPerGroup: 1,
    updated: totalUpdated,
  };
};

/**
 * Dry run: only report duplicate groups and how many would be deleted.
 *
 * @returns {{ duplicateGroups: Array<{ client, activity, subactivityId, period, count, wouldDelete }>, totalWouldDelete: number }}
 */
const findDuplicateRecurringTimelines = async () => {
  const matchStage = {
    $match: {
      timelineType: 'recurring',
      period: { $exists: true, $ne: null, $type: 'string' },
    },
  };

  const groupStage = {
    $group: {
      _id: {
        client: '$client',
        activity: '$activity',
        subactivityId: { $ifNull: ['$subactivityId', '$subactivity._id'] },
        period: { $trim: { input: '$period' } },
      },
      count: { $sum: 1 },
    },
  };

  const duplicateGroups = await Timeline.aggregate([
    matchStage,
    groupStage,
    { $match: { count: { $gt: 1 } } },
    { $project: { _id: 1, count: 1, wouldDelete: { $subtract: ['$count', 1] } } },
  ]);

  const totalWouldDelete = duplicateGroups.reduce((sum, g) => sum + (g.wouldDelete || 0), 0);

  return {
    duplicateGroups: duplicateGroups.map((g) => ({
      ...g._id,
      count: g.count,
      wouldDelete: g.wouldDelete,
    })),
    totalWouldDelete,
  };
};

export { findDuplicateRecurringTimelines, removeDuplicateRecurringTimelines };
