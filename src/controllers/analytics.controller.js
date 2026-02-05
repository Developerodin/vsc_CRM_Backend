import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import { teamMemberAnalytics, clientAnalytics, timelineAnalytics } from '../services/analytics/index.js';
import pick from '../utils/pick.js';
import Client from '../models/client.model.js';
import Timeline from '../models/timeline.model.js';
import Task from '../models/task.model.js';
import TeamMember from '../models/teamMember.model.js';

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
    const { limit, branch, startDate, endDate } = req.query;
    
    const filter = {};
    if (branch) filter.branch = branch;
    if (startDate && endDate) {
      filter.updatedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const topMembers = await teamMemberAnalytics.getTopTeamMembersByCompletion(
      limit ? parseInt(limit) : undefined,
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
    
    // Extract filters from query parameters
    const filters = pick(req.query, [
      'clientSearch',
      'activitySearch',
      'startDate', 
      'endDate',
      'priority',
      'status'
    ]);
    
    // Extract options from query parameters
    const options = pick(req.query, ['limit', 'page']);
    
    const overview = await teamMemberAnalytics.getTeamMemberDetailsOverview(teamMemberId, filters, options);
    
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
    
    // Extract filters from query parameters
    const filters = pick(req.query, [
      'activitySearch',
      'startDate',
      'endDate',
      'priority',
      'status',
      'teamMemberId',
      'financialYear'
    ]);
    
    // Extract options from query parameters
    const options = pick(req.query, ['limit', 'page']);
    
    const overview = await clientAnalytics.getClientDetailsOverview(clientId, filters, options);
    
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
 * Get all clients table data with comprehensive information
 * @route GET /v1/analytics/clients/table
 * @access Private
 */
const getAllClientsTableData = catchAsync(async (req, res) => {
  try {
    const filter = pick(req.query, [
      'name', 
      'email', 
      'phone', 
      'district', 
      'state', 
      'country', 
      'fNo', 
      'pan', 
      'businessType',
      'gstNumber',
      'tanNumber',
      'cinNumber',
      'udyamNumber',
      'iecCode',
      'entityType',
      'clientCategory',
      'turnover',
      'turnoverYear',
      'branch',
      'search',
      'activity',
      'activitySearch',
      'activityName',
      'subactivity',
      'subactivitySearch'
    ]);
    
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    
    const result = await clientAnalytics.getAllClientsTableData(filter, options, req.user);
    
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Clients table data retrieved successfully',
      data: result
    });
  } catch (error) {
    if (error.message.includes('Access denied')) {
      throw new ApiError(httpStatus.FORBIDDEN, error.message);
    }
    if (error.message.includes('No branch access')) {
      throw new ApiError(httpStatus.FORBIDDEN, error.message);
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve clients table data');
  }
});

/**
 * Test endpoint to check database relationships for team members
 * @route GET /v1/analytics/test-team-members-db
 * @access Private
 */
const testTeamMembersDatabase = catchAsync(async (req, res) => {
  try {
    // Get a sample team member
    const sampleTeamMember = await TeamMember.findOne().lean();
    
    if (!sampleTeamMember) {
      return res.status(404).json({
        success: false,
        message: 'No team members found in database'
      });
    }

    // Check tasks for this team member
    const tasks = await Task.find({ teamMember: sampleTeamMember._id }).lean();
    
    // Check timelines for this team member's tasks
    const timelineIds = [];
    tasks.forEach(task => {
      if (task.timeline && Array.isArray(task.timeline)) {
        timelineIds.push(...task.timeline);
      }
    });
    
    const timelines = await Timeline.find({ _id: { $in: timelineIds } }).lean();
    
    // Check clients from timelines
    const clientIds = timelines.map(t => t.client).filter(Boolean);
    const clients = await Client.find({ _id: { $in: clientIds } }).lean();
    
    res.status(200).json({
      success: true,
      message: 'Database check completed',
      data: {
        sampleTeamMember: {
          id: sampleTeamMember._id,
          name: sampleTeamMember.name,
          email: sampleTeamMember.email
        },
        tasks: {
          total: tasks.length,
          sample: tasks.length > 0 ? {
            id: tasks[0]._id,
            teamMember: tasks[0].teamMember,
            timeline: tasks[0].timeline,
            status: tasks[0].status
          } : null
        },
        timelines: {
          total: timelines.length,
          sample: timelines.length > 0 ? {
            id: timelines[0]._id,
            client: timelines[0].client,
            activity: timelines[0].activity
          } : null
        },
        clients: {
          total: clients.length,
          sample: clients.length > 0 ? {
            id: clients[0]._id,
            name: clients[0].name,
            email: clients[0].email
          } : null
        }
      }
    });
  } catch (error) {
    console.error('Error checking team members database:', error);
    res.status(500).json({
      success: false,
      message: `Database check failed: ${error.message}`
    });
  }
});

/**
 * Test endpoint to check timeline existence for team member tasks
 * @route GET /v1/analytics/test-timeline-existence
 * @access Private
 */
const testTimelineExistence = catchAsync(async (req, res) => {
  try {
    // Get a sample team member with tasks
    const sampleTeamMember = await TeamMember.findOne().lean();
    
    if (!sampleTeamMember) {
      return res.status(404).json({
        success: false,
        message: 'No team members found in database'
      });
    }

    // Get tasks for this team member
    const tasks = await Task.find({ teamMember: sampleTeamMember._id }).lean();
    
    if (tasks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No tasks found for this team member'
      });
    }

    // Extract timeline IDs from tasks
    const timelineIds = [...new Set(tasks.flatMap(task => {
      if (!task.timeline || !Array.isArray(task.timeline) || task.timeline.length === 0) {
        return [];
      }
      return task.timeline.map(timelineId => 
        timelineId && timelineId.toString ? timelineId : null
      ).filter(Boolean);
    }))];

    // Check which timeline IDs actually exist in Timeline collection
    const existingTimelines = await Timeline.find({ _id: { $in: timelineIds } }).lean();
    const existingTimelineIds = existingTimelines.map(t => t._id.toString());

    res.status(200).json({
      success: true,
      message: 'Timeline existence check completed',
      data: {
        teamMember: {
          id: sampleTeamMember._id,
          name: sampleTeamMember.name,
          email: sampleTeamMember.email
        },
        tasks: {
          total: tasks.length,
          sample: {
            id: tasks[0]._id,
            timeline: tasks[0].timeline,
            timelineType: typeof tasks[0].timeline,
            isArray: Array.isArray(tasks[0].timeline)
          }
        },
        extractedTimelineIds: timelineIds,
        existingTimelines: {
          total: existingTimelines.length,
          ids: existingTimelineIds
        },
        missingTimelineIds: timelineIds.filter(id => !existingTimelineIds.includes(id.toString()))
      }
    });
  } catch (error) {
    console.error('Error checking timeline existence:', error);
    res.status(500).json({
      success: false,
      message: `Timeline existence check failed: ${error.message}`
    });
  }
});

