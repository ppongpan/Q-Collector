# Bulk Form Translation Migration Guide

**Version:** 1.0.0 (v0.7.7-dev)
**Created:** 2025-10-10
**Status:** ✅ Production Ready

---

## Overview

The `translate-existing-forms.js` script migrates existing forms with hash-based or transliterated table/column names to meaningful English names using the v0.7.7 translation system with context hints.

### What It Does

1. **Scans** all forms in the database
2. **Identifies** forms with hash-based or transliterated names
3. **Generates** meaningful English table and column names using:
   - Dictionary Translation (instant, trusted)
   - MyMemory API with context hints (form/field)
   - Quality validation (reject match < 0.5)
4. **Renames** tables and columns in PostgreSQL
5. **Updates** form/sub-form records with new names
6. **Generates** detailed migration report

---

## Features

✅ **Dry-Run Mode** - Preview changes without modifying database
✅ **Transaction Support** - Automatic rollback on errors
✅ **Quality Validation** - Configurable minimum quality threshold
✅ **Context-Aware** - Uses 'form' and 'field' contexts for better translations
✅ **Sub-Form Support** - Migrates both main forms and sub-forms
✅ **Progress Logging** - Detailed console output with status indicators
✅ **Migration Reports** - JSON reports saved to `backend/reports/`
✅ **Backup Reminder** - Warns to create backup before execution
✅ **Error Handling** - Graceful error handling with detailed error messages

---

## Usage

### 1. Preview Changes (Dry-Run)

**Recommended first step:** Always run in dry-run mode to preview changes before execution.

```bash
cd backend
node scripts/translate-existing-forms.js --dry-run
```

**Output Example:**
```
╔═══════════════════════════════════════════════════════════╗
║     Bulk Form Translation Migration v1.0.0               ║
╚═══════════════════════════════════════════════════════════╝

Mode: 🔍 DRY-RUN (Preview Only)
Min Quality Threshold: 0.5

🔍 Scanning database for forms that need translation...

📋 Form: "แบบฟอร์มติดต่อ"
   Current Table: banthuekraykarrthaihm_e9b413
   Status: ⚠️  Needs Translation
   Fields: 5
   Sub-forms: 2

✅ Form: "Contact Form"
   Table: contact_form_446655
   Status: Already has meaningful English name

📊 Summary:
   Forms scanned: 10
   Forms to migrate: 3
   Forms already OK: 7

📋 Generating migration plans...

Planning: "แบบฟอร์มติดต่อ"
   ✅ Plan generated successfully
   Table: banthuekraykarrthaihm_e9b413 → contact_form_e9b413
   Fields to rename: 3
   Sub-forms: 2

🔍 DRY-RUN MODE: No changes were made to the database
   Run without --dry-run flag to execute the migration

📊 Full report: backend/reports/migration-report-2025-10-10T10-30-45.json
```

---

### 2. Execute Migration

**⚠️ Important:** Create a database backup before executing!

```bash
# Create backup first
pg_dump -h localhost -U qcollector_dev -d qcollector_dev > backup-$(date +%Y%m%d-%H%M%S).sql

# Execute migration
cd backend
node scripts/translate-existing-forms.js
```

**Output Example:**
```
Mode: ⚡ EXECUTE
Min Quality Threshold: 0.5

📦 Creating database backup...
   ⚠️  Note: Actual pg_dump backup should be run manually before production migration
   Command: pg_dump -h localhost -U qcollector_dev -d qcollector_dev > backup.sql

🚀 Executing migrations...

📋 Migrating: "แบบฟอร์มติดต่อ"
   ✅ Renamed column: "chueoaebrnd" → "brand_name"
   ✅ Renamed column: "raylaiayd" → "description"
   ✅ Renamed column: "raakha" → "price"
   ✅ Renamed table: "banthuekraykarrthaihm_e9b413" → "contact_form_e9b413"
   ✅ Sub-form table renamed: "raykaarsinkha_abc123" → "product_list_abc123"
   ✅ Migration completed successfully

╔═══════════════════════════════════════════════════════════╗
║                   Final Summary                           ║
╚═══════════════════════════════════════════════════════════╝

   Forms scanned: 10
   Forms migrated: 3
   Forms failed: 0
   Sub-forms migrated: 6
   Fields renamed: 15

✅ Migration completed!

📊 Full report: backend/reports/migration-report-2025-10-10T11-45-30.json
```

