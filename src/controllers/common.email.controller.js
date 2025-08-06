import httpStatus from 'http-status';
import catchAsync from '../utils/catchAsync.js';
import { emailService } from '../services/index.js';
import ApiError from '../utils/ApiError.js';

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

  // Generate HTML content
  const htmlContent = emailService.generateCustomEmailHTML(text, description);

  await emailService.sendEmail(to, subject, text, htmlContent);

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

  // Generate HTML content
  const htmlContent = emailService.generateTaskAssignmentHTML({
    taskTitle,
    taskDescription,
    assignedBy,
    dueDate,
    priority
  });

  await emailService.sendEmail(to, subject, textContent, htmlContent);

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

  // Generate HTML content
  const htmlContent = emailService.generateNotificationHTML({
    notificationType,
    message,
    details
  });

  await emailService.sendEmail(to, subject, textContent, htmlContent);

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

  // Generate HTML content
  const htmlContent = emailService.generateCustomEmailHTML(text, description);

  // Send emails to all recipients
  const emailPromises = emails.map(email => emailService.sendEmail(email, subject, text, htmlContent));
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

export {
  sendCustomEmail,
  sendTaskAssignmentEmail,
  sendNotificationEmail,
  sendBulkEmails,
};
