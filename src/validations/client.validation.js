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
    gstNumbers: Joi.array().items(
      Joi.object({
        state: Joi.string().required(),
        gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).required()
      })
    ),
    tanNumber: Joi.string().pattern(/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/),
    cinNumber: Joi.string().pattern(/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/),
    udyamNumber: Joi.string().pattern(/^UDYAM-[A-Z]{2}[0-9]{2}[0-9]{7}$/),
    iecCode: Joi.string().pattern(/^[0-9]{10}$/),
    entityType: Joi.string(),
    metadata: Joi.object(),
    branch: Joi.string().custom(objectId).required(),
    sortOrder: Joi.number(),
  }),
};

const getClients = {
  query: Joi.object().keys({
    name: Joi.string().allow('', null),
    email: Joi.string().allow('', null),
    phone: Joi.string().allow('', null),
    district: Joi.string().allow('', null),
    state: Joi.string().allow('', null),
    country: Joi.string().allow('', null),
    fNo: Joi.string().allow('', null),
    pan: Joi.string().allow('', null),
    businessType: Joi.string().allow('', null),
    gstNumbers: Joi.array().items(
      Joi.object({
        state: Joi.string(),
        gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
      })
    ).allow('', null),
    tanNumber: Joi.string().allow('', null),
    cinNumber: Joi.string().allow('', null),
    udyamNumber: Joi.string().allow('', null),
    iecCode: Joi.string().allow('', null),
    entityType: Joi.string().allow('', null),
    branch: Joi.string().custom(objectId),
    search: Joi.string().allow('', null),
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
      gstNumbers: Joi.array().items(
        Joi.object({
          state: Joi.string().required(),
          gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).required()
        })
      ),
      tanNumber: Joi.string().pattern(/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/),
      cinNumber: Joi.string().pattern(/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/),
      udyamNumber: Joi.string().pattern(/^UDYAM-[A-Z]{2}[0-9]{2}[0-9]{7}$/),
      iecCode: Joi.string().pattern(/^[0-9]{10}$/),
      entityType: Joi.string(),
      metadata: Joi.object(),
      branch: Joi.string().custom(objectId),
      sortOrder: Joi.number(),
    })
    .min(1),
};

const updateClientStatus = {
  params: Joi.object().keys({
    clientId: Joi.required().custom(objectId),
  }),
  body: Joi.object().keys({
    status: Joi.string().valid('active', 'inactive').required(),
  }),
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
          gstNumbers: Joi.array().items(
            Joi.object({
              state: Joi.string().required(),
              gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).required()
            })
          ),
          tanNumber: Joi.string().pattern(/^[A-Z]{4}[0-9]{5}[A-Z]{1}$/),
          cinNumber: Joi.string().pattern(/^[A-Z]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/),
          udyamNumber: Joi.string().pattern(/^UDYAM-[A-Z]{2}[0-9]{2}[0-9]{7}$/),
          iecCode: Joi.string().pattern(/^[0-9]{10}$/),
          entityType: Joi.string(),
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
    notes: Joi.string().optional(),
    status: Joi.string().valid('active', 'inactive').default('active'),
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
    notes: Joi.string().optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
  }).min(1),
};

const getClientActivities = {
  params: Joi.object().keys({
    clientId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    status: Joi.string().valid('active', 'inactive'),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getClientTaskStatistics = {
  query: Joi.object().keys({
    name: Joi.string().trim().allow(''),
    email: Joi.string().trim().allow(''),
    search: Joi.string().trim().allow(''), // Add search parameter
    branch: Joi.string().custom(objectId),
    limit: Joi.number().integer().min(1).max(10000),
    page: Joi.number().integer().min(1),
  }),
};

// GST Number management validations
const addGstNumber = {
  params: Joi.object().keys({
    clientId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    state: Joi.string().required(),
    gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).required(),
  }),
};

const removeGstNumber = {
  params: Joi.object().keys({
    clientId: Joi.string().custom(objectId).required(),
    gstId: Joi.string().required(),
  }),
};

const updateGstNumber = {
  params: Joi.object().keys({
    clientId: Joi.string().custom(objectId).required(),
    gstId: Joi.string().required(),
  }),
  body: Joi.object().keys({
    state: Joi.string(),
    gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
  }).min(1),
};

const getGstNumbers = {
  params: Joi.object().keys({
    clientId: Joi.string().custom(objectId).required(),
  }),
};

export default {
  createClient,
  getClients,
  getClient,
  updateClient,
  updateClientStatus,
  deleteClient,
  bulkImportClients,
  addActivityToClient,
  removeActivityFromClient,
  updateActivityAssignment,
  getClientActivities,
  getClientTaskStatistics,
  addGstNumber,
  removeGstNumber,
  updateGstNumber,
  getGstNumbers,
}; 