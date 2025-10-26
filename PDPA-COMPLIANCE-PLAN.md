# Q-Collector PDPA Compliance System
**Comprehensive Privacy & Consent Management**

**Version**: v0.9.0-dev (PDPA Module)
**Start Date**: 2025-10-23
**Estimated Duration**: 25 hours (3-4 days)
**Status**: 📋 PLANNING PHASE

---

## 🎯 Executive Summary

ระบบ PDPA Compliance ที่ครบถ้วนสำหรับ Q-Collector ประกอบด้วย 6 โมดูลหลัก:

1. **Privacy Notice System** - แจ้งนโยบายความเป็นส่วนตัวแบบ flexible
2. **Consent Management** - จัดการคำยินยอมหลายรายการต่อฟอร์ม
3. **Personal Data Inventory** - ติดตามข้อมูลส่วนบุคคลทุกฟิลด์
4. **User Identity Resolution** - รวมข้อมูล user ที่เป็นคนเดียวกัน
5. **Consent Dashboard** - แดชบอร์ดสรุปข้อมูล PDPA
6. **Data Subject Rights (DSR) Portal** - ระบบใช้สิทธิ์ของเจ้าของข้อมูล

---

## 📊 Requirement Analysis

### 1. Privacy Notice System

**ความต้องการ**:
- เปิด/ปิดใช้งานได้ต่อฟอร์ม
- 3 โหมด:
  1. **Disabled** - ไม่แสดง privacy notice
  2. **Custom Text** - พิมพ์ข้อความเอง (รองรับ Thai + English)
  3. **External Link** - แสดงลิงก์ไปยังนโยบายความเป็นส่วนตัว

**ตัวอย่าง UI**:
```
┌────────────────────────────────────────────┐
│ 📋 นโยบายความเป็นส่วนตัว                 │
├────────────────────────────────────────────┤
│ เราเก็บรวบรวมข้อมูลส่วนบุคคลของคุณเพื่อ  │
│ [วัตถุประสงค์ที่ระบุ]                     │
│                                            │
│ อ่านเพิ่มเติม: [นโยบายความเป็นส่วนตัว]  │
│                                            │
│ ☑️ ฉันได้อ่านและยอมรับนโยบาย             │
└────────────────────────────────────────────┘
```

**Data Model**:
```javascript
// form.settings.privacyNotice
{
  enabled: true,
  mode: 'custom' | 'link' | 'disabled',
  customText: {
    th: 'ข้อความภาษาไทย...',
    en: 'English text...'
  },
  linkUrl: 'https://example.com/privacy',
  linkText: {
    th: 'นโยบายความเป็นส่วนตัว',
    en: 'Privacy Policy'
  },
  requireAcknowledgment: true
}
```

---

### 2. Consent Management System

**ความต้องการ**:
- เปิดใช้งานเฉพาะฟอร์มสำคัญ
- สร้างคำยินยอมได้หลายรายการต่อฟอร์ม (1-10 items)
- แต่ละคำยินยอมมี:
  - ชื่อ (Thai + English)
  - คำอธิบาย (Thai + English)
  - บังคับหรือไม่บังคับ
  - วัตถุประสงค์การเก็บข้อมูล
  - ระยะเวลาเก็บรักษา
  - เวอร์ชัน (สำหรับติดตามการเปลี่ยนแปลง)

**ตัวอย่าง Consent Items**:
```javascript
[
  {
    id: 'consent_001',
    title: {
      th: 'การเก็บรวบรวมข้อมูลส่วนบุคคล',
      en: 'Personal Data Collection'
    },
    description: {
      th: 'ยินยอมให้เก็บรวบรวมข้อมูลส่วนบุคคลเพื่อติดต่อและให้บริการ',
      en: 'Consent to collect personal data for contact and service'
    },
    purpose: 'Contact and Service Delivery',
    retentionPeriod: '2 years',
    required: true,
    version: 1,
    order: 1
  },
  {
    id: 'consent_002',
    title: {
      th: 'การรับข้อมูลข่าวสารทางการตลาด',
      en: 'Marketing Communications'
    },
    description: {
      th: 'ยินยอมรับข้อมูลข่าวสารทางการตลาดผ่าน Email และ SMS',
      en: 'Consent to receive marketing via Email and SMS'
    },
    purpose: 'Marketing',
    retentionPeriod: 'Until withdrawal',
    required: false,
    version: 1,
    order: 2
  }
]
```

