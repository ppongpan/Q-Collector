# Public Link System - Architecture Overview

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                             │
│                     (React + TailwindCSS)                           │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    EnhancedFormBuilder.jsx                          │
│  ┌───────┬───────┬──────────┬──────────────┬──────────┐            │
│  │ Main  │ Sub   │ Notifica-│ Public Link  │ Settings │            │
│  │ Fields│ Forms │ tions    │  [NEW! ✨]   │          │            │
│  └───────┴───────┴──────────┴──────────────┴──────────┘            │
│                                  │                                   │
│                                  ↓                                   │
│                    ┌─────────────────────────┐                      │
│                    │ PublicLinkSettings.jsx  │                      │
│                    │  - Enable/Disable       │                      │
│                    │  - Slug Input           │                      │
│                    │  - Token Display        │                      │
│                    │  - Banner Upload        │                      │
│                    │  - QR Code Generator    │                      │
│                    │  - Expiration Settings  │                      │
│                    └─────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         API CLIENT LAYER                            │
│                       (src/services/ApiClient.js)                   │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ADMIN METHODS (Authenticated)                               │  │
│  │  • enablePublicLink(formId, options)                         │  │
│  │  • disablePublicLink(formId)                                 │  │
│  │  • regeneratePublicToken(formId)                             │  │
│  │  • updatePublicLink(formId, settings)                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  PUBLIC METHODS (Anonymous)                                  │  │
│  │  • getPublicForm(slug)                                       │  │
│  │  • submitPublicForm(slug, data)                              │  │
│  │  • getPublicFormStatus(slug)                                 │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND API ROUTES                           │
│                 (backend/api/routes/form.routes.js)                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  POST   /api/v1/forms/:id/public-link/enable                 │  │
│  │  POST   /api/v1/forms/:id/public-link/disable                │  │
│  │  POST   /api/v1/forms/:id/public-link/regenerate-token       │  │
│  │  PUT    /api/v1/forms/:id/public-link                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  MIDDLEWARE STACK:                                           │  │
│  │  1. authenticate (JWT validation)                            │  │
│  │  2. authorize (super_admin, admin only)                      │  │
│  │  3. sanitizeBody (XSS protection)                            │  │
│  │  4. validate (express-validator)                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       BUSINESS LOGIC LAYER                          │
│                   (backend/services/FormService.js)                 │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ⚠️  TO BE IMPLEMENTED IN PHASE 3                            │  │
│  │                                                              │  │
│  │  • FormService.enablePublicLink(formId, options)             │  │
│  │  • FormService.disablePublicLink(formId)                     │  │
│  │  • FormService.regeneratePublicToken(formId)                 │  │
│  │  • FormService.updatePublicLink(formId, settings)            │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                              │
│                     (PostgreSQL + Sequelize)                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  ⚠️  TO BE MIGRATED IN PHASE 3                               │  │
│  │                                                              │  │
│  │  Table: forms                                                │  │
│  │  New Column: public_link JSONB                               │  │
│  │  {                                                           │  │
│  │    enabled: boolean,                                         │  │
│  │    slug: string (unique),                                    │  │
│  │    token: string,                                            │  │
│  │    banner: { url, alt },                                     │  │
│  │    expiresAt: timestamp,                                     │  │
│  │    maxSubmissions: integer,                                  │  │
│  │    submissionCount: integer,                                 │  │
│  │    createdAt: timestamp                                      │  │
│  │  }                                                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Save Public Link Settings

### User Action Flow
```
1. User clicks "Public Link" tab
         ↓
2. PublicLinkSettings component renders
         ↓
3. User configures settings:
   - Toggles "Enable" ON
   - Sets slug: "customer-feedback"
   - System auto-generates token
   - User uploads banner (optional)
   - Sets expiration: 2025-12-31
         ↓
4. User clicks "Save Settings"
         ↓
5. onSave handler called
         ↓
6. apiClient.updatePublicLink(formId, settings)
         ↓
7. HTTP PUT /api/v1/forms/{formId}/public-link
         ↓
8. Backend validation & sanitization
         ↓
9. FormService.updatePublicLink() [PHASE 3]
         ↓
10. Database UPDATE forms SET public_link = {...}
         ↓
11. Response: { success: true, data: { form: {...} } }
         ↓
12. updateForm() updates React state
         ↓
13. Toast notification: "บันทึกการตั้งค่าลิงก์สาธารณะสำเร็จ"
```

