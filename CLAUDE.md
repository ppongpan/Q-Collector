# Q-Collector Application Framework

**Enterprise Form Builder & Data Collection System**

## Version: 0.7.40-dev (2025-10-19)

**Stack:** React 18 + Node.js/Express + PostgreSQL + Redis + MinIO
**Target:** Thai Business Forms & Data Collection
**Status:** 🟢 Production Ready & Testing

---

## 🎯 Current Status (2025-10-19)

### Servers Running
- ✅ **Backend**: Port 5000 (Q-Collector API v0.7.3-dev)
- ✅ **Frontend**: Port 3000 (q-collector v0.7.17-dev)
- ✅ **Docker**: PostgreSQL 16 + Redis 7 + MinIO

### Recent Activity
- User "pongpanp" logged in with 2FA (16:42:03)
- Token refresh successful (7-day sessions working)
- Form submissions loaded with pagination
- All services operational

**Access Points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/v1
- API Docs: http://localhost:5000/api/v1/docs

---

## Core Features

### ✅ Form Management
- 17 field types (short_answer, paragraph, email, phone, number, url, file_upload, image_upload, date, time, datetime, multiple_choice, rating, slider, lat_long, province, factory)
- Drag-and-drop builder with conditional visibility
- Full CRUD operations with dual-write system (EAV + Dynamic Tables)
- Sub-forms support with nested relationships

### ✅ User Experience
- Modern UI: ShadCN components, glass morphism, animated buttons
- Mobile-first responsive design (8px grid, 44px+ touch targets)
- Thai localization (province selector, phone/date formatting)
- Toast notification system with enhanced UX
- Date field filtering with auto-detection

### ✅ Authentication & Security
- RBAC with 8 roles (super_admin, admin, moderator, customer_service, sale, marketing, inventory, general_user)
- 2FA authentication with trusted devices (24-hour cookies)
- Token refresh working (7-day sessions, no false logouts)
- Smart token redirect (return to original page after re-login)

### ✅ Integrations
- **Telegram**: Notifications, field ordering, custom templates (Bot: "QKnowledgebot")
- **File Management**: MinIO integration with thumbnails, presigned URLs, smart downloads
- **Translation**: MyMemory API for Thai→English (real-time, excellent quality)
- **Real-time**: WebSocket service for live updates

### ✅ Performance Optimizations
- Image stability (React.memo prevents unnecessary re-renders)
- Progressive loading architecture (95% bandwidth reduction target)
- Mobile-friendly tables (56-64px rows, adaptive fonts)
- Navigation arrows optimized (md: breakpoint, visible on tablets+)
- Portrait images optimized (50% size reduction, max-h-[35vh])
- Token refresh working correctly (no false logouts)

---

## Latest Updates - v0.7.40-dev (2025-10-19)

### ✅ Field Visibility & Conditional Formula System
**Status**: ✅ Complete and Working

**Features Implemented:**
- ✅ Field visibility checkbox working correctly (show/hide fields)
- ✅ Conditional formula support using FormulaEngine (Google AppSheet-compatible)
- ✅ Three-state visibility system:
  - **Checked**: Always show field
  - **Unchecked without formula**: Always hide field
  - **Unchecked with formula**: Show field based on condition evaluation
- ✅ Real-time field visibility updates in FormView
- ✅ Support for complex formulas: AND, OR, NOT, IF, CONTAINS, ISBLANK, etc.
- ✅ Thai field name support in formulas using `[ชื่อฟิลด์]` syntax
- ✅ Filter bar UI improvements (compact, fixed height 44px)

**Bugs Fixed:**
1. **Inverted boolean logic** in checkbox onChange handler (`EnhancedFormBuilder.jsx:483`)
   - Changed from `enabled: !isVisible` to `enabled: isAlwaysVisible ? undefined : false`
2. **Null value assignment** issue (`EnhancedFormBuilder.jsx:1736`)
   - Used conditional spread to only add property if it exists
3. **Missing camelCase→snake_case conversion** (`EnhancedFormBuilder.jsx:1780-1788`)
   - Added conversion from `showCondition` to `show_condition` for backend
4. **Variable scoping error** during destructuring (`EnhancedFormBuilder.jsx:1757-1759`)
   - Saved values BEFORE destructuring to prevent undefined errors
5. **Debug log filter** using wrong property (`EnhancedFormBuilder.jsx:1876`)
   - Changed from `f.showCondition` to `f.show_condition`
6. **⭐ Backend toJSON() missing mapping** (`Field.js:366-370`) - **Root Cause**
   - Added `show_condition` → `showCondition` mapping in Field model

**Files Modified:**
- `backend/models/Field.js` - Added show_condition mapping in toJSON()
- `src/components/EnhancedFormBuilder.jsx` - Fixed checkbox logic and data serialization
- `src/components/FormSubmissionList.jsx` - Compact filter bar UI (44px fixed height)

