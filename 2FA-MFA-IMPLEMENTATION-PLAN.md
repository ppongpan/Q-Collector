# 2FA/MFA Implementation Plan
**Q-Collector Two-Factor Authentication System**

Version: 0.6.0 (Planned)
Created: 2025-10-01
Status: Planning Phase

---

## Executive Summary

แผนการพัฒนาระบบ Two-Factor Authentication (2FA) / Multi-Factor Authentication (MFA) สำหรับ Q-Collector ให้ครบถ้วนและพร้อมใช้งาน

**ปัจจุบัน:**
- ✅ Backend Service (TwoFactorService.js) - พร้อมใช้งาน
- ✅ Database Schema - Migration 007 พร้อมใช้งาน
- ✅ Dependencies (speakeasy, qrcode) - ติดตั้งแล้ว
- ❌ API Routes - ยังไม่มี
- ❌ Frontend UI - ยังไม่มี
- ❌ Integration with Auth Flow - ยังไม่มี

---

## Phase 1: Backend API Routes (Priority: High)

### 1.1 Create 2FA Routes File
**File:** `backend/api/routes/2fa.routes.js`

**Endpoints:**
```javascript
POST   /api/v1/2fa/setup          // Initialize 2FA setup (get QR code)
POST   /api/v1/2fa/enable         // Enable 2FA with verification
POST   /api/v1/2fa/disable        // Disable 2FA
POST   /api/v1/2fa/verify         // Verify 2FA token during login
GET    /api/v1/2fa/status         // Get 2FA status
POST   /api/v1/2fa/backup-codes   // Regenerate backup codes
```

**Authentication Required:**
- All endpoints require valid JWT token
- Disable requires current 2FA verification
- Verify endpoint used during login flow

**Rate Limiting:**
- `/verify`: 5 attempts per 15 minutes
- `/enable`: 3 attempts per hour
- `/disable`: 3 attempts per hour

### 1.2 Update Auth Routes
**File:** `backend/api/routes/auth.routes.js`

**Modifications:**
```javascript
POST /api/v1/auth/login
  - Check if user has 2FA enabled
  - If enabled: return { requires2FA: true, tempToken: xxx }
  - If not: return normal login response

POST /api/v1/auth/login/2fa
  - Accept tempToken + 2FA code
  - Verify 2FA code
  - Return full access token
```

### 1.3 Update Main Routes
**File:** `backend/api/routes/index.js`

```javascript
const twoFactorRoutes = require('./2fa.routes');
router.use('/2fa', twoFactorRoutes);
```

**Estimated Time:** 4-6 hours

---

## Phase 2: Frontend UI Components (Priority: High)

### 2.1 2FA Setup Component
**File:** `src/components/auth/TwoFactorSetup.jsx`

**Features:**
- Display QR code for authenticator app
- Show manual entry key
- Display 10 backup codes
- Verification code input
- Download/Print backup codes
- Enable/Disable 2FA toggle

**UI Elements:**
- QR Code display (from backend)
- Manual entry key (copyable)
- Backup codes list (downloadable)
- 6-digit code input field
- Success/Error messages
- Step-by-step wizard

### 2.2 2FA Verification Component
**File:** `src/components/auth/TwoFactorVerification.jsx`

**Features:**
- 6-digit code input
- Backup code input (alternative)
- Remember device (30 days)
- Resend code option
- Support link

**UI Elements:**
- Large 6-digit input boxes
- Switch to backup code link
- Remember device checkbox
- Error messages
- Loading states

### 2.3 2FA Status Component
**File:** `src/components/settings/TwoFactorStatus.jsx`

**Features:**
- Current 2FA status
- Backup codes remaining count
- Regenerate backup codes
- Disable 2FA button
- Setup 2FA button (if not enabled)

**UI Elements:**
- Status badge (Enabled/Disabled)
- Backup codes counter
- Action buttons
- Confirmation modals

**Estimated Time:** 8-10 hours

---

## Phase 3: Settings Integration (Priority: Medium)

### 3.1 Update Settings Page
**File:** `src/components/SettingsPage.jsx`

**Additions:**
- New "Security" section
- 2FA toggle/setup button
- Link to 2FA management
- Recent security activity log

### 3.2 User Menu Integration
**File:** `src/components/ui/user-menu.jsx`

**Additions:**
- 2FA status indicator
- Quick access to security settings

**Estimated Time:** 3-4 hours

---

## Phase 4: Authentication Flow Integration (Priority: Critical)

### 4.1 Update Login Flow
**File:** `src/components/auth/LoginPage.jsx`

