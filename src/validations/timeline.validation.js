import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createTimeline = {
  body: Joi.object().keys({
    activity: Joi.string().custom(objectId).required(),
    client: Joi.string().custom(objectId).required(),
    status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing').required(),
    subactivity: Joi.string().custom(objectId).optional(),
    period: Joi.string().trim().optional(),
    dueDate: Joi.date().optional(),
    fields: Joi.array().items(
      Joi.object({
        fileName: Joi.string().trim().required(),
        fieldType: Joi.string().valid('text', 'number', 'date', 'email', 'phone', 'url', 'select', 'textarea', 'checkbox', 'radio').required(),
        fieldValue: Joi.any().optional(),
      })
    ).optional(),
    metadata: Joi.object().optional(),
    branch: Joi.string().custom(objectId).required(),
  }),
};

const getTimelines = {
  query: Joi.object().keys({
    activity: Joi.string().custom(objectId),
    activityName: Joi.string(),
    client: Joi.string().custom(objectId),
    status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing'),
    search: Joi.string(),
    branch: Joi.string().custom(objectId),
    today: Joi.boolean(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTimeline = {
  params: Joi.object().keys({
    timelineId: Joi.string().custom(objectId),
  }),
};

const updateTimeline = {
  params: Joi.object().keys({
    timelineId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      activity: Joi.string().custom(objectId),
      client: Joi.string().custom(objectId),
      status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing'),
      subactivity: Joi.string().custom(objectId),
      period: Joi.string().trim(),
      dueDate: Joi.date(),
      fields: Joi.array().items(
        Joi.object({
          fileName: Joi.string().trim().required(),
          fieldType: Joi.string().valid('text', 'number', 'date', 'email', 'phone', 'url', 'select', 'textarea', 'checkbox', 'radio').required(),
          fieldValue: Joi.any().optional(),
        })
      ),
      metadata: Joi.object(),
      branch: Joi.string().custom(objectId),
    })
    .min(1),
};

const deleteTimeline = {
  params: Joi.object().keys({
    timelineId: Joi.string().custom(objectId),
  }),
};

const bulkImportTimelines = {
  body: Joi.object().keys({
    timelines: Joi.array().items(
      Joi.object().keys({
        activity: Joi.string().custom(objectId).required(),
        client: Joi.string().custom(objectId).required(),
        status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing').required(),
        subactivity: Joi.string().custom(objectId).optional(),
        period: Joi.string().trim().optional(),
        dueDate: Joi.date().optional(),
        fields: Joi.array().items(
          Joi.object({
            fileName: Joi.string().trim().required(),
            fieldType: Joi.string().valid('text', 'number', 'date', 'email', 'phone', 'url', 'select', 'textarea', 'checkbox', 'radio').required(),
            fieldValue: Joi.any().optional(),
          })
        ).optional(),
        metadata: Joi.object().optional(),
        branch: Joi.string().custom(objectId).required(),
      })
    ).min(1).required(),
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