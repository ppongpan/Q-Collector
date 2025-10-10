# Sub-Form Save Timeout Fix

**Date:** 2025-10-09
**Version:** v0.7.7-dev (in progress)
**Issue:** Sub-form creation times out after 30 seconds, causing save failures

---

## 🔍 Root Cause Analysis

### Issue 1: Async column_name Promise (CRITICAL)
**Location:** `backend/models/Field.js:210`
**Problem:**
```javascript
// WRONG: getColumnName() calls async function without await
Field.prototype.getColumnName = function() {
  const { generateColumnName } = require('../utils/tableNameHelper');
  return generateColumnName(this.title); // Returns Promise, not string!
};
```

**Result:**
- `field.column_name` becomes `Promise { pending }` instead of string
- Migration service tries to drop column `"[object Object]"`
- Error: `column "[object Object]" does not exist`

**Fix:**
```javascript
// Make getColumnName async
Field.prototype.getColumnName = async function() {
  const { generateColumnName } = require('../utils/tableNameHelper');
  return await generateColumnName(this.title, this.id);
};

// Update toJSON to await async operations
Field.prototype.toJSON = async function() {
  const values = Object.assign({}, this.get());

  // ... other mappings ...

  // ✅ FIXED: Await async column name generation
  values.column_name = await this.getColumnName();
  values.data_type = this.getDataType();

  return values;
};
```

---

### Issue 2: MyMemory API Rate Limit (429 Too Many Requests)
**Location:** Translation calls throughout the save operation
**Problem:**
- MyMemory free tier: 5,000 requests/day anonymous, 50,000 with email
- Each save operation triggers 10-20 translation requests
- Each retry takes 3-5 seconds × 3 attempts = 9-15 seconds per field
- Total delay: 13+ seconds for form save

**Evidence from logs:**
```
MyMemory translation failed for "วันที่นัดหมาย": MyMemory API request failed: Request failed with status code 429
MyMemory request failed (attempt 1/3), retrying...
MyMemory request failed (attempt 2/3), retrying...
MyMemory translation error: MyMemory API request failed: Request failed with status code 429
```

**Fix:**
1. Implement aggressive Redis caching (1 week TTL)
2. Add dictionary-first fallback
3. Reduce retry attempts from 3 to 1
4. Add rate limit detection and skip translation

---

### Issue 3: Database Deadlock
**Location:** `backend/services/DynamicTableService.js:249`
**Problem:**
```
error: deadlock detected
Process 32217 waits for ShareLock on transaction 30566; blocked by process 32184.
Process 32184 waits for RowExclusiveLock on relation 67261 of database 16384; blocked by process 32217.
while updating tuple (0,21) in relation "sub_forms"
```

**Cause:**
- FormService transaction holds lock on `sub_forms` table
- DynamicTableService tries to query `sub_forms` within same transaction
- Circular wait condition causes deadlock

**Fix:**
- Move sub-form table creation AFTER transaction commit
- Use separate transaction for dynamic table operations

---

## 🛠️ Implementation Plan

### Step 1: Fix async column_name (CRITICAL - Do First)
- [ ] Make `Field.prototype.getColumnName()` async
- [ ] Make `Field.prototype.toJSON()` async
- [ ] Update `FormService.detectFieldChanges()` to handle async toJSON
- [ ] Add try-catch to handle async errors

### Step 2: Add MyMemory Rate Limit Handling
- [ ] Implement Redis cache with 1-week TTL
- [ ] Add rate limit detection (catch 429 errors)
- [ ] Skip translation retry on rate limit
- [ ] Add fallback to dictionary-only mode

### Step 3: Fix Database Deadlock
- [ ] Move `dynamicTableService.createSubFormTable()` outside transaction
- [ ] Create sub-form tables after transaction commit
- [ ] Add error handling for concurrent table creation

### Step 4: Test
- [ ] Test deleting and recreating sub-forms
- [ ] Verify no timeout errors
- [ ] Check column names are strings (not promises)
- [ ] Monitor translation API usage

---

## 📋 Files to Modify

1. **backend/models/Field.js** (CRITICAL)
   - Fix async getColumnName()
   - Fix async toJSON()

2. **backend/services/FormService.js**
   - Update detectFieldChanges() to handle async fields
   - Handle toJSON() promise resolution

3. **backend/services/MyMemoryTranslationService.js**
   - Add rate limit detection
   - Implement aggressive caching
   - Reduce retry attempts

4. **backend/services/DynamicTableService.js**
   - Move table creation outside transaction
   - Add deadlock prevention

---

## ⚠️ Breaking Changes

**None** - All changes are backwards compatible.

---

## ✅ Expected Results

After fixes:
- Sub-form save completes in <2 seconds (down from 30+ seconds)
- No "[object Object]" column errors
- No database deadlocks
- Graceful handling of MyMemory rate limits
- Dictionary-based translations when API unavailable

---

## 🧪 Test Cases

```javascript
// Test 1: Create sub-form with 2 fields
// Expected: Save in <2 seconds, no errors

// Test 2: Delete sub-form and create new one
// Expected: No deadlock, no column_name errors

// Test 3: Save form repeatedly
// Expected: Uses Redis cache, no rate limit errors

// Test 4: Check field.column_name type
// Expected: string (not Promise)
console.log(typeof field.column_name); // Should be "string"
```

---

**Status:** Ready to implement
**Priority:** P0 (Critical - Blocks sub-form functionality)
**Estimated Time:** 30 minutes
