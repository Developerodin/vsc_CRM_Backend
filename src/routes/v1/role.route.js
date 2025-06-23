import express from 'express';
import auth from '../../middlewares/auth.js';
import validate from '../../middlewares/validate.js';
import * as roleValidation from '../../validations/role.validation.js';
import * as roleController from '../../controllers/role.controller.js';

const router = express.Router();

router
  .route('/')
  .post(
    // auth('manageRoles'), // Temporarily disabled for initial setup
    validate(roleValidation.createRole),
    roleController.createRole
  )
  .get(
    // auth('getRoles'), // Temporarily disabled for initial setup
    validate(roleValidation.getRoles),
    roleController.getRoles
  );

router
  .route('/active')
  .get(
    // auth('getRoles'), // Temporarily disabled for initial setup
    roleController.getActiveRoles
  );

router
  .route('/permissions')
  .get(
    // auth(), // Temporarily disabled for initial setup
    roleController.getUserPermissions
  );

router
  .route('/available-permissions')
  .get(
    // auth('getRoles'), // Temporarily disabled for initial setup
    roleController.getAvailablePermissions
  );

router
  .route('/available-navigation-permissions')
  .get(
    // auth('getRoles'), // Temporarily disabled for initial setup
    roleController.getAvailableNavigationPermissions
  );

router
  .route('/available-api-permissions')
  .get(
    // auth('getRoles'), // Temporarily disabled for initial setup
    roleController.getAvailableApiPermissions
  );

router
  .route('/:roleId')
  .get(
    // auth('getRoles'), // Temporarily disabled for initial setup
    validate(roleValidation.getRole),
    roleController.getRole
  )
  .patch(
    // auth('manageRoles'), // Temporarily disabled for initial setup
    validate(roleValidation.updateRole),
    roleController.updateRole
  )
  .delete(
    // auth('manageRoles'), // Temporarily disabled for initial setup
    validate(roleValidation.deleteRole),
    roleController.deleteRole
  );

export default router; 