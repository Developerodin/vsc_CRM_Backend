import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createGroup = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    numberOfClients: Joi.number().required(),
    clients: Joi.array().items(Joi.custom(objectId)),
    sortOrder: Joi.number().required(),
  }),
};

const getGroups = {
  query: Joi.object().keys({
    name: Joi.string(),
    numberOfClients: Joi.number().integer(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getGroup = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId),
  }),
};

const updateGroup = {
  params: Joi.object().keys({
    groupId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      numberOfClients: Joi.number(),
      clients: Joi.array().items(Joi.custom(objectId)),
      sortOrder: Joi.number(),
    })
    .min(1),
};

const deleteGroup = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId),
  }),
};

export default {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup,
}; 