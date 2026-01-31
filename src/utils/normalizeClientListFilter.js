/**
 * Values that mean "no filter" when sent from UI (e.g. dropdown "All Categories").
 * Case-insensitive match; also strips empty string, null, undefined.
 */
const NO_FILTER_VALUES = [
  'all categories',
  'all business types',
  'all entity types',
  'all activities',
  'all subactivities',
  'all statuses',
];

/**
 * Returns true if the value should be treated as "no filter" and omitted from the query.
 * @param {*} value - Raw query param value
 * @returns {boolean}
 */
const isNoFilterValue = (value) => {
  if (value === undefined || value === null) return true;
  const s = String(value).trim().toLowerCase();
  if (s === '') return true;
  return NO_FILTER_VALUES.includes(s);
};

/**
 * Normalize client list filter: remove keys with empty or "All X" placeholder values
 * so the API does not filter (or throw) when user selects "All Categories" etc.
 * @param {Object} filter - Raw filter from query (e.g. pick(req.query, [...]))
 * @returns {Object} Filter with no-filter values removed
 */
const normalizeClientListFilter = (filter) => {
  if (!filter || typeof filter !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(filter)) {
    if (!isNoFilterValue(value)) {
      out[key] = value;
    }
  }
  return out;
};

export default normalizeClientListFilter;
export { isNoFilterValue, NO_FILTER_VALUES };
