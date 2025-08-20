import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import { teamMemberAnalytics, clientAnalytics } from '../services/analytics/index.js';

/**
 * Get team member analytics dashboard cards
 * @route GET /v1/analytics/team-members/dashboard-cards
 * @access Private
 */
const getTeamMemberDashboardCards = catchAsync(async (req, res) => {
  try {
    const dashboardCards = await teamMemberAnalytics.getDashboardCards();
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Dashboard cards retrieved successfully',
      data: dashboardCards
    });
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve dashboard cards');
  }
});

/**
 * Get task completion trends
 * @route GET /v1/analytics/team-members/completion-trends
 * @access Private
 */
const getTaskCompletionTrends = catchAsync(async (req, res) => {
  try {
    const { months = 6 } = req.query;
    const trends = await teamMemberAnalytics.getTaskCompletionTrends(parseInt(months));
    
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Task completion trends retrieved successfully',
      data: trends
    });
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve completion trends');
  }
});

/**
 * Get top team members by task completion
 * @route GET /v1/analytics/team-members/top-by-completion
 * @access Private
 */
const getTopTeamMembersByCompletion = catchAsync(async (req, res) => {
  try {
    const { limit = 10, branch, startDate, endDate } = req.query;
    
    const filter = {};
    if (branch) filter.branch = branch;
    if (startDate && endDate) {
      filter.updatedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const topMembers = await teamMemberAnalytics.getTopTeamMembersByCompletion(
      parseInt(limit),
      filter
    );
    
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Top team members by completion retrieved successfully',
      data: topMembers
    });
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve top team members');
  }
});

/**
 * Get top team members by branch
 * @route GET /v1/analytics/team-members/top-by-branch
 * @access Private
 */
const getTopTeamMembersByBranch = catchAsync(async (req, res) => {
  try {
    const { branchId, limit = 5 } = req.query;
    
    const topMembersByBranch = await teamMemberAnalytics.getTopTeamMembersByBranch(
      branchId || null,
      parseInt(limit)
    );
    
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Top team members by branch retrieved successfully',
      data: topMembersByBranch
    });
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve top team members by branch');
  }
});

/**
 * Get comprehensive team member analytics summary
 * @route GET /v1/analytics/team-members/summary
 * @access Private
 */
const getTeamMemberAnalyticsSummary = catchAsync(async (req, res) => {
  try {
    const summary = await teamMemberAnalytics.getAnalyticsSummary();
    
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Team member analytics summary retrieved successfully',
      data: summary
    });
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve analytics summary');
  }
});

/**
 * Get detailed overview for a specific team member
 * @route GET /v1/analytics/team-members/:teamMemberId/overview
 * @access Private
 */
const getTeamMemberDetailsOverview = catchAsync(async (req, res) => {
  try {
    const { teamMemberId } = req.params;
    
    if (!teamMemberId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Team member ID is required');
    }
    
    const overview = await teamMemberAnalytics.getTeamMemberDetailsOverview(teamMemberId);
    
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Team member details overview retrieved successfully',
      data: overview
    });
  } catch (error) {
    if (error.message === 'Team member not found') {
      throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found');
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve team member overview');
  }
});

/**
 * Get detailed overview for a specific client
 * @route GET /v1/analytics/clients/:clientId/overview
 * @access Private
 */
const getClientDetailsOverview = catchAsync(async (req, res) => {
  try {
    const { clientId } = req.params;
    
    if (!clientId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Client ID is required');
    }
    
    const overview = await clientAnalytics.getClientDetailsOverview(clientId);
    
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Client details overview retrieved successfully',
      data: overview
    });
  } catch (error) {
    if (error.message === 'Client not found') {
      throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve client overview');
  }
});

/**
 * Get all analytics endpoints info
 * @route GET /v1/analytics
 * @access Private
 */
const getAnalyticsInfo = catchAsync(async (req, res) => {
  const analyticsInfo = {
    available: ['team-members', 'clients'],
    endpoints: {
      'team-members': {
        description: 'Team member performance analytics',
        endpoints: [
          {
            path: '/v1/analytics/team-members/dashboard-cards',
            method: 'GET',
            description: 'Get dashboard overview cards with key metrics'
          },
          {
            path: '/v1/analytics/team-members/completion-trends',
            method: 'GET',
            description: 'Get task completion trends for bar chart',
            query: {
              months: 'Number of months (default: 6)'
            }
          },
          {
            path: '/v1/analytics/team-members/top-by-completion',
            method: 'GET',
            description: 'Get top team members by task completion',
            query: {
              limit: 'Number of top members (default: 10)',
              branch: 'Branch ID filter (optional)',
              startDate: 'Start date filter (optional)',
              endDate: 'End date filter (optional)'
            }
          },
          {
            path: '/v1/analytics/team-members/top-by-branch',
            method: 'GET',
            description: 'Get top team members by branch',
            query: {
              branchId: 'Branch ID filter (optional)',
              limit: 'Number of top members per branch (default: 5)'
            }
          },
          {
            path: '/v1/analytics/team-members/summary',
            method: 'GET',
            description: 'Get comprehensive analytics summary'
          },
          {
            path: '/v1/analytics/team-members/:teamMemberId/overview',
            method: 'GET',
            description: 'Get detailed overview for a specific team member',
            params: {
              teamMemberId: 'Team member ID (required)'
            }
          }
        ]
      },
      'clients': {
        description: 'Client performance and relationship analytics',
        endpoints: [
          {
            path: '/v1/analytics/clients/:clientId/overview',
            method: 'GET',
            description: 'Get detailed overview for a specific client',
            params: {
              clientId: 'Client ID (required)'
            }
          }
        ]
      }
    }
  };
  
  res.status(httpStatus.OK).json({
    success: true,
    message: 'Analytics endpoints information',
    data: analyticsInfo
  });
});

export default {
  getTeamMemberDashboardCards,
  getTaskCompletionTrends,
  getTopTeamMembersByCompletion,
  getTopTeamMembersByBranch,
  getTeamMemberAnalyticsSummary,
  getTeamMemberDetailsOverview,
  getClientDetailsOverview,
  getAnalyticsInfo
};
