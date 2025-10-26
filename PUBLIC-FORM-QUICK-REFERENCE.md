# PublicFormView Quick Reference Card

**Quick reference for using the Public Form View system**

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Add Routes to App.js
```javascript
import PublicFormView from './components/PublicFormView';
import PublicThankYouPage from './components/PublicThankYouPage';
import { NotFoundPage, ExpiredPage, LimitReachedPage } from './components/PublicErrorPages';

// In your <Routes>:
<Route path="/public/forms/:slug" element={<PublicFormView />} />
<Route path="/public/thank-you/:submissionId" element={<PublicThankYouPage />} />
<Route path="/404" element={<NotFoundPage />} />
<Route path="/expired" element={<ExpiredPage />} />
<Route path="/limit-reached" element={<LimitReachedPage />} />
```

### Step 2: Enable Public Link on a Form
```sql
-- In your database
UPDATE forms
SET settings = jsonb_set(
  settings,
  '{publicLink}',
  '{"enabled": true, "slug": "test-form", "token": "abc123", "maxSubmissions": 100}'::jsonb
)
WHERE title = 'Your Test Form';
```

### Step 3: Test
```
Visit: http://localhost:3000/public/forms/test-form
```

---

## 📁 Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `PublicFormView.jsx` | 1,045 | Main public form component |
| `PublicThankYouPage.jsx` | 94 | Success page |
| `PublicErrorPages.jsx` | 156 | Error pages (404, expired, limit) |

---

## 🔗 URLs

| URL | Purpose |
|-----|---------|
| `/public/forms/:slug` | Public form access |
| `/public/thank-you/:submissionId` | Success page |
| `/404` | Form not found |
| `/expired` | Link expired |
| `/limit-reached` | Submission limit reached |

---

## 🎯 Supported Field Types

| Type | Status | Component |
|------|--------|-----------|
| short_answer | ✅ | GlassInput |
| paragraph | ✅ | GlassTextarea |
| email | ✅ | GlassInput (validated) |
| phone | ✅ | ThaiPhoneInput |
| number | ✅ | GlassInput (number) |
| url | ✅ | GlassInput (validated) |
| date | ✅ | ThaiDateInput |
| time | ✅ | GlassInput (time) |
| datetime | ✅ | ThaiDateTimeInput |
| multiple_choice | ✅ | Radio/Checkbox/Dropdown |
| rating | ✅ | Stars (1-5) |
| slider | ✅ | EnhancedFormSlider |
| **file_upload** | ❌ | Not supported (security) |
| **image_upload** | ❌ | Not supported (security) |
| **lat_long** | ❌ | Not supported (permission) |
| **province** | ❌ | Not implemented |
| **factory** | ❌ | Not implemented |

---

## 🔒 Security

| Feature | Implementation |
|---------|----------------|
| Token validation | `form.settings.publicLink.token` |
| Rate limiting | 5 submissions/hour per IP |
| Input sanitization | Backend + Frontend (DOMPurify) |
| Anonymous tracking | IP + User-Agent |

---

## 🎨 User Flows

### Simple Form
```
Visit → Form → Submit → Thank You
```

### With Privacy Notice
```
Visit → Privacy Notice → Acknowledge → Form → Submit → Thank You
```

### Full PDPA
```
Visit → Privacy → Acknowledge → Consents → Sign → Form → Submit → Thank You
```

---

## ⚠️ Error Codes

| Code | HTTP | Page | Message |
|------|------|------|---------|
| `FORM_NOT_FOUND` | 404 | NotFoundPage | ไม่พบฟอร์ม |
| `PUBLIC_LINK_EXPIRED` | 410 | ExpiredPage | ลิงก์หมดอายุ |
| `SUBMISSION_LIMIT_REACHED` | 429 | LimitReachedPage | ถึงจำนวนสูงสุด |
| `INVALID_TOKEN` | 403 | Toast | รหัสไม่ถูกต้อง |
| `RATE_LIMIT` | 429 | Toast | ส่งมากเกินไป |

---

## 🧪 Quick Test

```bash
# 1. Start servers
cd backend && npm start
npm start

# 2. Create test form
# (Use admin UI or SQL from Step 2 above)

# 3. Visit form
http://localhost:3000/public/forms/test-form

# 4. Fill and submit
# (Should redirect to thank you page)
```

---

## 📋 Checklist

Before going live:
- [ ] Routes added to App.js
- [ ] Public link enabled on form
- [ ] Banner uploaded (optional)
- [ ] Privacy notice configured (optional)
- [ ] Consent items added (optional)
- [ ] Test submission successful
- [ ] Thank you page works
- [ ] Error pages work
- [ ] Mobile responsive
- [ ] Thai language correct

---

## 🔧 Configuration

### Minimal Config (No PDPA)
```json
{
  "settings": {
    "publicLink": {
      "enabled": true,
      "slug": "my-form",
      "token": "random-token-123"
    }
  }
}
```

### Full Config (With PDPA)
```json
{
  "settings": {
    "publicLink": {
      "enabled": true,
      "slug": "my-form",
      "token": "random-token-123",
      "banner": "https://example.com/banner.jpg",
      "maxSubmissions": 100,
      "expiresAt": "2025-12-31T23:59:59Z"
    },
    "privacyNotice": {
      "enabled": true,
      "mode": "custom",
      "customText": { "th": "นโยบาย..." },
      "requireAcknowledgment": true
    },
    "pdpa": {
      "requireSignature": true
    }
  }
}
```

---

## 🆘 Common Issues

### Form not loading
```
✅ Check slug is correct
✅ Check publicLink.enabled = true
✅ Check backend is running
✅ Check database connection
```

### Invalid token error
```
✅ Verify token in form.settings.publicLink.token
✅ Check token hasn't changed
✅ Clear browser cache
```

### Submission fails
```
✅ Check all required fields filled
✅ Check rate limit not exceeded
✅ Check submission limit not reached
✅ Check backend logs
```

### Privacy notice not showing
```
✅ Check settings.privacyNotice.enabled = true
✅ Check customText or linkUrl is set
✅ Clear browser cache
```

---

## 📞 Quick Help

| Issue | Check | Fix |
|-------|-------|-----|
| Blank page | Browser console | Check import paths |
| 404 error | Backend logs | Verify slug in database |
| Token error | Database | Match token in frontend/backend |
| Rate limit | Redis | Wait or increase limit |
| Validation | Form config | Check required fields |

---

## 📚 Documentation

- **Implementation**: `PUBLIC-FORM-VIEW-IMPLEMENTATION.md`
- **Integration**: `PUBLIC-FORM-ROUTES-INTEGRATION.md`
- **Summary**: `PUBLIC-FORM-VIEW-SUMMARY.md`
- **This Card**: `PUBLIC-FORM-QUICK-REFERENCE.md`

---

## ✅ Status

**Implementation**: ✅ Complete
**Documentation**: ✅ Complete
**Testing**: ⏳ Pending
**Ready**: ✅ YES

---

**Last Updated**: 2025-10-26
**Version**: v0.9.0-dev
