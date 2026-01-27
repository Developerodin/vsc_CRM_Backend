import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import * as emailTemplateService from '../services/emailTemplate.service.js';
import * as bulkEmailService from '../services/bulkEmail.service.js';
import ApiError from '../utils/ApiError.js';

const createTemplate = catchAsync(async (req, res) => {
  const template = await emailTemplateService.createTemplate(req.body, req.user);
  res.status(httpStatus.CREATED).send({ success: true, data: template });
});

const queryTemplates = catchAsync(async (req, res) => {
  const filter = req.query.branch ? { branch: req.query.branch } : {};
  const options = { sortBy: req.query.sortBy || 'createdAt:desc', limit: req.query.limit, page: req.query.page };
  const result = await emailTemplateService.queryTemplates(filter, options, req.user);
  res.status(httpStatus.OK).send({ success: true, ...result });
});

const getTemplate = catchAsync(async (req, res) => {
  const template = await emailTemplateService.getTemplateById(req.params.templateId, req.user);
  res.status(httpStatus.OK).send({ success: true, data: template });
});

const updateTemplate = catchAsync(async (req, res) => {
  const template = await emailTemplateService.updateTemplate(req.params.templateId, req.body, req.user);
  res.status(httpStatus.OK).send({ success: true, data: template });
});

const deleteTemplate = catchAsync(async (req, res) => {
  await emailTemplateService.deleteTemplate(req.params.templateId, req.user);
  res.status(httpStatus.NO_CONTENT).send();
});

const sendBulkToClients = catchAsync(async (req, res) => {
  const { templateId, clientIds, branchId } = req.body;
  if (!templateId) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'templateId is required');
  }
  const options = {};
  if (clientIds && Array.isArray(clientIds) && clientIds.length > 0) {
    options.clientIds = clientIds;
  } else if (branchId) {
    options.branchId = branchId;
  }
  const result = await bulkEmailService.sendBulkWithTemplate(templateId, options, req.user);
  res.status(httpStatus.OK).send({
    success: true,
    message: `Bulk send completed: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped (no email)`,
    data: result,
  });
});

export {
  createTemplate,
  queryTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  sendBulkToClients,
};
