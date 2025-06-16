import express from 'express';
import { clientController } from '../../controllers/index.js';
import { clientValidation } from '../../validations/index.js';
import validate from '../../middlewares/validate.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

router
  .route('/')
  .post(validate(clientValidation.createClient), clientController.createClient)
  .get(validate(clientValidation.getClients), clientController.getClients);

router
  .route('/:clientId')
  .get(validate(clientValidation.getClient), clientController.getClient)
  .patch(validate(clientValidation.updateClient), clientController.updateClient)
  .delete(validate(clientValidation.deleteClient), clientController.deleteClient);

export default router; 