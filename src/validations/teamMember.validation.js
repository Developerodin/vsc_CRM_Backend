import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createTeamMember = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    email: Joi.string().required().email(),
    phone: Joi.string().required(),
    address: Joi.string().required(),
    branch: Joi.string().required(),
    sortOrder: Joi.number().required(),
  }),
};

const getTeamMembers = {
  query: Joi.object().keys({
    name: Joi.string(),
    email: Joi.string(),
    phone: Joi.string(),
    branch: Joi.string(),
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
      branch: Joi.string(),
      sortOrder: Joi.number(),
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