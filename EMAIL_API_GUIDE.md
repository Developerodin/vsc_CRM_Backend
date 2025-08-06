# Email API Guide

This document describes the global email API endpoints for sending custom emails, task assignments, notifications, and bulk emails.

## Endpoints

### 1. Send Custom Email

**POST** `/v1/common-email/send`

Send a custom email with text and optional description.

#### Request Body
```json
{
  "to": "recipient@example.com",
  "subject": "Your Subject",
  "text": "Your email content here",
  "description": "Optional description above the main text"
}
```

#### Example Request (Postman)
```
POST {{baseUrl}}/v1/common-email/send
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "to": "john@example.com",
  "subject": "Important Update",
  "text": "Please review the attached documents and provide feedback by Friday.",
  "description": "This is an important update regarding the project timeline."
}
```

#### Example Response
```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "to": "john@example.com",
    "subject": "Important Update",
    "sentAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 2. Send Task Assignment Email

**POST** `/v1/common-email/task-assignment`

Send a formatted task assignment email.

#### Request Body
```json
{
  "to": "recipient@example.com",
  "taskTitle": "Task Title",
  "taskDescription": "Detailed task description",
  "assignedBy": "Manager Name",
  "dueDate": "2024-01-20",
  "priority": "high"
}
```

#### Priority Options
- `low`
- `medium`
- `high`
- `urgent`

#### Example Request (Postman)
```
POST {{baseUrl}}/v1/common-email/task-assignment
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "to": "sarah@example.com",
  "taskTitle": "Review Client Proposal",
  "taskDescription": "Please review the client proposal document and provide feedback on the technical specifications.",
  "assignedBy": "John Manager",
  "dueDate": "2024-01-20",
  "priority": "high"
}
```

#### Example Response
```json
{
  "success": true,
  "message": "Task assignment email sent successfully",
  "data": {
    "to": "sarah@example.com",
    "taskTitle": "Review Client Proposal",
    "assignedBy": "John Manager",
    "sentAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 3. Send Notification Email

**POST** `/v1/common-email/notification`

Send a notification email with type and message.

#### Request Body
```json
{
  "to": "recipient@example.com",
  "notificationType": "System Update",
  "message": "Your notification message here",
  "details": "Additional details about the notification"
}
```

#### Example Request (Postman)
```
POST {{baseUrl}}/v1/common-email/notification
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "to": "admin@example.com",
  "notificationType": "System Maintenance",
  "message": "Scheduled maintenance will occur on Sunday from 2-4 AM.",
  "details": "The system will be temporarily unavailable during this time."
}
```

#### Example Response
```json
{
  "success": true,
  "message": "Notification email sent successfully",
  "data": {
    "to": "admin@example.com",
    "notificationType": "System Maintenance",
    "sentAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

### 4. Send Bulk Emails

**POST** `/v1/common-email/bulk`

Send the same email to multiple recipients.

#### Request Body
```json
{
  "emails": ["user1@example.com", "user2@example.com", "user3@example.com"],
  "subject": "Bulk Email Subject",
  "text": "Your email content here",
  "description": "Optional description above the main text"
}
```

#### Example Request (Postman)
```
POST {{baseUrl}}/v1/common-email/bulk
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "emails": [
    "team1@example.com",
    "team2@example.com",
    "team3@example.com"
  ],
  "subject": "Weekly Team Update",
  "text": "Here's your weekly team update with important information.",
  "description": "Weekly team communication"
}
```

#### Example Response
```json
{
  "success": true,
  "message": "Bulk emails sent successfully to 3 recipients",
  "data": {
    "recipientsCount": 3,
    "subject": "Weekly Team Update",
    "sentAt": "2024-01-15T10:30:00.000Z"
  }
}
```

---

## Authentication

All endpoints require authentication with the `sendEmails` permission:

```
Authorization: Bearer <your_token>
```

## Error Responses

### Invalid Email Format
```json
{
  "code": 400,
  "message": "Invalid email format"
}
```

### Missing Required Fields
```json
{
  "code": 400,
  "message": "To, subject, and text are required"
}
```

### Unauthorized
```json
{
  "code": 401,
  "message": "Please authenticate"
}
```

---

## Example Postman Environment Variables
```
{
  "baseUrl": "http://localhost:5000",
  "token": "your_jwt_token_here"
}
```

## Notes

- All emails are sent using the configured SMTP settings
- Email validation is performed on all recipient addresses
- Bulk emails are sent in parallel for better performance
- Maximum 100 recipients per bulk email request
- All endpoints return standardized success/error responses
