# 🗄️ Database Restructure Plan - Clean Separation of Main & Sub Forms

## 🎯 Objectives

1. **Clear Separation**: Main forms and sub-forms have completely separate submission tables
2. **Reduce Redundancy**: No duplicate data, clear parent-child relationships
3. **Easy Querying**: Simple SQL queries for PowerBI and reporting
4. **Translation Ready**: Support Argos Translation for Thai→English table/column names
5. **Backward Compatible**: Migrate existing data without loss

## 📋 Current Structure (v0.7.3) - Problems

### Current Tables

```sql
-- Forms table (main forms only)
CREATE TABLE forms (
  id UUID PRIMARY KEY,
  title VARCHAR(255),                    -- Thai: "แบบฟอร์มบันทึกข้อมูล"
  table_name VARCHAR(63),                -- English: "data_record_form_123"
  ...
);

-- Sub-forms table
CREATE TABLE sub_forms (
  id UUID PRIMARY KEY,
  form_id UUID REFERENCES forms(id),    -- Parent form
  title VARCHAR(255),                    -- Thai: "กิจกรรมย่อย"
  -- ❌ NO table_name column!
  ...
);

-- Fields table (MIXED: both main and sub-form fields)
CREATE TABLE fields (
  id UUID PRIMARY KEY,
  form_id UUID REFERENCES forms(id),    -- ⚠️ Always points to MAIN form
  sub_form_id UUID REFERENCES sub_forms(id), -- NULL = main field, NOT NULL = sub field
  type VARCHAR(50),
  title VARCHAR(255),                    -- Thai: "ชื่อเต็ม"
  show_in_table BOOLEAN DEFAULT false,
  ...
);

-- Submissions table (MIXED: both main and sub-form submissions)
CREATE TABLE submissions (
  id UUID PRIMARY KEY,
  form_id UUID,                          -- ⚠️ Can be forms.id OR sub_forms.id!
  parent_id UUID REFERENCES submissions(id), -- NULL = main, NOT NULL = sub
  user_id UUID,
  status VARCHAR(50),
  submitted_at TIMESTAMP,
  ...
);

-- Submission data (all field values)
CREATE TABLE submission_data (
  id UUID PRIMARY KEY,
  submission_id UUID REFERENCES submissions(id),
  field_id UUID REFERENCES fields(id),
  value TEXT,                            -- Encrypted if sensitive
  ...
);

-- Dynamic tables (one per main form, NO sub-form tables)
CREATE TABLE public.data_record_form_123 (
  submission_id UUID PRIMARY KEY REFERENCES submissions(id),
  user_id UUID,
  full_name_abc123 TEXT,                 -- English column name
  phone_def456 TEXT,
  created_at TIMESTAMP,
  ...
);
```

### Problems with Current Structure

1. **❌ Ambiguous form_id in submissions**
   - `form_id` can point to either `forms.id` or `sub_forms.id`
   - Need to check `parent_id` to know if it's main or sub
   - Confusing for queries

2. **❌ No dynamic tables for sub-forms**
   - Main forms get dynamic tables for PowerBI
   - Sub-forms have NO dynamic tables
   - Can't easily report on sub-form data

3. **❌ Mixed fields table**
   - Main form fields and sub-form fields in same table
   - `form_id` always points to main form (even for sub-form fields!)
   - Requires complex filtering

4. **❌ No table_name for sub-forms**
   - Can't generate dynamic tables for sub-forms
   - Sub-form data harder to query

## 🎯 Proposed Structure (v0.8.0) - Clean Separation

### New Schema Overview

```
Main Forms                     Sub-Forms
    ├── main_form_fields          ├── sub_form_fields
    ├── main_submissions          ├── sub_submissions
    ├── main_submission_data      ├── sub_submission_data
    └── dynamic_table_xxx         └── dynamic_table_yyy
```

### Detailed Schema

