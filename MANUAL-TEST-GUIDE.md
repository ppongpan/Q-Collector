# Manual Testing Guide: MyMemory API Translation

**Date:** 2025-10-06
**Version:** 0.7.4-dev
**Status:** Ready for Testing

---

## 🎯 Test Objective

Test Thai → English translation through the frontend UI to verify:
1. ✅ Forms can be created with Thai names
2. ✅ Fields can be named in Thai
3. ✅ Database tables are created with English names
4. ✅ API usage is tracked automatically

---

## 🚀 Prerequisites

### 1. Servers Running
```bash
✅ Backend:  http://localhost:5000 (running)
✅ Frontend: http://localhost:3000 (running)
✅ PostgreSQL: localhost:5432 (connected)
```

### 2. Test User Account
```
Username: pongpanp (or your super_admin account)
Password: [your password]
Role: super_admin or admin (required for form creation)
```

---

## 📋 Test Scenarios

### Test 1: Simple Form with Thai Name

**Objective:** Create a basic form with Thai title and fields

#### Steps:
1. **Open Browser**
   ```
   URL: http://localhost:3000
   ```

2. **Login**
   - Enter username/password
   - Click "เข้าสู่ระบบ"

3. **Navigate to Form Builder**
   - Click "Create New Form" or "สร้างฟอร์มใหม่"

4. **Create Form with Thai Title**
   ```
   Form Title (Thai): แบบฟอร์มทดสอบระบบแปลภาษา
   Description: ทดสอบ MyMemory API v0.7.4
   ```

5. **Add Thai Fields**

   **Field 1:**
   ```
   Label: ชื่อ-นามสกุล
   Type: Short Answer (ข้อความสั้น)
   Required: Yes
   ```

   **Field 2:**
   ```
   Label: อีเมล
   Type: Email
   Required: Yes
   ```

   **Field 3:**
   ```
   Label: เบอร์โทรศัพท์
   Type: Phone
   Required: No
   ```

   **Field 4:**
   ```
   Label: ที่อยู่
   Type: Paragraph (ข้อความยาว)
   Required: No
   ```

   **Field 5:**
   ```
   Label: วันเกิด
   Type: Date
   Required: No
   ```

6. **Save Form**
   - Click "Save Form" or "บันทึกฟอร์ม"
   - Wait for success message

#### Expected Results:
```
✅ Form created successfully
✅ Success message displayed
✅ Redirected to form list or form view
```

#### Verification:
**Check Database Table:**
```sql
-- Expected table name (English):
-- test_translation_system_form_[uuid]

SELECT table_name
FROM information_schema.tables
WHERE table_name LIKE '%test_translation%';

-- Expected columns (English):
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'test_translation_system_form_[uuid]';

-- Expected columns:
-- full_name_[hash] (character varying)
-- mails_[hash] (character varying)
-- phone_number_[hash] (character varying)
-- address_[hash] (text)
-- date_of_birth_[hash] (date)
```

---

### Test 2: Complex Form with Long Thai Names

**Objective:** Test translation with long and complex Thai phrases

#### Form Details:
```
Form Title: แบบฟอร์มการประเมินความพึงพอใจต่อการให้บริการของบริษัท

Fields:
1. ชื่อผู้ประเมิน (Short Answer)
2. แผนกที่รับบริการ (Multiple Choice)
3. คะแนนความพึงพอใจโดยรวม (Rating 1-5)
4. ข้อเสนอแนะเพิ่มเติม (Paragraph)
5. วันที่ประเมิน (Date)
```

#### Expected Translation:
```
Table: service_satisfaction_evaluation_form_[uuid]

Columns:
- evaluator_name_[hash]
- service_department_[hash]
- overall_satisfaction_rating_[hash]
- additional_recommendations_[hash]
- evaluation_date_[hash]
```

---

### Test 3: Edge Cases

#### Test 3.1: Mixed Thai-English Names
```
Form Title: แบบฟอร์ม Customer Feedback 2025
Expected: customer_feedback_2025_form_[uuid]
```

#### Test 3.2: Special Thai Characters
```
Field Label: ชื่อ-นามสกุล (มีเครื่องหมาย -)
Expected: full_name_[hash] or name_surname_[hash]
```

#### Test 3.3: Very Long Thai Names (>50 chars)
```
Form Title: แบบฟอร์มการบันทึกข้อมูลการร้องเรียนและข้อเสนอแนะจากลูกค้าภายนอกองค์กร
Expected: Truncated to ~50 chars with hash suffix
```

---

## 🔍 Verification Checklist

### After Each Form Creation:

#### 1. **Check Backend Logs**
```bash
# Check translation logs
tail -f backend/logs/app.log | grep "Translated"

# Expected output:
# info: Translated "แบบฟอร์มทดสอบ" → "test_form" (quality: excellent)
```

#### 2. **Verify Database**
```sql
-- List all dynamic tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name NOT IN ('forms', 'users', 'submissions', ...)
ORDER BY table_name;

-- Check specific table structure
\d+ [table_name]
```

#### 3. **Check API Usage**
```bash
cd backend
node scripts/monitor-translation-usage.js stats
```

Expected output:
```
📊 Overall Statistics:
   Total API Calls: [increased by 6 per form]
   Total Characters: [increased by ~100 per form]

📅 Today's Usage:
   API Calls: [count]
   Characters: [count]
   Remaining (anonymous): [5000 - count] chars
```