**Database Schema**:

**Table: consent_items**
```sql
CREATE TABLE consent_items (
  id UUID PRIMARY KEY,
  form_id UUID REFERENCES forms(id),
  title_th VARCHAR(255) NOT NULL,
  title_en VARCHAR(255),
  description_th TEXT,
  description_en TEXT,
  purpose TEXT NOT NULL,
  retention_period VARCHAR(100),
  required BOOLEAN DEFAULT false,
  "order" INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Table: user_consents**
```sql
CREATE TABLE user_consents (
  id UUID PRIMARY KEY,
  submission_id UUID REFERENCES submissions(id),
  consent_item_id UUID REFERENCES consent_items(id),

  -- User identifier (for tracking across submissions)
  user_email VARCHAR(255),
  user_phone VARCHAR(20),
  user_full_name VARCHAR(255),

  -- Consent details
  consent_given BOOLEAN NOT NULL,
  consent_timestamp TIMESTAMP NOT NULL,
  consent_version INTEGER NOT NULL,

  -- Metadata
  ip_address VARCHAR(45),
  user_agent TEXT,
  form_id UUID REFERENCES forms(id),

  -- Withdrawal tracking
  withdrawn_at TIMESTAMP,
  withdrawal_reason TEXT,
  withdrawn_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_user_email (user_email),
  INDEX idx_user_phone (user_phone),
  INDEX idx_submission_id (submission_id),
  INDEX idx_consent_item_id (consent_item_id)
);
```

---

### 3. Personal Data Inventory

**ความต้องการ**:
- ติดตามว่าแต่ละฟิลด์เก็บข้อมูลส่วนบุคคลประเภทใด
- จำแนกประเภทข้อมูล:
  - **Name** (ชื่อ-นามสกุล)
  - **Email**
  - **Phone**
  - **ID Card** (เลขบัตรประชาชน)
  - **Address** (ที่อยู่)
  - **Date of Birth**
  - **Sensitive Data** (ข้อมูลอ่อนไหว)
- บันทึกวัตถุประสงค์และฐานทางกฎหมาย

**Database Schema**:

**Table: personal_data_fields**
```sql
CREATE TABLE personal_data_fields (
  id UUID PRIMARY KEY,
  form_id UUID REFERENCES forms(id),
  field_id UUID REFERENCES fields(id),

  -- Data classification
  data_category VARCHAR(50) NOT NULL,
    -- Values: 'name', 'email', 'phone', 'id_card', 'address',
    --         'date_of_birth', 'financial', 'health', 'other'

  is_sensitive BOOLEAN DEFAULT false,

  -- PDPA details
  purpose TEXT NOT NULL,
  legal_basis VARCHAR(100),
    -- Values: 'consent', 'contract', 'legal_obligation',
    --         'vital_interest', 'public_interest', 'legitimate_interest'

  retention_period VARCHAR(100),

  -- Auto-detection
  auto_detected BOOLEAN DEFAULT false,
  detected_at TIMESTAMP,
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_form_id (form_id),
  INDEX idx_field_id (field_id),
  INDEX idx_data_category (data_category)
);
```

**Auto-Detection Logic**:
```javascript
function detectPersonalDataType(fieldTitle, fieldType) {
  const lowerTitle = fieldTitle.toLowerCase();

  // Email detection
  if (fieldType === 'email' ||
      lowerTitle.includes('email') ||
      lowerTitle.includes('อีเมล')) {
    return 'email';
  }

  // Phone detection
  if (fieldType === 'phone' ||
      lowerTitle.includes('phone') ||
      lowerTitle.includes('tel') ||
      lowerTitle.includes('เบอร์') ||
      lowerTitle.includes('โทร')) {
    return 'phone';
  }

  // Name detection
  if (lowerTitle.includes('name') ||
      lowerTitle.includes('ชื่อ') ||
      lowerTitle.includes('นามสกุล')) {
    return 'name';
  }

  // ID Card detection
  if (lowerTitle.includes('id card') ||
      lowerTitle.includes('บัตรประชาชน') ||
      lowerTitle.includes('เลขบัตร')) {
    return { category: 'id_card', sensitive: true };
  }

  return null;
}
```

---

### 4. User Identity Resolution

**ความต้องการ**:
- รวมกลุ่ม submissions ที่น่าจะเป็น user คนเดียวกัน
- ใช้เกณฑ์:
  - **Email เหมือนกัน** (primary key, 100% match)
  - **เบอร์โทรศัพท์เหมือนกัน** (90% confidence)
  - **ชื่อ-นามสกุลเหมือนกัน** (fuzzy match, 70% confidence)
- สร้าง unified user profile
- Admin สามารถ merge/unmerge profiles ได้

**Database Schema**:

**Table: unified_user_profiles**
```sql
CREATE TABLE unified_user_profiles (
  id UUID PRIMARY KEY,

  -- Primary identifiers
  primary_email VARCHAR(255) UNIQUE,
  primary_phone VARCHAR(20),
  full_name VARCHAR(255),

  -- Linked identifiers (JSONB arrays)
  linked_emails JSONB DEFAULT '[]',
  linked_phones JSONB DEFAULT '[]',
  linked_names JSONB DEFAULT '[]',

  -- Submission tracking
  submission_ids JSONB DEFAULT '[]',
  form_ids JSONB DEFAULT '[]',

  -- Statistics
  total_submissions INTEGER DEFAULT 0,
  first_submission_date TIMESTAMP,
  last_submission_date TIMESTAMP,

  -- Metadata
  match_confidence DECIMAL(3,2) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  merged_from_ids JSONB DEFAULT '[]',

  INDEX idx_primary_email (primary_email),
  INDEX idx_primary_phone (primary_phone),
  INDEX idx_full_name (full_name)
);
```

**Matching Algorithm**:
```javascript
class UserIdentityResolver {
  async matchUser(submissionData) {
    const { email, phone, fullName } = this.extractIdentifiers(submissionData);

    // Priority 1: Email match (100% confidence)
    if (email) {
      const profile = await this.findByEmail(email);
      if (profile) {
        return { profile, confidence: 1.0, method: 'email' };
      }
    }

    // Priority 2: Phone match (90% confidence)
    if (phone) {
      const profile = await this.findByPhone(phone);
      if (profile) {
        return { profile, confidence: 0.9, method: 'phone' };
      }
    }

    // Priority 3: Fuzzy name match (70% confidence)
    if (fullName) {
      const profile = await this.fuzzyNameMatch(fullName);
      if (profile && profile.similarity > 0.85) {
        return { profile, confidence: 0.7, method: 'name' };
      }
    }

    // No match found - create new profile
    return this.createNewProfile({ email, phone, fullName });
  }