```sql
-- ============================================================================
-- MAIN FORMS
-- ============================================================================

-- Forms table (unchanged)
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,           -- Thai: "แบบฟอร์มบันทึกข้อมูล"
  title_en VARCHAR(255),                 -- English: "Data Record Form" (Argos)
  slug VARCHAR(100) UNIQUE,              -- "data-record-form"
  table_name VARCHAR(63),                -- "data_record_form_abc123"
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  ...
);

-- Main form fields (NEW - separate table)
CREATE TABLE main_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,           -- Thai: "ชื่อเต็ม"
  title_en VARCHAR(255),                 -- English: "Full Name" (Argos)
  column_name VARCHAR(63),               -- "full_name_abc123" (for dynamic table)
  placeholder VARCHAR(255),
  required BOOLEAN DEFAULT false,
  "order" INTEGER DEFAULT 0,
  options JSONB DEFAULT '{}',
  validation_rules JSONB DEFAULT '{}',
  show_in_table BOOLEAN DEFAULT false,   -- Show in submission list
  send_telegram BOOLEAN DEFAULT false,
  telegram_order INTEGER DEFAULT 0,
  telegram_prefix VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Main form submissions (NEW - separate table)
CREATE TABLE main_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'submitted',
  document_number VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  submitted_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Main form submission data (NEW - separate table)
CREATE TABLE main_submission_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES main_submissions(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES main_form_fields(id) ON DELETE CASCADE,
  value TEXT,
  encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(submission_id, field_id)
);

-- ============================================================================
-- SUB-FORMS
-- ============================================================================

-- Sub-forms table (ENHANCED with table_name)
CREATE TABLE sub_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,           -- Thai: "กิจกรรมย่อย"
  title_en VARCHAR(255),                 -- English: "Activity Details" (Argos)
  slug VARCHAR(100),                     -- "activity-details"
  table_name VARCHAR(63),                -- ✅ NEW: "activity_details_def456"
  description TEXT,
  order_index INTEGER DEFAULT 0,
  allow_multiple BOOLEAN DEFAULT true,
  min_entries INTEGER DEFAULT 0,
  max_entries INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sub-form fields (NEW - separate table)
CREATE TABLE sub_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_form_id UUID NOT NULL REFERENCES sub_forms(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE, -- Parent form (for reference)
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,           -- Thai: "วันที่ทำกิจกรรม"
  title_en VARCHAR(255),                 -- English: "Activity Date" (Argos)
  column_name VARCHAR(63),               -- "activity_date_xyz789" (for dynamic table)
  placeholder VARCHAR(255),
  required BOOLEAN DEFAULT false,
  "order" INTEGER DEFAULT 0,
  options JSONB DEFAULT '{}',
  validation_rules JSONB DEFAULT '{}',
  show_in_table BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sub-form submissions (NEW - separate table)
CREATE TABLE sub_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_form_id UUID NOT NULL REFERENCES sub_forms(id) ON DELETE CASCADE,
  parent_submission_id UUID NOT NULL REFERENCES main_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  submission_number INTEGER,             -- 1st, 2nd, 3rd entry
  status VARCHAR(50) DEFAULT 'submitted',
  metadata JSONB DEFAULT '{}',
  submitted_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Sub-form submission data (NEW - separate table)
CREATE TABLE sub_submission_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES sub_submissions(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES sub_form_fields(id) ON DELETE CASCADE,
  value TEXT,
  encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(submission_id, field_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Main form indexes
CREATE INDEX idx_main_form_fields_form_id ON main_form_fields(form_id);
CREATE INDEX idx_main_form_fields_order ON main_form_fields("order");
CREATE INDEX idx_main_submissions_form_id ON main_submissions(form_id);
CREATE INDEX idx_main_submissions_user_id ON main_submissions(user_id);
CREATE INDEX idx_main_submission_data_submission_id ON main_submission_data(submission_id);
CREATE INDEX idx_main_submission_data_field_id ON main_submission_data(field_id);

-- Sub-form indexes
CREATE INDEX idx_sub_form_fields_sub_form_id ON sub_form_fields(sub_form_id);
CREATE INDEX idx_sub_form_fields_form_id ON sub_form_fields(form_id);
CREATE INDEX idx_sub_submissions_sub_form_id ON sub_submissions(sub_form_id);
CREATE INDEX idx_sub_submissions_parent_id ON sub_submissions(parent_submission_id);
CREATE INDEX idx_sub_submission_data_submission_id ON sub_submission_data(submission_id);
CREATE INDEX idx_sub_submission_data_field_id ON sub_submission_data(field_id);
```

## ✅ Benefits of New Structure

### 1. Clear Separation
```sql
-- Get all main form submissions (simple!)
SELECT * FROM main_submissions WHERE form_id = 'xxx';

-- Get all sub-form submissions (simple!)
SELECT * FROM sub_submissions WHERE sub_form_id = 'yyy';

-- No more checking parent_id to distinguish!
```

### 2. Dynamic Tables for BOTH Main and Sub-forms
```sql
-- Main form dynamic table
CREATE TABLE public.data_record_form_abc123 (
  submission_id UUID PRIMARY KEY REFERENCES main_submissions(id),
  user_id UUID,
  full_name_def456 TEXT,
  email_ghi789 TEXT,
  ...
);

-- Sub-form dynamic table (NEW!)
CREATE TABLE public.activity_details_xyz123 (
  submission_id UUID PRIMARY KEY REFERENCES sub_submissions(id),
  parent_submission_id UUID,             -- Link to main submission
  user_id UUID,
  activity_date_aaa111 DATE,
  activity_name_bbb222 TEXT,
  ...
);
```

### 3. Easy PowerBI Queries
```sql
-- Get main form data with sub-form data (simple JOIN!)
SELECT
  m.*,
  s.*
FROM public.data_record_form_abc123 m
LEFT JOIN public.activity_details_xyz123 s
  ON s.parent_submission_id = m.submission_id;
```

### 4. No Redundancy
- Each submission exists in exactly ONE table
- No mixed `form_id` pointing to different entities
- Clear foreign key relationships
- Easy to understand and maintain

