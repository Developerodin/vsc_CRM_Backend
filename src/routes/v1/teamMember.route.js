import express from 'express';
import { teamMemberController } from '../../controllers/index.js';
import { teamMemberValidation } from '../../validations/index.js';
import validate from '../../middlewares/validate.js';
import auth from '../../middlewares/auth.js';

const router = express.Router();

router
  .route('/')
  .post(validate(teamMemberValidation.createTeamMember), teamMemberController.createTeamMember)
  .get(validate(teamMemberValidation.getTeamMembers), teamMemberController.getTeamMembers);

router
  .route('/bulk-import')
  .post(validate(teamMemberValidation.bulkImportTeamMembers), teamMemberController.bulkImportTeamMembers);

router
  .route('/:teamMemberId')
  .get(validate(teamMemberValidation.getTeamMember), teamMemberController.getTeamMember)
  .patch(validate(teamMemberValidation.updateTeamMember), teamMemberController.updateTeamMember)
  .delete(validate(teamMemberValidation.deleteTeamMember), teamMemberController.deleteTeamMember);

export default router;