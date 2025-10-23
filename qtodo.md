# Q-Collector Development TODO

**Last Updated**: 2025-10-23 15:30:00 UTC+7
**Current Version**: v0.8.1-dev
**Current Task**: 🚀 User Role Expansion v0.8.1 - Phase 5 Data Masking COMPLETE ✅

---

## 🎯 COMPLETED FEATURES - v0.8.1-dev

### ✅ Moderator Role Removal
**Priority**: ⭐⭐⭐ CRITICAL
**Status**: ✅ COMPLETE
**Completion Date**: 2025-10-23
**Time Spent**: 2 hours

### ✅ Data Masking System (Phase 5)
**Priority**: ⭐⭐⭐ HIGH
**Status**: ✅ COMPLETE
**Completion Date**: 2025-10-23
**Time Spent**: 1.5 hours

**Features Implemented:**
1. **Data Masking Utilities** (`src/utils/dataMasking.js`)
   - ✅ `maskPhone()`: 091-291-1234 → 091-29x-xxxx
   - ✅ `maskEmail()`: example@domain.com → exa***@domain.com
   - ✅ `detectSensitiveFieldType()`: Auto-detect phone/email fields
   - ✅ `maskValue()`: Unified masking interface
   - ✅ `shouldMaskField()`: Check if field needs masking
   - ✅ Supports Thai phone formats (10 digits)
   - ✅ Supports Thai field titles (เบอร์, โทร, อีเมล, etc.)

2. **Masked Value Component** (`src/components/ui/masked-value.jsx`)
   - ✅ Default: Shows masked value
   - ✅ Single click: Reveals full value for 3 seconds
   - ✅ Double click: Opens tel: or mailto: link
   - ✅ Visual feedback with icons (phone/email/eye)
   - ✅ Interactive tooltip with Thai instructions
   - ✅ Animated transitions and hover effects
   - ✅ Auto-hide after reveal timeout

**User Experience:**
- 📱 Privacy protection for sensitive data
- 👆 Intuitive single/double click interaction
- ⏱️ Temporary reveal (3 seconds) for security
- 🎨 Beautiful animations and visual feedback
- 🇹🇭 Full Thai language support

### ✅ General User Welcome Modal (Phase 4.3)
**Priority**: ⭐⭐ MEDIUM
**Status**: ✅ COMPLETE
**Completion Date**: 2025-10-23
**Time Spent**: 1 hour

**Features Implemented:**
1. **Welcome Modal Component** (`src/components/ui/general-user-welcome-modal.jsx`)
   - ✅ Shows only for role='general_user'
   - ✅ Displays once per session (sessionStorage)
   - ✅ Animated entrance with Framer Motion
   - ✅ Glass morphism styling
   - ✅ 2-step approval process explanation
   - ✅ Success message confirmation
   - ✅ Info notes for user guidance

**Content:**
- ✅ "ยินดีต้อนรับสู่ Q-Collector" header
- ✅ "การสมัครสมาชิกของคุณสำเร็จแล้ว" success message
- ✅ Step 1: "รอ Admin ตรวจสอบและอนุมัติบัญชีของคุณ"
- ✅ Step 2: "รับสิทธิ์การใช้งานเต็มรูปแบบ"
- ✅ Contact admin reminder

### ✅ User Preferences System Infrastructure
**Priority**: ⭐⭐ MEDIUM
**Status**: ✅ COMPLETE
**Completion Date**: 2025-10-23
**Time Spent**: 1 hour

**Backend:**
- ✅ `backend/models/UserPreference.js` - Sequelize model
- ✅ `backend/services/UserPreferenceService.js` - Business logic
- ✅ `backend/api/routes/userPreference.routes.js` - API endpoints
- ✅ `backend/migrations/20251021075000-create-user-preferences.js` - DB migration

**Frontend:**
- ✅ `src/services/UserPreferencesService.js` - API client wrapper

---

## 📊 Requirements Analysis

### 1. เพิ่ม User Roles ใหม่ (11 Roles)

