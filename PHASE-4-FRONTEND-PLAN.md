# Phase 4: Frontend Wizard UI - Implementation Plan

**Date:** 2025-10-16
**Version:** Q-Collector v0.8.0
**Status:** Ready to implement

---

## Special Requirements

### 1. Access Control
- ✅ **Super Admin ONLY** - Check `user.role === 'super_admin'`
- ❌ Regular users cannot access this feature
- ❌ Admin, Moderator, etc. cannot access

### 2. Device Restrictions
- ✅ **Desktop/PC ONLY** - Full wizard UI on screens ≥ 768px
- ❌ **Mobile HIDDEN** - Menu link hidden with `hidden md:block`
- ⚠️ If user tries to access on mobile → Show message: "ใช้งานได้บน PC เท่านั้น"

---

## Implementation Steps

### Step 1: Create API Service Client

**File:** `src/services/SheetsImportService.js`

```javascript
import apiClient from './ApiClient';

class SheetsImportService {

  async fetchSheetPreview(sheetUrl, sheetName) {
    const response = await apiClient.post('/api/sheets/preview', {
      sheet_url: sheetUrl,
      sheet_name: sheetName
    });
    return response.data;
  }

  async createImportConfig(config) {
    const response = await apiClient.post('/api/sheets/configs', config);
    return response.data;
  }

  async executeImport(configId) {
    const response = await apiClient.post(`/api/sheets/configs/${configId}/execute`);
    return response.data;
  }

  async getImportHistory() {
    const response = await apiClient.get('/api/sheets/history');
    return response.data;
  }

  async rollbackImport(historyId) {
    const response = await apiClient.post(`/api/sheets/history/${historyId}/rollback`);
    return response.data;
  }
}

export default new SheetsImportService();
```

---

### Step 2: Create Main Page Component

**File:** `src/components/sheets/GoogleSheetsImportPage.jsx`

```javascript
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard } from '../ui/glass-card';
import SheetUrlInput from './SheetUrlInput';
import SheetPreview from './SheetPreview';
import FieldMappingTable from './FieldMappingTable';
import ImportProgress from './ImportProgress';

const GoogleSheetsImportPage = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [sheetData, setSheetData] = useState(null);
  const [selectedForm, setSelectedForm] = useState(null);
  const [fieldMapping, setFieldMapping] = useState([]);

  // Access control
  if (user.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            ไม่มีสิทธิ์เข้าถึง
          </h2>
          <p className="text-gray-600">
            ฟีเจอร์นี้สำหรับ Super Admin เท่านั้น
          </p>
        </GlassCard>
      </div>
    );
  }

  // Mobile check
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-orange-600 mb-4">
            ใช้งานได้บน PC เท่านั้น
          </h2>
          <p className="text-gray-600">
            กรุณาเปิดใช้งานบนคอมพิวเตอร์หรือแท็บเล็ต
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        นำเข้าข้อมูลจาก Google Sheets
      </h1>

      {step === 1 && (
        <SheetUrlInput
          onSuccess={(data) => {
            setSheetData(data);
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <SheetPreview
          data={sheetData}
          onNext={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && (
        <FieldMappingTable
          sheetData={sheetData}
          selectedForm={selectedForm}
          onFormSelect={setSelectedForm}
          onMappingComplete={(mapping) => {
            setFieldMapping(mapping);
            setStep(4);
          }}
          onBack={() => setStep(2)}
        />
      )}

      {step === 4 && (
        <ImportProgress
          sheetData={sheetData}
          selectedForm={selectedForm}
          fieldMapping={fieldMapping}
          onComplete={() => {
            // Reset to step 1 or show history
            setStep(1);
          }}
        />
      )}
    </div>
  );
};

export default GoogleSheetsImportPage;
```

---

### Step 3: Add Menu to Settings Page

**File:** `src/components/SettingsPage.jsx`

**Add this link in User Profile dropdown:**

```javascript
{/* Google Sheets Import - Super Admin + Desktop Only */}
{user.role === 'super_admin' && (
  <Link
    to="/sheets-import"
    className="hidden md:flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
  >
    <FontAwesomeIcon icon={faTable} className="mr-3" />
    นำเข้าจาก Google Sheets
  </Link>
)}
```

---

### Step 4: Add Route

**File:** `src/App.jsx` or router file

```javascript
import GoogleSheetsImportPage from './components/sheets/GoogleSheetsImportPage';

// Add route
<Route
  path="/sheets-import"
  element={
    <PrivateRoute>
      <GoogleSheetsImportPage />
    </PrivateRoute>
  }
/>
```

---

## Component Specifications

### SheetUrlInput.jsx

**Purpose:** Step 1 - Input Google Sheet URL and sheet name

**Features:**
- Input: Sheet URL
- Input: Sheet name (default: "Sheet1")
- Button: "ดึงข้อมูล" (Fetch Data)
- Calls: `SheetsImportService.fetchSheetPreview()`
- Shows loading state
- Shows error if invalid URL or sheet not found

**Props:**
```javascript
{
  onSuccess: (data) => {}  // { headers, sample_rows, field_detections }
}
```

---

### SheetPreview.jsx

**Purpose:** Step 2 - Preview headers and first 5 rows

