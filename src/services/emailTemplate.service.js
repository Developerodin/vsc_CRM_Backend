import httpStatus from 'http-status';
import { EmailTemplate } from '../models/index.js';
import ApiError from '../utils/ApiError.js';

/** Placeholders supported in templates (keys) → client field or fallback */
const PLACEHOLDER_MAP = {
  clientName: 'name',
  companyName: 'name',
  email: 'email',
  email2: 'email2',
  phone: 'phone',
  address: 'address',
  district: 'district',
  state: 'state',
  country: 'country',
};

/**
 * Replace {{placeholder}} in a string with client data
 * @param {string} str - subject or body
 * @param {Object} client - plain client object (name, email, phone, etc.)
 * @returns {string}
 */
const applyPlaceholders = (str, client) => {
  if (!str || typeof str !== 'string') return str;
  let out = str;
  for (const [placeholder, field] of Object.entries(PLACEHOLDER_MAP)) {
    const value = client[field] != null ? String(client[field]) : '';
    const re = new RegExp(`\\{\\{${placeholder}\\}\\}`, 'gi');
    out = out.replace(re, value);
  }
  return out;
};

/**
 * Create email template
 */
const createTemplate = async (body, user) => {
  const template = await EmailTemplate.create({
    ...body,
    createdBy: user._id,
  });
  return template;
};

/**
 * Query templates with pagination. No branch filtering – all templates allowed for all.
 */
const queryTemplates = async (filter, options, user) => {
  const mongoFilter = { ...filter };
  delete mongoFilter.branch;
  const result = await EmailTemplate.paginate(mongoFilter, options);
  return result;
};

/**
 * Get template by id. No branch restriction – all templates allowed for all.
 */
const getTemplateById = async (id, user) => {
  const template = await EmailTemplate.findById(id);
  if (!template) throw new ApiError(httpStatus.NOT_FOUND, 'Template not found');
  return template;
};

/**
 * Update template
 */
const updateTemplate = async (id, body, user) => {
  const template = await getTemplateById(id, user);
  Object.assign(template, body);
  await template.save();
  return template;
};

/**
 * Delete template
 */
const deleteTemplate = async (id, user) => {
  const template = await getTemplateById(id, user);
  await template.deleteOne();
  return template;
};

/** Strip HTML to plain text (for legacy bodyHtml-only templates) */
const htmlToPlainText = (html) => {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
};

/**
 * Render template for a single client. Emails are sent as plain text only.
 * Uses bodyText; if missing, strips bodyHtml to plain text (legacy).
 * @param {Object} template - { subject, bodyText, bodyHtml? }
 * @param {Object} client - client plain object
 * @returns {{ subject: string, text: string }}
 */
const renderForClient = (template, client) => {
  const subject = applyPlaceholders(template.subject, client);
  const rawBody = template.bodyText && template.bodyText.trim()
    ? template.bodyText
    : htmlToPlainText(template.bodyHtml || '');
  const text = applyPlaceholders(rawBody, client);
  return { subject, text };
};

/**
 * Render template as HTML for a single client (for use with default header/footer layout).
 * Uses bodyHtml with placeholders; if missing, uses bodyText with newlines → <br>.
 * @param {Object} template - { subject, bodyText, bodyHtml? }
 * @param {Object} client - client plain object
 * @returns {{ subject: string, html: string }}
 */
const renderForClientHtml = (template, client) => {
  const subject = applyPlaceholders(template.subject, client);
  const rawHtml = template.bodyHtml && template.bodyHtml.trim()
    ? template.bodyHtml
    : (template.bodyText || '').replace(/\n/g, '<br>\n');
  const html = applyPlaceholders(rawHtml, client);
  return { subject, html };
};

export {
  createTemplate,
  queryTemplates,
  getTemplateById,
  updateTemplate,
  deleteTemplate,
  renderForClient,
  renderForClientHtml,
  applyPlaceholders,
  PLACEHOLDER_MAP,
};
