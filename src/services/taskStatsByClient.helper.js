import { Timeline, Task, Client } from '../models/index.js';

/**
 * Empty task-status counters (internal status keys).
 * @returns {{pending: number, ongoing: number, completed: number, on_hold: number, cancelled: number, delayed: number}}
 */
const createEmptyStatusMap = () => ({
  pending: 0,
  ongoing: 0,
  completed: 0,
  on_hold: 0,
  cancelled: 0,
  delayed: 0,
});

/**
 * Empty timeline-status counters.
 * @returns {{pending: number, ongoing: number, completed: number, delayed: number, 'not applicable': number}}
 */
const createEmptyTimelineStatusMap = () => ({
  pending: 0,
  ongoing: 0,
  completed: 0,
  delayed: 0,
  'not applicable': 0,
});

/**
 * Map raw {client,status,count} rows into the API task-stats shape.
 * @param {Array<{_id: {client: import('mongoose').Types.ObjectId, status: string}, count: number}>} rows
 * @returns {Map<string, Object>}
 */
const mapTaskStatRows = (rows) => {
  const statsMap = new Map();
  rows.forEach((row) => {
    const clientId = row._id.client.toString();
    if (!statsMap.has(clientId)) {
      statsMap.set(clientId, {
        total: 0,
        pending: 0,
        ongoing: 0,
        completed: 0,
        onHold: 0,
        cancelled: 0,
        delayed: 0,
      });
    }
    const entry = statsMap.get(clientId);
    const status = row._id.status;
    const count = row.count;
    entry.total += count;
    if (status === 'on_hold') {
      entry.onHold += count;
    } else if (status in entry) {
      entry[status] += count;
    }
  });
  return statsMap;
};

/**
 * Resolve distinct branch IDs for a set of clients (used to prefilter Task scans).
 * @param {import('mongoose').Types.ObjectId[]|string[]} clientIds
 * @returns {Promise<import('mongoose').Types.ObjectId[]>}
 */
const resolveBranchIdsForClients = async (clientIds) => {
  if (!clientIds?.length) {
    return [];
  }
  return Client.distinct('branch', { _id: { $in: clientIds } });
};

/**
 * Build the Task $match that scales as tasks grow:
 * 1) Prefer denormalized `clients` (indexable, O(matching tasks))
 * 2) Fall back to branch-scoped scan for legacy tasks missing `clients`
 *
 * @param {import('mongoose').Types.ObjectId[]|string[]} clientIds
 * @param {import('mongoose').Types.ObjectId[]|string[]} branchIds
 * @returns {Object}
 */
const buildTaskScanMatch = (clientIds, branchIds) => {
  const clientMatch = { clients: { $in: clientIds } };

  if (!branchIds?.length) {
    return {
      'timeline.0': { $exists: true },
      ...clientMatch,
    };
  }

  // Legacy rows (pre-denorm) still need a branch-scoped fallback so stats stay correct
  // until write-path / lazy backfill populates `clients`.
  return {
    'timeline.0': { $exists: true },
    $or: [
      clientMatch,
      {
        branch: { $in: branchIds },
        $or: [{ clients: { $exists: false } }, { clients: { $size: 0 } }, { clients: null }],
      },
    ],
  };
};

/**
 * Task-first aggregation: scan only branch-relevant / client-denormed Tasks, then join Timelines.
 *
 * @param {import('mongoose').Types.ObjectId[]|string[]} clientIds
 * @param {Object} [extraMatch] - Extra Timeline match (e.g. { financialYear })
 * @param {{ includePriority?: boolean }} [options]
 * @returns {Promise<Array>}
 */
const aggregateTasksJoinedToClients = async (clientIds, extraMatch = {}, options = {}) => {
  if (!clientIds?.length) {
    return [];
  }

  const branchIds = await resolveBranchIdsForClients(clientIds);
  const timelinePipeline = [
    { $match: { client: { $in: clientIds }, ...extraMatch } },
    { $project: { client: 1 } },
  ];

  const project = { status: 1, timeline: 1 };
  if (options.includePriority) {
    project.priority = 1;
  }

  return Task.aggregate([
    { $match: buildTaskScanMatch(clientIds, branchIds) },
    { $project: project },
    { $unwind: '$timeline' },
    {
      $lookup: {
        from: 'timelines',
        localField: 'timeline',
        foreignField: '_id',
        pipeline: timelinePipeline,
        as: 'tl',
      },
    },
    { $match: { 'tl.0': { $exists: true } } },
    { $unwind: '$tl' },
  ]);
};

/**
 * Aggregate task status counts for the given client IDs.
 * @param {import('mongoose').Types.ObjectId[]|string[]} clientIds
 * @param {Object} [extraMatch]
 * @returns {Promise<Map<string, {
 *   total: number,
 *   pending: number,
 *   ongoing: number,
 *   completed: number,
 *   onHold: number,
 *   cancelled: number,
 *   delayed: number
 * }>>}
 */