  fuzzyNameMatch(name) {
    // Use Levenshtein distance or Jaro-Winkler similarity
    // Return profiles with similarity > 85%
  }
}
```

---

### 5. Consent Dashboard

**ความต้องการ**:
- **Admin View**: ดูข้อมูล consent ทั้งหมด
- **User Profile View**: ดูข้อมูลของ user แต่ละคน
- แสดง:
  - User identifier (email/phone/name)
  - รายการ consent ที่ให้ไว้
  - ฟอร์มที่เก็บข้อมูล
  - ข้อมูลส่วนบุคคลที่เก็บไว้
  - วันที่ให้ consent
  - สถานะ consent (active/withdrawn)
- Filter by:
  - Consent status
  - Form
  - Date range
  - Data category
- Export ข้อมูลเป็น CSV/Excel

**UI Wireframe**:
```
┌─────────────────────────────────────────────────────────┐
│ PDPA Consent Dashboard                        [Export]  │
├─────────────────────────────────────────────────────────┤
│ Filters:                                                │
│ [Status: All ▼] [Form: All ▼] [Date: Last 30 days ▼]  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ User: john.doe@example.com (091-234-5678)             │
│ ├─ Submissions: 3                                      │
│ ├─ Forms: "Customer Feedback", "Service Request"      │
│ └─ Consents:                                           │
│    ✅ Personal Data Collection (2024-01-15)           │
│    ✅ Marketing Communications (2024-01-15)           │
│    ❌ Data Sharing (Withdrawn: 2024-06-20)           │
│                                                         │
│ Personal Data Collected:                               │
│ ├─ Name: John Doe                                     │
│ ├─ Email: john.doe@example.com                        │
│ ├─ Phone: 091-234-5678                                │
│ └─ Address: [Masked]                                   │
│                                                         │
│ [View Details] [Export User Data] [Process DSR]       │
├─────────────────────────────────────────────────────────┤
│ User: jane.smith@example.com                           │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

