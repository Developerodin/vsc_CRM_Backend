import Joi from 'joi';
import { objectId } from './custom.validation.js';

const getTaskCompletionTrends = {
  query: Joi.object().keys({
    months: Joi.number().integer().min(1).max(24).default(6)
      .description('Number of months to get trends for (1-24)')
  })
};

const getTopTeamMembersByCompletion = {
  query: Joi.object().keys({
    limit: Joi.number().integer().min(1).max(100).optional()
      .description('Number of top members to return (1-100). If not provided, returns all results.'),
    branch: Joi.string().custom(objectId)
      .description('Branch ID to filter by'),
    startDate: Joi.date().iso()
      .description('Start date for filtering (ISO format)'),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
      .description('End date for filtering (ISO format, must be after startDate)')
  })
};

const getTopTeamMembersByBranch = {
  query: Joi.object().keys({
    branchId: Joi.string().custom(objectId)
      .description('Branch ID to filter by (optional)'),
    limit: Joi.number().integer().min(1).max(50).default(5)
      .description('Number of top members per branch (1-50)')
  })
};

const getTeamMemberDetailsOverview = {
  params: Joi.object().keys({
    teamMemberId: Joi.string().custom(objectId).required()
      .description('Team member ID')
  }),
  query: Joi.object().keys({
    // Client search filter
    clientSearch: Joi.string().trim().allow('')
      .description('Search clients by name, email, phone, or company'),
    
    // Activity search filter
    activitySearch: Joi.string().trim().allow('')
      .description('Search activities by name or description'),
    
    // Date range filters
    startDate: Joi.date().iso()
      .description('Start date for filtering tasks (ISO format)'),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
      .description('End date for filtering tasks (ISO format, must be after startDate)'),
    
    // Task filters
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent')
      .description('Filter tasks by priority'),
    status: Joi.string().valid('pending', 'ongoing', 'completed', 'on_hold', 'delayed', 'cancelled')
      .description('Filter tasks by status'),
    
    // Pagination options
    limit: Joi.number().integer().min(1).max(100).optional()
      .description('Number of recent tasks to return (1-100). If not provided, returns all results.'),
    page: Joi.number().integer().min(1).default(1)
      .description('Page number for pagination')
  })
};

const getClientDetailsOverview = {
  params: Joi.object().keys({
    clientId: Joi.string().custom(objectId).required()
      .description('Client ID')
  }),
  query: Joi.object().keys({
    // Activity search filter
    activitySearch: Joi.string().trim().allow('')
      .description('Search activities by name, description, or category'),
    
    // Date range filters
    startDate: Joi.date().iso()
      .description('Start date for filtering tasks (ISO format)'),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
      .description('End date for filtering tasks (ISO format, must be after startDate)'),
    
    // Task filters
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent')
      .description('Filter tasks by priority'),
    status: Joi.string().valid('pending', 'ongoing', 'completed', 'on_hold', 'delayed', 'cancelled')
      .description('Filter tasks by status'),
    
    // Team member filter
    teamMemberId: Joi.string().custom(objectId)
      .description('Filter tasks by assigned team member ID'),
    
    // Pagination options
    limit: Joi.number().integer().min(1).max(100).optional()
      .description('Number of recent activities to return (1-100). If not provided, returns all results.'),
    page: Joi.number().integer().min(1).default(1)
      .description('Page number for pagination')
  })
};

