# Q-Collector Application Framework

**Enterprise Form Builder & Data Collection System**

## Version: 0.7.30-dev (2025-10-16)

**Stack:** React 18 + Node.js/Express + PostgreSQL + Redis + MinIO
**Target:** Thai Business Forms & Data Collection
**Status:** 🟢 Production Ready

## Core Features

✅ Form Builder (17 field types, drag-and-drop, conditional visibility)
✅ Full CRUD Operations (dual-write system, edit pages, validation)
✅ Navigation System (breadcrumbs, deep linking, URL parameters)
✅ Modern UI (ShadCN, glass morphism, animated buttons, toast system)
✅ Sub-Forms (nested forms, drag-drop ordering, dynamic tables)
✅ Telegram Integration (notifications, field ordering, custom templates)
✅ Thai Localization (province selector, phone/date formatting)
✅ User Management (RBAC, 8 roles, 2FA, trusted devices)
✅ Dynamic Tables (auto-creation, Thai-English translation, PowerBI ready)
✅ MyMemory Translation (Free API, real-time Thai→English, excellent quality)
✅ File Management (MinIO, thumbnails, presigned URLs, smart downloads)
✅ Smart Token Redirect (return to original page after re-login)
✅ Mobile-Friendly Tables (56-64px rows, adaptive fonts)
✅ Token Refresh Working (7-day sessions, no false logouts)
✅ ngrok Mobile Testing (HTTPS tunnel, React proxy pattern)
✅ Image Stability (React.memo prevents unnecessary re-renders)
✅ Navigation Arrows Working (md: breakpoint, visible on tablets+)
✅ Portrait Images Optimized (50% size reduction, max-h-[35vh])

## Quick Start

```bash
npm install && npm run dev
npm run build && npm run lint
```

## Architecture

**Components:** MainFormApp • EnhancedFormBuilder • FormView • FormSubmissionList

**Field Types (17):** short_answer, paragraph, email, phone, number, url, file_upload, image_upload, date, time, datetime, multiple_choice, rating, slider, lat_long, province, factory

