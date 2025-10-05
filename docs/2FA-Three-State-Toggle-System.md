# 2FA Three-State Toggle System

**Version:** 0.7.2-dev
**Date:** 2025-10-05
**Feature:** Admin 2FA Management with Visual Status Indicators

## Overview

The User Management interface includes a sophisticated 3-state toggle system for managing Two-Factor Authentication (2FA). This system provides visual feedback using color-coded states to indicate the current 2FA status for each user.

## Three States

### 🔴 Red - Disabled
- **Condition:** `twoFactorEnabled = false` AND `requires_2fa_setup = false`
- **Meaning:** 2FA is completely disabled for this user
- **User Access:** Can login with username/password only
- **Admin Action:** Clicking toggle will force 2FA setup on next login (transition to Yellow state)

### 🟡 Yellow - Pending Setup
- **Condition:** `twoFactorEnabled = false` AND `requires_2fa_setup = true`
- **Meaning:** Admin has forced 2FA setup, waiting for user to complete registration
- **User Access:** User must complete 2FA setup on next login before accessing the system
- **Next Step:** User will see QR code and must scan it with authenticator app, then verify OTP
- **Transition:** After successful OTP verification → Green state

### 🟢 Green - Enabled
- **Condition:** `twoFactorEnabled = true` AND `requires_2fa_setup = false`
- **Meaning:** 2FA is fully active and functioning
- **User Access:** Must provide OTP code during login
- **Admin Action:** Clicking toggle will completely disable 2FA (transition to Red state)

## Workflow Examples

### Scenario 1: Admin Forces 2FA Setup

1. **Initial State:** User has 2FA disabled (🔴 Red)
2. **Admin Action:** Clicks toggle button
3. **System Response:**
   - Calls `/admin/users/:userId/force-2fa` endpoint
   - Sets `requires_2fa_setup = true`
   - Clears any existing 2FA configuration
   - Shows toast: "บังคับตั้งค่า 2FA สำเร็จ"
4. **New State:** Toggle shows Yellow (🟡)
5. **User Next Login:**
   - User enters username/password
   - System detects `requires_2fa_setup = true`
   - Redirects to 2FA Setup page
   - Shows QR code and backup codes
   - User scans QR code with authenticator app
   - User enters OTP to verify
   - System sets `twoFactorEnabled = true` and `requires_2fa_setup = false`
6. **Final State:** Toggle shows Green (🟢)

### Scenario 2: Admin Disables 2FA

1. **Initial State:** User has 2FA enabled (🟢 Green)
2. **Admin Action:** Clicks toggle button
3. **System Response:**
   - Calls `/admin/users/:userId/reset-2fa` endpoint
   - Sets `twoFactorEnabled = false` and `requires_2fa_setup = false`
   - Clears 2FA secret and backup codes
   - Revokes all trusted devices
   - Shows toast: "รีเซ็ต 2FA สำเร็จ"
4. **New State:** Toggle shows Red (🔴)
5. **User Access:** Can now login with password only

## Technical Implementation

### Database Fields

```sql
-- users table
twoFactorEnabled BOOLEAN DEFAULT false
twoFactorSecret TEXT (encrypted)
twoFactorBackupCodes TEXT (encrypted)
twoFactorEnabledAt TIMESTAMP
requires_2fa_setup BOOLEAN DEFAULT false
```

### Frontend Logic

**File:** `src/components/UserManagement.jsx`

```javascript
// Determine 2FA status (lines 158-166)
const get2FAStatus = (user) => {
  if (user.twoFactorEnabled) return 'enabled'; // 🟢 Green
  if (user.requires_2fa_setup || user.requires2FASetup) {
    return 'pending'; // 🟡 Yellow
  }
  return 'disabled'; // 🔴 Red
};

// Map status to color class (lines 168-173)
const get2FAColor = (user) => {
  const status = get2FAStatus(user);
  if (status === 'enabled') return 'bg-green-500';
  if (status === 'pending') return 'bg-yellow-500';
  return 'bg-red-500';
};

// Apply color to Switch component (lines 460-475)
<Switch
  checked={get2FAStatus(user) !== 'disabled'}
  onCheckedChange={() => handleToggle2FA(user)}
  className={
    get2FAStatus(user) === 'enabled'
      ? 'data-[state=checked]:bg-green-500'
      : get2FAStatus(user) === 'pending'
      ? 'data-[state=checked]:bg-yellow-500'
      : 'data-[state=unchecked]:bg-red-500'
  }
/>
```

### Backend Endpoints

**File:** `backend/api/routes/admin.routes.js`

