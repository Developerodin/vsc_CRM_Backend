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
          branch: Joi.string().custom(objectId).required(),
          sortOrder: Joi.number(),
        })
      )
      .min(1)
      .max(500)
      .required(),
  }),
};

export default {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
  bulkImportClients,
}; 