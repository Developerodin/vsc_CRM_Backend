/**
 * Group analytics helpers: per-client and group-level turnover, category,
 * activities, and timeline completion by activity (current FY).
 */
import { Timeline, Activity } from '../models/index.js';
import { getCurrentFinancialYear } from '../utils/financialYear.js';

const PENDING_STATUSES = ['pending', 'ongoing', 'delayed'];

/**
 * Timeline counts by activity for current FY (group-level).
 * @param {ObjectId[]} clientIds
 * @param {string} currentFY - e.g. "2024-2025"
 * @returns {Promise<{ byActivity: Object, currentFY: string }>}
 */
const getGroupTimelineByActivityForCurrentFY = async (clientIds, currentFY) => {
  const byActivity = {};
  if (clientIds.length === 0) {
    return { byActivity, currentFY };
  }
  const rows = await Timeline.aggregate([
    { $match: { client: { $in: clientIds }, financialYear: currentFY } },
    { $group: { _id: { activity: '$activity', status: '$status' }, count: { $sum: 1 } } }
  ]);
  const activityIds = [...new Set(rows.map((r) => r._id.activity?.toString()).filter(Boolean))];
  const activityMap = {};
  if (activityIds.length > 0) {
    const activities = await Activity.find({ _id: { $in: activityIds } }).select('_id name').lean();
    activities.forEach((a) => {
      activityMap[a._id.toString()] = a.name;
    });
  }
  rows.forEach((r) => {
    const aid = r._id.activity?.toString();
    const status = r._id.status;
    if (!aid) return;
    if (!byActivity[aid]) {
      byActivity[aid] = {
        activityId: aid,
        activityName: activityMap[aid] || 'Unknown',
        completedCurrentFY: 0,
        pendingCurrentFY: 0,
        totalCurrentFY: 0
      };
    }
    byActivity[aid].totalCurrentFY += r.count;
    if (status === 'completed') {
      byActivity[aid].completedCurrentFY += r.count;
    } else if (PENDING_STATUSES.includes(status)) {
      byActivity[aid].pendingCurrentFY += r.count;
    }
  });
  return { byActivity: Object.values(byActivity), currentFY };
};

/**
 * Per-client timeline counts by activity for current FY.
 * @param {ObjectId[]} clientIds
 * @param {string} currentFY
 * @returns {Promise<Map<string, Array>>} clientId -> [{ activityId, activityName, completedCurrentFY, pendingCurrentFY, totalCurrentFY }]
 */
const getClientTimelineByActivityForCurrentFY = async (clientIds, currentFY) => {
  const map = new Map();
  if (clientIds.length === 0) return map;
  const rows = await Timeline.aggregate([
    { $match: { client: { $in: clientIds }, financialYear: currentFY } },
    { $group: { _id: { client: '$client', activity: '$activity', status: '$status' }, count: { $sum: 1 } } }
  ]);
  const activityIds = [...new Set(rows.map((r) => r._id.activity?.toString()).filter(Boolean))];
  const activityMap = {};
  if (activityIds.length > 0) {
    const activities = await Activity.find({ _id: { $in: activityIds } }).select('_id name').lean();
    activities.forEach((a) => {
      activityMap[a._id.toString()] = a.name;
    });
  }
  const byClient = new Map();
  rows.forEach((r) => {
    const cid = r._id.client?.toString();
    const aid = r._id.activity?.toString();
    const status = r._id.status;
    if (!cid || !aid) return;
    if (!byClient.has(cid)) byClient.set(cid, {});
    const act = byClient.get(cid);
    if (!act[aid]) {
      act[aid] = {
        activityId: aid,
        activityName: activityMap[aid] || 'Unknown',
        completedCurrentFY: 0,
        pendingCurrentFY: 0,
        totalCurrentFY: 0
      };
    }
    act[aid].totalCurrentFY += r.count;
    if (status === 'completed') act[aid].completedCurrentFY += r.count;
    else if (PENDING_STATUSES.includes(status)) act[aid].pendingCurrentFY += r.count;
  });
  const resultMap = new Map();
  clientIds.forEach((cid) => {
    const cidStr = cid.toString();
    resultMap.set(cidStr, byClient.has(cidStr) ? Object.values(byClient.get(cidStr)) : []);
  });
  return resultMap;
};

