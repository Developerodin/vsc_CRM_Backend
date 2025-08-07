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
  const filter = pick(req.query, ['name', 'frequency', 'dueDate']);
  
  // Handle route parameters for frequency and due date
  if (req.params.frequency) {
    filter.frequency = req.params.frequency;
  }
  if (req.params.date) {
    filter.dueDate = req.params.date;
  }
  
  // Remove empty string filters
  Object.keys(filter).forEach((key) => {
    if (filter[key] === '') {
      delete filter[key];
    }
  });
  
  // Handle due date filtering
  if (filter.dueDate) {
    const dueDate = new Date(filter.dueDate);
    if (!isNaN(dueDate.getTime())) {
      filter.dueDate = {
        $gte: dueDate,
        $lt: new Date(dueDate.getTime() + 24 * 60 * 60 * 1000) // Next day
      };
    } else {
      delete filter.dueDate;
    }
  }
  
  // Validate frequency parameter if provided
  if (filter.frequency) {
    const validFrequencies = ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'];
    if (!validFrequencies.includes(filter.frequency)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid frequency value');
    }
  }
  
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

export { createActivity, getActivities, getActivity, updateActivity, deleteActivity, bulkImportActivities }; 