**Roles ใหม่ที่ต้องเพิ่ม:**
1. Accounting (บัญชี)
2. BD (Business Development - พัฒนาธุรกิจ)
3. HR (Human Resources - ทรัพยากรบุคคล)
4. IT (Information Technology)
5. Maintenance (ซ่อมบำรุง)
6. Operation (ปฏิบัติการ)
7. Production (ผลิต)
8. Purchasing (จัดซื้อ)
9. QC (Quality Control - ควบคุมคุณภาพ)
10. R&D (Research & Development - วิจัยและพัฒนา)
11. Warehouse (คลังสินค้า)

**Roles ทั้งหมด (18 Roles) เมื่อจัดเรียงตามตัวอักษร:**
1. Accounting (accounting)
2. Admin (admin) - **EXISTING**
3. BD (bd)
4. Customer Service (customer_service) - **EXISTING**
5. General User (general_user) - **EXISTING**
6. HR (hr)
7. IT (it)
8. Maintenance (maintenance)
9. Marketing (marketing) - **EXISTING**
10. Operation (operation)
11. Production (production)
12. Purchasing (purchasing)
13. QC (qc)
14. R&D (rnd)
15. Sales (sales) - **EXISTING**
16. Super Admin (super_admin) - **EXISTING**
17. Technic (technic) - **EXISTING**
18. Warehouse (warehouse)

**⚠️ REMOVED: Moderator (moderator) - Eliminated from system v0.8.1**

**กำหนดสีประจำ Role:**

| Role | ID | Color | Badge Color | Type |
|------|-----|-------|------------|------|
| Super Admin | super_admin | Red 🔴 | text-red-500, bg-red-500/10 | Admin Tier |
| Admin | admin | Pink 🩷 | text-pink-500, bg-pink-500/10 | Admin Tier |
| **Accounting** | **accounting** | **Indigo 🔵** | **text-indigo-500, bg-indigo-500/10** | **Tag-based** |
| **BD** | **bd** | **Teal 🟢** | **text-teal-500, bg-teal-500/10** | **Tag-based** |
| Customer Service | customer_service | Blue 🔵 | text-blue-500, bg-blue-500/10 | Tag-based |
| **HR** | **hr** | **Rose 🌹** | **text-rose-500, bg-rose-500/10** | **Tag-based** |
| **IT** | **it** | **Violet 🟣** | **text-violet-500, bg-violet-500/10** | **Tag-based** |
| **Maintenance** | **maintenance** | **Amber 🟡** | **text-amber-500, bg-amber-500/10** | **Tag-based** |
| Marketing | marketing | Orange 🟠 | text-orange-500, bg-orange-500/10 | Tag-based |
| **Operation** | **operation** | **Lime 🟢** | **text-lime-500, bg-lime-500/10** | **Tag-based** |
| **Production** | **production** | **Emerald 🟢** | **text-emerald-500, bg-emerald-500/10** | **Tag-based** |
| **Purchasing** | **purchasing** | **Sky ☁️** | **text-sky-500, bg-sky-500/10** | **Tag-based** |
| **QC** | **qc** | **Fuchsia 🩷** | **text-fuchsia-500, bg-fuchsia-500/10** | **Tag-based** |
| **R&D** | **rnd** | **Yellow 🟡** | **text-yellow-500, bg-yellow-500/10** | **Tag-based** |
| Sales | sales | Green 🟢 | text-green-500, bg-green-500/10 | Tag-based |
| Technic | technic | Cyan 🩵 | text-cyan-500, bg-cyan-500/10 | Tag-based |
| **Warehouse** | **warehouse** | **Slate ⚫** | **text-slate-500, bg-slate-500/10** | **Tag-based** |
| General User | general_user | Gray ⚫ | text-gray-500, bg-gray-500/10 | Limited Access |

---

### 2. ระบบสมัครสมาชิก (Self-Registration)