**API Endpoints**:
```javascript
// GET /api/v1/pdpa/users - List all unified user profiles
// GET /api/v1/pdpa/users/:id/consents - Get user's consents
// GET /api/v1/pdpa/users/:id/data - Get user's personal data
// GET /api/v1/pdpa/consents/summary - Get consent statistics
// POST /api/v1/pdpa/users/:id/export - Export user data
```

---

### 6. Data Subject Rights (DSR) Portal

**ความต้องการ**:
- **Public Portal**: User สามารถยื่นคำขอใช้สิทธิ์ได้
- **4 สิทธิ์หลัก**:
  1. **Right to Access** (ขอดูข้อมูล) - ส่งรายงานข้อมูลทั้งหมด
  2. **Right to Rectification** (ขอแก้ไข) - ส่งคำขอแก้ไขข้อมูล
  3. **Right to Erasure** (ขอลบ) - ลบข้อมูลออกจากระบบ (soft delete)
  4. **Right to Data Portability** (ขอส่งออกข้อมูล) - Export เป็น JSON/CSV

**Database Schema**:

**Table: dsr_requests**
```sql
CREATE TABLE dsr_requests (
  id UUID PRIMARY KEY,
  request_type VARCHAR(20) NOT NULL,
    -- Values: 'access', 'rectification', 'erasure', 'portability'

  -- User identification
  user_identifier VARCHAR(255) NOT NULL,
    -- Email or phone number
  verification_method VARCHAR(20),
    -- 'email_otp', 'phone_otp', 'manual'
  verified_at TIMESTAMP,

  -- Request details
  request_details JSONB,
    -- For rectification: { field: 'email', old_value: 'old@x.com', new_value: 'new@x.com' }
    -- For erasure: { reason: 'No longer use service' }

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending',
    -- Values: 'pending', 'in_progress', 'completed', 'rejected'

  created_at TIMESTAMP DEFAULT NOW(),
  processed_by UUID REFERENCES users(id),
  processed_at TIMESTAMP,

  -- Response
  response_data JSONB,
    -- For access/portability: { download_url: '...', expires_at: '...' }
    -- For rejection: { reason: '...' }

  -- Audit
  ip_address VARCHAR(45),
  user_agent TEXT,

  INDEX idx_user_identifier (user_identifier),
  INDEX idx_status (status),
  INDEX idx_request_type (request_type)
);
```

**DSR Request Flow**:
```
User Actions:
1. Visit /pdpa/dsr (Public portal)
2. Enter email/phone
3. Receive OTP verification
4. Select request type
5. Fill request form
6. Submit request

Admin Workflow:
1. Receive notification
2. Review request in Admin panel
3. Verify user identity (if needed)
4. Process request:
   - Access: Generate data export
   - Rectification: Update records
   - Erasure: Soft delete + anonymize
   - Portability: Export to JSON/CSV
5. Send response to user
6. Mark as completed
```

