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

router
  .route('/bulk-import-fields')
  .post(auth('manageTimelines'), validate(timelineValidation.bulkImportTimelineFields), timelineController.bulkImportTimelineFields);

router
  .route('/frequency-periods')
  .get(auth('getTimelines'), timelineController.getFrequencyPeriods);

// Add frequency-status-stats endpoint before the dynamic :timelineId route
router
  .route('/frequency-status-stats')
  .get(auth('getTimelines'), timelineController.getFrequencyStatusStats);

router
  .route('/:timelineId')
  .get(auth('getTimelines'), validate(timelineValidation.getTimeline), timelineController.getTimeline)
  .patch(auth('manageTimelines'), validate(timelineValidation.updateTimeline), timelineController.updateTimeline)
  .delete(auth('manageTimelines'), validate(timelineValidation.deleteTimeline), timelineController.deleteTimeline);

export default router; 