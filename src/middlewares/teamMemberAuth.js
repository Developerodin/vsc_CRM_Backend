import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { Token } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import logger from '../config/logger.js';

const teamMemberAuth = () => catchAsync(async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Access token required');
    }

    // Verify the token
    const payload = jwt.verify(token, config.jwt.secret);
    
    // Check if token exists in database and is valid
    const tokenDoc = await Token.findOne({
      token,
      type: 'teamMemberAccess',
      blacklisted: false,
    });

    if (!tokenDoc) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Token not found or blacklisted');
    }

    // Add user info to request
    req.user = {
      id: payload.sub,
      email: payload.email,
      type: payload.type
    };

    // Verify this is a team member token
    if (payload.type !== 'teamMemberAccess') {
      throw new ApiError(httpStatus.FORBIDDEN, 'Invalid token type for team member access');
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new ApiError(httpStatus.UNAUTHORIZED, 'Token expired'));
    } else {
      next(error);
    }
  }
});

export default teamMemberAuth;
