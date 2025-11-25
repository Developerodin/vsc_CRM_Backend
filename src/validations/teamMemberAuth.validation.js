import Joi from 'joi';
import { objectId } from './custom.validation.js';

const generateOTP = {
  body: Joi.object().keys({
    email: Joi.string().email().required()
      .description('Team member email address')
  })
};

const verifyOTPAndLogin = {
  body: Joi.object().keys({
    email: Joi.string().email().required()
      .description('Team member email address'),
    otp: Joi.string().length(6).pattern(/^[0-9]+$/).required()
      .description('6-digit OTP code')
  })
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required()
      .description('Refresh token for logout')
  })
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required()
      .description('Refresh token for generating new access token')
  })
};

const getProfile = {
  // No body validation needed for GET request
};

const updateProfile = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(2).max(50)
      .description('Team member full name'),
    phone: Joi.string().trim().min(10).max(15)
      .description('Phone number'),
    address: Joi.string().trim().min(5).max(200)
      .description('Address'),
    city: Joi.string().trim().min(2).max(50)
      .description('City'),
    state: Joi.string().trim().min(2).max(50)
      .description('State'),
    country: Joi.string().trim().min(2).max(50)
      .description('Country'),
    pinCode: Joi.string().trim().min(5).max(10)
      .description('PIN code')
  })
};

const getMyTasks = {
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'ongoing', 'completed', 'on_hold', 'cancelled', 'delayed')
      .description('Filter tasks by status'),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent', 'critical')
      .description('Filter tasks by priority'),
    startDate: Joi.date().iso()
      .description('Filter tasks from this date'),
    endDate: Joi.date().iso().min(Joi.ref('startDate'))
      .description('Filter tasks until this date'),
    page: Joi.number().integer().min(1).default(1)
      .description('Page number for pagination'),
    limit: Joi.number().integer().min(1).max(100).optional()
      .description('Number of tasks per page')
  })
};

const getTaskDetails = {
  params: Joi.object().keys({
    taskId: Joi.string().custom(objectId).required()
      .description('Task ID')
  })
};

const updateTask = {
  params: Joi.object().keys({
    taskId: Joi.string().custom(objectId).required()
      .description('Task ID')
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('pending', 'ongoing', 'completed', 'on_hold', 'cancelled', 'delayed')
      .description('New task status'),
    remarks: Joi.string().trim().max(500)
      .description('Task remarks or notes'),
    metadata: Joi.object()
      .description('Additional task metadata')
  })
};

export {
  generateOTP,
  verifyOTPAndLogin,
  logout,
  refreshTokens,
  getProfile,
  updateProfile,
  getMyTasks,
  getTaskDetails,
  updateTask
};
