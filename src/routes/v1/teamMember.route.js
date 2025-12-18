import express from 'express';
import { teamMemberController } from '../../controllers/index.js';
import { teamMemberValidation } from '../../validations/index.js';
import validate from '../../middlewares/validate.js';
import auth from '../../middlewares/auth.js';
import branchAccess from '../../middlewares/branchAccess.js';

const router = express.Router();

router
  .route('/')
  .post(auth(), validate(teamMemberValidation.createTeamMember), teamMemberController.createTeamMember)
  .get(auth(), validate(teamMemberValidation.getTeamMembers), teamMemberController.getTeamMembers);

router
  .route('/bulk-import')
  .post(auth(), validate(teamMemberValidation.bulkImportTeamMembers), teamMemberController.bulkImportTeamMembers);

router
  .route('/:teamMemberId/accessible-members')
  .get(auth(), validate(teamMemberValidation.getAccessibleTeamMembers), teamMemberController.getAccessibleTeamMembers)
  .patch(auth(), validate(teamMemberValidation.updateAccessibleTeamMembers), teamMemberController.updateAccessibleTeamMembers);

router
  .route('/:teamMemberId')
  .get(auth(), validate(teamMemberValidation.getTeamMember), teamMemberController.getTeamMember)
  .patch(auth(), validate(teamMemberValidation.updateTeamMember), teamMemberController.updateTeamMember)
  .delete(auth(), validate(teamMemberValidation.deleteTeamMember), teamMemberController.deleteTeamMember);

export default router;