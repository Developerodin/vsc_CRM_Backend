import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { getUserBranchIds, hasBranchAccess } from './role.service.js';

/**
 * Build a Mongo filter for timeline/task queries scoped to the user's branch access.
 * @param {Object} user - Authenticated user with role
 * @param {string} [branchId] - Optional specific branch
 * @param {Object} [extra] - Extra filter fields (e.g. frequency)
 * @returns {Object} Mongo filter
 */
const buildBranchScopedFilter = (user, branchId, extra = {}) => {
  const filter = { ...extra };

  if (branchId) {
    if (!user?.role) {
      throw new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned');
    }
    if (!hasBranchAccess(user.role, branchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
    }
    filter.branch = branchId;
    return filter;
  }

  if (user?.role) {
    const allowedBranchIds = getUserBranchIds(user.role);
    if (allowedBranchIds !== null && allowedBranchIds.length > 0) {
      filter.branch = { $in: allowedBranchIds };
    } else if (allowedBranchIds !== null) {
      throw new ApiError(httpStatus.FORBIDDEN, 'No branch access granted');
    }
  }

  return filter;
};

/**
 * Build a period regex pattern for frequencyStatus.period filtering.
 * @param {string} frequency
 * @param {string} startDate
 * @param {string} endDate
 * @returns {RegExp}
 */
const getPeriodRegex = (frequency, startDate, endDate) => {
  const start = new Date(startDate);

  if (frequency === 'Hourly') {
    return new RegExp(
      `^${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}-\\d{2}$`
    );
  }
  if (frequency === 'Daily') {
    return new RegExp(`^${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-\\d{2}$`);
  }
  if (frequency === 'Weekly') {
    return new RegExp(`^${start.getFullYear()}-W\\d{2}$`);
  }
  if (frequency === 'Monthly') {
    return new RegExp(`^${start.getFullYear()}-\\d{2}$`);
  }
  if (frequency === 'Quarterly') {
    return new RegExp(`^${start.getFullYear()}-Q[1-4]$`);
  }
  if (frequency === 'Yearly') {
    return new RegExp(`^${start.getFullYear()}-[A-Za-z]+$`);
  }

  return new RegExp(`^${start.getFullYear()}`);
};

/**
 * Optional match stage for unwound frequencyStatus period/status filters.
 * @param {Object} params
 * @returns {Object|null}
 */
const buildFrequencyStatusMatch = ({ startDate, endDate, frequency, status, period }) => {
  const match = {};

  if (status && String(status).trim() !== '') {
    match['frequencyStatus.status'] = status;
  }
  if (period && String(period).trim() !== '') {
    match['frequencyStatus.period'] = period;
  }
  if (startDate && endDate && String(startDate).trim() !== '' && String(endDate).trim() !== '') {
    const freqForRegex = frequency && String(frequency).trim() !== '' ? frequency : 'Monthly';
    match['frequencyStatus.period'] = getPeriodRegex(freqForRegex, startDate, endDate);
  }

  return Object.keys(match).length ? match : null;
};

/**
 * ISO week number for a date (UTC-based).
 * @param {Date} date
 * @returns {number}
 */
const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};

/**
 * Interval key for task trend grouping.
 * @param {Date} date
 * @param {string} interval
 * @returns {string}
 */
const getTaskIntervalKey = (date, interval) => {
  if (!date) return 'unknown';
  const d = new Date(date);
  if (interval === 'day') {
    return d.toISOString().split('T')[0];
  }
  if (interval === 'week') {
    return `${d.getFullYear()}-W${String(getWeekNumber(d)).padStart(2, '0')}`;
  }
  if (interval === 'month') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return d.toISOString().split('T')[0];
};

/**
 * Date-overlap filter for tasks within a range.
 * @param {string} startDate
 * @param {string} endDate
 * @returns {Object|null}
 */
const buildTaskDateOverlapFilter = (startDate, endDate) => {
  if (!startDate || !endDate || String(startDate).trim() === '' || String(endDate).trim() === '') {
    return null;
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  return {
    $or: [
      { startDate: { $gte: start, $lte: end } },
      { endDate: { $gte: start, $lte: end } },
      { startDate: { $lte: start }, endDate: { $gte: end } },
      { startDate: { $lte: start }, endDate: { $gte: start } },
      { startDate: { $lte: end }, endDate: { $gte: end } },
    ],
  };
};

/**
 * Cap unique periods returned in statusBreakdown to keep JSON small.
 */
const MAX_PERIODS_PER_STATUS = 50;

/**
 * Cap detailed period rows for the period table endpoint.
 */
const MAX_PERIOD_ROWS = 500;

export {
  buildBranchScopedFilter,
  getPeriodRegex,
  buildFrequencyStatusMatch,
  getWeekNumber,
  getTaskIntervalKey,
  buildTaskDateOverlapFilter,
  MAX_PERIODS_PER_STATUS,
  MAX_PERIOD_ROWS,
};