const getAllClientsTableData = {
  query: Joi.object().keys({
    name: Joi.string().trim().allow(''),
    email: Joi.string().trim().allow(''),
    phone: Joi.string().trim().allow(''),
    district: Joi.string().trim().allow(''),
    state: Joi.string().trim().allow(''),
    country: Joi.string().trim().allow(''),
    fNo: Joi.string().trim().allow(''),
    pan: Joi.string().trim().allow(''),
    businessType: Joi.string().trim().allow(''),
    gstNumber: Joi.string().trim().allow(''),
    tanNumber: Joi.string().trim().allow(''),
    cinNumber: Joi.string().trim().allow(''),
    udyamNumber: Joi.string().trim().allow(''),
    iecCode: Joi.string().trim().allow(''),
    entityType: Joi.string().trim().allow(''),
    clientCategory: Joi.string().valid('A', 'B', 'C').allow(''),
    turnover: Joi.string().trim().allow(''),
    branch: Joi.string().custom(objectId),
    search: Joi.string().trim().allow(''),
    activity: Joi.string().custom(objectId).allow(''),
    activitySearch: Joi.string().trim().allow(''),
    activityName: Joi.string().trim().allow(''),
    subactivity: Joi.string().custom(objectId).allow(''),
    subactivitySearch: Joi.string().trim().allow(''),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1).max(10000).optional(),
    page: Joi.number().integer().min(1).default(1)
  })
};

const getAllTeamMembersTableData = {
  query: Joi.object().keys({
    name: Joi.string().trim().allow(''),
    email: Joi.string().trim().allow(''),
    phone: Joi.string().trim().allow(''),
    city: Joi.string().trim().allow(''),
    state: Joi.string().trim().allow(''),
    country: Joi.string().trim().allow(''),
    branch: Joi.string().custom(objectId),
    search: Joi.string().trim().allow(''),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1).max(10000).optional(),
    page: Joi.number().integer().min(1).default(1)
  })
};

const getAllTimelinesTableData = {
  query: Joi.object().keys({
    // Client filters
    client: Joi.string().custom(objectId),
    clientSearch: Joi.string().trim().allow(''),
    businessType: Joi.string().trim().allow(''),
    entityType: Joi.string().trim().allow(''),
    clientCategory: Joi.string().valid('A', 'B', 'C').allow(''),
    turnover: Joi.string().trim().allow(''),
    
    // Activity filters
    activity: Joi.string().custom(objectId),
    activitySearch: Joi.string().trim().allow(''),
    
    // Subactivity filters
    subactivity: Joi.string().custom(objectId),
    subactivitySearch: Joi.string().trim().allow(''),
    
    // Timeline filters
    status: Joi.string().valid('pending', 'completed', 'delayed', 'ongoing'),
    frequency: Joi.string().valid('None', 'OneTime', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'Quarterly', 'Yearly'),
    timelineType: Joi.string().valid('oneTime', 'recurring'),
    period: Joi.string().trim().allow(''),
    financialYear: Joi.string().trim().allow(''),
    
    // Date filters
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    
    // Other filters
    branch: Joi.string().custom(objectId),
    search: Joi.string().trim().allow(''),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1).max(10000).optional(),
    page: Joi.number().integer().min(1).default(1)
  })
};

const getTimelineDetailsOverview = {
  params: Joi.object().keys({
    timelineId: Joi.string().custom(objectId).required()
      .description('Timeline ID')
  }),
  query: Joi.object().keys({
    // Team member filter
    teamMemberId: Joi.string().custom(objectId)
      .description('Filter tasks by assigned team member ID'),
    
    // Date range filters
    startDate: Joi.date().iso()
      .description('Start date for filtering tasks (ISO format)'),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
      .description('End date for filtering tasks (ISO format, must be after startDate)'),
    
    // Task filters
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent')
      .description('Filter tasks by priority'),
    status: Joi.string().valid('pending', 'ongoing', 'completed', 'on_hold', 'delayed', 'cancelled')
      .description('Filter tasks by status'),
    
    // Pagination options
    limit: Joi.number().integer().min(1).max(100).optional()
      .description('Number of recent tasks to return (1-100). If not provided, returns all results.'),
    page: Joi.number().integer().min(1).default(1)
      .description('Page number for pagination')
  })
};

export default {
  getTaskCompletionTrends,
  getTopTeamMembersByCompletion,
  getTopTeamMembersByBranch,
  getTeamMemberDetailsOverview,
  getClientDetailsOverview,
  getAllClientsTableData,
  getAllTeamMembersTableData,
  getAllTimelinesTableData,
  getTimelineDetailsOverview
};
