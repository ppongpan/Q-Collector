# 🎯 Q-Collector v0.8.0 - Complete Restructure & Translation Plan

## 📋 Overview

**Duration**: ~3-4 weeks
**Goal**: Clean database structure + Argos Translation integration
**Status**: Planning phase (waiting for approval)

---

## 🚨 IMMEDIATE TASKS (Week 1, Days 1-2)

### Task 1.1: Fix Current Critical Issues ⚡

**Problem 1: Submissions have NO data (SubmissionData = 0 records)**
- ✅ ROOT CAUSE FOUND: Frontend filters out sub-form fields → sends empty {} → no SubmissionData created
- ✅ FIX APPLIED: Reverted aggressive filtering in SubmissionService.js
- 🔄 STATUS: Need to test submission after browser refresh

**Problem 2: Delete button not working**
- 🔍 NEED TO INVESTIGATE: Frontend sends delete request but database not updated
- 📝 ACTION: Add logging to backend delete endpoint
- 📝 ACTION: Check if CASCADE delete is working correctly

**Problem 3: 92 orphaned dynamic tables**
- ✅ SCRIPT CREATED: `backend/scripts/cleanup-dynamic-tables.js`
- ⚠️  WARNING: Some tables have real data (my_form_2: 10 rows, q_con: 20 rows)
- 📝 ACTION: Backup before deletion

### Task 1.2: Create Safe Cleanup Script

```javascript
// Only delete:
// 1. Test tables (form_e2e_test_*, form_delete_test_*, form_crud_sequence_*)
// 2. Empty sub-form tables (chueo_subform_*, kijkrrmyoy_*, etc.)
// 3. Orphaned form tables (where forms.id doesn't exist)

// DO NOT delete:
// 1. sessions, system_settings, telegram_settings, trusted_devices
// 2. translation_api_usage
// 3. Tables with real data (unless user confirms)
```

---

## 📊 PHASE 1: Database Restructure (Week 1-2)

### 1.1 Design Review (Day 3)
- ✅ Review `docs/Database-Restructure-Plan.md`
- ✅ Get stakeholder approval
- ✅ Finalize schema design

### 1.2 Create New Schema (Day 4-5)
```sql
-- Main form tables
CREATE TABLE main_form_fields ...
CREATE TABLE main_submissions ...
CREATE TABLE main_submission_data ...

-- Sub-form tables
CREATE TABLE sub_form_fields ...
CREATE TABLE sub_submissions ...
CREATE TABLE sub_submission_data ...
```

### 1.3 Data Migration (Day 6-7)
- Backup existing database
- Migrate main form data
- Migrate sub-form data
- Verify data integrity
- Create dynamic tables for sub-forms

### 1.4 Update Sequelize Models (Day 8-9)
- Create MainFormField, MainSubmission, MainSubmissionData models
- Create SubFormField, SubSubmission, SubSubmissionData models
- Update associations
- Test model operations

---

## 🌐 PHASE 2: Argos Translation Integration (Week 2)

### 2.1 Docker Setup (Day 10-11)
- ✅ Dockerfile created: `docker/argos-translate/Dockerfile`
- ✅ FastAPI service created: `translate_service.py`
- ✅ Docker Compose config: `docker-compose.yml`
- 📝 BUILD: `docker build -t qcollector-argos-translate:1.0 .`
- 📝 TEST: `curl http://localhost:8765/translate`

### 2.2 Node.js Integration (Day 12)
- ✅ ArgosTranslationService.js created
- ✅ HybridTranslationService.js created (4-tier system)
- 📝 TEST: Translate Thai→English
- 📝 VERIFY: Translation quality

### 2.3 Database Translation Cache (Day 13)
```sql
CREATE TABLE translation_cache (
  id UUID PRIMARY KEY,
  thai_text VARCHAR(255) UNIQUE,
  english_text VARCHAR(255),
  source VARCHAR(50),  -- 'dictionary', 'argos', 'mymemory'
  context VARCHAR(100),
  usage_count INTEGER DEFAULT 1,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔧 PHASE 3: API & Backend Updates (Week 2-3)

### 3.1 Separate API Endpoints (Day 14-15)
```javascript
// Main forms
POST   /api/v1/forms                 // Create main form
GET    /api/v1/forms/:id             // Get main form
POST   /api/v1/forms/:id/submissions // Create main submission
GET    /api/v1/forms/:id/submissions // List main submissions

