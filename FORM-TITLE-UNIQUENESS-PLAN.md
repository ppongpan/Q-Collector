# Form Title Uniqueness System Implementation Plan
**Version**: v0.8.4-dev
**Date**: 2025-10-24
**Priority**: HIGH
**Status**: 📋 Planning

---

## Business Requirements

### Problem Statement
Currently, the system allows duplicate form titles, which causes:
1. **Formula Reference Confusion**: Formulas that reference forms by title become ambiguous
2. **PDPA Profile Confusion**: Users viewing their data cannot distinguish between forms with identical names
3. **Data Integrity Issues**: System cannot guarantee unique form identification by title

### Objectives
1. ✅ Prevent duplicate form titles at database level
2. ✅ Add backend validation for create/update operations
3. ✅ Provide real-time duplicate detection in frontend
4. ✅ Fix existing duplicate titles before applying constraints
5. ✅ Maintain backward compatibility with existing formulas and references

---

## Current State Analysis

### Database Discovery
**Query Executed**:
```sql
SELECT title, COUNT(*) as count
FROM forms
GROUP BY title
HAVING COUNT(*) > 1;
```

**Results**:
```
Duplicate form titles:
- "แบบฟอร์มทดสอบระบบ PDPA" → 4 forms with same title ❌
```

### Model Analysis
**File**: `backend/models/Form.js`
- ✅ `title` field exists (STRING(255), NOT NULL)
- ❌ NO unique constraint on `title`
- ✅ Validation: `len: [1, 255]` (length only)

### Current Issues
1. Database allows duplicate titles
2. No backend validation preventing duplicates
3. No frontend warning when entering duplicate name
4. Existing data has 4 duplicate records

---

## Implementation Plan

### PHASE 1: Data Cleanup ⏳

**Objective**: Fix existing duplicate titles before adding constraints

**Step 1.1: Create Cleanup Script**
- **File**: `backend/scripts/fix-duplicate-form-titles.js`
- **Logic**:
  1. Find all duplicate form titles
  2. For each duplicate group:
     - Keep oldest form with original title
     - Rename others by appending "(2)", "(3)", etc.
  3. Log all changes for audit trail
  4. Provide rollback information

**Example Transformation**:
```
BEFORE:
- แบบฟอร์มทดสอบระบบ PDPA (id: 1, created: 2025-01-01)
- แบบฟอร์มทดสอบระบบ PDPA (id: 2, created: 2025-01-15)
- แบบฟอร์มทดสอบระบบ PDPA (id: 3, created: 2025-02-01)
- แบบฟอร์มทดสอบระบบ PDPA (id: 4, created: 2025-02-15)

AFTER:
- แบบฟอร์มทดสอบระบบ PDPA (id: 1) ← ORIGINAL
- แบบฟอร์มทดสอบระบบ PDPA (2) (id: 2)
- แบบฟอร์มทดสอบระบบ PDPA (3) (id: 3)
- แบบฟอร์มทดสอบระบบ PDPA (4) (id: 4)
```

**Step 1.2: Execute Cleanup**
```bash
node backend/scripts/fix-duplicate-form-titles.js
```

**Step 1.3: Verify**
```bash
node backend/scripts/verify-unique-titles.js
```

---

### PHASE 2: Database Migration ⏳

**Objective**: Add UNIQUE constraint to prevent future duplicates

**Migration File**: `backend/migrations/20251024130000-add-unique-constraint-form-title.js`

**Operations**:
```sql
-- Add unique constraint
ALTER TABLE forms
ADD CONSTRAINT forms_title_unique UNIQUE (title);

-- Create index for faster lookups (if not created by constraint)
CREATE INDEX IF NOT EXISTS forms_title_idx ON forms(title);
```

**Rollback**:
```sql
ALTER TABLE forms DROP CONSTRAINT IF EXISTS forms_title_unique;
DROP INDEX IF EXISTS forms_title_idx;
```

**Safety Checks**:
- Migration will fail if duplicates still exist
- Provides clear error message pointing to cleanup script
- Can be rolled back without data loss

---

### PHASE 3: Backend Validation ⏳

