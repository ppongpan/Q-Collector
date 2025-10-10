# Q-Collector Migration System - Testing Quick Reference

**Version:** 0.8.0-alpha
**Last Updated:** 2025-10-07
**For:** Development Team

---

## Quick Commands

### Run All Tests
```bash
cd backend
npm test                    # All unit + integration tests
npm test -- --coverage      # With coverage report
```

### Run Specific Tests
```bash
# Unit Tests
npm test -- tests/unit/services/FieldMigrationService.test.js
npm test -- tests/unit/services/MigrationQueue.test.js
npm test -- tests/unit/models/FieldMigration.test.js
npm test -- tests/unit/models/FieldDataBackup.test.js

# Integration Tests
npm test -- tests/integration/FormServiceMigration.test.js

# E2E Tests (from root directory)
cd ..
npx playwright test tests/e2e/migration-system.spec.js
```

### Coverage Report
```bash
cd backend
npm test -- --coverage
# View report: open coverage/lcov-report/index.html
```

---

## Test File Locations

| Test Type | File Path | Tests | Coverage |
|-----------|-----------|-------|----------|
| **FieldMigrationService** | `backend/tests/unit/services/FieldMigrationService.test.js` | 67 | 85.86% |
| **FieldMigration Model** | `backend/tests/unit/models/FieldMigration.test.js` | 48 | ~95% |
| **FieldDataBackup Model** | `backend/tests/unit/models/FieldDataBackup.test.js` | 15 | 24% |
| **MigrationQueue** | `backend/tests/unit/services/MigrationQueue.test.js` | 17 | NEW |
| **Integration** | `backend/tests/integration/FormServiceMigration.test.js` | 11 | 45% pass |
| **E2E** | `tests/e2e/migration-system.spec.js` | 0 | Not created |

---

## Current Test Status

### ✅ Passing (High Quality)
- FieldMigrationService: 67/67 tests passing
- FieldMigration Model: 48/48 tests passing
- Integration: 5/11 tests passing

### ⚠️ Needs Attention
- **FieldDataBackup**: 24% coverage (need +66%)
- **Integration Tests**: 6/11 failing (known fixes)
- **MigrationQueue**: New tests not executed yet

### ❌ Not Started
- E2E Tests: 0/10 scenarios
- Load Tests: Not created
- Security Tests: Not created

---

## Known Test Issues & Fixes

### Issue #1: Integration Tests Timing
**Problem:** `expect(migrations.length).toBeGreaterThan(0)` fails (receives 0)
**Cause:** Migration queuing happens async after transaction commit
**Fix:** Change `waitForQueue(3000)` to `waitForQueue(5000)`
**Files Affected:** 6 tests in FormServiceMigration.test.js
**Fix Time:** 5 minutes per test

### Issue #2: field.column_name is NULL
**Problem:** `relation "null" does not exist`
**Cause:** Accessing column_name before calling toJSON()
**Fix:** Call `field.toJSON()` first: `const fieldData = field.toJSON();`
**Files Affected:** 1 test in FormServiceMigration.test.js
**Fix Time:** 5 minutes

### Issue #3: Invalid Enum Type
**Problem:** `invalid input value for enum enum_fields_type: "invalid_type"`
**Cause:** Test expects graceful handling of invalid type
**Fix:** Wrap FormService.updateForm() in try-catch OR use valid type
**Files Affected:** 1 test in FormServiceMigration.test.js
**Fix Time:** 10 minutes

**Total Fix Time:** ~35 minutes to 100% pass rate

---

## Quick Debugging Tips

### Integration Test Debugging
```bash
# Run single test with verbose output
npm test -- tests/integration/FormServiceMigration.test.js \
  --testNamePattern="should add column" --verbose

# Check migration records in database
psql -U qcollector -d qcollector_db -c "SELECT * FROM field_migrations ORDER BY created_at DESC LIMIT 5;"

# Check queue status
redis-cli
> KEYS field-migration-queue:*
> HGETALL field-migration-queue:1
```

### Unit Test Debugging
```bash
# Run with debugger
node --inspect-brk node_modules/.bin/jest tests/unit/services/FieldMigrationService.test.js

# Run single test case
npm test -- --testNamePattern="should successfully add TEXT column"

# Watch mode for TDD
npm test -- --watch tests/unit/services/FieldMigrationService.test.js
```

### E2E Test Debugging
```bash
# Run with UI
npx playwright test --ui

# Run in debug mode (step through)
npx playwright test --debug

# Run headed (see browser)
npx playwright test --headed

# View test report
npx playwright show-report
```

---

## Coverage Targets

| Component | Current | Target | Gap | Priority |
|-----------|---------|--------|-----|----------|
| FieldMigrationService | 85.86% | 90% | +4.14% | MEDIUM |
| FieldMigration Model | ~95% | 90% | ✅ DONE | - |
| FieldDataBackup Model | 24% | 90% | +66% | **HIGH** |
| MigrationQueue | NEW | 90% | Execute tests | **HIGH** |
| FormService | 62.56% | 65% | +2.44% | LOW |
| Overall | ~70% | 90% | +20% | HIGH |

---

## Test Data Setup

### Create Test User
```sql
INSERT INTO users (id, username, email, password_hash, role, is_active)
VALUES (
  gen_random_uuid(),
  'testuser',
  'test@example.com',
  '$2a$10$HASH...',
  'super_admin',
  true
);
```

### Create Test Form
```sql
INSERT INTO forms (id, title, description, table_name, created_by, is_active)
VALUES (
  gen_random_uuid(),
  'Test Form',
  'Test form for migrations',
  'test_form_123',
  (SELECT id FROM users WHERE username = 'testuser'),
  true
);
```