---

## Security Architecture

### Authentication Flow
```
┌──────────────────┐
│ User Login       │
│ (JWT Token)      │
└────────┬─────────┘
         │
         ↓
┌──────────────────────────────────────────┐
│ Request Interceptor (ApiClient)          │
│ • Adds Authorization: Bearer {token}     │
│ • Excludes public endpoints             │
└────────┬─────────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────┐
│ Backend Middleware Stack                 │
│ 1. authenticate (verify JWT)             │
│ 2. authorize (check role)                │
│ 3. sanitizeBody (clean input)            │
│ 4. validate (check format)               │
└────────┬─────────────────────────────────┘
         │
         ↓
┌──────────────────────────────────────────┐
│ Allowed: super_admin, admin              │
│ Denied: All other roles                  │
└──────────────────────────────────────────┘
```

### Input Validation Layers
```
LAYER 1: Frontend (PublicLinkSettings.jsx)
  • Slug format validation (client-side)
  • Length checks (3-50 chars)
  • Regex: /^[a-z0-9-]+$/
  • Visual error feedback

LAYER 2: API Client (ApiClient.js)
  • HTTP method validation
  • Parameter type checking
  • Error transformation

LAYER 3: Backend Routes (form.routes.js)
  • express-validator rules
  • UUID format validation
  • Conditional validation (if enabled=true)
  • ISO8601 date validation

LAYER 4: Business Logic [PHASE 3]
  • Slug uniqueness check
  • Form ownership verification
  • Database constraints
  • Token generation security
```

---

## Public Access Flow (PHASE 3+)

### Anonymous User Journey
```
1. User receives QR code or URL
         ↓
2. Scans QR or visits URL
   https://app.com/public/forms/customer-feedback
         ↓
3. Frontend route: /public/forms/:slug
         ↓
4. Component: PublicFormView.jsx [TO BE BUILT]
         ↓
5. API call: apiClient.getPublicForm(slug)
         ↓
6. Backend: GET /public/forms/:slug (NO AUTH)
         ↓
7. Checks:
   - Form exists?
   - Public link enabled?
   - Not expired?
   - Submissions under limit?
         ↓
8. Returns: Form fields + banner
         ↓
9. User fills out form
         ↓
10. Submit: apiClient.submitPublicForm(slug, data)
         ↓
11. Backend: POST /public/forms/:slug/submit (NO AUTH)
         ↓
12. Validates token + data
         ↓
13. Creates submission in database
         ↓
14. Success message + optional redirect
```

---

## Component Hierarchy

```
EnhancedFormBuilder
  ├── Tab Navigation
  │   ├── Main Fields Tab
  │   ├── Sub Forms Tab
  │   ├── Notifications Tab
  │   ├── Public Link Tab ← NEW!
  │   │   └── PublicLinkSettings
  │   │       ├── Enable Toggle
  │   │       ├── Slug Input (with validation)
  │   │       ├── Token Display (read-only)
  │   │       ├── Regenerate Token Button
  │   │       ├── Banner Upload
  │   │       │   └── FileUploadZone
  │   │       ├── Expiration DatePicker
  │   │       ├── Max Submissions Input
  │   │       ├── QR Code Generator
  │   │       │   ├── QRCodeCanvas
  │   │       │   └── Download Button
  │   │       ├── Statistics Cards
  │   │       └── Action Buttons
  │   │           ├── Cancel
  │   │           └── Save
  │   └── Settings Tab
  └── Form State Management
```

---

## API Endpoint Matrix

| Endpoint | Method | Auth | Roles | Input Validation | Output |
|----------|--------|------|-------|------------------|--------|
| `/forms/:id/public-link/enable` | POST | ✅ | admin, super_admin | slug, expiresAt, maxSubmissions | Updated form |
| `/forms/:id/public-link/disable` | POST | ✅ | admin, super_admin | - | Updated form |
| `/forms/:id/public-link/regenerate-token` | POST | ✅ | admin, super_admin | - | New token |
| `/forms/:id/public-link` | PUT | ✅ | admin, super_admin | enabled, slug, token, expiresAt, maxSubmissions | Updated form |
| `/public/forms/:slug` | GET | ❌ | - | - | Form data |
| `/public/forms/:slug/submit` | POST | ❌ | - | fieldData, token | Submission |
| `/public/forms/:slug/status` | GET | ❌ | - | - | Status info |

---

## State Management