**Objective**: Add business logic validation for form titles

**File**: `backend/services/FormService.js`

**Changes Required**:

**3.1: Add duplicate check method**
```javascript
/**
 * Check if form title already exists (case-insensitive for Thai)
 * @param {string} title - Form title to check
 * @param {string|null} excludeFormId - Form ID to exclude (for updates)
 * @returns {Promise<boolean>}
 */
async checkTitleExists(title, excludeFormId = null) {
  const where = {
    title: sequelize.where(
      sequelize.fn('LOWER', sequelize.col('title')),
      sequelize.fn('LOWER', title)
    )
  };

  if (excludeFormId) {
    where.id = { [Op.ne]: excludeFormId };
  }

  const existingForm = await Form.findOne({ where });
  return !!existingForm;
}
```

**3.2: Update createForm method**
```javascript
async createForm(formData, userId) {
  // Check for duplicate title
  const titleExists = await this.checkTitleExists(formData.title);

  if (titleExists) {
    throw new Error(
      `ชื่อฟอร์ม "${formData.title}" มีอยู่แล้วในระบบ กรุณาใช้ชื่ออื่น`
    );
  }

  // ... rest of create logic
}
```

**3.3: Update updateForm method**
```javascript
async updateForm(formId, updateData, userId) {
  // If title is being updated, check for duplicates
  if (updateData.title) {
    const titleExists = await this.checkTitleExists(
      updateData.title,
      formId
    );

    if (titleExists) {
      throw new Error(
        `ชื่อฟอร์ม "${updateData.title}" มีอยู่แล้วในระบบ กรุณาใช้ชื่ออื่น`
      );
    }
  }

  // ... rest of update logic
}
```

---

### PHASE 4: API Route Validation ⏳

**Objective**: Add validation at API layer for better error responses

**File**: `backend/api/routes/form.routes.js`

**Changes Required**:

**4.1: Add express-validator rules**
```javascript
const { body, validationResult } = require('express-validator');

// Validation middleware for create
const validateFormCreate = [
  body('title')
    .trim()
    .notEmpty().withMessage('กรุณาระบุชื่อฟอร์ม')
    .isLength({ min: 1, max: 255 }).withMessage('ชื่อฟอร์มต้องมีความยาว 1-255 ตัวอักษร')
    .custom(async (title) => {
      const FormService = require('../services/FormService');
      const titleExists = await FormService.checkTitleExists(title);
      if (titleExists) {
        throw new Error(`ชื่อฟอร์ม "${title}" มีอยู่แล้วในระบบ`);
      }
      return true;
    }),
];

// Validation middleware for update
const validateFormUpdate = [
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('กรุณาระบุชื่อฟอร์ม')
    .isLength({ min: 1, max: 255 }).withMessage('ชื่อฟอร์มต้องมีความยาว 1-255 ตัวอักษร')
    .custom(async (title, { req }) => {
      const FormService = require('../services/FormService');
      const formId = req.params.id;
      const titleExists = await FormService.checkTitleExists(title, formId);
      if (titleExists) {
        throw new Error(`ชื่อฟอร์ม "${title}" มีอยู่แล้วในระบบ`);
      }
      return true;
    }),
];
```

**4.2: Apply to routes**
```javascript
// Create form
router.post(
  '/forms',
  authenticate,
  authorize(['admin', 'super_admin']),
  validateFormCreate,
  handleValidationErrors,
  async (req, res) => {
    // ... handler logic
  }
);

// Update form
router.put(
  '/forms/:id',
  authenticate,
  authorize(['admin', 'super_admin']),
  validateFormUpdate,
  handleValidationErrors,
  async (req, res) => {
    // ... handler logic
  }
);
```

---

### PHASE 5: Frontend Real-Time Validation ⏳

**Objective**: Provide immediate feedback when user enters duplicate title

**File**: `src/components/EnhancedFormBuilder.jsx`

**Changes Required**:

**5.1: Add state for title validation**
```javascript
const [titleValidation, setTitleValidation] = useState({
  checking: false,
  isValid: true,
  message: '',
});
```

