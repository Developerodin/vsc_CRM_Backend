class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.stack = stack || Error.captureStackTrace(this, this.constructor);
    // Support (statusCode, message, detailsObject) - 3rd arg as details when plain object
    if (details === null && isOperational !== null && typeof isOperational === 'object' && !Array.isArray(isOperational)) {
      this.details = isOperational;
      this.isOperational = true;
    } else {
      this.details = details || null;
    }
  }
}

export default ApiError;
