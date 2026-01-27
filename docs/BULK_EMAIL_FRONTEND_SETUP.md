# Bulk Email & Templates – Frontend Setup Guide

Use this doc to integrate bulk email and email templates in your frontend.

---

## Base URL & Auth

- **Base URL:** `{API_BASE}/v1`
- **Auth:** Send `Authorization: Bearer <accessToken>` on every request.
- **Permission:** User must have `sendEmails` (otherwise APIs return 403).

---

## 1. Template CRUD APIs

### 1.1 List templates

**GET** `/email-templates`

**Query params (all optional):**

| Param   | Type   | Description                          |
|--------|--------|--------------------------------------|
| branch | string | Filter by branch ID                  |
| sortBy | string | e.g. `createdAt:desc`, `name:asc`   |
| limit  | number | Page size                            |
| page   | number | Page number                          |

**Example:**  
`GET /v1/email-templates?branch=507f1f77bcf86cd799439011&limit=10&page=1&sortBy=createdAt:desc`

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "_id": "templateId123",
      "name": "Quarterly reminder",
      "subject": "Hello {{clientName}} – Q1 update",
      "bodyHtml": "<p>Hi {{clientName}},</p>...",
      "bodyText": "Hi {{clientName}}, ...",
      "branch": "branchId or null",
      "createdBy": "userId",
      "createdAt": "2025-01-27T...",
      "updatedAt": "2025-01-27T..."
    }
  ],
  "page": 1,
  "limit": 10,
  "totalPages": 2,
  "totalResults": 15
}
```

---

### 1.2 Get one template

**GET** `/email-templates/:templateId`

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "templateId123",
    "name": "Quarterly reminder",
    "subject": "Hello {{clientName}} – Q1 update",
    "bodyHtml": "<p>Hi {{clientName}},</p>...",
    "bodyText": "Hi {{clientName}}, ...",
    "branch": "branchId or null",
    "createdBy": "userId",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

---

### 1.3 Create template

**POST** `/email-templates`

**Headers:**  
`Content-Type: application/json`

**Body:**
```json
{
  "name": "Quarterly reminder",
  "subject": "Hello {{clientName}} – Q1 update",
  "bodyText": "Dear {{clientName}},\n\nThis is a reminder that your GST return for Q1 is due.\n\nRegistered email: {{email}}\nPhone: {{phone}}\n\nBest regards,\nYour CA Firm",
  "bodyHtml": "",
  "branch": "branchId or null"
}
```

| Field    | Required | Description                                      |
|----------|----------|--------------------------------------------------|
| name     | Yes      | Template name (1–120 chars)                     |
| subject  | Yes      | Subject (1–255 chars)                            |
| bodyText | Yes      | Plain-text body (used for sending; use `\n` for newlines) |
| bodyHtml | No       | Optional; not used when sending (plain text only) |
| branch   | No       | Branch ID or `null` for global                   |

**Note:** Emails are sent as **plain text only**. Put your content in `bodyText`. Use `\n` for line breaks.

**Response:** `201` with `{ "success": true, "data": { ...template } }`

---

### 1.4 Update template

**PATCH** `/email-templates/:templateId`

**Body (send only fields to change):**
```json
{
  "name": "Updated name",
  "subject": "New subject",
  "bodyText": "New plain text body",
  "bodyHtml": "",
  "branch": "branchId or null"
}
```

**Response:** `200` with `{ "success": true, "data": { ...template } }`

---

### 1.5 Delete template

**DELETE** `/email-templates/:templateId`

**Response:** `204 No Content` (empty body)

---

## 2. Bulk send API

**POST** `/email-templates/send-bulk`

**Headers:**  
`Content-Type: application/json`

**Body – use exactly one of these:**

| Scenario                | Body example                                                                 |
|-------------------------|-------------------------------------------------------------------------------|
| Selected clients       | `{ "templateId": "id", "clientIds": ["id1","id2","id3"] }`                   |
| All clients in a branch| `{ "templateId": "id", "branchId": "branchId" }`                             |
| All accessible clients | `{ "templateId": "id" }`                                                     |

Rules:
- `templateId` is required.
- Use either `clientIds` **or** `branchId` **or** neither. Do **not** send both `clientIds` and `branchId`.

**Response:**
```json
{
  "success": true,
  "message": "Bulk send completed: 5 sent, 0 failed, 1 skipped (no email)",
  "data": {
    "sent": 5,
    "failed": 0,
    "skipped": 1,
    "errors": [
      {
        "clientId": "clientId",
        "email": "email@example.com",
        "error": "Error message"
      }
    ]
  }
}
```

- **sent:** Emails successfully sent.
- **failed:** Sends that failed (see `errors`).
- **skipped:** Clients with no `email` or `email2`.
- **errors:** Only present when `failed > 0`.

---

## 3. Placeholders (template variables)

Use these in `subject` and `bodyText`. They are replaced per client when sending. (Emails are sent as plain text only.)

| Placeholder     | Replaced with   |
|----------------|-----------------|
| `{{clientName}}` | Client name     |
| `{{companyName}}`| Client name     |
| `{{email}}`      | Primary email   |
| `{{email2}}`     | Secondary email |
| `{{phone}}`      | Phone           |
| `{{address}}`    | Address         |
| `{{district}}`   | District        |
| `{{state}}`      | State           |
| `{{country}}`    | Country         |

Example subject: `Hello {{clientName}} – your quarterly update`  
Example body: `Dear {{clientName}}, we have sent this to {{email}}.`

---

## 4. Frontend setup checklist

### 4.1 API client

- Base URL: `process.env.REACT_APP_API_URL` or your env (e.g. `https://api.example.com`).
- Append `/v1` for these APIs.
- Attach token: `Authorization: Bearer ${accessToken}`.
- Use `Content-Type: application/json` for POST/PATCH bodies.

