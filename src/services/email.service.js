import nodemailer from 'nodemailer';
import config from '../config/config.js';
import logger from '../config/logger.js';

const transport = nodemailer.createTransport({
  ...config.email.smtp,
  pool: true, // Use connection pooling
  maxConnections: 5, // Limit concurrent connections
  maxMessages: 100, // Limit messages per connection
  rateDelta: 1000, // Rate limiting
  rateLimit: 5 // Max 5 emails per second
});
/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info('Connected to email server'))
    .catch(() => logger.warn('Unable to connect to email server. Make sure you have configured the SMTP options in .env'));
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} html - Optional HTML content
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text, html = null) => {
  const msg = { from: config.email.from, to, subject, text };
  if (html) {
    msg.html = html;
  }
  
  // Add timeout to prevent hanging
  return Promise.race([
    transport.sendMail(msg),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email timeout')), 10000) // 10 second timeout
    )
  ]);
};

/**
 * Send an email with attachments
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} html - Optional HTML content
 * @param {Array} attachments - Optional array of attachment objects
 * @returns {Promise}
 */
const sendEmailWithAttachments = async (to, subject, text, html = null, attachments = []) => {
  const msg = { from: config.email.from, to, subject, text };
  if (html) {
    msg.html = html;
  }
  if (attachments && attachments.length > 0) {
    msg.attachments = attachments;
  }
  await transport.sendMail(msg);
};

/**
 * Download file from URL and convert to buffer
 * @param {string} url - File URL
 * @returns {Promise<Buffer>}
 */
const downloadFileFromUrl = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    throw new Error(`Error downloading file from URL: ${error.message}`);
  }
};

/**
 * Download file from S3 using file key (DEPRECATED - Use URL instead)
 * @param {string} fileKey - S3 file key
 * @returns {Promise<Buffer>}
 */
const downloadFileFromS3 = async (fileKey) => {
  // This function is deprecated since you're getting full S3 URLs
  // Convert S3 key to full URL and use URL download instead
  const s3Url = `https://${config.aws.s3.bucket}.s3.${config.aws.region}.amazonaws.com/${fileKey}`;
  return await downloadFileFromUrl(s3Url);
};

/**
 * Process attachments from frontend (URLs, S3 keys, or direct content)
 * @param {Array} attachments - Array of attachment objects
 * @returns {Promise<Array>} - Processed attachments for Nodemailer
 */
const processAttachments = async (attachments) => {
  if (!attachments || !Array.isArray(attachments)) {
    return [];
  }

  const processedAttachments = [];

  for (const attachment of attachments) {
    try {
      let content;
      let filename = attachment.filename;
      let contentType = attachment.contentType;

      // Handle different attachment types
      if (attachment.url) {
        // Download from URL
        content = await downloadFileFromUrl(attachment.url);
        if (!filename) {
          filename = attachment.url.split('/').pop() || 'downloaded-file';
        }
        if (!contentType) {
          contentType = 'application/octet-stream';
        }
      } else if (attachment.s3Key) {
        // Download from S3
        content = await downloadFileFromS3(attachment.s3Key);
        if (!filename) {
          filename = attachment.s3Key.split('/').pop() || 's3-file';
        }
        if (!contentType) {
          contentType = 'application/octet-stream';
        }
      } else if (attachment.content) {
        // Direct base64 content
        content = Buffer.from(attachment.content, 'base64');
        if (!filename) {
          filename = 'attachment';
        }
        if (!contentType) {
          contentType = 'application/octet-stream';
        }
      } else {

        continue;
      }

      processedAttachments.push({
        filename,
        content,
        contentType,
        cid: attachment.cid // For inline images
      });

    } catch (error) {

      // Continue with other attachments instead of failing completely
    }
  }

  return processedAttachments;
};

/**
 * Send email with attachments from URLs, S3 keys, or direct content
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @param {string} html - Optional HTML content
 * @param {Array} attachments - Array of attachment objects with url, s3Key, or content
 * @returns {Promise}
 */
const sendEmailWithFileAttachments = async (to, subject, text, html = null, attachments = []) => {
  const msg = { from: config.email.from, to, subject, text };
  if (html) {
    msg.html = html;
  }

  // Process attachments (download from URLs/S3 if needed)
  if (attachments && attachments.length > 0) {
    const processedAttachments = await processAttachments(attachments);
    if (processedAttachments.length > 0) {
      msg.attachments = processedAttachments;
    }
  }

  await transport.sendMail(msg);
};

/**
 * Generate HTML template for custom email
 * @param {string} text
 * @param {string} description
 * @returns {string} HTML content
 */