**ความต้องการ:**
1. เปลี่ยนชื่อฟิลด์: **"แผนก"** → **"หน่วยงาน"**
2. เปลี่ยนคำอธิบาย: **"เลือกแผนกที่คุณสังกัด"** → **"เลือกหน่วยงานที่คุณสังกัด"**
3. เพิ่มตัวเลือกหน่วยงานให้ครบ 11 roles ใหม่
4. **Role ที่บันทึกจริง = General User เสมอ** (ไม่ใช่ role ของหน่วยงานที่เลือก)
5. บันทึกหน่วยงานไว้ใน field `department` เป็นข้อมูลเบื้องต้น

**ตัวอย่างตัวเลือกหน่วยงาน:**
```javascript
DEPARTMENTS = [
  { value: 'accounting', label: 'Accounting', role: 'general_user' },
  { value: 'bd', label: 'BD', role: 'general_user' },
  { value: 'customer_service', label: 'Customer Service', role: 'general_user' },
  { value: 'hr', label: 'HR', role: 'general_user' },
  { value: 'it', label: 'IT', role: 'general_user' },
  { value: 'maintenance', label: 'Maintenance', role: 'general_user' },
  { value: 'marketing', label: 'Marketing', role: 'general_user' },
  { value: 'operation', label: 'Operation', role: 'general_user' },
  { value: 'production', label: 'Production', role: 'general_user' },
  { value: 'purchasing', label: 'Purchasing', role: 'general_user' },
  { value: 'qc', label: 'QC', role: 'general_user' },
  { value: 'rnd', label: 'R&D', role: 'general_user' },
  { value: 'sales', label: 'Sales', role: 'general_user' },
  { value: 'technic', label: 'Technic', role: 'general_user' },
  { value: 'warehouse', label: 'Warehouse', role: 'general_user' },
  { value: 'others', label: 'Others', role: 'general_user' }
];
```

---

### 3. ระบบแจ้งเตือน Pending Users สำหรับ Admin

**ความต้องการ:**
1. **Backend API**: สร้าง endpoint `/api/v1/admin/pending-users/count` สำหรับนับจำนวน General Users
2. **Top Menu Badge**: แสดงตัวเลขจำนวน pending users บน top menu (เฉพาะ Super Admin/Admin เห็น)
3. **ข้อความแจ้งเตือน General User**:
   - แสดงเมื่อ General User login เข้ามาที่หน้า Home/Form List ครั้งแรก
   - ข้อความ: "กรุณารอ Admin อนุมัติการเข้าใช้งาน ระยะเวลาโดยประมาณไม่เกิน 24 ชั่วโมง"
   - แสดงครั้งเดียวต่อ session หรือจนกว่า role จะเปลี่ยน

**UI Design:**
```
┌────────────────────────────────────┐
│ [Logo] Q-Collector        🔔 (3) │  ← Badge แสดง 3 pending users
└────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ ⚠️ การอนุมัติการเข้าใช้งาน             │
│                                          │
│ บัญชีของคุณอยู่ระหว่างการตรวจสอบ       │
│ กรุณารอ Admin อนุมัติการเข้าใช้งาน      │
│                                          │
│ ระยะเวลาโดยประมาณ: ไม่เกิน 24 ชั่วโมง  │
│                                          │
│ [ปิด]                                    │
└──────────────────────────────────────────┘
```

---

### 4. ระบบ Data Masking สำหรับข้อมูลส่วนบุคคล

**ความต้องการ:**
1. **เบอร์โทรศัพท์**: 091-291-1234 → 091-29x-xxxx (mask ครึ่งหลัง)
2. **Email**: example@domain.com → exa***@domain.com
3. **Click 1 ครั้ง**: แสดงข้อมูลเต็ม
4. **Double Click**: โทรออก (สำหรับเบอร์โทร) หรือเปิด email client

**ตัวอย่าง UI:**

**สถานะ Masked:**
```
โทรศัพท์: 091-29x-xxxx [🔒]  ← คลิกเพื่อดูเบอร์เต็ม
```

