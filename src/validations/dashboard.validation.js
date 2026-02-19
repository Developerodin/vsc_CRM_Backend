import Joi from 'joi';
import { objectId } from './custom.validation.js';

const getTimelineCountsByBranch = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
  }),
};

const getAssignedTaskCounts = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
  }),
};

const getTotalTeams = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
  }),
};

const getTotalClients = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
  }),
};

const getTotalOngoingTasks = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
  }),
};

const getTopClients = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
  }),
};

const getTopActivities = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
  }),
};

// New validation schemas for frequency-based timeline analysis
const getTimelineStatusByFrequency = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
    startDate: Joi.date().iso().optional().allow(''),
    endDate: Joi.date().iso().optional().allow(''),
    frequency: Joi.string().valid('Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly').optional().allow(''),
    status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing', 'not applicable').optional().allow(''),
  }),
};

const getTimelineStatusByPeriod = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
    startDate: Joi.date().iso().optional().allow(''),
    endDate: Joi.date().iso().optional().allow(''),
    frequency: Joi.string().valid('Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly').required(),
    period: Joi.string().optional().allow(''),
  }),
};

const getTimelineFrequencyAnalytics = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
    startDate: Joi.date().iso().optional().allow(''),
    endDate: Joi.date().iso().optional().allow(''),
    groupBy: Joi.string().valid('frequency', 'status', 'branch', 'activity').default('frequency'),
  }),
};

const getTimelineStatusTrends = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
    startDate: Joi.date().iso().optional().allow(''),
    endDate: Joi.date().iso().optional().allow(''),
    frequency: Joi.string().valid('Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly').optional().allow(''),
    interval: Joi.string().valid('day', 'week', 'month').default('day'),
  }),
};

const getTimelineCompletionRates = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
    startDate: Joi.date().iso().optional().allow(''),
    endDate: Joi.date().iso().optional().allow(''),
    frequency: Joi.string().valid('Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly').optional().allow(''),
  }),
};

// New validation schemas for task analytics
const getTotalTasksAndStatus = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
  }),
};

const getTaskAnalytics = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
    startDate: Joi.date().iso().optional().allow(''),
    endDate: Joi.date().iso().optional().allow(''),
    groupBy: Joi.string().valid('status', 'priority', 'branch', 'teamMember', 'month', 'week').default('status'),
  }),
};

const getTaskTrends = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId).optional().allow(''),
    startDate: Joi.date().iso().optional().allow(''),
    endDate: Joi.date().iso().optional().allow(''),
    interval: Joi.string().valid('day', 'week', 'month').default('month'),
  }),
};

export { 
  getTimelineCountsByBranch, 
  getAssignedTaskCounts, 
  getTotalTeams, 
  getTotalClients, 
  getTotalOngoingTasks,
  getTopClients,
  getTopActivities,
  getTimelineStatusByFrequency,
  getTimelineStatusByPeriod,
  getTimelineFrequencyAnalytics,
  getTimelineStatusTrends,
  getTimelineCompletionRates,
  getTotalTasksAndStatus,
  getTaskAnalytics,
  getTaskTrends
}; 