import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { generateClientOTP, verifyClientOTP, logoutClient } from '../services/clientAuth.service.js';

/**
 * Generate OTP for client login
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const generateOTP = catchAsync(async (req, res) => {
  const { email, pan } = req.body;
  
  const result = await generateClientOTP(email, pan);
  
  res.status(httpStatus.OK).send({
    success: true,
    message: 'OTP sent successfully',
    data: result
  });
});

/**
 * Verify OTP and login client
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const verifyOTPAndLogin = catchAsync(async (req, res) => {
  const { email, pan, otp } = req.body;
  
  const result = await verifyClientOTP(email, pan, otp);
  
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Client logged in successfully',
    data: result
  });
});

/**
 * Logout client
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const logout = catchAsync(async (req, res) => {
  const { accessToken } = req.body;
  
  await logoutClient(accessToken);
  
  res.status(httpStatus.OK).send({
    success: true,
    message: 'Client logged out successfully'
  });
});

/**
 * Get client profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getProfile = catchAsync(async (req, res) => {
  res.status(httpStatus.OK).send({
    success: true,
    data: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      address: req.user.address,
      city: req.user.city,
      state: req.user.state,
      country: req.user.country,
      pinCode: req.user.pinCode,
      sortOrder: req.user.sortOrder
    }
  });
});

export {
  generateOTP,
  verifyOTPAndLogin,
  logout,
  getProfile,
};
