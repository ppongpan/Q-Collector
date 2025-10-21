# Agent Specification: Google Sheets Import Specialist

**Agent Name:** For Google Sheets import tasks, use existing specialized agents:
- **database-architect** - For database schema and models
- **api-architect** - For REST API endpoints
- **component-upgrade** - For React UI components
- **qa-migration-specialist** - For testing
- **documentation-writer** - For documentation

**Version:** 1.0.0
**Purpose:** Guide for implementing Google Sheets import functionality using existing Q-Collector agents
**Sprint Coverage:** Sprint 10-11 (4-5 weeks)

---

## Implementation Strategy Using Existing Agents

### Phase 1: Database Foundation (Week 1, Days 1-2)
**Use Agent:** `database-architect`

**Tasks:**
1. Create 3 database tables:
   - `sheet_import_configs`
   - `sheet_import_history`
   - `google_auth_tokens`

2. Create Sequelize models with associations

3. Write database migrations

4. Add indexes for performance

**Example Invocation:**
```javascript
Task: "Create database schema for Google Sheets import system"
Agent: database-architect
Prompt: "Implement 3 tables for Google Sheets import:
1. sheet_import_configs (stores import configuration)
2. sheet_import_history (tracks import execution)
3. google_auth_tokens (OAuth2 tokens, encrypted)

Include all fields from GOOGLE-SHEETS-IMPORT-SYSTEM-PLAN.md section 'Database Schema'.
Create Sequelize models and migrations."
```

---

### Phase 2: Backend Services (Week 1, Days 3-5)
**Use Agent:** `integration-specialist`

**Tasks:**
1. Implement GoogleSheetsService.js:
   - OAuth2 flow
   - Token encryption
   - Fetch sheet data
   - Field type detection

2. Implement SheetImportService.js:
   - Import validation
   - Import execution
   - Rollback functionality

**Example Invocation:**
```javascript
Task: "Create Google Sheets backend services"
Agent: integration-specialist
Prompt: "Implement GoogleSheetsService.js and SheetImportService.js
following the architecture in GOOGLE-SHEETS-IMPORT-SYSTEM-PLAN.md.

Include:
- OAuth2 with googleapis library
- AES-256 encryption for tokens
- Field type detection (email, phone, number, date, URL)
- Bulk import with validation
- Transaction-safe rollback"
```

---

### Phase 3: REST API Endpoints (Week 2, Days 1-3)
**Use Agent:** `api-architect`

**Tasks:**
1. Create 11 API endpoints in `backend/api/routes/sheets.routes.js`
2. Add authentication middleware
3. Add validation for inputs
4. Error handling

**Example Invocation:**
```javascript
Task: "Create Google Sheets API endpoints"
Agent: api-architect
Prompt: "Create backend/api/routes/sheets.routes.js with 11 endpoints:

1. GET /api/sheets/auth/google/url
2. POST /api/sheets/auth/google/callback
3. GET /api/sheets/auth/status
4. POST /api/sheets/preview
5. POST /api/sheets/configs
6. GET /api/sheets/configs
7. GET /api/sheets/configs/:id/preview
8. POST /api/sheets/configs/:id/execute
9. GET /api/sheets/history
10. POST /api/sheets/history/:id/rollback
11. DELETE /api/sheets/configs/:id

Follow API design from GOOGLE-SHEETS-IMPORT-SYSTEM-PLAN.md"
```

---

### Phase 4: Frontend Wizard UI (Week 3, Days 1-4)
**Use Agent:** `component-upgrade`

**Tasks:**
1. Create wizard container component
2. Create 5 step components
3. Create supporting UI components
4. Add to User Profile menu

**Example Invocation:**
```javascript
Task: "Build Google Sheets import wizard UI"
Agent: component-upgrade
Prompt: "Create React components for Google Sheets import wizard:

Components to create:
1. src/components/sheets/GoogleSheetsImport.jsx (main wizard)
2. src/components/sheets/SheetConnectionStep.jsx
3. src/components/sheets/SheetSelectionStep.jsx
4. src/components/sheets/FieldMappingStep.jsx
5. src/components/sheets/ImportPreviewStep.jsx
6. src/components/sheets/ImportProgressStep.jsx

UI Requirements:
- Use GlassCard, GlassButton components
- Framer Motion animations
- Mobile-responsive design
- Visual stepper with 5 steps

Add 'นำเข้าจาก Google Sheets' menu item to User Profile dropdown.

Reference: GOOGLE-SHEETS-IMPORT-SYSTEM-PLAN.md for complete UI specs"
```

---

### Phase 5: Testing (Week 4, Days 1-3)
**Use Agent:** `qa-migration-specialist`

**Tasks:**
1. Write unit tests for services
2. Write integration tests
3. Write E2E tests with Playwright
4. Performance testing

**Example Invocation:**
```javascript
Task: "Test Google Sheets import system"
Agent: qa-migration-specialist
Prompt: "Create comprehensive tests for Google Sheets import:

1. Unit tests:
   - GoogleSheetsService methods
   - SheetImportService validation
   - Field type detection accuracy

2. Integration tests:
   - Full import flow
   - Error handling
   - Rollback functionality

3. E2E tests (Playwright):
   - Complete wizard flow
   - Field mapping UI
   - Import progress tracking

4. Performance tests:
   - Import 1000 rows benchmark
   - Memory usage profiling

Target: >85% test coverage
Generate test report with metrics"
```