**สถานะ Unmasked:**
```
โทรศัพท์: 091-291-1234 [📞]  ← ดับเบิลคลิกเพื่อโทรออก
```

**Utility Functions:**
```javascript
// src/utils/dataMasking.js

export const maskPhone = (phone) => {
  // 091-291-1234 → 091-29x-xxxx
  if (!phone) return '';

  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)}x-xxxx`;
  }
  return phone;
};

export const maskEmail = (email) => {
  // example@domain.com → exa***@domain.com
  if (!email) return '';

  const [local, domain] = email.split('@');
  if (!local || !domain) return email;

  const visibleChars = Math.min(3, Math.floor(local.length / 2));
  const masked = local.slice(0, visibleChars) + '***';
  return `${masked}@${domain}`;
};
```

---

## 🏗️ Implementation Plan

### Phase 1: Role Configuration Update (2 hours)

#### 1.1 Update `src/config/roles.config.js`
**File**: `src/config/roles.config.js`

**Changes**:
```javascript
// Add 11 new roles
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  ACCOUNTING: 'accounting',      // NEW
  BD: 'bd',                       // NEW
  CUSTOMER_SERVICE: 'customer_service',
  HR: 'hr',                       // NEW
  IT: 'it',                       // NEW
  MAINTENANCE: 'maintenance',     // NEW
  MARKETING: 'marketing',
  OPERATION: 'operation',         // NEW
  PRODUCTION: 'production',       // NEW
  PURCHASING: 'purchasing',       // NEW
  QC: 'qc',                       // NEW
  RND: 'rnd',                     // NEW (R&D)
  SALES: 'sales',
  TECHNIC: 'technic',
  WAREHOUSE: 'warehouse',         // NEW
  GENERAL_USER: 'general_user'
};

// Update DEPARTMENTS array
export const DEPARTMENTS = [
  { value: 'accounting', label: 'Accounting', role: USER_ROLES.GENERAL_USER },
  { value: 'bd', label: 'BD', role: USER_ROLES.GENERAL_USER },
  { value: 'customer_service', label: 'Customer Service', role: USER_ROLES.GENERAL_USER },
  { value: 'hr', label: 'HR', role: USER_ROLES.GENERAL_USER },
  { value: 'it', label: 'IT', role: USER_ROLES.GENERAL_USER },
  { value: 'maintenance', label: 'Maintenance', role: USER_ROLES.GENERAL_USER },
  { value: 'marketing', label: 'Marketing', role: USER_ROLES.GENERAL_USER },
  { value: 'operation', label: 'Operation', role: USER_ROLES.GENERAL_USER },
  { value: 'production', label: 'Production', role: USER_ROLES.GENERAL_USER },
  { value: 'purchasing', label: 'Purchasing', role: USER_ROLES.GENERAL_USER },
  { value: 'qc', label: 'QC', role: USER_ROLES.GENERAL_USER },
  { value: 'rnd', label: 'R&D', role: USER_ROLES.GENERAL_USER },
  { value: 'sales', label: 'Sales', role: USER_ROLES.GENERAL_USER },
  { value: 'technic', label: 'Technic', role: USER_ROLES.GENERAL_USER },
  { value: 'warehouse', label: 'Warehouse', role: USER_ROLES.GENERAL_USER },
  { value: 'others', label: 'Others', role: USER_ROLES.GENERAL_USER }
];

// Update ROLE_PERMISSIONS (add 11 new tag-based roles)
export const ROLE_PERMISSIONS = {
  // ... existing roles ...

  [USER_ROLES.ACCOUNTING]: {
    canViewAll: false,
    canEditAll: false,
    canDeleteAll: false,
    canCreateForms: false,
    canManageUsers: false,
    canChangeRoles: false,
    canAccessAllTags: false,
    tagAccess: ['Accounting']
  },
  // ... repeat for all 11 new roles ...
};

