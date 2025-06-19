import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createTimeline = {
  body: Joi.object().keys({
    activity: Joi.string().custom(objectId).required(),
    client: Joi.string().custom(objectId).required(),
    frequency: Joi.string().valid('daily', 'alternate day', 'weekly', 'monthly', 'quarterly', 'yearly').required(),
    frequencyCount: Joi.string().valid('once', 'twice').required(),
    udin: Joi.string().required().trim(),
    turnover: Joi.number().required(),
    assignedMember: Joi.string().custom(objectId).required(),
    dueDate: Joi.date().required(),
  }),
};

const getTimelines = {
  query: Joi.object().keys({
    activity: Joi.string().custom(objectId),
    client: Joi.string().custom(objectId),
    frequency: Joi.string().valid('daily', 'alternate day', 'weekly', 'monthly', 'quarterly', 'yearly'),
    frequencyCount: Joi.string().valid('once', 'twice'),
    udin: Joi.string(),
    assignedMember: Joi.string().custom(objectId),
    dueDate: Joi.date(),
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
      frequency: Joi.string().valid('daily', 'alternate day', 'weekly', 'monthly', 'quarterly', 'yearly'),
      frequencyCount: Joi.string().valid('once', 'twice'),
      udin: Joi.string().trim(),
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
          frequency: Joi.string().valid('daily', 'alternate day', 'weekly', 'monthly', 'quarterly', 'yearly').required(),
          frequencyCount: Joi.string().valid('once', 'twice').required(),
          udin: Joi.string().required().trim(),
          turnover: Joi.number().required(),
          assignedMember: Joi.string().custom(objectId).required(),
          dueDate: Joi.date().required(),
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