/**
 * Backward-compatible entrypoint.
 *
 * Implementation moved under `src/jobs/timelineGenerator/` to keep files small
 * and to enforce idempotent timeline creation (atomic upsert + unique index).
 */

export {
  generateRecurringTimelines,
  processDailyTimelines,
  processMonthlyTimelines,
  processQuarterlyTimelines,
  processYearlyTimelines,
  scheduleTimelineJobs,
} from './timelineGenerator/index.js';