#### 4. **Verify Form in UI**
- Navigate to "Form List" page
- Find the created form
- Click to view form details
- Verify Thai title is displayed correctly
- Click "View Submissions" or "Submit Form"
- Verify form fields are displayed correctly

---

## 📊 Expected Performance

### Timing Benchmarks:
```
Form Creation (UI → Database):
   - Frontend validation: < 1s
   - API request: ~8-12s (includes translation)
   - Database creation: < 1s
   - Total: ~10-15s

Translation Breakdown:
   - Form title: ~1.5s
   - Each field (5 fields): ~1.5s × 5 = 7.5s
   - Total translation: ~9s
```

### API Usage:
```
Per Form Created:
   - API calls: 6 (1 title + 5 fields)
   - Characters: ~100 (depending on Thai text length)
   - Daily quota usage: ~2% (100 / 5000)

Safe limit:
   - Can create ~50 forms per day (anonymous mode)
   - Can create ~500 forms per day (with email)
```

---

## 🐛 Troubleshooting

### Issue 1: Form Creation Takes Too Long
**Symptom:** Form creation takes >30 seconds

**Possible Causes:**
- MyMemory API timeout
- Network issues
- Too many fields (>10)

**Solution:**
```bash
# Check backend logs for errors
tail -f backend/logs/error.log

# Check API response time
curl -X POST https://api.mymemory.translated.net/get \
  -d "q=สวัสดี&langpair=th|en"
```

### Issue 2: Translation Quality is "Fair" or "Machine"
**Symptom:** Column names look incorrect or are transliterated

**Example:**
```
Expected: username_abc123
Actual: chue_phu_chai_ngaan_abc123 (transliterated)
```

**Explanation:** This happens when MyMemory doesn't have a good translation. It's acceptable as long as the name is:
- PostgreSQL compliant ✅
- Unique ✅
- Readable ✅

### Issue 3: Form Creation Fails
**Symptom:** Error message "Failed to create form"

**Check:**
1. Backend logs: `tail -f backend/logs/error.log`
2. Browser console: F12 → Console tab
3. Network tab: F12 → Network tab → Check API response

**Common Errors:**
```
Error: Translation failed
→ Check internet connection
→ Verify MyMemory API is accessible

Error: Invalid table name
→ Check backend logs for specific error
→ May need to adjust Thai text

Error: Database connection failed
→ Verify PostgreSQL is running
→ Check database credentials
```

---

## 📝 Test Results Template

### Test Report Form:
```
Date: ___________
Tester: ___________
Version: 0.7.4-dev

Test 1: Simple Form
   Form Created: [ ] Yes [ ] No
   Table Name: ____________________
   Translation Quality: [ ] Excellent [ ] Good [ ] Fair
   Issues: ____________________

Test 2: Complex Form
   Form Created: [ ] Yes [ ] No
   Table Name: ____________________
   Translation Quality: [ ] Excellent [ ] Good [ ] Fair
   Issues: ____________________

Test 3: Edge Cases
   Mixed Thai-English: [ ] Pass [ ] Fail
   Special Characters: [ ] Pass [ ] Fail
   Long Names: [ ] Pass [ ] Fail

API Usage:
   Total Calls Today: _____
   Characters Used: _____
   Remaining Quota: _____

Overall Assessment:
   [ ] All tests passed
   [ ] Some issues found (see notes)
   [ ] Major issues - needs fixing

Notes:
_______________________________________
_______________________________________
_______________________________________
```

---

## 🎯 Success Criteria

✅ **Test passes if:**
1. Forms can be created with Thai titles
2. Fields can be named in Thai
3. Database tables have English names
4. Column names are PostgreSQL-compliant
5. Translation quality is "good" or better
6. Form creation completes within 15 seconds
7. API usage is tracked correctly
8. No errors in browser console
9. No errors in backend logs

❌ **Test fails if:**
1. Form creation fails
2. Table names contain Thai characters
3. Column names are invalid
4. Translation takes >30 seconds
5. Server crashes or becomes unresponsive

---

## 🚀 Quick Test Commands

### Backend Status:
```bash
# Check if backend is running
curl http://localhost:5000/health

# View translation logs (live)
tail -f backend/logs/app.log | grep "Translated"

# Check API usage
cd backend && node scripts/monitor-translation-usage.js stats
```

### Database Verification:
```bash
# List all tables with Thai form names
cd backend
node scripts/check-forms-schema.js

# Or direct SQL:
# psql -U qcollector -d qcollector_db -c "\dt"
```

### Frontend Access:
```
Main App: http://localhost:3000
Login: http://localhost:3000/login
Form Builder: http://localhost:3000/forms/new
```

---

## 📞 Support

**If tests fail:**
1. Check `backend/logs/error.log`
2. Check browser console (F12)
3. Run diagnostic: `node backend/scripts/test-mymemory-translation.js`
4. Verify database: Test script passed ✅

**Scripts for debugging:**
```bash
# Test translation API
node backend/scripts/test-mymemory-translation.js

# Test table generation
node backend/scripts/test-mymemory-table-generation.js

# Demo (no database)
node backend/scripts/demo-thai-form-translation.js

# Create test form in database
node backend/scripts/test-create-thai-form.js
```

---

**Last Updated:** 2025-10-06 20:25 ICT
**Version:** 0.7.4-dev
**Status:** Ready for Manual Testing 🧪
