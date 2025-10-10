# Q-Collector Sub-Form Testing Guide

**Version:** 0.7.2-dev
**Date:** 2025-10-05

Complete guide for testing form creation with sub-forms

---

## 🎯 Overview

This guide provides step-by-step instructions for testing Q-Collector's sub-form functionality, including both manual and automated testing approaches.

---

## ⚙️ Pre-Test Setup

### 1. System Requirements

**Running Services:**
```bash
✅ Backend (Port 5000) - Running
✅ Frontend (Port 3000) - Running
✅ PostgreSQL - Online
✅ Redis - Online
✅ MinIO - Online
```

**Check Status:**
```bash
# Backend
netstat -ano | findstr :5000

# Frontend
netstat -ano | findstr :3000

# Docker services
docker ps
```

### 2. Test User Configuration

**Default Test User:** `pongpanp` / `Gfvtmiu613`

**⚠️ Important: 2FA Consideration**

If 2FA is enabled for test user:

**Option A: Manual OTP Entry (Current)**
- Test will pause for 30 seconds
- Enter OTP from Authenticator app manually
- Test continues automatically

**Option B: Disable 2FA for Testing**
```sql
-- Connect to PostgreSQL
psql -h localhost -p 5432 -U qcollector_dev -d qcollector_dev

-- Disable 2FA for test user
UPDATE users
SET two_factor_enabled = false,
    two_factor_secret = NULL,
    requires_2fa_setup = false
WHERE username = 'pongpanp';
```

**Option C: Use Backup Codes**
- Keep backup codes handy
- Automate OTP entry with backup code

---

## 📝 Manual Testing Workflow

### Test Case 1: Create Form with Sub-Forms

#### Step 1: Navigate to Form Builder
1. Login at http://localhost:3000
2. Click **"สร้างฟอร์มใหม่"** button
3. Wait for form builder to load

#### Step 2: Set Main Form Details
1. **Form Title**: Click text "คลิกเพื่อระบุชื่อฟอร์ม..."
   - Type: `ฟอร์มทดสอบระบบ Sub-Form`
   - Press **Enter**

2. **Form Description**: Click text "คลิกเพื่อเพิ่มคำอธิบายฟอร์ม..."
   - Type: `ทดสอบการสร้างฟอร์มพร้อม Sub-Form`
   - Press **Enter**

#### Step 3: Add Main Form Fields

**Field 1: ชื่อ-นามสกุล**
1. Click **"ฟิลด์"** tab (if not active)
2. Click **"+ เพิ่มฟิลด์"** button
3. Select field type: **"ข้อความสั้น"**
4. Click on field card header to **expand**
5. In **"ชื่อฟิลด์"** input, type: `ชื่อ-นามสกุล`
6. In **"Placeholder"** input, type: `กรอกชื่อและนามสกุลของคุณ`
7. Click field card header to **collapse**
8. Click toggle icons:
   - 🔴 **Required** (red !)
   - 🔵 **Show in Table** (blue table) - enabled after required
   - 🟢 **Telegram** (green chat)

**Field 2: อีเมล**
1. Click **"+ เพิ่มฟิลด์"**
2. Select: **"อีเมล"**
3. Expand → Type title: `อีเมล`
4. Collapse → Toggle: 🔴 Required, 🔵 Table

**Field 3: เบอร์โทรศัพท์**
1. Click **"+ เพิ่มฟิลด์"**
2. Select: **"เบอร์โทร"**
3. Expand → Type title: `เบอร์โทรศัพท์`
4. Collapse → Toggle: 🔴 Required

#### Step 4: Add Sub-Forms

**Navigate to Sub-Forms Tab**
1. Click **"ฟอร์มย่อย"** tab

**Sub-Form 1: ข้อมูลที่อยู่**
1. Click **"+ เพิ่มฟอร์มย่อย"** button
2. Click SubForm title → Type: `ข้อมูลที่อยู่`
3. Click SubForm description → Type: `กรอกข้อมูลที่อยู่สำหรับการติดต่อ`
4. Add fields in SubForm:
   - **Field 1**: ข้อความยาว → `ที่อยู่`
   - **Field 2**: จังหวัด → `จังหวัด`
   - **Field 3**: เบอร์โทร → `เบอร์ติดต่อ`