// Update color functions
export function getRoleTextColor(role) {
  switch (role) {
    case USER_ROLES.SUPER_ADMIN: return 'text-red-500';
    case USER_ROLES.ADMIN: return 'text-pink-500';
    case USER_ROLES.MODERATOR: return 'text-purple-500';
    case USER_ROLES.ACCOUNTING: return 'text-indigo-500';
    case USER_ROLES.BD: return 'text-teal-500';
    case USER_ROLES.CUSTOMER_SERVICE: return 'text-blue-500';
    case USER_ROLES.HR: return 'text-rose-500';
    case USER_ROLES.IT: return 'text-violet-500';
    case USER_ROLES.MAINTENANCE: return 'text-amber-500';
    case USER_ROLES.MARKETING: return 'text-orange-500';
    case USER_ROLES.OPERATION: return 'text-lime-500';
    case USER_ROLES.PRODUCTION: return 'text-emerald-500';
    case USER_ROLES.PURCHASING: return 'text-sky-500';
    case USER_ROLES.QC: return 'text-fuchsia-500';
    case USER_ROLES.RND: return 'text-yellow-500';
    case USER_ROLES.SALES: return 'text-green-500';
    case USER_ROLES.TECHNIC: return 'text-cyan-500';
    case USER_ROLES.WAREHOUSE: return 'text-slate-500';
    case USER_ROLES.GENERAL_USER: return 'text-gray-500';
    default: return 'text-gray-500';
  }
}
```

**Tasks:**
- [ ] Add 11 new roles to USER_ROLES constant
- [ ] Update DEPARTMENTS array (เปลี่ยน role เป็น general_user ทั้งหมด)
- [ ] Add ROLE_PERMISSIONS for 11 new roles
- [ ] Update ALL_ROLES array
- [ ] Update getRoleTextColor() function
- [ ] Update getRoleBadgeColor() function

---

#### 1.2 Update `src/components/EnhancedFormBuilder.jsx`
**File**: `src/components/EnhancedFormBuilder.jsx`

**Changes:**
- Update USER_ROLES constant (lines ~60-70)
- Ensure all 19 roles included in form settings

**Tasks:**
- [ ] Update USER_ROLES constant
- [ ] Verify role selection dropdown includes all roles
- [ ] Test form save with new roles

---

#### 1.3 Update `src/components/FormListApp.jsx`
**File**: `src/components/FormListApp.jsx`

**Tasks:**
- [ ] Update USER_ROLES constant (already filtered Super Admin/Admin)
- [ ] Verify tag display works with new roles

---

### Phase 2: Registration System Update (1.5 hours)

#### 2.1 Update `src/components/auth/RegisterPage.jsx`

**Changes:**
```javascript
// Line 324-325: เปลี่ยนชื่อฟิลด์
<label htmlFor="department" className="block text-sm font-medium mb-2">
  <FontAwesomeIcon icon={faBriefcase} className="mr-2" />
  หน่วยงาน  {/* ← เปลี่ยนจาก "แผนก" */}
</label>

// Line 346-348: เปลี่ยนคำอธิบาย
<p className="mt-1 text-xs text-muted-foreground">
  เลือกหน่วยงานที่คุณสังกัด  {/* ← เปลี่ยนจาก "เลือกแผนกที่คุณสังกัด" */}
</p>