const generateCustomEmailHTML = (text, description) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Notification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .description { background: #e3f2fd; padding: 15px; border-left: 4px solid #2196f3; margin-bottom: 20px; border-radius: 5px; }
        .text { background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📧 Email Notification</h1>
        </div>
        <div class="content">
          ${description ? `<div class="description"><strong>📋 Description:</strong><br>${description}</div>` : ''}
          <div class="text">
            ${text.replace(/\n/g, '<br>')}
          </div>
        </div>
        <div class="footer">
          <p>This email was sent from your application</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate HTML template for task assignment email
 * @param {Object} taskData
 * @returns {string} HTML content
 */
const generateTaskAssignmentHTML = (taskData) => {
  const { taskTitle, taskDescription, assignedBy, dueDate, priority, taskId } = taskData;
  
  const priorityColors = {
    low: '#4caf50',
    medium: '#ff9800',
    high: '#f44336',
    urgent: '#9c27b0'
  };
  
  const priorityColor = priorityColors[priority] || '#666';
  
  // Team member login portal
  const teamMemberLoginUrl = 'http://crm.vsc.co.in/team-member-login/';
  const adminCrmUrl = 'https://main.dnmvta02jt3n3.amplifyapp.com';
  const viewDetailsUrl = taskId ? `${adminCrmUrl}/tasks/${taskId}` : adminCrmUrl;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Task Assignment</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .task-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 20px; }
        .task-title { font-size: 24px; font-weight: bold; color: #2c3e50; margin-bottom: 15px; }
        .task-description { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .task-details { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
        .detail-item { background: #e3f2fd; padding: 10px; border-radius: 5px; }
        .priority-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; color: white; font-weight: bold; background: ${priorityColor}; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .cta-button { display: inline-block; background: #4caf50; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; margin-top: 15px; font-weight: bold; transition: background-color 0.3s ease; }
        .cta-button:hover { background: #45a049; }
        .crm-link { color: #667eea; text-decoration: none; font-weight: bold; }
        .crm-link:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Task Assignment</h1>
          <p>You have been assigned a new task</p>
        </div>
        <div class="content">
          <div class="task-card">
            <div class="task-title">${taskTitle}</div>
            <div class="task-description">
              <strong>📝 Description:</strong><br>
              ${taskDescription}
            </div>
            <div class="task-details">
              <div class="detail-item">
                <strong>👤 Assigned By:</strong><br>
                ${assignedBy}
              </div>
              ${dueDate ? `
              <div class="detail-item">
                <strong>📅 Due Date:</strong><br>
                ${dueDate}
              </div>
              ` : ''}
            </div>
            ${priority ? `
            <div style="text-align: center; margin: 15px 0;">
              <span class="priority-badge">Priority: ${priority.toUpperCase()}</span>
            </div>
            ` : ''}
            <div style="text-align: center; margin-top: 20px;">
              <a href="${teamMemberLoginUrl}" class="cta-button" target="_blank">🚀 Login to Team Portal</a>
            </div>
            <div style="text-align: center; margin-top: 15px; font-size: 14px; color: #666;">
              <a href="${adminCrmUrl}" class="crm-link" target="_blank">📊 Admin Dashboard (if needed)</a>
            </div>
          </div>
        </div>
        <div class="footer">
          <p>Please review and complete this task as soon as possible</p>
          <p style="margin-top: 10px;">
            <a href="${teamMemberLoginUrl}" class="crm-link" target="_blank">🔗 Access Team Member Portal</a>
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate HTML template for daily task reminder email
 * @param {Object} reminderData
 * @returns {string} HTML content
 */
const generateDailyReminderHTML = (reminderData) => {
  const { teamMemberName, tasks, totalTasks, currentDate } = reminderData;
  
  // Team member login portal
  const teamMemberLoginUrl = 'http://crm.vsc.co.in/team-member-login/';
  
  // Generate task list HTML
  const taskListHTML = tasks.map((task, index) => {
    const dueDate = task.endDate ? new Date(task.endDate).toLocaleDateString() : 'Not specified';
    const priority = task.priority ? task.priority.toUpperCase() : 'MEDIUM';
    const remarks = task.remarks || 'No description provided';
    
    const priorityColors = {
      LOW: '#4caf50',
      MEDIUM: '#ff9800',
      HIGH: '#f44336',
      URGENT: '#9c27b0',
      CRITICAL: '#d32f2f'
    };
    
    const priorityColor = priorityColors[priority] || '#666';
    
    return `
      <div class="task-item">
        <div class="task-number">${index + 1}</div>
        <div class="task-content">
          <div class="task-title">${remarks}</div>
          <div class="task-meta">
            <span class="priority-badge" style="background: ${priorityColor};">Priority: ${priority}</span>
            <span class="due-date">📅 Due: ${dueDate}</span>
            ${task.branch?.name ? `<span class="branch">🏢 ${task.branch.name}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Daily Task Reminder</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 650px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .greeting { font-size: 18px; margin-bottom: 20px; color: #2c3e50; }
        .summary-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 25px; text-align: center; }
        .task-count { font-size: 36px; font-weight: bold; color: #667eea; margin-bottom: 10px; }
        .task-count-text { font-size: 16px; color: #666; }
        .tasks-list { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); margin-bottom: 25px; }
        .tasks-title { font-size: 20px; font-weight: bold; color: #2c3e50; margin-bottom: 20px; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
        .task-item { display: flex; align-items: flex-start; padding: 15px; margin-bottom: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea; }
        .task-number { background: #667eea; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 15px; flex-shrink: 0; }
        .task-content { flex: 1; }
        .task-title { font-weight: bold; color: #2c3e50; margin-bottom: 8px; font-size: 16px; }
        .task-meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
        .priority-badge { padding: 4px 12px; border-radius: 15px; color: white; font-size: 12px; font-weight: bold; }
        .due-date, .branch { background: #e3f2fd; padding: 4px 8px; border-radius: 12px; font-size: 12px; color: #1976d2; }
        .cta-section { text-align: center; margin: 25px 0; }
        .cta-button { display: inline-block; background: #4caf50; color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px; transition: background-color 0.3s ease; }
        .cta-button:hover { background: #45a049; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        .footer-link { color: #667eea; text-decoration: none; font-weight: bold; }
        .footer-link:hover { text-decoration: underline; }
        .motivational-text { background: linear-gradient(135deg, #e8f5e8 0%, #f0f8ff 100%); padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-style: italic; color: #2c3e50; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Daily Task Reminder</h1>
          <p>${currentDate}</p>
        </div>
        <div class="content">
          <div class="greeting">
            Hello ${teamMemberName}! 👋
          </div>
          
          <div class="summary-card">
            <div class="task-count">${totalTasks}</div>
            <div class="task-count-text">Pending Task${totalTasks > 1 ? 's' : ''} Awaiting Your Attention</div>
          </div>
          
          <div class="motivational-text">
            🌟 Great things are accomplished by those who take action. Let's make today productive!
          </div>
          
          <div class="tasks-list">
            <div class="tasks-title">📝 Your Pending Tasks</div>
            ${taskListHTML}
          </div>
          
          <div class="cta-section">
            <a href="${teamMemberLoginUrl}" class="cta-button" target="_blank">🚀 Login to Team Portal</a>
          </div>
          
          <div style="text-align: center; margin-top: 15px; font-size: 14px; color: #666;">
            Access your personalized dashboard to view, update, and complete your tasks
          </div>
        </div>
        
        <div class="footer">
          <p>💪 You've got this! Complete your tasks and make today count.</p>
          <p style="margin-top: 15px;">
            <a href="${teamMemberLoginUrl}" class="footer-link" target="_blank">🔗 Team Member Portal</a>
          </p>
          <p style="margin-top: 10px; font-size: 12px; color: #999;">
            This is an automated reminder sent daily at 10:00 AM IST
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate HTML template for notification email
 * @param {Object} notificationData
 * @returns {string} HTML content
 */
const generateNotificationHTML = (notificationData) => {
  const { notificationType, message, details } = notificationData;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Notification</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .notification-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .notification-type { font-size: 20px; font-weight: bold; color: #2c3e50; margin-bottom: 15px; }
        .notification-message { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #4caf50; }
        .notification-details { background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔔 Notification</h1>
          <p>You have received a new notification</p>
        </div>
        <div class="content">
          <div class="notification-card">
            <div class="notification-type">📢 ${notificationType}</div>
            <div class="notification-message">
              <strong>Message:</strong><br>
              ${message}
            </div>
            ${details ? `
            <div class="notification-details">
              <strong>📋 Details:</strong><br>
              ${details}
            </div>
            ` : ''}
          </div>
        </div>
        <div class="footer">
          <p>Thank you for using our application</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Send reset password email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendResetPasswordEmail = async (to, token) => {
  const subject = 'Reset password';
  // replace this url with the link to the reset password page of your front-end app
  const resetPasswordUrl = `http://link-to-app/reset-password?token=${token}`;
  const text = `Dear user,
To reset your password, click on this link: ${resetPasswordUrl}
If you did not request any password resets, then ignore this email.`;
  await sendEmail(to, subject, text);
};

/**
 * Send verification email
 * @param {string} to
 * @param {string} token
 * @returns {Promise}
 */
const sendVerificationEmail = async (to, token) => {
  const subject = 'Email Verification';
  // replace this url with the link to the email verification page of your front-end app
  const verificationEmailUrl = `http://link-to-app/verify-email?token=${token}`;
  const text = `Dear user,
To verify your email, click on this link: ${verificationEmailUrl}
If you did not create an account, then ignore this email.`;
  await sendEmail(to, subject, text);
};

/**
 * Send email OTP
 * @param {string} to
 * @param {string} otp
 * @returns {Promise}
 */
const sendEmailOtp = async (to, otp) => {
  const subject = 'Your Verification OTP';
  const text = `Your OTP for email verification is: ${otp}\nThis OTP is valid for 10 minutes.`;
  await sendEmail(to, subject, text);
};

const sendPasswordResetOtp = async (to, otp) => {
  const subject = 'Your Password Reset OTP';
  const text = `Your OTP for password reset is: ${otp}\nThis OTP is valid for 10 minutes.`;
  await sendEmail(to, subject, text);
};

export {
  transport,
  sendEmail,
  sendEmailWithAttachments,
  sendEmailWithFileAttachments,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendEmailOtp,
  sendPasswordResetOtp,
  generateCustomEmailHTML,
  generateTaskAssignmentHTML,
  generateDailyReminderHTML,
  generateNotificationHTML,
};

