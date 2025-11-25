/* eslint-disable no-param-reassign */

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
   * Query for documents with pagination
   * @param {Object} [filter] - Mongo filter
   * @param {Object} [options] - Query options
   * @param {string} [options.sortBy] - Sorting criteria using the format: sortField:(desc|asc). Multiple sorting criteria should be separated by commas (,)
   * @param {string} [options.populate] - Populate data fields. Hierarchy of fields should be separated by (.). Multiple populating criteria should be separated by commas (,)
   * @param {number} [options.limit] - Maximum number of results per page (if not provided, returns all results)
   * @param {number} [options.page] - Current page (default = 1)
   * @returns {Promise<QueryResult>}
   */
  schema.statics.paginate = async function (filter, options) {
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

    // If no limit is provided, return all results (no pagination)
    const hasLimit = options.limit && parseInt(options.limit, 10) > 0;
    const limit = hasLimit ? parseInt(options.limit, 10) : null;
    const page = options.page && parseInt(options.page, 10) > 0 ? parseInt(options.page, 10) : 1;
    const skip = hasLimit ? (page - 1) * limit : 0;

    const countPromise = this.countDocuments(filter).exec();
    let docsPromise = this.find(filter).sort(sort);
    
    // Only apply skip and limit if limit was explicitly provided
    if (hasLimit) {
      docsPromise = docsPromise.skip(skip).limit(limit);
    }

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
      // If populate is an array, convert it to string format for the plugin
      const populateString = options.populate.map(p => 
        typeof p === 'string' ? p : p.path
      ).join(',');
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
      const totalPages = hasLimit ? Math.ceil(totalResults / limit) : 1;
      const result = {
        results,
        page,
        limit: limit || totalResults, // If no limit, show totalResults as limit
        totalPages,
        totalResults,
      };
      return Promise.resolve(result);
    });
  };
};

export default paginate;

