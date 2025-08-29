import Joi from 'joi';
import { objectId } from './custom.validation.js';
import { validateFrequencyWithConfig } from '../utils/frequencyValidator.js';

// Subactivity validation schema
const subactivitySchema = Joi.object({
  _id: Joi.string().custom(objectId).optional(), // Optional for existing subactivities
  name: Joi.string().trim().optional(),
  createdAt: Joi.date().optional(),
  updatedAt: Joi.date().optional(),
});

// Frequency configuration validation schema
const frequencyConfigSchema = Joi.object({
  hourlyInterval: Joi.number().min(1).max(24),
  dailyTime: Joi.string().pattern(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/),
  weeklyDays: Joi.array().items(
    Joi.string().valid('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')
  ),
  weeklyTime: Joi.string().pattern(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/),
  monthlyDay: Joi.number().min(1).max(31),
  monthlyTime: Joi.string().pattern(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/),
  quarterlyMonths: Joi.array().items(
    Joi.string().valid('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December')
  ),
  quarterlyDay: Joi.number().min(1).max(31),
  quarterlyTime: Joi.string().pattern(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/),
  yearlyMonth: Joi.string().valid('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'),
  yearlyDate: Joi.number().min(1).max(31),
  yearlyTime: Joi.string().pattern(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/),
});

const createActivity = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    sortOrder: Joi.number().required(),
    dueDate: Joi.date().optional(),
    frequency: Joi.string().valid('Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly').optional(),
    frequencyConfig: frequencyConfigSchema.optional(),
    subactivities: Joi.array().items(subactivitySchema).optional(),
    // Allow common fields that might be sent by frontend
    id: Joi.string().custom(objectId).optional(),
    createdAt: Joi.date().optional(),
    updatedAt: Joi.date().optional(),
  }).custom(validateFrequencyWithConfig),
};

const getActivities = {
  query: Joi.object().keys({
    name: Joi.string().allow(''),
    frequency: Joi.string().valid('Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly').allow(''),
    dueDate: Joi.date().allow(''),
    sortBy: Joi.string().pattern(/^[a-zA-Z]+:(asc|desc)$/),
    limit: Joi.number().integer().min(1).default(10),
    page: Joi.number().integer().min(1).default(1),
  }),
};

const getActivity = {
  params: Joi.object().keys({
    activityId: Joi.string().custom(objectId).required(),
  }),
};

const updateActivity = {
  params: Joi.object().keys({
    activityId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      sortOrder: Joi.number(),
      dueDate: Joi.date().optional(),
      frequency: Joi.string().valid('Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly').optional(),
      frequencyConfig: frequencyConfigSchema.optional(),
      subactivities: Joi.array().items(subactivitySchema).optional(),
      // Allow common fields that might be sent by frontend
      id: Joi.string().custom(objectId).optional(),
      createdAt: Joi.date().optional(),
      updatedAt: Joi.date().optional(),
    })
    .min(1)
    .custom(validateFrequencyWithConfig),
};

const deleteActivity = {
  params: Joi.object().keys({
    activityId: Joi.string().custom(objectId).required(),
  }),
};

const bulkImportActivities = {
  body: Joi.object().keys({
    activities: Joi.array()
      .items(
        Joi.object().keys({
          id: Joi.string().custom(objectId).optional(),
          name: Joi.string().required(),
          sortOrder: Joi.number().required(),
          dueDate: Joi.date().optional(),
          frequency: Joi.string().valid('Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly').optional(),
          frequencyConfig: frequencyConfigSchema.optional(),
          subactivities: Joi.array().items(subactivitySchema).optional(),
          // Allow common fields that might be sent by frontend
          createdAt: Joi.date().optional(),
          updatedAt: Joi.date().optional(),
        }).custom(validateFrequencyWithConfig)
      )
      .min(1)
      .max(1000)
      .required(),
  }),
};

const createSubactivity = {
  params: Joi.object().keys({
    activityId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().trim(),
  }),
};

const updateSubactivity = {
  params: Joi.object().keys({
    activityId: Joi.string().custom(objectId).required(),
    subactivityId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().trim(),
  }),
};

const deleteSubactivity = {
  params: Joi.object().keys({
    activityId: Joi.string().custom(objectId).required(),
    subactivityId: Joi.string().custom(objectId).required(),
  }),
};

export { 
  createActivity, 
  getActivities, 
  getActivity, 
  updateActivity, 
  deleteActivity, 
  bulkImportActivities,
  createSubactivity,
  updateSubactivity,
  deleteSubactivity
};
