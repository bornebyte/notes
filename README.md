<div align="center">
  <h1 align="center">Notes - A Modern Note-Taking Web App</h1>
  <p align="center">
    Capture your thoughts, ideas, and tasks with a fast, secure, and feature-rich note-taking application.
    <br />
    <a href="https://github.com/bornebyte/notes"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://notes.shubham-shah.com.np/">View Demo</a>
    ·
    <a href="https://github.com/bornebyte/notes/issues">Report Bug</a>
    ·
    <a href="https://github.com/bornebyte/notes/issues">Request Feature</a>
  </p>
</div>

---

## About The Project

**Notes** is a full-stack web application designed for efficient and organized note-taking. Built with the latest web technologies, it provides a seamless user experience for creating, managing, and sharing notes. The application features a clean, modern interface with a powerful backend to keep your data safe and accessible.

From a quick memo to detailed notes with formatting, Notes is your personal digital notebook.

### Key Features

*   **📝 Create & Update Notes**: An intuitive dialog-based interface for adding and editing notes.
*   **✍️ Simple Markdown Support**: Format your notes with **Bold**, *Italic*, __Underline__, and bulleted lists.
*   **🗂️ Note Management**:
    *   **Favorites**: Mark important notes for quick access.
    *   **Trash**: Move notes to the trash instead of permanently deleting them, with an option to restore.
*   **🔗 Shareable Notes**: Generate unique, secure links to share your notes with others.
*   **📊 Admin Dashboard**: Visualize your note-taking activity with a monthly breakdown chart and see total note counts.
*   **🔔 Notifications**: Get notified about activities like creating, updating, or sharing notes.
*   **🔐 Secure**: User authentication and password management features.
*   **📱 Responsive Design**: A collapsible sidebar and mobile-friendly layout for a great experience on any device.

### Built With

This project leverages a modern, full-stack JavaScript ecosystem.

*   **Next.js** - The React Framework for the Web
*   **React** - Frontend library
*   **Tailwind CSS** - Utility-first CSS framework
*   **shadcn/ui** - Re-usable components built using Radix UI and Tailwind CSS
*   **Neon** - Serverless Postgres database
*   **Vercel** - Deployment and hosting

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Make sure you have Node.js and npm (or yarn/pnpm/bun) installed on your machine.

*   npm
    ```sh
    npm install npm@latest -g
    ```

### Installation

1.  **Clone the repo**
    ```sh
    git clone https://github.com/bornebyte/notes.git
    cd notes
    ```

2.  **Install NPM packages**
    ```sh
    npm install --legacy-peer-deps
    ```

3.  **Set up environment variables**

    Create a `.env.local` file in the root of your project and add your database connection string. You can copy the example file:
    ```sh
    cp .env.example .env.local
    ```
    Then, edit `.env.local` with your credentials:
    ```
    DATABASE_URL="your_neon_database_connection_string"
    SESSION_SECRET="your_session_secret_here"
    ```

### Running the Application

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

---

## 🔌 API Documentation

The Notes app provides a comprehensive REST API that supports both **cookie-based authentication** (for web apps) and **API token authentication** (for external apps and mobile clients).

### Authentication Methods

#### 1. Cookie-Based Authentication (Web)
- Used by the web interface
- Session managed via secure HTTP-only cookies
- Automatically handled by the browser

#### 2. API Token Authentication (External Apps)
- Used for mobile apps, CLI tools, and third-party integrations
- Include the `X-API-Token` header in all requests

