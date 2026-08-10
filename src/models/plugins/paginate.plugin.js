/* eslint-disable no-param-reassign */

/** Default page size when callers omit limit */
const DEFAULT_LIMIT = 50;
/** Hard ceiling — never return more than this per page */
const MAX_LIMIT = 100;

/**
 * Normalize pagination limit with default + hard cap.
 * @param {number|string|undefined} rawLimit
 * @returns {number}
 */
const resolveLimit = (rawLimit) => {
  const parsed = parseInt(rawLimit, 10);
  if (!parsed || parsed <= 0) {
    return DEFAULT_LIMIT;
  }
  return Math.min(parsed, MAX_LIMIT);
};

const paginate = (schema) => {
  /**
   * @typedef {Object} QueryResult
   * @property {Document[]} results - Results found
   * @property {number} page - Current page
   * @property {number} limit - Maximum number of results per page
   * @property {number} totalPages - Total number of pages
   * @property {number} totalResults - Total number of documents
   */
  /**
   * Query for documents with pagination (always bounded).
   * @param {Object} [filter] - Mongo filter
   * @param {Object} [options] - Query options
   * @param {string} [options.sortBy] - Sorting criteria using the format: sortField:(desc|asc)
   * @param {string|Array} [options.populate] - Populate data fields
   * @param {number} [options.limit] - Max results per page (default 50, max 100)
   * @param {number} [options.page] - Current page (default = 1)
   * @returns {Promise<QueryResult>}
   */
  schema.statics.paginate = async function (filter, options = {}) {
    let sort = '';
    if (options.sortBy) {
      const sortingCriteria = [];
      options.sortBy.split(',').forEach((sortOption) => {
        const [key, order] = sortOption.split(':');
        sortingCriteria.push((order === 'desc' ? '-' : '') + key);
      });
      sort = sortingCriteria.join(' ');
    } else {
      sort = 'createdAt';
    }

    const limit = resolveLimit(options.limit);
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = (page - 1) * limit;

    const countPromise = this.countDocuments(filter).exec();
    let docsPromise = this.find(filter).sort(sort).skip(skip).limit(limit);

    if (options.populate && typeof options.populate === 'string') {
      options.populate.split(',').forEach((populateOption) => {
        docsPromise = docsPromise.populate(
          populateOption
            .split('.')
            .reverse()
            .reduce((a, b) => ({ path: b, populate: a }))
        );
      });
    } else if (options.populate && Array.isArray(options.populate)) {
      const populateString = options.populate
        .map((p) => (typeof p === 'string' ? p : p.path))
        .join(',');
      populateString.split(',').forEach((populateOption) => {
        docsPromise = docsPromise.populate(
          populateOption
            .split('.')
            .reverse()
            .reduce((a, b) => ({ path: b, populate: a }))
        );
      });
    }

    docsPromise = docsPromise.exec();

    return Promise.all([countPromise, docsPromise]).then((values) => {
      const [totalResults, results] = values;
      const totalPages = Math.ceil(totalResults / limit) || 0;
      return {
        results,
        page,
        limit,
        totalPages,
        totalResults,
      };
    });
  };
};

export default paginate;
export { DEFAULT_LIMIT, MAX_LIMIT, resolveLimit };
