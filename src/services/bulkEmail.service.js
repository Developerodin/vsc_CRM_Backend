import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { Client, EmailTemplate } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import config from '../config/config.js';
import { wrapWithDefaultLayout, getLogoAttachment } from '../utils/emailLayout.js';
import { getUserBranchIds, hasBranchAccess } from './role.service.js';
import * as emailTemplateService from './emailTemplate.service.js';
import * as emailService from './email.service.js';

/** Resolve fromEmail (e.g. info@vsc.co.in) to SMTP account key (e.g. 'info') from config. */
const getFromAccountForEmail = (fromEmail) => {
  if (!fromEmail || !config.email.smtpAccounts) return null;
  const entry = Object.entries(config.email.smtpAccounts).find(([, acc]) => acc.from === fromEmail);
  return entry ? entry[0] : null;
};

/**
 * Resolve clients for bulk email: either by clientIds or all (optionally filtered by branch)
 * Only returns clients that have at least one of email or email2.
 * Enforces branch access for user.
 */
const getEligibleClients = async (user, { clientIds, branchId }) => {
  const allowedBranchIds = getUserBranchIds(user.role);
  const filter = { status: 'active' };

  if (clientIds && clientIds.length > 0) {
    filter._id = { $in: clientIds.map((id) => new mongoose.Types.ObjectId(id)) };
    if (allowedBranchIds !== null && allowedBranchIds.length > 0) {
      filter.branch = { $in: allowedBranchIds };
    }
  } else {
    if (branchId) {
      if (!hasBranchAccess(user.role, branchId)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Access denied to this branch');
      }
      filter.branch = new mongoose.Types.ObjectId(branchId);
    } else if (allowedBranchIds !== null && allowedBranchIds.length > 0) {
      filter.branch = { $in: allowedBranchIds };
    }
  }

  const clients = await Client.find(filter)
    .select('name email email2 phone address district state country')
    .lean();
  const withEmail = clients.filter((c) => (c.email && c.email.trim()) || (c.email2 && c.email2.trim()));
  return withEmail;
};

/**
 * Pick primary email for client (email else email2)
 */
const primaryEmail = (client) => (client.email && client.email.trim() ? client.email.trim() : (client.email2 && client.email2.trim() ? client.email2.trim() : null));

/**
 * Send bulk emails using a template to selected or all clients
 * @param {string} templateId
 * @param {{ clientIds?: string[], branchId?: string, fromEmail?: string }} options - clientIds OR branchId; fromEmail = send from that SMTP (info@vsc.co.in, audit@vsc.co.in, etc.)
 * @param {Object} user
 * @returns {{ sent: number, failed: number, skipped: number, errors: Array<{ clientId: string, email: string, error: string }> }}
 */
const sendBulkWithTemplate = async (templateId, options, user) => {
  const template = await emailTemplateService.getTemplateById(templateId, user);
  const clients = await getEligibleClients(user, options);
  const fromAccount = getFromAccountForEmail(options.fromEmail);

  const result = { sent: 0, failed: 0, skipped: 0, errors: [] };

  for (const client of clients) {
    const to = primaryEmail(client);
    if (!to) {
      result.skipped += 1;
      continue;
    }
    try {
      const { subject, text } = emailTemplateService.renderForClient(template, client);
      const { html } = emailTemplateService.renderForClientHtml(template, client);
      const wrappedHtml = wrapWithDefaultLayout(html, { useCid: true });
      const logoAttach = getLogoAttachment();
      const attachments = logoAttach ? [logoAttach] : [];
      const sendOptions = fromAccount ? { fromAccount } : {};
      await emailService.sendEmailWithAttachments(to, subject, text, wrappedHtml, attachments, sendOptions);
      result.sent += 1;
    } catch (err) {
      result.failed += 1;
      result.errors.push({
        clientId: client._id.toString(),
        email: to,
        error: err.message || String(err),
      });
    }
  }

  return result;
};

export { getEligibleClients, sendBulkWithTemplate, primaryEmail };