#### GET /api/v1/admin/users/2fa-status
Returns 2FA status for all users including `requires_2fa_setup` field.

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "username": "testuser",
        "email": "test@example.com",
        "role": "general_user",
        "twoFactorEnabled": false,
        "requires_2fa_setup": true
      }
    ]
  }
}
```

#### POST /api/v1/admin/users/:userId/force-2fa
Forces user to setup 2FA on next login (Red → Yellow).

**Action:**
- Sets `requires_2fa_setup = true`
- Sets `twoFactorEnabled = false`
- Clears `twoFactorSecret`, `twoFactorBackupCodes`, `twoFactorEnabledAt`

#### POST /api/v1/admin/users/:userId/reset-2fa
Completely disables 2FA (Green → Red or Yellow → Red).

**Action:**
- Sets `requires_2fa_setup = false`
- Sets `twoFactorEnabled = false`
- Clears `twoFactorSecret`, `twoFactorBackupCodes`, `twoFactorEnabledAt`
- Revokes all trusted devices

### 2FA Setup Flow Endpoints

**File:** `backend/api/routes/2fa.routes.js`

#### POST /api/v1/2fa/setup-required
Generate QR code for forced 2FA setup (requires tempToken).

**Request:**
```json
{
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "qrCode": "data:image/png;base64,...",
    "manualEntryKey": "JBSWY3DPEHPK3PXP",
    "backupCodes": ["12345678", "87654321", ...]
  }
}
```

#### POST /api/v1/2fa/enable-required
Complete 2FA setup with OTP verification (Yellow → Green).

**Request:**
```json
{
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token": "123456",
  "deviceFingerprint": "abc123def456"
}
```

**Action:**
- Verifies OTP code
- Sets `twoFactorEnabled = true`
- Sets `requires_2fa_setup = false`
- Generates access and refresh tokens
- Creates user session

## Data Flow

### Loading Users with 2FA Status

**File:** `src/components/UserManagement.jsx` (lines 82-116)

```javascript
// Fetch users and 2FA status in parallel
const [usersResponse, twoFAResponse] = await Promise.all([
  apiClient.get('/users'),
  apiClient.get('/admin/users/2fa-status')
]);

// Extract users
const fetchedUsers = usersResponse.data?.users || [];
const twoFAUsers = twoFAResponse.data?.users || [];

// Create 2FA status map (CRITICAL: Store all three fields)
const twoFAMap = new Map(
  twoFAUsers.map(user => [user.id, {
    twoFactorEnabled: user.twoFactorEnabled || false,
    requires_2fa_setup: user.requires_2fa_setup || false,
    requires2FASetup: user.requires_2fa_setup || false // Support both naming conventions
  }])
);

// Transform users with 2FA status
const transformedUsers = fetchedUsers.map(user => {
  const twoFAStatus = twoFAMap.get(user.id) || {
    twoFactorEnabled: false,
    requires_2fa_setup: false,
    requires2FASetup: false
  };

  return {
    ...user,
    twoFactorEnabled: twoFAStatus.twoFactorEnabled,
    requires_2fa_setup: twoFAStatus.requires_2fa_setup,
    requires2FASetup: twoFAStatus.requires2FASetup
  };
});
```

### Critical Implementation Note

**⚠️ Common Pitfall:** Storing only `twoFactorEnabled` in the map

**WRONG:**
```javascript
// This will prevent yellow state from ever showing
const twoFAMap = new Map(
  twoFAUsers.map(user => [user.id, user.twoFactorEnabled || false])
);
```

**CORRECT:**
```javascript
// Store all three fields as an object
const twoFAMap = new Map(
  twoFAUsers.map(user => [user.id, {
    twoFactorEnabled: user.twoFactorEnabled || false,
    requires_2fa_setup: user.requires_2fa_setup || false,
    requires2FASetup: user.requires_2fa_setup || false
  }])
);
```

## Authentication Context Integration

**File:** `src/contexts/AuthContext.jsx`

The AuthContext handles special 2FA setup flow:

```javascript
const login = async (identifier, password, deviceFingerprint) => {
  const response = await AuthService.login(identifier, password, deviceFingerprint);

  // Don't set user if 2FA setup is required
  if (!response.requires2FA && !response.requires2FASetup && response.user) {
    setUser(response.user);
  }

  return response;
};
```

**Login Response with Required Setup:**
```json
{
  "success": true,
  "requires2FASetup": true,
  "tempToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "กรุณาตั้งค่า 2FA ก่อนเข้าใช้งาน"
}
```

## UI Components

### Switch Component (Radix UI)

The toggle uses Radix UI Switch with dynamic Tailwind classes:

```javascript
<Switch
  checked={get2FAStatus(user) !== 'disabled'}
  onCheckedChange={() => handleToggle2FA(user)}
  onClick={(e) => e.stopPropagation()} // Prevent row click
  className={
    get2FAStatus(user) === 'enabled'
      ? 'data-[state=checked]:bg-green-500'
      : get2FAStatus(user) === 'pending'
      ? 'data-[state=checked]:bg-yellow-500'
      : 'data-[state=unchecked]:bg-red-500'
  }