/**
 * Get all team members table data with comprehensive information
 * @route GET /v1/analytics/team-members/table
 * @access Private
 */
const getAllTeamMembersTableData = catchAsync(async (req, res) => {
  try {
    const filter = pick(req.query, [
      'name', 
      'email', 
      'phone', 
      'city', 
      'state', 
      'country', 
      'branch',
      'search'
    ]);
    
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    
    const result = await teamMemberAnalytics.getAllTeamMembersTableData(filter, options, req.user);
    
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Team members table data retrieved successfully',
      data: result
    });
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, `Failed to retrieve team members table data: ${error.message}`);
  }
});

/**
 * Get all timelines table data with comprehensive information
 * @route GET /v1/analytics/timelines/table
 * @access Private
 */
const getAllTimelinesTableData = catchAsync(async (req, res) => {
  try {
    const filter = pick(req.query, [
      'client',
      'clientSearch',
      'businessType',
      'entityType',
      'clientCategory',
      'turnover',
      'turnoverYear',
      'activity',
      'activitySearch',
      'subactivity',
      'subactivitySearch',
      'status',
      'frequency',
      'timelineType',
      'period',
      'financialYear',
      'startDate',
      'endDate',
      'branch',
      'search'
    ]);
    
    const options = pick(req.query, ['sortBy', 'limit', 'page']);
    
    const result = await timelineAnalytics.getAllTimelinesTableData(filter, options, req.user);
    
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Timelines table data retrieved successfully',
      data: result
    });
  } catch (error) {
    if (error.message.includes('Access denied')) {
      throw new ApiError(httpStatus.FORBIDDEN, error.message);
    }
    if (error.message.includes('No branch access')) {
      throw new ApiError(httpStatus.FORBIDDEN, error.message);
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve timelines table data');
  }
});

/**
 * Get detailed overview for a specific timeline
 * @route GET /v1/analytics/timelines/:timelineId/overview
 * @access Private
 */
const getTimelineDetailsOverview = catchAsync(async (req, res) => {
  try {
    const { timelineId } = req.params;
    
    if (!timelineId) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Timeline ID is required');
    }
    
    // Extract filters from query parameters
    const filters = pick(req.query, [
      'teamMemberId',
      'startDate', 
      'endDate',
      'priority',
      'status'
    ]);
    
    // Extract options from query parameters
    const options = pick(req.query, ['limit', 'page']);
    
    const overview = await timelineAnalytics.getTimelineDetailsOverview(timelineId, filters, options);
    
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Timeline details overview retrieved successfully',
      data: overview
    });
  } catch (error) {
    if (error.message === 'Timeline not found') {
      throw new ApiError(httpStatus.NOT_FOUND, 'Timeline not found');
    }
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve timeline overview');
  }
});

/**
 * Get analytics endpoints information
 * @route GET /v1/analytics/info
 * @access Private
 */
