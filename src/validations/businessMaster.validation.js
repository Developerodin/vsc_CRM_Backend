import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createBusinessMaster = {
  body: Joi.object().keys({
    name: Joi.string().required().trim(),
  }),
};

const getBusinessMasters = {
  query: Joi.object().keys({
    name: Joi.string().allow('', null),
    search: Joi.string().allow('', null),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getBusinessMaster = {
  params: Joi.object().keys({
    businessMasterId: Joi.string().custom(objectId).required(),
  }),
};

const updateBusinessMaster = {
  params: Joi.object().keys({
    businessMasterId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim(),
    })
    .min(1),
};

const deleteBusinessMaster = {
  params: Joi.object().keys({
    businessMasterId: Joi.string().custom(objectId).required(),
  }),
};

const bulkImportBusinessMasters = {
  body: Joi.object().keys({
    businessMasters: Joi.array()
      .items(
        Joi.object().keys({
          name: Joi.string().required().trim(),
        })
      )
      .required()
      .min(1),
  }),
};

export {
  createBusinessMaster,
  getBusinessMasters,
  getBusinessMaster,
  updateBusinessMaster,
  deleteBusinessMaster,
  bulkImportBusinessMasters,
};
