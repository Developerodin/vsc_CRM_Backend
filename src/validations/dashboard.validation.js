import Joi from 'joi';
import { objectId } from './custom.validation.js';

const getTimelineCountsByBranch = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).required(),
  }),
};

const getAssignedTaskCounts = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).required(),
  }),
};

const getTotalTeams = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).required(),
  }),
};

const getTotalClients = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).required(),
  }),
};

const getTotalOngoingTasks = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).required(),
  }),
};

const getTopClients = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).required(),
  }),
};

const getTopActivities = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).required(),
  }),
};

export { 
  getTimelineCountsByBranch, 
  getAssignedTaskCounts, 
  getTotalTeams, 
  getTotalClients, 
  getTotalOngoingTasks,
  getTopClients,
  getTopActivities
}; 