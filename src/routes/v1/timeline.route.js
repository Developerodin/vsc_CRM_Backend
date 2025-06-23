import express from 'express';
import { timelineController } from '../../controllers/index.js';
import { timelineValidation } from '../../validations/index.js';
import validate from '../../middlewares/validate.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

router
  .route('/')
  .post(validate(timelineValidation.createTimeline), timelineController.createTimeline)
  .get(validate(timelineValidation.getTimelines), timelineController.getTimelines);

router
  .route('/bulk-import')
  .post(validate(timelineValidation.bulkImportTimelines), timelineController.bulkImportTimelines);

router
  .route('/:timelineId')
  .get(validate(timelineValidation.getTimeline), timelineController.getTimeline)
  .patch(validate(timelineValidation.updateTimeline), timelineController.updateTimeline)
  .delete(validate(timelineValidation.deleteTimeline), timelineController.deleteTimeline);

export default router; 