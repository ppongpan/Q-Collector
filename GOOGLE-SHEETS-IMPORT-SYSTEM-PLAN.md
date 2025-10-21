# Google Sheets Import System - Complete Architecture & Implementation Plan

**Project:** Q-Collector v0.8.0 - Google Sheets Integration
**Priority:** 🟡 **HIGH** - New Feature Development
**Status:** 📋 **PLANNING PHASE** - Architecture Design Complete
**Timeline:** 4-5 Weeks (Sprint 10-11)
**Date:** 2025-10-16
**User Impact:** HIGH - Enable bulk data import from Google Sheets

---

## 📋 Executive Summary

### Business Problem

**Current Limitations:**
1. ❌ Manual data entry only - no bulk import capability
2. ❌ Cannot migrate existing data from spreadsheets
3. ❌ Time-consuming for large datasets (100+ records)
4. ❌ Error-prone manual field mapping
5. ❌ No integration with existing Google Sheets workflows

**User Request (Thai):**
> "ต้องการสร้างระบบ import ตารางข้อมูลจาก google sheet โดยการระบุ link และ ชื่อ sheet ระบบจะดึงข้อมูลแถวแรกสร้างเป็นชื่อ column และนำข้อมูลในแต่ละแถวมาบันทึกลงในฐานข้อมูลโดยอัตโนมัติ โดยสร้าง link เพื่อเข้าตั้งค่า import google sheets ที่เมนู user profile ที่มี เมนูตั้งค่า และ ออกจากระบบอยู่ โดยระบบ import จะมีการระบุว่า import เข้า main form หรือจะ import เข้า sub-form มีระบบตรวจสอบ ชนิดของ field ได้เบื้องต้น และต้องสามารถเข้าไป edit form เพื่อเปลี่ยน field type ได้ด้วย ทั้ง main form และ sub-form"

### Solution Overview

**Google Sheets Import System** with:
1. ✅ OAuth2 authentication with Google
2. ✅ Sheet URL + Sheet name input
3. ✅ Auto-detect headers from row 1
4. ✅ Smart field type detection
5. ✅ Main form / Sub-form import support
6. ✅ Field mapping editor with type override
7. ✅ Bulk import with validation
8. ✅ Import history & rollback capability

---

## 🎯 Feature Requirements

### Core Features

#### 1. Google Sheets Connection (Authentication)
- ✅ OAuth2 flow with Google API
- ✅ Store access token securely (encrypted)
- ✅ Refresh token handling
- ✅ Multiple accounts support (optional)
- ✅ Permission scope: Read-only spreadsheets

#### 2. Import Configuration UI (User Profile Menu)
- ✅ New menu item: "นำเข้าจาก Google Sheets"
- ✅ Located in User Profile dropdown (next to Settings, Logout)
- ✅ Import configuration wizard:
  - Step 1: Connect Google account
  - Step 2: Paste Sheet URL + Sheet name
  - Step 3: Preview headers
  - Step 4: Select target form (Main/Sub-form)
  - Step 5: Map fields (auto-detect types)
  - Step 6: Review & Import

#### 3. Field Type Auto-Detection
- ✅ Analyze sample data (first 10 rows)
- ✅ Detect patterns:
  - **Text**: Contains letters, mixed characters
  - **Number**: Only digits, decimals
  - **Email**: Contains @ and domain
  - **Phone**: 10 digits, starts with 0
  - **Date**: DD/MM/YYYY, MM/DD/YYYY patterns
  - **URL**: Starts with http://, https://
  - **Boolean**: Yes/No, True/False, 1/0
- ✅ Confidence score for each detection
- ✅ Fallback to "short_answer" if uncertain

#### 4. Field Mapping Editor
- ✅ Visual column → field mapping interface
- ✅ Drag-and-drop or dropdown selection
- ✅ Override field type manually
- ✅ Create new fields on-the-fly
- ✅ Skip columns not needed
- ✅ Preview mapped data (first 5 rows)

#### 5. Import Execution
- ✅ Validate all rows before import
- ✅ Show validation errors (row number + error message)
- ✅ Option to skip invalid rows or abort
- ✅ Progress indicator (X of Y rows imported)
- ✅ Transaction-safe (rollback on critical error)
- ✅ Create submissions automatically
- ✅ Support sub-form import (link to parent submission)