---

### Phase 6: Documentation (Week 4, Days 4-5)
**Use Agent:** `documentation-writer`

**Tasks:**
1. API documentation
2. User guide
3. Developer guide
4. Update CLAUDE.md

**Example Invocation:**
```javascript
Task: "Document Google Sheets import system"
Agent: documentation-writer
Prompt: "Create comprehensive documentation:

1. API Documentation:
   - All 11 endpoints
   - Request/response examples
   - Error codes

2. User Guide:
   - How to connect Google account
   - How to import data
   - Troubleshooting common issues

3. Developer Guide:
   - Architecture overview
   - How to extend field type detection
   - How to add new import sources

4. Update CLAUDE.md with v0.8.0 features"
```

---

## Key Technical Decisions

### 1. Google OAuth2 Implementation
- Use `googleapis` npm package
- Scope: `https://www.googleapis.com/auth/spreadsheets.readonly`
- Token storage: Encrypted with AES-256
- Refresh token automatic renewal

### 2. Field Type Detection Algorithm
- Analyze first 10 rows for patterns
- Confidence score (0-1)
- Fallback to `short_answer` if uncertain
- Priority: Email > Phone > Number > Date > URL > Text

### 3. Import Validation Strategy
- Validate all rows before any insert
- Option to skip invalid rows or abort
- Show errors with row numbers
- Transaction rollback on critical errors

### 4. UI/UX Design
- 5-step wizard with visual stepper
- Glass morphism design (consistent with Q-Collector)
- Real-time progress indicator
- Preview before import (first 10 rows)
- Mobile-friendly responsive design

---

## Environment Variables Required

Add to `.env`:
```bash
# Google OAuth2
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/sheets/auth/callback

# Encryption for tokens
ENCRYPTION_KEY=generate_32_byte_hex_key_here
# Generate with: node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

---

## Dependencies to Install

**Backend:**
```bash
npm install googleapis
# crypto is Node.js built-in, no install needed
```

**Frontend:**
```bash
# No new dependencies - use existing:
# - framer-motion (animations)
# - react-beautiful-dnd or @dnd-kit (drag-drop mapping)
```

---

## Testing Checklist

### Before Deployment:
- [ ] OAuth2 flow works in development
- [ ] OAuth2 flow works in production (HTTPS)
- [ ] Token encryption/decryption verified
- [ ] Token refresh works automatically
- [ ] Field type detection >80% accurate
- [ ] Import 100 rows completes successfully
- [ ] Import 1000 rows completes <30 seconds
- [ ] Validation catches all invalid data
- [ ] Rollback deletes all imported submissions
- [ ] UI works on mobile (iPhone, Android)
- [ ] UI works on desktop (Chrome, Firefox, Safari)
- [ ] Error messages are user-friendly (Thai language)
- [ ] Import history displays correctly
- [ ] Multiple users can import simultaneously
- [ ] User profile menu displays new link

---

## Common Issues & Solutions

### Issue 1: Google OAuth2 Popup Blocked
**Solution:** Add instructions for users to allow popups, provide alternative redirect flow

### Issue 2: Token Expired During Import
**Solution:** Automatic token refresh in GoogleSheetsService, retry failed requests

### Issue 3: Large Imports Timeout
**Solution:** Implement queue system for imports >1000 rows, use Bull/Redis

### Issue 4: Field Type Detection Inaccurate
**Solution:** Allow manual override, improve detection algorithms based on user feedback

### Issue 5: Memory Leak During Import
**Solution:** Process rows in batches (100 rows per batch), clear memory between batches

---

## Success Criteria

**Functional:**
- ✅ User can authenticate with Google
- ✅ User can import data from any Google Sheet
- ✅ Field types auto-detected correctly (>80% accuracy)
- ✅ User can override field types
- ✅ Import supports main forms and sub-forms
- ✅ Invalid data is caught before import
- ✅ User can rollback imports
- ✅ Import history is tracked

**Performance:**
- ✅ 100 rows: <5 seconds
- ✅ 1000 rows: <30 seconds
- ✅ Memory usage: <200MB per import

**UX:**
- ✅ Wizard flow is intuitive
- ✅ Error messages are clear
- ✅ Progress indicator is accurate
- ✅ UI is mobile-friendly
- ✅ Thai language throughout

---

## Next Steps After Implementation

1. **User Feedback Collection**
   - Create feedback form
   - Track feature usage analytics
   - Monitor error rates

2. **Iterative Improvements**
   - Improve field type detection based on patterns
   - Add support for CSV upload (local files)
   - Add support for Excel files
   - Add scheduled imports (cron jobs)

3. **Advanced Features** (Future)
   - Two-way sync (Q-Collector → Google Sheets)
   - Real-time sync with Google Sheets changes
   - Import from Airtable, Notion, etc.
   - Export to Google Sheets

---

**Document Status:** ✅ Complete
**Last Updated:** 2025-10-16
**Reviewed By:** System Architect
**Approved For:** Sprint 10-11 Implementation
