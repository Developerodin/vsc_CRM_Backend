import passport from 'passport';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { hasPermission } from '../services/role.service.js';

const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
  if (err || info || !user) {
    return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }
  
  // Populate the user's role to get permissions
  await user.populate('role');
  req.user = user;

  if (requiredRights.length) {
    // Check if user has a role
    if (!user.role) {
      return reject(new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned'));
    }

    // Check if user has all required permissions
    const hasRequiredRights = requiredRights.every((requiredRight) => 
      hasPermission(user.role, requiredRight)
    );
    
    if (!hasRequiredRights && req.params.userId !== user.id) {
      return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    }
  }

  resolve();
};

const auth = (...requiredRights) => async (req, res, next) => {
  return new Promise((resolve, reject) => {
    passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights))(req, res, next);
  })
    .then(() => next())
    .catch((err) => next(err));
};

export default auth;