#### 6. Import History & Management
- ✅ List of all imports (date, form, rows, status)
- ✅ View import details (mapping used, errors)
- ✅ Rollback capability (delete imported submissions)
- ✅ Re-run import with same configuration

---

## 🏗️ System Architecture

### 1. Database Schema

#### New Table: `sheet_import_configs`
```sql
CREATE TABLE sheet_import_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
  sub_form_id UUID REFERENCES forms(id) ON DELETE SET NULL, -- NULL = main form

  -- Google Sheets connection
  sheet_url VARCHAR(500) NOT NULL,
  sheet_name VARCHAR(255) NOT NULL,
  google_sheet_id VARCHAR(255), -- Extracted from URL

  -- Field mapping (JSON)
  field_mapping JSONB NOT NULL,
  -- Example: [
  --   { "sheet_column": "Full Name", "field_id": "uuid", "field_type": "short_answer" },
  --   { "sheet_column": "Email", "field_id": "uuid", "field_type": "email" }
  -- ]

  -- Configuration
  skip_header_row BOOLEAN DEFAULT true,
  auto_create_fields BOOLEAN DEFAULT false,

  -- Status
  last_import_at TIMESTAMP,
  total_imports INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sheet_import_configs_user ON sheet_import_configs(user_id);
CREATE INDEX idx_sheet_import_configs_form ON sheet_import_configs(form_id);
```

#### New Table: `sheet_import_history`
```sql
CREATE TABLE sheet_import_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_id UUID REFERENCES sheet_import_configs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  form_id UUID REFERENCES forms(id) ON DELETE CASCADE,

  -- Import details
  total_rows INTEGER NOT NULL,
  success_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,

  -- Errors (JSON)
  errors JSONB, -- [{ "row": 5, "error": "Invalid email format" }]

  -- Created submissions (for rollback)
  submission_ids JSONB, -- ["uuid1", "uuid2", ...]

  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, running, completed, failed
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sheet_import_history_config ON sheet_import_history(config_id);
CREATE INDEX idx_sheet_import_history_user ON sheet_import_history(user_id);
CREATE INDEX idx_sheet_import_history_status ON sheet_import_history(status);
```

#### New Table: `google_auth_tokens`
```sql
CREATE TABLE google_auth_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,

  -- OAuth2 tokens (encrypted)
  access_token TEXT NOT NULL, -- AES-256 encrypted
  refresh_token TEXT NOT NULL, -- AES-256 encrypted
  token_expires_at TIMESTAMP NOT NULL,

  -- Google account info
  google_email VARCHAR(255),
  google_id VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_google_auth_tokens_user ON google_auth_tokens(user_id);
```

---

### 2. Backend Architecture

#### Google Sheets Service (`backend/services/GoogleSheetsService.js`)

