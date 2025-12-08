import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { timelineService, timelineBulkImportService } from '../services/index.js';

import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';

const createTimeline = catchAsync(async (req, res) => {
  // Handle client as array - extract first element if it's an array
  const body = { ...req.body };
  if (Array.isArray(body.client) && body.client.length > 0) {
    body.client = body.client[0];
  }
  
  const timeline = await timelineService.createTimeline(body, req.user);
  res.status(httpStatus.CREATED).send(timeline);
});

const getTimelines = catchAsync(async (req, res) => {
  const filter = pick(req.query, [
    'activity', 
    'activityName', 
    'client', 
    'search', 
    'status', 
    'branch', 
    'group',
    'today',
    'subactivity',
    'period',
    'frequency',
    'startDate',
    'endDate',
    'financialYear'
  ]);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  
  // Add branch filtering based on user's access
  const result = await timelineService.queryTimelines(filter, options, req.user);
  res.send(result);
});

const getTimeline = catchAsync(async (req, res) => {
  const timeline = await timelineService.getTimelineById(req.params.timelineId);
  if (!timeline) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Timeline not found');
  }
  res.send(timeline);
});

const updateTimeline = catchAsync(async (req, res) => {
  const timeline = await timelineService.updateTimelineById(req.params.timelineId, req.body, req.user);
  res.send(timeline);
});

const deleteTimeline = catchAsync(async (req, res) => {
  await timelineService.deleteTimelineById(req.params.timelineId);
  res.status(httpStatus.NO_CONTENT).send();
});

const bulkImportTimelines = catchAsync(async (req, res) => {
  const result = await timelineService.bulkImportTimelines(req.body.timelines);
  res.status(httpStatus.OK).send(result);
});

const getFrequencyPeriods = catchAsync(async (req, res) => {
  const { frequency, financialYear } = req.query;
  
  if (!frequency) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Frequency parameter is required');
  }
  
  // Validate frequency
  const validFrequencies = ['Monthly', 'Quarterly', 'Yearly'];
  if (!validFrequencies.includes(frequency)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`);
  }
  
  const result = await timelineService.getFrequencyPeriods(frequency, financialYear);
  res.send(result);
});

const bulkImportTimelineFieldsController = catchAsync(async (req, res) => {
  const { timelineUpdates } = req.body;
  
  if (!timelineUpdates || !Array.isArray(timelineUpdates)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'timelineUpdates array is required');
  }
  
  if (timelineUpdates.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'timelineUpdates array cannot be empty');
  }
  
  const result = await timelineBulkImportService.bulkImportTimelineFields(timelineUpdates, req.user);
  res.status(httpStatus.OK).send(result);
});

export {
  createTimeline,
  getTimelines,
  getTimeline,
  updateTimeline,
  deleteTimeline,
  bulkImportTimelines,
  getFrequencyPeriods,
  bulkImportTimelineFieldsController as bulkImportTimelineFields,
}; 