---

## 🏗️ Database Architecture

### ER Diagram
```
forms
  └─ consent_items (1:N)
  └─ personal_data_fields (1:N)
       └─ fields (1:1)

submissions
  └─ user_consents (1:N)
       └─ consent_items (N:1)

unified_user_profiles (aggregated view)
  └─ submission_ids[] → submissions
  └─ Statistics and linked identifiers

dsr_requests (independent)
  └─ Links to unified_user_profiles by identifier
```

---

## 🎯 Implementation Phases

### **Phase 1: Database & Models** (4 hours)
**Goal**: สร้าง database schema และ Sequelize models

**Tasks**:
1.1 Create migrations (2 hours)
   - [ ] `consent_items` table
   - [ ] `user_consents` table
   - [ ] `personal_data_fields` table
   - [ ] `unified_user_profiles` table
   - [ ] `dsr_requests` table

1.2 Create Sequelize models (1.5 hours)
   - [ ] ConsentItem.js
   - [ ] UserConsent.js
   - [ ] PersonalDataField.js
   - [ ] UnifiedUserProfile.js
   - [ ] DSRRequest.js
   - [ ] Define associations

1.3 Create seed data (30 min)
   - [ ] Sample consent items
   - [ ] Sample personal data classifications

**Deliverables**:
- 5 migration files
- 5 model files
- Seed data script

---

### **Phase 2: Privacy Notice & Consent UI** (5 hours)
**Goal**: เพิ่ม UI สำหรับกำหนด privacy notice และ consent items

**Tasks**:
2.1 Form Builder: Privacy Notice Settings (1.5 hours)
   - [ ] Add Privacy Notice tab in Form Settings
   - [ ] Toggle enable/disable
   - [ ] 3 mode selector: Disabled, Custom Text, External Link
   - [ ] Text editor for custom text (Thai + English)
   - [ ] Link input for external policy

2.2 Form Builder: Consent Items Builder (2 hours)
   - [ ] Add Consent Management tab
   - [ ] Drag-and-drop list of consent items
   - [ ] Add/Edit/Delete consent items
   - [ ] Fields: Title (TH/EN), Description (TH/EN), Purpose, Retention, Required
   - [ ] Order management
   - [ ] Version tracking

2.3 FormView: Display Privacy Notice & Consents (1.5 hours)
   - [ ] Show privacy notice before form fields
   - [ ] Show consent checkboxes
   - [ ] Validate required consents before submission
   - [ ] Store consent records on submit

**Deliverables**:
- Updated EnhancedFormBuilder with 2 new tabs
- Updated FormView with consent UI
- API endpoints: Save consent items, Record user consents

---

### **Phase 3: Personal Data Inventory** (3 hours)
**Goal**: ติดตามและจำแนกข้อมูลส่วนบุคคล

**Tasks**:
3.1 Auto-Detection Service (1 hour)
   - [ ] Create PersonalDataDetectionService.js
   - [ ] Implement field type detection
   - [ ] Detect: email, phone, name, ID card, address

3.2 Admin UI: Data Classification (1.5 hours)
   - [ ] Create PDPA Data Inventory page
   - [ ] Show all fields from all forms
   - [ ] Auto-detected classifications
   - [ ] Manual classification UI
   - [ ] Confirm/Edit classifications

3.3 Form Builder Integration (30 min)
   - [ ] Show PII indicator on fields
   - [ ] Quick classify from field settings

**Deliverables**:
- PersonalDataDetectionService.js
- PDPA Data Inventory admin page
- API endpoints: Classify fields, Get field classifications

---

### **Phase 4: User Identity Resolution** (5 hours)
**Goal**: รวมกลุ่ม users และสร้าง unified profiles

**Tasks**:
4.1 Identity Resolution Service (2 hours)
   - [ ] Create UserIdentityResolver.js
   - [ ] Email matching (100%)
   - [ ] Phone matching (90%)
   - [ ] Fuzzy name matching (70%)
   - [ ] Create/Update unified profiles