```javascript
/**
 * Google Sheets Service v0.8.0
 * Handles Google Sheets API integration
 */

const { google } = require('googleapis');
const crypto = require('crypto');

class GoogleSheetsService {

  /**
   * Initiate OAuth2 flow
   * Returns authorization URL for user
   */
  async getAuthorizationUrl(userId) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const scopes = ['https://www.googleapis.com/auth/spreadsheets.readonly'];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId // Pass userId for callback
    });

    return authUrl;
  }

  /**
   * Handle OAuth2 callback
   * Exchange code for tokens and store encrypted
   */
  async handleOAuthCallback(code, userId) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    const { tokens } = await oauth2Client.getToken(code);

    // Get user info
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    // Encrypt tokens before storage
    const encryptedAccessToken = this.encrypt(tokens.access_token);
    const encryptedRefreshToken = this.encrypt(tokens.refresh_token);

    // Store in database
    await GoogleAuthToken.upsert({
      user_id: userId,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      token_expires_at: new Date(tokens.expiry_date),
      google_email: data.email,
      google_id: data.id
    });

    return { email: data.email };
  }

  /**
   * Get authenticated Google Sheets client for user
   */
  async getAuthenticatedClient(userId) {
    const authToken = await GoogleAuthToken.findOne({ where: { user_id: userId } });

    if (!authToken) {
      throw new Error('User not authenticated with Google');
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    // Decrypt tokens
    const accessToken = this.decrypt(authToken.access_token);
    const refreshToken = this.decrypt(authToken.refresh_token);

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    });

    // Check if token expired, refresh if needed
    if (new Date() > authToken.token_expires_at) {
      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update stored tokens
      await authToken.update({
        access_token: this.encrypt(credentials.access_token),
        token_expires_at: new Date(credentials.expiry_date)
      });

      oauth2Client.setCredentials(credentials);
    }

    return google.sheets({ version: 'v4', auth: oauth2Client });
  }

  /**
   * Extract Sheet ID from URL
   */
  extractSheetId(url) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error('Invalid Google Sheets URL');
    }
    return match[1];
  }

  /**
   * Fetch sheet data
   */
  async fetchSheetData(userId, sheetUrl, sheetName, range = null) {
    const sheets = await this.getAuthenticatedClient(userId);
    const sheetId = this.extractSheetId(sheetUrl);

    const rangeString = range || `${sheetName}!A1:ZZ`; // Read all columns

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: rangeString
    });

    return response.data.values || [];
  }

  /**
   * Detect field types from sample data
   */
  detectFieldTypes(headers, rows) {
    const detections = [];

    headers.forEach((header, colIndex) => {
      const columnData = rows.map(row => row[colIndex]).filter(v => v);

      const detection = {
        column_name: header,
        column_index: colIndex,
        detected_type: 'short_answer', // Default
        confidence: 0,
        sample_values: columnData.slice(0, 5)
      };

      // Email detection
      if (this.isEmailColumn(columnData)) {
        detection.detected_type = 'email';
        detection.confidence = 0.95;
      }
      // Phone detection
      else if (this.isPhoneColumn(columnData)) {
        detection.detected_type = 'phone';
        detection.confidence = 0.90;
      }
      // Number detection
      else if (this.isNumberColumn(columnData)) {
        detection.detected_type = 'number';
        detection.confidence = 0.85;
      }
      // Date detection
      else if (this.isDateColumn(columnData)) {
        detection.detected_type = 'date';
        detection.confidence = 0.80;
      }
      // URL detection
      else if (this.isUrlColumn(columnData)) {
        detection.detected_type = 'url';
        detection.confidence = 0.90;
      }

      detections.push(detection);
    });

    return detections;
  }

  // Helper: Email pattern check
  isEmailColumn(values) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const matches = values.filter(v => emailRegex.test(v));
    return matches.length / values.length > 0.8; // 80% match
  }

  // Helper: Phone pattern check (Thai format)
  isPhoneColumn(values) {
    const phoneRegex = /^0\d{9}$/;
    const matches = values.filter(v => phoneRegex.test(v.replace(/\s|-/g, '')));
    return matches.length / values.length > 0.8;
  }

  // Helper: Number pattern check
  isNumberColumn(values) {
    const matches = values.filter(v => !isNaN(parseFloat(v)) && isFinite(v));
    return matches.length / values.length > 0.9; // 90% match
  }

  // Helper: Date pattern check
  isDateColumn(values) {
    const datePatterns = [
      /^\d{1,2}\/\d{1,2}\/\d{4}$/, // DD/MM/YYYY
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    ];

    const matches = values.filter(v => {
      return datePatterns.some(pattern => pattern.test(v));
    });

    return matches.length / values.length > 0.8;
  }

  // Helper: URL pattern check
  isUrlColumn(values) {
    const urlRegex = /^https?:\/\/.+/;
    const matches = values.filter(v => urlRegex.test(v));
    return matches.length / values.length > 0.8;
  }

  // Encryption helpers
  encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

module.exports = new GoogleSheetsService();
```

---

#### Sheet Import Service (`backend/services/SheetImportService.js`)

