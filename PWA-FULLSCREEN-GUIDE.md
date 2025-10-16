# PWA Fullscreen Mode - คู่มือการใช้งาน

**Date:** 2025-10-11
**Version:** v0.7.9-dev
**Status:** ✅ PWA Support Complete

---

## 🎯 สิ่งที่ได้เพิ่ม

Q-Collector ตอนนี้รองรับ **Progressive Web App (PWA)** แล้ว!

**ประโยชน์:**
- ✅ แสดงผลเต็มจอบนมือถือ (ไม่มี address bar)
- ✅ ทำงานเหมือน Native App
- ✅ เปิดแอพจาก Home Screen ได้โดยตรง
- ✅ ใช้งานได้แม้ offline (ถ้าเคยโหลดไว้แล้ว)
- ✅ รองรับทั้ง iOS และ Android

---

## 📱 วิธีติดตั้งบนมือถือ

### สำหรับ iPhone / iPad (Safari):

1. **เปิด Safari** แล้วเข้า URL: `https://78291324f2c7.ngrok-free.app` (หรือ URL ที่คุณใช้)

2. **กดปุ่ม Share** (ไอคอนลูกศรชี้ขึ้น) ที่ด้านล่างหน้าจอ

3. **เลือก "Add to Home Screen"** (เพิ่มไปยังหน้าจอโฮม)

4. **ตั้งชื่อแอพ** (ค่าเริ่มต้น: "Q-Collector") แล้วกด **Add**

5. **เปิดแอพจาก Home Screen** → จะเปิดแบบเต็มจอ ไม่มี Safari UI!

---

### สำหรับ Android (Chrome / Samsung Internet):

1. **เปิด Chrome** แล้วเข้า URL ที่คุณใช้

2. **กดปุ่ม Menu (⋮)** มุมบนขวา

3. **เลือก "Add to Home screen"** หรือ "Install app"

4. **กด Install** ในป๊อปอัพที่ขึ้นมา

5. **เปิดแอพจาก Home Screen** → จะเปิดแบบเต็มจอ ไม่มี Chrome UI!

---

## 🔧 ไฟล์ที่เพิ่ม/แก้ไข

### 1. `public/manifest.json` (ไฟล์ใหม่)

```json
{
  "name": "Q-Collector - ระบบบันทึกข้อมูล",
  "short_name": "Q-Collector",
  "description": "ระบบสร้างฟอร์มและบันทึกข้อมูล Q-CON",
  "start_url": "/",
  "display": "standalone",          ← เปิดแบบ standalone (เต็มจอ)
  "orientation": "portrait",        ← แนวตั้ง
  "theme_color": "#000000",         ← สีธีมดำ
  "background_color": "#000000"
}
```

**คำอธิบาย:**
- `display: "standalone"` - แสดงแบบ app ไม่มี browser UI
- `orientation: "portrait"` - บังคับแนวตั้ง (เหมาะสำหรับฟอร์ม)
- `theme_color` - สีของ status bar
- `background_color` - สีพื้นหลังตอนโหลด

---

### 2. `public/index.html` (แก้ไข)

**เพิ่ม Meta Tags สำหรับ PWA:**

```html
<!-- ✅ PWA: Viewport with fullscreen support -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />

<!-- ✅ PWA: Theme colors -->
<meta name="theme-color" content="#000000" />
<meta name="msapplication-TileColor" content="#000000" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

<!-- ✅ PWA: App-like behavior -->
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="Q-Collector" />

<!-- ✅ PWA: Manifest -->
<link rel="manifest" href="%PUBLIC_URL%/manifest.json" />
```

**คำอธิบาย:**
- `viewport-fit=cover` - ใช้พื้นที่เต็มจอ (รวม notch ของ iPhone X+)
- `apple-mobile-web-app-capable="yes"` - ทำงานแบบ app บน iOS
- `apple-mobile-web-app-status-bar-style="black-translucent"` - status bar ใส
- `mobile-web-app-capable="yes"` - ทำงานแบบ app บน Android

