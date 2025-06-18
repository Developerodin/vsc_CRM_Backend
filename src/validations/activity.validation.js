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
    name: Joi.string().allow(''),
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
        })
      )
      .min(1)
      .max(1000)
      .required(),
  }),
};

export { createActivity, getActivities, getActivity, updateActivity, deleteActivity, bulkImportActivities }; 