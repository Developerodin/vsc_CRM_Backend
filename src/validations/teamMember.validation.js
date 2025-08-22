import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createTeamMember = {
  body: Joi.object().keys({
    name: Joi.string().required().trim(),
    email: Joi.string().required().email().lowercase().trim(),
    phone: Joi.string().required().trim().pattern(/^\+?[1-9]\d{1,14}$/),
    address: Joi.string().required().trim(),
    city: Joi.string().required().trim(),
    state: Joi.string().required().trim(),
    country: Joi.string().required().trim(),
    pinCode: Joi.string().required().trim().pattern(/^[0-9]{5,6}$/),
    branch: Joi.string().custom(objectId).required(),
    sortOrder: Joi.number().required().min(0),
    skills: Joi.array().items(Joi.string().custom(objectId)).min(1).required(),
  }),
};

const getTeamMembers = {
  query: Joi.object().keys({
    name: Joi.string().trim().allow('', null),
    email: Joi.string().email().trim().allow('', null),
    phone: Joi.string().trim().allow('', null),
    branch: Joi.string().custom(objectId),
    city: Joi.string().trim().allow('', null),
    state: Joi.string().trim().allow('', null),
    country: Joi.string().trim().allow('', null),
    pinCode: Joi.string().trim().allow('', null),
    skills: Joi.array().items(Joi.string().custom(objectId)),
    search: Joi.string().trim().allow('', null),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1),
    page: Joi.number().integer().min(1),
  }),
};

const getTeamMember = {
  params: Joi.object().keys({
    teamMemberId: Joi.string().custom(objectId).required(),
  }),
};

const updateTeamMember = {
  params: Joi.object().keys({
    teamMemberId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim(),
      email: Joi.string().email().lowercase().trim(),
      phone: Joi.string().trim().pattern(/^\+?[1-9]\d{1,14}$/),
      address: Joi.string().trim(),
      city: Joi.string().trim(),
      state: Joi.string().trim(),
      country: Joi.string().trim(),
      pinCode: Joi.string().trim().pattern(/^[0-9]{5,6}$/),
      branch: Joi.string().custom(objectId),
      sortOrder: Joi.number().min(0),
      skills: Joi.array().items(Joi.string().custom(objectId)).min(1),
    })
    .min(1),
};

const deleteTeamMember = {
  params: Joi.object().keys({
    teamMemberId: Joi.string().custom(objectId).required(),
  }),
};

const bulkImportTeamMembers = {
  body: Joi.object().keys({
    teamMembers: Joi.array()
      .items(
        Joi.object().keys({
          id: Joi.string().custom(objectId).optional(),
          name: Joi.string().required().trim(),
          email: Joi.string().required().email().lowercase().trim(),
          phone: Joi.string().required().trim().pattern(/^\+?[1-9]\d{1,14}$/),
          address: Joi.string().required().trim(),
          city: Joi.string().required().trim(),
          state: Joi.string().required().trim(),
          country: Joi.string().required().trim(),
          pinCode: Joi.string().required().trim().pattern(/^[0-9]{5,6}$/),
          branch: Joi.string().custom(objectId).required(),
          sortOrder: Joi.number().required().min(0),
          skills: Joi.array().items(Joi.string().custom(objectId)).min(1).required(),
        })
      )
      .min(1)
      .max(300)
      .required(),
  }),
};

export {
  createTeamMember,
  getTeamMembers,
  getTeamMember,
  updateTeamMember,
  deleteTeamMember,
  bulkImportTeamMembers,
}; 