```javascript
/**
 * Sheet Import Service v0.8.0
 * Handles import execution and validation
 */

const { sequelize } = require('../config/database');
const GoogleSheetsService = require('./GoogleSheetsService');
const SubmissionService = require('./SubmissionService');

class SheetImportService {

  /**
   * Preview import (first 10 rows)
   */
  async previewImport(userId, configId) {
    const config = await SheetImportConfig.findByPk(configId);

    if (!config || config.user_id !== userId) {
      throw new Error('Import configuration not found');
    }

    // Fetch sheet data
    const rows = await GoogleSheetsService.fetchSheetData(
      userId,
      config.sheet_url,
      config.sheet_name
    );

    if (rows.length === 0) {
      throw new Error('Sheet is empty');
    }

    const headers = rows[0];
    const dataRows = rows.slice(1, 11); // First 10 rows

    // Apply field mapping
    const preview = dataRows.map((row, index) => {
      const mapped = {};

      config.field_mapping.forEach(mapping => {
        const colIndex = headers.indexOf(mapping.sheet_column);
        if (colIndex !== -1) {
          mapped[mapping.field_id] = {
            value: row[colIndex],
            field_type: mapping.field_type
          };
        }
      });

      return {
        row_number: index + 2, // +2 because of header + 0-index
        data: mapped
      };
    });

    return {
      headers,
      preview,
      total_rows: rows.length - 1
    };
  }

  /**
   * Execute full import
   */
  async executeImport(userId, configId) {
    const config = await SheetImportConfig.findByPk(configId);

    if (!config || config.user_id !== userId) {
      throw new Error('Import configuration not found');
    }

    // Create import history record
    const history = await SheetImportHistory.create({
      config_id: configId,
      user_id: userId,
      form_id: config.form_id,
      status: 'running',
      started_at: new Date()
    });

    try {
      // Fetch all sheet data
      const rows = await GoogleSheetsService.fetchSheetData(
        userId,
        config.sheet_url,
        config.sheet_name
      );

      const headers = rows[0];
      const dataRows = rows.slice(1);

      await history.update({ total_rows: dataRows.length });

      const submissionIds = [];
      const errors = [];
      let successCount = 0;
      let failedCount = 0;

      // Import each row in transaction
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNumber = i + 2;

        try {
          // Map row data to form fields
          const submissionData = {};

          config.field_mapping.forEach(mapping => {
            const colIndex = headers.indexOf(mapping.sheet_column);
            if (colIndex !== -1 && row[colIndex]) {
              submissionData[mapping.field_id] = {
                value: row[colIndex]
              };
            }
          });

          // Validate submission data
          const validation = await this.validateSubmissionData(
            config.form_id,
            submissionData
          );

          if (!validation.valid) {
            errors.push({
              row: rowNumber,
              errors: validation.errors
            });
            failedCount++;
            continue;
          }

          // Create submission
          const submission = await SubmissionService.createSubmission({
            form_id: config.form_id,
            sub_form_id: config.sub_form_id,
            data: submissionData,
            submitted_by: userId
          });

          submissionIds.push(submission.id);
          successCount++;

        } catch (error) {
          console.error(`Row ${rowNumber} import failed:`, error);
          errors.push({
            row: rowNumber,
            error: error.message
          });
          failedCount++;
        }
      }

      // Update history
      await history.update({
        success_rows: successCount,
        failed_rows: failedCount,
        errors: errors,
        submission_ids: submissionIds,
        status: failedCount > 0 ? 'completed_with_errors' : 'completed',
        completed_at: new Date()
      });

      // Update config
      await config.update({
        last_import_at: new Date(),
        total_imports: config.total_imports + 1
      });

      return {
        history_id: history.id,
        total_rows: dataRows.length,
        success_rows: successCount,
        failed_rows: failedCount,
        errors: errors.slice(0, 100) // Return first 100 errors
      };

    } catch (error) {
      await history.update({
        status: 'failed',
        completed_at: new Date()
      });
      throw error;
    }
  }

  /**
   * Validate submission data against form fields
   */
  async validateSubmissionData(formId, data) {
    const form = await Form.findByPk(formId, {
      include: [{ model: Field }]
    });

    const errors = [];

    form.fields.forEach(field => {
      const fieldData = data[field.id];

      if (field.required && !fieldData) {
        errors.push(`Field "${field.title}" is required`);
        return;
      }

      if (fieldData) {
        // Type-specific validation
        switch (field.type) {
          case 'email':
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldData.value)) {
              errors.push(`Invalid email format in "${field.title}"`);
            }
            break;

          case 'phone':
            if (!/^0\d{9}$/.test(fieldData.value.replace(/\s|-/g, ''))) {
              errors.push(`Invalid phone format in "${field.title}"`);
            }
            break;

          case 'number':
            if (isNaN(parseFloat(fieldData.value))) {
              errors.push(`Invalid number in "${field.title}"`);
            }
            break;

          case 'url':
            try {
              new URL(fieldData.value);
            } catch {
              errors.push(`Invalid URL in "${field.title}"`);
            }
            break;
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Rollback import (delete submissions)
   */
  async rollbackImport(userId, historyId) {
    const history = await SheetImportHistory.findByPk(historyId);

    if (!history || history.user_id !== userId) {
      throw new Error('Import history not found');
    }

    const submissionIds = history.submission_ids;

    if (!submissionIds || submissionIds.length === 0) {
      throw new Error('No submissions to rollback');
    }

    // Delete all submissions in transaction
    await sequelize.transaction(async (t) => {
      await Submission.destroy({
        where: { id: submissionIds },
        transaction: t
      });
    });

    await history.update({
      status: 'rolled_back',
      submission_ids: []
    });

    return {
      deleted_count: submissionIds.length
    };
  }
}

module.exports = new SheetImportService();
```

