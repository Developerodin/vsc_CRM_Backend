import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { branchService } from '../services/index.js';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';

const createBranch = catchAsync(async (req, res) => {
  const branch = await branchService.createBranch(req.body);
  res.status(httpStatus.CREATED).send(branch);
});

const getBranches = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'branchHead', 'email', 'phone', 'city', 'state', 'country', 'pinCode']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await branchService.queryBranches(filter, options);
  res.send(result);
});

const getBranch = catchAsync(async (req, res) => {
  const branch = await branchService.getBranchById(req.params.branchId);
  if (!branch) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Branch not found');
  }
  res.send(branch);
});

const updateBranch = catchAsync(async (req, res) => {
  const branch = await branchService.updateBranchById(req.params.branchId, req.body);
  res.send(branch);
});

const deleteBranch = catchAsync(async (req, res) => {
  await branchService.deleteBranchById(req.params.branchId);
  res.status(httpStatus.NO_CONTENT).send();
});

export {
  createBranch,
  getBranches,
  getBranch,
  updateBranch,
  deleteBranch,
};