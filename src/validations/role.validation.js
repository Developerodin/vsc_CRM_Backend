import Joi from 'joi';
import { objectId } from './custom.validation.js';
import * as roleService from '../services/role.service.js';

// Function to generate dynamic navigation permissions validation schema
const generateNavigationPermissionsSchema = () => {
  const availableNavigationPermissions = roleService.getAvailableNavigationPermissions();
  const navigationKeys = {};
  
  Object.keys(availableNavigationPermissions).forEach(key => {
    if (key === 'settings') {
      const settingsChildren = availableNavigationPermissions[key].children || {};
      const settingsKeys = {};
      Object.keys(settingsChildren).forEach(childKey => {
        settingsKeys[childKey] = Joi.boolean();
      });
      navigationKeys[key] = Joi.alternatives().try(
        Joi.object().keys(settingsKeys),
        Joi.string(),
        Joi.boolean(),
        Joi.any()
      ).optional();
    } else {
      navigationKeys[key] = Joi.boolean();
    }
  });
  
  return Joi.object().keys(navigationKeys).optional();
};

// Function to generate dynamic API permissions validation schema
const generateApiPermissionsSchema = () => {
  const availableApiPermissions = roleService.getAvailableApiPermissions();
  const apiKeys = {};
  
  Object.keys(availableApiPermissions).forEach(key => {
    apiKeys[key] = Joi.boolean();
  });
  
  return Joi.object().keys(apiKeys).optional();
};

const createRole = {
  body: Joi.object().keys({
    name: Joi.string().required().trim(),
    description: Joi.string().trim(),
    navigationPermissions: generateNavigationPermissionsSchema(),
    apiPermissions: generateApiPermissionsSchema(),
    permissions: Joi.array().items(Joi.string()),
    branchAccess: Joi.array().items(Joi.string().custom(objectId)),
    allBranchesAccess: Joi.boolean(),
    isActive: Joi.boolean(),
  }).unknown(true),
};

const getRoles = {
  query: Joi.object().keys({
    name: Joi.string(),
    isActive: Joi.boolean(),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getRole = {
  params: Joi.object().keys({
    roleId: Joi.string().custom(objectId).required(),
  }),
};

const updateRole = {
  params: Joi.object().keys({
    roleId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim(),
      description: Joi.string().trim(),
      navigationPermissions: generateNavigationPermissionsSchema(),
      apiPermissions: generateApiPermissionsSchema(),
      permissions: Joi.array().items(Joi.string()),
      branchAccess: Joi.array().items(Joi.string().custom(objectId)),
      allBranchesAccess: Joi.boolean(),
      isActive: Joi.boolean(),
    })
    .min(1)
    .unknown(true),
};

const deleteRole = {
  params: Joi.object().keys({
    roleId: Joi.string().custom(objectId).required(),
  }),
};

export {
  createRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
}; 