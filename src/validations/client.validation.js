import Joi from 'joi';
import { objectId } from './custom.validation.js';

const createClient = {
  body: Joi.object().keys({
    name: Joi.string(),
    phone: Joi.string(),
    email: Joi.string().email(),
    email2: Joi.string().email(),
    address: Joi.string(),
    district: Joi.string(),
    state: Joi.string(),
    country: Joi.string(),
    fNo: Joi.string(),
    pan: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/),
    dob: Joi.date().max('now'),
    businessType: Joi.string(),
    gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
    tanNumber: Joi.string().pattern(/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/),
    cinNumber: Joi.string().pattern(/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/),
    udyamNumber: Joi.string().pattern(/^UDYAM-[A-Z]{2}[0-9]{2}[0-9]{7}$/),
    iecCode: Joi.string().pattern(/^[0-9]{10}$/),
    entityType: Joi.string().valid(
      'Proprietorship',
      'Partnership',
      'Private Limited',
      'Public Limited',
      'LLP',
      'Sole Proprietorship',
      'HUF',
      'Trust',
      'Society',
      'Other'
    ),
    metadata: Joi.object(),
    branch: Joi.string().custom(objectId).required(),
    sortOrder: Joi.number(),
  }),
};

const getClients = {
  query: Joi.object().keys({
    name: Joi.string(),
    email: Joi.string(),
    phone: Joi.string(),
    district: Joi.string(),
    state: Joi.string(),
    country: Joi.string(),
    fNo: Joi.string(),
    pan: Joi.string(),
    businessType: Joi.string(),
    gstNumber: Joi.string(),
    tanNumber: Joi.string(),
    cinNumber: Joi.string(),
    udyamNumber: Joi.string(),
    iecCode: Joi.string(),
    entityType: Joi.string(),
    branch: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getClient = {
  params: Joi.object().keys({
    clientId: Joi.string().custom(objectId),
  }),
};

const updateClient = {
  params: Joi.object().keys({
    clientId: Joi.required().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      phone: Joi.string(),
      email: Joi.string().email(),
      email2: Joi.string().email(),
      address: Joi.string(),
      district: Joi.string(),
      state: Joi.string(),
      country: Joi.string(),
      fNo: Joi.string(),
      pan: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/),
      dob: Joi.date().max('now'),
      businessType: Joi.string(),
      gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
      tanNumber: Joi.string().pattern(/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/),
      cinNumber: Joi.string().pattern(/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/),
      udyamNumber: Joi.string().pattern(/^UDYAM-[A-Z]{2}[0-9]{2}[0-9]{7}$/),
      iecCode: Joi.string().pattern(/^[0-9]{10}$/),
      entityType: Joi.string().valid(
        'Proprietorship',
        'Partnership',
        'Private Limited',
        'Public Limited',
        'LLP',
        'Sole Proprietorship',
        'HUF',
        'Trust',
        'Society',
        'Other'
      ),
      metadata: Joi.object(),
      branch: Joi.string().custom(objectId),
      sortOrder: Joi.number(),
    })
    .min(1),
};

const deleteClient = {
  params: Joi.object().keys({
    clientId: Joi.string().custom(objectId),
  }),
};

const bulkImportClients = {
  body: Joi.object().keys({
    clients: Joi.array()
      .items(
        Joi.object().keys({
          id: Joi.string().custom(objectId).optional(),
          name: Joi.string(),
          phone: Joi.string(),
          email: Joi.string().email(),
          email2: Joi.string().email(),
          address: Joi.string(),
          district: Joi.string(),
          state: Joi.string(),
          country: Joi.string(),
          fNo: Joi.string(),
          pan: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/),
          dob: Joi.date().max('now'),
          businessType: Joi.string(),
          gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
          tanNumber: Joi.string().pattern(/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/),
          cinNumber: Joi.string().pattern(/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/),
          udyamNumber: Joi.string().pattern(/^UDYAM-[A-Z]{2}[0-9]{2}[0-9]{7}$/),
          iecCode: Joi.string().pattern(/^[0-9]{10}$/),
          entityType: Joi.string().valid(
            'Proprietorship',
            'Partnership',
            'Private Limited',
            'Public Limited',
            'LLP',
            'Sole Proprietorship',
            'HUF',
            'Trust',
            'Society',
            'Other'
          ),
          metadata: Joi.object(),
          branch: Joi.string().custom(objectId).required(),
          sortOrder: Joi.number(),
        })
      )
      .min(1)
      .max(500)
      .required(),
  }),
};

// Activity management validations
const addActivityToClient = {
  params: Joi.object().keys({
    clientId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    activity: Joi.string().custom(objectId).required(),
    assignedTeamMember: Joi.string().custom(objectId).required(),
    notes: Joi.string().optional(),
  }),
};

const removeActivityFromClient = {
  params: Joi.object().keys({
    clientId: Joi.string().custom(objectId).required(),
    activityId: Joi.string().custom(objectId).required(),
  }),
};

const updateActivityAssignment = {
  params: Joi.object().keys({
    clientId: Joi.string().custom(objectId).required(),
    activityId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    assignedTeamMember: Joi.string().custom(objectId).optional(),
    notes: Joi.string().optional(),
  }).min(1),
};

const getClientActivities = {
  params: Joi.object().keys({
    clientId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    status: Joi.string().valid('pending', 'in_progress', 'completed', 'cancelled'),
    assignedTeamMember: Joi.string().custom(objectId),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

export default {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
  bulkImportClients,
  addActivityToClient,
  removeActivityFromClient,
  updateActivityAssignment,
  getClientActivities,
}; 