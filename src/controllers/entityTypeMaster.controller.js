import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { entityTypeMasterService } from '../services/index.js';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';

const createEntityTypeMaster = catchAsync(async (req, res) => {
  const entityTypeMaster = await entityTypeMasterService.createEntityTypeMaster(req.body);
  res.status(httpStatus.CREATED).send(entityTypeMaster);
});

const getEntityTypeMasters = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'search']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  
  const result = await entityTypeMasterService.queryEntityTypeMasters(filter, options);
  res.send(result);
});

const getEntityTypeMaster = catchAsync(async (req, res) => {
  const entityTypeMaster = await entityTypeMasterService.getEntityTypeMasterById(req.params.entityTypeMasterId);
  if (!entityTypeMaster) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Entity Type Master not found');
  }
  res.send(entityTypeMaster);
});

const updateEntityTypeMaster = catchAsync(async (req, res) => {
  const entityTypeMaster = await entityTypeMasterService.updateEntityTypeMasterById(req.params.entityTypeMasterId, req.body);
  res.send(entityTypeMaster);
});

const deleteEntityTypeMaster = catchAsync(async (req, res) => {
  await entityTypeMasterService.deleteEntityTypeMasterById(req.params.entityTypeMasterId);
  res.status(httpStatus.NO_CONTENT).send();
});

const bulkImportEntityTypeMasters = catchAsync(async (req, res) => {
  const result = await entityTypeMasterService.bulkImportEntityTypeMasters(req.body.entityTypeMasters);
  res.status(httpStatus.OK).send(result);
});

export {
  createEntityTypeMaster,
  getEntityTypeMasters,
  getEntityTypeMaster,
  updateEntityTypeMaster,
  deleteEntityTypeMaster,
  bulkImportEntityTypeMasters,
};