### 4.2 Pages / flows

1. **Templates list**
   - `GET /email-templates` with optional `branch`, `sortBy`, `limit`, `page`.
   - Table: name, subject, branch, created, actions (Edit, Delete, Send).
   - “Create template” → create form.

2. **Create / Edit template**
   - Create: `POST /email-templates`.
   - Edit: `GET /email-templates/:id` then `PATCH /email-templates/:id`.
   - Fields: name, subject, bodyText (plain text; required). bodyHtml is optional and not used when sending.
   - Optional: branch selector; show “Placeholders: {{clientName}}, {{email}}, …” under body.

3. **Bulk send**
   - User selects a template (from list or after create).
   - User chooses:
     - “Selected clients” → use checked client IDs → send `{ templateId, clientIds }`.
     - “All in this branch” → use current branch → send `{ templateId, branchId }`.
     - “All clients” → send `{ templateId }`.
   - Call `POST /email-templates/send-bulk`.
   - Show: “Sent: X, Failed: Y, Skipped: Z” and, if any, list `data.errors`.

### 4.3 Permission

- Call these APIs only for users with `sendEmails`.
- If your auth API returns permissions, check `sendEmails` and hide/disable “Templates” and “Bulk email” when false.
- On 403, show: “You don’t have permission to send emails.”

### 4.4 Errors

- **400** – Validation (e.g. missing `templateId`, both `clientIds` and `branchId`). Show body message.
- **403** – No `sendEmails`. Show permission message.
- **404** – Template not found (wrong id or no access). Show “Template not found.”

---

## 5. Quick reference – all endpoints

| Method | Endpoint                          | Purpose          |
|--------|-----------------------------------|------------------|
| GET    | `/v1/email-templates`             | List templates   |
| GET    | `/v1/email-templates/:templateId`  | Get one template |
| POST   | `/v1/email-templates`             | Create template  |
| PATCH  | `/v1/email-templates/:templateId`  | Update template  |
| DELETE | `/v1/email-templates/:templateId` | Delete template  |
| POST   | `/v1/email-templates/send-bulk`   | Send bulk email  |

---

## 6. Example: Send to selected clients (fetch)

```javascript
async function sendBulkToSelectedClients(templateId, clientIds) {
  const res = await fetch(`${API_BASE}/v1/email-templates/send-bulk`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ templateId, clientIds }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Send failed');
  return json; // { success, message, data: { sent, failed, skipped, errors } }
}
```

---

## 7. Example: Create template (fetch)

```javascript
async function createTemplate({ name, subject, bodyText, bodyHtml, branch }) {
  const res = await fetch(`${API_BASE}/v1/email-templates`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      subject,
      bodyText,  // required – plain text body, use \n for newlines
      bodyHtml: bodyHtml || '',  // optional – not used when sending
      branch: branch || null,
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || 'Create failed');
  return json.data;
}
```

You can reuse the same pattern for list/get/update/delete by changing method, URL, and body as in sections 1 and 2.