**5.2: Add debounced title check function**
```javascript
import { debounce } from 'lodash';

const checkTitleUniqueness = useCallback(
  debounce(async (title) => {
    if (!title || title.trim().length === 0) {
      setTitleValidation({ checking: false, isValid: true, message: '' });
      return;
    }

    setTitleValidation({ checking: true, isValid: true, message: '' });

    try {
      const response = await apiClient.get('/forms/check-title', {
        params: {
          title: title.trim(),
          excludeId: formId // current form ID for edit mode
        }
      });

      if (response.data.exists) {
        setTitleValidation({
          checking: false,
          isValid: false,
          message: `ชื่อฟอร์ม "${title}" มีอยู่แล้วในระบบ กรุณาใช้ชื่ออื่น`,
        });
      } else {
        setTitleValidation({
          checking: false,
          isValid: true,
          message: 'ชื่อฟอร์มนี้สามารถใช้ได้',
        });
      }
    } catch (error) {
      console.error('Error checking title:', error);
      setTitleValidation({
        checking: false,
        isValid: true,
        message: '', // Don't block on network error
      });
    }
  }, 500), // 500ms debounce
  [formId]
);
```

**5.3: Add onChange handler to title input**
```javascript
const handleTitleChange = (e) => {
  const newTitle = e.target.value;
  setFormTitle(newTitle);
  checkTitleUniqueness(newTitle);
};
```

**5.4: Update title input UI**
```javascript
<div className="mb-4">
  <label className="block text-sm font-semibold mb-2">
    ชื่อฟอร์ม <span className="text-red-500">*</span>
  </label>
  <input
    type="text"
    value={formTitle}
    onChange={handleTitleChange}
    className={cn(
      "w-full px-4 py-2 border rounded-lg",
      "focus:outline-none focus:ring-2",
      {
        "border-red-500 focus:ring-red-500": !titleValidation.isValid,
        "border-green-500 focus:ring-green-500": titleValidation.isValid && formTitle && !titleValidation.checking,
        "border-gray-300 focus:ring-blue-500": titleValidation.isValid && !formTitle,
      }
    )}
    placeholder="กรุณาระบุชื่อฟอร์ม"
    required
  />

  {/* Validation feedback */}
  {titleValidation.checking && (
    <div className="mt-1 text-sm text-gray-500 flex items-center gap-2">
      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      กำลังตรวจสอบชื่อฟอร์ม...
    </div>
  )}

  {!titleValidation.checking && !titleValidation.isValid && (
    <div className="mt-1 text-sm text-red-600 flex items-center gap-2">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {titleValidation.message}
    </div>
  )}

  {!titleValidation.checking && titleValidation.isValid && formTitle && (
    <div className="mt-1 text-sm text-green-600 flex items-center gap-2">
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      {titleValidation.message}
    </div>
  )}
</div>
```

**5.5: Prevent save if title invalid**
```javascript
const handleSaveForm = async () => {
  // Validate title before saving
  if (!titleValidation.isValid) {
    toast.error('ไม่สามารถบันทึกได้: ชื่อฟอร์มซ้ำกับฟอร์มอื่นในระบบ');
    return;
  }

  if (titleValidation.checking) {
    toast.error('กรุณารอสักครู่ กำลังตรวจสอบชื่อฟอร์ม...');
    return;
  }

  // ... rest of save logic
};
```

---

### PHASE 6: Backend API Endpoint for Title Check ⏳

**Objective**: Provide endpoint for frontend real-time validation

**File**: `backend/api/routes/form.routes.js`

**New Endpoint**:
```javascript
/**
 * GET /api/v1/forms/check-title
 * Check if form title already exists
 * @query {string} title - Title to check
 * @query {string} [excludeId] - Form ID to exclude (for edit mode)
 */
router.get(
  '/forms/check-title',
  authenticate,
  async (req, res) => {
    try {
      const { title, excludeId } = req.query;

      if (!title) {
        return res.status(400).json({
          error: 'กรุณาระบุชื่อฟอร์มที่ต้องการตรวจสอบ'
        });
      }

      const FormService = require('../services/FormService');
      const exists = await FormService.checkTitleExists(
        title.trim(),
        excludeId || null
      );

      res.json({
        exists,
        title: title.trim(),
        message: exists
          ? 'ชื่อฟอร์มนี้มีอยู่แล้วในระบบ'
          : 'ชื่อฟอร์มนี้สามารถใช้ได้'
      });
    } catch (error) {
      console.error('Error checking form title:', error);
      res.status(500).json({
        error: 'เกิดข้อผิดพลาดในการตรวจสอบชื่อฟอร์ม'
      });
    }
  }
);
```

