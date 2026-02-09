import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createGroup = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    numberOfClients: Joi.number().required(),
    clients: Joi.array().items(Joi.custom(objectId)),
    branch: Joi.string().custom(objectId).required(),
    sortOrder: Joi.number().required(),
  }),
};

const getGroups = {
  query: Joi.object().keys({
    name: Joi.string().allow('', null),
    numberOfClients: Joi.number().integer(),
    branch: Joi.string().custom(objectId),
    client: Joi.string().allow('', null),
    search: Joi.string().allow('', null),
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
      branch: Joi.string().custom(objectId),
      sortOrder: Joi.number(),
    })
    .min(1),
};

const deleteGroup = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId),
  }),
};

const addClientToGroup = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId),
  }),
  body: Joi.object().keys({
    clientId: Joi.string().custom(objectId).required(),
  }),
};

const removeClientFromGroup = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
    clientId: Joi.string().custom(objectId).required(),
  }),
};

const bulkImportGroups = {
  body: Joi.object().keys({
    groups: Joi.array()
      .items(
        Joi.object().keys({
          id: Joi.string().custom(objectId).optional(),
          name: Joi.string().required(),
          numberOfClients: Joi.number().default(0),
          clients: Joi.array().items(Joi.custom(objectId)).default([]),
          branch: Joi.string().custom(objectId).required(),
          sortOrder: Joi.number().required(),
        })
      )
      .min(1)
      .max(500)
      .required(),
  }),
};

const getGroupTaskStatistics = {
  query: Joi.object().keys({
    name: Joi.string().trim().allow('', null),
    branch: Joi.string().custom(objectId),
    client: Joi.string().trim().allow('', null),
    search: Joi.string().trim().allow('', null),
    limit: Joi.number().integer().min(1).max(10000),
    page: Joi.number().integer().min(1),
  }),
};

const getAllGroupsAnalytics = {
  query: Joi.object().keys({
    name: Joi.string().trim().allow('', null),
    branch: Joi.string().custom(objectId),
    search: Joi.string().trim().allow('', null),
  }),
};

const getGroupAnalytics = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    fy: Joi.string().trim().pattern(/^\d{4}-\d{4}$/).optional(), // e.g. 2026-2027
  }),
};

/** Year report: per-client timelines, status, pendings, turnover for a financial year. */
const getGroupReport = {
  params: Joi.object().keys({
    groupId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    year: Joi.string().trim().pattern(/^\d{4}(-\d{4})?$/).optional(), // e.g. "2024" or "2024-2025"
  }),
};

export default {
  createGroup,
  getGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  addClientToGroup,
  removeClientFromGroup,
  bulkImportGroups,
  getGroupTaskStatistics,
  getAllGroupsAnalytics,
  getGroupAnalytics,
  getGroupReport,
}; 