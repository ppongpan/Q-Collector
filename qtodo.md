# 📋 Q-Collector Form Builder Enhancement TODO

## 🎯 **เป้าหมายการปรับปรุง**
ปรับปรุงหน้า Form Builder ให้มีความสวยงามและใช้งานง่ายขึ้น โดยนำ design system จากหน้า Form List มาปรับใช้

## 🔧 **การปรับปรุงที่ต้องทำ**

### ✨ **1. ปรับปรุง Header และ Title**
- [ ] เปลี่ยนข้อความจาก "แก้ไขฟอร์ม" เป็น "สร้างและกำหนดค่าฟอร์มด้วยระบบ iOS 26 liquid glass design"
- [ ] ใช้ typography scale เดียวกับหน้า Form List (`form-card-title`, `form-card-description`)
- [ ] ปรับขนาดและสัดส่วน font ให้สอดคล้องกัน

### 🎨 **2. ปรับปรุง Action Buttons Layout**
- [ ] **ลบปุ่ม "ยกเลิก"** ออกจาก footer
- [ ] **ย้ายปุ่ม "บันทึก" และ "ลบ"** ไปอยู่แถวเดียวกับ Tab Navigation
- [ ] จัดวางปุ่มใหม่: `[ฟอร์มหลัก] [ฟอร์มย่อย] [ตั้งค่า] --- [บันทึก] [ลบ]`
- [ ] ใช้ glass button styles เดียวกับหน้า Form List

### 📑 **3. เปลี่ยน Navigation เป็น Tab Style**
- [ ] ปรับปุ่ม "ฟอร์มหลัก", "ฟอร์มย่อย", "ตั้งค่า" ให้เป็นรูปแบบ Tab Pages
- [ ] เพิ่ม active states ที่ชัดเจน (เหมือน tab ที่เลือกอยู่)
- [ ] ใช้ border-bottom หรือ background highlight สำหรับ active tab
- [ ] ปรับ spacing และ visual hierarchy

### 🎨 **4. นำ Design System จาก Form List มาใช้**
- [ ] **Theme Colors**: ใช้สีเดียวกับ form cards (black-orange palette)
- [ ] **Typography**: ใช้ font classes เดียวกัน (`form-card-title`, `form-card-description`, `form-card-stats`)
- [ ] **Effects**: นำ orange neon glow effects มาใช้กับ interactive elements
- [ ] **Glass Morphism**: ใช้ glass styles เดียวกันในทุก components
- [ ] **Spacing**: ใช้ spacing system เดียวกัน (8px grid)

### 🔧 **5. รักษาโครงสร้างการทำงานเดิม**
- [ ] ✅ **ไม่เปลี่ยน logic** ของ form builder
- [ ] ✅ **ไม่เปลี่ยน state management**
- [ ] ✅ **ไม่เปลี่ยน data structure**
- [ ] ✅ **รักษา drag & drop functionality**
- [ ] ✅ **รักษา field types และ validation**

## 🚀 **Sub-Agents ที่เหมาะสม**

### 1. **component-upgrade**
**หน้าที่**: อัพเกรด form builder components ให้ใช้ design system เดียวกับ form list
**งาน**:
- ปรับ typography และ styling
- อัพเกรด button components
- ใช้ glass morphism styles

### 2. **navigation-system**
**หน้าที่**: ปรับปรุง navigation และ layout ของ header/footer
**งาน**:
- เปลี่ยน tab navigation system
- จัดเรียง action buttons ใหม่
- ลบ cancel button

### 3. **responsive-layout**
**หน้าที่**: ปรับ layout และ spacing ให้สวยงาม
**งาน**:
- จัด responsive layout ใหม่
- ปรับ spacing และ proportions
- ใช้ 8px grid system

## 📋 **Execution Plan**

### Phase 1: Component Upgrade (component-upgrade agent)
1. อัพเกรด typography และ color scheme
2. ปรับ glass button styles
3. นำ form-card design system มาใช้

### Phase 2: Navigation System (navigation-system agent)
1. เปลี่ยน tab navigation style
2. ย้าย action buttons
3. ลบ cancel button

### Phase 3: Layout Optimization (responsive-layout agent)
1. จัด spacing และ proportions
2. ปรับ responsive behavior
3. ใช้ 8px grid system

## ✅ **Expected Results**
- หน้า Form Builder ที่สวยงามและสอดคล้องกับ Form List
- Tab navigation ที่ใช้งานง่าย
- Action buttons ที่จัดวางอย่างเหมาะสม
- รักษาการทำงานเดิมทั้งหมด
- ใช้ design system เดียวกันทั้งแอป

---
**📅 Created**: 2024-01-27
**👨‍💼 Requested by**: CTO
**🎯 Priority**: High - UI/UX Enhancement