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
  const filter = pick(req.query, ['activity', 'activityName', 'client', 'search', 'status', 'branch', 'today']);
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

export {
  createTimeline,
  getTimelines,
  getTimeline,
  updateTimeline,
  deleteTimeline,
  bulkImportTimelines,
}; 