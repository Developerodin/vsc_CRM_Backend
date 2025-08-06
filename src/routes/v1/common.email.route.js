import express from 'express';
import { commonEmailController } from '../../controllers/index.js';
import { commonEmailValidation } from '../../validations/index.js';
import validate from '../../middlewares/validate.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

// Send custom email
router
  .route('/send')
  .post(validate(commonEmailValidation.sendCustomEmail), commonEmailController.sendCustomEmail);

// Send task assignment email
router
  .route('/task-assignment')
  .post(auth('sendEmails'), validate(commonEmailValidation.sendTaskAssignmentEmail), commonEmailController.sendTaskAssignmentEmail);

// Send notification email
router
  .route('/notification')
  .post(auth('sendEmails'), validate(commonEmailValidation.sendNotificationEmail), commonEmailController.sendNotificationEmail);

// Send bulk emails
router
  .route('/bulk')
  .post(auth('sendEmails'), validate(commonEmailValidation.sendBulkEmails), commonEmailController.sendBulkEmails);

export default router;