**Formula Syntax Examples:**
```javascript
// Simple comparison
[สถานะ] = "ปิดการขายได้"
[ยอดขาย] > 100000

// Logical operators
OR([สถานะ] = "ชนะ", [สถานะ] = "ปิดการขายได้")
AND(ISNOTBLANK([คะแนน]), [คะแนน] > 3)

// String functions
CONTAINS([ชื่อลูกค้า], "VIP")

// Complex conditions
IF([ยอดขาย] > 100000, TRUE, [สถานะ] = "VIP")
```

**Technical Implementation:**
- FormView evaluates formulas using `formulaEngine.evaluate()` on every input change
- Visibility state updated in real-time via `updateFieldVisibility()` callback
- Backend saves `show_condition` as JSONB: `{"enabled": false, "formula": "[field] = value"}`
- Console logs show formula evaluation results for debugging

---

## Previous Updates - v0.7.36-dev (2025-10-19)

### ✅ Custom Date Field Filtering & Sorting with EAV Model
**Status**: ✅ Complete and Working

**Problem Solved:**
- Server-side filtering and sorting for submissions using custom date fields
- EAV (Entity-Attribute-Value) model compatibility for dynamic field sorting
- Fixed Sequelize "Submission->Submission" error when counting with JOINs

**Backend Changes (`backend/services/SubmissionService.js`):**

1. **Custom Field Sorting with LEFT JOIN** (lines 714-734)
   - Changed from subquery to LEFT JOIN approach for better Sequelize compatibility
   - Uses `sortFieldData` association to join `submission_data` table
   - Sorts by `value_text` column with proper ORDER BY clause

2. **Separate Count & FindAll Queries** (lines 764-782)
   - Fixed "missing FROM-clause entry for table Submission->Submission" error
   - Separated `count()` and `findAll()` to avoid `col` parameter issues
   - Count query runs without JOINs for accurate totals
   - FindAll includes all necessary associations for data display

**Features:**
- ✅ Date field selector modal (dropdown-style, gear icon trigger)
- ✅ Auto-select date field when only one exists
- ✅ Month/year filtering using custom date fields (not just submittedAt)
- ✅ Sorting by submittedAt or any custom field (works with EAV model)
- ✅ Correct pagination with accurate total counts
- ✅ Tooltips showing active filter field
- ✅ Default filter: current month/year
- ✅ Multiple date/datetime field support
- ✅ Always includes "วันที่บันทึกข้อมูล" (submittedAt) option
- ✅ Responsive design (mobile + desktop)

**Technical Details:**
```javascript
// Custom field sorting (LEFT JOIN approach)
sortInclude = {
  model: SubmissionData,
  as: 'sortFieldData',
  where: { field_id: sortBy },
  required: false,
  duplicating: false,
};

// Separate count & findAll
const count = await Submission.count({ where, distinct: true });
const rows = await Submission.findAll({
  where,
  include: includeArray,
  order: orderClause,
  limit,
  offset,
});
```

**Files Modified:**
- `backend/services/SubmissionService.js` (Custom field sorting, separate count/findAll)
- `backend/models/Submission.js` (Added sortFieldData association)
- `backend/api/routes/submission.routes.js` (Pass filter parameters)
- `src/components/FormSubmissionList.jsx` (Frontend filtering UI)

**Benefits:**
- 📊 Filter submissions by any date field, not just submission date
- 🔄 Sort by custom fields stored in EAV model
- ✅ Accurate pagination even with complex JOINs
- 🚀 Better UX with tooltips and auto-detection

---

## Previous Updates - v0.7.35-dev (2025-10-17)

### ✅ Enhanced FormSubmissionList UI
- Date field selector modal implementation
- Month filter dropdown improvements
- Pagination controls component
- See v0.7.36 above for complete feature list

---

## Recent Critical Fixes (v0.7.20-v0.7.30)

### Image System
- ✅ Image flicker fixed (React.memo with custom comparison)
- ✅ Black screen on image click resolved (presignedUrl fallback)
- ✅ Duplicate API calls eliminated (useState → useRef, 97% reduction)
- ✅ Thumbnail stability improved (fileIdsString dependency)
- ✅ Navigation arrows visibility (lg: → md: breakpoint)

### Authentication
- ✅ Token refresh bug fixed (storage key mismatch resolved)
- ✅ 7-day sessions working correctly
- ✅ No false logouts
- ✅ Smart redirect after re-login

### Mobile Testing
- ✅ ngrok setup working (single tunnel: Frontend → React Proxy → Backend)
- ✅ CORS trailing slash normalization
- ✅ HOST=0.0.0.0 configuration
- ✅ Mobile-friendly tables and touch targets

---

## Quick Start

### Development
```bash
# Start Docker services
docker-compose up -d

# Start backend (from project root)
cd backend && npm start

# Start frontend (new terminal, from project root)
npm start
```

### Production Build
```bash
npm run build
npm run lint
```

### Testing
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/v1
- API Docs: http://localhost:5000/api/v1/docs

---

## Architecture

