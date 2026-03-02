# Feedback System - External API Integration

## 🎯 Overview

This feedback system displays and manages feedback from your **external website** (https://pptx.shubham-shah.com.np/). 

**Key Point**: Feedback data is **NOT stored locally**. All data is fetched from and managed on your external domain.

---

## 🔌 How It Works

### Data Flow:
1. Users submit feedback on your external website (pptx.shubham-shah.com.np)
2. Feedback is stored in the external website's database
3. This admin panel fetches and displays that feedback via API
4. You can view, filter, update status, and export feedback from here

### Configuration:
- External domain is configured via `NEXT_PUBLIC_DOMAIN` in `.env.local`
- Current domain: `https://pptx.shubham-shah.com.np`

---

## 📁 Files Created/Modified

### API Proxy Endpoints (All proxy to external API):
1. `/app/api/feedback/route.js` - Proxy for submitting feedback (POST)
2. `/app/api/feedbacks/route.js` - Proxy for listing feedback (GET)
3. `/app/api/feedbacks/[id]/route.js` - Proxy for single feedback ops (GET, PATCH, DELETE)
4. `/app/api/feedbacks/export/route.js` - Proxy for exporting (GET)

### UI Components:
1. `/app/admin/feedback/page.js` - Admin feedback management page
2. `/app/admin/feedback/FeedbackClient.js` - Admin UI component
3. `/components/FeedbackWidget.js` - Compact feedback submission widget
4. `/app/admin/Sidebar.js` - Added feedback menu item
5. `/app/admin/generations/GenerationsClient.js` - Integrated feedback widget

---

## 🚀 Features

### Admin Dashboard (`/admin/feedback`)
- ✅ View all feedback from external site
- ✅ Filter by category, status, rating, date range
- ✅ Global search across feedback text, email, etc.
- ✅ Update feedback status (new → reviewed → resolved → archived)
- ✅ Change feedback category
- ✅ Delete feedback entries
- ✅ Export to CSV or JSON
- ✅ Pagination (default: 20 per page)
- ✅ Stats overview (total, avg rating, new, resolved)

### Feedback Widget
- ✅ Floating button on generations page
- ✅ Quick feedback submission
- ✅ 5-star rating system
- ✅ Category selection (praise, feature, bug, improvement, other)
- ✅ Character counter (5000 max)
- ✅ Success confirmation

---

## 🎨 Usage

### Access Points:
- **Admin Dashboard**: `/admin/feedback` (requires login)
- **Feedback Widget**: Visible on `/admin/generations` (bottom-right floating button)

### For Users:
1. Click the floating feedback button
2. Select category
3. Write feedback (required)
4. Optionally add rating
5. Submit

### For Admins:
1. Go to `/admin/feedback`
2. View all feedback in table format
3. Use filters to find specific feedback
4. Click on feedback to view details
5. Update status or category inline
6. Export filtered data as CSV/JSON

---

## 🔧 API Endpoints

All endpoints proxy to: `${NEXT_PUBLIC_DOMAIN}/api/...`

### Public:
- `POST /api/feedback` - Submit new feedback

### Admin (Auth Required):
- `GET /api/feedbacks` - List all feedback with filters
- `GET /api/feedbacks/[id]` - Get specific feedback
- `PATCH /api/feedbacks/[id]` - Update status/category
- `DELETE /api/feedbacks/[id]` - Delete feedback
- `GET /api/feedbacks/export?format=csv|json` - Export

### Query Parameters (GET /api/feedbacks):
- `limit` - Results per page (default: 50, max: 200)
- `offset` - Skip results (default: 0)
- `category` - Filter by category
- `status` - Filter by status
- `min_rating` / `max_rating` - Filter by rating range
- `q` - Global search
- `sort_by` - Sort field (timestamp, rating, category, status)
- `sort_dir` - Sort direction (asc, desc)
- `start` / `end` - Date range filter

---

## 🎯 Feedback Categories

- **praise** 🎉 - Positive feedback
- **feature** 💡 - Feature requests
- **bug** 🐛 - Bug reports
- **improvement** 📈 - Improvement suggestions
- **other** 💬 - General feedback

## 📊 Feedback Statuses

- **new** - Just submitted, not reviewed
- **reviewed** - Admin has seen it
- **resolved** - Issue fixed / request implemented
- **archived** - Closed / no longer relevant

---

## ⚙️ Configuration

### Environment Variables:
```env
NEXT_PUBLIC_DOMAIN="https://pptx.shubham-shah.com.np"
```

This domain is used to fetch feedback data. Make sure it's properly set in your `.env.local` file.

---

## 🔒 Security

- All admin endpoints require authentication (session or API token)
- Widget submission uses external API's rate limiting
- No local database storage = simpler security model
- All data fetched over HTTPS

---

## 📝 Notes

### What This System Does:
✅ Fetches feedback from external API  
✅ Displays it in a beautiful admin dashboard  
✅ Allows filtering, sorting, and management  
✅ Provides export functionality  
✅ Shows stats and analytics  
✅ Lets users submit feedback via widget  

### What This System Does NOT Do:
❌ Store feedback in local database  
❌ Generate or create feedback  
❌ Modify external API structure  
❌ Replace external API  

---

## 🐛 Troubleshooting

### "No feedback found" or empty list:
1. Check `NEXT_PUBLIC_DOMAIN` is set correctly
2. Verify external API is accessible
3. Check browser console for fetch errors
4. Ensure you're logged in as admin

### "Failed to fetch feedback":
1. Verify external domain is online
2. Check API endpoints exist on external site
3. Check network connectivity
4. Review browser console for specific errors

### Widget not submitting:
1. Check external API POST endpoint
2. Verify feedback text is provided
3. Check browser console for errors

---

## 🎉 Summary

The feedback system is now fully operational and fetching data from your external website. Users can submit feedback via the widget, and admins can manage everything from the `/admin/feedback` dashboard.

**Remember**: All feedback data lives on your external site (pptx.shubham-shah.com.np). This dashboard is just a convenient way to view and manage it!

---

For API documentation, see: [FEEDBACK_API.md](FEEDBACK_API.md)