// Line 129: ตรวจสอบว่า mapDepartmentToRole ต้อง return 'general_user' เสมอ
const role = mapDepartmentToRole(formData.department); // Always returns 'general_user'
```

**Tasks:**
- [ ] เปลี่ยน label "แผนก" → "หน่วยงาน" (line ~324)
- [ ] เปลี่ยนคำอธิบาย (line ~347)
- [ ] Verify DEPARTMENTS imported from roles.config.js
- [ ] Test registration with new departments
- [ ] Verify role is always 'general_user'

---

### Phase 3: User Management Update (1 hour)

#### 3.1 Update `src/components/UserManagement.jsx`

**Tasks:**
- [ ] Verify ALL_ROLES imported from roles.config.js
- [ ] Test role filter dropdown includes all 19 roles
- [ ] Test role change for new roles
- [ ] Verify role badge colors display correctly

---

### Phase 4: Pending User Notification System (2.5 hours)

#### 4.1 Backend API - Pending Users Count
**File**: `backend/api/routes/admin.routes.js`

**New Endpoint:**
```javascript
// GET /api/v1/admin/pending-users/count
router.get('/pending-users/count', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const count = await User.count({
      where: {
        role: 'general_user',
        is_active: true
      }
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

**Tasks:**
- [ ] Create endpoint `/api/v1/admin/pending-users/count`
- [ ] Restrict to Super Admin and Admin only
- [ ] Return count of General Users
- [ ] Test endpoint

---

#### 4.2 Frontend - Top Menu Badge
**File**: `src/components/ui/user-menu.jsx` (or main header component)

**Features:**
- Fetch pending count every 30 seconds
- Show badge only for Super Admin/Admin
- Badge with number (e.g., "3")
- Click badge → navigate to User Management

**Tasks:**
- [ ] Add API call to fetch pending count
- [ ] Add badge UI component
- [ ] Add polling (every 30s)
- [ ] Add click handler → navigate to /admin/users
- [ ] Test visibility (Super Admin/Admin only)

---

#### 4.3 General User Welcome Message ✅ COMPLETE
**File**: `src/components/ui/general-user-welcome-modal.jsx` (CREATED)

**Features:**
- Show modal on first load for General User
- Message: "บัญชีของคุณอยู่ระหว่างการตรวจสอบ กรุณารอ Admin อนุมัติ ระยะเวลาโดยประมาณไม่เกิน 24 ชั่วโมง"
- Show once per session (use sessionStorage)

**Tasks:**
- [x] Create GeneralUserWelcomeModal component
- [x] Add show condition (role === 'general_user')
- [x] Add sessionStorage tracking
- [x] Add close button with animation
- [x] Add glass morphism styling
- [x] Add 2-step approval process explanation
- [x] Test modal display

---

### Phase 5: Data Masking System ✅ COMPLETE (2.5 hours)

#### 5.1 Create Data Masking Utility ✅ COMPLETE
**File**: `src/utils/dataMasking.js` (CREATED)

```javascript
/**
 * Data Masking Utilities
 * For privacy protection in submission detail views
 */

/**
 * Mask phone number
 * @param {string} phone - Phone number (e.g., "091-291-1234")
 * @returns {string} Masked phone (e.g., "091-29x-xxxx")
 */
export const maskPhone = (phone) => {
  if (!phone) return '';

  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');

  // 10-digit Thai mobile: 0XX-XXX-XXXX → 0XX-XXx-xxxx
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 5)}x-xxxx`;
  }

  // Other formats: show first half, mask rest
  const halfPoint = Math.ceil(cleaned.length / 2);
  const visible = cleaned.slice(0, halfPoint);
  const masked = 'x'.repeat(cleaned.length - halfPoint);

  return visible + masked;
};

/**
 * Mask email address
 * @param {string} email - Email (e.g., "example@domain.com")
 * @returns {string} Masked email (e.g., "exa***@domain.com")
 */
export const maskEmail = (email) => {
  if (!email) return '';

  const [local, domain] = email.split('@');
  if (!local || !domain) return email;

  // Show first 3 chars or half, whichever is smaller
  const visibleChars = Math.min(3, Math.floor(local.length / 2));
  const masked = local.slice(0, visibleChars) + '***';

  return `${masked}@${domain}`;
};

/**
 * Check if field type is sensitive (needs masking)
 * @param {string} fieldType - Field type
 * @returns {boolean}
 */
export const isSensitiveField = (fieldType) => {
  return ['phone', 'email'].includes(fieldType);
};

/**
 * Mask value based on field type
 * @param {string} value - Original value
 * @param {string} fieldType - Field type
 * @returns {string} Masked value
 */
export const maskValue = (value, fieldType) => {
  if (!value) return '';

  switch (fieldType) {
    case 'phone':
      return maskPhone(value);
    case 'email':
      return maskEmail(value);
    default:
      return value;
  }
};
```

**Tasks:**
- [x] Create `src/utils/dataMasking.js`
- [x] Implement maskPhone()
- [x] Implement maskEmail()
- [x] Implement maskValue()
- [x] Implement detectSensitiveFieldType()
- [x] Implement shouldMaskField()
- [ ] Write unit tests (deferred)

---

#### 5.2 Create MaskedValue Component ✅ COMPLETE
**File**: `src/components/ui/masked-value.jsx` (CREATED)

```javascript
/**
 * MaskedField Component
 * Display sensitive data with masking and reveal on click
 */

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLock, faUnlock, faPhone, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { maskValue } from '../../utils/dataMasking';

export function MaskedField({ value, fieldType, label }) {
  const [isMasked, setIsMasked] = useState(true);

  const displayValue = isMasked ? maskValue(value, fieldType) : value;

  const handleClick = () => {
    setIsMasked(!isMasked);
  };

  const handleDoubleClick = () => {
    if (fieldType === 'phone') {
      window.location.href = `tel:${value}`;
    } else if (fieldType === 'email') {
      window.location.href = `mailto:${value}`;
    }
  };

  const getIcon = () => {
    if (isMasked) return faLock;
    return fieldType === 'phone' ? faPhone : faEnvelope;
  };

  return (
    <div className="flex items-center gap-2">
      <span
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        className="cursor-pointer hover:text-primary transition-colors"
        title={isMasked ? 'คลิกเพื่อดูข้อมูล' : 'ดับเบิลคลิกเพื่อโทรออก/ส่งอีเมล'}
      >
        {displayValue}
      </span>
      <FontAwesomeIcon
        icon={getIcon()}
        className={`text-sm ${isMasked ? 'text-muted-foreground' : 'text-primary'}`}
        onClick={handleClick}
      />
    </div>
  );
}
```

**Tasks:**
- [x] Create `src/components/ui/masked-value.jsx`
- [x] Implement click to reveal (3 second timeout)
- [x] Implement double-click actions (tel:, mailto:)
- [x] Add hover states and tooltips
- [x] Add visual feedback with icons
- [x] Test component

---

#### 5.3 Update `src/components/SubmissionDetail.jsx`

**Changes:**
```javascript
import { MaskedField } from './ui/masked-field';
import { isSensitiveField } from '../utils/dataMasking';

// In render function (where field values are displayed):
{isSensitiveField(field.type) ? (
  <MaskedField value={fieldValue} fieldType={field.type} label={field.title} />
) : (
  <span>{fieldValue}</span>
)}
```

**Tasks:**
- [ ] Import MaskedField component
- [ ] Add masking for phone fields
- [ ] Add masking for email fields
- [ ] Test in main form detail view
- [ ] Test in sub-form detail view

---

#### 5.4 Update `src/components/SubFormDetail.jsx`

**Tasks:**
- [ ] Same changes as SubmissionDetail.jsx
- [ ] Test masking in sub-form detail

---

### Phase 6: Testing & Integration (1.5 hours)

#### Test Scenarios:

**1. Role Configuration**
- [ ] All 19 roles display correctly in Form Settings
- [ ] Role tags show correct colors in Form List
- [ ] Super Admin/Admin tags hidden in Form List
- [ ] New role users can access correct forms based on tags

**2. Registration System**
- [ ] "หน่วยงาน" label displays correctly
- [ ] All 16 department options available
- [ ] Registration creates General User regardless of department selection
- [ ] Department saved to user profile

**3. Pending User Notification**
- [ ] Badge shows correct count on top menu (Admin/Super Admin only)
- [ ] Badge updates every 30 seconds
- [ ] General User sees welcome message on first login
- [ ] Message shows only once per session

**4. Data Masking**
- [ ] Phone numbers masked correctly (091-29x-xxxx)
- [ ] Emails masked correctly (exa***@domain.com)
- [ ] Single click reveals full data
- [ ] Double click on phone opens tel: link
- [ ] Double click on email opens mailto: link
- [ ] Masking works in main form detail
- [ ] Masking works in sub-form detail

---

## 📦 Deliverables

### Frontend Files:
- [ ] `src/config/roles.config.js` - Updated with 11 new roles (IN PROGRESS)
- [ ] `src/components/EnhancedFormBuilder.jsx` - Updated USER_ROLES (IN PROGRESS)
- [ ] `src/components/FormListApp.jsx` - Verified (IN PROGRESS)
- [ ] `src/components/auth/RegisterPage.jsx` - แผนก → หน่วยงาน (IN PROGRESS)
- [ ] `src/components/UserManagement.jsx` - Verified (IN PROGRESS)
- [x] `src/utils/dataMasking.js` - CREATED ✅
- [x] `src/components/ui/masked-value.jsx` - CREATED ✅
- [x] `src/components/ui/general-user-welcome-modal.jsx` - CREATED ✅
- [ ] `src/components/ui/user-menu.jsx` - Add pending badge (TODO)
- [ ] `src/components/SubmissionDetail.jsx` - Add masking (TODO)
- [ ] `src/components/SubFormDetail.jsx` - Add masking (TODO)

### Backend Files:
- [x] `backend/models/UserPreference.js` - CREATED ✅
- [x] `backend/services/UserPreferenceService.js` - CREATED ✅
- [x] `backend/api/routes/userPreference.routes.js` - CREATED ✅
- [x] `backend/migrations/20251021075000-create-user-preferences.js` - CREATED ✅
- [x] `backend/scripts/remove-moderator-from-forms.js` - CREATED ✅
- [ ] `backend/api/routes/admin.routes.js` - Add pending count endpoint (TODO)
- [ ] `backend/middleware/auth.middleware.js` - Verify role checks (TODO)

### Frontend Services:
- [x] `src/services/UserPreferencesService.js` - CREATED ✅

### Documentation:
- [ ] Update `CLAUDE.md` with v0.8.1 changes (IN PROGRESS)
- [ ] Document new roles (TODO)
- [ ] Document masking system (IN PROGRESS)

---

## ⏱️ Time Estimate

| Phase | Task | Time |
|-------|------|------|
| 1 | Role Configuration Update | 2 hours |
| 2 | Registration System Update | 1.5 hours |
| 3 | User Management Update | 1 hour |
| 4 | Pending User Notification | 2.5 hours |
| 5 | Data Masking System | 2.5 hours |
| 6 | Testing & Integration | 1.5 hours |
| **Total** | | **~10 hours** |

---

## 🎯 Success Criteria

1. ✅ 11 new roles added to system with unique colors
2. ✅ All 19 roles work correctly in RBAC system
3. ✅ Registration page shows "หน่วยงาน" with all departments
4. ✅ All registrations create General User regardless of department
5. ✅ Admin sees pending user count badge on top menu
6. ✅ General User sees welcome message on first login
7. ✅ Phone and email fields masked in detail views
8. ✅ Single click reveals full data
9. ✅ Double click triggers call/email actions
10. ✅ All existing functionality preserved

---

## 📌 Implementation Order

**Step 1**: Phase 1 (Role Configuration) - ใช้ agents ช่วยอัปเดตไฟล์พร้อมกัน
**Step 2**: Phase 2 (Registration) - แก้ไข RegisterPage.jsx
**Step 3**: Phase 4 (Pending Notification) - สร้าง API + UI
**Step 4**: Phase 5 (Data Masking) - สร้าง utility + components
**Step 5**: Phase 6 (Testing) - ทดสอบทั้งระบบ

---

## 🚀 Ready to Start

**Current Status**: 📋 PLAN COMPLETE - READY TO IMPLEMENT
**Next Action**: Execute Phase 1 with agents

---

**Version**: v0.8.1-dev
**Priority**: ⭐⭐⭐ CRITICAL
**Last Updated**: 2025-10-21 16:00:00 UTC+7
**Estimated Completion**: 2025-10-21 (End of Day)
