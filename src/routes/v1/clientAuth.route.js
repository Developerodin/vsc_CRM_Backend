import express from 'express';
import validate from '../../middlewares/validate.js';
import * as clientAuthValidation from '../../validations/clientAuth.validation.js';
import * as clientAuthController from '../../controllers/clientAuth.controller.js';
import clientAuth from '../../middlewares/clientAuth.js';

const router = express.Router();

router
  .route('/generate-otp')
  .post(
    validate(clientAuthValidation.generateOTP),
    clientAuthController.generateOTP
  );

router
  .route('/verify-otp')
  .post(
    validate(clientAuthValidation.verifyOTPAndLogin),
    clientAuthController.verifyOTPAndLogin
  );

router
  .route('/logout')
  .post(
    validate(clientAuthValidation.logout),
    clientAuthController.logout
  );

router
  .route('/profile')
  .get(
    clientAuth(),
    clientAuthController.getProfile
  );

export default router;
