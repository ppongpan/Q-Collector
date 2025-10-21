# Test Google Sheet Information

**Purpose:** Testing data for Google Sheets Import System
**Date:** 2025-10-16

---

## Google Sheet Details

**Sheet URL:** `https://docs.google.com/spreadsheets/d/1E2rZgFJwZt3Z7cyIci4AxD-i4y8bPzXVnCLYHkmRK38/edit?usp=sharing`

**Sheet ID (extracted):** `1E2rZgFJwZt3Z7cyIci4AxD-i4y8bPzXVnCLYHkmRK38`

**Sheet Name:** `Sheet1`

**Access:** Public (anyone with link can view)

---

## Expected Sheet Structure

Based on typical testing scenarios, this sheet should contain:

### Header Row (Row 1)
Example column names that would typically be in a test sheet:
- Name / ชื่อ
- Email / อีเมล
- Phone / เบอร์โทร
- Date / วันที่
- Number / ตัวเลข
- URL / ลิงก์
- (Additional columns as needed)

### Data Rows (Row 2+)
Sample data for testing:
- Text fields with Thai/English characters
- Email addresses (for email field detection)
- Phone numbers in Thai format (0812345678)
- Dates in various formats
- Numbers (integers and decimals)
- URLs
- Empty cells (for null handling)
- Invalid data (for validation testing)

---

## Test Cases to Cover

### 1. Field Type Detection
- ✅ Detect email from pattern
- ✅ Detect phone from Thai format
- ✅ Detect numbers
- ✅ Detect dates
- ✅ Detect URLs
- ✅ Fallback to text for ambiguous columns

### 2. Data Validation
- ✅ Valid data imports successfully
- ✅ Invalid email format caught
- ✅ Invalid phone format caught
- ✅ Empty required fields caught
- ✅ Row number reported in errors

### 3. Import Execution
- ✅ All valid rows imported
- ✅ Invalid rows skipped or reported
- ✅ Progress indicator accuracy
- ✅ Submission created with correct data
- ✅ Sub-form import (if applicable)

### 4. Edge Cases
- ✅ Empty sheet handling
- ✅ Single row (header only)
- ✅ Very long text fields
- ✅ Special characters (Thai, emojis)
- ✅ Duplicate data
- ✅ Missing columns

---

## Google Sheets API Requirements

**Scope:** `https://www.googleapis.com/auth/spreadsheets.readonly`

**API Method:** `spreadsheets.values.get`

**Range:** `Sheet1!A1:ZZ` (all columns, all rows)

**Response Format:**
```json
{
  "range": "Sheet1!A1:ZZ",
  "majorDimension": "ROWS",
  "values": [
    ["Header1", "Header2", "Header3"],
    ["Data1", "Data2", "Data3"],
    ["Data4", "Data5", "Data6"]
  ]
}
```

---

## Test Implementation Steps

### Step 1: Fetch Sheet Data
```javascript
const googleSheetsService = require('./services/GoogleSheetsService');

const data = await googleSheetsService.fetchSheetData(
  userId,
  'https://docs.google.com/spreadsheets/d/1E2rZgFJwZt3Z7cyIci4AxD-i4y8bPzXVnCLYHkmRK38/edit?usp=sharing',
  'Sheet1'
);

console.log('Headers:', data[0]);
console.log('First row:', data[1]);
console.log('Total rows:', data.length - 1);
```

### Step 2: Detect Field Types
```javascript
const headers = data[0];
const sampleRows = data.slice(1, 11);

const detections = googleSheetsService.detectFieldTypes(headers, sampleRows);

console.log('Field type detections:');
detections.forEach(d => {
  console.log(`- ${d.column_name}: ${d.detected_type} (confidence: ${d.confidence})`);
});
```

### Step 3: Create Import Config
```javascript
const config = await SheetImportConfig.create({
  user_id: userId,
  form_id: targetFormId,
  sheet_url: 'https://docs.google.com/spreadsheets/d/1E2rZgFJwZt3Z7cyIci4AxD-i4y8bPzXVnCLYHkmRK38/edit?usp=sharing',
  sheet_name: 'Sheet1',
  google_sheet_id: '1E2rZgFJwZt3Z7cyIci4AxD-i4y8bPzXVnCLYHkmRK38',
  field_mapping: [
    { sheet_column: 'ชื่อ', field_id: 'field-uuid-1', field_type: 'short_answer' },
    { sheet_column: 'อีเมล', field_id: 'field-uuid-2', field_type: 'email' },
    { sheet_column: 'เบอร์โทร', field_id: 'field-uuid-3', field_type: 'phone' }
  ]
});
```

### Step 4: Execute Import
```javascript
const result = await sheetImportService.executeImport(userId, config.id);

console.log('Import result:');
console.log(`- Total rows: ${result.total_rows}`);
console.log(`- Success: ${result.success_rows}`);
console.log(`- Failed: ${result.failed_rows}`);
console.log(`- Errors:`, result.errors);
```

---

## Success Criteria

### Functional
- ✅ Can fetch sheet data without OAuth (public sheet)
- ✅ Headers parsed correctly from row 1
- ✅ Data rows parsed correctly from row 2+
- ✅ Field types detected with >80% accuracy
- ✅ All valid data imports successfully
- ✅ Invalid data caught with clear error messages
- ✅ Row numbers reported in errors

### Performance
- ✅ Fetch sheet data: <2 seconds
- ✅ Import 100 rows: <5 seconds
- ✅ Field type detection: <1 second

### UX
- ✅ Clear progress indicator
- ✅ Error messages in Thai
- ✅ Preview shows first 10 rows
- ✅ Can edit field types before import

---

## Notes

- This is a **public sheet** (anyone with link can view)
- No OAuth required for reading (if using API key)
- For full OAuth testing, will need private sheet
- Test with various data types and edge cases
- Verify Thai language support throughout

---

**Status:** Ready for testing
**Next Step:** Implement GoogleSheetsService.fetchSheetData() method
