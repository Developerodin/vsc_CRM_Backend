import passport from 'passport';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';

const verifyClientCallback = (req, resolve, reject) => async (err, user, info) => {
  if (err || info || !user) {
    return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }
  
  // Check if the user is a client
  if (user.userType !== 'client') {
    return reject(new ApiError(httpStatus.FORBIDDEN, 'Access denied. Client authentication required.'));
  }
  
  req.user = user;
  resolve();
};

const clientAuth = () => async (req, res, next) => {
  return new Promise((resolve, reject) => {
    passport.authenticate('client-jwt', { session: false }, verifyClientCallback(req, resolve, reject))(req, res, next);
  })
    .then(() => next())
    .catch((err) => next(err));
};

export default clientAuth;
