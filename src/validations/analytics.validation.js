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

export default {
  getTaskCompletionTrends,
  getTopTeamMembersByCompletion,
  getTopTeamMembersByBranch,
  getTeamMemberDetailsOverview
};
