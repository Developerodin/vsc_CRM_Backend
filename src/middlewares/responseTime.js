/**
 * Attach X-Response-Time header and log slow requests (>1s).
 * @returns {import('express').RequestHandler}
 */
const responseTime = () => (req, res, next) => {
  const start = process.hrtime.bigint();
  const originalEnd = res.end;

  res.end = function endWithTiming(...args) {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${durationMs.toFixed(1)}ms`);
    }
    if (durationMs >= 1000) {
      // eslint-disable-next-line no-console
      console.warn(`[slow] ${req.method} ${req.originalUrl} ${durationMs.toFixed(0)}ms`);
    }
    return originalEnd.apply(this, args);
  };

  next();
};

export default responseTime;