/>
```

### Toast Notifications

**Success Messages:**
- Force 2FA: "บังคับตั้งค่า 2FA สำเร็จ - {username} จะต้องตั้งค่า 2FA ในครั้งต่อไปที่เข้าสู่ระบบ (แสกน QR Code)"
- Reset 2FA: "รีเซ็ต 2FA สำเร็จ - {username} สามารถเข้าสู่ระบบด้วยรหัสผ่านเท่านั้น"

## Security Considerations

1. **Super Admin Only:** All 2FA management endpoints require `requireSuperAdmin` middleware
2. **Token Validation:** Temporary tokens expire after configured period (default 15 minutes)
3. **Trusted Devices:** All trusted devices are revoked when 2FA is reset
4. **Encryption:** 2FA secrets and backup codes are encrypted in database
5. **Rate Limiting:** Setup and verification endpoints have rate limits to prevent brute force

## Testing

### Manual Test Workflow

1. **Start with Red State:**
   - Create new user or reset existing user's 2FA
   - Verify toggle shows red color
   - User can login with password only

2. **Transition to Yellow:**
   - Click toggle button as super_admin
   - Verify toggle changes to yellow
   - Verify toast notification appears
   - Verify database: `requires_2fa_setup = true`, `twoFactorEnabled = false`

3. **Complete Setup (Yellow to Green):**
   - Login as the user
   - Verify redirect to 2FA Setup page
   - Scan QR code with authenticator app (Google Authenticator, Authy, etc.)
   - Enter 6-digit OTP code
   - Verify successful setup
   - Return to User Management
   - Verify toggle shows green color
   - Verify database: `requires_2fa_setup = false`, `twoFactorEnabled = true`

4. **Reset to Red:**
   - Click toggle button as super_admin
   - Verify toggle changes to red
   - Verify user can login with password only
   - Verify database: both flags are false

### Database Verification

```sql
-- Check user 2FA status
SELECT
  username,
  "twoFactorEnabled",
  requires_2fa_setup,
  "twoFactorEnabledAt"
FROM users
WHERE username = 'testuser';
```

### API Testing with curl

```bash
# Get 2FA status for all users
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/admin/users/2fa-status

# Force 2FA setup
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/admin/users/USER_ID/force-2fa

# Reset 2FA
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/v1/admin/users/USER_ID/reset-2fa
```

## Troubleshooting

### Yellow State Not Showing

**Symptom:** Toggle only shows red or green, never yellow

**Root Cause:** `requires_2fa_setup` field not being loaded from API

**Solution:** Verify `twoFAMap` stores all three fields as an object (see "Critical Implementation Note" above)

### Toggle State Not Updating After Click

**Symptom:** Click toggle but color doesn't change

**Solution:**
1. Check browser console for API errors
2. Verify user has super_admin role
3. Check backend logs for validation errors
4. Reload user list after API call: `await loadUsers()`

### User Cannot Login After Force 2FA

**Symptom:** User stuck at 2FA setup page

**Solution:**
1. Verify `tempToken` is being generated and sent
2. Check token expiration (default 15 minutes)
3. Verify `/2fa/setup-required` endpoint is accessible
4. Check browser console for API errors

## Migration Notes

### From Previous 2-State System

If upgrading from a 2-state system (on/off only):

1. Add `requires_2fa_setup` column if not exists (migration available)
2. Update `loadUsers()` to fetch the new field
3. Update `twoFAMap` to store object instead of boolean
4. Update Switch component className logic
5. Test all three states thoroughly

### Database Migration

```sql
-- Add requires_2fa_setup column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS requires_2fa_setup BOOLEAN DEFAULT false;

-- Update existing users (optional - set to false for backward compatibility)
UPDATE users SET requires_2fa_setup = false WHERE requires_2fa_setup IS NULL;
```

## Version History

- **v0.7.2-dev (2025-10-05):** Implemented 3-state color system
- **v0.7.1 (2025-10-03):** Added requires_2fa_setup field and endpoints
- **v0.5.4 (2025-09-28):** Initial 2FA management with 2-state toggle

## References

- **User Management Component:** `src/components/UserManagement.jsx`
- **Admin Routes:** `backend/api/routes/admin.routes.js`
- **2FA Routes:** `backend/api/routes/2fa.routes.js`
- **Auth Context:** `src/contexts/AuthContext.jsx`
- **User Model:** `backend/models/User.js`
- **CLAUDE.md:** Project documentation and version history

---

**Last Updated:** 2025-10-05
**Maintained By:** Q-Collector Development Team
