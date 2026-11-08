# API Endpoints Overview

## 📝 Notes Management
```
┌─────────────────────────────────────────────────────────────┐
│ NOTES API                                                   │
├─────────────────────────────────────────────────────────────┤
│ GET    /api/notes                  → Get all notes          │
│ GET    /api/notes?type=favorites   → Get favorite notes     │
│ GET    /api/notes?type=trashed     → Get trashed notes      │
│ GET    /api/notes?query=text       → Search notes           │
│ POST   /api/notes                  → Create note            │
│ PUT    /api/notes                  → Update note            │
│ DELETE /api/notes?id=X&permanent=1 → Delete permanently     │
│                                                              │
│ PUT    /api/notes/favorite         → Toggle favorite        │
│ PUT    /api/notes/trash            → Move to/from trash     │
│ POST   /api/notes/share            → Generate share link    │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Targets/Goals
```
┌─────────────────────────────────────────────────────────────┐
│ TARGETS API                                                 │
├─────────────────────────────────────────────────────────────┤
│ GET    /api/targets                → Get all targets        │
│ POST   /api/targets                → Create target          │
│ DELETE /api/targets?id=X           → Delete target          │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Dashboard & Analytics
```
┌─────────────────────────────────────────────────────────────┐
│ DASHBOARD API                                               │
├─────────────────────────────────────────────────────────────┤
│ GET    /api/dashboard/stats        → Comprehensive stats    │
│ GET    /api/dashboard/activity     → Recent activity        │
│ GET    /api/dashboard/productivity → 7-day productivity     │
└─────────────────────────────────────────────────────────────┘
```

## 🔔 Notifications
```
┌─────────────────────────────────────────────────────────────┐
│ NOTIFICATIONS API                                           │
├─────────────────────────────────────────────────────────────┤
│ GET    /api/notifications          → Get all notifications  │
│ GET    /api/notifications?filter=X → Filter notifications   │
│ DELETE /api/notifications?id=X     → Delete notification    │
└─────────────────────────────────────────────────────────────┘
```

## 📨 Messages/Inbox
```
┌─────────────────────────────────────────────────────────────┐
│ MESSAGES API                                                │
├─────────────────────────────────────────────────────────────┤
│ GET    /api/messages               → Get all messages       │
│ POST   /api/messages               → Create message         │
│ DELETE /api/messages?id=X          → Delete message         │
└─────────────────────────────────────────────────────────────┘
```

## ⚙️ Settings
```
┌─────────────────────────────────────────────────────────────┐
│ SETTINGS API                                                │
├─────────────────────────────────────────────────────────────┤
│ PUT    /api/settings/password      → Change password        │
└─────────────────────────────────────────────────────────────┘
```

## 🔑 API Token Management
```
┌─────────────────────────────────────────────────────────────┐
│ TOKEN API (Cookie Auth Required)                           │
├─────────────────────────────────────────────────────────────┤
│ GET    /api/auth/token             → List token metadata    │
│ POST   /api/auth/token             → Generate new token     │
│ DELETE /api/auth/token             → Revoke token           │
└─────────────────────────────────────────────────────────────┘
```

## 🔐 Authentication Methods

### Method 1: Cookie-Based (Web App)
```
✓ Automatic for web interface
✓ Session managed by browser
✓ 7-day expiration
```

### Method 2: API Token (Mobile/External)
```
Header: X-API-Token: your_64_character_token

✓ Generated via web interface
✓ Tracks last usage
✓ Can be revoked anytime
✓ Multiple tokens supported
✓ Token values are shown once and stored as hashes
```

## 🛡️ Security Features

```
┌────────────────────────────────────────┐
│ ✓ SQL Injection Protection             │
│   → All queries use parameterized SQL  │
│                                        │
│ ✓ Rate Limiting                        │
│   → 100 req/min per token/session     │
│                                        │
│ ✓ Input Validation                     │
│   → Type, length, format checks       │
│                                        │
│ ✓ Token Validation                     │
│   → 64-char format enforcement        │
│                                        │
│ ✓ Error Handling                       │
│   → Consistent error responses        │
└────────────────────────────────────────┘
```

## 📈 HTTP Status Codes

```
200 → Success
400 → Bad Request (validation error)
401 → Unauthorized (auth required)
404 → Not Found
429 → Rate Limit Exceeded
500 → Server Error
```

## 🚀 Quick Start

### 1. Generate Token (Web Interface)
```
Login → Settings → API Tokens → Generate
```

### 2. Make API Call
```bash
curl -H "X-API-Token: YOUR_TOKEN" \
  https://your-domain.com/api/notes
```

### 3. Create Note
```bash
curl -X POST https://your-domain.com/api/notes \
  -H "X-API-Token: YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","body":"Content"}'
```

## 📱 Mobile App Integration

```javascript
// Configure
const API_BASE = 'https://your-domain.com';
const API_TOKEN = 'your_token_here';

// Make requests
fetch(`${API_BASE}/api/notes`, {
  headers: {
    'X-API-Token': API_TOKEN,
    'Content-Type': 'application/json'
  }
})
```

## 📚 Documentation Files

```
README.md           → Main documentation with API details
API_REFERENCE.md    → Quick reference with code examples
SECURITY.md         → Security guide & deployment checklist
CHANGES.md          → Summary of all changes made
test-api.sh         → Automated testing script
```

## ✅ Testing

```bash
# Run automated tests
./test-api.sh http://localhost:3000 YOUR_TOKEN

# Or test manually
curl -H "X-API-Token: TOKEN" http://localhost:3000/api/notes
```

---

**All endpoints require authentication via Cookie (web) or X-API-Token (mobile/external)**