### Frontend State Structure
```javascript
// EnhancedFormBuilder state
const [form, setForm] = useState({
  id: "uuid",
  title: "Customer Feedback Form",
  fields: [...],
  subForms: [...],
  publicLink: {
    enabled: true,
    slug: "customer-feedback",
    token: "abc123def456...",
    banner: {
      url: "https://minio.app.com/banners/image.png",
      alt: "Company Logo"
    },
    expiresAt: "2025-12-31T23:59:59Z",
    maxSubmissions: 1000,
    submissionCount: 247,
    createdAt: "2025-10-26T10:00:00Z"
  }
});

// PublicLinkSettings local state
const [enabled, setEnabled] = useState(false);
const [slug, setSlug] = useState('');
const [token, setToken] = useState('');
const [slugError, setSlugError] = useState('');
const [isSaving, setIsSaving] = useState(false);
```

### Backend State (Database)
```sql
-- forms table
CREATE TABLE forms (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  public_link JSONB,
  -- other columns...
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- public_link JSONB structure
{
  "enabled": true,
  "slug": "customer-feedback",
  "token": "abc123...",
  "banner": {"url": "...", "alt": "..."},
  "expiresAt": "2025-12-31T23:59:59Z",
  "maxSubmissions": 1000,
  "submissionCount": 247,
  "createdAt": "2025-10-26T10:00:00Z"
}

-- Index for fast slug lookups
CREATE UNIQUE INDEX idx_forms_public_link_slug
ON forms ((public_link->>'slug'));
```

---

## Error Handling Strategy

### Frontend Error Flow
```
Error Occurs
    ↓
ApiClient interceptor catches error
    ↓
transformError() creates user-friendly message
    ↓
Promise rejection
    ↓
PublicLinkSettings onSave catch block
    ↓
throw new Error(message)
    ↓
PublicLinkSettings displays error via toast
```

### Error Messages
```javascript
// Frontend
"Failed to save public link settings"
"Slug is required when enabled"
"Slug must be 3-50 characters"
"Slug can only contain lowercase letters, numbers, and hyphens"

// Backend
"Invalid form ID"
"Validation failed"
"Slug already exists"
"Form not found"
"Unauthorized"
```

---

## Performance Considerations

### Frontend Optimizations
- Debounced slug validation (800ms)
- Lazy loading of QR code library
- Image optimization for banner uploads
- React.memo for expensive components

### Backend Optimizations
- Database index on slug column (UNIQUE)
- JSONB indexing for fast queries
- Token generation using crypto.randomBytes
- Presigned URLs for MinIO uploads

### Caching Strategy
- Form metadata cached in React state
- Public forms cached with 5-minute TTL
- QR codes generated client-side (no server load)

---

## Testing Strategy

### Unit Tests (To Be Implemented)
```javascript
// Frontend
PublicLinkSettings.test.jsx
  ✓ Renders without crashing
  ✓ Validates slug format
  ✓ Generates token on enable
  ✓ Calls onSave with correct data

// Backend
form.routes.test.js
  ✓ Rejects invalid UUIDs
  ✓ Requires authentication
  ✓ Validates slug format
  ✓ Checks role authorization
```

### Integration Tests
```javascript
// Browser console
await testPublicLinkIntegration('form-uuid')

// Automated (Playwright)
test('Admin can enable public link', async ({ page }) => {
  await page.goto('/forms/edit/uuid');
  await page.click('[data-testid="public-link-tab"]');
  await page.check('input[type="checkbox"]');
  await page.fill('#slug', 'test-form');
  await page.click('button:has-text("Save Settings")');
  await expect(page.locator('.toast')).toContainText('บันทึก');
});
```

---

## Deployment Checklist

### PHASE 2 (Current) ✅
- [x] Frontend component integration
- [x] API client methods
- [x] Backend routes with validation
- [x] Security middleware
- [x] Documentation

### PHASE 3 (Next)
- [ ] Database migration
- [ ] FormService implementation
- [ ] Public access routes
- [ ] PublicFormView component
- [ ] MinIO banner upload
- [ ] QR code generation
- [ ] Token security hardening

### PHASE 4 (Future)
- [ ] Analytics dashboard
- [ ] Rate limiting for public submissions
- [ ] CAPTCHA integration
- [ ] Custom branding
- [ ] Multi-language support

---

**Architecture Version**: 1.0
**Last Updated**: 2025-10-26
**Status**: PHASE 2 Complete, Ready for PHASE 3
