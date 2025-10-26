# Public Form Link System - System Analysis & Design Proposal

**Date**: 2025-10-26
**Version**: 0.9.0-dev (Planning Phase)
**Status**: Pre-Implementation Analysis

---

## Executive Summary

การสำรวจระบบ Q-Collector พบว่า **ระบบมีรากฐานที่พร้อมรับการพัฒนา Public Form Feature** โดยมีโครงสร้างสำคัญที่จำเป็นอยู่แล้ว (Optional Auth, PDPA Consent Flow, Rate Limiting) แต่ยังต้อง **เพิ่ม 4 ฟีเจอร์หลัก**: Public Link Management, Anonymous Submission, IP-based Security, และ Public FormView Component

---

## 1. Form Model & Schema Analysis

### Found: Existing Fields (Ready to Use)

**File**: `backend/models/Form.js`

Key fields identified:
- `id` (UUID) - Primary key
- `title` (STRING 255) - Form title with uniqueness constraint
- `description` (TEXT) - Form description
- `roles_allowed` (JSONB) - Array of 18 roles
- `settings` (JSONB) - Can store publicLink configuration
- `is_active` (BOOLEAN) - Controls form availability
- `created_by` (UUID) - Form creator
- `data_retention_years` (INTEGER) - PDPA compliance

**Key Insights:**
- settings (JSONB) can store publicLink without adding new columns
- is_active controls both authenticated and public access
- roles_allowed does not need modification (public link bypasses role check)
- No existing public_slug or public_token fields (must add to settings)

