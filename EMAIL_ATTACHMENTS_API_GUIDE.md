# Email Attachments API Guide

This guide explains how to use the new email attachments API endpoint that allows you to send emails with file attachments from URLs, S3 keys, or direct base64 content.

## 🚀 API Endpoint

```
POST /api/v1/common/email/send-with-attachments
```

## 📋 Request Headers

```http
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN (if required)
```

## 🔧 Request Body Structure

### Basic Structure
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "text": "Email body text",
  "description": "Optional description for HTML content",
  "attachments": [
    // Attachment objects here
  ]
}
```

## 📎 Attachment Types

### 1. **File URL Attachments (Recommended)**
Send files by providing their URLs. The backend will download them automatically. This includes S3 URLs, external URLs, or any publicly accessible file URL.

```json
{
  "to": "user@example.com",
  "subject": "Report with attachments",
  "text": "Please find the attached report and data files.",
  "description": "Monthly report with supporting documents",
  "attachments": [
    {
      "url": "https://vsc-files-storage.s3.ap-south-1.amazonaws.com/1754568779992-396b44f8-0bde-47d0-9818-0311ccbfde9d.xlsx",
      "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    },
    {
      "url": "https://example.com/files/report.pdf",
      "filename": "custom-name.pdf",
      "contentType": "application/pdf"
    },
    {
      "url": "https://example.com/images/chart.png",
      "contentType": "image/png"
    }
  ]
}
```

**Fields:**
- `url` (required): Direct URL to the file (including S3 URLs)
- `filename` (optional): Custom filename. If not provided, extracted from URL
- `contentType` (optional): MIME type. If not provided, defaults to `application/octet-stream`

**S3 URL Format:**
```
https://{bucket-name}.s3.{region}.amazonaws.com/{file-key}
```

**Example S3 URL:**
```
https://vsc-files-storage.s3.ap-south-1.amazonaws.com/1754568779992-396b44f8-0bde-47d0-9818-0311ccbfde9d.xlsx
```

### 3. **Base64 Content Attachments**
Send files as base64 encoded strings (direct content).

```json
{
  "to": "team@company.com",
  "subject": "Meeting notes",
  "text": "Please review the attached meeting notes.",
  "attachments": [
    {
      "filename": "meeting-notes.txt",
      "content": "VGhpcyBpcyBhIHRlc3QgZmlsZSBjb250ZW50Lg==",
      "contentType": "text/plain"
    }
  ]
}
```

**Fields:**
- `filename` (required): Name of the file
- `content` (required): Base64 encoded file content
- `contentType` (optional): MIME type. If not provided, defaults to `application/octet-stream`

### 2. **Mixed Attachment Types**
You can mix different attachment types in the same request.

```json
{
  "to": "manager@company.com",
  "subject": "Monthly report package",
  "text": "Please find attached the monthly report and supporting files.",
  "attachments": [
    {
      "url": "https://vsc-files-storage.s3.ap-south-1.amazonaws.com/reports/monthly.pdf",
      "contentType": "application/pdf"
    },
    {
      "url": "https://external-service.com/reports/supporting-data.xlsx",
      "contentType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    },
    {
      "filename": "summary.txt",
      "content": "U3VtbWFyeSBvZiBtb250aGx5IGFjdGl2aXRpZXM=",
      "contentType": "text/plain"
    }
  ]
}
```

## 🎯 Common MIME Types

| File Type | MIME Type |
|-----------|-----------|
| PDF | `application/pdf` |
| Excel (.xlsx) | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` |
| Excel (.xls) | `application/vnd.ms-excel` |
| Word (.docx) | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Word (.doc) | `application/msword` |
| Text | `text/plain` |
| HTML | `text/html` |
| PNG Image | `image/png` |
| JPEG Image | `image/jpeg` |
| GIF Image | `image/gif` |
| ZIP Archive | `application/zip` |

## 📱 Frontend Implementation Examples

### JavaScript/Node.js
```javascript
const sendEmailWithAttachments = async (emailData) => {
  try {
    const response = await fetch('/api/v1/common/email/send-with-attachments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(emailData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('Email sent successfully:', result);
      return result;
    } else {
      throw new Error(result.message || 'Failed to send email');
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Example usage
const emailData = {
  to: 'recipient@example.com',
  subject: 'Project documents',
  text: 'Here are the project documents.',
  attachments: [
    {
      url: 'https://example.com/document.pdf',
      contentType: 'application/pdf'
    }
  ]
};

await sendEmailWithAttachments(emailData);
```

### React/JavaScript
```javascript
import { useState } from 'react';

const EmailForm = () => {
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    text: '',
    attachments: []
  });

  const addAttachment = (type, value, filename = null, contentType = null) => {
    const attachment = {};
    
    if (type === 'url') {
      attachment.url = value;
    } else if (type === 'content') {
      attachment.content = value;
    }
    
    if (filename) attachment.filename = filename;
    if (contentType) attachment.contentType = contentType;
    
    setEmailData(prev => ({
      ...prev,
      attachments: [...prev.attachments, attachment]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/v1/common/email/send-with-attachments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert('Email sent successfully!');
        // Reset form or handle success
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      alert('Failed to send email');
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        placeholder="To"
        value={emailData.to}
        onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
        required
      />
      
      <input
        type="text"
        placeholder="Subject"
        value={emailData.subject}
        onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
        required
      />
      
      <textarea
        placeholder="Email text"
        value={emailData.text}
        onChange={(e) => setEmailData(prev => ({ ...prev, text: e.target.value }))}
        required
      />
      
      {/* Attachment controls */}
      <button type="button" onClick={() => addAttachment('url', prompt('Enter file URL:'))}>
        Add URL Attachment
      </button>
      
      <button type="button" onClick={() => addAttachment('url', prompt('Enter file URL:'))}>
        Add URL Attachment
      </button>
      
      <button type="submit">Send Email</button>
    </form>
  );
};
```

### Python
```python
import requests
import base64

def send_email_with_attachments(email_data):
    url = "http://your-api-domain/api/v1/common/email/send-with-attachments"
    
    try:
        response = requests.post(url, json=email_data)
        response.raise_for_status()
        
        result = response.json()
        print("Email sent successfully:", result)
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"Error sending email: {e}")
        raise

# Example usage
email_data = {
    "to": "recipient@example.com",
    "subject": "Test email with attachments",
    "text": "This is a test email with attachments.",
    "attachments": [
        {
            "url": "https://example.com/file.pdf",
            "contentType": "application/pdf"
        }
    ]
}

send_email_with_attachments(email_data)
```

## 🔍 Response Format

### Success Response (200)
```json
{
  "success": true,
  "message": "Email with attachments sent successfully",
  "data": {
    "to": "recipient@example.com",
    "subject": "Test email",
    "attachmentsCount": 2,
    "sentAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### Error Response (400/500)
```json
{
  "success": false,
  "message": "Error message here",
  "errors": [
    {
      "field": "attachments",
      "message": "Invalid attachment format"
    }
  ]
}
```

## ⚠️ Important Notes

### 1. **File Size Limits**
- Ensure your files are reasonably sized for email delivery
- Large files may cause timeout issues
- Consider compressing large files before sending

### 2. **URL Accessibility**
- URLs must be publicly accessible
- The backend must be able to reach the URLs
- Consider authentication if URLs require it

### 3. **S3 Configuration**
- S3 bucket must be publicly accessible
- Ensure S3 bucket CORS is configured properly
- S3 object permissions must allow public read access
- No AWS SDK installation required (using direct URL downloads)

### 4. **Error Handling**
- Individual attachment failures won't stop the email
- Failed attachments are logged but the email still sends
- Check logs for attachment processing errors

### 5. **Security Considerations**
- Validate file types and sizes on the frontend
- Be cautious with user-provided URLs
- Consider implementing file type restrictions

## 🧪 Testing

### Test with cURL
```bash
curl -X POST http://localhost:3000/api/v1/common/email/send-with-attachments \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test email",
    "text": "This is a test email",
    "attachments": [
      {
        "url": "https://httpbin.org/bytes/1000",
        "filename": "test-file.bin",
        "contentType": "application/octet-stream"
      }
    ]
  }'
```

### Test with Postman
1. Set method to `POST`
2. Set URL to `/api/v1/common/email/send-with-attachments`
3. Set Content-Type header to `application/json`
4. Add your request body in the Body tab
5. Send the request

## 🔧 Troubleshooting

### Common Issues

1. **"fetch is not defined"**
   - Ensure Node.js version 18+ or install `node-fetch`
   - For older versions: `npm install node-fetch`

2. **S3 URL download errors**
   - Verify S3 bucket is publicly accessible
   - Check if S3 bucket CORS is configured properly
   - Ensure S3 object permissions allow public read access

3. **URL download failures**
   - Verify URL is accessible from your backend
   - Check if URL requires authentication
   - Ensure proper error handling for network issues

4. **File type issues**
   - Verify MIME types are correct
   - Check if file extensions match content types
   - Test with different file formats

## 📚 Related Documentation

- [Email Service Implementation](../src/services/email.service.js)
- [Email Controller](../src/controllers/common.email.controller.js)
- [Email Validation](../src/validations/common.email.validation.js)
- [Email Routes](../src/routes/v1/common.email.route.js)

---

**Need Help?** Check the server logs for detailed error messages and ensure all required packages are installed.
