# Public Form Link System - Analysis Report

Date: 2025-10-26
Q-Collector Version: v0.8.5-dev
Analysis Status: Complete

---

## Executive Summary

System Readiness: 75%

Ready to Use:
- optionalAuth middleware (anonymous support)
- PDPA consent flow (works with anonymous users)
- IP-based rate limiting with Redis
- Metadata tracking (IP address, user-agent)
- Nullable user_id in submissions table

Need to Implement:
- Public link management UI
- Public FormView component
- Public submission API endpoints
- Token generation and validation

---

## 1. Form Model Analysis

File: backend/models/Form.js

Current Schema:
- id (UUID)
- title (STRING 255)
- settings (JSONB) - can store publicLink config
- is_active (BOOLEAN)
- roles_allowed (JSONB)

Proposed Extension (no migration needed):
form.settings.publicLink = {
  enabled: false,
  slug: "customer-feedback-q4",
  token: "abc123xyz456",
  expiresAt: "2025-12-31T23:59:59Z",
  maxSubmissions: null,
  submissionCount: 0,
  ipRateLimit: { maxPerHour: 5, maxPerDay: 20 }
}

---

## 2. FormView Component Analysis

File: src/components/FormView.jsx

PDPA Consent Flow (Ready):
- Privacy Notice display working
- Consent Items display working
- Digital signature capture working

Missing Features:
1. Anonymous user handling
2. Public link detection logic
3. IP-based submitter display

---

## 3. Submission Service Analysis

File: backend/services/SubmissionService.js

Current method requires userId (will fail for anonymous users)

Required modification:
- Add isPublic parameter
- Skip role check when isPublic = true
- Validate public link settings

---

## 4. Authentication Middleware Analysis

File: backend/middleware/auth.middleware.js

optionalAuth - Ready to use (no changes needed)
attachMetadata - Ready to use (extracts IP properly)

---

## 5. Rate Limiting Analysis

File: backend/middleware/rateLimit.middleware.js

Current: submissionRateLimiter supports IP fallback
Proposed: publicFormRateLimiter (stricter - 5/hour)

---

## Implementation Plan

Phase 1: Backend Core (3 hours)
- Form Service: generatePublicSlug, validatePublicToken
- Submission Service: modify createSubmission for isPublic
- Public Routes: GET/POST /api/v1/public/forms/:slug

Phase 2: Form Builder UI (2 hours)
- Public Link Settings Tab
- Management endpoints (enable/disable/regenerate)

Phase 3: Public FormView (2 hours)
- Public FormView component
- URL: /public/forms/:slug

Phase 4: Testing (1 hour)
- Rate limiting tests
- Token validation tests
- PDPA compliance tests

Total Effort: 8 hours

---

## URL Structure

Public Access:
https://q-collector.com/public/forms/customer-feedback-q4
http://localhost:3000/public/forms/test-form

API Endpoints:
GET  /api/v1/public/forms/:slug
POST /api/v1/public/forms/:slug/submit
POST /api/v1/forms/:formId/public-link/enable

---

## Security Considerations

Strengths:
- Redis-based rate limiting ready
- PDPA compliance maintained
- Input sanitization ready

Mitigations:
- Spam: IP rate limiting (5/hour)
- Token leakage: Regeneration + expiration
- DDoS: Global rate limiter

---

## Conclusion

System Readiness: 75%

Strong Foundation:
- optionalAuth middleware ready
- PDPA consent flow functional
- IP-based rate limiting ready
- No database migration required

Estimated Effort: 8 hours total

Next Steps:
1. Create task breakdown in qtodo.md
2. Implement Backend Core
3. Implement Form Builder UI
4. Implement Public FormView
5. Testing and validation

---

End of Analysis

Prepared by: Claude Code (Haiku 4.5)
Files Analyzed: 9 files
Status: Ready for Implementation

