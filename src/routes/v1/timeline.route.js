import express from 'express';
import { timelineController } from '../../controllers/index.js';
import { timelineValidation } from '../../validations/index.js';
import validate from '../../middlewares/validate.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

router
  .route('/')
  .post(auth('manageTimelines'), validate(timelineValidation.createTimeline), timelineController.createTimeline)
  .get(auth('getTimelines'), validate(timelineValidation.getTimelines), timelineController.getTimelines);

router
  .route('/bulk-import')
  .post(auth('manageTimelines'), validate(timelineValidation.bulkImportTimelines), timelineController.bulkImportTimelines);

// Get frequency status statistics across all timelines
router
  .route('/frequency-status-stats')
  .get(auth('getTimelines'), validate(timelineValidation.getFrequencyStatusStats), timelineController.getFrequencyStatusStats);

router
  .route('/:timelineId')
  .get(auth('getTimelines'), validate(timelineValidation.getTimeline), timelineController.getTimeline)
  .patch(auth('manageTimelines'), validate(timelineValidation.updateTimeline), timelineController.updateTimeline)
  .delete(auth('manageTimelines'), validate(timelineValidation.deleteTimeline), timelineController.deleteTimeline);

router
  .route('/:timelineId/udin')
  .get(auth('getTimelines'), timelineController.getTimelineUdin)
  .patch(auth('manageTimelines'), validate(timelineValidation.updateTimelineUdin), timelineController.updateTimelineUdin);

router
  .route('/:timelineId/frequency-status')
  .get(auth('getTimelines'), timelineController.getFrequencyStatus)
  .post(auth('manageTimelines'), timelineController.initializeFrequencyStatus);

router
  .route('/:timelineId/frequency-status/:period')
  .patch(auth('manageTimelines'), validate(timelineValidation.updateFrequencyStatus), timelineController.updateFrequencyStatus);

export default router; 