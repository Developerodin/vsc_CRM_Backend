import httpStatus from 'http-status';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import config from '../config/config.js';
import { getClientByEmailAndPan, getClientByPan } from './client.service.js';
import Token from '../models/token.model.js';
import ApiError from '../utils/ApiError.js';
import { tokenTypes } from '../config/tokens.js';
import { emailService } from './index.js';
import { getOTPEmailContent } from './email.service.js';

/**
 * Generate OTP for client login
 * @param {string} pan
 * @returns {Promise<Object>}
 */
const generateClientOTP = async (pan) => {
  const client = await getClientByPan(pan);
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No client found with this PAN');
  }

  if (!client.email) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Client email not found. Please contact support.');
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Save OTP token
  const expires = moment().add(10, 'minutes'); // OTP expires in 10 minutes
  const otpToken = jwt.sign(
    { 
      sub: client.id, 
      otp, 
      type: tokenTypes.CLIENT_OTP 
    }, 
    config.jwt.secret, 
    { expiresIn: '10m' }
  );
  
  await Token.create({
    token: otpToken,
    user: client.id,
    userModel: 'Client',
    expires: expires.toDate(),
    type: tokenTypes.CLIENT_OTP,
    blacklisted: false,
  });

  // Send OTP via email (header, highlighted OTP, footer)
  const { subject, text, html } = getOTPEmailContent(client.name || 'Client', otp, 'client');
  await emailService.sendEmail(client.email, subject, text, html);

  return { 
    message: 'OTP sent successfully',
    email: client.email
  };
};

/**
 * Verify client OTP and login
 * @param {string} email
 * @param {string} pan
 * @param {string} otp
 * @returns {Promise<Object>}
 */
const verifyClientOTP = async (email, pan, otp) => {
  const client = await getClientByEmailAndPan(email, pan);
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'No client found with this email and PAN');
  }

  // Find the OTP token
  const otpTokenDoc = await Token.findOne({
    user: client.id,
    type: tokenTypes.CLIENT_OTP,
    blacklisted: false,
    expires: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!otpTokenDoc) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'OTP expired or not found');
  }

  // Verify OTP
  try {
    const payload = jwt.verify(otpTokenDoc.token, config.jwt.secret);
    if (payload.otp !== otp) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid OTP');
    }
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired OTP');
  }

  // Blacklist the OTP token
  await Token.findByIdAndUpdate(otpTokenDoc._id, { blacklisted: true });

  // Generate client access token
  const accessTokenExpires = moment().add(24, 'hours'); // Client token valid for 24 hours
  const accessToken = jwt.sign(
    { 
      sub: client.id, 
      type: tokenTypes.CLIENT_ACCESS,
      userType: 'client'
    }, 
    config.jwt.secret, 
    { expiresIn: '24h' }
  );

  // Save access token
  await Token.create({
    token: accessToken,
    user: client.id,
    userModel: 'Client',
    expires: accessTokenExpires.toDate(),
    type: tokenTypes.CLIENT_ACCESS,
    blacklisted: false,
  });

  return {
    client: {
      id: client.id,
      name: client.name,
    },
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
  };
};

/**
 * Logout client
 * @param {string} accessToken
 * @returns {Promise}
 */
const logoutClient = async (accessToken) => {
  const tokenDoc = await Token.findOne({ 
    token: accessToken, 
    type: tokenTypes.CLIENT_ACCESS, 
    blacklisted: false 
  });
  
  if (tokenDoc) {
    await Token.findByIdAndUpdate(tokenDoc._id, { blacklisted: true });
  }
};

export {
  generateClientOTP,
  verifyClientOTP,
  logoutClient,
};
