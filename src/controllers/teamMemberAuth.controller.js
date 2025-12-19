import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import ApiError from '../utils/ApiError.js';
import { generateTeamMemberAuthTokens } from '../services/token.service.js';
import { sendEmail } from '../services/email.service.js';
import { TeamMember, Task } from '../models/index.js';
import taskService from '../services/task.service.js';
import pick from '../utils/pick.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';

/**
 * Generate OTP for team member login
 */
const generateOTP = catchAsync(async (req, res) => {
  try {
    const { email } = req.body;

    // Check if team member exists
    const teamMember = await TeamMember.findOne({ email });
    if (!teamMember) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found with this email');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in team member document (simple approach like client auth)
    // In production, you might want to add OTP fields to the TeamMember model
    // For now, we'll use a simple approach
    
    // Send OTP via email
    const emailSubject = '🔐 Team Member Login OTP';
    const emailBody = `Hello ${teamMember.name},\n\nYour login OTP is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nIf you didn't request this OTP, please ignore this email.\n\nBest regards,\nYour Team Management System`;
    
    await sendEmail(
      teamMember.email,
      emailSubject,
      emailBody
    );

    logger.info(`OTP sent to team member: ${teamMember.email}`);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'OTP sent successfully to your email',
      data: {
        email: teamMember.email,
        message: 'Please check your email for the OTP'
      }
    });

  } catch (error) {
    logger.error('Error generating OTP for team member:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to generate OTP');
  }
});

/**
 * Verify OTP and login team member
 */
const verifyOTPAndLogin = catchAsync(async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Check if team member exists
    const teamMember = await TeamMember.findOne({ email });
    if (!teamMember) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found');
    }

    // Simple OTP verification (same approach as client auth)
    // In production, you would verify the OTP from storage
    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid OTP format');
    }

    // TODO: Implement proper OTP validation logic here
    // For now, we'll use a simple approach like client auth
    // You can add OTP fields to TeamMember model or use a simple storage mechanism

    // Generate authentication tokens
    const tokens = await generateTeamMemberAuthTokens(teamMember);

    logger.info(`Team member logged in successfully: ${teamMember.email}`);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Login successful',
      data: {
        teamMember: {
          id: teamMember._id,
          name: teamMember.name,
          email: teamMember.email,
          phone: teamMember.phone,
          branch: teamMember.branch,
          skills: teamMember.skills
        },
        tokens
      }
    });

  } catch (error) {
    logger.error('Error during team member login:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Login failed');
  }
});

/**
 * Logout team member
 */
const logout = catchAsync(async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // In a real implementation, you would invalidate the refresh token
    // This could involve adding it to a blacklist or updating the token status
    
    logger.info('Team member logged out successfully');

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    logger.error('Error during team member logout:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Logout failed');
  }
});

/**
 * Refresh access token
 */
const refreshTokens = catchAsync(async (req, res) => {
  try {
    const { refreshToken } = req.body;

    // In a real implementation, you would validate the refresh token
    // and generate new access token if valid
    
    // For now, we'll return an error indicating this needs to be implemented
    throw new ApiError(httpStatus.NOT_IMPLEMENTED, 'Token refresh not implemented yet');

  } catch (error) {
    logger.error('Error refreshing tokens:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Token refresh failed');
  }
});

/**
 * Get team member profile
 */
const getProfile = catchAsync(async (req, res) => {
  try {
    const teamMemberId = req.user.id; // This comes from the auth middleware

    const teamMember = await TeamMember.findById(teamMemberId)
      .populate('branch', 'name address city state country')
      .populate('skills', 'name description category')
      .populate({
        path: 'accessibleTeamMembers',
        select: 'name email phone address city state country pinCode branch skills sortOrder createdAt updatedAt',
        populate: [
          { path: 'branch', select: 'name location city state country' },
          { path: 'skills', select: 'name category description' }
        ]
      })
      .select('-__v');

    if (!teamMember) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found');
    }

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: teamMember
    });

  } catch (error) {
    logger.error('Error getting team member profile:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve profile');
  }
});

/**
 * Update team member profile
 */
const updateProfile = catchAsync(async (req, res) => {
  try {
    const teamMemberId = req.user.id;
    const updateData = req.body;

    // Remove fields that shouldn't be updated
    delete updateData.email; // Email shouldn't be changeable
    delete updateData.branch; // Branch assignment should be managed by admin
    delete updateData.skills; // Skills should be managed by admin

    const teamMember = await TeamMember.findByIdAndUpdate(
      teamMemberId,
      updateData,
      { new: true, runValidators: true }
    ).populate('branch', 'name address city state country')
     .populate('skills', 'name description category')
     .populate({
       path: 'accessibleTeamMembers',
       select: 'name email phone address city state country pinCode branch skills sortOrder createdAt updatedAt',
       populate: [
         { path: 'branch', select: 'name location city state country' },
         { path: 'skills', select: 'name category description' }
       ]
     })
     .select('-__v');

    if (!teamMember) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Team member not found');
    }

    logger.info(`Team member profile updated: ${teamMember.email}`);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Profile updated successfully',
      data: teamMember
    });

  } catch (error) {
    logger.error('Error updating team member profile:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update profile');
  }
});

/**
 * Get all tasks assigned to the authenticated team member
 */
