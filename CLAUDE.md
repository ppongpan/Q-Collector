# Q-Collector Application Framework

**Enterprise Form Builder & Data Collection System**

## Version: 0.8.1-dev (2025-10-23)

**Stack:** React 18 + Node.js/Express + PostgreSQL + Redis + MinIO
**Target:** Thai Business Forms & Data Collection
**Status:** 🟢 Production Ready

---

## 🎯 Current Status (2025-10-23)

### Servers Running
- ✅ **Backend**: Port 5000 (Q-Collector API v0.8.1-dev)
- ✅ **Frontend**: Port 3000 (Q-Collector v0.8.1-dev)
- ✅ **Docker**: PostgreSQL 16 + Redis 7 + MinIO

### Recent Completions (Latest First)
- ✅ **UserPreference Model Registration** - Fixed HTTP 500 errors in submission list (2025-10-24)
- ✅ **PDPA Consent Edit UX Fix** - Manual save pattern (no auto-save) + Select-all text (2025-10-23)
- ✅ **PDPA Consent Management** - Consent-first UX + Backend field name fix (2025-10-23)
- ✅ **Data Masking System** - Privacy protection for phone/email (2025-10-23)
- ✅ **Security Enhancements** - XSS protection + Rate limiting (2025-10-23)
- ✅ **User Preferences Infrastructure** - Database persistence working correctly
- ✅ **Moderator Role Removal** - System now has 18 roles (down from 19)
- ✅ **Conditional Formatting System** - Formula-based field styling (v0.7.44)
- ✅ **Number Field Formatting** - User-configurable decimal places (v0.7.42)
- ✅ **Field Visibility System** - Formula-based conditional visibility (v0.7.40)

**Access Points:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/v1
- API Docs: http://localhost:5000/api/v1/docs

---

## Core Features

### ✅ Form Management
- **17 Field Types**: short_answer, paragraph, email, phone, number, url, file_upload, image_upload, date, time, datetime, multiple_choice, rating, slider, lat_long, province, factory
- **Drag-and-Drop Builder** with conditional visibility (formula-based)
- **Dual-Write System**: EAV Tables + Dynamic Tables (PowerBI ready)
- **Sub-Forms Support** with nested relationships
- **Conditional Formatting**: Formula-based field styling with 22 preset colors

### ✅ PDPA Compliance
- **Privacy Notice**: Custom text or external link with acknowledgment checkbox
- **Consent Management**: Multi-item consent system with purpose and retention period
- **Data Masking**: Phone/email masking with interactive reveal (3-second timeout)
- **Consent-First UX**: Consent items appear BEFORE form fields

### ✅ User Experience
- **Modern UI**: ShadCN components, glass morphism, orange/green neon glow effects
- **Responsive Design**: Mobile-first (8px grid, 44px+ touch targets)
- **Thai Localization**: Province selector, phone/date formatting
- **Toast System**: Enhanced notifications with longer duration for complex errors
- **Navigation Arrows**: Filter/sort-aware navigation in Detail View

### ✅ Authentication & Security
- **RBAC**: 18 roles with granular permissions
- **2FA**: TOTP authentication with trusted devices (24-hour cookies)
- **Token Refresh**: 7-day sessions, no false logouts
- **XSS Protection**: Backend sanitization + Frontend DOMPurify
- **Rate Limiting**: Redis-based with graceful in-memory fallback
- **Smart Redirect**: Return to original page after re-login

### ✅ Integrations
- **Telegram**: Notifications, field ordering, custom templates (Bot: "QKnowledgebot")
- **File Management**: MinIO with thumbnails, presigned URLs, smart downloads
- **Translation**: MyMemory API for Thai→English (real-time)
- **Real-time**: WebSocket service for live updates

---

## Latest Update - UserPreference Model Registration Fix (v0.8.1-dev)

### Problem: HTTP 500 Errors in Submission List
**Date**: 2025-10-24
**Impact**: User preferences API endpoints failing, forcing localStorage fallback

