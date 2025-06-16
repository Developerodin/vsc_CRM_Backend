import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createTeamMember = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    email: Joi.string().required().email(),
    phone: Joi.string().required(),
    address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    pinCode: Joi.string().required(),
    branch: Joi.string().custom(objectId).required(),
    sortOrder: Joi.number().required(),
    skills: Joi.array().items(Joi.string().custom(objectId)).min(1).required(),
  }),
};

const getTeamMembers = {
  query: Joi.object().keys({
    name: Joi.string(),
    email: Joi.string(),
    phone: Joi.string(),
    branch: Joi.string().custom(objectId),
    city: Joi.string(),
    state: Joi.string(),
    country: Joi.string(),
    pinCode: Joi.string(),
    skills: Joi.array().items(Joi.string().custom(objectId)),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTeamMember = {
  params: Joi.object().keys({
    teamMemberId: Joi.string().custom(objectId),
  }),
};

const updateTeamMember = {
  params: Joi.object().keys({
    teamMemberId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      email: Joi.string().email(),
      phone: Joi.string(),
      address: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      country: Joi.string(),
      pinCode: Joi.string(),
      branch: Joi.string().custom(objectId),
      sortOrder: Joi.number(),
      skills: Joi.array().items(Joi.string().custom(objectId)).min(1),
    })
    .min(1),
};

const deleteTeamMember = {
  params: Joi.object().keys({
    teamMemberId: Joi.string().custom(objectId),
  }),
};

export {
  createTeamMember,
  getTeamMembers,
  getTeamMember,
  updateTeamMember,
  deleteTeamMember,
}; 