const getAnalyticsInfo = catchAsync(async (req, res) => {
  const analyticsInfo = {
    description: 'Comprehensive analytics API for team members, clients, timelines, and system performance',
    version: '1.0.0',
    endpoints: {
      'team-members': {
        description: 'Team member performance and analytics',
        endpoints: [
          {
            path: '/v1/analytics/team-members/dashboard',
            method: 'GET',
            description: 'Get dashboard overview cards for team members',
            query: {
              branchId: 'Branch ID filter (optional)'
            }
          },
          {
            path: '/v1/analytics/team-members/trends',
            method: 'GET',
            description: 'Get task completion trends',
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
          },
          {
            path: '/v1/analytics/team-members/table',
            method: 'GET',
            description: 'Get all team members table data with comprehensive information',
            query: {
              name: 'Team member name filter (optional)',
              email: 'Team member email filter (optional)',
              phone: 'Team member phone filter (optional)',
              city: 'Team member city filter (optional)',
              state: 'Team member state filter (optional)',
              country: 'Team member country filter (optional)',
              branch: 'Branch ID filter (optional)',
              search: 'Search term for name, email, phone, etc. (optional)'
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
          },
          {
            path: '/v1/analytics/clients/table',
            method: 'GET',
            description: 'Get all clients table data with comprehensive information',
            query: {
              name: 'Client name filter (optional)',
              email: 'Client email filter (optional)',
              phone: 'Client phone filter (optional)',
              district: 'Client district filter (optional)',
              state: 'Client state filter (optional)',
              country: 'Client country filter (optional)',
              fNo: 'Client fNo filter (optional)',
              pan: 'Client pan filter (optional)',
              businessType: 'Client businessType filter (optional)',
              gstNumber: 'Client gstNumber filter (optional)',
              tanNumber: 'Client tanNumber filter (optional)',
              cinNumber: 'Client cinNumber filter (optional)',
              udyamNumber: 'Client udyamNumber filter (optional)',
              iecCode: 'Client iecCode filter (optional)',
              entityType: 'Client entityType filter (optional)',
              clientCategory: 'Client category filter (A, B, or C) (optional)',
              turnover: 'Client turnover/revenue filter - single value, text search, or range (e.g., "10000 to 500000" or "10000-500000") (optional)',
              branch: 'Client branch filter (optional)',
              search: 'Search term for name, email, phone, etc. (optional)',
              activity: 'Activity ID filter (optional)',
              activitySearch: 'Search activities by name or description (optional)',
              activityName: 'Activity name filter (optional)',
              subactivity: 'Subactivity ID filter (optional)',
              subactivitySearch: 'Search subactivities by name (optional)',
              sortBy: 'Sort field and order (e.g., name:asc)',
              limit: 'Number of results per page (optional)',
              page: 'Page number (default: 1)'
            }
          }
        ]
      },
      'timelines': {
        description: 'Timeline performance and analytics',
        endpoints: [
          {
            path: '/v1/analytics/timelines/table',
            method: 'GET',
            description: 'Get all timelines table data with comprehensive information',
            query: {
              client: 'Client ID filter (optional)',
              clientSearch: 'Search clients by name, email, phone (optional)',
              businessType: 'Client business type filter (optional)',
              entityType: 'Client entity type filter (optional)',
              clientCategory: 'Client category filter (A, B, or C) (optional)',
              turnover: 'Client turnover/revenue filter - single value, text search, or range (e.g., "10000 to 500000" or "10000-500000") (optional)',
              activity: 'Activity ID filter (optional)',
              activitySearch: 'Search activities by name or description (optional)',
              subactivity: 'Subactivity ID filter (optional)',
              subactivitySearch: 'Search subactivities by name (optional)',
              status: 'Timeline status filter (pending, completed, delayed, ongoing)',
              frequency: 'Frequency filter (None, OneTime, Hourly, Daily, Weekly, Monthly, Quarterly, Yearly)',
              timelineType: 'Timeline type filter (oneTime, recurring)',
              period: 'Period filter (optional)',
              financialYear: 'Financial year filter (optional)',
              startDate: 'Start date filter (ISO format, optional)',
              endDate: 'End date filter (ISO format, optional)',
              branch: 'Branch ID filter (optional)',
              search: 'Global search term (optional)',
              sortBy: 'Sort field and order (e.g., createdAt:desc)',
              limit: 'Number of results per page (optional)',
              page: 'Page number (default: 1)'
            }
          },
          {
            path: '/v1/analytics/timelines/:timelineId/overview',
            method: 'GET',
            description: 'Get detailed overview for a specific timeline',
            params: {
              timelineId: 'Timeline ID (required)'
            },
            query: {
              teamMemberId: 'Filter tasks by team member ID (optional)',
              startDate: 'Start date for filtering tasks (ISO format, optional)',
              endDate: 'End date for filtering tasks (ISO format, optional)',
              priority: 'Filter tasks by priority (low, medium, high, urgent)',
              status: 'Filter tasks by status (pending, ongoing, completed, on_hold, delayed, cancelled)',
              limit: 'Number of recent tasks to return (optional)',
              page: 'Page number (default: 1)'
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
  getAllClientsTableData,
  getAllTimelinesTableData,
  getTimelineDetailsOverview,
  getAnalyticsInfo,
  getAllTeamMembersTableData,
  testTeamMembersDatabase,
  testTimelineExistence
};