**Error Symptoms**:
```javascript
❌ Cannot read properties of undefined (reading 'findOne')
❌ Cannot read properties of undefined (reading 'upsert')
❌ column "submittedAt" does not exist
```

### Root Causes Identified

**Issue 1: Missing Model Registration**
- **File**: `backend/models/index.js`
- **Problem**: UserPreference model existed but wasn't registered in the models object
- **Result**: `UserPreference.findOne()` and `UserPreference.upsert()` returned `undefined`

**Issue 2: Field Name Mismatch (camelCase vs snake_case)**
- **File**: `backend/services/UserPreferenceService.js`
- **Problem**: Using camelCase (`formId`, `submittedAt`) but database uses snake_case
- **Root Cause**: Submission model has `underscored: false` setting
- **Result**: PostgreSQL error "column 'submittedAt' does not exist"

### Fixes Applied

**Fix 1: Register UserPreference Model**
- **File**: `backend/models/index.js`
- Added line 29: `const UserPreference = require('./UserPreference');`
- Added line 58: `UserPreference: UserPreference(sequelize, Sequelize.DataTypes),`
- **Result**: Model now properly initialized with Sequelize

**Fix 2: Convert to snake_case in Service**
- **File**: `backend/services/UserPreferenceService.js`
- Lines 128, 183: `formId` → `form_id`
- Lines 129-130, 137, 141, 163, 184-188: `submittedAt` → `submitted_at`
- **Result**: Queries now match actual database column names

### Testing & Verification
- ✅ Backend server restarted successfully
- ✅ No UserPreference-related errors in server logs
- ✅ User preferences API endpoints responding correctly
- ✅ Database persistence working (no localStorage fallback needed)

### Impact
- **Before**: HTTP 500 errors, localStorage fallback, preferences not persisted across devices
- **After**: Full database persistence, preferences sync across sessions, stable API responses

---

## Previous Update - PDPA Consent Management (v0.8.1-dev)

### Backend Fix - Field Name Mismatch
**File**: `backend/api/routes/consent.routes.js` (lines 134-146)
- **Problem**: HTTP 500 when creating consent items
- **Root Cause**: camelCase field names but model expects snake_case (`underscored: true`)
- **Fix**: Converted all fields: `formId` → `form_id`, `titleTh` → `title_th`, etc.
- **Result**: ✅ Consent item creation working

### Manual Save Pattern for Consent Item Editing
**File**: `src/components/pdpa/ConsentItemCard.jsx`
- **Problem**: Auto-save was too fast (800ms debounce), users couldn't finish editing
- **Solution**: Removed auto-save, implemented Manual Save Pattern with explicit buttons
- **Result**: ✅ Better UX with Save/Cancel buttons and unsaved changes warning

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

## Configuration

### Environment Variables

**Frontend** (`.env`):
```env
HOST=0.0.0.0
REACT_APP_API_URL=/api/v1
```

**Backend** (`backend/.env`):
```env
# Database (Required)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qcollector_dev_2025
DB_USER=postgres
DB_PASSWORD=qcollector_dev_2025

# Redis (Required)
REDIS_URL=redis://localhost:6379

# MinIO (Required)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# JWT (Required)
JWT_SECRET=[your-secret]
JWT_REFRESH_SECRET=[your-refresh-secret]

# Telegram (Optional)
TELEGRAM_BOT_TOKEN=[your-token]
TELEGRAM_GROUP_ID=[your-group-id]

# Security (Optional)
LOG_SANITIZATION=false
RATE_LIMIT_LOGIN_MAX_ATTEMPTS=5
RATE_LIMIT_WINDOW_MS=900000
```

### Important Notes
- **Telegram**: Bot Token และ Group ID ใน .env (ไม่เปิดเผย)
- **Super Admin**: สร้างผ่าน script หรือ seed data
- **Servers**: ตรวจสอบ Claude Code process ก่อน restart
- **DO NOT kill Claude process** when restarting servers

---

## Architecture

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