**Generating an API Token:**
1. Log in to your account via the web interface
2. Navigate to Settings → API Tokens
3. Click "Generate New Token"
4. Copy and securely store your token (it won't be shown again)

**Using the API Token:**
```bash
curl -H "X-API-Token: your_token_here" https://your-domain.com/api/notes
```

### Rate Limiting
- **Default Limit**: 100 requests per minute per token/session
- Rate limit headers included in responses:
  - `X-RateLimit-Remaining`: Remaining requests
  - `Retry-After`: Seconds to wait when rate limited (429 status)

---

### 📝 Notes Endpoints

#### **GET /api/notes**
Get all notes or filter by type.

**Query Parameters:**
- `type` (optional): Filter type - `favorites`, `trashed`
- `query` (optional): Search term to filter notes
- `shareid` (optional): Get a specific shared note

**Example:**
```bash
# Get all notes
curl -H "X-API-Token: YOUR_TOKEN" https://your-domain.com/api/notes

# Get favorite notes
curl -H "X-API-Token: YOUR_TOKEN" https://your-domain.com/api/notes?type=favorites

# Search notes
curl -H "X-API-Token: YOUR_TOKEN" https://your-domain.com/api/notes?query=javascript
```

**Response:**
```json
[
  {
    "id": 1,
    "title": "My Note",
    "body": "Note content here",
    "category": null,
    "created_at": "1/28/2026, 10:30:00 AM",
    "lastupdated": null,
    "fav": false,
    "trash": false,
    "shareid": null
  }
]
```

#### **POST /api/notes**
Create a new note.

**Body:**
```json
{
  "title": "Note Title",
  "body": "Note content",
  "category": "Optional category"
}
```

**Response:**
```json
{
  "success": true,
  "id": 123
}
```

#### **PUT /api/notes**
Update an existing note.

**Body:**
```json
{
  "id": 123,
  "title": "Updated Title",
  "body": "Updated content"
}
```

#### **DELETE /api/notes?id=123&permanent=true**
Permanently delete a note.

**Query Parameters:**
- `id` (required): Note ID
- `permanent` (required): Must be `true` to permanently delete

---

### ⭐ Favorite Notes

#### **PUT /api/notes/favorite**
Add or remove a note from favorites.

**Body:**
```json
{
  "id": 123,
  "favorite": true
}
```

---

### 🗑️ Trash Management

#### **PUT /api/notes/trash**
Move a note to trash or restore it.

**Body:**
```json
{
  "id": 123,
  "trash": true
}
```

---

### 🔗 Share Notes

#### **POST /api/notes/share**
Generate a shareable link for a note.

**Body:**
```json
{
  "id": 123
}
```

**Response:**
```json
{
  "success": true,
  "shareid": "abc123xyz"
}
```

Share URL: `https://your-domain.com/shared/abc123xyz`

---

### 🎯 Targets/Goals

#### **GET /api/targets**
Get all targets with progress calculations.

**Response:**
```json
[
  {
    "id": 1,
    "date": "2026-12-31",
    "message": "Complete project",
    "created_at": "1/28/2026, 10:00:00 AM",
    "days": 337,
    "hours": 12,
    "progressPercentage": 15
  }
]
```

#### **POST /api/targets**
Create a new target.

**Body:**
```json
{
  "date": "2026-12-31",
  "message": "My goal description"
}
```

#### **DELETE /api/targets?id=123**
Delete a target.

---

### 📊 Dashboard Statistics

#### **GET /api/dashboard/stats**
Get comprehensive dashboard statistics.

**Response:**
```json
{
  "totalNotes": 150,
  "totalTrashed": 5,
  "totalFavorites": 20,
  "notesToday": 3,
  "notesThisWeek": 15,
  "recentNotes": [...],
  "recentNotifications": [...],
  "categoryStats": { "Work": 50, "Personal": 100 },
  "upcomingTargets": [...]
}
```

#### **GET /api/dashboard/activity**
Get recent activity timeline.

#### **GET /api/dashboard/productivity**
Get productivity stats for the last 7 days.

**Response:**
```json
[
  { "date": "Jan 22", "count": 5 },
  { "date": "Jan 23", "count": 3 },
  ...
]
```

---

### 🔔 Notifications

#### **GET /api/notifications**
Get notifications with optional filtering.

**Query Parameters:**
- `filter` (optional): Filter by category or `*` for all

**Response:**
```json
[
  [
    {
      "id": 1,
      "title": "Note Added with id 123",
      "created_at": "1/28/2026, 10:30:00 AM",
      "category": "noteadded",
      "label": "Note added"
    }
  ],
  [
    { "category": "*", "label": "All" },
    { "category": "noteadded", "label": "Note added" }
  ]
]
```

#### **DELETE /api/notifications?id=123**
Delete a notification.

---

### 📨 Messages/Inbox

#### **GET /api/messages**
Get all inbox messages.

#### **POST /api/messages**
Create a new message.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello!"
}
```

#### **DELETE /api/messages?id=123**
Delete a message.

---

### ⚙️ Settings

#### **PUT /api/settings/password**
Change admin password.

**Body:**
```json
{
  "newPassword": "your_new_password"
}
```

**Note:** Password must be at least 6 characters.

---

### 🔑 API Token Management

#### **GET /api/auth/token**
Get all API tokens (requires cookie auth).

#### **POST /api/auth/token**
Generate a new API token (requires cookie auth).

**Body:**
```json
{
  "name": "My Mobile App"
}
```

**Response:**
```json
{
  "success": true,
  "token": "your_64_character_token_here",
  "name": "My Mobile App",
  "id": 1,
  "message": "Use this token in the X-API-Token header"
}
```

#### **DELETE /api/auth/token**
Revoke an API token (requires cookie auth).

---

### Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Missing required fields"
}
```

**401 Unauthorized:**
```json
{
  "message": "Unauthorized. Please provide valid authentication via session cookie or X-API-Token header."
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Note not found"
}
```

**429 Too Many Requests:**
```json
{
  "message": "Too many requests. Please try again in 45 seconds.",
  "retryAfter": 45
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

### Security Best Practices

1. **Keep your API token secret** - Never commit tokens to version control
2. **Use HTTPS** - All API requests should be made over HTTPS
3. **Token rotation** - Regularly rotate your API tokens
4. **Rate limiting** - Respect rate limits to avoid service disruption
5. **Validate input** - The API validates all inputs, but clients should too
6. **Error handling** - Always handle error responses gracefully

---

### Example Mobile App Integration

```javascript
// React Native / Mobile App Example
const API_BASE_URL = 'https://your-domain.com';
const API_TOKEN = 'your_token_here';

async function fetchNotes() {
  const response = await fetch(`${API_BASE_URL}/api/notes`, {
    headers: {
      'X-API-Token': API_TOKEN,
      'Content-Type': 'application/json'
    }
  });
  
  if (response.status === 429) {
    const data = await response.json();
    console.log(`Rate limited. Retry after ${data.retryAfter} seconds`);
    return;
  }
  
  return await response.json();
}

async function createNote(title, body) {
  const response = await fetch(`${API_BASE_URL}/api/notes`, {
    method: 'POST',
    headers: {
      'X-API-Token': API_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, body })
  });
  
  return await response.json();
}
```

---

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
