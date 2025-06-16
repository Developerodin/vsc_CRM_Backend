import express from 'express';
import { groupController } from '../../controllers/index.js';
import { groupValidation } from '../../validations/index.js';
import validate from '../../middlewares/validate.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

router
  .route('/')
  .post(validate(groupValidation.createGroup), groupController.createGroup)
  .get(validate(groupValidation.getGroups), groupController.getGroups);

router
  .route('/:groupId')
  .get(validate(groupValidation.getGroup), groupController.getGroup)
  .patch(validate(groupValidation.updateGroup), groupController.updateGroup)
  .delete(validate(groupValidation.deleteGroup), groupController.deleteGroup);

export default router; 