**Changes:**
```javascript
1. Normal login attempt
2. Check response for requires2FA flag
3. If requires2FA:
   - Store tempToken
   - Show TwoFactorVerification component
4. User enters 2FA code
5. Call /api/v1/auth/login/2fa with tempToken + code
6. On success: redirect to app
7. On failure: show error, allow retry or backup code
```

### 4.2 Update AuthContext
**File:** `src/contexts/AuthContext.jsx`

**New Methods:**
```javascript
- verifyTwoFactor(tempToken, code)
- setupTwoFactor()
- disableTwoFactor(code)
- regenerateBackupCodes(code)
- getTwoFactorStatus()
```

### 4.3 Protected Route Enhancement
**Considerations:**
- Session timeout with 2FA
- Remember device functionality
- Trusted devices management

**Estimated Time:** 6-8 hours

---

## Phase 5: API Client Updates (Priority: High)

### 5.1 Add 2FA Endpoints
**File:** `src/services/ApiClient.js`

**New Methods:**
```javascript
// 2FA Management
setup2FA()
enable2FA(code)
disable2FA(code)
verify2FA(tempToken, code)
get2FAStatus()
regenerateBackupCodes(code)
```

### 5.2 Error Handling
- Handle 2FA-specific errors
- Token expiration
- Invalid code attempts
- Rate limiting errors

**Estimated Time:** 2-3 hours

---

## Phase 6: Enhanced Security Features (Priority: Medium)

### 6.1 Trusted Devices
**Backend:**
- Store device fingerprint
- 30-day device trust
- Manage trusted devices

**Frontend:**
- Device management UI
- Revoke device access
- Current devices list

### 6.2 Security Activity Log
**Backend:**
- Log 2FA events
- Failed attempts
- Device changes

**Frontend:**
- Activity timeline
- Filter by event type
- Export activity log

### 6.3 Recovery Options
**Features:**
- Email-based recovery
- Admin-assisted recovery
- Emergency contacts

**Estimated Time:** 6-8 hours

---

## Phase 7: Testing & Validation (Priority: Critical)

### 7.1 Unit Tests
**Backend:**
- TwoFactorService methods
- API route handlers
- Token verification
- Backup code validation

**Frontend:**
- Component rendering
- Form validation
- State management

### 7.2 Integration Tests
- Complete 2FA setup flow
- Login with 2FA
- Backup code recovery
- Disable 2FA flow

### 7.3 Security Tests
- Brute force protection
- Token expiration
- Encryption validation
- Rate limiting

### 7.4 User Acceptance Testing
- Setup wizard usability
- QR code scanning
- Backup codes workflow
- Error message clarity

**Estimated Time:** 8-10 hours

---

## Phase 8: Documentation (Priority: Medium)

### 8.1 User Documentation
**File:** `docs/user/2FA-USER-GUIDE.md`

**Content:**
- What is 2FA?
- Why enable 2FA?
- Setup instructions
- Supported authenticator apps
- Using backup codes
- Troubleshooting

### 8.2 Admin Documentation
**File:** `docs/admin/2FA-ADMIN-GUIDE.md`

**Content:**
- Enforcing 2FA for roles
- User assistance
- Recovery procedures
- Security best practices

### 8.3 Developer Documentation
**File:** `docs/dev/2FA-DEVELOPER-GUIDE.md`

**Content:**
- API endpoints
- Integration guide
- Testing procedures
- Security considerations

**Estimated Time:** 4-5 hours

---

## Implementation Timeline

### Week 1: Backend Foundation
- Day 1-2: API Routes (Phase 1)
- Day 3: API Client Updates (Phase 5)
- Day 4-5: Testing & Bug Fixes

### Week 2: Frontend Development
- Day 1-2: Core UI Components (Phase 2.1, 2.2)
- Day 3: Settings Integration (Phase 3)
- Day 4-5: Auth Flow Integration (Phase 4)

### Week 3: Enhancement & Testing
- Day 1-2: Status Component & Polish (Phase 2.3)
- Day 3: Enhanced Security Features (Phase 6) - Optional
- Day 4-5: Comprehensive Testing (Phase 7)

### Week 4: Documentation & Deployment
- Day 1-2: Documentation (Phase 8)
- Day 3: Final testing
- Day 4: Staging deployment
- Day 5: Production deployment

**Total Estimated Time:** 41-54 hours (1 month with 1 developer)

---

## Technical Stack

### Backend
- **speakeasy** - TOTP generation/verification
- **qrcode** - QR code generation
- **crypto** - Encryption for secrets
- **Redis** - Rate limiting & temp storage
- **PostgreSQL** - Persistent 2FA data