const getMyTasks = catchAsync(async (req, res) => {
  try {
    const teamMemberId = req.user.id;
    const {
      status,
      priority,
      startDate,
      endDate,
      page = 1,
      limit
    } = req.query;

    // Build query filters
    const query = { teamMember: teamMemberId };
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get tasks with pagination
    const tasks = await Task.find(query)
      .populate('assignedBy', 'name email')
      .populate('branch', 'name address city state')
      .populate({
        path: 'timeline',
        populate: [
          { path: 'client', select: 'name email phone company' },
          { path: 'activity', select: 'name description category' }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count for pagination
    const totalTasks = await Task.countDocuments(query);

    // Calculate pagination info
    const totalPages = Math.ceil(totalTasks / parseInt(limit));
    const hasNextPage = parseInt(page) < totalPages;
    const hasPrevPage = parseInt(page) > 1;

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Tasks retrieved successfully',
      data: {
        tasks,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalTasks,
          totalPages,
          hasNextPage,
          hasPrevPage
        }
      }
    });

  } catch (error) {
    logger.error('Error getting team member tasks:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve tasks');
  }
});

/**
 * Get specific task details
 */
const getTaskDetails = catchAsync(async (req, res) => {
  try {
    const teamMemberId = req.user.id;
    const { taskId } = req.params;

    // Find task and verify it belongs to the team member
    const task = await Task.findOne({ _id: taskId, teamMember: teamMemberId })
      .populate('assignedBy', 'name email phone')
      .populate('branch', 'name address city state country')
      .populate('teamMember', 'name email phone')
      .populate({
        path: 'timeline',
        populate: [
          { path: 'client', select: 'name email phone company address city state country' },
          { path: 'activity', select: 'name description category' }
        ]
      })
      .lean();

    if (!task) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Task not found or access denied');
    }

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Task details retrieved successfully',
      data: task
    });

  } catch (error) {
    logger.error('Error getting task details:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve task details');
  }
});

/**
 * Update task status and details
 */
const updateTask = catchAsync(async (req, res) => {
  try {
    const teamMemberId = req.user.id;
    const { taskId } = req.params;
    const updateData = req.body;

    // Only allow updating specific fields
    const allowedUpdates = ['status', 'remarks', 'metadata'];
    const filteredUpdates = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updateData[key];
      }
    });

    // First, check if task exists and belongs directly to the team member
    let task = await Task.findOne({
      _id: taskId,
      teamMember: teamMemberId
    });
    
    // If not found, check if it belongs to an accessible team member
    if (!task) {
      // Get the task to check its team member
      const taskToCheck = await Task.findById(taskId);
      
      if (!taskToCheck) {
        throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
      }
      
      // Check if task belongs to an accessible team member
      if (taskToCheck.teamMember) {
        const hasAccess = await TeamMember.hasAccessToTeamMember(
          teamMemberId,
          taskToCheck.teamMember
        );
        
        if (!hasAccess) {
          throw new ApiError(httpStatus.FORBIDDEN, 'Access denied: Task does not belong to you or an accessible team member');
        }
        
        // Task belongs to accessible team member, proceed with update
        task = taskToCheck;
      } else {
        throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Task has no assigned team member');
      }
    }

    // Update the task
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      filteredUpdates,
      { new: true, runValidators: true }
    ).populate('assignedBy', 'name email phone')
     .populate('branch', 'name address city state country')
     .populate('teamMember', 'name email phone')
     .populate({
       path: 'timeline',
       populate: [
         { path: 'client', select: 'name email phone company address city state country' },
         { path: 'activity', select: 'name description category' }
       ]
     });

    if (!updatedTask) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
    }

    logger.info(`Task ${taskId} updated by team member ${teamMemberId}`);

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });

  } catch (error) {
    logger.error('Error updating task:', error);
    // If it's already an ApiError, re-throw it
    if (error instanceof ApiError) {
      throw error;
    }
    // Otherwise, throw a generic error
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update task');
  }
});

/**
 * Get tasks of accessible team members
 */
const getTasksOfAccessibleTeamMembers = catchAsync(async (req, res) => {
  try {
    const teamMemberId = req.user.id;
    const options = pick(req.query, ['sortBy', 'limit', 'page', 'status', 'priority']);
    
    const result = await taskService.getTasksOfAccessibleTeamMembers(teamMemberId, options);
    
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Tasks retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Error getting tasks of accessible team members:', error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to retrieve tasks');
  }
});

/**
 * Assign task to accessible team member
 */
const assignTaskToAccessibleTeamMember = catchAsync(async (req, res) => {
  try {
    const teamMemberId = req.user.id;
    
    const task = await taskService.createTaskForAccessibleTeamMember(teamMemberId, req.body);
    
    logger.info(`Task assigned by team member ${teamMemberId} to ${req.body.teamMember}`);
    
    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Task assigned successfully',
      data: task
    });
  } catch (error) {
    logger.error('Error assigning task:', error);
    throw error;
  }
});

/**
 * Update task of accessible team member
 */
const updateTaskOfAccessibleTeamMember = catchAsync(async (req, res) => {
  try {
    const teamMemberId = req.user.id;
    const { taskId } = req.params;
    
    const task = await taskService.updateTaskOfAccessibleTeamMember(
      teamMemberId,
      taskId,
      req.body
    );
    
    logger.info(`Task ${taskId} updated by team member ${teamMemberId}`);
    
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    logger.error('Error updating task of accessible team member:', error);
    throw error;
  }
});

export {
  generateOTP,
  verifyOTPAndLogin,
  logout,
  refreshTokens,
  getProfile,
  updateProfile,
  getMyTasks,
  getTaskDetails,
  updateTask,
  getTasksOfAccessibleTeamMembers,
  assignTaskToAccessibleTeamMember,
  updateTaskOfAccessibleTeamMember
};