---

### PHASE 7: Error Handling Enhancement ⏳

**Objective**: Provide clear error messages in all scenarios

**7.1: Database Constraint Violation**
When unique constraint is violated at database level:

**File**: `backend/services/FormService.js`
```javascript
catch (error) {
  // PostgreSQL unique constraint error code
  if (error.name === 'SequelizeUniqueConstraintError' ||
      error.original?.code === '23505') {
    throw new Error(
      `ชื่อฟอร์ม "${formData.title}" มีอยู่แล้วในระบบ กรุณาใช้ชื่ออื่น`
    );
  }
  throw error;
}
```

**7.2: Frontend Error Display**
**File**: `src/components/EnhancedFormBuilder.jsx`
```javascript
catch (error) {
  let errorMessage = 'เกิดข้อผิดพลาดในการบันทึกฟอร์ม';

  if (error.response?.data?.error) {
    errorMessage = error.response.data.error;
  } else if (error.message) {
    errorMessage = error.message;
  }

  // Special handling for duplicate title
  if (errorMessage.includes('มีอยู่แล้วในระบบ')) {
    toast.error(errorMessage, { duration: 5000 });
    // Highlight title field
    setTitleValidation({
      checking: false,
      isValid: false,
      message: errorMessage,
    });
  } else {
    toast.error(errorMessage);
  }
}
```

---

## Testing Plan

### Test Cases

**TC-1: Data Cleanup Script**
- ✅ Script identifies all duplicate titles
- ✅ Script renames duplicates correctly (appends numbers)
- ✅ Original oldest form retains original title
- ✅ All changes are logged
- ✅ No data loss occurs

**TC-2: Database Migration**
- ✅ Migration succeeds after cleanup
- ✅ Unique constraint is created
- ✅ Migration rollback works correctly
- ✅ Index is created for performance

**TC-3: Backend Validation - Create**
- ✅ New form with unique title → Success
- ✅ New form with duplicate title → Error
- ✅ Error message is in Thai and clear
- ✅ Case-insensitive check works

**TC-4: Backend Validation - Update**
- ✅ Update form with same title → Success
- ✅ Update form with another form's title → Error
- ✅ Update form with unique new title → Success
- ✅ Case-insensitive check works

**TC-5: Frontend Real-Time Check**
- ✅ Typing triggers debounced check (500ms)
- ✅ Loading indicator shows during check
- ✅ Red border + error message for duplicate
- ✅ Green border + success message for unique
- ✅ Save button disabled when duplicate detected
- ✅ Edit mode excludes current form ID

**TC-6: API Endpoint**
- ✅ /forms/check-title returns correct exists flag
- ✅ excludeId parameter works correctly
- ✅ Empty title returns error
- ✅ Response time < 100ms

**TC-7: Error Handling**
- ✅ Database constraint violation caught and translated
- ✅ Network errors don't block form usage
- ✅ Clear error messages displayed to user
- ✅ Form field highlighted on duplicate error

**TC-8: Backward Compatibility**
- ✅ Existing forms continue to work
- ✅ Formulas referencing forms still work
- ✅ PDPA profiles display correct form names
- ✅ No breaking changes to API contracts

---

## Rollback Plan

### If Issues Found After Deployment

**Step 1: Rollback Migration**
```bash
cd backend
npm run migrate:down -- --name 20251024130000-add-unique-constraint-form-title.js
```

**Step 2: Revert Code Changes**
```bash
git revert <commit-hash>
git push origin main
```

**Step 3: Restart Backend**
```bash
# Stop current process
# Restart with reverted code
cd backend && npm start
```