4.2 Background Job (1 hour)
   - [ ] Create scheduled job (daily)
   - [ ] Process all submissions
   - [ ] Match and merge profiles
   - [ ] Update statistics

4.3 Admin UI: User Profiles Management (2 hours)
   - [ ] List unified user profiles
   - [ ] View profile details
   - [ ] Manual merge/unmerge
   - [ ] Confidence score display

**Deliverables**:
- UserIdentityResolver.js
- Background job script
- User Profiles admin page
- API endpoints: Get profiles, Merge profiles, Unmerge profiles

---

### **Phase 5: Consent Dashboard** (4 hours)
**Goal**: แดชบอร์ดสรุปข้อมูล PDPA และ consents

**Tasks**:
5.1 Backend: PDPA Service (1.5 hours)
   - [ ] Create PDPAService.js
   - [ ] Get user consents
   - [ ] Get user personal data
   - [ ] Get consent statistics
   - [ ] Export user data

5.2 Frontend: Consent Dashboard (2 hours)
   - [ ] Create PDPADashboard component
   - [ ] List all users with consents
   - [ ] Filter by status, form, date
   - [ ] User profile card with consent list
   - [ ] Personal data summary

5.3 Export Functionality (30 min)
   - [ ] Export consent records to CSV
   - [ ] Export user data to JSON
   - [ ] Generate PDPA compliance report

**Deliverables**:
- PDPAService.js
- PDPA Dashboard admin page
- Export utilities
- API endpoints: Get all consents, Export data

---

### **Phase 6: DSR Portal** (6 hours)
**Goal**: ระบบให้ user ยื่นคำขอใช้สิทธิ์

**Tasks**:
6.1 Public DSR Portal (2 hours)
   - [ ] Create /pdpa/dsr public page
   - [ ] User identification (email/phone)
   - [ ] OTP verification
   - [ ] Request type selection
   - [ ] Request form
   - [ ] Submit request

6.2 Backend: DSR Service (1.5 hours)
   - [ ] Create DSRService.js
   - [ ] Process Access requests
   - [ ] Process Rectification requests
   - [ ] Process Erasure requests (soft delete)
   - [ ] Process Portability requests
   - [ ] Send OTP verification

6.3 Admin: DSR Management (2 hours)
   - [ ] DSR Requests admin page
   - [ ] List pending requests
   - [ ] Request details view
   - [ ] Process request workflow
   - [ ] Response generation
   - [ ] Status tracking

6.4 Automated Data Export (30 min)
   - [ ] Generate user data package
   - [ ] Create secure download link
   - [ ] Auto-expire after 7 days

**Deliverables**:
- /pdpa/dsr public portal
- DSRService.js
- DSR Management admin page
- API endpoints: Submit DSR, Process DSR, Get DSR status

---

### **Phase 7: Testing & Documentation** (3 hours)
**Goal**: ทดสอบและจัดทำเอกสาร

**Tasks**:
7.1 Testing (1.5 hours)
   - [ ] Test privacy notice display
   - [ ] Test consent recording
   - [ ] Test user identity resolution
   - [ ] Test DSR workflows
   - [ ] Test data export
   - [ ] Test soft delete

7.2 Documentation (1 hour)
   - [ ] Create PDPA-COMPLIANCE.md
   - [ ] Admin guide for PDPA management
   - [ ] User guide for DSR portal
   - [ ] API documentation

7.3 Compliance Report (30 min)
   - [ ] Generate PDPA compliance checklist
   - [ ] Document data processing activities
   - [ ] Privacy impact assessment

**Deliverables**:
- Test results
- PDPA-COMPLIANCE.md
- Admin/User guides
- Compliance report

---

## 📈 Success Criteria

