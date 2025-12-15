import Joi from 'joi';
import { objectId } from './custom.validation.js';

// Frequency configuration validation schema
const frequencyConfigSchema = Joi.object({
  // Hourly frequency fields
  hourlyInterval: Joi.number().min(1).max(24).optional(),
  
  // Daily frequency fields
  dailyTime: Joi.string().pattern(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$|^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/).allow('', null).optional(),
  
  // Weekly frequency fields
  weeklyDays: Joi.array().items(
    Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  ).allow(null).optional(),
  weeklyTime: Joi.string().pattern(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$|^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/).allow('', null).optional(),
  
  // Monthly frequency fields
  monthlyDay: Joi.number().min(1).max(31).allow(null).optional(),
  monthlyTime: Joi.string().pattern(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$|^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/).allow('', null).optional(),
  
  // Quarterly frequency fields
  quarterlyMonths: Joi.array().items(
    Joi.string().valid('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')
  ).allow(null).optional(),
  quarterlyDay: Joi.number().min(1).max(31).allow(null).optional(),
  quarterlyTime: Joi.string().pattern(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$|^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/).allow('', null).optional(),
  
  // Yearly frequency fields
  yearlyMonth: Joi.array().items(
    Joi.string().valid('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')
  ).allow(null).optional(),
  yearlyDate: Joi.number().min(1).max(31).allow(null).optional(),
  yearlyTime: Joi.string().pattern(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$|^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/).allow('', null).optional(),
});

const createTimeline = {
  body: Joi.object().keys({
    activity: Joi.string().custom(objectId).required(),
    client: Joi.alternatives().try(
      Joi.string().custom(objectId),
      Joi.array().items(Joi.string().custom(objectId)).min(1).max(1)
    ).required(),
    status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing').required(),
    subactivity: Joi.string().custom(objectId).optional(),
    period: Joi.string().trim().optional(),
    dueDate: Joi.date().optional(),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    frequency: Joi.string().valid('None', 'OneTime', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly').optional(),
    frequencyConfig: frequencyConfigSchema.optional(),
    timelineType: Joi.string().valid('oneTime', 'recurring').optional(),
    financialYear: Joi.string().trim().optional(),
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
    client: Joi.alternatives().try(
      Joi.string().custom(objectId),
      Joi.string().trim()
    ),
    status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing'),
    search: Joi.string(),
    branch: Joi.string().custom(objectId),
    group: Joi.alternatives().try(
      Joi.string().custom(objectId),
      Joi.string().trim()
    ),
    today: Joi.boolean(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    // New filter parameters
    subactivity: Joi.alternatives().try(
      Joi.string().custom(objectId),
      Joi.string().trim()
    ),
    frequency: Joi.string(),
    period: Joi.string().trim(),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    financialYear: Joi.string().trim(),
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
      startDate: Joi.date(),
      endDate: Joi.date(),
      frequency: Joi.string().valid('None', 'OneTime', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'),
      frequencyConfig: frequencyConfigSchema,
      timelineType: Joi.string().valid('oneTime', 'recurring'),
      financialYear: Joi.string().trim(),
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

const bulkImportTimelineFields = {
  body: Joi.object().keys({
    timelineUpdates: Joi.array().items(
      Joi.object().keys({
        timelineId: Joi.string().custom(objectId).required(),
        fields: Joi.array().items(
          Joi.object().keys({
            fileName: Joi.string().required(),
            fieldValue: Joi.any().required(),
          })
        ).min(1).required(),
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
  bulkImportTimelineFields,
};