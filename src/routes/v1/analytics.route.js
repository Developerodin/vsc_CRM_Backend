import express from 'express';
import auth from '../../middlewares/auth.js';
import validate from '../../middlewares/validate.js';
import analyticsValidation from '../../validations/analytics.validation.js';
import analyticsController from '../../controllers/analytics.controller.js';

const router = express.Router();

// Apply authentication middleware to all analytics routes
router.use(auth());

/**
 * @route GET /v1/analytics
 * @desc Get analytics endpoints information
 * @access Private
 */
router.get('/', analyticsController.getAnalyticsInfo);

/**
 * @route GET /v1/analytics/team-members/dashboard-cards
 * @desc Get team member dashboard overview cards
 * @access Private
 */
router.get('/team-members/dashboard-cards', analyticsController.getTeamMemberDashboardCards);

/**
 * @route GET /v1/analytics/team-members/completion-trends
 * @desc Get task completion trends for bar chart
 * @access Private
 */
router.get('/team-members/completion-trends', 
  validate(analyticsValidation.getTaskCompletionTrends),
  analyticsController.getTaskCompletionTrends
);

/**
 * @route GET /v1/analytics/team-members/top-by-completion
 * @desc Get top team members by task completion
 * @access Private
 */
router.get('/team-members/top-by-completion',
  validate(analyticsValidation.getTopTeamMembersByCompletion),
  analyticsController.getTopTeamMembersByCompletion
);

/**
 * @route GET /v1/analytics/team-members/top-by-branch
 * @desc Get top team members by branch
 * @access Private
 */
router.get('/team-members/top-by-branch',
  validate(analyticsValidation.getTopTeamMembersByBranch),
  analyticsController.getTopTeamMembersByBranch
);

/**
 * @route GET /v1/analytics/team-members/summary
 * @desc Get comprehensive team member analytics summary
 * @access Private
 */
router.get('/team-members/summary', analyticsController.getTeamMemberAnalyticsSummary);

/**
 * @route GET /v1/analytics/team-members/:teamMemberId/overview
 * @desc Get detailed overview for a specific team member
 * @access Private
 */
router.get('/team-members/:teamMemberId/overview', 
  validate(analyticsValidation.getTeamMemberDetailsOverview),
  analyticsController.getTeamMemberDetailsOverview
);

export default router;
