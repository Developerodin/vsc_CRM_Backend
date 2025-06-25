import express from 'express';
import { clientController } from '../../controllers/index.js';
import { clientValidation } from '../../validations/index.js';
import validate from '../../middlewares/validate.js';
import auth from '../../middlewares/auth.js';
import checkBranchAccess from '../../middlewares/branchAccess.js';

const router = express.Router();

router
  .route('/')
  .post(auth('manageClients'), validate(clientValidation.createClient), clientController.createClient)
  .get(auth('getClients'), validate(clientValidation.getClients), clientController.getClients);

router
  .route('/bulk-import')
  .post(auth('manageClients'), validate(clientValidation.bulkImportClients), clientController.bulkImportClients);

router
  .route('/:clientId')
  .get(auth('getClients'), validate(clientValidation.getClient), clientController.getClient)
  .patch(auth('manageClients'), validate(clientValidation.updateClient), clientController.updateClient)
  .delete(auth('manageClients'), validate(clientValidation.deleteClient), clientController.deleteClient);

export default router; 