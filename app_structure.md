# React Form Builder - โครงสร้างแอปพลิเคชัน

## ภาพรวมโครงสร้าง

แอปพลิเคชันนี้เป็น React Form Builder MVP ที่ใช้ iOS 26 Liquid Glass Design System โดยมีจุดเด่นที่การสร้างฟอร์มแบบไดนามิกพร้อมระบบ sub-form และการจัดการ submission ครบถ้วน

## 📁 โครงสร้างไฟล์หลัก

### 🎯 **ไฟล์แอปหลัก (Core App Files)**
```
src/
├── App.js                           # ✅ Root component หลักที่ใช้งาน
├── index.js                         # ✅ Entry point ของแอป
├── components/
│   ├── MainFormApp.jsx              # ✅ **แอปหลักที่ใช้งานจริง** (Production)
│   ├── FormListApp.jsx              # 🧪 Standalone form list (Demo/Testing)
│   ├── EnhancedFormBuilder.jsx      # ✅ **Form builder หลัก** (Production)
│   └── SettingsPage.jsx             # ✅ **หน้าตั้งค่า** (Production)
```

### 🏗️ **Navigation & Page Structure**

#### **MainFormApp.jsx** - แอปหลัก (Production Ready)
**หน้าที่:** ควบคุมการนำทางและสถานะหลักทั้งหมด

**Pages ที่มี:**
1. **`form-list`** - รายการฟอร์มทั้งหมด (หน้าหลัก)
2. **`form-builder`** - สร้าง/แก้ไขฟอร์ม
3. **`settings`** - ตั้งค่าแอป
4. **`submission-list`** - รายการ submission (พื้นฐาน)
5. **`detail-view`** - รายละเอียดฟอร์ม (กำหนดไว้แต่ยังไม่ implement)

**การนำทาง:**
```javascript
// Navigation functions
handleNavigate(page, formId, editing)
handleViewSubmissions(formId)    // ไปหน้า submission-list
handleEditForm(formId)           // ไปหน้า form-builder (edit mode)
handleNewForm()                  // ไปหน้า form-builder (create mode)
```

**Navigation Menu:**
- Back button (เมื่ออยู่นอกหน้า form-list)
- Settings button (ไปหน้า settings)
- Home button (กลับหน้า form-list)
- Create Form button (เมื่ออยู่ที่หน้า form-list)

### 📋 **หน้า Form List - รายการฟอร์ม**
**Location:** `renderFormList()` ใน MainFormApp.jsx

**Features:**
- แสดงฟอร์มเป็น **กล่องฟอร์ม** (ไม่ใช่ตาราง) ✅
- แต่ละกล่องมี: ชื่อฟอร์ม, คำบรรยาย, category badge, action icons
- **Action Buttons:**
  - **ดู** (👁️) → ไปหน้า submission-list
  - **แก้ไข** (✏️) → ไปหน้า form-builder
  - **ทำสำเนา** (📋) → duplicate form
  - **ลบ** (🗑️) → delete form

**Grid Layout:** Responsive grid (1-4 columns ตาม screen size)

### 🏗️ **หน้า Form Builder - สร้าง/แก้ไขฟอร์ม**
**Location:** EnhancedFormBuilder.jsx

**Sections:**
1. **ฟอร์มหลัก** - จัดการ fields หลัก
2. **ฟอร์มย่อย** - จัดการ sub-forms
3. **ตั้งค่า** - Telegram notifications, document numbering, role access

**Field Types (17 ประเภท):**
- Basic: short_answer, paragraph, email, phone, number, url
- Files: file_upload, image_upload
- Date/Time: date, time, datetime
- Interactive: multiple_choice, rating, slider
- Location: lat_long, province (77 จังหวัดไทย)
- Business: factory (4 โรงงาน)

### ⚙️ **หน้า Settings - ตั้งค่า**
**Location:** SettingsPage.jsx

**Sections:**
- **ฟอนต์** - เลือกฟอนต์และขนาด
- **ธีม** - เปลี่ยนธีมสี (dark/light)
- **ทั่วไป** - ภาษา, การแจ้งเตือน, info แอป

## 🚧 **สิ่งที่ยังต้องพัฒนา (Missing Implementation)**

### 1. **หน้า Submission List**
**Current Status:** มีเพียง placeholder ใน `renderSubmissionList()`

