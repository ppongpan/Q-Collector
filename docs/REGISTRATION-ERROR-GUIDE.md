# คู่มือแก้ปัญหาการลงทะเบียน - Registration Error Guide

**Q-Collector v0.7.2-dev**

เอกสารนี้อธิบายสาเหตุและวิธีแก้ไขข้อผิดพลาดที่อาจเกิดขึ้นระหว่างการลงทะเบียนผู้ใช้งาน

---

## 📋 สารบัญ

1. [ข้อผิดพลาด 409 - ข้อมูลซ้ำ (Duplicate Data)](#1-ข้อผิดพลาด-409---ข้อมูลซ้ำ-duplicate-data)
2. [ข้อผิดพลาด 400 - ข้อมูลไม่ถูกต้อง (Validation Error)](#2-ข้อผิดพลาด-400---ข้อมูลไม่ถูกต้อง-validation-error)
3. [ข้อผิดพลาด 429 - ลงทะเบียนบ่อยเกินไป (Rate Limit)](#3-ข้อผิดพลาด-429---ลงทะเบียนบ่อยเกินไป-rate-limit)
4. [ข้อผิดพลาด Network - ไม่สามารถเชื่อมต่อ](#4-ข้อผิดพลาด-network---ไม่สามารถเชื่อมต่อ)
5. [การทดสอบระบบ Mandatory 2FA](#5-การทดสอบระบบ-mandatory-2fa)

---

## 1. ข้อผิดพลาด 409 - ข้อมูลซ้ำ (Duplicate Data)

### 1.1 อีเมลซ้ำ (Duplicate Email)

**ข้อความ Error:**
```
❌ อีเมลนี้ถูกใช้งานแล้ว

💡 วิธีแก้:
• ใช้อีเมลอื่นที่ยังไม่เคยลงทะเบียน
• หากลืมรหัสผ่าน ให้ติดต่อผู้ดูแลระบบ
```

**สาเหตุ:**
- พยายามลงทะเบียนด้วยอีเมลที่มีอยู่ในระบบแล้ว
- อีเมลต้องไม่ซ้ำกันในฐานข้อมูล (unique constraint)

**Backend Error Code:** `DUPLICATE_EMAIL`

**Backend Log:**
```
[WARN] Registration failed - Email already exists: example@email.com
```

**วิธีแก้:**
1. ใช้อีเมลอื่นที่ยังไม่เคยลงทะเบียน
2. หากต้องการใช้อีเมลเดิม ให้เข้าสู่ระบบแทน (กด "เข้าสู่ระบบ")
3. หากลืมรหัสผ่าน ให้ติดต่อผู้ดูแลระบบ

---

### 1.2 ชื่อผู้ใช้ซ้ำ (Duplicate Username)

**ข้อความ Error:**
```
❌ ชื่อผู้ใช้นี้ถูกใช้งานแล้ว

💡 วิธีแก้:
• เลือกชื่อผู้ใช้ใหม่ที่ยังไม่มีในระบบ
• ลองเพิ่มตัวเลขหรือชื่อที่ไม่ซ้ำกัน
```

**สาเหตุ:**
- พยายามลงทะเบียนด้วยชื่อผู้ใช้ที่มีคนใช้แล้ว
- ชื่อผู้ใช้ต้องไม่ซ้ำกันในฐานข้อมูล (unique constraint)

**Backend Error Code:** `DUPLICATE_USERNAME`

**Backend Log:**
```
[WARN] Registration failed - Username already exists: testuser
```

**วิธีแก้:**
1. เลือกชื่อผู้ใช้ใหม่ เช่น `testuser001`, `testuser2025`
2. เพิ่มตัวเลขหรือตัวอักษรเพื่อให้ไม่ซ้ำ
3. ลองใช้รูปแบบ: `ชื่อ + แผนก + เลข` เช่น `somchaitech01`

**ตัวอย่างชื่อผู้ใช้ที่ดี:**
- ✅ `somchai001`
- ✅ `techsupport01`
- ✅ `saleemp123`
- ❌ `admin` (ซ้ำได้ง่าย)
- ❌ `user` (ซ้ำได้ง่าย)

---

## 2. ข้อผิดพลาด 400 - ข้อมูลไม่ถูกต้อง (Validation Error)

### 2.1 ข้อมูลไม่ครบถ้วน

**ข้อความ Error:**
```
❌ ข้อมูลไม่ถูกต้อง

💡 กรุณาตรวจสอบ:
• ชื่อผู้ใช้: 3-50 ตัวอักษร (a-z, A-Z, 0-9)
• อีเมล: รูปแบบที่ถูกต้อง
• รหัสผ่าน: 8 ตัวอักษรขึ้นไป มีตัวพิมพ์ใหญ่ เล็ก และตัวเลข
```

**สาเหตุ:**
- ชื่อผู้ใช้สั้นเกินไป (< 3 ตัวอักษร)
- ชื่อผู้ใช้ยาวเกินไป (> 50 ตัวอักษร)
- ชื่อผู้ใช้มีอักขระพิเศษ (ต้องเป็น a-z, A-Z, 0-9 เท่านั้น)
- อีเมลรูปแบบไม่ถูกต้อง
- รหัสผ่านไม่ตรงตามเงื่อนไข

**กฎการตรวจสอบ (Validation Rules):**

| ฟิลด์ | เงื่อนไข | ตัวอย่าง |
|------|---------|----------|
| ชื่อผู้ใช้ | 3-50 ตัวอักษร, a-z, A-Z, 0-9 เท่านั้น | `somchai123` ✅<br>`user@` ❌ |
| อีเมล | รูปแบบอีเมลที่ถูกต้อง | `user@email.com` ✅<br>`user@` ❌ |
| รหัสผ่าน | ≥8 ตัวอักษร, มีตัวพิมพ์ใหญ่, เล็ก, ตัวเลข | `Pass1234` ✅<br>`pass` ❌ |
| ชื่อ-นามสกุล | 1-255 ตัวอักษร | `สมชาย ใจดี` ✅ |
| แผนก | เลือกจากตัวเลือกที่กำหนด | `customer_service` ✅ |

---

### 2.2 รหัสผ่านไม่ปลอดภัย

**ข้อความ Error:**
```
❌ รหัสผ่านไม่ปลอดภัย

💡 รหัสผ่านต้องมี:
• อย่างน้อย 8 ตัวอักษร
• ตัวพิมพ์ใหญ่ (A-Z)
• ตัวพิมพ์เล็ก (a-z)
• ตัวเลข (0-9)
```

**สาเหตุ:**
- รหัสผ่านสั้นเกินไป (< 8 ตัวอักษร)
- ไม่มีตัวพิมพ์ใหญ่
- ไม่มีตัวพิมพ์เล็ก
- ไม่มีตัวเลข

**ตัวอย่างรหัสผ่าน:**
- ❌ `password` - ไม่มีตัวพิมพ์ใหญ่และตัวเลข
- ❌ `Pass123` - สั้นเกินไป (7 ตัวอักษร)
- ❌ `PASSWORD123` - ไม่มีตัวพิมพ์เล็ก
- ✅ `Pass1234` - ถูกต้อง (8 ตัวอักษร, มีทั้งตัวพิมพ์ใหญ่ เล็ก และตัวเลข)
- ✅ `MyP@ssw0rd` - ถูกต้องและแข็งแรง

**ระดับความแข็งแรงของรหัสผ่าน:**
1. 🔴 **อ่อนมาก** - 1 point (< 6 ตัวอักษร หรือไม่มีความหลากหลาย)
2. 🟠 **อ่อน** - 2 points (6-9 ตัวอักษร, มีตัวพิมพ์ใหญ่เล็ก)
3. 🟡 **ปานกลาง** - 3 points (10+ ตัวอักษร, มีตัวเลข)
4. 🟢 **แข็งแรง** - 4 points (มีอักขระพิเศษ)
5. 🟢 **แข็งแรงมาก** - 5 points (ยาว + หลากหลาย + อักขระพิเศษ)

---

## 3. ข้อผิดพลาด 429 - ลงทะเบียนบ่อยเกินไป (Rate Limit)

**ข้อความ Error:**
```
❌ ลงทะเบียนบ่อยเกินไป

💡 วิธีแก้:
• รอสักครู่แล้วลองใหม่
• จำกัด 5 ครั้งต่อชั่วโมง
```

**สาเหตุ:**
- พยายามลงทะเบียนเกิน 5 ครั้งภายใน 1 ชั่วโมง
- ระบบป้องกันการ spam และการโจมตี brute force

**การตั้งค่า Rate Limit:**
```javascript
authRateLimit(5, 60 * 60 * 1000) // 5 attempts per hour
```

**วิธีแก้:**
1. รอ 1 ชั่วโมงแล้วลองใหม่
2. ตรวจสอบข้อมูลให้ถูกต้องก่อนกดลงทะเบียน
3. ใช้ username/email ที่ไม่ซ้ำเพื่อหลีกเลี่ยง error 409

**เวลารอที่แนะนำ:**
- หลังพยายาม 5 ครั้ง: รอ 60 นาที
- หากมี error ซ้ำๆ: รอ 15-30 นาที ก่อนลองใหม่

---

## 4. ข้อผิดพลาด Network - ไม่สามารถเชื่อมต่อ

**ข้อความ Error:**
```
❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์

💡 วิธีแก้:
• ตรวจสอบการเชื่อมต่ออินเทอร์เน็ต
• ตรวจสอบว่าเซิร์ฟเวอร์ทำงานอยู่
```

**สาเหตุที่เป็นไปได้:**

### 4.1 Backend ไม่ทำงาน

**วิธีตรวจสอบ:**
```bash
# Windows
netstat -ano | findstr :5000

# ถ้าไม่มี output = backend ไม่ทำงาน
```

**วิธีแก้:**
```bash
cd backend
npm start
```

**ผลลัพธ์ที่ต้องเห็น:**
```
✅ Server running on port 5000
✅ Database connected
✅ Redis connected
✅ MinIO connected
```

---

### 4.2 Frontend เชื่อมต่อผิด URL

**ตรวจสอบ API Configuration:**
```javascript
// src/config/api.config.js
export const API_BASE_URL = 'http://localhost:5000/api/v1';
```

**ทดสอบ Backend:**
```bash
curl http://localhost:5000/api/v1/health
```

**ผลลัพธ์ที่ถูกต้อง:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-04T..."
}
```

---

### 4.3 CORS Error

**ข้อความใน Browser Console:**
```
Access to fetch at 'http://localhost:5000' from origin 'http://localhost:3000'
has been blocked by CORS policy
```

**วิธีแก้:**

Backend ต้องมี CORS configuration:
```javascript
// backend/index.js
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));
```

---

## 5. การทดสอบระบบ Mandatory 2FA

### 5.1 Flow ที่ถูกต้อง

```
1. ผู้ใช้กรอกฟอร์มลงทะเบียน
   ↓
2. Backend สร้าง user (requires_2fa_setup = true)
   ↓
3. Backend return tempToken (15 นาทีหมดอายุ)
   ↓
4. Frontend redirect → /2fa-setup
   ↓
5. แสดง QR Code และ Backup Codes
   ↓
6. ผู้ใช้ Scan QR Code ด้วย Google Authenticator
   ↓
7. ผู้ใช้กรอก 6 หลัก OTP
   ↓
8. Backend verify OTP → set requires_2fa_setup = false
   ↓
9. Backend return full access tokens
   ↓
10. Frontend เข้าสู่ระบบสำเร็จ
```

---

### 5.2 ทดสอบการทำงาน

**ข้อมูลทดสอบ:**
```javascript
{
  username: "testuser001",
  email: "testuser001@example.com",
  full_name: "Test User",
  password: "TestPass123",
  department: "technic"
}
```

**ตรวจสอบ Backend Log:**
```
[INFO] User registered successfully: testuser001
[INFO] User testuser001 requires 2FA setup - returning tempToken
```

**ตรวจสอบ Frontend Console:**
```javascript
RegisterPage - Registration response: {
  data: {
    requires_2fa_setup: true,
    tempToken: "eyJhbGciOiJIUzI1NiIs...",
    user: { id: "...", username: "testuser001", ... }
  }
}

RegisterPage - User requires 2FA setup, redirecting to setup page
```

---

### 5.3 ปัญหาที่พบบ่อย

**1. Redirect ไปหน้า Form List แทนที่จะเป็น 2FA Setup**

**สาเหตุ:**
- Backend ไม่ได้ restart หลังแก้ code
- Route path ผิด (`/auth/2fa-setup` แทนที่จะเป็น `/2fa-setup`)

**วิธีแก้:**
```bash
# Kill และ restart backend
netstat -ano | findstr :5000
taskkill /F /PID <PID>
cd backend && npm start
```

---

**2. ไม่มี tempToken ใน response**

**ตรวจสอบ Backend:**
```javascript
// backend/api/routes/auth.routes.js
if (result.user.requires_2fa_setup === true) {
  const tempToken = jwt.sign(...); // ต้องมี
  return res.status(201).json({
    data: {
      requires_2fa_setup: true,
      tempToken,  // ต้อง return
      user: ...
    }
  });
}
```

---

**3. Frontend เก็บ tokens ทันที (ไม่รอ 2FA)**

**ตรวจสอบ AuthContext:**
```javascript
// src/contexts/AuthContext.jsx
const register = async (userData) => {
  const response = await AuthService.register(userData);

  // ต้องตรวจสอบ requires_2fa_setup ก่อน setUser
  if (response.data?.requires_2fa_setup !== true) {
    setUser(response.user);
  }

  return response;
};
```

---

## 📝 สรุปข้อผิดพลาดทั้งหมด

| Error Code | ข้อความ | สาเหตุ | วิธีแก้ |
|-----------|---------|--------|---------|
| 409 | Email already registered | อีเมลซ้ำ | ใช้อีเมลใหม่ |
| 409 | Username already taken | ชื่อผู้ใช้ซ้ำ | ใช้ชื่อผู้ใช้ใหม่ |
| 400 | Validation error | ข้อมูลไม่ถูกต้อง | ตรวจสอบรูปแบบข้อมูล |
| 400 | Password must contain... | รหัสผ่านไม่ปลอดภัย | ใช้รหัสผ่านที่แข็งแรง |
| 429 | Too many requests | Rate limit | รอ 1 ชั่วโมง |
| Network | Cannot connect | Backend ไม่ทำงาน | Restart backend |
| CORS | CORS policy | CORS config ผิด | ตั้งค่า CORS |

---

## 🔧 เครื่องมือ Debug

### 1. ตรวจสอบ Backend Status
```bash
netstat -ano | findstr :5000
curl http://localhost:5000/api/v1/health
```

### 2. ตรวจสอบ Database
```bash
psql -U qcollector_dev -d qcollector_dev_db
SELECT username, email, requires_2fa_setup FROM users ORDER BY created_at DESC LIMIT 5;
```

### 3. ตรวจสอบ Browser Console
```javascript
// ดู Registration Response
console.log('Registration response:', response);

// ดู Stored Tokens
console.log('Access Token:', localStorage.getItem('access_token'));
console.log('User:', localStorage.getItem('user'));
```

---

## 📞 ติดต่อผู้ดูแลระบบ

หากปัญหายังคงอยู่หลังจากทำตามคู่มือนี้:

1. เก็บ **screenshot** ของข้อความ error
2. เก็บ **browser console log** (F12 → Console)
3. เก็บ **backend log** จาก terminal
4. ติดต่อผู้ดูแลระบบพร้อมข้อมูลข้างต้น

---

**เอกสารอัพเดทล่าสุด:** 2025-10-04
**เวอร์ชัน:** Q-Collector v0.7.2-dev