**Sub-Form 2: เอกสารแนบ**
1. Click **"+ เพิ่มฟอร์มย่อย"**
2. Title: `เอกสารแนบ`
3. Description: `แนบเอกสารประกอบ`
4. Add fields:
   - **Field 1**: แนบไฟล์ → `ไฟล์เอกสาร`
   - **Field 2**: แนบรูป → `รูปภาพประกอบ`

#### Step 5: Save Form
1. Click **"บันทึกฟอร์ม"** button
2. Wait for success message: **"บันทึกสำเร็จ"**
3. Verify form appears in form list

#### Step 6: Verify Database

**Check via API:**
```bash
# Get forms list
curl http://localhost:5000/api/v1/forms \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Check via PostgreSQL:**
```sql
-- Get latest form
SELECT id, title, created_at
FROM forms
ORDER BY created_at DESC
LIMIT 1;

-- Count main fields
SELECT COUNT(*) as main_fields
FROM fields
WHERE form_id = 'YOUR_FORM_ID'
  AND sub_form_id IS NULL;

-- Count sub-forms
SELECT COUNT(*) as sub_forms
FROM sub_forms
WHERE form_id = 'YOUR_FORM_ID';

-- Count sub-form fields
SELECT sf.title, COUNT(f.id) as field_count
FROM sub_forms sf
LEFT JOIN fields f ON f.sub_form_id = sf.id
WHERE sf.form_id = 'YOUR_FORM_ID'
GROUP BY sf.id, sf.title;
```

---

### Test Case 2: Sub-Form Management

**Test Actions:**
1. **Move Up/Down**: Click ⋮ menu → "ย้ายขึ้น" / "ย้ายลง"
2. **Duplicate**: Click ⋮ menu → "ทำสำเนา" → Verify copy exists
3. **Delete**: Click ⋮ menu → "ลบ" → Verify deletion

**Expected Results:**
- Order changes correctly
- Duplicated sub-form has " (สำเนา)" suffix
- Deleted sub-form disappears

---

### Test Case 3: Field Toggle Icons

**Test Sequence:**
1. Add field → Collapse
2. Click 🔴 Required → Should activate (red background + dot)
3. Click 🔵 Table → Should activate (only if required=true)
4. Click 🟢 Telegram → Should activate
5. Click 🔴 Required again → All toggles reset (cascade effect)

**Validation:**
- Required toggle: Red background when active
- Table toggle: Blue background, disabled when required=false
- Telegram toggle: Green background
- Maximum 5 fields can show in table

---

## 🤖 Automated Testing

### Run E2E Tests

**Full Test Suite:**
```bash
npx playwright test tests/e2e/form-with-subform-creation.spec.js --headed --workers=1
```

**Specific Test:**
```bash
# Complete form creation
npx playwright test tests/e2e/form-with-subform-creation.spec.js:101 --headed

# Sub-form management
npx playwright test tests/e2e/form-with-subform-creation.spec.js:374 --headed