### Components
- **MainFormApp**: Main router and state management
- **EnhancedFormBuilder**: Drag-and-drop form creator
- **FormView**: Public form display and submission
- **FormSubmissionList**: Data table with filters and pagination
- **SubmissionDetail**: Individual submission view with edit mode

### Design System
- **Primary Color**: Orange (#f97316)
- **Grid System**: 8px base grid
- **Touch Targets**: Minimum 44px (mobile-friendly)
- **Style**: Glass morphism with backdrop blur
- **Responsive**: Mobile-first approach

### Data Flow
```
User Input → FormView → SubmissionService
  ↓
Dual-Write System:
  1. EAV Tables (submission_data)
  2. Dynamic Tables (form_[tablename])
  ↓
PowerBI Ready (Thai-English column names)
```

---

## Configuration

### Environment Variables

**Frontend** (`.env`):
```env
HOST=0.0.0.0
REACT_APP_API_URL=/api/v1
```

**Backend** (`backend/.env`):
```env
# Required
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qcollector_dev_2025
DB_USER=postgres
DB_PASSWORD=qcollector_dev_2025
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
JWT_SECRET=[your-secret]
JWT_REFRESH_SECRET=[your-refresh-secret]

# Optional
TELEGRAM_BOT_TOKEN=[your-token]
TELEGRAM_GROUP_ID=[your-group-id]
```

### Important Notes
- **Telegram**: Bot Token และ Group ID ใน .env (ไม่เปิดเผย)
- **Super Admin**: สร้างผ่าน script หรือ seed data
- **Servers**: ตรวจสอบ Claude Code process ก่อน restart
- **DO NOT kill Claude process** when restarting servers
- สามารถให้ใช้ playwright mcp ช่วยตรวจสอบ console log ได้เลย

---

## Development Guidelines

### When Modifying Forms/Submissions
1. Always use stable dependencies in useEffect
2. Use useRef for tracking state that doesn't trigger re-renders
3. Add null checks in React.memo comparison functions
4. Test on both mobile and desktop viewports

### When Working with Images
1. Use presignedUrl as fallback for blob URLs
2. Add min-height to containers to prevent layout shifts
3. Use fileIdsString (not files array) as useEffect dependency
4. Implement proper cleanup in useEffect return

### When Adding Features
1. Follow mobile-first responsive design
2. Use API endpoints (not localStorage)
3. Add proper error handling and loading states
4. Test with ngrok for mobile compatibility

---

## Known Issues & Solutions

### Issue: Forms/Submissions Not Loading
- **Check**: Token expiry, API endpoints, database connection
- **Solution**: Check browser console, backend logs, verify token refresh

### Issue: Images Not Displaying
- **Check**: MinIO connection, blob URL loading, presignedUrl fallback
- **Solution**: Verify FileService.js blob URL generation, check network tab

### Issue: Navigation Not Working
- **Check**: React.memo blocking callbacks, stale closures
- **Solution**: Ensure callbacks not wrapped in React.memo comparison

### Issue: Mobile Testing
- **Setup**: ngrok tunnel + React proxy
- **Config**: HOST=0.0.0.0, proxy in package.json, CORS origins

---

## Project Structure

```
24Sep25/
├── backend/
│   ├── api/
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth, RBAC, validation
│   │   └── server.js        # Express app
│   ├── models/              # Sequelize models
│   ├── services/            # Business logic
│   │   ├── FormService.js
│   │   ├── SubmissionService.js
│   │   ├── FileService.js
│   │   └── TelegramService.js
│   └── migrations/          # Database migrations
├── src/
│   ├── components/
│   │   ├── MainFormApp.jsx
│   │   ├── EnhancedFormBuilder.jsx
│   │   ├── FormView.jsx
│   │   ├── FormSubmissionList.jsx
│   │   ├── SubmissionDetail.jsx
│   │   └── ui/              # Reusable UI components
│   ├── contexts/            # React contexts
│   ├── services/            # Frontend API clients
│   └── utils/               # Helper functions
├── docker-compose.yml       # Docker services
├── CLAUDE.md               # This file
├── qtodo.md                # Current tasks and status
└── package.json            # Dependencies
```

---

## Version History

**Current**: v0.7.36-dev (2025-10-19) - Custom Date Field Filtering & Sorting
**Previous**: v0.7.35-dev → v0.7.30-dev → v0.7.20-dev → v0.7.15-dev

**Key Changes in v0.7.36:**
- Custom date field filtering (select any date/datetime field for month/year filters)
- EAV model sorting support (LEFT JOIN approach for custom fields)
- Fixed Sequelize "Submission->Submission" error with separate count/findAll
- Improved pagination accuracy with complex JOINs

**Full version history**: See `CLAUDE.md.backup-2025-10-16`
**Detailed documentation**: See individual completion files in project root

---

## License

**Internal Use** - Q-Collector Enterprise v0.7.36-dev
**Last Updated**: 2025-10-19 09:30:00 UTC+7
**Status**: ✅ OPERATIONAL & READY FOR TESTING