---

### 3. API Endpoints (`backend/api/routes/sheets.routes.js`)

```javascript
/**
 * Google Sheets Import Routes v0.8.0
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const GoogleSheetsService = require('../../services/GoogleSheetsService');
const SheetImportService = require('../../services/SheetImportService');

// 1. Get Google OAuth2 authorization URL
router.get('/auth/google/url', authenticate, async (req, res) => {
  try {
    const authUrl = await GoogleSheetsService.getAuthorizationUrl(req.user.id);
    res.json({ auth_url: authUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Handle OAuth2 callback
router.post('/auth/google/callback', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    const result = await GoogleSheetsService.handleOAuthCallback(code, req.user.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Check Google authentication status
router.get('/auth/status', authenticate, async (req, res) => {
  try {
    const token = await GoogleAuthToken.findOne({ where: { user_id: req.user.id } });
    res.json({
      authenticated: !!token,
      google_email: token?.google_email
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Fetch sheet headers (preview)
router.post('/preview', authenticate, async (req, res) => {
  try {
    const { sheet_url, sheet_name } = req.body;

    const rows = await GoogleSheetsService.fetchSheetData(
      req.user.id,
      sheet_url,
      sheet_name
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Sheet is empty' });
    }

    const headers = rows[0];
    const sampleRows = rows.slice(1, 11); // First 10 rows

    // Detect field types
    const detections = GoogleSheetsService.detectFieldTypes(headers, sampleRows);

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

// 5. Create import configuration
router.post('/configs', authenticate, async (req, res) => {
  try {
    const {
      form_id,
      sub_form_id,
      sheet_url,
      sheet_name,
      field_mapping
    } = req.body;

    const config = await SheetImportConfig.create({
      user_id: req.user.id,
      form_id,
      sub_form_id,
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

// 6. Get user's import configurations
router.get('/configs', authenticate, async (req, res) => {
  try {
    const configs = await SheetImportConfig.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: Form, as: 'form' },
        { model: Form, as: 'subForm' }
      ],
      order: [['created_at', 'DESC']]
    });

    res.json(configs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Preview import
router.get('/configs/:id/preview', authenticate, async (req, res) => {
  try {
    const preview = await SheetImportService.previewImport(
      req.user.id,
      req.params.id
    );
    res.json(preview);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Execute import
router.post('/configs/:id/execute', authenticate, async (req, res) => {
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

// 9. Get import history
router.get('/history', authenticate, async (req, res) => {
  try {
    const history = await SheetImportHistory.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: SheetImportConfig, as: 'config' },
        { model: Form, as: 'form' }
      ],
      order: [['started_at', 'DESC']],
      limit: 50
    });

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Rollback import
router.post('/history/:id/rollback', authenticate, async (req, res) => {
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

// 11. Delete import configuration
router.delete('/configs/:id', authenticate, async (req, res) => {
  try {
    await SheetImportConfig.destroy({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

### 4. Frontend Components

#### Component Structure

```
src/
├── components/
│   ├── sheets/
│   │   ├── GoogleSheetsImport.jsx          # Main wizard container
│   │   ├── SheetConnectionStep.jsx         # Step 1: Google auth
│   │   ├── SheetSelectionStep.jsx          # Step 2: URL + sheet name
│   │   ├── FieldMappingStep.jsx            # Step 3: Map fields
│   │   ├── ImportPreviewStep.jsx           # Step 4: Review
│   │   ├── ImportProgressStep.jsx          # Step 5: Execution
│   │   ├── ImportConfigsList.jsx           # List saved configs
│   │   ├── ImportHistoryList.jsx           # List past imports
│   │   └── FieldTypeBadge.jsx              # Display field type
│   └── ui/
│       ├── import-wizard-stepper.jsx       # Stepper UI
│       └── field-mapping-table.jsx         # Drag-drop mapping
```

---

#### Main Component: `GoogleSheetsImport.jsx`

```javascript
/**
 * Google Sheets Import Wizard
 * Main container component
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../ui/glass-card';
import SheetConnectionStep from './SheetConnectionStep';
import SheetSelectionStep from './SheetSelectionStep';
import FieldMappingStep from './FieldMappingStep';
import ImportPreviewStep from './ImportPreviewStep';
import ImportProgressStep from './ImportProgressStep';
import ImportWizardStepper from '../ui/import-wizard-stepper';

const GoogleSheetsImport = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [importData, setImportData] = useState({
    authenticated: false,
    googleEmail: null,
    sheetUrl: '',
    sheetName: '',
    headers: [],
    sampleRows: [],
    totalRows: 0,
    fieldDetections: [],
    selectedForm: null,
    isSubForm: false,
    fieldMapping: [],
    importResult: null
  });

  const steps = [
    { number: 1, title: 'เชื่อมต่อ Google', icon: 'faGoogle' },
    { number: 2, title: 'เลือก Sheet', icon: 'faTable' },
    { number: 3, title: 'จับคู่ฟิลด์', icon: 'faExchangeAlt' },
    { number: 4, title: 'ตรวจสอบ', icon: 'faCheckCircle' },
    { number: 5, title: 'นำเข้าข้อมูล', icon: 'faCloudUploadAlt' }
  ];

  const updateImportData = (newData) => {
    setImportData(prev => ({ ...prev, ...newData }));
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <SheetConnectionStep
            data={importData}
            onUpdate={updateImportData}
            onNext={nextStep}
          />
        );
      case 2:
        return (
          <SheetSelectionStep
            data={importData}
            onUpdate={updateImportData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <FieldMappingStep
            data={importData}
            onUpdate={updateImportData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
        return (
          <ImportPreviewStep
            data={importData}
            onUpdate={updateImportData}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 5:
        return (
          <ImportProgressStep
            data={importData}
            onUpdate={updateImportData}
            onBack={() => setCurrentStep(1)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          นำเข้าข้อมูลจาก Google Sheets
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          นำเข้าข้อมูลจำนวนมากจาก Google Sheets เข้าสู่ฟอร์มของคุณ
        </p>
      </motion.div>

      {/* Stepper */}
      <ImportWizardStepper
        steps={steps}
        currentStep={currentStep}
        className="mb-8"
      />

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <GlassCard className="p-6">
            {renderStep()}
          </GlassCard>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default GoogleSheetsImport;
