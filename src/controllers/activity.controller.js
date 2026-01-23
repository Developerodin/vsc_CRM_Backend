import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { activityService } from '../services/index.js';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';

const createActivity = catchAsync(async (req, res) => {
  const activity = await activityService.createActivity(req.body);
  res.status(httpStatus.CREATED).send(activity);
});

const getActivities = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name']);
  
  // Remove empty string filters
  Object.keys(filter).forEach((key) => {
    if (filter[key] === '') {
      delete filter[key];
    }
  });
  
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await activityService.queryActivities(filter, options);
  res.send(result);
});

const getActivity = catchAsync(async (req, res) => {
  const activity = await activityService.getActivityById(req.params.activityId);
  if (!activity) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Activity not found');
  }
  res.send(activity);
});

const updateActivity = catchAsync(async (req, res) => {
  const activity = await activityService.updateActivityById(req.params.activityId, req.body);
  res.send(activity);
});

const deleteActivity = catchAsync(async (req, res) => {
  await activityService.deleteActivityById(req.params.activityId);
  res.status(httpStatus.NO_CONTENT).send();
});

const bulkImportActivities = catchAsync(async (req, res) => {
  const result = await activityService.bulkImportActivities(req.body.activities);
  res.status(httpStatus.OK).send(result);
});

const createSubactivity = catchAsync(async (req, res) => {
  const activity = await activityService.createSubactivity(req.params.activityId, req.body);
  res.status(httpStatus.CREATED).send(activity);
});

const updateSubactivity = catchAsync(async (req, res) => {
  const activity = await activityService.updateSubactivity(
    req.params.activityId, 
    req.params.subactivityId, 
    req.body
  );
  res.send(activity);
});

const deleteSubactivity = catchAsync(async (req, res) => {
  await activityService.deleteSubactivity(req.params.activityId, req.params.subactivityId);
  res.status(httpStatus.NO_CONTENT).send();
});

const bulkCreateTimelines = catchAsync(async (req, res) => {
  const result = await activityService.bulkCreateTimelines(req.body, req.user);
  res.status(httpStatus.CREATED).send(result);
});

export { 
  createActivity, 
  getActivities, 
  getActivity, 
  updateActivity, 
  deleteActivity, 
  bulkImportActivities,
  createSubactivity,
  updateSubactivity,
  deleteSubactivity,
  bulkCreateTimelines
}; 