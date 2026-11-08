# Quick API Reference

## Base URL
```
Production: https://your-domain.com
Development: http://localhost:3000
```

## Authentication

### Headers Required
```
X-API-Token: your_64_character_token_here
Content-Type: application/json
```

## Quick Reference Table

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/notes` | GET | Get all notes | ✓ |
| `/api/notes?type=favorites` | GET | Get favorite notes | ✓ |
| `/api/notes?type=trashed` | GET | Get trashed notes | ✓ |
| `/api/notes?query=search` | GET | Search notes | ✓ |
| `/api/notes` | POST | Create new note | ✓ |
| `/api/notes` | PUT | Update note | ✓ |
| `/api/notes?id=X&permanent=true` | DELETE | Delete note permanently | ✓ |
| `/api/notes/favorite` | PUT | Toggle favorite | ✓ |
| `/api/notes/trash` | PUT | Move to/from trash | ✓ |
| `/api/notes/share` | POST | Create share link | ✓ |
| `/api/targets` | GET | Get all targets | ✓ |
| `/api/targets` | POST | Create target | ✓ |
| `/api/targets?id=X` | DELETE | Delete target | ✓ |
| `/api/dashboard/stats` | GET | Dashboard statistics | ✓ |
| `/api/dashboard/activity` | GET | Activity timeline | ✓ |
| `/api/dashboard/productivity` | GET | 7-day productivity | ✓ |
| `/api/notifications` | GET | Get notifications | ✓ |
| `/api/notifications?id=X` | DELETE | Delete notification | ✓ |
| `/api/messages` | GET | Get all messages | ✓ |
| `/api/messages` | POST | Create message | ✓ |
| `/api/messages?id=X` | DELETE | Delete message | ✓ |
| `/api/settings/password` | PUT | Change password | ✓ |
| `/api/auth/token` | GET | List API token metadata (values hidden) | ✓ (Cookie only) |
| `/api/auth/token` | POST | Generate token | ✓ (Cookie only) |
| `/api/auth/token` | DELETE | Revoke token | ✓ (Cookie only) |

## Code Examples

### JavaScript/Node.js
```javascript
const API_BASE = 'https://your-domain.com';
const API_TOKEN = 'your_token_here';

// Fetch all notes
async function getNotes() {
  const response = await fetch(`${API_BASE}/api/notes`, {
    headers: {
      'X-API-Token': API_TOKEN
    }
  });
  return await response.json();
}

// Create a note
async function createNote(title, body) {
  const response = await fetch(`${API_BASE}/api/notes`, {
    method: 'POST',
    headers: {
      'X-API-Token': API_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, body })
  });
  return await response.json();
}

// Update a note
async function updateNote(id, title, body) {
  const response = await fetch(`${API_BASE}/api/notes`, {
    method: 'PUT',
    headers: {
      'X-API-Token': API_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ id, title, body })
  });
  return await response.json();
}

// Delete a note
async function deleteNote(id) {
  const response = await fetch(
    `${API_BASE}/api/notes?id=${id}&permanent=true`,
    {
      method: 'DELETE',
      headers: { 'X-API-Token': API_TOKEN }
    }
  );
  return await response.json();
}
```

### Python
```python
import requests

API_BASE = 'https://your-domain.com'
API_TOKEN = 'your_token_here'

headers = {
    'X-API-Token': API_TOKEN,
    'Content-Type': 'application/json'
}

# Fetch all notes
response = requests.get(f'{API_BASE}/api/notes', headers=headers)
notes = response.json()

# Create a note
data = {
    'title': 'My Note',
    'body': 'Note content here'
}
response = requests.post(f'{API_BASE}/api/notes', json=data, headers=headers)
result = response.json()

# Update a note
data = {
    'id': 123,
    'title': 'Updated Title',
    'body': 'Updated content'
}
response = requests.put(f'{API_BASE}/api/notes', json=data, headers=headers)