### Functional Requirements
- [ ] Privacy notice แสดงผลถูกต้อง (3 โหมด)
- [ ] สร้าง consent items ได้หลายรายการต่อฟอร์ม
- [ ] บันทึก user consent พร้อม metadata
- [ ] Auto-detect PII fields อย่างน้อย 80% accuracy
- [ ] User identity resolution จับกลุ่มได้ถูกต้อง >90%
- [ ] Consent dashboard แสดงข้อมูลครบถ้วน
- [ ] DSR portal ทำงานได้ทั้ง 4 สิทธิ์
- [ ] Soft delete ทำงานถูกต้อง (ไม่ลบจริง)
- [ ] Export data เป็น JSON/CSV ได้

### Performance Requirements
- [ ] User matching < 5 seconds
- [ ] Dashboard load < 2 seconds
- [ ] DSR processing < 30 seconds
- [ ] Data export < 10 seconds

### Security Requirements
- [ ] OTP verification สำหรับ DSR requests
- [ ] Admin-only access to PDPA dashboard
- [ ] Audit log สำหรับ DSR operations
- [ ] Secure download links (expire after 7 days)

### Compliance Requirements
- [ ] ปฏิบัติตาม PDPA Act 2019
- [ ] เก็บ consent records อย่างน้อย 3 ปี
- [ ] ลบข้อมูลตามคำขอภายใน 30 วัน
- [ ] แจ้งวัตถุประสงค์และระยะเวลาเก็บรักษาชัดเจน

---

## 🎨 UI/UX Mockups

### Form Builder: Privacy Notice Settings
```
┌────────────────────────────────────────┐
│ Privacy Notice Settings              │
├────────────────────────────────────────┤
│ ☑️ Enable Privacy Notice              │
│                                        │
│ Mode:                                  │
│ ○ Disabled                            │
│ ● Custom Text                         │
│ ○ External Link                       │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ Custom Text (Thai):                │ │
│ │ [Rich text editor...]              │ │
│ │                                    │ │
│ │ Custom Text (English):             │ │
│ │ [Rich text editor...]              │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ☑️ Require acknowledgment before      │
│    form submission                     │
│                                        │
│ [Preview] [Save]                       │
└────────────────────────────────────────┘
```

### Form Builder: Consent Items
```
┌────────────────────────────────────────┐
│ Consent Management                     │
├────────────────────────────────────────┤
│ ☑️ Enable Consent Management           │
│                                        │
│ Consent Items:                         │
│                                        │
│ ┌──────────────────────────────────┐  │
│ │ ≡ Personal Data Collection    [✏️][🗑️] │
│ │   Required | Version 1             │
│ │   Purpose: Contact and Service     │
│ │   Retention: 2 years               │
│ └──────────────────────────────────┘  │
│                                        │
│ ┌──────────────────────────────────┐  │
│ │ ≡ Marketing Communications   [✏️][🗑️] │
│ │   Optional | Version 1             │
│ │   Purpose: Marketing               │
│ │   Retention: Until withdrawal      │
│ └──────────────────────────────────┘  │
│                                        │
│ [+ Add Consent Item]                   │
│                                        │
│ [Preview] [Save]                       │
└────────────────────────────────────────┘
```

### FormView: Consent Checkboxes
```
┌────────────────────────────────────────┐
│ 📋 นโยบายความเป็นส่วนตัว             │
├────────────────────────────────────────┤
│ เราเก็บรวบรวมข้อมูลส่วนบุคคลของคุณ   │
│ เพื่อวัตถุประสงค์...                  │
│                                        │
│ อ่านเพิ่มเติม: [นโยบายฯ]             │
├────────────────────────────────────────┤
│ การให้ความยินยอม:                     │
│                                        │
│ ☑️ ยินยอมให้เก็บรวบรวมข้อมูล         │
│    ส่วนบุคคลเพื่อติดต่อและให้บริการ  │
│    (บังคับ)                            │
│                                        │
│ ☐ ยินยอมรับข้อมูลข่าวสารทางการตลาด   │
│    (ไม่บังคับ)                         │
│                                        │
│ [ยกเลิก] [ส่งข้อมูล]                  │
└────────────────────────────────────────┘
```

