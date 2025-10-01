# คู่มือสร้าง Glassmorphism (iOS‑style) — วิเคราะห์ภาพและโค้ด CSS (.md)

เอกสารฉบับนี้สรุปการสังเกต วิเคราะห์สี รูปแบบวัสดุ (material) และวิธีสร้างด้วย CSS ให้ใกล้เคียงกับตัวอย่างภาพที่คุณส่งมา (หน้าจอ home‑pages ที่เป็นแผ่นใสแบบ frosted glass และ notification bubbles แบบใส)

> ภาพรวม: ผลลัพธ์ที่ต้องการคือ “แผ่นกระจกฝ้า (frosted glass)” ที่มีความโปร่งใส, เบลอพื้นหลัง, ขอบบาง, เงาลึกเล็กน้อย และไฮไลต์/เงาด้านบนเพื่อให้รู้สึกเป็นชิ้นวัสดุกระจก — เรียกว่า *glassmorphism* (แบบ iOS)

---

## สรุปการวิเคราะห์จากภาพ (สั้น)

1. **แผ่นหน้า (Panels / Pages)**

   * รูปทรง: สี่เหลี่ยมมุมโค้ง มาก (rounded rectangle) — radius ใหญ่ประมาณ 24–36px
   * พื้นผิว: ฟิลเตอร์เบลอ (เบลอพื้นหลัง), สีพื้นบาง ๆ (ขาว/ดำผสม alpha) + การ Saturate เล็กน้อย
   * ขอบ: border บาง ๆ สีขาวโปร่งแสง (หรือสีดำโปร่งแสง ขึ้นกับธีม) เพื่อให้เห็นขอบ
   * เงา: เงาดำด้านล่างลึกเล็กน้อย + inner subtle highlight ที่มุมบนซ้าย

2. **ฟองข้อความแจ้งเตือน (Notification bubbles)**

   * โครงสร้าง: avatar ทางซ้าย, ข้อความทางกลาง, เวลา (timestamp) ทางขวา
   * ฟิล์ม: กระจกฝ้าที่มีการเบลอ, ขอบโค้งกลมมาก, มี inner glow/bright streak ด้านบน
   * การเรียงซ้อน: บับเบิลซ้อนทับเล็กน้อย (vertical stacking with overlap)

3. **องค์ประกอบเล็ก ๆ**

   * ไอคอนแอป: มีเงาเล็กและ background ของไอคอนดูมีความเนียน (rounded icons)
   * ป้ายติ๊ก/วงกลมเช็ค: มีพื้นหลังกระจกกลมเล็ก ๆ พร้อมขอบและไฮไลต์

---

## หลักการและค่าพารามิเตอร์ที่ใช้บ่อย

* `backdrop-filter: blur(...)` — สำคัญที่สุด (ใช้กับ element ที่โปร่งแสงเพื่อเบลอ background)
* `background: linear-gradient(...)` — ทำให้แผ่นมองแล้วมีน้ำหนัก ไม่ใช่โปร่งแสงบริสุทธิ์
* `border: 1px solid rgba(...)` — ขอบบาง ๆ สีสว่างหรือมืดเพื่อบอกขอบ
* `box-shadow` : เงาด้านนอก + `inset` สำหรับ inner shadow / inner highlight
* `border-radius` : ค่าใหญ่ (24–36px) จะให้ความรู้สึกสมจริงแบบ iOS
* `mix-blend-mode` หรือ `mask` : ใช้ในกรณีต้องการไฮไลต์แบบนุ่ม

---

## CSS variables (ตัวอย่างแนะนำ — ปรับค่าได้ตามธีม)

