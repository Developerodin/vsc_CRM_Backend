import Joi from 'joi';
import { objectId } from './custom.validation.js';
import { validateFrequencyWithConfig } from '../utils/frequencyValidator.js';

// Field validation schema for subactivities
const fieldSchema = Joi.object({
  _id: Joi.string().custom(objectId).optional(), // Allow _id for existing fields
  name: Joi.string().trim().required(),
  type: Joi.string().valid('text', 'number', 'date', 'email', 'phone', 'url', 'select', 'textarea', 'checkbox', 'radio').required().default('text'),
  required: Joi.boolean().default(false),
  options: Joi.array().items(Joi.string().trim()).optional(), // For select, radio types
  defaultValue: Joi.any().optional(),
  placeholder: Joi.string().trim().allow('', null).optional(),
  validation: Joi.object({
    minLength: Joi.number().min(0).optional(),
    maxLength: Joi.number().min(0).optional(),
    min: Joi.number().optional(),
    max: Joi.number().optional(),
    pattern: Joi.string().optional(), // Regex pattern for validation
  }).optional(),
});

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
  yearlyMonth: Joi.string().valid('January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December').allow('', null).optional(),
  yearlyDate: Joi.number().min(1).max(31).allow(null).optional(),
  yearlyTime: Joi.string().pattern(/^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$|^(0?[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/).allow('', null).optional(),
});

// Subactivity validation schema
const subactivitySchema = Joi.object({
  _id: Joi.string().custom(objectId).optional(), // Optional for existing subactivities
  name: Joi.string().trim().optional(),
  dueDate: Joi.date().optional(),
  frequency: Joi.string().valid('None', 'OneTime', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly').optional().default('None'),
  frequencyConfig: frequencyConfigSchema.optional(),
  fields: Joi.array().items(fieldSchema).optional(),
  createdAt: Joi.date().optional(),
  updatedAt: Joi.date().optional(),
});

const createActivity = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    sortOrder: Joi.number().required(),
    subactivities: Joi.array().items(subactivitySchema).optional(),
    // Allow common fields that might be sent by frontend
    id: Joi.string().custom(objectId).optional(),
    createdAt: Joi.date().optional(),
    updatedAt: Joi.date().optional(),
  }),
};

const getActivities = {
  query: Joi.object().keys({
    name: Joi.string().allow(''),
    sortBy: Joi.string().pattern(/^[a-zA-Z]+:(asc|desc)$/),
    limit: Joi.number().integer().min(1).optional(),
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
      subactivities: Joi.array().items(subactivitySchema).optional(),
      // Allow common fields that might be sent by frontend
      id: Joi.string().custom(objectId).optional(),
      createdAt: Joi.date().optional(),
      updatedAt: Joi.date().optional(),
    })
    .min(1),
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
          subactivities: Joi.array().items(subactivitySchema).optional(),
          // Allow common fields that might be sent by frontend
          createdAt: Joi.date().optional(),
          updatedAt: Joi.date().optional(),
        })
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
    dueDate: Joi.date().optional(),
    frequency: Joi.string().valid('None', 'OneTime', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly').optional().default('None'),
    frequencyConfig: frequencyConfigSchema.optional(),
    fields: Joi.array().items(fieldSchema).optional(),
  }),
};

const updateSubactivity = {
  params: Joi.object().keys({
    activityId: Joi.string().custom(objectId).required(),
    subactivityId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().trim(),
    dueDate: Joi.date().optional(),
    frequency: Joi.string().valid('None', 'OneTime', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly').optional(),
    frequencyConfig: frequencyConfigSchema.optional(),
    fields: Joi.array().items(fieldSchema).optional(),
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
