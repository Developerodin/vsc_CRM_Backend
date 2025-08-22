import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createEntityTypeMaster = {
  body: Joi.object().keys({
    name: Joi.string().required().trim(),
  }),
};

const getEntityTypeMasters = {
  query: Joi.object().keys({
    name: Joi.string().allow('', null),
    search: Joi.string().allow('', null),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getEntityTypeMaster = {
  params: Joi.object().keys({
    entityTypeMasterId: Joi.string().custom(objectId).required(),
  }),
};

const updateEntityTypeMaster = {
  params: Joi.object().keys({
    entityTypeMasterId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim(),
    })
    .min(1),
};

const deleteEntityTypeMaster = {
  params: Joi.object().keys({
    entityTypeMasterId: Joi.string().custom(objectId).required(),
  }),
};

const bulkImportEntityTypeMasters = {
  body: Joi.object().keys({
    entityTypeMasters: Joi.array()
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
  createEntityTypeMaster,
  getEntityTypeMasters,
  getEntityTypeMaster,
  updateEntityTypeMaster,
  deleteEntityTypeMaster,
  bulkImportEntityTypeMasters,
};