**ต้องการ:**
- ตารางแสดงข้อมูล submission ของฟอร์มหลัก
- แสดงเฉพาะ fields ที่เลือก "แสดงในตาราง" (สูงสุด 5 fields)
- Click แต่ละแถว → ไปหน้า Detail View

### 2. **หน้า Detail View ของฟอร์มหลัก**
**Current Status:** กำหนด route ไว้แล้วแต่ยังไม่ implement

**ต้องการ:**
- แสดงรายละเอียดข้อมูล submission ของฟอร์มหลัก
- **ปุ่มเพิ่ม sub-form** (ชื่อเปลี่ยนตาม sub-form title)
- **ตาราง Subform submission list** (10 แถวล่าสุด)
- Click แถว sub-form → ไปหน้า Detail View ของ Sub-form

### 3. **หน้า Form View ของ Sub-form**
**Current Status:** ยังไม่มี

**ต้องการ:**
- ฟอร์มสำหรับกรอกข้อมูล sub-form
- หลังบันทึกแล้ว กลับไปหน้า Detail View ของฟอร์มหลัก

### 4. **หน้า Detail View ของ Sub-form**
**Current Status:** ยังไม่มี

**ต้องการ:**
- แสดงรายละเอียดข้อมูล submission ของ sub-form
- ปุ่มแก้ไข/ลบ submission

## 🎨 **Component Library ที่ใช้**

### **Glass UI Components** (Production Ready)
```
src/components/ui/
├── glass-card.jsx               # ✅ Glass morphism cards
├── glass-button.jsx             # ✅ Interactive glass buttons
├── glass-input.jsx              # ✅ Form inputs with glass effects
├── glass-nav.jsx                # ✅ Navigation with glass design
├── glass-tooltip.jsx            # ✅ Tooltips with glass effects
├── glass-loading.jsx            # ✅ Loading states
├── page-transition.jsx          # ✅ Page transition system
├── gesture-handler.jsx          # ✅ Touch gesture support
├── field-preview-row.jsx        # ✅ Field preview component
├── field-options-menu.jsx       # ✅ Field options dropdown
└── multi-choice-buttons.jsx     # ✅ Multiple choice UI
```

### **Demo/Testing Components**
```
├── GlassDemo.jsx                # 🧪 Glass UI showcase
├── FieldPreviewDemo.jsx         # 🧪 Field preview testing
├── TestFormList.jsx             # 🧪 Form list testing
└── *Demo.jsx files              # 🧪 Various UI tests
```

## 🔄 **User Flow ที่ควรมี**

### **การใช้งานปัจจุบัน:**
1. **Form List** → View button → **Submission List** (placeholder)
2. **Form List** → Edit button → **Form Builder**
3. **Form Builder** → Save → กลับ **Form List**

### **การใช้งานที่ควรจะเป็น (ตาม CLAUDE.md):**
1. **Form List** → View → **Submission List**
2. **Submission List** → Click row → **Detail View** (main form)
3. **Detail View** → "เพิ่ม[ชื่อ sub-form]" → **Sub-form View**
4. **Detail View** → Click sub-form row → **Sub-form Detail View**

## 🚀 **การ Deploy & Entry Point**

**Main Entry Point:** `src/App.js` → `MainFormApp.jsx`

**Dependencies:**
- React 18.3.1
- Framer Motion (animations)
- FontAwesome (icons)
- Radix UI (base components)
- TailwindCSS (styling)
- DND Kit (drag & drop)

**Build Command:** `npm run build`
**Dev Command:** `npm run dev`

## 📊 **สรุปสถานะไฟล์**

| ไฟล์ | สถานะ | หน้าที่ |
|------|--------|---------|
| **MainFormApp.jsx** | ✅ Production | แอปหลัก + navigation |
| **EnhancedFormBuilder.jsx** | ✅ Production | สร้าง/แก้ไขฟอร์ม |
| **SettingsPage.jsx** | ✅ Production | หน้าตั้งค่า |
| **FormListApp.jsx** | 🧪 Demo | Standalone form list |
| **Submission List** | 🚧 Missing | รายการ submission |
| **Detail Views** | 🚧 Missing | รายละเอียด + sub-form management |

**สรุป:** แอปมีโครงสร้างพื้นฐานครบถ้วน แต่ยังขาดหน้า submission management และ detail views ที่สำคัญสำหรับการใช้งานจริง