**Design:** Orange primary (#f97316) • 8px grid • 44px+ touch targets • Glass morphism • Responsive (mobile-first)

---

## Latest Version - v0.7.30-dev (2025-10-16)

### New Features & Improvements ✅

**Feature 1: Form List Icon Hover Effects**
- ✅ Each icon has independent hover effect (not group hover)
- ✅ 4 different colors for better visual hierarchy:
  - Copy Link: Blue (#3b82f6)
  - View Submissions: Green (#22c55e)
  - Edit Form: Orange (#f97316)
  - Delete Form: Red (#ef4444)
- **File Modified:** `src/components/FormListApp.jsx` (lines 476-544)
- **Implementation:** Tailwind CSS named groups (`group/copy`, `group/view`, etc.)

**Feature 2: Progressive Image Loading System (In Progress)**
- 📋 Comprehensive architecture plan created
- 🎯 Target: 95% bandwidth reduction, 80% faster page loads
- 🚀 3-phase implementation: Backend → Frontend → Memory Management
- **Documentation:** See `qtodo.md` for full implementation plan

**Database Analysis Completed:**
- ✅ Verified all core tables are in active use
- ✅ Found production data in `sub_forms`, `submission_data`, `submissions`
- ✅ Confirmed dual-write system (EAV + Dynamic Tables)
- **Scripts Created:** `backend/check-tables.js`, `backend/check-submissions-detail.js`, `backend/check-dynamic-tables.js`

### Code Changes

```javascript
// Form List Icon Hover - Named Groups (FormListApp.jsx lines 476-544)
{/* Copy Link - Blue */}
<div className="group/copy ...">
  <FontAwesomeIcon
    className="group-hover/copy:text-blue-500 group-hover/copy:scale-125 ..."
  />
</div>

{/* View - Green */}
<div className="group/view ...">
  <FontAwesomeIcon
    className="group-hover/view:text-green-500 group-hover/view:scale-125 ..."
  />
</div>

{/* Edit - Orange */}
<div className="group/edit ...">
  <FontAwesomeIcon
    className="group-hover/edit:text-orange-500 group-hover/edit:scale-125 group-hover/edit:rotate-12 ..."
  />
</div>

{/* Delete - Red */}
<div className="group/delete ...">
  <FontAwesomeIcon
    className="group-hover/delete:text-red-500 group-hover/delete:scale-125 ..."
  />
</div>
```

---

## Recent Critical Fixes (Context)

### v0.7.29-dev - Image Flicker Fix
- Block presignedUrl during transition
- Increased timeout from 50ms to 100ms
- Prevents old images from showing during navigation

### v0.7.27-dev - Navigation Arrows Visibility
- Changed breakpoint from `lg:` (1024px) to `md:` (768px)
- Arrows now visible on tablets+ instead of desktop-only
- Portrait thumbnails reduced by 50% (width: 7.5vw/15vw)

### v0.7.20-dev - Image Flickering Fix
- Wrapped SubmissionDetail with React.memo
- Custom comparison prevents toast context re-renders
- Images remain stable during toast notifications

### v0.7.15-dev - Duplicate Loading Prevention
- Switched from useState to useRef for persistent tracking
- Fixed black screen on image click with presignedUrl fallback
- API calls reduced from 20+ to 1-2 per view (97% reduction)

### v0.7.10-dev - Thumbnail Stability
- Changed useEffect dependency to fileIdsString (stable)
- Added min-h-[200px] to prevent container collapse
- Integrated mobile download toast notifications

### v0.7.9-dev - ngrok Mobile Testing
- Single tunnel: ngrok → Frontend → React Proxy → Backend
- CORS trailing slash normalization
- React proxy pattern for free tier compatibility

### v0.7.8-dev - Token Refresh Fix (CRITICAL)
- Fixed storage key mismatch (access_token vs q-collector-auth-token)
- Token refresh now works correctly
- 7-day sessions, no false logouts

---

## Known Issues & Solutions

### Issue: Forms/Submissions Not Loading
**Check:** Token expiry, API endpoints, database connection
**Solution:** Check browser console, backend logs, verify token refresh

### Issue: Images Not Displaying
**Check:** MinIO connection, blob URL loading, presignedUrl fallback
**Solution:** Verify FileService.js blob URL generation, check network tab

### Issue: Navigation Not Working
**Check:** React.memo blocking callbacks, stale closures
**Solution:** Ensure callbacks not wrapped in React.memo comparison

### Issue: Mobile Testing
**Setup:** ngrok tunnel + React proxy
**Config:** HOST=0.0.0.0, proxy in package.json, CORS origins

---

## Development Guidelines

### When Modifying Forms/Submissions:
1. Always use stable dependencies in useEffect
2. Use useRef for tracking state that doesn't trigger re-renders
3. Add null checks in React.memo comparison functions
4. Test on both mobile and desktop viewports

### When Working with Images:
1. Use presignedUrl as fallback for blob URLs
2. Add min-height to containers to prevent layout shifts
3. Use fileIdsString (not files array) as useEffect dependency
4. Implement proper cleanup in useEffect return

### When Adding Features:
1. Follow mobile-first responsive design
2. Use API endpoints (not localStorage)
3. Add proper error handling and loading states
4. Test with ngrok for mobile compatibility

---

## Configuration

**Environment:**
- Telegram: Bot Token และ Group ID ใน .env (ไม่เปิดเผย)
- Super Admin: สร้างผ่าน script หรือ seed data
- Servers: ตรวจสอบ Claude Code process ก่อน restart

**Important:**
- If restart servers, do NOT kill Claude process
- สามารถให้ใช้ playwright mcp ช่วยตรวจสอบ console log ได้เลย

**License:** Internal use - Q-Collector Enterprise v0.7.30-dev

---

## Archive

**Full version history:** See CLAUDE.md.backup-2025-10-16
**Detailed fix documentation:** See individual completion files (e.g., V0.7.28-COMPLETE-SUMMARY.md)
