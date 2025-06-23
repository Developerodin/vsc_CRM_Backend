import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { clientService } from '../services/index.js';
import pick from '../utils/pick.js';
import ApiError from '../utils/ApiError.js';

const createClient = catchAsync(async (req, res) => {
  const client = await clientService.createClient(req.body);
  res.status(httpStatus.CREATED).send(client);
});

const getClients = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'email', 'phone', 'city', 'state', 'country', 'pinCode']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await clientService.queryClients(filter, options);
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
  const client = await clientService.updateClientById(req.params.clientId, req.body);
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

export {
  createClient,
  getClients,
  getClient,
  updateClient,
  deleteClient,
  bulkImportClients,
}; 