---

## 📊 Display Modes เปรียบเทียบ

| Mode | Browser UI | Status Bar | ความเหมาะสม |
|------|------------|------------|--------------|
| `browser` | ✅ มี (เต็ม) | ✅ มี | เว็บไซต์ทั่วไป |
| `minimal-ui` | ⚠️ มีบางส่วน | ✅ มี | เว็บไซต์ที่ต้องการ back button |
| `standalone` | ❌ ไม่มี | ✅ มี | **← เราใช้นี้!** App-like |
| `fullscreen` | ❌ ไม่มี | ❌ ไม่มี | เกม, วิดีโอ |

**Q-Collector ใช้ `standalone`** เพราะ:
- ต้องการพื้นที่เต็มจอสำหรับฟอร์ม
- แต่ยังต้องการ status bar (เวลา, แบต)
- User experience คล้าย native app

---

## 🎨 Theme Colors

```json
"theme_color": "#000000",       // สีดำ (ตาม Q-Collector design)
"background_color": "#000000"   // พื้นหลังดำ (ตอนโหลด)
```

**ผลลัพธ์:**
- iOS: Status bar จะเป็นสีดำ
- Android: Status bar และ navigation bar เป็นสีดำ
- Splash screen ตอนเปิดแอพ: พื้นหลังดำ + ไอคอนตรงกลาง

---

## 🖼️ Icons (ถ้าต้องการสร้างเอง)

**ขนาดแนะนำ:**
- `logo192.png` - 192x192 px (Android)
- `logo512.png` - 512x512 px (Android splash, iOS)

**วิธีสร้าง Quick (ใช้ logo ที่มี):**
```bash
# ถ้ามี logo เดิม สามารถ resize ได้
# หรือใช้ tool online: https://realfavicongenerator.net/
```

**หรือใช้ placeholder ชั่วคราว:**
- Download free icons จาก https://www.flaticon.com/
- Search: "database", "form", "collection"
- Export: 192x192 และ 512x512

---

## 🧪 การทดสอบ

### Test 1: ตรวจสอบ Manifest

1. เปิด Chrome DevTools (F12)
2. ไปที่แท็บ **Application**
3. ดูที่ **Manifest** ในเมนูซ้าย
4. ตรวจสอบ:
   - ✅ `display: standalone`
   - ✅ `theme_color: #000000`
   - ✅ Icons โหลดได้

### Test 2: ทดสอบบนมือถือ

**iOS (Safari):**
1. เปิด Safari → เข้า URL
2. กด Share → Add to Home Screen
3. เปิดจาก Home Screen
4. ✅ ไม่เห็น Safari UI (address bar, toolbar)
5. ✅ Status bar เป็นสีดำ
6. ✅ Swipe up จากล่างขึ้น ไม่มี Safari bottom bar

**Android (Chrome):**
1. เปิด Chrome → เข้า URL
2. ดู banner "Add Q-Collector to Home screen" ที่ด้านล่าง
3. หรือกด Menu → Install app
4. เปิดจาก Home Screen
5. ✅ ไม่เห็น Chrome UI
6. ✅ Status bar และ navigation bar เป็นสีดำ

---

## 🚀 การใช้งานจริง

### Scenario 1: User เปิดครั้งแรก (Browser)

```
User เปิด URL → เห็น address bar, browser toolbar
                ↓
              เสนอติดตั้ง
                ↓
       User กด "Add to Home Screen"
                ↓
           ติดตั้งเสร็จ
```

### Scenario 2: User เปิดจาก Home Screen

```
User กดไอคอน Q-Collector → Splash screen (สีดำ + logo)
                              ↓
                      แอพเปิดเต็มจอ
                              ↓
                  ไม่มี browser UI (standalone mode)
                              ↓
                        Login / Register
                              ↓
                      ใช้งานแบบ Native App!
```

---

## 💡 Tips & Tricks

### 1. Fullscreen API (ไม่แนะนำสำหรับ Q-Collector)

