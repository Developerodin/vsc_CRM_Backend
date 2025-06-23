import httpStatus from 'http-status';
import ApiError from '../utils/ApiError.js';
import { hasBranchAccess } from '../services/role.service.js';

const checkBranchAccess = (req, res, next) => {
  const user = req.user;
  const branchId = req.params.branchId || req.body.branchId || req.query.branchId;

  if (!branchId) {
    return next();
  }

  if (!user.role) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'User has no role assigned'));
  }

  if (!hasBranchAccess(user.role, branchId)) {
    return next(new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch'));
  }

  next();
};

export default checkBranchAccess; 