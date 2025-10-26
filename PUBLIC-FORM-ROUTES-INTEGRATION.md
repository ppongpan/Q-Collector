# Public Form Routes Integration Guide

**Quick guide for integrating PublicFormView components into React Router**

---

## Step 1: Import Components

Add these imports to your main `App.js` or router configuration file:

```javascript
// Public form components
import PublicFormView from './components/PublicFormView';
import PublicThankYouPage from './components/PublicThankYouPage';
import {
  NotFoundPage,
  ExpiredPage,
  LimitReachedPage,
  GenericErrorPage
} from './components/PublicErrorPages';
```

---

## Step 2: Add Routes

Add these routes to your React Router configuration. These should be **outside** any authentication guards since they're public routes.

```javascript
<Routes>
  {/* ========================================
      PUBLIC ROUTES (No Authentication)
      ======================================== */}

  {/* Public form view - anonymous submissions */}
  <Route path="/public/forms/:slug" element={<PublicFormView />} />

  {/* Thank you page after submission */}
  <Route path="/public/thank-you/:submissionId" element={<PublicThankYouPage />} />

  {/* Error pages */}
  <Route path="/404" element={<NotFoundPage />} />
  <Route path="/expired" element={<ExpiredPage />} />
  <Route path="/limit-reached" element={<LimitReachedPage />} />
  <Route path="/error" element={<GenericErrorPage />} />

  {/* ========================================
      AUTHENTICATED ROUTES (Below this)
      ======================================== */}

  {/* Your existing authenticated routes */}
  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
  {/* ... more routes ... */}
</Routes>
```

---

## Step 3: Example URL Structure

After integration, these URLs will be available:

### Public Form Access
```
http://localhost:3000/public/forms/customer-feedback
http://localhost:3000/public/forms/employee-survey
http://localhost:3000/public/forms/pdpa-demo
```

### Thank You Page
```
http://localhost:3000/public/thank-you/abc123-def456-ghi789
```

### Error Pages
```
http://localhost:3000/404
http://localhost:3000/expired
http://localhost:3000/limit-reached
http://localhost:3000/error
```

---

## Step 4: Testing

### 4.1 Test Form Loading
```bash
# Visit a public form (replace 'customer-feedback' with actual slug)
http://localhost:3000/public/forms/customer-feedback
```

**Expected**:
- ✅ Banner displays (if configured)
- ✅ Privacy notice shows (if enabled)
- ✅ Form fields render correctly
- ✅ Submission counter shows

### 4.2 Test Privacy Notice Flow
1. Visit form with privacy notice enabled
2. Click "ยอมรับและดำเนินการต่อ"
3. Consent form appears (if consent items exist)
4. Fill name and sign
5. Click "ดำเนินการต่อ"
6. Form fields appear

### 4.3 Test Form Submission
1. Fill all required fields
2. Click "ส่งฟอร์ม"
3. Wait for submission (spinner shows)
4. Redirect to thank you page
5. Submission ID displays

### 4.4 Test Error Handling
```javascript
// In browser console, test error navigation:
window.location.href = '/404';
window.location.href = '/expired';
window.location.href = '/limit-reached';
window.location.href = '/error';
```

---

## Step 5: Backend Verification

Ensure backend routes are working:

```bash
# Test form loading (replace :slug)
curl http://localhost:5000/api/v1/public/forms/customer-feedback

# Test form submission (replace :slug)
curl -X POST http://localhost:5000/api/v1/public/forms/customer-feedback/submit \
  -H "Content-Type: application/json" \
  -d '{
    "token": "your-security-token",
    "data": {"field1": "value1"},
    "privacyNoticeAccepted": true
  }'

# Test status
curl http://localhost:5000/api/v1/public/forms/customer-feedback/status
```

---

## Step 6: Create Test Form

To test the public form view, you need a form with public link enabled:

### Option A: Via Admin UI (Recommended)
1. Login as admin
2. Go to Forms page
3. Create or edit a form
4. Go to "Settings" tab
5. Enable "Public Link"
6. Set slug (e.g., "customer-feedback")
7. Set max submissions (e.g., 100)
8. Set expiration date (optional)
9. Upload banner image (optional)
10. Enable privacy notice (optional)
11. Add consent items (optional)
12. Save form

### Option B: Via Database Script
```javascript
// Create test form with public link
UPDATE forms
SET settings = jsonb_set(
  settings,
  '{publicLink}',
  '{
    "enabled": true,
    "slug": "customer-feedback",
    "token": "test-token-abc123",
    "submissionCount": 0,
    "maxSubmissions": 100,
    "expiresAt": "2025-12-31T23:59:59Z"
  }'::jsonb
)
WHERE title = 'Your Form Title';
```

---

## Step 7: Environment Variables

Ensure these are set in your `.env` files:

### Frontend (.env)
```bash
REACT_APP_API_URL=/api/v1
```

### Backend (backend/.env)
```bash
# Already configured in existing setup
DB_HOST=localhost
DB_PORT=5432
DB_NAME=qcollector_dev_2025
REDIS_URL=redis://localhost:6379
```

---

## Step 8: Optional - Add Public Link Manager

You may want to add a UI component for managing public links in the admin panel:

```javascript
// In FormBuilder or Settings component
const handleEnablePublicLink = async () => {
  const response = await apiClient.enablePublicLink(formId, {
    slug: 'customer-feedback',
    maxSubmissions: 100,
    expiresAt: '2025-12-31T23:59:59Z'
  });

  console.log('Public link enabled:', response.form.settings.publicLink);
};

const handleDisablePublicLink = async () => {
  await apiClient.disablePublicLink(formId);
  console.log('Public link disabled');
};

const handleRegenerateToken = async () => {
  const response = await apiClient.regeneratePublicToken(formId);
  console.log('New token:', response.form.settings.publicLink.token);
};
```

---

## Troubleshooting

### Issue: 404 on public form URL
**Solution**: Check if public link is enabled and slug is correct in database

### Issue: "Invalid token" error
**Solution**: Verify token matches between frontend and backend

### Issue: Form not loading
**Solution**: Check browser console for errors, verify API endpoint

### Issue: Submission fails
**Solution**: Check rate limiting, verify all required fields filled

### Issue: Privacy notice not showing
**Solution**: Check `form.settings.privacyNotice.enabled` is true

### Issue: Consent form not showing
**Solution**: Check `form.consentItems` array has items

---

## Success Criteria

✅ Public form loads by slug
✅ Banner displays correctly
✅ Privacy notice flow works
✅ Consent form flow works
✅ Digital signature capture works
✅ All field types render correctly
✅ Form validation works
✅ Submission succeeds
✅ Thank you page displays
✅ Error pages work
✅ Mobile responsive
✅ Thai language displays correctly

---

## Next Steps After Integration

1. **Testing**:
   - Test all user flows
   - Test error scenarios
   - Test mobile responsiveness
   - Test with real data

2. **Security**:
   - Review rate limiting settings
   - Test token validation
   - Verify input sanitization
   - Check CORS configuration

3. **UX Improvements**:
   - Add loading skeletons
   - Add form progress indicator
   - Add field help text
   - Add success animation

4. **Features**:
   - Add reCAPTCHA
   - Add email confirmation
   - Add submission tracking
   - Add analytics

---

**Status**: Ready for integration
**Last Updated**: 2025-10-26
