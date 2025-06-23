import express from 'express';
import { branchController } from '../../controllers/index.js';
import { branchValidation } from '../../validations/index.js';
import validate from '../../middlewares/validate.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

router
  .route('/')
  .post(validate(branchValidation.createBranch), branchController.createBranch)
  .get(validate(branchValidation.getBranches), branchController.getBranches);

router
  .route('/bulk-import')
  .post(validate(branchValidation.bulkImportBranches), branchController.bulkImportBranches);

router
  .route('/:branchId')
  .get(validate(branchValidation.getBranch), branchController.getBranch)
  .patch(validate(branchValidation.updateBranch), branchController.updateBranch)
  .delete(validate(branchValidation.deleteBranch), branchController.deleteBranch);

export default router; 