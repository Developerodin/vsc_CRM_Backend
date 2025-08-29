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

// Task statistics route - MUST be before /:clientId routes to avoid routing conflicts
router
  .route('/task-statistics')
  .get(auth('getClients'), validate(clientValidation.getClientTaskStatistics), clientController.getClientTaskStatistics);

router
  .route('/:clientId')
  .get(auth('getClients'), validate(clientValidation.getClient), clientController.getClient)
  .patch(auth('manageClients'), validate(clientValidation.updateClient), clientController.updateClient)
  .delete(auth('manageClients'), validate(clientValidation.deleteClient), clientController.deleteClient);

// Activity management routes
router
  .route('/:clientId/activities')
  .get(auth('getClients'), validate(clientValidation.getClientActivities), clientController.getClientActivities)
  .post(auth('manageClients'), validate(clientValidation.addActivityToClient), clientController.addActivityToClient);

router
  .route('/:clientId/activities/:activityId')
  .patch(auth('manageClients'), validate(clientValidation.updateActivityAssignment), clientController.updateActivityAssignment)
  .delete(auth('manageClients'), validate(clientValidation.removeActivityFromClient), clientController.removeActivityFromClient);

// Client status update route
router
  .route('/:clientId/status')
  .patch(auth('manageClients'), validate(clientValidation.updateClientStatus), clientController.updateClientStatus);

export default router; 