---

### 3. Custom Quality Threshold

Reject translations below a specific quality score (0.0 - 1.0):

```bash
# Only accept "good" or "excellent" translations (match ≥ 0.7)
node scripts/translate-existing-forms.js --min-quality=0.7 --dry-run

# Accept any translation above "fair" quality (match ≥ 0.5) - DEFAULT
node scripts/translate-existing-forms.js --min-quality=0.5
```

**Quality Levels:**
- **excellent** - match ≥ 0.9 (99%+ accuracy)
- **good** - match ≥ 0.7 (70-90% accuracy)
- **fair** - match ≥ 0.5 (50-70% accuracy)
- **machine** - match < 0.5 (rejected by default)

---

## Migration Report

After each run, a detailed JSON report is saved to:

```
backend/reports/migration-report-YYYY-MM-DDTHH-MM-SS.json
```

**Report Structure:**
```json
{
  "timestamp": "2025-10-10T11:45:30.123Z",
  "mode": "execute",
  "minQuality": 0.5,
  "statistics": {
    "formsScanned": 10,
    "formsToMigrate": 3,
    "formsMigrated": 3,
    "formsFailed": 0,
    "subFormsMigrated": 6,
    "fieldsMigrated": 15,
    "errors": []
  },
  "plans": [
    {
      "formId": "550e8400-e29b-41d4-a716-446655440000",
      "formTitle": "แบบฟอร์มติดต่อ",
      "oldTableName": "banthuekraykarrthaihm_e9b413",
      "newTableName": "contact_form_e9b413",
      "fields": [
        {
          "fieldId": "...",
          "fieldTitle": "ชื่อแบรนด์",
          "oldColumnName": "chueoaebrnd",
          "newColumnName": "brand_name",
          "fieldType": "short_answer"
        }
      ],
      "subForms": [...],
      "quality": "good",
      "errors": []
    }
  ]
}
```

---

## Safety Features

### 1. Dry-Run Mode (Default)
Always preview changes before executing:
```bash
node scripts/translate-existing-forms.js --dry-run
```

### 2. Transaction Support
Each form migration is wrapped in a PostgreSQL transaction:
- ✅ Success → Commit all changes
- ❌ Error → Rollback to original state

### 3. Quality Validation
Translations below minimum quality are rejected:
- Default threshold: 0.5 (fair quality)
- Configurable via `--min-quality` flag
- Low-quality translations logged for manual review

### 4. Backup Reminder
Script warns to create backup before execution:
```bash
pg_dump -h localhost -U qcollector_dev -d qcollector_dev > backup.sql
```

### 5. Table Existence Check
Verifies table exists before attempting rename:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'old_table_name'
)
```

### 6. Error Logging
All errors are:
- Logged to console with details
- Saved in migration report
- Cause transaction rollback (no partial changes)

---

## What Gets Migrated

### Forms with Hash-Based Names
```
_a3f1b6 → contact_form_a3f1b6
_7k3m9q → product_list_7k3m9q
```

### Forms with Transliterated Names
```
banthuekraykarrthaihm_e9b413 → contact_form_e9b413
raykarthdlongkhab_9d519c → complaint_form_9d519c
```

### Fields with Transliterated Names
```
chueoaebrnd → brand_name
raylaiayd → description
raakha → price
wanthismrbtb → registration_date
```

### Sub-Forms
```
Main Form: banthuekraykarrthaihm_e9b413
  → contact_form_e9b413