const aggregateTaskStatsByClientIds = async (clientIds, extraMatch = {}) => {
  if (!clientIds?.length) {
    return new Map();
  }

  const branchIds = await resolveBranchIdsForClients(clientIds);

  const rows = await Task.aggregate([
    { $match: buildTaskScanMatch(clientIds, branchIds) },
    { $project: { status: 1, timeline: 1 } },
    { $unwind: '$timeline' },
    {
      $lookup: {
        from: 'timelines',
        localField: 'timeline',
        foreignField: '_id',
        pipeline: [
          { $match: { client: { $in: clientIds }, ...extraMatch } },
          { $project: { client: 1 } },
        ],
        as: 'tl',
      },
    },
    { $match: { 'tl.0': { $exists: true } } },
    { $unwind: '$tl' },
    {
      $group: {
        _id: { client: '$tl.client', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  return mapTaskStatRows(rows);
};

/**
 * Aggregate timeline status counts per client (server-side $group — small result set).
 * @param {import('mongoose').Types.ObjectId[]|string[]} clientIds
 * @param {Object} [extraMatch]
 * @returns {Promise<Map<string, Object>>}
 */
const aggregateTimelineStatsByClientIds = async (clientIds, extraMatch = {}) => {
  const statsMap = new Map();
  if (!clientIds?.length) {
    return statsMap;
  }

  const rows = await Timeline.aggregate([
    { $match: { client: { $in: clientIds }, ...extraMatch } },
    {
      $group: {
        _id: { client: '$client', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]);

  rows.forEach((row) => {
    const clientId = row._id.client.toString();
    if (!statsMap.has(clientId)) {
      statsMap.set(clientId, { ...createEmptyTimelineStatusMap(), total: 0 });
    }
    const entry = statsMap.get(clientId);
    if (row._id.status in entry) {
      entry[row._id.status] = row.count;
      entry.total += row.count;
    }
  });

  return statsMap;
};

/**
 * Parallel task + timeline stats for the same client set (all-groups analytics hot path).
 * @param {import('mongoose').Types.ObjectId[]|string[]} clientIds
 * @param {Object} [extraMatch]
 * @returns {Promise<{ taskStatsByClient: Map<string, Object>, timelineStatsByClient: Map<string, Object> }>}
 */
const aggregateTaskAndTimelineStatsByClientIds = async (clientIds, extraMatch = {}) => {
  const [taskStatsByClient, timelineStatsByClient] = await Promise.all([
    aggregateTaskStatsByClientIds(clientIds, extraMatch),
    aggregateTimelineStatsByClientIds(clientIds, extraMatch),
  ]);
  return { taskStatsByClient, timelineStatsByClient };
};

/**
 * Aggregate task status + priority breakdown for a set of clients (Task-first).
 * @param {import('mongoose').Types.ObjectId[]|string[]} clientIds
 * @param {Object} [extraMatch]
 * @returns {Promise<{
 *   statusCounts: Array<{_id: string, count: number}>,
 *   priorityCounts: Array<{_id: string, count: number}>,
 *   totalTasks: number,
 *   timelinesWithTasksByClient: Map<string, number>
 * }>}
 */
const aggregateTaskBreakdownForClients = async (clientIds, extraMatch = {}) => {
  const empty = {
    statusCounts: [],
    priorityCounts: [],
    totalTasks: 0,
    timelinesWithTasksByClient: new Map(),
  };
  if (!clientIds?.length) {
    return empty;
  }

  const joined = await aggregateTasksJoinedToClients(clientIds, extraMatch, {
    includePriority: true,
  });

  const statusMap = new Map();
  const priorityMap = new Map();
  const timelineSetByClient = new Map();
  let totalTasks = 0;

  joined.forEach((doc) => {
    totalTasks += 1;
    statusMap.set(doc.status, (statusMap.get(doc.status) || 0) + 1);
    if (doc.priority) {
      priorityMap.set(doc.priority, (priorityMap.get(doc.priority) || 0) + 1);
    }
    const clientId = doc.tl.client.toString();
    if (!timelineSetByClient.has(clientId)) {
      timelineSetByClient.set(clientId, new Set());
    }
    timelineSetByClient.get(clientId).add(doc.timeline.toString());
  });

  const timelinesWithTasksByClient = new Map();
  timelineSetByClient.forEach((set, clientId) => {
    timelinesWithTasksByClient.set(clientId, set.size);
  });

  return {
    statusCounts: [...statusMap.entries()].map(([_id, count]) => ({ _id, count })),
    priorityCounts: [...priorityMap.entries()].map(([_id, count]) => ({ _id, count })),
    totalTasks,
    timelinesWithTasksByClient,
  };
};

/**
 * Cap pagination limit for statistics endpoints.
 * @param {number|string|undefined} rawLimit
 * @param {number} [fallback=50]
 * @param {number} [max=100]
 * @returns {number}
 */
const clampStatsLimit = (rawLimit, fallback = 50, max = 100) => {
  const parsed = parseInt(rawLimit, 10);
  const limit = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return Math.min(limit, max);
};

/**
 * Resolve unique client ObjectIds from a list of timeline IDs (for Task.clients denorm).
 * @param {import('mongoose').Types.ObjectId[]|string[]} timelineIds
 * @returns {Promise<import('mongoose').Types.ObjectId[]>}
 */
const resolveClientIdsFromTimelineIds = async (timelineIds) => {
  if (!timelineIds?.length) {
    return [];
  }
  const clients = await Timeline.distinct('client', { _id: { $in: timelineIds } });
  return clients.filter(Boolean);
};

export {
  aggregateTaskStatsByClientIds,
  aggregateTimelineStatsByClientIds,
  aggregateTaskAndTimelineStatsByClientIds,
  aggregateTaskBreakdownForClients,
  clampStatsLimit,
  createEmptyStatusMap,
  createEmptyTimelineStatusMap,
  resolveClientIdsFromTimelineIds,
  resolveBranchIdsForClients,
};
