import express from 'express';
import { groupController } from '../../controllers/index.js';
import { groupValidation } from '../../validations/index.js';
import validate from '../../middlewares/validate.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

router
  .route('/')
  .post(auth('manageGroups'), validate(groupValidation.createGroup), groupController.createGroup)
  .get(auth('getGroups'), validate(groupValidation.getGroups), groupController.getGroups);

router
  .route('/bulk-import')
  .post(auth('manageGroups'), validate(groupValidation.bulkImportGroups), groupController.bulkImportGroups);

router
  .route('/:groupId')
  .get(auth('getGroups'), validate(groupValidation.getGroup), groupController.getGroup)
  .patch(auth('manageGroups'), validate(groupValidation.updateGroup), groupController.updateGroup)
  .delete(auth('manageGroups'), validate(groupValidation.deleteGroup), groupController.deleteGroup);

router
  .route('/:groupId/clients')
  .get(auth('getGroups'), validate(groupValidation.getGroup), groupController.getClientsByGroup)
  .post(auth('manageGroups'), validate(groupValidation.addClientToGroup), groupController.addClientToGroup);

router
  .route('/:groupId/clients/:clientId')
  .delete(auth('manageGroups'), validate(groupValidation.removeClientFromGroup), groupController.removeClientFromGroup);

export default router; 