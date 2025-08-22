import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { businessMasterService } from '../services/index.js';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';

const createBusinessMaster = catchAsync(async (req, res) => {
  const businessMaster = await businessMasterService.createBusinessMaster(req.body);
  res.status(httpStatus.CREATED).send(businessMaster);
});

const getBusinessMasters = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'search']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  
  const result = await businessMasterService.queryBusinessMasters(filter, options);
  res.send(result);
});

const getBusinessMaster = catchAsync(async (req, res) => {
  const businessMaster = await businessMasterService.getBusinessMasterById(req.params.businessMasterId);
  if (!businessMaster) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Business Master not found');
  }
  res.send(businessMaster);
});

const updateBusinessMaster = catchAsync(async (req, res) => {
  const businessMaster = await businessMasterService.updateBusinessMasterById(req.params.businessMasterId, req.body);
  res.send(businessMaster);
});

const deleteBusinessMaster = catchAsync(async (req, res) => {
  await businessMasterService.deleteBusinessMasterById(req.params.businessMasterId);
  res.status(httpStatus.NO_CONTENT).send();
});

const bulkImportBusinessMasters = catchAsync(async (req, res) => {
  const result = await businessMasterService.bulkImportBusinessMasters(req.body.businessMasters);
  res.status(httpStatus.OK).send(result);
});

export {
  createBusinessMaster,
  getBusinessMasters,
  getBusinessMaster,
  updateBusinessMaster,
  deleteBusinessMaster,
  bulkImportBusinessMasters,
};
