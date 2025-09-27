# Q-Collector Form List Orange Background Investigation Plan

## 🎯 Problem Analysis
**Issue**: กล่องฟอร์มในหน้า Form List มีกล่องสี่เหลี่ยมสีส้มซ้อนอยู่ด้านหลัง ทำให้ไม่สวยงาม

## 📋 Investigation & Fix Plan

### Phase 1: Structure Analysis
- [ ] 1.1 วิเคราะห์โครงสร้าง HTML ของกล่องฟอร์มใน MainFormApp.jsx
- [ ] 1.2 ระบุ component layers และ CSS classes ที่ใช้
- [ ] 1.3 ตรวจสอบ GlassCard component structure

### Phase 2: CSS Investigation
- [ ] 2.1 ตรวจสอบ CSS classes ที่เกี่ยวข้องกับ orange background effects
  - [ ] form-card-glow
  - [ ] orange-neon effects
  - [ ] hover states
  - [ ] glass morphism effects
- [ ] 2.2 ตรวจสอบ index.css สำหรับ global styles
- [ ] 2.3 ระบุ CSS properties ที่ทำให้เกิดกล่องสี่เหลี่ยมส้ม

### Phase 3: Root Cause Analysis
- [ ] 3.1 ระบุ CSS properties ที่ทำให้เกิดกล่องสี่เหลี่ยมสีส้มด้านหลัง
- [ ] 3.2 ตรวจสอบ border-radius, overflow, และ box-shadow properties
- [ ] 3.3 วิเคราะห์ z-index และ stacking context

### Phase 4: Solution Implementation
- [ ] 4.1 แก้ไข CSS เพื่อลบกล่องสีส้มด้านหลัง
- [ ] 4.2 คงไว้เฉพาะ rounded corners ที่สวยงาม
- [ ] 4.3 ปรับปรุง orange neon effects ให้ทำงานถูกต้อง

### Phase 5: Testing & Validation
- [ ] 5.1 ทดสอบในหน้า Form List
- [ ] 5.2 ตรวจสอบ responsive behavior
- [ ] 5.3 ตรวจสอบปัญหาเดียวกันในหน้าอื่น ๆ

### Phase 6: System-wide Fix
- [ ] 6.1 ตรวจสอบและแก้ไขปัญหาเดียวกันในหน้าอื่น ๆ
- [ ] 6.2 ปรับปรุง CSS classes ให้มีความสอดคล้อง
- [ ] 6.3 สร้าง documentation สำหรับ glass morphism effects

## 🔧 Tools to Use
- **MCP Agents**: responsive-layout, theme-system, component-upgrade
- **Direct Analysis**: Read, Grep, Edit tools
- **CSS Investigation**: ค้นหา CSS classes และ properties
- **Testing**: Build และ visual inspection

## 🎨 Expected Outcome
- กล่องฟอร์มมี rounded corners ที่สวยงาม
- ไม่มีกล่องสี่เหลี่ยมสีส้มซ้อนด้านหลัง
- Orange neon effects ทำงานถูกต้องเฉพาะเมื่อ hover
- Glass morphism effects ที่สมบูรณ์และสวยงาม

## 📝 Progress Tracking
Use TodoWrite tool to track progress through each phase.