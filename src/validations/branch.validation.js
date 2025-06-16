import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createBranch = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    branchHead: Joi.string(),
    email: Joi.string().required().email(),
    phone: Joi.string().required(),
    address: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    country: Joi.string().required(),
    pinCode: Joi.string().required(),
    sortOrder: Joi.number().required(),
  }),
};

const getBranches = {
  query: Joi.object().keys({
    name: Joi.string(),
    branchHead: Joi.string(),
    email: Joi.string(),
    phone: Joi.string(),
    city: Joi.string(),
    state: Joi.string(),
    country: Joi.string(),
    pinCode: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getBranch = {
  params: Joi.object().keys({
    branchId: Joi.string().custom(objectId),
  }),
};

const updateBranch = {
  params: Joi.object().keys({
    branchId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      branchHead: Joi.string(),
      email: Joi.string().email(),
      phone: Joi.string(),
      address: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      country: Joi.string(),
      pinCode: Joi.string(),
      sortOrder: Joi.number(),
    })
    .min(1),
};

const deleteBranch = {
  params: Joi.object().keys({
    branchId: Joi.string().custom(objectId),
  }),
};

export {
  createBranch,
  getBranches,
  getBranch,
  updateBranch,
  deleteBranch,
}; 