### PDPA Dashboard
```
┌───────────────────────────────────────────────────────┐
│ PDPA Consent Dashboard                    [Export ▼] │
├───────────────────────────────────────────────────────┤
│ 📊 Statistics:                                        │
│ ├─ Total Users: 1,234                                │
│ ├─ Active Consents: 5,678                            │
│ └─ Pending DSR Requests: 12                          │
├───────────────────────────────────────────────────────┤
│ Filters:                                              │
│ [Consent Status ▼] [Form ▼] [Date Range ▼] [Search] │
├───────────────────────────────────────────────────────┤
│                                                       │
│ 👤 john.doe@example.com | 091-234-5678               │
│ ├─ 3 submissions from 2 forms                        │
│ ├─ Consents:                                         │
│ │  ✅ Data Collection (2024-01-15)                   │
│ │  ✅ Marketing (2024-01-15)                         │
│ ├─ Personal Data:                                    │
│ │  Name, Email, Phone, Address                      │
│ └─ [View Details] [Export] [DSR]                     │
│                                                       │
│ 👤 jane.smith@example.com                            │
│ ...                                                   │
└───────────────────────────────────────────────────────┘
```

### DSR Portal
```
┌────────────────────────────────────────┐
│ ใช้สิทธิ์ตาม พ.ร.บ. PDPA 2562        │
├────────────────────────────────────────┤
│ คุณสามารถใช้สิทธิ์ดังต่อไปนี้:       │
│                                        │
│ ○ ขอเข้าถึงข้อมูล                     │
│   (Right to Access)                    │
│                                        │
│ ○ ขอแก้ไขข้อมูล                       │
│   (Right to Rectification)             │
│                                        │
│ ○ ขอลบข้อมูล                          │
│   (Right to Erasure)                   │
│                                        │
│ ○ ขอส่งออกข้อมูล                      │
│   (Right to Data Portability)          │
│                                        │
│ Email/Phone: [________________]        │
│                                        │
│ [ยืนยันตัวตน]                          │
└────────────────────────────────────────┘
```

---

## 🔧 Technical Stack

### Backend:
- **Database**: PostgreSQL + Sequelize
- **Services**: PDPAService, UserIdentityResolver, DSRService
- **Job Queue**: Bull + Redis (for background matching)
- **OTP**: Twilio SMS / SendGrid Email

### Frontend:
- **Components**: ConsentBuilder, PDPADashboard, DSRPortal
- **State**: React Context + useState
- **UI**: ShadCN + Tailwind CSS
- **Forms**: React Hook Form + Zod validation

### Security:
- **OTP Verification**: 6-digit code, 10-minute expiry
- **Audit Logging**: All DSR operations logged
- **Soft Delete**: Never hard delete personal data
- **Access Control**: RBAC for PDPA dashboard

---

## 📅 Timeline

**Total Estimated Time**: 30 hours (4-5 days)

| Phase | Duration | Completion Date |
|-------|----------|-----------------|
| Phase 1: Database & Models | 4h | Day 1 |
| Phase 2: Privacy & Consent UI | 5h | Day 1-2 |
| Phase 3: Data Inventory | 3h | Day 2 |
| Phase 4: Identity Resolution | 5h | Day 2-3 |
| Phase 5: Consent Dashboard | 4h | Day 3 |
| Phase 6: DSR Portal | 6h | Day 3-4 |
| Phase 7: Testing & Docs | 3h | Day 4 |

**Start Date**: 2025-10-24
**Target Completion**: 2025-10-28

---

## 🎯 Next Steps

1. ✅ Review and approve this plan
2. Create qtodo.md with detailed task list
3. Start Phase 1: Database & Models
4. Use appropriate agents:
   - `database-architect` for models and migrations
   - `general-purpose` for service layer
   - `ui-migration-integrator` for frontend integration
   - `documentation-writer` for final docs

---

**Version**: 1.0
**Status**: 📋 AWAITING APPROVAL
**Last Updated**: 2025-10-23 23:00:00 UTC+7
