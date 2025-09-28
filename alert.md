แนวทาง UI/UX สำหรับ “Alert / Notification Box” ที่ดูทันสมัยและเหมาะกับการใช้งานบนเว็บหรือแอป (ทั้ง Mobile & Desktop)

1. แนวทางดีไซน์หลัก
   ประเด็น คำแนะนำ
   โทนสี ใช้ Semantic Color เพื่อสื่อความหมายชัดเจน เช่น
   🟢 Success = เขียว (#22c55e)
   🔵 Info = น้ำเงิน (#3b82f6)
   🟠 Warning = ส้ม (#f59e0b)
   🔴 Error = แดง (#ef4444)
   Shape กล่อง rounded-xl (โค้งมน) หรือ pill-shaped เพื่อความโมเดิร์น
   Iconography ใส่ icon จากชุดอย่าง Lucide / Heroicons (เช่น CheckCircle, AlertTriangle, XCircle)
   Typography ตัวอักษรชัด น้ำหนัก Medium–Semibold, ขนาด 14–16px
   Spacing Padding รอบกล่อง 12–16px, icon กับข้อความมี gap 8–12px
   Motion ใช้ fade/slide-in 200–300ms, auto-dismiss (toast) 3–5 วินาทีสำหรับข้อความสั้น
   Accessibility Contrast ratio ≥ 4.5:1, มี ARIA role (alert / status)
2. Pattern ยอดนิยม
   ✅ Inline Validation

แสดงใต้ฟิลด์ที่ผิดพลาด (field-level error)

ตัวอักษรเล็ก สีแดง/ส้ม

ผู้ใช้ไม่ต้องละสายตาไปมองกล่องอื่น

✅ Toast / Snackbar

กล่องเล็กมุมขวาบน (desktop) หรือด้านล่าง (mobile)

ลอยทับเนื้อหา ไม่บังการทำงาน

Auto-dismiss + ปุ่ม Close

✅ Modal Alert

ใช้เมื่อ ต้องการการตัดสินใจ เช่น “ยืนยันลบข้อมูล”

ปุ่ม CTA ชัดเจน (เช่น Delete = สีแดง, Cancel = สีเทา)

✅ Banner / Top Notification

แถบเต็มความกว้างด้านบน

เหมาะกับข้อความระบบหรือแจ้งเตือนสำคัญ

3. ตัวอย่างโค้ด (Tailwind + React)
   export default function ErrorToast() {
   return (
   <div
         role="alert"
         className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-4 shadow-md animate-slide-in"
       >
   <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
             d="M12 8v4m0 4h.01M4.93 4.93l14.14 14.14" />
   </svg>
   <span className="text-sm text-red-700">
   กรุณากรอกข้อมูลให้ครบถ้วน
   </span>
   <button className="ml-auto text-red-500 hover:text-red-700">
   ✕
   </button>
   </div>
   );
   }

4. Tips เพิ่มเติม

ใช้ระบบ Design Token: กำหนดสี ขนาด Shadow ให้สอดคล้องกับธีม Light/Dark

Animation: ใช้ Framer Motion หรือ CSS transition ช่วยให้ดู Smooth

State Handling: ผูกกับระบบ global state หรือ toast manager เช่น React Hot Toast, Radix UI Toast
