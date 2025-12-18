import Joi from 'joi';

const generateOTP = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    pan: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).required(),
  }),
};

const verifyOTPAndLogin = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    pan: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).required(),
    otp: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
  }),
};

const logout = {
  body: Joi.object().keys({
    accessToken: Joi.string().required(),
  }),
};

export {
  generateOTP,
  verifyOTPAndLogin,
  logout,
};