**Features:**
- Display headers as table columns
- Display first 5 data rows
- Show total row count
- Show detected field types (badges)
- Button: "ถัดไป" (Next)
- Button: "ย้อนกลับ" (Back)

**Props:**
```javascript
{
  data: {
    headers: [],
    sample_rows: [],
    total_rows: 0,
    field_detections: []
  },
  onNext: () => {},
  onBack: () => {}
}
```

---

### FieldMappingTable.jsx

**Purpose:** Step 3 - Map sheet columns to form fields

**Features:**
- Select form (dropdown)
- For each sheet column:
  - Show column name
  - Show detected type (badge)
  - Dropdown: Select field to map to
  - Dropdown: Override field type (optional)
  - Checkbox: Skip this column
- Display sample values from sheet
- Button: "เริ่มนำเข้า" (Start Import)
- Button: "ย้อนกลับ" (Back)

**Props:**
```javascript
{
  sheetData: { headers, sample_rows, field_detections },
  selectedForm: null,
  onFormSelect: (form) => {},
  onMappingComplete: (mapping) => {},
  onBack: () => {}
}
```

**Field Mapping Structure:**
```javascript
[
  {
    sheet_column: "ชื่อ",
    field_id: "uuid-123",
    field_type: "short_answer",
    skip: false
  }
]
```

---

### ImportProgress.jsx

**Purpose:** Step 4 - Execute import and show progress

**Features:**
- Create import config
- Call `executeImport(configId)`
- Real-time progress bar
- Show: X of Y rows processed
- Show: Success count, Error count
- Display errors with row numbers
- Button: "ดูประวัติ" (View History) when complete
- Button: "นำเข้าใหม่" (New Import)

**Props:**
```javascript
{
  sheetData: {},
  selectedForm: {},
  fieldMapping: [],
  onComplete: () => {}
}
```

---

## API Endpoints Needed (Backend)

Create these in `backend/api/routes/sheets.routes.js`:

```javascript
const express = require('express');
const router = express.Router();
const GoogleSheetsService = require('../../services/GoogleSheetsService');
const SheetImportService = require('../../services/SheetImportService');
const { authenticate, requireSuperAdmin } = require('../middleware/auth');

// All routes require Super Admin
router.use(authenticate);
router.use(requireSuperAdmin);

// 1. Preview sheet
router.post('/preview', async (req, res) => {
  const { sheet_url, sheet_name } = req.body;

  try {
    const rows = await GoogleSheetsService.fetchSheetDataPublic(
      sheet_url,
      sheet_name
    );

    const headers = rows[0];
    const sampleRows = rows.slice(1, 6); // First 5 rows
    const detections = GoogleSheetsService.detectFieldTypes(
      headers,
      rows.slice(1, 11)
    );

    res.json({
      headers,
      sample_rows: sampleRows,
      total_rows: rows.length - 1,
      field_detections: detections
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Create import config
router.post('/configs', async (req, res) => {
  const { form_id, sheet_url, sheet_name, field_mapping } = req.body;

  try {
    const config = await SheetImportConfig.create({
      user_id: req.user.id,
      form_id,
      sheet_url,
      sheet_name,
      google_sheet_id: GoogleSheetsService.extractSheetId(sheet_url),
      field_mapping
    });

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Execute import
router.post('/configs/:id/execute', async (req, res) => {
  try {
    const result = await SheetImportService.executeImport(
      req.user.id,
      req.params.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Get history
router.get('/history', async (req, res) => {
  try {
    const history = await SheetImportService.getUserImportHistory(
      req.user.id,
      50
    );
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Rollback
router.post('/history/:id/rollback', async (req, res) => {
  try {
    const result = await SheetImportService.rollbackImport(
      req.user.id,
      req.params.id
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

## requireSuperAdmin Middleware

**File:** `backend/api/middleware/auth.js`

Add this middleware:

```javascript
const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'This feature is only available to Super Admins'
    });
  }
  next();
};

module.exports = {
  authenticate,
  requireSuperAdmin
};
```

---

## Testing Checklist

### Access Control
- [ ] Super Admin can access /sheets-import
- [ ] Other roles (admin, moderator) cannot access
- [ ] Returns 403 Forbidden on API calls

### Device Restrictions
- [ ] Menu link visible on desktop (≥768px)
- [ ] Menu link hidden on mobile (<768px)
- [ ] Page shows "ใช้งานได้บน PC เท่านั้น" on mobile

### Functionality
- [ ] Can input Google Sheet URL
- [ ] Can preview headers and data
- [ ] Can select form to import to
- [ ] Can map columns to fields
- [ ] Can override field types
- [ ] Import executes successfully
- [ ] Progress shows accurately
- [ ] Errors displayed with row numbers
- [ ] Can view import history
- [ ] Can rollback import

---

## Next Session Tasks

1. ✅ Create API routes file
2. ✅ Add requireSuperAdmin middleware
3. ✅ Create SheetsImportService client
4. ✅ Create main page component
5. ✅ Create 4 step components
6. ✅ Add menu link to SettingsPage
7. ✅ Add route to App.jsx
8. ✅ Test complete flow

---

**Status:** Plan Complete - Ready to implement
**Estimated Time:** 3-4 hours
**Breaking Changes:** None
