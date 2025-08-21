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
    limit: Joi.number().integer().min(1).max(100).default(10)
      .description('Number of top members to return (1-100)'),
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
  })
};

const getClientDetailsOverview = {
  params: Joi.object().keys({
    clientId: Joi.string().custom(objectId).required()
      .description('Client ID')
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
    branch: Joi.string().custom(objectId),
    search: Joi.string().trim().allow(''),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1).max(10000).default(50),
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
    limit: Joi.number().integer().min(1).max(10000).default(50),
    page: Joi.number().integer().min(1).default(1)
  })
};

export default {
  getTaskCompletionTrends,
  getTopTeamMembersByCompletion,
  getTopTeamMembersByBranch,
  getTeamMemberDetailsOverview,
  getClientDetailsOverview,
  getAllClientsTableData,
  getAllTeamMembersTableData
};