### Design System
- **Primary Color**: Orange (#f97316)
- **Grid System**: 8px base grid
- **Touch Targets**: Minimum 44px (mobile-friendly)
- **Style**: Glass morphism with backdrop blur
- **Responsive**: Mobile-first approach

---

## Project Structure

```
24Sep25/
├── backend/
│   ├── api/
│   │   ├── routes/          # API endpoints
│   │   ├── middleware/      # Auth, RBAC, sanitization, rate limiting
│   │   └── server.js        # Express app
│   ├── models/              # Sequelize models
│   ├── services/            # Business logic
│   └── migrations/          # Database migrations
├── src/
│   ├── components/
│   │   ├── MainFormApp.jsx
│   │   ├── EnhancedFormBuilder.jsx
│   │   ├── FormView.jsx
│   │   ├── FormSubmissionList.jsx
│   │   ├── SubmissionDetail.jsx
│   │   ├── pdpa/            # PDPA components
│   │   └── ui/              # Reusable UI components
│   ├── contexts/            # React contexts
│   ├── services/            # Frontend API clients
│   └── utils/               # Helper functions
├── docker-compose.yml       # Docker services
├── CLAUDE.md               # This file (v0.8.1-dev)
├── CLAUDE.md.backup-2025-10-23  # Full backup (1,779 lines)
├── qtodo.md                # Current tasks and status
└── package.json            # Dependencies
```

---

## Known Issues & Solutions

### Issue: Forms/Submissions Not Loading
- **Check**: Token expiry, API endpoints, database connection
- **Solution**: Check browser console, backend logs, verify token refresh

### Issue: Images Not Displaying
- **Check**: MinIO connection, blob URL loading, presignedUrl fallback
- **Solution**: Verify FileService.js blob URL generation, check network tab

### Issue: Mobile Testing
- **Setup**: ngrok tunnel + React proxy
- **Config**: HOST=0.0.0.0, proxy in package.json, CORS origins

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

### Backend Naming Conventions
- **Models**: Use `underscored: true` for snake_case column names
- **Routes**: Convert camelCase → snake_case when calling model methods
- **API Responses**: toJSON() handles snake_case → camelCase conversion

---

## Security

### Implemented (v0.8.1-dev)
- ✅ **XSS Protection**: Backend (sanitize-html) + Frontend (DOMPurify)
- ✅ **Rate Limiting**: Redis-based with in-memory fallback
- ✅ **Input Validation**: express-validator on all endpoints
- ✅ **SQL Injection**: Sequelize parameterized queries
- ✅ **Authentication**: JWT + 2FA + bcrypt (12 rounds)
- ✅ **Authorization**: RBAC with 18 roles
- ✅ **Data Encryption**: AES-256-GCM for PII
- ✅ **Security Headers**: Helmet.js with CSP
- ✅ **CORS**: Origin validation

### Security Rating: 8/10 (Excellent)

---

## Version History

**Current**: v0.8.1-dev (2025-10-23) - PDPA Consent Management UX + Backend Fix
**Previous**: v0.8.0-dev (2025-10-21) - Orange & Green Neon Glow Effects System
**Previous**: v0.7.45-dev (2025-10-20) - Filter/Sort-Aware Navigation
**Previous**: v0.7.44-dev (2025-10-20) - Conditional Formatting System
**Previous**: v0.7.42-dev (2025-10-19) - Number Field Formatting Options
**Previous**: v0.7.41-dev (2025-10-19) - Formula Validation & Toast Alerts
**Previous**: v0.7.40-dev (2025-10-19) - Field Visibility & Conditional Formulas

**Full version history**: See `CLAUDE.md.backup-2025-10-23` (1,779 lines)

---

## License

**Internal Use** - Q-Collector Enterprise v0.8.1-dev
**Last Updated**: 2025-10-23 18:30:00 UTC+7
**Status**: ✅ OPERATIONAL & READY FOR TESTING
**Backup**: Full history preserved in `CLAUDE.md.backup-2025-10-23`