// Sub-forms
POST   /api/v1/subforms                    // Create sub-form
GET    /api/v1/subforms/:id                // Get sub-form
POST   /api/v1/subforms/:id/submissions    // Create sub-submission
GET    /api/v1/subforms/:id/submissions    // List sub-submissions
```

### 3.2 Update Services (Day 16)
- MainFormService.js
- SubFormService.js
- MainSubmissionService.js
- SubSubmissionService.js
- DynamicTableService.js (support both main & sub)

---

## 🎨 PHASE 4: Frontend Updates (Week 3)

### 4.1 Update Components (Day 17-19)
- EnhancedFormBuilder.jsx → handle new structure
- FormSubmissionList.jsx → separate main/sub lists
- SubFormView.jsx → use new sub-submission API
- SubmissionDetail.jsx → display correctly

### 4.2 Fix Toggle Button Issue (Day 20)
- Root cause: Field update replaces entire field array
- Fix: Update only changed field, preserve others
- Add optimistic UI updates
- Test: Toggle one field doesn't affect others

---

## 🧪 PHASE 5: Testing & Migration (Week 4)

### 5.1 Automated Tests (Day 21-22)
- Unit tests for new models
- Integration tests for API endpoints
- E2E tests for form creation/submission
- Translation service tests

### 5.2 Data Migration (Day 23)
- Run migration scripts
- Verify all data migrated correctly
- Test form creation/submission
- Test PowerBI connections

### 5.3 Deployment (Day 24)
- Backup production database
- Deploy to staging
- Run smoke tests
- Deploy to production
- Monitor for errors

---

## 📚 DOCUMENTATION & TRAINING

### Documentation to Create:
1. ✅ Database-Restructure-Plan.md (DONE)
2. ✅ Argos-Translation-Integration-Plan.md (DONE)
3. 📝 API-Documentation-v0.8.md
4. 📝 Migration-Guide-v0.7-to-v0.8.md
5. 📝 PowerBI-Integration-Guide.md
6. 📝 Argos-Translation-Setup-Guide.md

### Training Materials:
1. 📝 User Guide: Creating Forms with Translations
2. 📝 Admin Guide: Managing Translations
3. 📝 Developer Guide: Extending Translation Service

---

## 🎯 DECISION POINTS

### Decision 1: Docker vs SSH for Argos Translate?
**Options:**
- A) Docker container on same server (RECOMMENDED)
  - ✅ Easier deployment
  - ✅ Better isolation
  - ✅ Reproducible environment

- B) SSH to remote Linux server
  - ✅ No Docker required
  - ❌ Network dependency
  - ❌ Harder to scale

**RECOMMENDATION: Docker (Option A)**

### Decision 2: When to translate?
**Options:**
- A) On form creation (immediate)
  - ✅ Instant table creation
  - ❌ Slower form creation

- B) Background job (queued)
  - ✅ Fast form creation
  - ❌ Delay before table ready

- C) Lazy (on first PowerBI query)
  - ✅ Fastest form creation
  - ❌ First query slow

**RECOMMENDATION: Option A (immediate translation)**

### Decision 3: What to do with existing forms?
**Options:**
- A) Migrate all at once
  - ✅ Clean break
  - ❌ Long downtime

- B) Migrate gradually
  - ✅ No downtime
  - ❌ Dual system complexity

**RECOMMENDATION: Option A (clean migration)**

---

## 📊 RESOURCE REQUIREMENTS

### Infrastructure:
- ✅ PostgreSQL 14+ (already have)
- ✅ Redis (already have)
- ✅ Node.js 18+ (already have)
- 🔄 Docker + Docker Compose (need to install)
- 🔄 Python 3.11 (for Argos in Docker)

### Storage:
- Translation cache: ~10MB (500 translations)
- Argos models: ~200MB (Thai-English)
- Dynamic tables: Existing

### Performance:
- Translation latency:
  - Dictionary: <1ms
  - Cache: ~5ms
  - Argos: ~500ms
  - MyMemory: ~1000ms

---

## 🚀 ROLLOUT PLAN

### Week 1: Preparation
- Fix current bugs
- Clean up dynamic tables
- Review and approve plan

### Week 2: Backend
- Database restructure
- Argos translation setup
- API updates

### Week 3: Frontend
- Component updates
- Bug fixes
- Testing

### Week 4: Deployment
- Migration
- Testing
- Go live

---

## ✅ SUCCESS CRITERIA

1. **Data Integrity**
   - ✅ All submissions have SubmissionData
   - ✅ Delete works correctly
   - ✅ No orphaned records

2. **Translation Quality**
   - ✅ 90%+ translations use Dictionary or Argos
   - ✅ <10% fallback to transliteration
   - ✅ All table names PostgreSQL-compliant

3. **Performance**
   - ✅ Form creation <2 seconds
   - ✅ Submission list load <1 second
   - ✅ Translation <500ms average

4. **PowerBI Integration**
   - ✅ All forms have dynamic tables
   - ✅ Column names readable in English
   - ✅ Easy JOIN between main/sub tables

---

## 🎬 NEXT ACTIONS

**FOR USER:**
1. Review this plan - Approve or request changes
2. Decide: Docker or SSH for Argos?
3. Confirm: Can we do 1-week migration?
4. Test: Submit new form to verify fix works

**FOR DEVELOPER:**
1. Wait for approval
2. Create detailed task breakdown
3. Set up project tracking
4. Start Week 1 tasks

---

## 📝 NOTES

- This is a MAJOR refactoring (~400-500 LOC changes)
- High risk of bugs if not tested thoroughly
- Recommend staging environment testing first
- Plan for rollback if needed
- Consider feature freeze during migration