# Delete a note
response = requests.delete(
    f'{API_BASE}/api/notes?id=123&permanent=true',
    headers=headers
)
```

### cURL
```bash
# Get all notes
curl -H "X-API-Token: YOUR_TOKEN" \
  https://your-domain.com/api/notes

# Create a note
curl -X POST https://your-domain.com/api/notes \
  -H "X-API-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"My Note","body":"Content here"}'

# Update a note
curl -X PUT https://your-domain.com/api/notes \
  -H "X-API-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":123,"title":"Updated","body":"New content"}'

# Delete a note
curl -X DELETE "https://your-domain.com/api/notes?id=123&permanent=true" \
  -H "X-API-Token: YOUR_TOKEN"

# Get dashboard stats
curl -H "X-API-Token: YOUR_TOKEN" \
  https://your-domain.com/api/dashboard/stats

# Search notes
curl -H "X-API-Token: YOUR_TOKEN" \
  "https://your-domain.com/api/notes?query=javascript"
```

### React Native
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = 'https://your-domain.com';

class NotesAPI {
  constructor() {
    this.token = null;
  }

  async setToken(token) {
    this.token = token;
    await AsyncStorage.setItem('api_token', token);
  }

  async loadToken() {
    this.token = await AsyncStorage.getItem('api_token');
  }

  async request(endpoint, options = {}) {
    if (!this.token) await this.loadToken();

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'X-API-Token': this.token,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (response.status === 429) {
      const data = await response.json();
      throw new Error(`Rate limited. Retry after ${data.retryAfter}s`);
    }

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  }

  async getNotes() {
    return this.request('/api/notes');
  }

  async createNote(title, body) {
    return this.request('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ title, body })
    });
  }

  async updateNote(id, title, body) {
    return this.request('/api/notes', {
      method: 'PUT',
      body: JSON.stringify({ id, title, body })
    });
  }

  async toggleFavorite(id, favorite) {
    return this.request('/api/notes/favorite', {
      method: 'PUT',
      body: JSON.stringify({ id, favorite })
    });
  }

  async getDashboardStats() {
    return this.request('/api/dashboard/stats');
  }
}

export default new NotesAPI();
```

## Error Handling

Always check for these status codes:

- `200`: Success
- `400`: Bad request (validation error)
- `401`: Unauthorized (invalid/missing token)
- `404`: Resource not found
- `429`: Rate limit exceeded
- `500`: Server error

Example error handling:
```javascript
try {
  const response = await fetch(url, options);
  
  if (response.status === 401) {
    // Token invalid - redirect to login
    console.error('Authentication failed');
    return;
  }
  
  if (response.status === 429) {
    const data = await response.json();
    // Rate limited - wait before retrying
    console.log(`Rate limited. Wait ${data.retryAfter} seconds`);
    return;
  }
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }
  
  return await response.json();
} catch (error) {
  console.error('API Error:', error);
}
```

## Rate Limiting

- **Limit**: 100 requests per minute per token
- **Window**: 60 seconds
- **Response Header**: Check `X-RateLimit-Remaining`
- **When Limited**: Returns 429 with `retryAfter` in seconds

## Common Request Bodies

### Create Note
```json
{
  "title": "Note Title (required, max 255 chars)",
  "body": "Note content (required)",
  "category": "Optional category name"
}
```

### Update Note
```json
{
  "id": 123,
  "title": "Updated title",
  "body": "Updated content"
}
```

### Toggle Favorite
```json
{
  "id": 123,
  "favorite": true
}
```

### Toggle Trash
```json
{
  "id": 123,
  "trash": true
}
```

### Create Target
```json
{
  "date": "2026-12-31",
  "message": "Goal description"
}
```

### Create Message
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Message content"
}
```

### Change Password
```json
{
  "newPassword": "new_password_here"
}
```

## Testing

Use the included test script:
```bash
./test-api.sh https://your-domain.com YOUR_API_TOKEN
```

## Support

- Full documentation: See README.md
- Security guide: See SECURITY.md
- Issues: Create a GitHub issue
