import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createTimeline = {
  body: Joi.object().keys({
    activity: Joi.string().custom(objectId).required(),
    client: Joi.string().custom(objectId).required(),
    status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing').required(),
    frequency: Joi.string().valid('daily', 'alternate day', 'weekly', 'monthly', 'quarterly', 'yearly').required(),
    frequencyCount: Joi.string().valid('once', 'twice').required(),
    udin: Joi.string().trim(),
    turnover: Joi.number(),
    assignedMember: Joi.string().custom(objectId).required(),
    dueDate: Joi.date(),
  }),
};

const getTimelines = {
  query: Joi.object().keys({
    activity: Joi.string().custom(objectId),
    activityName: Joi.string().trim().allow(''),
    client: Joi.string().custom(objectId),
    status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing').allow(''),
    frequency: Joi.string().valid('daily', 'alternate day', 'weekly', 'monthly', 'quarterly', 'yearly'),
    frequencyCount: Joi.string().valid('once', 'twice'),
    assignedMember: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1),
    page: Joi.number().integer().min(1),
  }),
};

const getTimeline = {
  params: Joi.object().keys({
    timelineId: Joi.string().custom(objectId).required(),
  }),
};

const updateTimeline = {
  params: Joi.object().keys({
    timelineId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      activity: Joi.string().custom(objectId),
      client: Joi.string().custom(objectId),
      status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing'),
      frequency: Joi.string().valid('daily', 'alternate day', 'weekly', 'monthly', 'quarterly', 'yearly'),
      frequencyCount: Joi.string().valid('once', 'twice'),
      udin: Joi.string().trim().allow(''),
      turnover: Joi.number(),
      assignedMember: Joi.string().custom(objectId),
      dueDate: Joi.date(),
    })
    .min(1),
};

const deleteTimeline = {
  params: Joi.object().keys({
    timelineId: Joi.string().custom(objectId).required(),
  }),
};

const bulkImportTimelines = {
  body: Joi.object().keys({
    timelines: Joi.array()
      .items(
        Joi.object().keys({
          id: Joi.string().custom(objectId).optional(),
          activity: Joi.string().custom(objectId).required(),
          client: Joi.string().custom(objectId).required(),
          status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing'),
          frequency: Joi.string().valid('daily', 'alternate day', 'weekly', 'monthly', 'quarterly', 'yearly').required(),
          frequencyCount: Joi.string().valid('once', 'twice').required(),
          udin: Joi.string().trim(),
          turnover: Joi.number(),
          assignedMember: Joi.string().custom(objectId).required(),
          dueDate: Joi.date(),
        })
      )
      .min(1)
      .max(300)
      .required(),
  }),
};

export {
  createTimeline,
  getTimelines,
  getTimeline,
  updateTimeline,
  deleteTimeline,
  bulkImportTimelines,
}; 