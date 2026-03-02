# Feedback API Documentation

Complete API documentation for the feedback system.

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Submit Feedback](#1-submit-feedback)
  - [Get All Feedback](#2-get-all-feedback)
  - [Get Feedback by ID](#3-get-feedback-by-id)
  - [Update Feedback](#4-update-feedback)
  - [Delete Feedback](#5-delete-feedback)
  - [Export Feedback](#6-export-feedback)
- [Error Handling](#error-handling)
- [Examples](#examples)

---

## Overview

The Feedback API allows users to submit feedback about the application and administrators to manage, filter, and export feedback data. The system supports categorization, rating, status tracking, and comprehensive filtering capabilities.

**Base URL**: `/api`

---

## Authentication

- **Public Endpoints**: 
  - `POST /api/feedback` - No authentication required
  
- **Admin Endpoints** (require authentication):
  - `GET /api/feedbacks`
  - `GET /api/feedbacks/[id]`
  - `PATCH /api/feedbacks/[id]`
  - `DELETE /api/feedbacks/[id]`
  - `GET /api/feedbacks/export`

Authentication can be done via:
- Session cookie (browser sessions)
- API token via `X-API-Token` header

---

## Rate Limiting

**Public Feedback Submission**:
- Limit: 10 submissions per IP address
- Window: 15 minutes
- Response on limit exceeded: HTTP 429 with `retryAfter` seconds

---

## Endpoints

### 1. Submit Feedback

**Endpoint**: `POST /api/feedback`

**Authentication**: None required

**Description**: Allows users to submit feedback about the application.

**Request Body**:
```json
{
  "feedback_text": "string (required, max 5000 chars)",
  "rating": "integer (optional, 1-5)",
  "user_email": "string (optional, max 255 chars, valid email)",
  "category": "string (optional, one of: praise, feature, bug, improvement, other)"
}
```

**Example Request**:
```bash
curl -X POST https://your-app.com/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "feedback_text": "I love the app! It'\''s very user-friendly.",
    "rating": 5,
    "user_email": "user@example.com",
    "category": "praise"
  }'
```

**Success Response** (201 Created):
```json
{
  "success": true,
  "message": "Thank you for your feedback!",
  "feedback_id": 123
}
```

**Error Responses**:
- **400 Bad Request**:
  ```json
  {
    "error": "feedback_text is required"
  }
  ```
- **429 Too Many Requests**:
  ```json
  {
    "error": "Too many feedback submissions. Please try again later.",
    "retryAfter": 900
  }
  ```

---

### 2. Get All Feedback

**Endpoint**: `GET /api/feedbacks`

**Authentication**: Required (admin)

**Description**: Retrieve a list of all feedback with optional filtering, sorting, and pagination.

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Max results to return (max: 200) |
| `offset` | integer | 0 | Number of results to skip |
| `feedback_text` | string | - | Filter by feedback content (partial match) |
| `user_email` | string | - | Filter by user email (partial match) |
| `category` | string | - | Filter by category (exact match) |
| `status` | string | - | Filter by status (exact match) |
| `min_rating` | integer | - | Minimum rating (1-5) |
| `max_rating` | integer | - | Maximum rating (1-5) |
| `start` | string | - | Start date (ISO format) |
| `end` | string | - | End date (ISO format) |
| `q` | string | - | Global search across multiple fields |
| `sort_by` | string | timestamp | Field to sort by (timestamp, rating, category, status, id) |
| `sort_dir` | string | desc | Sort direction (asc or desc) |

**Example Request**:
```bash
curl -X GET "https://your-app.com/api/feedbacks?category=bug&min_rating=1&sort_by=timestamp&sort_dir=desc" \
  -H "Cookie: session=your-session-cookie"
```

**Success Response** (200 OK):
```json
{
  "total": 150,
  "limit": 50,
  "offset": 0,
  "items": [
    {
      "id": 123,
      "timestamp": "2026-03-02T10:00:00Z",
      "feedback_text": "I love the app!",
      "rating": 5,
      "user_email": "user@example.com",
      "category": "praise",
      "status": "new",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0..."
    }
  ]
}
```

---

### 3. Get Feedback by ID

**Endpoint**: `GET /api/feedbacks/[id]`

**Authentication**: Required (admin)

**Description**: Retrieve details of a specific feedback entry by its ID.

**URL Parameters**:
- `id` (integer, required): The feedback ID

**Example Request**:
```bash
curl -X GET https://your-app.com/api/feedbacks/123 \
  -H "Cookie: session=your-session-cookie"
```

**Success Response** (200 OK):
```json
{
  "id": 123,
  "timestamp": "2026-03-02T10:00:00Z",
  "feedback_text": "I love the app!",
  "rating": 5,
  "user_email": "user@example.com",
  "category": "praise",
  "status": "new",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

**Error Response** (404 Not Found):
```json
{
  "error": "Feedback not found"
}
```

---

### 4. Update Feedback

**Endpoint**: `PATCH /api/feedbacks/[id]`

**Authentication**: Required (admin)

**Description**: Update the status or category of a specific feedback entry.

**URL Parameters**:
- `id` (integer, required): The feedback ID

**Request Body**:
```json
{
  "status": "string (optional, one of: new, reviewed, resolved, archived)",
  "category": "string (optional, one of: praise, feature, bug, improvement, other)"
}
```

**Example Request**:
```bash
curl -X PATCH https://your-app.com/api/feedbacks/123 \
  -H "Content-Type: application/json" \
  -H "Cookie: session=your-session-cookie" \
  -d '{
    "status": "reviewed",
    "category": "improvement"
  }'
```

**Success Response** (200 OK):
```json
{
  "id": 123,
  "timestamp": "2026-03-02T10:00:00Z",
  "feedback_text": "I love the app!",
  "rating": 5,
  "user_email": "user@example.com",
  "category": "improvement",
  "status": "reviewed",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

---

### 5. Delete Feedback

**Endpoint**: `DELETE /api/feedbacks/[id]`

**Authentication**: Required (admin)

**Description**: Permanently delete a feedback entry.

**URL Parameters**:
- `id` (integer, required): The feedback ID

**Example Request**:
```bash
curl -X DELETE https://your-app.com/api/feedbacks/123 \
  -H "Cookie: session=your-session-cookie"
```

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Feedback deleted successfully"
}
```

---

### 6. Export Feedback

**Endpoint**: `GET /api/feedbacks/export`

**Authentication**: Required (admin)

**Description**: Export feedback data in CSV or JSON format with all filtering options supported.

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `format` | string | Yes | - | Export format (csv or json) |
| `limit` | integer | No | 5000 | Max results to export (max: 10000) |
| `offset` | integer | No | 0 | Number of results to skip |

All filter parameters from `GET /api/feedbacks` are also supported.

**Example Request (CSV)**:
```bash
curl -X GET "https://your-app.com/api/feedbacks/export?format=csv&category=bug&limit=1000" \
  -H "Cookie: session=your-session-cookie" \
  -o feedback_export.csv
```

**Example Request (JSON)**:
```bash
curl -X GET "https://your-app.com/api/feedbacks/export?format=json&status=new" \
  -H "Cookie: session=your-session-cookie" \
  -o feedback_export.json
```

**CSV Response Headers**:
```
Content-Type: text/csv
Content-Disposition: attachment; filename="feedback_export_2026-03-02T10:00:00.000Z.csv"
```

**JSON Response** (200 OK):
```json
{
  "count": 150,
  "limit": 5000,
  "offset": 0,
  "items": [...]
}
```

---

## Error Handling

All error responses follow a consistent format:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Common HTTP Status Codes**:
- `200` - Success
- `201` - Created (successful feedback submission)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Examples

### Complete Workflow Example

**1. User Submits Feedback**:
```bash
curl -X POST https://your-app.com/api/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "feedback_text": "The search feature could be faster",
    "rating": 4,
    "user_email": "user@example.com",
    "category": "improvement"
  }'
```

**2. Admin Views All New Feedback**:
```bash
curl -X GET "https://your-app.com/api/feedbacks?status=new&sort_by=timestamp&sort_dir=desc" \
  -H "Cookie: session=admin-session"
```

**3. Admin Reviews Specific Feedback**:
```bash
curl -X GET https://your-app.com/api/feedbacks/123 \
  -H "Cookie: session=admin-session"
```

**4. Admin Updates Status to Reviewed**:
```bash
curl -X PATCH https://your-app.com/api/feedbacks/123 \
  -H "Content-Type: application/json" \
  -H "Cookie: session=admin-session" \
  -d '{"status": "reviewed"}'
```

**5. Admin Exports All Improvement Suggestions**:
```bash
curl -X GET "https://your-app.com/api/feedbacks/export?format=csv&category=improvement" \
  -H "Cookie: session=admin-session" \
  -o improvements.csv
```

---

## Database Schema

The feedback table structure:

```sql
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    feedback_text TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    user_email VARCHAR(255),
    category VARCHAR(50) CHECK (category IN ('praise', 'feature', 'bug', 'improvement', 'other')),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'resolved', 'archived')),
    ip_address VARCHAR(45),
    user_agent TEXT
);
```

**Indexes**:
- `idx_feedback_timestamp` on `timestamp DESC`
- `idx_feedback_category` on `category`
- `idx_feedback_status` on `status`
- `idx_feedback_rating` on `rating`
- `idx_feedback_user_email` on `user_email`

---

## Best Practices

1. **For Users**:
   - Provide clear, constructive feedback
   - Include your email if you want follow-up
   - Use appropriate categories

2. **For Administrators**:
   - Regularly review new feedback
   - Update statuses to track progress
   - Use filters to identify patterns
   - Export data for analysis
   - Archive resolved feedback to keep the list clean

3. **For Developers**:
   - Monitor rate limits
   - Implement proper error handling
   - Use pagination for large datasets
   - Cache results when appropriate
   - Sanitize user input (handled by API)

---

## Support

For issues or questions about the Feedback API, please submit feedback through the system or contact the development team.