**Step 4: Verify System**
- Check that forms can be created/updated normally
- Verify no errors in logs
- Test creating forms with same title (should work again)

---

## Performance Considerations

### Database Performance
- ✅ Unique constraint adds minimal overhead (<1ms per insert/update)
- ✅ Index on title field improves lookup performance
- ✅ Case-insensitive comparison using LOWER() function

### API Performance
- ✅ `/forms/check-title` endpoint cached for 30 seconds
- ✅ Debounced frontend calls (500ms) reduce server load
- ✅ Simple query: `SELECT id FROM forms WHERE LOWER(title) = ?`

### Frontend Performance
- ✅ Debounce prevents excessive API calls
- ✅ Local state management for validation UI
- ✅ No re-renders of entire form on title change

---

## Security Considerations

### SQL Injection Prevention
- ✅ Sequelize parameterized queries used throughout
- ✅ No raw SQL with user input
- ✅ Input sanitization via express-validator

### Authorization
- ✅ Only admins can create/update forms
- ✅ Title check endpoint requires authentication
- ✅ No sensitive data exposed in error messages

### Data Integrity
- ✅ Database constraint prevents race conditions
- ✅ Transaction-safe cleanup script
- ✅ No cascade deletions affecting form titles

---

## Documentation Updates

### Files to Update
1. ✅ **CLAUDE.md**: Add v0.8.4-dev section
2. ✅ **API Documentation**: Document `/forms/check-title` endpoint
3. ✅ **User Guide**: How to handle duplicate title errors
4. ✅ **Developer Guide**: Form title uniqueness requirements

### Release Notes Template
```markdown
## v0.8.4-dev - Form Title Uniqueness System

### Features
- ✅ Unique form title constraint prevents duplicates
- ✅ Real-time duplicate detection in form builder
- ✅ Automatic cleanup of existing duplicate titles
- ✅ Clear error messages in Thai

### Migration
- Run cleanup script: `node backend/scripts/fix-duplicate-form-titles.js`
- Run migration: `npm run migrate:up`
- Verify: `node backend/scripts/verify-unique-titles.js`

### API Changes
- New endpoint: `GET /api/v1/forms/check-title`
- Enhanced error messages for duplicate titles
```

---

## Implementation Schedule

### Phase Timeline
- **PHASE 1**: Data Cleanup (1 hour)
  - Write cleanup script: 30 min
  - Test cleanup script: 15 min
  - Execute cleanup: 15 min

- **PHASE 2**: Database Migration (30 min)
  - Write migration: 15 min
  - Test migration: 10 min
  - Execute migration: 5 min

- **PHASE 3**: Backend Validation (1 hour)
  - Add checkTitleExists method: 20 min
  - Update createForm/updateForm: 20 min
  - Test backend validation: 20 min

- **PHASE 4**: API Route Validation (45 min)
  - Add express-validator rules: 20 min
  - Apply to routes: 15 min
  - Test API validation: 10 min

- **PHASE 5**: Frontend Validation (2 hours)
  - Add state and handlers: 30 min
  - Update UI components: 45 min
  - Test frontend validation: 45 min

- **PHASE 6**: API Endpoint (30 min)
  - Create check-title endpoint: 15 min
  - Test endpoint: 15 min

- **PHASE 7**: Error Handling (30 min)
  - Enhance error catching: 15 min
  - Test error scenarios: 15 min

**Total Estimated Time**: 6 hours

---

## Success Criteria

### Implementation Complete When:
1. ✅ No duplicate form titles exist in database
2. ✅ Unique constraint is active on forms.title
3. ✅ Backend validation prevents duplicate creation/update
4. ✅ Frontend shows real-time duplicate detection
5. ✅ Clear error messages guide users
6. ✅ All tests pass
7. ✅ Performance benchmarks met
8. ✅ Documentation updated
9. ✅ No regression in existing features
10. ✅ Team approved and ready for production

---

**Document Version**: 1.0
**Status**: 📋 Ready for Implementation
**Next Step**: Execute PHASE 1 (Data Cleanup)