## 🔄 Data Migration Strategy

### Step 1: Create New Tables
```sql
-- Create all new tables
-- main_form_fields, main_submissions, main_submission_data
-- sub_form_fields, sub_submissions, sub_submission_data
```

### Step 2: Migrate Main Form Data
```sql
-- Migrate main form fields
INSERT INTO main_form_fields (id, form_id, type, title, ...)
SELECT id, form_id, type, title, ...
FROM fields
WHERE sub_form_id IS NULL;

-- Migrate main submissions
INSERT INTO main_submissions (id, form_id, user_id, ...)
SELECT id, form_id, user_id, ...
FROM submissions
WHERE parent_id IS NULL;

-- Migrate main submission data
INSERT INTO main_submission_data (id, submission_id, field_id, value, ...)
SELECT sd.id, sd.submission_id, sd.field_id, sd.value, ...
FROM submission_data sd
JOIN submissions s ON s.id = sd.submission_id
WHERE s.parent_id IS NULL;
```

### Step 3: Migrate Sub-form Data
```sql
-- Add table_name to sub_forms
UPDATE sub_forms
SET table_name = generate_sub_form_table_name(title, id);

-- Migrate sub-form fields
INSERT INTO sub_form_fields (id, sub_form_id, form_id, type, title, ...)
SELECT id, sub_form_id, form_id, type, title, ...
FROM fields
WHERE sub_form_id IS NOT NULL;

-- Migrate sub-submissions
INSERT INTO sub_submissions (id, sub_form_id, parent_submission_id, user_id, ...)
SELECT
  s.id,
  s.form_id as sub_form_id,  -- form_id points to sub_form in old structure
  s.parent_id,
  s.user_id,
  ...
FROM submissions s
WHERE s.parent_id IS NOT NULL;

-- Migrate sub-submission data
INSERT INTO sub_submission_data (id, submission_id, field_id, value, ...)
SELECT sd.id, sd.submission_id, sd.field_id, sd.value, ...
FROM submission_data sd
JOIN submissions s ON s.id = sd.submission_id
WHERE s.parent_id IS NOT NULL;
```

### Step 4: Create Dynamic Tables for Sub-forms
```sql
-- For each sub-form, create dynamic table
-- Similar to main forms, but with parent_submission_id column
```

### Step 5: Verify and Cleanup
```sql
-- Verify all data migrated correctly
-- Compare counts, spot check data
-- Drop old tables (fields, submissions, submission_data)
-- Or rename them as backups
```

## 📊 Example: Before vs After

### Before (Current)
```sql
-- submissions table (MIXED)
id                                   | form_id                              | parent_id
-------------------------------------|--------------------------------------|------------
main-sub-1                          | form-123                             | NULL
main-sub-2                          | form-123                             | NULL
sub-sub-1                           | subform-456                          | main-sub-1
sub-sub-2                           | subform-456                          | main-sub-1
sub-sub-3                           | subform-456                          | main-sub-2

-- ❌ Confusing: form_id points to different table types!
```

### After (New)
```sql
-- main_submissions table (CLEAN)
id                                   | form_id
-------------------------------------|--------------------------------------
main-sub-1                          | form-123
main-sub-2                          | form-123

-- sub_submissions table (CLEAN)
id                                   | sub_form_id  | parent_submission_id
-------------------------------------|--------------|----------------------
sub-sub-1                           | subform-456  | main-sub-1
sub-sub-2                           | subform-456  | main-sub-1
sub-sub-3                           | subform-456  | main-sub-2

-- ✅ Clear: Each submission in its own table!
```

## 🎯 Next Steps

1. **Review this plan** - Does it meet all requirements?
2. **Create migration scripts** - SQL scripts for data migration
3. **Update Sequelize models** - Create new models for new tables
4. **Update API endpoints** - Separate endpoints for main/sub forms
5. **Update frontend components** - Handle new structure
6. **Add Argos translation** - Translate Thai→English for table/column names
7. **Test thoroughly** - Ensure no data loss
8. **Deploy gradually** - Blue-green deployment strategy

## 📝 Questions to Answer

1. Should we keep old tables as backup? → Yes, rename to `_old`
2. Can we rollback if needed? → Yes, keep old tables for 30 days
3. What about existing dynamic tables? → Recreate with new structure
4. How to handle translations? → Use Argos for title_en and column_name
5. Performance impact? → Should be BETTER (clearer indexes, simpler queries)

## 🚀 Timeline Estimate

- **Phase 1**: Schema design and review (1 day) ← We are here
- **Phase 2**: Migration scripts (2 days)
- **Phase 3**: Sequelize models (2 days)
- **Phase 4**: API endpoints (3 days)
- **Phase 5**: Frontend updates (4 days)
- **Phase 6**: Argos translation (2 days)
- **Phase 7**: Testing and fixes (3 days)
- **Phase 8**: Deployment (1 day)

**Total: ~18 days (2.5 weeks)**
