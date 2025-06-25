import Joi from 'joi';
import { objectId } from './custom.validation.js';

// Helper function to validate frequency configuration based on frequency type
const validateFrequencyConfig = (frequency, frequencyConfig) => {
  if (!frequencyConfig) {
    throw new Error('frequencyConfig is required');
  }

  switch (frequency) {
    case 'Hourly':
      if (!frequencyConfig.hourlyInterval || frequencyConfig.hourlyInterval < 1 || frequencyConfig.hourlyInterval > 24) {
        throw new Error('For Hourly frequency, hourlyInterval (1-24) is required');
      }
      break;
    case 'Daily':
      if (!frequencyConfig.dailyTime || !/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(frequencyConfig.dailyTime)) {
        throw new Error('For Daily frequency, dailyTime in format "HH:MM AM/PM" is required');
      }
      break;
    case 'Weekly':
      if (!frequencyConfig.weeklyDays || frequencyConfig.weeklyDays.length === 0) {
        throw new Error('For Weekly frequency, weeklyDays array is required');
      }
      if (!frequencyConfig.weeklyTime || !/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(frequencyConfig.weeklyTime)) {
        throw new Error('For Weekly frequency, weeklyTime in format "HH:MM AM/PM" is required');
      }
      break;
    case 'Monthly':
      if (!frequencyConfig.monthlyDay || frequencyConfig.monthlyDay < 1 || frequencyConfig.monthlyDay > 31) {
        throw new Error('For Monthly frequency, monthlyDay (1-31) is required');
      }
      if (!frequencyConfig.monthlyTime || !/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(frequencyConfig.monthlyTime)) {
        throw new Error('For Monthly frequency, monthlyTime in format "HH:MM AM/PM" is required');
      }
      break;
    case 'Quarterly':
      if (!frequencyConfig.quarterlyMonths || frequencyConfig.quarterlyMonths.length === 0) {
        throw new Error('For Quarterly frequency, quarterlyMonths array is required');
      }
      if (frequencyConfig.quarterlyMonths.length !== 4) {
        throw new Error('For Quarterly frequency, quarterlyMonths must have exactly 4 months');
      }
      if (!frequencyConfig.quarterlyDay || frequencyConfig.quarterlyDay < 1 || frequencyConfig.quarterlyDay > 31) {
        throw new Error('For Quarterly frequency, quarterlyDay (1-31) is required');
      }
      if (!frequencyConfig.quarterlyTime || !/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(frequencyConfig.quarterlyTime)) {
        throw new Error('For Quarterly frequency, quarterlyTime in format "HH:MM AM/PM" is required');
      }
      break;
    case 'Yearly':
      if (!frequencyConfig.yearlyMonth) {
        throw new Error('For Yearly frequency, yearlyMonth is required');
      }
      if (!frequencyConfig.yearlyDate || frequencyConfig.yearlyDate < 1 || frequencyConfig.yearlyDate > 31) {
        throw new Error('For Yearly frequency, yearlyDate (1-31) is required');
      }
      if (!frequencyConfig.yearlyTime || !/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(frequencyConfig.yearlyTime)) {
        throw new Error('For Yearly frequency, yearlyTime in format "HH:MM AM/PM" is required');
      }
      break;
    default:
      throw new Error('Invalid frequency type');
  }
};

const createTimeline = {
  body: Joi.object().keys({
    activity: Joi.string().custom(objectId).required(),
    client: Joi.array().items(Joi.string().custom(objectId)).min(1).required(),
    status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing').required(),
    frequency: Joi.string().valid('Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly').required(),
    frequencyConfig: Joi.object().required(),
    udin: Joi.string().trim().allow(''),
    turnover: Joi.number(),
    assignedMember: Joi.string().custom(objectId).required(),
    startDate: Joi.date(),
    endDate: Joi.date(),
  }).custom((value, helpers) => {
    try {
      validateFrequencyConfig(value.frequency, value.frequencyConfig);
      return value;
    } catch (error) {
      return helpers.error('any.invalid', { message: error.message });
    }
  }),
};

const getTimelines = {
  query: Joi.object().keys({
    activity: Joi.string().custom(objectId),
    activityName: Joi.string().trim().allow(''),
    client: Joi.string().custom(objectId),
    status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing').allow(''),
    frequency: Joi.string().valid('Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'),
    assignedMember: Joi.string().custom(objectId),
    today: Joi.string().valid('true', 'false').allow(''),
    startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
    endDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/),
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
      frequency: Joi.string().valid('Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'),
      frequencyConfig: Joi.object(),
      udin: Joi.string().trim().allow(''),
      turnover: Joi.number(),
      assignedMember: Joi.string().custom(objectId),
      startDate: Joi.date(),
      endDate: Joi.date(),
    })
    .min(1)
    .custom((value, helpers) => {
      if (value.frequency && value.frequencyConfig) {
        try {
          validateFrequencyConfig(value.frequency, value.frequencyConfig);
        } catch (error) {
          return helpers.error('any.invalid', { message: error.message });
        }
      }
      return value;
    }),
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
          clients: Joi.array().items(Joi.string().custom(objectId)).min(1).required(),
          status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing'),
          frequency: Joi.string().valid('Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly').required(),
          frequencyConfig: Joi.object().required(),
          udin: Joi.string().trim().allow(''),
          turnover: Joi.number(),
          assignedMember: Joi.string().custom(objectId).required(),
          startDate: Joi.date(),
          endDate: Joi.date(),
        }).custom((value, helpers) => {
          try {
            validateFrequencyConfig(value.frequency, value.frequencyConfig);
            return value;
          } catch (error) {
            return helpers.error('any.invalid', { message: error.message });
          }
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