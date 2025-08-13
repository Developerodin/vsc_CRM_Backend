import Joi from 'joi';

const sendCustomEmail = {
  body: Joi.object().keys({
    to: Joi.string().email().required(),
    subject: Joi.string().required().trim().min(1).max(255),
    text: Joi.string().required().trim().min(1),
    description: Joi.string().trim().optional(),
  }),
};

const sendTaskAssignmentEmail = {
  body: Joi.object().keys({
    to: Joi.string().email().required(),
    taskTitle: Joi.string().required().trim().min(1).max(255),
    taskDescription: Joi.string().required().trim().min(1),
    assignedBy: Joi.string().required().trim().min(1),
    dueDate: Joi.date().optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  }),
};

const sendNotificationEmail = {
  body: Joi.object().keys({
    to: Joi.string().email().required(),
    notificationType: Joi.string().required().trim().min(1).max(100),
    message: Joi.string().required().trim().min(1),
    details: Joi.string().trim().optional(),
  }),
};

const sendBulkEmails = {
  body: Joi.object().keys({
    emails: Joi.array().items(Joi.string().email()).min(1).max(100).required(),
    subject: Joi.string().required().trim().min(1).max(255),
    text: Joi.string().required().trim().min(1),
    description: Joi.string().trim().optional(),
  }),
};

const sendEmailWithAttachments = {
  body: Joi.object().keys({
    to: Joi.string().email().required(),
    subject: Joi.string().required().trim().min(1).max(255),
    text: Joi.string().required().trim().min(1),
    description: Joi.string().trim().optional(),
    attachments: Joi.array().items(
      Joi.object({
        filename: Joi.string().optional(), // Optional - will be extracted from URL if not provided
        url: Joi.string().uri().optional(), // File URL to download (including S3 URLs)
        content: Joi.string().optional(), // Base64 encoded content (alternative to URL)
        contentType: Joi.string().optional(), // MIME type
        cid: Joi.string().optional() // For inline images
      }).or('url', 'content') // Must have at least one of these
    ).optional()
  }),
};

export {
  sendCustomEmail,
  sendTaskAssignmentEmail,
  sendNotificationEmail,
  sendBulkEmails,
  sendEmailWithAttachments,
};