```

---

#### Step 1: `SheetConnectionStep.jsx`

```javascript
/**
 * Step 1: Google Authentication
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faGoogle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';
import { GlassButton } from '../ui/glass-button';
import apiClient from '../../services/ApiClient';
import { useEnhancedToast } from '../ui/enhanced-toast';

const SheetConnectionStep = ({ data, onUpdate, onNext }) => {
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const toast = useEnhancedToast();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await apiClient.get('/api/sheets/auth/status');
      onUpdate({
        authenticated: response.data.authenticated,
        googleEmail: response.data.google_email
      });
    } catch (error) {
      console.error('Failed to check auth status:', error);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      setLoading(true);

      // Get authorization URL
      const response = await apiClient.get('/api/sheets/auth/google/url');
      const authUrl = response.data.auth_url;

      // Open popup window
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        authUrl,
        'Google OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for callback
      window.addEventListener('message', async (event) => {
        if (event.data.type === 'google-auth-callback') {
          popup.close();

          // Exchange code for tokens
          await apiClient.post('/api/sheets/auth/google/callback', {
            code: event.data.code
          });

          toast.success('เชื่อมต่อ Google สำเร็จ!');
          await checkAuthStatus();
        }
      });

    } catch (error) {
      console.error('Google auth failed:', error);
      toast.error('การเชื่อมต่อ Google ล้มเหลว');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">กำลังตรวจสอบการเชื่อมต่อ...</p>
      </div>
    );
  }

  if (data.authenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
          className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"
        >
          <FontAwesomeIcon
            icon={faCheckCircle}
            className="text-4xl text-green-600 dark:text-green-400"
          />
        </motion.div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          เชื่อมต่อสำเร็จ!
        </h2>

        <p className="text-gray-600 dark:text-gray-400 mb-8">
          เชื่อมต่อกับ Google Account: <strong>{data.googleEmail}</strong>
        </p>

        <GlassButton
          onClick={onNext}
          className="px-8 py-3"
        >
          ถัดไป
        </GlassButton>
      </motion.div>
    );
  }

  return (
    <div className="text-center py-12">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring' }}
        className="w-20 h-20 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center"
      >
        <FontAwesomeIcon
          icon={faGoogle}
          className="text-4xl text-blue-600 dark:text-blue-400"
        />
      </motion.div>

      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        เชื่อมต่อกับ Google Sheets
      </h2>

      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
        เชื่อมต่อ Google Account เพื่ออ่านข้อมูลจาก Google Sheets ของคุณ
        <br />
        เราจะเข้าถึงเฉพาะสิทธิ์อ่านเท่านั้น
      </p>

      <GlassButton
        onClick={handleConnectGoogle}
        loading={loading}
        className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
      >
        <FontAwesomeIcon icon={faGoogle} className="mr-2" />
        เชื่อมต่อกับ Google
      </GlassButton>
    </div>
  );
};

export default SheetConnectionStep;
```

---

## 📊 Implementation Timeline

### Sprint 10 - Week 1-2 (Backend Foundation)

**Week 1: Database & Google API Integration**
- Day 1-2: Database schema + migrations
- Day 3-4: GoogleSheetsService.js (OAuth2, fetch, encryption)
- Day 5: Google OAuth2 flow testing

**Week 2: Import Logic & API**
- Day 1-2: SheetImportService.js (validation, execution, rollback)
- Day 3-4: API routes (11 endpoints)
- Day 5: Backend testing & error handling

### Sprint 11 - Week 3-4 (Frontend & Integration)

**Week 3: UI Components**
- Day 1-2: Wizard components (5 steps)
- Day 3: Field mapping UI (drag-drop)
- Day 4: Import history & configs list
- Day 5: User profile menu integration

**Week 4: Testing & Polish**
- Day 1-2: E2E testing (Playwright)
- Day 3: Error handling & edge cases
- Day 4: UX polish & animations
- Day 5: Documentation & user guide

---

## ✅ Success Metrics

**Functional Requirements:**
- ✅ OAuth2 authentication with Google
- ✅ Read data from any public/private Google Sheet
- ✅ Auto-detect field types (80%+ accuracy)
- ✅ Manual field type override
- ✅ Import to main form or sub-form
- ✅ Validation before import (prevent bad data)
- ✅ Rollback capability
- ✅ Import history tracking

**Performance Requirements:**
- ✅ Support 1000+ row imports (<30 seconds)
- ✅ Progress indicator during import
- ✅ Transaction-safe (all-or-nothing option)

**UX Requirements:**
- ✅ Intuitive wizard flow (5 steps)
- ✅ Clear error messages with row numbers
- ✅ Preview before import
- ✅ Beautiful glass morphism UI
- ✅ Mobile-friendly (responsive)

---

## 🎯 Next Steps

1. ✅ Create detailed implementation plan (THIS DOCUMENT)
2. ✅ Write specialized agent specifications
3. ⏳ Start Sprint 10 (Backend development)
4. ⏳ Start Sprint 11 (Frontend development)
5. ⏳ User testing & feedback
6. ⏳ Production deployment

---

**Ready to Implement** 🚀
**Version:** v0.8.0-sheets-import
**Breaking Changes:** None
**Dependencies:** googleapis, crypto (Node.js built-in)