### Frontend
- **React 18** - UI components
- **Framer Motion** - Animations
- **ShadCN UI** - Component library
- **Tailwind CSS** - Styling

---

## Security Considerations

### 1. Secret Storage
- ✅ Secrets encrypted with AES-256
- ✅ Encryption key in environment variable
- ✅ Never expose secrets to client

### 2. Backup Codes
- ✅ Hashed with SHA-256
- ✅ One-time use only
- ✅ 10 codes per user
- ✅ Regeneration requires 2FA verification

### 3. Rate Limiting
- ✅ 5 verification attempts per 15 minutes
- ✅ Progressive delays
- ✅ Lockout after excessive attempts

### 4. Token Management
- ✅ Temporary tokens for login flow
- ✅ Short expiration (5 minutes)
- ✅ One-time use only

### 5. Device Trust
- Device fingerprinting
- 30-day trust period
- User can revoke anytime
- Encrypted device identifiers

---

## User Experience Flow

### Setup Flow
```
1. User navigates to Settings → Security
2. Click "Enable 2FA"
3. Display QR code + manual key
4. User scans with authenticator app
5. Display 10 backup codes
6. User confirms by entering 6-digit code
7. 2FA enabled ✓
8. User downloads/prints backup codes
```

### Login Flow (2FA Enabled)
```
1. User enters username + password
2. Backend validates credentials
3. If 2FA enabled:
   a. Generate temp token
   b. Return requires2FA: true
4. Frontend shows 2FA input
5. User enters 6-digit code (or backup code)
6. Backend verifies code
7. Return access token
8. User logged in ✓
```

### Recovery Flow (Lost Device)
```
1. User clicks "Use backup code"
2. Enter one of 10 backup codes
3. Backend verifies and marks as used
4. User logged in ✓
5. Prompt user to regenerate backup codes
```

---

## Success Metrics

### Security
- [ ] 0 secret exposures
- [ ] Rate limiting effective
- [ ] No brute force vulnerabilities
- [ ] Encryption validated

### Usability
- [ ] Setup completion time < 2 minutes
- [ ] Login with 2FA < 30 seconds
- [ ] < 5% support tickets
- [ ] 95%+ user satisfaction

### Adoption
- [ ] 60%+ Super Admin adoption
- [ ] 40%+ Admin adoption
- [ ] 20%+ general user adoption

---

## Risks & Mitigations

### Risk 1: Users Lock Themselves Out
**Mitigation:**
- Prominent backup codes display
- Email backup codes option
- Admin recovery procedure
- Clear instructions

### Risk 2: QR Code Scanning Issues
**Mitigation:**
- Provide manual entry key
- Support multiple authenticator apps
- Clear QR code display
- Troubleshooting guide

### Risk 3: Performance Impact
**Mitigation:**
- Redis caching for temp data
- Optimized verification logic
- Rate limiting to prevent abuse
- Load testing

### Risk 4: User Resistance
**Mitigation:**
- Optional for most users
- Mandatory only for admins
- Clear benefits communication
- Easy disable process

---

## Dependencies

### Backend (Already Installed)
- ✅ speakeasy@^2.0.0
- ✅ qrcode@^1.5.4
- ✅ crypto (built-in)

### Frontend (Need to Install)
- [ ] react-otp-input (for 6-digit input)
- [ ] qrcode.react (for QR display) - Optional

---

## Rollout Strategy

### Phase 1: Internal Testing (Week 4)
- Enable for Super Admins only
- Internal testing team
- Bug fixes and refinements

### Phase 2: Admin Rollout (Week 5)
- Enable for Admins
- Optional for other roles
- Collect feedback

### Phase 3: General Availability (Week 6)
- Enable for all users
- Optional for non-admin roles
- Mandatory for Super Admin/Admin

### Phase 4: Enforcement (Week 8)
- Make mandatory for Super Admin
- Make mandatory for Admin
- Optional for all others

---

## Post-Implementation

### Monitoring
- 2FA adoption rate
- Failed verification attempts
- Support tickets
- Performance metrics

### Maintenance
- Regular security audits
- Dependency updates
- User feedback incorporation
- Documentation updates

---

## Related Documentation
- TwoFactorService.js - Backend service implementation
- Migration 007 - Database schema
- User.js Model - User model with 2FA fields

---

## Approval Required
- [ ] Product Owner
- [ ] Security Team
- [ ] Development Team
- [ ] DevOps Team

---

**Next Steps:**
1. Review and approve plan
2. Assign developers
3. Create detailed tickets
4. Begin Phase 1 implementation

**Prepared by:** Claude Code
**Date:** 2025-10-01
**Version:** 1.0