# Toggle icons
npx playwright test tests/e2e/form-with-subform-creation.spec.js:433 --headed
```

**With 2FA Manual Entry:**
```bash
# Test will pause 30 seconds for OTP entry
npx playwright test tests/e2e/form-with-subform-creation.spec.js --headed --workers=1
```

**View Test Report:**
```bash
npx playwright show-report
```

---

## 📊 Test Coverage

### Test Scenarios Covered

✅ **Form Creation**
- Main form title/description (InlineEdit)
- Adding 17 field types
- Field expansion/collapse
- Field settings persistence

✅ **Sub-Form Creation**
- Add multiple sub-forms
- Sub-form title/description
- Add fields to sub-forms
- Sub-form field ordering

✅ **Toggle Icons**
- Required toggle activation
- Table toggle (dependency on required)
- Telegram toggle
- Cascade effect (uncheck required)
- Maximum table fields limit (5)

✅ **Sub-Form Management**
- Move up/down
- Duplicate sub-form
- Delete sub-form
- Drag & drop ordering

✅ **Database Verification**
- Form record created
- Main fields saved correctly
- Sub-forms saved with relationships
- Field settings persisted

---

## 🔍 Common Issues & Solutions

### Issue 1: 2FA Blocking Tests

**Symptom:**
```
TimeoutError: page.waitForSelector: Timeout 15000ms exceeded.
Waiting for: text=/สร้างฟอร์มใหม่|รายการฟอร์ม/i
```

**Solution:**
1. Enter OTP manually within 30 seconds
2. Or disable 2FA for test user (see setup section)
3. Or use Playwright authentication state persistence

---

### Issue 2: Toggle Icon Not Clickable

**Symptom:** Table toggle doesn't activate

**Cause:** Field not required

**Solution:**
1. Always click Required toggle first
2. Wait 300ms before clicking Table toggle

**Code:**
```javascript
await toggleFieldIcon(page, fieldCard, 'ทำให้เป็นฟิลด์จำเป็น');
await page.waitForTimeout(300);
await toggleFieldIcon(page, fieldCard, 'แสดงในตาราง');
```

---

### Issue 3: Field Card Not Expanding

**Symptom:** Click doesn't expand field

**Cause:** Clicking on toggle icon area

**Solution:** Click on left side of card header
```javascript
await fieldCard.click({ position: { x: 100, y: 20 } });
```

---

### Issue 4: InlineEdit Not Saving

**Symptom:** Text changes don't persist

**Cause:** Blur event not triggered

**Solution:** Press Enter explicitly
```javascript
await page.click(selector);
await page.keyboard.type('New Value');
await page.keyboard.press('Enter'); // Important!
await page.waitForTimeout(500);
```

---

## 📈 Expected Test Results

### Successful Test Run

```
✓ Complete Form Creation Flow with Sub-Forms (25s)
  📝 Step 1: Navigate to Form Builder
  📝 Step 2: Set Main Form Title
  📝 Step 3: Set Form Description
  📝 Step 4: Add Main Form Fields
    ➕ Adding field: ชื่อ-นามสกุล
    ➕ Adding field: อีเมล
    ➕ Adding field: เบอร์โทร
  📝 Step 5: Add Sub-Forms
    ➕ Adding SubForm 1: ข้อมูลที่อยู่
    ➕ Adding SubForm 2: เอกสารแนบ
  📝 Step 6: Save Form
  ✅ Form saved successfully!
  📝 Step 7: Verify Form in Database
  ✅ All verifications passed!
  📊 Test Summary: {
    mainFields: 3,
    subForms: 2,
    totalSubFormFields: 5
  }

✓ Sub-Form Management: Move, Duplicate, Delete (12s)
  📝 Testing: Duplicate SubForm
  ✅ SubForm duplicated successfully
  📝 Testing: Move SubForm Up
  ✅ SubForm moved up
  📝 Testing: Delete SubForm
  ✅ SubForm deleted successfully

✓ Field Toggle Icons: Required → Table → Telegram (8s)
  📝 Testing: Required Toggle
  ✅ Required toggle activated
  📝 Testing: Table Toggle
  ✅ Table toggle activated
  📝 Testing: Telegram Toggle
  ✅ Telegram toggle activated
  📝 Testing: Uncheck Required (cascade)
  ✅ Cascade uncheck works correctly

3 passed (45s)
```

---

## 🎬 Test Execution Commands

### Quick Commands

```bash
# Start servers (if not running)
npm start         # Backend (separate terminal)
npm run dev       # Frontend (separate terminal)

# Run all sub-form tests
npx playwright test form-with-subform-creation --headed

# Run with UI mode (interactive)
npx playwright test --ui

# Debug specific test
npx playwright test form-with-subform-creation:101 --debug

# Generate test report
npx playwright test && npx playwright show-report
```

### Environment Setup

```bash
# Backend
cd backend
npm start

# Frontend
npm run dev

# Verify services
curl http://localhost:5000/health
curl http://localhost:3000
```

---

## 📚 Related Files

- **Test Script**: `tests/e2e/form-with-subform-creation.spec.js`
- **UI Guide**: `docs/UI-INTERACTION-GUIDE.md`
- **Main Component**: `src/components/EnhancedFormBuilder.jsx`
- **Toggle Icons**: `src/components/ui/field-toggle-buttons.jsx`
- **Sub-Form Builder**: `src/components/EnhancedFormBuilder.jsx:704-1010`

---

## 🎯 Next Steps

### After Successful Testing

1. **Update CLAUDE.md** with test results
2. **Document any new bugs** in GitHub issues
3. **Optimize slow selectors** if needed
4. **Add more test cases** for edge cases
5. **Setup CI/CD pipeline** for automated testing

### Future Enhancements

- [ ] Playwright authentication state persistence
- [ ] Visual regression testing
- [ ] API contract testing
- [ ] Performance testing (form with 50+ fields)
- [ ] Accessibility testing

---

**Last Updated:** 2025-10-05
**Q-Collector Version:** 0.7.2-dev
