import express from 'express';
import { activityController } from '../../controllers/index.js';
import { activityValidation } from '../../validations/index.js';
import validate from '../../middlewares/validate.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

router
  .route('/')
  .post(validate(activityValidation.createActivity), activityController.createActivity)
  .get(validate(activityValidation.getActivities), activityController.getActivities);

router
  .route('/bulk-import')
  .post(validate(activityValidation.bulkImportActivities), activityController.bulkImportActivities);

router
  .route('/:activityId')
  .get(validate(activityValidation.getActivity), activityController.getActivity)
  .patch(validate(activityValidation.updateActivity), activityController.updateActivity)
  .delete(validate(activityValidation.deleteActivity), activityController.deleteActivity);

export default router;