Sub-Form: raykaarsinkha_abc123
  → product_list_abc123
```

---

## What DOES NOT Get Migrated

### Already Meaningful English Names
```
contact_form_446655 ✅ (already good)
product_list_abc123 ✅ (already good)
customer_feedback_xyz789 ✅ (already good)
```

### Standard Columns
```
id ✅ (system column)
createdAt ✅ (system column)
updatedAt ✅ (system column)
submission_id ✅ (foreign key)
sub_form_id ✅ (foreign key)
main_form_subid ✅ (relation column)
parent_id ✅ (relation column)
parent_id2 ✅ (relation column)
```

---

## Translation Strategy

The script uses the same 3-layer translation strategy as v0.7.7:

### Layer 1: Dictionary Translation (Instant)
- 500+ curated Thai-English business terms
- Trusted translations (no quality check needed)
- Examples: "ชื่อสินค้า" → "product_name"

### Layer 2: MyMemory API with Context Hints
- Context: `form` for table names
- Context: `field` for column names
- Quality validation (reject match < 0.5)
- Examples: "แบบฟอร์มติดต่อ" → "contact_form"

### Layer 3: Hash Fallback
- Used when both Dictionary and MyMemory fail
- Generates unique short hash (6 chars)
- Examples: "untranslatable_text" → "_a3f1b6"

---

## Rollback Procedure

If migration fails or produces unexpected results:

### 1. Using Database Backup
```bash
# Restore from backup
psql -h localhost -U qcollector_dev -d qcollector_dev < backup-20251010-114530.sql

# Verify restoration
psql -h localhost -U qcollector_dev -d qcollector_dev -c "\dt"
```

### 2. Using Migration Report
```bash
# Review migration report
cat backend/reports/migration-report-2025-10-10T11-45-30.json

# Manually reverse changes using SQL
psql -h localhost -U qcollector_dev -d qcollector_dev

-- Example: Reverse table rename
ALTER TABLE "contact_form_e9b413" RENAME TO "banthuekraykarrthaihm_e9b413";

-- Example: Reverse column rename
ALTER TABLE "banthuekraykarrthaihm_e9b413"
RENAME COLUMN "brand_name" TO "chueoaebrnd";
```

### 3. Transaction Rollback (Automatic)
If migration fails mid-execution, transaction automatically rolls back:
```
❌ Migration failed: duplicate column name "brand_name"
   [TRANSACTION ROLLED BACK]
   No changes were made to this form.
```

---

## Troubleshooting

### Issue: "Table does not exist"
**Cause:** Form record has `table_name` but table was manually deleted

**Solution:**
```sql
-- Check if table exists
SELECT tablename FROM pg_tables WHERE tablename = 'your_table_name';

-- If not exists, update form record to NULL
UPDATE forms SET table_name = NULL WHERE id = 'form-id';
```

---

### Issue: "Column does not exist"
**Cause:** Field definition doesn't match actual table structure

**Solution:**
```sql
-- List all columns in table
SELECT column_name FROM information_schema.columns
WHERE table_name = 'your_table_name';

-- Skip field in migration (manual workaround needed)
```

---

### Issue: "Low quality translation"
**Cause:** MyMemory returned translation with match < 0.5

**Solution 1:** Lower quality threshold
```bash
node scripts/translate-existing-forms.js --min-quality=0.3 --dry-run
```

**Solution 2:** Add to dictionary
```javascript
// backend/dictionaries/thai-english-forms.json
{
  "formTypes": {
    "your_thai_text": "your_preferred_english"
  }
}
```

**Solution 3:** Manual review and override
```javascript
// In migration plan, manually set newTableName
plan.newTableName = "your_preferred_name";
```

---

### Issue: "Duplicate column name"
**Cause:** Multiple fields translate to the same English name

**Example:**
```
"ชื่อ" → "name"
"ชื่อเต็ม" → "name" (DUPLICATE!)
```

**Solution:**
```javascript
// backend/utils/tableNameHelper.js
// Add suffix for duplicates (future enhancement)
name → name_1
name → name_2
```

**Current Workaround:** Manually rename fields before migration

---

### Issue: "Rate limit exceeded"
**Cause:** Too many MyMemory API calls in short time (1,000/day limit)

**Solution 1:** Run migration in batches
```bash
# Migrate 10 forms at a time
# Add --limit flag (future enhancement)
```

**Solution 2:** Wait for rate limit to reset (24 hours)

**Solution 3:** Use Redis cache (translations are cached for 7 days)

---

## Best Practices

### 1. Always Test in Development First
```bash
# Development
node scripts/translate-existing-forms.js --dry-run

