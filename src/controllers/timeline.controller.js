import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { timelineService } from '../services/index.js';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';

const createTimeline = catchAsync(async (req, res) => {
  const timeline = await timelineService.createTimeline(req.body, req.user);
  res.status(httpStatus.CREATED).send(timeline);
});

const getTimelines = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['activity', 'activityName', 'client', 'status', 'frequency', 'assignedMember', 'branch', 'today', 'startDate', 'endDate']);
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

// Get UDIN array for a timeline
const getTimelineUdin = catchAsync(async (req, res) => {
  const timeline = await timelineService.getTimelineById(req.params.timelineId);
  if (!timeline) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Timeline not found');
  }
  res.send({ udin: timeline.udin });
});

// Update UDIN array for a timeline
const updateTimelineUdin = catchAsync(async (req, res) => {
  const timeline = await timelineService.updateTimelineUdin(req.params.timelineId, req.body.udin, req.user);
  res.send({ udin: timeline.udin });
});

// Get frequency status for a timeline
const getFrequencyStatus = catchAsync(async (req, res) => {
  const frequencyStatus = await timelineService.getFrequencyStatus(req.params.timelineId, req.user);
  res.send(frequencyStatus);
});

// Update frequency status for a specific period
const updateFrequencyStatus = catchAsync(async (req, res) => {
  try {
    const timeline = await timelineService.updateFrequencyStatus(
      req.params.timelineId, 
      req.params.period, 
      req.body, 
      req.user
    );
    res.send(timeline);
  } catch (error) {
    // Provide more specific error messages
    if (error.message.includes('Frequency period')) {
      throw new ApiError(httpStatus.NOT_FOUND, error.message);
    } else if (error.message.includes('validation failed')) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid frequency status data. Please check the period and status values.');
    } else {
      throw error;
    }
  }
});

// Initialize or regenerate frequency status for a timeline
const initializeFrequencyStatus = catchAsync(async (req, res) => {
  const timeline = await timelineService.initializeOrRegenerateFrequencyStatus(req.params.timelineId, req.user);
  res.send(timeline);
});

export {
  createTimeline,
  getTimelines,
  getTimeline,
  updateTimeline,
  deleteTimeline,
  bulkImportTimelines,
  getTimelineUdin,
  updateTimelineUdin,
  getFrequencyStatus,
  updateFrequencyStatus,
  initializeFrequencyStatus,
}; 