/**
 * Build group turnover summary from clients (latest turnover per client from turnoverHistory or turnover).
 * @param {Array} clients - lean client docs with turnover, turnoverHistory
 * @returns {Object} { turnoverByClient: Array, currentFY }
 */
const buildGroupTurnoverSummary = (clients, currentFY) => {
  const turnoverByClient = (clients || []).map((c) => {
    const clientId = (c._id || c).toString();
    let latest = null;
    if (c.turnoverHistory && c.turnoverHistory.length > 0) {
      const forFY = c.turnoverHistory.find((t) => t.year === currentFY);
      const sorted = [...c.turnoverHistory].sort((a, b) => (b.year || '').localeCompare(a.year || ''));
      latest = forFY || sorted[0];
    }
    if (!latest && c.turnover) {
      latest = { year: currentFY, turnover: c.turnover };
    }
    return {
      clientId,
      clientName: c.name,
      category: c.category,
      year: latest?.year,
      turnover: latest?.turnover
    };
  });
  return {
    currentFY,
    turnoverByClient,
    clientsWithTurnover: turnoverByClient.filter((t) => t.turnover != null).length
  };
};

/**
 * Enrich group analytics: per-client category, turnover, activities, timeline by activity;
 * group-level turnover summary and activity-wise timeline for selected FY.
 * @param {Object} group - group doc (lean) with clients populated (category, turnoverHistory, activities)
 * @param {ObjectId[]} clientIds
 * @param {Map} clientTaskCountMap - clientId -> task count (already filtered by FY when fy passed)
 * @param {Map} clientTimelineCountMap - clientId -> timeline count (already filtered by FY when fy passed)
 * @param {string|null} fy - Optional financial year e.g. "2026-2027"; when null uses current FY
 * @returns {Promise<{ clientsEnriched: Array, groupTurnoverSummary: Object, activityWiseTimelineAnalytics: Object, currentFY: string }>}
 */
const getGroupAnalyticsExtended = async (group, clientIds, clientTaskCountMap, clientTimelineCountMap, fy = null) => {
  const currentFY = (fy && fy.trim()) ? fy.trim() : getCurrentFinancialYear().yearString;

  const [groupTimelineByActivity, clientTimelineByActivityMap, turnoverSummary] = await Promise.all([
    getGroupTimelineByActivityForCurrentFY(clientIds, currentFY),
    getClientTimelineByActivityForCurrentFY(clientIds, currentFY),
    Promise.resolve(buildGroupTurnoverSummary(group.clients || [], currentFY))
  ]);

  const clientsEnriched = (group.clients || []).map((client) => {
    const clientId = (client._id || client).toString();
    const timelineByActivity = clientTimelineByActivityMap.get(clientId) || [];
    return {
      _id: client._id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      branch: client.branch,
      category: client.category,
      turnover: client.turnover,
      turnoverHistory: client.turnoverHistory || [],
      activities: (client.activities || []).map((a) => ({
        activity: a.activity,
        subactivity: a.subactivity,
        assignedDate: a.assignedDate,
        status: a.status,
        notes: a.notes
      })),
      taskCount: clientTaskCountMap.get(clientId) || 0,
      timelineCount: clientTimelineCountMap.get(clientId) || 0,
      timelineByActivityCurrentFY: timelineByActivity
    };
  });

  return {
    clientsEnriched,
    groupTurnoverSummary: turnoverSummary,
    activityWiseTimelineAnalytics: {
      currentFY: groupTimelineByActivity.currentFY,
      byActivity: groupTimelineByActivity.byActivity
    },
    currentFY
  };
};

/** Returns current FY string (e.g. "2024-2025"). */
const getCurrentFYString = () => getCurrentFinancialYear().yearString;

export {
  getGroupAnalyticsExtended,
  getCurrentFYString,
  buildGroupTurnoverSummary,
  getGroupTimelineByActivityForCurrentFY,
  getClientTimelineByActivityForCurrentFY
};
