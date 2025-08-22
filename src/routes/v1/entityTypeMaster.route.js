import express from 'express';
import { entityTypeMasterController } from '../../controllers/index.js';
import { entityTypeMasterValidation } from '../../validations/index.js';
import validate from '../../middlewares/validate.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

router
  .route('/')
  .post(auth(), validate(entityTypeMasterValidation.createEntityTypeMaster), entityTypeMasterController.createEntityTypeMaster)
  .get(auth(), validate(entityTypeMasterValidation.getEntityTypeMasters), entityTypeMasterController.getEntityTypeMasters);

router
  .route('/bulk-import')
  .post(auth(), validate(entityTypeMasterValidation.bulkImportEntityTypeMasters), entityTypeMasterController.bulkImportEntityTypeMasters);

router
  .route('/:entityTypeMasterId')
  .get(auth(), validate(entityTypeMasterValidation.getEntityTypeMaster), entityTypeMasterController.getEntityTypeMaster)
  .patch(auth(), validate(entityTypeMasterValidation.updateEntityTypeMaster), entityTypeMasterController.updateEntityTypeMaster)
  .delete(auth(), validate(entityTypeMasterValidation.deleteEntityTypeMaster), entityTypeMasterController.deleteEntityTypeMaster);

export default router;