### Create Test Dynamic Table
```sql
CREATE TABLE test_form_123 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL,
  username VARCHAR(100),
  submission_number INTEGER,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Performance Benchmarks

### Expected Test Execution Times

| Test Suite | Tests | Time | Per Test |
|------------|-------|------|----------|
| FieldMigrationService | 67 | ~30s | ~0.5s |
| FieldMigration Model | 48 | ~15s | ~0.3s |
| FieldDataBackup Model | 15 | ~5s | ~0.3s |
| MigrationQueue | 17 | ~10s | ~0.6s |
| FormService Integration | 11 | ~35s | ~3.2s |
| **Total** | **158** | **~95s** | **~0.6s avg** |

### Performance Targets

| Operation | Target | Acceptable | Slow |
|-----------|--------|------------|------|
| Unit Test | <1s | <2s | >2s |
| Integration Test | <5s | <10s | >10s |
| E2E Test | <30s | <60s | >60s |
| Full Suite | <2min | <5min | >5min |

---

## CI/CD Integration (Not Yet Setup)

### GitHub Actions Workflow (Planned)
```yaml
name: Migration System Tests
on: [push, pull_request]
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm install
      - run: npm test -- --coverage
      - run: npm run coverage:check

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: qcollector_dev_2025
      redis:
        image: redis:7
    steps:
      - run: npm test -- tests/integration/
```

---

## Manual Testing Checklist

### Migration Flow Testing
- [ ] Create form with 2 fields
- [ ] Add 3rd field → Verify migration preview appears
- [ ] Confirm migration → Verify column added to dynamic table
- [ ] Submit form data → Verify data saved to new column
- [ ] Delete field → Verify backup warning
- [ ] Confirm deletion → Verify backup created
- [ ] View migration history → Verify both migrations listed
- [ ] Rollback deletion → Verify field restored
- [ ] Submit data again → Verify old + new data intact

### Permission Testing
- [ ] Login as super_admin → Can execute all migrations
- [ ] Login as admin → Can execute migrations (not rollback)
- [ ] Login as moderator → Can view history only
- [ ] Login as general_user → Cannot access migration UI

### Error Handling Testing
- [ ] Disconnect database → Verify error message shown
- [ ] Add duplicate column name → Verify validation error
- [ ] Change type with invalid data → Verify warning + rollback option
- [ ] Submit form during migration → Verify queued properly

---

## Common Test Patterns

### Arrange-Act-Assert (AAA)
```javascript
it('should add TEXT column for short_answer field type', async () => {
  // ARRANGE
  const columnName = 'test_column';
  const fieldType = 'short_answer';

  // ACT
  const migration = await FieldMigrationService.addColumn(
    testTable,
    testFieldId,
    columnName,
    fieldType,
    { userId: testUser.id, formId: testForm.id }
  );

  // ASSERT
  expect(migration.success).toBe(true);
  expect(migration.column_name).toBe(columnName);
});
```

### Async Test with Database Cleanup
```javascript
describe('FieldMigrationService', () => {
  let testForm, testUser, testTable;

  beforeAll(async () => {
    // Setup: Create test data
    testUser = await User.create({ username: 'test', ... });
    testForm = await Form.create({ title: 'Test', ... });
    testTable = 'test_table_' + Date.now();
    await testPool.query(`CREATE TABLE "${testTable}" (...)`);
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    await testPool.query(`DROP TABLE IF EXISTS "${testTable}"`);
    await testForm.destroy({ force: true });
    await testUser.destroy({ force: true });
  });

  it('should ...', async () => { ... });
});
```

### Mocking External Services
```javascript
jest.mock('../../../services/TelegramService');
const TelegramService = require('../../../services/TelegramService');

it('should send telegram notification on migration', async () => {
  TelegramService.sendMessage = jest.fn().mockResolvedValue(true);

  await FieldMigrationService.addColumn(...);

  expect(TelegramService.sendMessage).toHaveBeenCalledWith(
    expect.stringContaining('Migration completed')
  );
});
```

---

## Useful Database Queries

### Check Migration History
```sql
SELECT
  fm.migration_type,
  fm.table_name,
  fm.column_name,
  fm.success,
  fm.executed_at,
  u.username AS executed_by
FROM field_migrations fm
JOIN users u ON fm.executed_by = u.id
WHERE fm.form_id = 'FORM_ID_HERE'
ORDER BY fm.executed_at DESC
LIMIT 10;
```

### Check Backup Records
```sql
SELECT
  fdb.column_name,
  fdb.backup_type,
  jsonb_array_length(fdb.data_snapshot) AS record_count,
  fdb.retention_until,
  fdb.created_at
FROM field_data_backups fdb
WHERE fdb.form_id = 'FORM_ID_HERE'
ORDER BY fdb.created_at DESC;
```

### Check Queue Jobs (Redis)
```bash
redis-cli
> KEYS field-migration-queue:*
> HGETALL field-migration-queue:waiting
> LRANGE bull:field-migration-queue:active 0 -1
```

---

## Contact & Support

**Issues Found?** Create GitHub issue with:
- Test file name
- Test case name
- Error message
- Steps to reproduce

**Questions?** Refer to:
- `SPRINT7-COMPLETE-SUMMARY.md` - Comprehensive report
- `SPRINT7-TESTING-STATUS.md` - Detailed analysis
- `backend/services/FieldMigrationService.EXAMPLES.md` - Usage examples

**Agent Specifications:**
- `.claude/agents/qa-migration-specialist.md` - Your role definition

---

**Last Updated:** 2025-10-07
**Version:** Q-Collector v0.8.0-alpha
**Maintained By:** QA Team
