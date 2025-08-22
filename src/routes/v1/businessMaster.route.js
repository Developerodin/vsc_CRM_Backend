import express from 'express';
import { businessMasterController } from '../../controllers/index.js';
import { businessMasterValidation } from '../../validations/index.js';
import validate from '../../middlewares/validate.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

router
  .route('/')
  .post(auth(), validate(businessMasterValidation.createBusinessMaster), businessMasterController.createBusinessMaster)
  .get(auth(), validate(businessMasterValidation.getBusinessMasters), businessMasterController.getBusinessMasters);

router
  .route('/bulk-import')
  .post(auth(), validate(businessMasterValidation.bulkImportBusinessMasters), businessMasterController.bulkImportBusinessMasters);

router
  .route('/:businessMasterId')
  .get(auth(), validate(businessMasterValidation.getBusinessMaster), businessMasterController.getBusinessMaster)
  .patch(auth(), validate(businessMasterValidation.updateBusinessMaster), businessMasterController.updateBusinessMaster)
  .delete(auth(), validate(businessMasterValidation.deleteBusinessMaster), businessMasterController.deleteBusinessMaster);

export default router;
