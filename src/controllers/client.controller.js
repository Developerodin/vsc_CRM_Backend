import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { clientService } from '../services/index.js';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';

const createClient = catchAsync(async (req, res) => {
  const client = await clientService.createClient(req.body, req.user);
  res.status(httpStatus.CREATED).send(client);
});

const getClients = catchAsync(async (req, res) => {
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
    'branch',
    'search'
  ]);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  
  // Add branch filtering based on user's access
  const result = await clientService.queryClients(filter, options, req.user);
  res.send(result);
});

const getClient = catchAsync(async (req, res) => {
  const client = await clientService.getClientById(req.params.clientId);
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }
  res.send(client);
});

const updateClient = catchAsync(async (req, res) => {
  const client = await clientService.updateClientById(req.params.clientId, req.body, req.user);
  res.send(client);
});

const deleteClient = catchAsync(async (req, res) => {
  await clientService.deleteClientById(req.params.clientId);
  res.status(httpStatus.NO_CONTENT).send();
});

const bulkImportClients = catchAsync(async (req, res) => {
  const result = await clientService.bulkImportClients(req.body.clients);
  res.status(httpStatus.OK).send(result);
});

// Activity management methods
const addActivityToClient = catchAsync(async (req, res) => {
  const result = await clientService.addActivityToClient(req.params.clientId, req.body);
  res.status(httpStatus.CREATED).send(result);
});

const removeActivityFromClient = catchAsync(async (req, res) => {
  await clientService.removeActivityFromClient(req.params.clientId, req.params.activityId);
  res.status(httpStatus.NO_CONTENT).send();
});

const updateActivityAssignment = catchAsync(async (req, res) => {
  const result = await clientService.updateActivityAssignment(
    req.params.clientId, 
    req.params.activityId, 
    req.body
  );
  res.send(result);
});

const getClientActivities = catchAsync(async (req, res) => {
  const result = await clientService.getClientActivities(req.params.clientId, req.query);
  res.send(result);
});

const getClientTaskStatistics = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'email', 'search', 'branch']);
  const options = pick(req.query, ['limit', 'page']);
  
  const result = await clientService.getClientTaskStatistics(filter, options, req.user);
  res.send(result);
});

export {
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
  getClientTaskStatistics,
}; 