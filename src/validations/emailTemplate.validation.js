import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createTemplate = {
  body: Joi.object().keys({
    name: Joi.string().required().trim().min(1).max(120),
    subject: Joi.string().required().trim().min(1).max(255),
    bodyText: Joi.string().required().trim().min(1),
    bodyHtml: Joi.string().trim().allow('').optional(),
    branch: Joi.string().custom(objectId).optional().allow(null),
    activity: Joi.string().custom(objectId).optional().allow(null),
    subactivity: Joi.string().custom(objectId).optional().allow(null),
  }),
};

const queryTemplates = {
  query: Joi.object().keys({
    branch: Joi.string().custom(objectId).optional(),
    activity: Joi.string().custom(objectId).optional(),
    subactivity: Joi.string().custom(objectId).optional(),
    sortBy: Joi.string().optional(),
    limit: Joi.number().integer().optional(),
    page: Joi.number().integer().optional(),
  }),
};

const getTemplate = {
  params: Joi.object().keys({
    templateId: Joi.string().required().custom(objectId),
  }),
};

const updateTemplate = {
  params: Joi.object().keys({
    templateId: Joi.string().required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim().min(1).max(120),
      subject: Joi.string().trim().min(1).max(255),
      bodyText: Joi.string().trim().min(1),
      bodyHtml: Joi.string().trim().allow(''),
      branch: Joi.string().custom(objectId).allow(null),
      activity: Joi.string().custom(objectId).allow(null),
      subactivity: Joi.string().custom(objectId).allow(null),
    })
    .min(1),
};

const deleteTemplate = {
  params: Joi.object().keys({
    templateId: Joi.string().required().custom(objectId),
  }),
};

const ALLOWED_FROM_EMAILS = ['info@vsc.co.in', 'audit@vsc.co.in', 'incometax@vsc.co.in', 'roc@vsc.co.in', 'gst@vsc.co.in'];

const sendBulkToClients = {
  body: Joi.object()
    .keys({
      templateId: Joi.string().required().custom(objectId),
      clientIds: Joi.array().items(Joi.string().custom(objectId)).min(1).optional(),
      branchId: Joi.string().custom(objectId).optional(),
      fromEmail: Joi.string().valid(...ALLOWED_FROM_EMAILS).optional(),
    })
    .custom((value) => {
      if (value.clientIds && value.clientIds.length && value.branchId) {
        throw new Error('Provide either clientIds or branchId, not both');
      }
      return value;
    }),
};

export {
  createTemplate,
  queryTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  sendBulkToClients,
};
