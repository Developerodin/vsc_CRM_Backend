import express from 'express';
import validate from '../../middlewares/validate.js';
import * as teamMemberAuthValidation from '../../validations/teamMemberAuth.validation.js';
import * as teamMemberAuthController from '../../controllers/teamMemberAuth.controller.js';
import teamMemberAuth from '../../middlewares/teamMemberAuth.js';

const router = express.Router();

router
  .route('/generate-otp')
  .post(
    validate(teamMemberAuthValidation.generateOTP),
    teamMemberAuthController.generateOTP
  );

router
  .route('/verify-otp')
  .post(
    validate(teamMemberAuthValidation.verifyOTPAndLogin),
    teamMemberAuthController.verifyOTPAndLogin
  );

router
  .route('/logout')
  .post(
    validate(teamMemberAuthValidation.logout),
    teamMemberAuthController.logout
  );

router
  .route('/refresh-tokens')
  .post(
    validate(teamMemberAuthValidation.refreshTokens),
    teamMemberAuthController.refreshTokens
  );

router
  .route('/profile')
  .get(
    teamMemberAuth(),
    teamMemberAuthController.getProfile
  )
  .patch(
    teamMemberAuth(),
    validate(teamMemberAuthValidation.updateProfile),
    teamMemberAuthController.updateProfile
  );

// Task management routes
router
  .route('/tasks')
  .get(
    teamMemberAuth(),
    teamMemberAuthController.getMyTasks
  );

router
  .route('/tasks/:taskId')
  .get(
    teamMemberAuth(),
    teamMemberAuthController.getTaskDetails
  )
  .patch(
    teamMemberAuth(),
    teamMemberAuthController.updateTask
  );

export default router;
