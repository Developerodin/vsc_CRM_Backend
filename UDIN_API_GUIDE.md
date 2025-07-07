# Timeline UDIN API Guide

This document describes the new endpoints for managing the UDIN array in a Timeline. The `udin` field is now an array of objects, each with a `fieldName`, `udin` value, and `frequency`. This allows you to store multiple UDINs for different periods (e.g., months, quarters, years) per timeline with their corresponding frequencies.

## Endpoints

### 1. Get UDIN Array for a Timeline

**GET** `/v1/timelines/:timelineId/udin`

- **Description:** Fetch the UDIN array for a specific timeline.
- **Auth:** Requires `getTimelines` permission.

#### Example Request (Postman)
```
GET {{baseUrl}}/v1/timelines/64f1c2e2b7e2a2a1b2c3d4e5/udin
Authorization: Bearer <your_token>
```

#### Example Response
```json
{
  "udin": [
    { "fieldName": "January", "udin": "123456", "frequency": "Monthly" },
    { "fieldName": "February", "udin": "654321", "frequency": "Monthly" },
    { "fieldName": "Q1", "udin": "789012", "frequency": "Quarterly" }
  ]
}
```

---

### 2. Update UDIN Array for a Timeline

**PATCH** `/v1/timelines/:timelineId/udin`

- **Description:** Update the UDIN array for a specific timeline. This will replace the entire UDIN array.
- **Auth:** Requires `manageTimelines` permission.
- **Body:**
  - `udin` (array, required): Array of objects with `fieldName`, `udin`, and `frequency`.

#### Example Request (Postman)
```
PATCH {{baseUrl}}/v1/timelines/64f1c2e2b7e2a2a1b2c3d4e5/udin
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "udin": [
    { "fieldName": "January", "udin": "123456", "frequency": "Monthly" },
    { "fieldName": "February", "udin": "654321", "frequency": "Monthly" },
    { "fieldName": "March", "udin": "789012", "frequency": "Monthly" },
    { "fieldName": "Q1", "udin": "456789", "frequency": "Quarterly" }
  ]
}
```

#### Example Response
```json
{
  "udin": [
    { "fieldName": "January", "udin": "123456", "frequency": "Monthly" },
    { "fieldName": "February", "udin": "654321", "frequency": "Monthly" },
    { "fieldName": "March", "udin": "789012", "frequency": "Monthly" },
    { "fieldName": "Q1", "udin": "456789", "frequency": "Quarterly" }
  ]
}
```

---

## UDIN Object Structure

Each object in the `udin` array contains:

- **fieldName** (string, required): The name of the field/period (e.g., "January", "Q1", "2024")
- **udin** (string, required): The UDIN value for that period
- **frequency** (string, required): The frequency type - must be one of: `Hourly`, `Daily`, `Weekly`, `Monthly`, `Quarterly`, `Yearly`

## Notes
- The `udin` array is not required when creating a timeline. It can be managed later using the above endpoints.
- For monthly/quarterly/yearly frequencies, use `fieldName` to indicate the period (e.g., "January", "Q1", "2024").
- The `frequency` field must match one of the valid frequency types.
- The PATCH endpoint **replaces** the entire UDIN array for the timeline.
- Both endpoints require authentication.

---

## Example Postman Environment Variable
```
{
  "baseUrl": "http://localhost:5000"
}
``` 