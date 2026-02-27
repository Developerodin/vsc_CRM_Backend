import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { clientService } from '../services/index.js';
import * as clientReportService from '../services/clientReport.service.js';
import pick from '../utils/pick.js';
import normalizeClientListFilter from '../utils/normalizeClientListFilter.js';
import ApiError from '../utils/ApiError.js';

const createClient = catchAsync(async (req, res) => {
  const client = await clientService.createClient(req.body, req.user);
  res.status(httpStatus.CREATED).send(client);
});

const getClients = catchAsync(async (req, res) => {
  const rawFilter = pick(req.query, [
    'name',
    'email',
    'phone',
    'district',
    'state',
    'country',
    'fNo',
    'pan',
    'businessType',
    'gstNumbers',
    'tanNumber',
    'cinNumber',
    'udyamNumber',
    'iecCode',
    'entityType',
    'branch',
    'category',
    'status',
    'activity',
    'subactivity',
    'gstNumber',
    'search',
  ]);
  const filter = normalizeClientListFilter(rawFilter);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);

  const result = await clientService.queryClients(filter, options, req.user);
  res.send(result);
});

const getClient = catchAsync(async (req, res) => {
  const client = await clientService.getClientById(req.params.clientId);
  if (!client) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Client not found');
  }
  // Team members can only access clients in their branch
  if (req.user?.userType === 'teamMember' && req.user.branch) {
    const userBranchId = (req.user.branch && req.user.branch._id) || req.user.branch;
    const clientBranchId = (client.branch && client.branch._id) || client.branch;
    if (String(userBranchId) !== String(clientBranchId)) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this client');
    }
  }
  res.send(client);
});

const updateClient = catchAsync(async (req, res) => {
  const client = await clientService.updateClientById(req.params.clientId, req.body, req.user);
  res.send(client);
});

const updateClientStatus = catchAsync(async (req, res) => {
  const { status } = req.body;
  if (!status || !['active', 'inactive'].includes(status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Status must be either "active" or "inactive"');
  }
  
  const client = await clientService.updateClientStatus(req.params.clientId, status, req.user);
  res.send(client);
});

const deleteClient = catchAsync(async (req, res) => {
  await clientService.deleteClientById(req.params.clientId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

const bulkImportClients = catchAsync(async (req, res) => {
  const result = await clientService.bulkImportClients(req.body.clients);
  res.status(httpStatus.OK).send(result);
});

const bulkDeleteClients = catchAsync(async (req, res) => {
  const result = await clientService.bulkDeleteClients(req.body.clientIds);
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

// GST Number management methods
const addGstNumber = catchAsync(async (req, res) => {
  const result = await clientService.addGstNumber(req.params.clientId, req.body);
  res.status(httpStatus.CREATED).send(result);
});

const removeGstNumber = catchAsync(async (req, res) => {
  await clientService.removeGstNumber(req.params.clientId, req.params.gstId);
  res.status(httpStatus.NO_CONTENT).send();
});

const updateGstNumber = catchAsync(async (req, res) => {
  const result = await clientService.updateGstNumber(
    req.params.clientId, 
    req.params.gstId, 
    req.body
  );
  res.send(result);
});

const getGstNumbers = catchAsync(async (req, res) => {
  const result = await clientService.getGstNumbers(req.params.clientId);
  res.send(result);
});

/** Year report: timelines, activity/subactivity, status, pendings, turnover for client. */
const getClientReport = catchAsync(async (req, res) => {
  const result = await clientReportService.getClientYearReport(
    req.params.clientId,
    req.query.year,
    req.user
  );
  res.status(httpStatus.OK).send(result);
});

export {
  createClient,
  getClients,
  getClient,
  updateClient,
  updateClientStatus,
  deleteClient,
  bulkImportClients,
  bulkDeleteClients,
  addActivityToClient,
  removeActivityFromClient,
  updateActivityAssignment,
  getClientActivities,
  getClientTaskStatistics,
  addGstNumber,
  removeGstNumber,
  updateGstNumber,
  getGstNumbers,
  getClientReport,
}; 