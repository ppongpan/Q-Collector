# Trusted Device Duration Settings Feature

## สถานะ: เสร็จสมบูรณ์ ✅

## ภาพรวม

เพิ่มฟีเจอร์การตั้งค่าระยะเวลาเชื่อถืออุปกรณ์ (Trusted Device Duration) ให้ Super Admin สามารถปรับเปลี่ยนระยะเวลาที่ผู้ใช้ไม่ต้องยืนยัน 2FA บนอุปกรณ์ที่เชื่อถือได้

## คุณสมบัติหลัก

### ✅ Frontend Components

1. **TrustedDeviceDuration.jsx** (`src/components/settings/`)
   - แสดงเฉพาะ Super Admin เท่านั้น
   - Preset durations: 1h, 6h, 12h, 24h, 7d, 30d
   - Custom duration input (1-720 hours)
   - Real-time API updates
   - Visual feedback with glass morphism UI
   - Current duration display
   - Error handling & validation

2. **SettingsPage.jsx** (Updated)
   - เพิ่ม TrustedDeviceDuration component ในส่วน Security
   - Animation delay 0.4s สำหรับ smooth transitions
   - แสดงหลังจาก TrustedDevices component

### ✅ Backend Implementation

1. **API Endpoints** (`backend/api/routes/auth.routes.js`)

   ```
   GET /api/v1/auth/trusted-devices/settings
   - Get current duration settings
   - Super Admin only
   - Returns: { duration: number }

   PUT /api/v1/auth/trusted-devices/settings
   - Update duration settings
   - Super Admin only
   - Body: { duration: number (1-720) }
   - Returns: { duration: number }
   ```

2. **TrustedDeviceService** (Updated)

   New Methods:
   - `getSettings()` - Get duration from system_settings table
   - `updateSettings(duration)` - Update duration setting
   - `getDuration()` - Get duration for trusting devices
   - `trustDevice()` - Updated to use configurable duration

3. **Database Migration** (`009-add-system-settings.sql`)

   ```sql
   CREATE TABLE system_settings (
     id SERIAL PRIMARY KEY,
     setting_key VARCHAR(255) UNIQUE NOT NULL,
     setting_value TEXT NOT NULL,
     description TEXT,
     created_at TIMESTAMP,
     updated_at TIMESTAMP
   );

   -- Default setting
   INSERT INTO system_settings (setting_key, setting_value, description)
   VALUES ('trusted_device_duration', '24',
           'Duration in hours that a device stays trusted (skip 2FA)');
   ```

## การทำงาน

### Flow การตั้งค่า

1. Super Admin เข้า Settings → Security
2. เห็น "ระยะเวลาเชื่อถืออุปกรณ์" card (ด้านล่าง Trusted Devices)
3. เลือก preset duration หรือ กำหนดเอง (1-720 ชั่วโมง)
4. บันทึกและอัพเดทระบบทั้งหมด

### Flow การใช้งาน

1. User login และยืนยัน 2FA
2. เลือก "จดจำอุปกรณ์"
3. Backend ดึง duration จาก system_settings
4. Trust device ตามระยะเวลาที่กำหนด
5. Login ครั้งต่อไปจะ skip 2FA จนกว่าจะหมดเวลา

## Security Features

- ✅ Super Admin only access
- ✅ Input validation (1-720 hours)
- ✅ Audit logging for setting changes
- ✅ Default fallback (24 hours) if settings error
- ✅ Real-time duration update

## UI/UX Features

- ✅ Glass morphism design
- ✅ Preset durations for quick selection
- ✅ Custom duration input
- ✅ Current duration display
- ✅ Info banner explaining feature
- ✅ Loading states
- ✅ Success/Error toasts
- ✅ Disabled states during save
- ✅ Super Admin badge

## Validation Rules

### Frontend
- Duration: 1-720 hours only
- Number input validation
- Disabled during save operation

### Backend
- Express validator: `isInt({ min: 1, max: 720 })`
- Role check: `super_admin` only
- SQL injection prevention (parameterized queries)

## Database Schema

### system_settings Table
```
id               | SERIAL PRIMARY KEY
setting_key      | VARCHAR(255) UNIQUE NOT NULL
setting_value    | TEXT NOT NULL
description      | TEXT
created_at       | TIMESTAMP
updated_at       | TIMESTAMP
```

### Default Values
```
trusted_device_duration = 24 (hours)
```

## API Response Examples

### GET /api/v1/auth/trusted-devices/settings
```json
{
  "success": true,
  "data": {
    "duration": 24
  }
}
```

### PUT /api/v1/auth/trusted-devices/settings
```json
{
  "success": true,
  "message": "Settings updated successfully",
  "data": {
    "duration": 168
  }
}
```

### Error Response (Non-Super Admin)
```json
{
  "success": false,
  "message": "Only Super Admin can modify these settings",
  "statusCode": 403
}
```

## Testing Checklist

- [ ] Super Admin can access settings
- [ ] Non-Super Admin cannot see the component
- [ ] Preset durations work correctly
- [ ] Custom duration saves properly
- [ ] Duration validation (1-720 hours)
- [ ] Settings persist across sessions
- [ ] Trust device uses new duration
- [ ] Default fallback works on error
- [ ] Audit log records changes
- [ ] Toast notifications work
- [ ] Loading states display correctly

## File Changes Summary

### New Files
1. `src/components/settings/TrustedDeviceDuration.jsx` - Main component
2. `backend/migrations/009-add-system-settings.sql` - Database migration
3. `TRUSTED-DEVICE-DURATION-FEATURE.md` - This documentation

### Modified Files
1. `src/components/SettingsPage.jsx` - Added TrustedDeviceDuration import and render
2. `backend/api/routes/auth.routes.js` - Added settings endpoints
3. `backend/services/TrustedDeviceService.js` - Added settings methods

## Dependencies

### Frontend
- Existing: framer-motion, @fortawesome/react-fontawesome
- No new dependencies

### Backend
- Existing: express-validator, sequelize
- No new dependencies

## Configuration

### Environment Variables
No new environment variables required

### Default Settings
- Default duration: 24 hours
- Min duration: 1 hour
- Max duration: 720 hours (30 days)

## Future Enhancements

### Potential Improvements
- [ ] Per-user duration override
- [ ] Email notification when duration changes
- [ ] Settings history/audit trail
- [ ] Multiple preset configurations
- [ ] Role-based duration limits
- [ ] Device-specific duration

## Migration Steps

### Production Deployment
1. Run migration: `009-add-system-settings.sql`
2. Verify system_settings table created
3. Verify default value inserted
4. Deploy backend changes
5. Deploy frontend changes
6. Test Super Admin access
7. Verify duration changes work

### Rollback Plan
1. Remove settings endpoints from routes
2. Restore original trustDevice() method
3. Drop system_settings table (if needed)
4. Revert frontend changes

---

**Created:** 2025-10-01
**Version:** 1.0.0
**Status:** Complete and Ready for Testing
**Author:** Claude Code Assistant