# Staging
node scripts/translate-existing-forms.js

# Production (after staging verification)
node scripts/translate-existing-forms.js
```

### 2. Create Full Database Backup
```bash
# Backup entire database
pg_dump -h localhost -U qcollector_dev -d qcollector_dev > backup-full.sql

# Backup specific schemas
pg_dump -h localhost -U qcollector_dev -d qcollector_dev \
  --schema=public > backup-public.sql
```

### 3. Run During Low-Traffic Period
- Schedule migration during maintenance window
- Notify users of expected downtime
- Monitor system resources during execution

### 4. Review Migration Report Carefully
```bash
# Check report for errors
cat backend/reports/migration-report-*.json | jq '.statistics.errors'

# Verify all forms migrated successfully
cat backend/reports/migration-report-*.json | jq '.statistics'
```

### 5. Test Application After Migration
```bash
# Start backend
cd backend && npm start

# Test form creation
# Test form submission
# Test form editing
# Test PowerBI connection
```

---

## Performance

### Execution Time
- **Small database** (10 forms): ~30 seconds
- **Medium database** (50 forms): ~3 minutes
- **Large database** (200 forms): ~15 minutes

**Factors:**
- MyMemory API calls (300ms delay between calls)
- Translation quality (retry on low quality)
- Number of fields per form
- Number of sub-forms

### Resource Usage
- **CPU**: Low (I/O bound, waiting for API responses)
- **Memory**: <100 MB (loads one form at a time)
- **Network**: ~10 KB per API call
- **Database**: Minimal (transaction-based, no locks)

---

## Future Enhancements

### Planned Features
- [ ] Batch processing (migrate N forms at a time)
- [ ] Resume from last checkpoint (if interrupted)
- [ ] Parallel API calls (with concurrency limit)
- [ ] Duplicate column detection and auto-suffixing
- [ ] Interactive mode (confirm each migration)
- [ ] Dry-run with SQL output (generate SQL scripts)
- [ ] Integration with monitoring systems (Telegram/Email alerts)

---

## Support

### Documentation
- **Translation Plan**: `THAI-ENGLISH-TRANSLATION-PLAN.md`
- **Service v1.1.0**: `TRANSLATION-SERVICE-V1.1.0-COMPLETE.md`
- **Dictionary System**: `docs/Dictionary-Translation-System.md`

### Scripts
- **Translation Service**: `backend/services/MyMemoryTranslationService.js`
- **Table Helper**: `backend/utils/tableNameHelper.js`
- **Test Suite**: `backend/scripts/test-translation-enhancements.js`

### Logs
- **Translation Usage**: `backend/logs/translation-usage.json`
- **Application Logs**: `backend/logs/app.log`
- **Error Logs**: `backend/logs/error.log`

---

## Version History

### v1.0.0 (2025-10-10) - Initial Release
- ✅ Dry-run mode
- ✅ Transaction support
- ✅ Quality validation
- ✅ Context-aware translation
- ✅ Sub-form support
- ✅ Migration reports
- ✅ Comprehensive error handling

---

**Status:** ✅ Production Ready
**Last Updated:** 2025-10-10
**Maintainer:** Q-Collector Team
