import express from 'express';
import { emailTemplateController } from '../../controllers/index.js';
import { emailTemplateValidation } from '../../validations/index.js';
import validate from '../../middlewares/validate.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

router
  .route('/')
  .post(auth('sendEmails'), validate(emailTemplateValidation.createTemplate), emailTemplateController.createTemplate)
  .get(auth('sendEmails'), validate(emailTemplateValidation.queryTemplates), emailTemplateController.queryTemplates);

router
  .route('/send-bulk')
  .post(auth('sendEmails'), validate(emailTemplateValidation.sendBulkToClients), emailTemplateController.sendBulkToClients);

router
  .route('/:templateId')
  .get(auth('sendEmails'), validate(emailTemplateValidation.getTemplate), emailTemplateController.getTemplate)
  .patch(auth('sendEmails'), validate(emailTemplateValidation.updateTemplate), emailTemplateController.updateTemplate)
  .delete(auth('sendEmails'), validate(emailTemplateValidation.deleteTemplate), emailTemplateController.deleteTemplate);

export default router;
