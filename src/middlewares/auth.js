import passport from 'passport';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { hasPermission } from '../services/role.service.js';
import mongoose from 'mongoose';

const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
  console.log("=== AUTH DEBUG ===");
  console.log("Error:", err);
  console.log("Info:", info);
  console.log("User:", user);
  console.log("Required Rights:", requiredRights);
  
  if (err || info || !user) {
    console.log("Authentication failed - returning 401");
    return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }
  
  // Fetch the user's role directly from the database
  try {
    const Role = mongoose.model('Role');
    const role = await Role.findById(user.role);
    user.role = role;
    console.log("Role fetched:", role);
  } catch (populateError) {
    console.log("Error fetching role:", populateError);
  }
  
  req.user = user;
  console.log("User authenticated successfully:", {
    id: user._id,
    email: user.email,
    role: user.role ? user.role.name : 'No role',
    roleId: user.role ? user.role._id : 'No role ID'
  });
  
  if (requiredRights.length) {
    // Check if user has a role
    if (!user.role) {
      console.log("User has no role assigned");
      return reject(new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned'));
    }

    // Check if user has all required permissions
    const hasRequiredRights = requiredRights.every((requiredRight) => {
      const hasRight = hasPermission(user.role, requiredRight);
      console.log(`Permission check: ${requiredRight} = ${hasRight}`);
      console.log(`User role permissions:`, user.role.apiPermissions);
      return hasRight;
    });
    
    if (!hasRequiredRights && req.params.userId !== user.id) {
      console.log("User lacks required permissions");
      return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    }
  }

  console.log("=== AUTH SUCCESS ===");
  resolve();
};

const auth = (...requiredRights) => async (req, res, next) => {
  console.log("Auth middleware called with required rights:", requiredRights);
  return new Promise((resolve, reject) => {
    passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights))(req, res, next);
  })
    .then(() => next())
    .catch((err) => next(err));
};

export default auth;

