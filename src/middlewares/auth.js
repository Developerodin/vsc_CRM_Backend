import passport from 'passport';
import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { hasPermission } from '../services/role.service.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import config from '../config/config.js';
import { Token } from '../models/index.js';
import { tokenTypes } from '../config/tokens.js';

const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
  if (err || info || !user) {
    return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }
  
  // Fetch the user's role directly from the database
  try {
    const Role = mongoose.model('Role');
    const role = await Role.findById(user.role);
    user.role = role;
  } catch (populateError) {
    console.error("Error fetching role:", populateError.message);
    return reject(new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Error fetching user role'));
  }
  
  req.user = user;
  
  if (requiredRights.length) {
    // Check if user has a role
    if (!user.role) {
      return reject(new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned'));
    }

    // Check if user has all required permissions
    const hasRequiredRights = requiredRights.every((requiredRight) => {
      return hasPermission(user.role, requiredRight);
    });
    
    if (!hasRequiredRights && req.params.userId !== user.id) {
      return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    }
  }

  resolve();
};

const tryTeamMemberAuth = async (req) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    // Verify the token
    const payload = jwt.verify(token, config.jwt.secret);
    
    // Check if it's a team member token
    if (payload.type !== tokenTypes.TEAM_MEMBER_ACCESS) {
      return null;
    }
    
    // Check if token exists in database and is valid
    const tokenDoc = await Token.findOne({
      token,
      type: tokenTypes.TEAM_MEMBER_ACCESS,
      blacklisted: false,
    });

    if (!tokenDoc) {
      return null;
    }

    // Load the team member
    const TeamMember = mongoose.model('TeamMember');
    const teamMember = await TeamMember.findById(payload.sub);
    
    if (!teamMember) {
      return null;
    }

    // Return team member with userType marker
    return {
      ...teamMember.toObject(),
      id: teamMember._id.toString(),
      userType: 'teamMember',
      branch: teamMember.branch,
    };
  } catch (error) {
    // If token verification fails, return null (not a team member token)
    return null;
  }
};

const auth = (...requiredRights) => async (req, res, next) => {
  // First try regular user authentication
  return new Promise((resolve, reject) => {
    passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights))(req, res, next);
  })
    .then(() => next())
    .catch(async (err) => {
      // If regular auth fails, try team member auth
      if (err.statusCode === httpStatus.UNAUTHORIZED || err.statusCode === httpStatus.FORBIDDEN) {
        try {
          const teamMember = await tryTeamMemberAuth(req);
          
          if (teamMember) {
            // Team member authenticated
            req.user = teamMember;
            
            // For team members, we allow access to getTimelines without role check
            // They'll be filtered by branch in the service layer
            if (requiredRights.length > 0 && requiredRights.includes('getTimelines')) {
              // Allow team members to access timelines (filtered by branch)
              return next();
            }
            
            // For other permissions, team members need roles (which they don't have)
            // So we reject for now, but you can extend this logic
            const requiredPermission = requiredRights.join(' or ');
            return next(new ApiError(httpStatus.FORBIDDEN, `Team members can only access timelines. Required permission: ${requiredPermission}`));
          }
        } catch (teamMemberError) {
          // Team member auth also failed, return original error
        }
      }
      
      // Return original error if team member auth didn't work
      next(err);
    });
};

export default auth;