```css
:root{
  --glass-blur: 16px;            /* strength ของ blur */
  --glass-saturate: 120%;       /* เพิ่มความอิ่มของสีพื้นหลัง */
  --glass-bg-top: rgba(255,255,255,0.06);
  --glass-bg-bottom: rgba(255,255,255,0.02);
  --glass-border: rgba(255,255,255,0.14);
  --glass-highlight: rgba(255,255,255,0.22);
  --glass-shadow: rgba(0,0,0,0.45);
  --panel-radius: 28px;
  --panel-padding: 14px;
}

/* สำหรับธีมมืด ใช้เฉดเข้มแทน */
:root.dark{
  --glass-bg-top: rgba(255,255,255,0.03);
  --glass-bg-bottom: rgba(255,255,255,0.01);
  --glass-border: rgba(255,255,255,0.10);
  --glass-shadow: rgba(0,0,0,0.6);
}
```

---

## โครงสร้าง HTML (ตัวอย่าง simplified)

```html
<!-- หน้า panel (home page card) -->
<div class="page-panel glass-card">
  <div class="app-grid">
    <!-- app tiles -->
    <div class="app-icon"> <img src="..."> </div>
    <!-- ...repeat -->
  </div>
  <div class="page-check">✓</div>
</div>

<!-- notification list -->
<div class="notification-stack">
  <div class="notification glass-notif">
    <div class="avatar"><img src="avatar.jpg"/></div>
    <div class="notif-body">
      <div class="title">Rung</div>
      <div class="text">พี่ต่อคะ รุ่งขอเป็นวันที่ 2 ต.ค. 09:00-11:00</div>
    </div>
    <div class="time">51m ago</div>
  </div>
  <!-- more notifications -->
</div>
```

---

## ตัวอย่าง CSS: Glass card (page/panel)

```css
.glass-card{
  position: relative;
  border-radius: var(--panel-radius);
  padding: var(--panel-padding);

  /* gradient overlay เพื่อให้ดูมีมิติ */
  background: linear-gradient(180deg, var(--glass-bg-top), var(--glass-bg-bottom));

  /* ขอบบางที่ทำให้เห็นขอบกระจก */
  border: 1px solid var(--glass-border);

  /* เบลอพื้นหลัง (ต้องการ browser ที่รองรับ) */
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));

  /* เงาด้านนอก + inner subtle highlight */
  box-shadow:
    0 20px 40px rgba(0,0,0,0.45),   /* กลุ่มเงาด้านล่าง */
    inset 0 1px 0 rgba(255,255,255,0.02); /* เส้นเงาด้านบนบางๆ */

  overflow: hidden; /* เพื่อให้ pseudo elements ไม่ล้น */
}

/* ไฮไลต์ขอบบนซ้ายรูปแบบเรียว */
.glass-card::before{
  content: "";
  position:absolute; inset:0; border-radius:inherit; pointer-events:none;
  background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0));
  mix-blend-mode: overlay; opacity:0.9;
  transform: translateY(-20%);
  /* ปรับ height ถ้าต้องการให้เป็นแถบด้านบน */
}

/* gloss / crescent highlight ด้านบนซ้าย (นุ่มๆ) */
.glass-card::after{
  content: "";
  position:absolute; left: -10%; top: -25%; width:120%; height:60%;
  border-radius:45%;
  background: radial-gradient(ellipse at top left, rgba(255,255,255,0.12), rgba(255,255,255,0));
  pointer-events:none;
}
```

> หมายเหตุ: ค่า `backdrop-filter` ต้องใส่ `-webkit-backdrop-filter` เพื่อให้รองรับ Safari/iOS

---

## ตัวอย่าง CSS: Grid ไอคอนภายใน panel

```css
.app-grid{
  display:grid;
  grid-template-columns: repeat(4, 1fr); /* ปรับเป็น 4 หรือ 5 ตาม layout */
  gap: 12px;
  align-items: center;
}

.app-icon{
  width: 64px; height: 64px; border-radius: 14px;
  display:flex; align-items:center; justify-content:center;
  font-size: 14px; color: #fff;
  background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
  box-shadow: 0 6px 18px rgba(0,0,0,0.25);
}
```
