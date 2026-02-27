import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { emailService } from '../services/index.js';
import ApiError from '../utils/ApiError.js';
import { wrapWithDefaultLayout, getLogoAttachment } from '../utils/emailLayout.js';

const layoutAttachments = () => {
  const logo = getLogoAttachment();
  return logo ? [logo] : [];
};

/**
 * Send custom email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendCustomEmail = catchAsync(async (req, res) => {
  const { to, subject, text, description } = req.body;

  if (!to || !subject || !text) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'To, subject, and text are required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid email format');
  }

  const htmlContent = wrapWithDefaultLayout(
    emailService.generateCustomEmailHTML(text, description),
    { useCid: true }
  );
  const attachments = layoutAttachments();
  await emailService.sendEmailWithAttachments(to, subject, text, htmlContent, attachments);

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Email sent successfully',
    data: {
      to,
      subject,
      sentAt: new Date().toISOString()
    }
  });
});

/**
 * Send task assignment email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendTaskAssignmentEmail = catchAsync(async (req, res) => {
  const { to, taskTitle, taskDescription, assignedBy, dueDate, priority } = req.body;

  if (!to || !taskTitle || !taskDescription || !assignedBy) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'To, taskTitle, taskDescription, and assignedBy are required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid email format');
  }

  const subject = `Task Assignment: ${taskTitle}`;
  
  // Generate plain text content
  let textContent = `Hello,\n\nYou have been assigned a new task:\n\n`;
  textContent += `Task: ${taskTitle}\n`;
  textContent += `Description: ${taskDescription}\n`;
  textContent += `Assigned By: ${assignedBy}\n`;
  
  if (dueDate) {
    textContent += `Due Date: ${dueDate}\n`;
  }
  
  if (priority) {
    textContent += `Priority: ${priority}\n`;
  }
  
  textContent += `\nPlease review and complete this task as soon as possible.\n\nBest regards,\nYour Team`;

  const htmlContent = wrapWithDefaultLayout(
    emailService.generateTaskAssignmentHTML({
      taskTitle,
      taskDescription,
      assignedBy,
      dueDate,
      priority
    }),
    { useCid: true }
  );
  const attachments = layoutAttachments();
  await emailService.sendEmailWithAttachments(to, subject, textContent, htmlContent, attachments);

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Task assignment email sent successfully',
    data: {
      to,
      taskTitle,
      assignedBy,
      sentAt: new Date().toISOString()
    }
  });
});

/**
 * Send notification email
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendNotificationEmail = catchAsync(async (req, res) => {
  const { to, notificationType, message, details } = req.body;

  if (!to || !notificationType || !message) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'To, notificationType, and message are required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid email format');
  }

  const subject = `Notification: ${notificationType}`;
  
  // Generate plain text content
  let textContent = `Hello,\n\nYou have received a notification:\n\n`;
  textContent += `Type: ${notificationType}\n`;
  textContent += `Message: ${message}\n`;
  
  if (details) {
    textContent += `Details: ${details}\n`;
  }
  
  textContent += `\nThank you,\nYour Team`;

  const htmlContent = wrapWithDefaultLayout(
    emailService.generateNotificationHTML({
      notificationType,
      message,
      details
    }),
    { useCid: true }
  );
  const attachments = layoutAttachments();
  await emailService.sendEmailWithAttachments(to, subject, textContent, htmlContent, attachments);

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Notification email sent successfully',
    data: {
      to,
      notificationType,
      sentAt: new Date().toISOString()
    }
  });
});

/**
 * Send bulk emails
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendBulkEmails = catchAsync(async (req, res) => {
  const { emails, subject, text, description } = req.body;

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Emails array is required and must not be empty');
  }

  if (!subject || !text) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Subject and text are required');
  }

  // Validate email formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const invalidEmails = emails.filter(email => !emailRegex.test(email));
  
  if (invalidEmails.length > 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Invalid email formats: ${invalidEmails.join(', ')}`);
  }

  const htmlContent = wrapWithDefaultLayout(
    emailService.generateCustomEmailHTML(text, description),
    { useCid: true }
  );
  const attachments = layoutAttachments();
  const emailPromises = emails.map(email =>
    emailService.sendEmailWithAttachments(email, subject, text, htmlContent, attachments)
  );
  await Promise.all(emailPromises);

  res.status(httpStatus.OK).send({
    success: true,
    message: `Bulk emails sent successfully to ${emails.length} recipients`,
    data: {
      recipientsCount: emails.length,
      subject,
      sentAt: new Date().toISOString()
    }
  });
});

/**
 * Send email with attachments
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const sendEmailWithAttachments = catchAsync(async (req, res) => {
  const { to, subject, text, description, attachments } = req.body;

  if (!to || !subject || !text) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'To, subject, and text are required');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid email format');
  }

  // Validate attachments if provided
  if (attachments && Array.isArray(attachments)) {
    for (const attachment of attachments) {
      // Check if attachment has either URL or content (not both required)
      if (!attachment.url && !attachment.content) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Each attachment must have either url or content');
      }
      
      // If using content, filename is required
      if (attachment.content && !attachment.filename) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Filename is required when using content');
      }
    }
  }

  const htmlContent = wrapWithDefaultLayout(
    emailService.generateCustomEmailHTML(text, description),
    { useCid: true }
  );
  const allAttachments = [...layoutAttachments(), ...(attachments || [])];
  await emailService.sendEmailWithFileAttachments(to, subject, text, htmlContent, allAttachments);

  res.status(httpStatus.OK).send({
    success: true,
    message: 'Email with attachments sent successfully',
    data: {
      to,
      subject,
      attachmentsCount: attachments ? attachments.length : 0,
      sentAt: new Date().toISOString()
    }
  });
});

export {
  sendCustomEmail,
  sendTaskAssignmentEmail,
  sendNotificationEmail,
  sendBulkEmails,
  sendEmailWithAttachments,
};
