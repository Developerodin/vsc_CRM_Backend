import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createRole = {
  body: Joi.object().keys({
    name: Joi.string().required().trim(),
    description: Joi.string().trim(),
    navigationPermissions: Joi.object().keys({
      dashboard: Joi.boolean(),
      clients: Joi.boolean(),
      groups: Joi.boolean(),
      teams: Joi.boolean(),
      timelines: Joi.boolean(),
      analytics: Joi.boolean(),
      settings: Joi.alternatives().try(
        Joi.object().keys({
          activities: Joi.boolean(),
          branches: Joi.boolean(),
          users: Joi.boolean(),
          roles: Joi.boolean(),
        }),
        Joi.string(),
        Joi.boolean(),
        Joi.any()
      ).optional(),
    }).optional(),
    apiPermissions: Joi.object().keys({
      getUsers: Joi.boolean(),
      manageUsers: Joi.boolean(),
      getTeamMembers: Joi.boolean(),
      manageTeamMembers: Joi.boolean(),
      getActivities: Joi.boolean(),
      manageActivities: Joi.boolean(),
      getBranches: Joi.boolean(),
      manageBranches: Joi.boolean(),
      getClients: Joi.boolean(),
      manageClients: Joi.boolean(),
      getGroups: Joi.boolean(),
      manageGroups: Joi.boolean(),
      getRoles: Joi.boolean(),
      manageRoles: Joi.boolean(),
    }).optional(),
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
      navigationPermissions: Joi.object().keys({
        dashboard: Joi.boolean(),
        clients: Joi.boolean(),
        groups: Joi.boolean(),
        teams: Joi.boolean(),
        timelines: Joi.boolean(),
        analytics: Joi.boolean(),
        settings: Joi.alternatives().try(
          Joi.object().keys({
            activities: Joi.boolean(),
            branches: Joi.boolean(),
            users: Joi.boolean(),
            roles: Joi.boolean(),
          }),
          Joi.string(),
          Joi.boolean(),
          Joi.any()
        ).optional(),
      }).optional(),
      apiPermissions: Joi.object().keys({
        getUsers: Joi.boolean(),
        manageUsers: Joi.boolean(),
        getTeamMembers: Joi.boolean(),
        manageTeamMembers: Joi.boolean(),
        getActivities: Joi.boolean(),
        manageActivities: Joi.boolean(),
        getBranches: Joi.boolean(),
        manageBranches: Joi.boolean(),
        getClients: Joi.boolean(),
        manageClients: Joi.boolean(),
        getGroups: Joi.boolean(),
        manageGroups: Joi.boolean(),
        getRoles: Joi.boolean(),
        manageRoles: Joi.boolean(),
      }).optional(),
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