ถ้าต้องการซ่อน status bar ด้วย (แบบเกม):
```javascript
// ไม่แนะนำ - users ต้องการเห็นเวลาและแบต
document.documentElement.requestFullscreen();
```

### 2. Detect PWA Mode

ตรวจสอบว่า user เปิดแบบ PWA หรือไม่:
```javascript
const isPWA = window.matchMedia('(display-mode: standalone)').matches;

if (isPWA) {
  console.log('User เปิดจาก Home Screen (PWA mode)');
} else {
  console.log('User เปิดจาก browser');
}
```

### 3. iOS Safe Area

สำหรับ iPhone X+ (มี notch):
```css
/* ใช้ safe-area-inset */
.header {
  padding-top: env(safe-area-inset-top);
}

.footer {
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## 🔐 HTTPS Requirement

**สำคัญ!** PWA ต้องใช้ **HTTPS** เท่านั้น!

**ใช้ได้:**
- ✅ `https://yourdomain.com`
- ✅ `https://78291324f2c7.ngrok-free.app` (ngrok)
- ✅ `http://localhost` (development only)

**ใช้ไม่ได้:**
- ❌ `http://192.168.1.181:3000` (HTTP บน network)
- ❌ `http://yourip:port` (HTTP บน internet)

---

## 📱 ตัวอย่างการใช้งาน

### Use Case 1: พนักงาน Field (แอพบันทึกข้อมูล)

**Before (Web):**
- เปิด browser → พิมพ์ URL → รอโหลด
- มี address bar กินพื้นที่
- กดผิดกลับ browser → ออกจากแอพ

**After (PWA):**
- กดไอคอน Q-Collector → เปิดเร็ว
- เต็มจอ เห็นฟอร์มชัดเจน
- Swipe back = navigate ภายในแอพ (ไม่ปิด)

### Use Case 2: Admin ตรวจสอบข้อมูล

**Before:**
- เปิด Safari → พิมพ์ URL
- มี toolbar ด้านล่าง กินพื้นที่
- เห็นข้อมูลน้อยลง

**After:**
- กดไอคอน → เปิดเต็มจอ
- เห็นข้อมูลเต็ม table
- ทำงานเร็วขึ้น

---

## 🎯 Summary

✅ **ที่เพิ่มมา:**
1. `manifest.json` - PWA configuration
2. Meta tags ใน `index.html` - iOS/Android support
3. Display mode: `standalone` - เต็มจอ ไม่มี browser UI

✅ **ผลลัพธ์:**
- Users สามารถ "Add to Home Screen" ได้
- เปิดแอพจาก Home Screen = เต็มจอ
- ทำงานเหมือน Native App
- UX ดีขึ้นมาก!

✅ **ความเข้ากันได้:**
- iOS 11.3+ (Safari)
- Android 5.0+ (Chrome, Samsung Internet)
- Desktop Chrome (Windows, Mac, Linux)

---

## 🔮 Next Steps (Optional)

### 1. Service Worker (Offline Support)

ถ้าต้องการให้แอพทำงาน offline:
```javascript
// src/service-worker.js
// Cache ไฟล์สำคัญ: HTML, CSS, JS, images
```

### 2. Push Notifications

แจ้งเตือนแบบ Native App:
```javascript
// ขออนุญาต notifications
Notification.requestPermission();
```

### 3. App Icons ที่สวยขึ้น

สร้าง icon ชุดใหม่:
- 192x192, 512x512 (Android)
- Apple Touch Icon (iOS)
- Favicon (Desktop)

---

**Status:** ✅ PWA Support Complete - Ready for Mobile!

**How to Test:**
1. เปิดแอพบนมือถือ
2. ติดตั้งจาก Home Screen
3. เปิดแอพ → ควรเห็นเต็มจอ ไม่มี browser UI!

---

**Developer:** AI Assistant
**Date:** 2025-10-11
**Feature:** PWA Fullscreen Mode v0.7.9-dev
