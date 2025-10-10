# Testing Maintenance Scripts - Step-by-Step Guide

**Q-Collector Migration System v0.8.0**
**Date:** 2025-10-07

---

## Prerequisites

Before testing, ensure:
- ✅ PostgreSQL is running (field_migrations, field_data_backups tables exist)
- ✅ Redis is running (optional, only for health check)
- ✅ Node.js dependencies installed (`npm install`)
- ✅ `.env` file configured with database credentials

---

## Test 1: Migration Health Check

**Purpose:** Verify system integrity

```bash
cd C:\Users\Pongpan\Documents\24Sep25

# Run health check
node backend/scripts/migration-health-check.js
```

**Expected Output:**
- ✅ Green status for database tables
- ✅ Indexes verified
- ✅ Redis connection (or warning if not configured)
- ✅ Health score 90-100%
- ✅ Exit code 0

**If Fails:**
- Check database connection
- Verify tables exist: `\dt field_*` in psql
- Run migrations: `npx sequelize-cli db:migrate`

---

## Test 2: Validate Schema Consistency

**Purpose:** Detect schema drift

```bash
# Validate all forms
node backend/scripts/validate-schema-consistency.js

# Or validate single form
node backend/scripts/validate-schema-consistency.js --form-id=<YOUR_FORM_UUID>
```

**Expected Output:**
- ✅ List of forms scanned
- ✅ Status for each form (OK/WARNING/CRITICAL)
- ✅ JSON report in `reports/` directory
- ✅ Exit code 0 (no issues) or 2 (warnings)

**Report Location:**
```
reports/schema-drift-2025-10-07T15-30-00.json
```

**If Issues Found:**
- Missing columns: Run field migration
- Orphaned columns: Consider cleanup
- Type mismatches: Review field types

---

## Test 3: Cleanup Old Backups (Dry-Run)

**Purpose:** Preview backup cleanup

```bash
# Dry-run mode (no deletions)
node backend/scripts/cleanup-old-backups.js --dry-run
```

**Expected Output:**
- ✅ Total backups count
- ✅ Expired backups count
- ✅ Space savings estimate
- ✅ "[DRY-RUN]" messages
- ✅ Exit code 0

**To Execute Actual Cleanup:**
```bash
# Remove --dry-run to execute
node backend/scripts/cleanup-old-backups.js
```

**Safety:**
- Dry-run mode is default for testing
- Uses transactions (rollback on error)
- Deletes in batches of 100

---

## Test 4: Sync Existing Dynamic Tables (Dry-Run)

**Purpose:** Backfill migration records

```bash
# Dry-run mode (no changes)
node backend/scripts/sync-existing-dynamic-tables.js --dry-run
```

**Expected Output:**
- ✅ Forms with dynamic tables count
- ✅ Columns found per form
- ✅ Migrations to create
- ✅ Missing/extra columns report
- ✅ Exit code 0

**To Execute Actual Sync:**
```bash
# Remove --dry-run to execute
node backend/scripts/sync-existing-dynamic-tables.js
```

**When to Run:**
- After upgrading to v0.8.0
- After importing legacy forms
- Quarterly for verification

---

## Test 5: Generate Migration Report

**Purpose:** Generate analytics

```bash
# Last 7 days (for quick test)
node backend/scripts/generate-migration-report.js --days=7

# Last 30 days (default)
node backend/scripts/generate-migration-report.js

# Last 90 days (comprehensive)
node backend/scripts/generate-migration-report.js --days=90
```

**Expected Output:**
- ✅ Statistics collected
- ✅ Timeline data built
- ✅ Active forms identified
- ✅ Backup storage analyzed
- ✅ HTML report generated
- ✅ JSON report generated
- ✅ Exit code 0

**Report Files:**
```
reports/migration-report-2025-10-07T15-30-00.html
reports/migration-stats-2025-10-07T15-30-00.json
```

**View HTML Report:**
- Open in browser: Double-click HTML file
- Contains charts, tables, statistics
- Professional styling

---

## Complete Test Suite

Run all scripts in sequence:

```bash
#!/bin/bash
# test-all-maintenance-scripts.sh

echo "===== Testing Migration Maintenance Scripts ====="
echo ""

echo "Test 1: Health Check"
node backend/scripts/migration-health-check.js
echo ""

echo "Test 2: Schema Validation"
node backend/scripts/validate-schema-consistency.js
echo ""

echo "Test 3: Backup Cleanup (Dry-Run)"
node backend/scripts/cleanup-old-backups.js --dry-run
echo ""

echo "Test 4: Table Sync (Dry-Run)"
node backend/scripts/sync-existing-dynamic-tables.js --dry-run
echo ""

echo "Test 5: Generate Report"
node backend/scripts/generate-migration-report.js --days=7
echo ""

echo "===== All Tests Complete ====="
echo "Check reports/ directory for output files"
```

**Save and Run:**
```bash
chmod +x test-all-maintenance-scripts.sh
./test-all-maintenance-scripts.sh
```

---

## Verify Output Files

```bash
# Check reports directory
ls -lh reports/

# Should see:
# - schema-drift-*.json
# - migration-report-*.html
# - migration-stats-*.json
```

**View Files:**
```bash
# View JSON report
cat reports/schema-drift-*.json | jq .

# Open HTML report in browser
# (Windows)
start reports/migration-report-*.html

# (Linux)
xdg-open reports/migration-report-*.html

# (macOS)
open reports/migration-report-*.html
```

