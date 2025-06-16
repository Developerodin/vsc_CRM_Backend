import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createActivity = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    sortOrder: Joi.number().required(),
  }),
};

const getActivities = {
  query: Joi.object().keys({
    name: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getActivity = {
  params: Joi.object().keys({
    activityId: Joi.string().custom(objectId),
  }),
};

const updateActivity = {
  params: Joi.object().keys({
    activityId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      sortOrder: Joi.number(),
    })
    .min(1),
};

const deleteActivity = {
  params: Joi.object().keys({
    activityId: Joi.string().custom(objectId),
  }),
};

export {
  createActivity,
  getActivities,
  getActivity,
  updateActivity,
  deleteActivity,
}; 