---

## Troubleshooting Tests

### Issue: Database Connection Failed

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# Verify credentials in .env
cat .env | grep POSTGRES

# Test connection
psql -U qcollector -d qcollector_db -c "SELECT 1"
```

---

### Issue: Tables Not Found

**Error:**
```
CRITICAL: field_migrations table is missing
```

**Solution:**
```bash
# Run migrations
npx sequelize-cli db:migrate

# Verify tables exist
psql -U qcollector -d qcollector_db -c "\dt field_*"

# Should see:
# - field_migrations
# - field_data_backups
```

---

### Issue: Redis Connection Failed

**Warning:**
```
WARNING: Redis connection failed - ECONNREFUSED
```

**Solution:**
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Start Redis (if not running)
# Linux:
sudo systemctl start redis
# Windows:
redis-server

# If Redis is not required, ignore warning
# (Health score will be 85% instead of 100%)
```

---

### Issue: Permission Denied (Reports)

**Error:**
```
Error: EACCES: permission denied, mkdir 'reports'
```

**Solution:**
```bash
# Create reports directory
mkdir -p reports

# Fix permissions
chmod 755 reports

# Or run with elevated permissions
sudo node backend/scripts/generate-migration-report.js
```

---

### Issue: Module Not Found

**Error:**
```
Error: Cannot find module '../models'
```

**Solution:**
```bash
# Ensure you're in project root
cd C:\Users\Pongpan\Documents\24Sep25

# Install dependencies
npm install

# Verify models directory exists
ls -la backend/models/
```

---

## Performance Benchmarks

Expected execution times (approximate):

| Script | Small DB (<100 forms) | Medium DB (100-1000 forms) | Large DB (>1000 forms) |
|--------|------------------------|----------------------------|------------------------|
| health-check | <5 seconds | <10 seconds | <20 seconds |
| validate-schema | <10 seconds | <30 seconds | <60 seconds |
| cleanup-old-backups | <15 seconds | <60 seconds | <120 seconds |
| sync-existing-tables | <20 seconds | <90 seconds | <180 seconds |
| generate-migration-report | <10 seconds | <30 seconds | <60 seconds |

**Note:** Times vary based on:
- Database size
- Network latency
- Server resources
- Number of migrations

---

## Success Criteria

### Health Check
- ✅ All tables exist
- ✅ Indexes present (5/5)
- ✅ Redis connected (optional)
- ✅ No failed migrations
- ✅ Health score ≥90%

### Schema Validation
- ✅ All forms scanned
- ✅ Report generated
- ✅ Issues categorized (if any)
- ✅ Exit code appropriate

### Backup Cleanup
- ✅ Expired backups identified
- ✅ Space savings calculated
- ✅ Dry-run completes without errors
- ✅ No data loss

### Table Sync
- ✅ Tables scanned
- ✅ Columns matched
- ✅ Migrations created
- ✅ Discrepancies reported

### Migration Report
- ✅ HTML report generated
- ✅ JSON report generated
- ✅ Statistics accurate
- ✅ Charts rendered

---

## Next Steps After Testing

1. **Review Reports**
   - Check HTML migration report
   - Review schema validation results
   - Address any warnings/errors

2. **Configure Cron Jobs**
   - Edit crontab (Linux)
   - Set up Task Scheduler (Windows)
   - Configure PM2 (if using)

3. **Set Up Monitoring**
   - Configure log rotation
   - Set up email alerts
   - Monitor health score trends

4. **Document Findings**
   - Note any issues found
   - Document environment-specific settings
   - Update maintenance schedule

---

## Test Results Template

```markdown
# Maintenance Scripts Test Results

**Date:** YYYY-MM-DD
**Environment:** Production/Staging/Development
**Tester:** Your Name

## Test Results

### 1. Migration Health Check
- Status: ✅ PASS / ❌ FAIL
- Health Score: X%
- Issues: None / [List issues]
- Notes: [Any observations]

### 2. Schema Validation
- Status: ✅ PASS / ❌ FAIL
- Forms Scanned: X
- Issues Found: X
- Exit Code: X
- Notes: [Any observations]

### 3. Backup Cleanup
- Status: ✅ PASS / ❌ FAIL
- Expired Backups: X
- Space Saved: X MB
- Notes: [Any observations]

### 4. Table Sync
- Status: ✅ PASS / ❌ FAIL
- Tables Synced: X
- Migrations Created: X
- Notes: [Any observations]

### 5. Migration Report
- Status: ✅ PASS / ❌ FAIL
- Migrations Analyzed: X
- Success Rate: X%
- Reports Generated: ✅ HTML ✅ JSON
- Notes: [Any observations]

## Overall Assessment
- ✅ All scripts working correctly
- ❌ Issues need to be addressed

## Action Items
1. [Action item 1]
2. [Action item 2]
3. [Action item 3]

## Recommendations
[Any recommendations for deployment]
```

---

## Conclusion

All scripts are ready for testing. Follow this guide step-by-step to verify functionality. Document any issues and adjust configurations as needed before deploying to production.

**Status:** ✅ Ready for Testing
**Next:** Deploy to staging, then production

---

**Document Version:** 1.0
**Last Updated:** 2025-10-07
