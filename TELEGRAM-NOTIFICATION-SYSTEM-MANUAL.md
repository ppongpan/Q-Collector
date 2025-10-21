# Telegram Notification System - User Manual
**Q-Collector v0.8.0**

---

## 📚 Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Formula Syntax Guide](#formula-syntax-guide)
4. [Message Template Syntax](#message-template-syntax)
5. [Real-World Use Cases](#real-world-use-cases)
6. [Configuration Examples](#configuration-examples)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

---

## 📖 Introduction

### What is the Telegram Notification System?

The Telegram Notification System is an advanced automation feature in Q-Collector that allows you to:

- **Send automatic notifications** when form data changes
- **Schedule recurring checks** for overdue tasks, follow-ups, or maintenance alerts
- **Customize message templates** with dynamic field values
- **Use powerful formulas** to define complex business rules
- **Track notification history** for audit and monitoring

### Key Features

✅ **Trigger-Based Notifications** - Real-time alerts when specific field values change
✅ **Scheduled Notifications** - Daily/weekly checks using cron expressions
✅ **Formula-Based Conditions** - Google AppSheet-compatible formula engine
✅ **Per-Rule Configuration** - Separate Telegram bot + group for each rule
✅ **Duplicate Prevention** - Send once per submission (configurable)
✅ **History Tracking** - Full audit trail of all notifications sent

---

## 🚀 Getting Started

### Prerequisites

Before creating notification rules, you need:

1. **Telegram Bot Token**
   - Create a bot via [@BotFather](https://t.me/BotFather)
   - Copy the bot token (format: `1234567890:ABCdef...`)

2. **Telegram Group ID**
   - Create a Telegram group
   - Add your bot to the group
   - Get the group ID (usually negative: `-1001234567890`)
   - **How to get Group ID:**
     - Add [@RawDataBot](https://t.me/RawDataBot) to your group
     - Bot will show the group ID

3. **Admin Access**
   - Only users with `admin` or `super_admin` role can create notification rules

### Creating Your First Notification Rule

1. Navigate to **Settings → Notifications** in Q-Collector
2. Click **"+ New Rule"** button
3. Fill in the basic information:
   - **Rule Name:** e.g., "ปิดการขาย - แจ้งเตือน"
   - **Description:** Brief explanation
   - **Priority:** High / Medium / Low
   - **Enabled:** Toggle to activate

4. Configure the trigger:
   - **Trigger Type:** Field Update or Scheduled
   - **Form:** Select the target form
   - **Sub-Form:** (Optional) Select if targeting sub-form data

5. Write the condition formula:
   - Example: `[สถานะ] = "ปิดการขายได้"`
   - Click **"Validate"** to check syntax

6. Create message template:
   - Use placeholders like `{ชื่อลูกค้า}`, `{ยอดขาย}`
   - Preview will show sample output

7. Add Telegram configuration:
   - **Bot Token:** Your bot token from BotFather
   - **Group ID:** Your Telegram group ID
   - Click **"Test Send"** to verify

8. Click **"Save Rule"** to activate

---

## 🔧 Formula Syntax Guide

### Basic Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equals | `[สถานะ] = "ปิดการขาย"` |
| `<>` | Not equals | `[สถานะ] <> "ยกเลิก"` |
| `>` | Greater than | `[ยอดขาย] > 100000` |
| `<` | Less than | `[คะแนน] < 3` |
| `>=` | Greater or equal | `[อายุ] >= 18` |
| `<=` | Less or equal | `[ราคา] <= 5000` |

### Logical Functions

#### AND(condition1, condition2, ...)
**Returns:** TRUE if ALL conditions are TRUE

```javascript
// Alert when high-value sale is closed
AND([สถานะ] = "ปิดการขายได้", [ยอดขาย] > 100000)
```

#### OR(condition1, condition2, ...)
**Returns:** TRUE if ANY condition is TRUE

```javascript
// Alert when sale is either won or lost
OR([สถานะ] = "ปิดการขายได้", [สถานะ] = "ปิดการขายไม่ได้")
```

#### NOT(condition)
**Returns:** Opposite of condition

```javascript
// Alert when status is NOT cancelled
NOT([สถานะ] = "ยกเลิก")
```

#### IF(condition, value_if_true, value_if_false)
**Returns:** value_if_true or value_if_false based on condition

```javascript
// Set priority based on amount
IF([ยอดขาย] > 100000, "สูง", "ปกติ")
```

### String Functions

#### CONTAINS(text, search_text)
**Returns:** TRUE if text contains search_text (case-insensitive)

```javascript
// Alert when customer name contains "VIP"
CONTAINS([ชื่อลูกค้า], "VIP")
```

#### UPPER(text)
**Returns:** Text in uppercase

```javascript
UPPER([ชื่อ]) = "JOHN"
```

#### LOWER(text)
**Returns:** Text in lowercase

```javascript
LOWER([อีเมล]) = "test@example.com"
```

#### TRIM(text)
**Returns:** Text with leading/trailing spaces removed

```javascript
TRIM([ชื่อ]) = "John"
```

#### LEN(text)
**Returns:** Length of text

```javascript
LEN([เบอร์โทร]) = 10
```

### Data Functions

#### ISBLANK(value)
**Returns:** TRUE if value is empty or null

```javascript
// Alert when remarks field is empty
ISBLANK([หมายเหตุ])
```

#### ISNOTBLANK(value)
**Returns:** TRUE if value is not empty

```javascript
// Alert when remarks field is filled
ISNOTBLANK([หมายเหตุ])
```

### Date Functions (For Scheduled Rules)

#### TODAY()
**Returns:** Current date (midnight)

```javascript
// Check if follow-up date is in the past
[วันที่ติดตามงาน] < TODAY()
```

#### Date Arithmetic
**Syntax:** `[DateField] + days` or `[DateField] - days`

```javascript
// Check if overdue by 7+ days
[วันที่ติดตามงาน] + 7 < TODAY()

// Check if date is within next 3 days
[วันครบกำหนด] < TODAY() + 3
```

### Arithmetic Operations

| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Addition | `[ราคา] + [ภาษี]` |
| `-` | Subtraction | `[ราคาขาย] - [ต้นทุน]` |
| `*` | Multiplication | `[ราคา] * [จำนวน]` |
| `/` | Division | `[ยอดขาย] / [จำนวนพนักงาน]` |

```javascript
// Alert when profit margin is high
([ราคาขาย] - [ต้นทุน]) / [ต้นทุน] > 0.5
```

### Complex Formula Examples

#### Example 1: Multiple Conditions with Nested Logic
```javascript
// Alert for high-value VIP customers with incomplete data
AND(
  CONTAINS([ชื่อลูกค้า], "VIP"),
  [ยอดขาย] > 100000,
  OR(
    ISBLANK([อีเมล]),
    ISBLANK([เบอร์โทร])
  )
)
```

#### Example 2: Range Validation
```javascript
// Alert when score is in acceptable range
AND([คะแนน] >= 4, [คะแนน] <= 5)
```

#### Example 3: Business Rule with Multiple Statuses
```javascript
// Alert when maintenance is needed
AND(
  OR(
    [สถานะเครื่องจักร] = "วิกฤต",
    [สถานะเครื่องจักร] = "ต้องตรวจสอบ",
    [สถานะเครื่องจักร] = "ต้องบำรุงรักษา"
  ),
  [วันที่บำรุงล่าสุด] + 30 < TODAY()
)
```

#### Example 4: Conditional Priority
```javascript
// Different rules based on amount
IF(
  [ยอดขาย] > 500000,
  "เร่งด่วนมาก",
  IF([ยอดขาย] > 100000, "เร่งด่วน", "ปกติ")
)
```

---

## 📝 Message Template Syntax

### Field Placeholders

Use curly braces `{}` to insert field values:

```
{fieldName} → Replaced with field value
{ชื่อลูกค้า} → "บริษัท ABC จำกัด"
{ยอดขาย} → "150000"
```

### System Placeholders

| Placeholder | Description | Example Output |
|-------------|-------------|----------------|
| `{submissionNumber}` | Submission number | "SUB-2025-001" |
| `{submittedBy}` | User who submitted | "สมชาย ใจดี" |
| `{submittedAt}` | Submission date/time | "2025-10-20 09:30" |
| `{formTitle}` | Form name | "ฟอร์มข้อมูลลูกค้า" |

### Date Formatting

```
{fieldName|format} → Formatted date

Formats:
- DD/MM/YYYY → "20/10/2025"
- DD MMM YYYY → "20 ต.ค. 2568"
- YYYY-MM-DD → "2025-10-20"
```

**Example:**
```
วันที่: {วันที่ปิดการขาย|DD/MM/YYYY}
```

### Number Formatting

```
{fieldName|number} → Formatted number with commas
{fieldName|currency} → Formatted as Thai Baht

Examples:
{ยอดขาย|number} → "150,000"
{ยอดขาย|currency} → "150,000 บาท"
```

### Conditional Display (Advanced)

```
{?condition:value_if_true:value_if_false}

Example:
{?[สถานะ]=ปิดการขายได้:🎉:❌} → Shows emoji based on status
```

### Template Examples

#### Simple Template
```
ข้อมูลใหม่: {ชื่อลูกค้า}
สถานะ: {สถานะ}
ยอดขาย: {ยอดขาย|currency}
```

#### Rich Template with Markdown
```
🎉 **ปิดการขายสำเร็จ!**

👤 ลูกค้า: {ชื่อลูกค้า}
💰 ยอดขาย: {ยอดขาย|currency}
📅 วันที่: {วันที่ปิดการขาย|DD/MM/YYYY}
👨‍💼 พนักงานขาย: {ชื่อพนักงาน}

📝 หมายเหตุ: {หมายเหตุ}
```

#### Alert Template
```
⚠️ **แจ้งเตือนงานค้าง**

🏢 ลูกค้า: {ชื่อลูกค้า}
📅 นัดล่าสุด: {วันที่ติดตามงาน|DD/MM/YYYY}
⏰ เกินกำหนด: {daysOverdue} วัน

👉 กรุณาติดตามงานโดยด่วน!
```

#### Summary Template (Scheduled)
```
📊 **สรุปงานประจำวัน**

วันที่: {TODAY|DD/MM/YYYY}

พบงานค้างทั้งหมด {totalCount} รายการ

กรุณาดำเนินการตรวจสอบ
```

---

## 🎯 Real-World Use Cases

### Use Case 1: Sales Won Notification
**Scenario:** Alert sales team when a deal is closed

**Trigger Type:** Field Update
**Condition:**
```javascript
[สถานะ] = "ปิดการขายได้"
```

**Message Template:**
```
🎉 **ปิดการขายสำเร็จ!**

👤 ลูกค้า: {ชื่อลูกค้า}
💰 ยอดขาย: {ยอดขาย|currency}
📅 วันที่: {วันที่ปิดการขาย|DD/MM/YYYY}
👨‍💼 พนักงานขาย: {ชื่อพนักงาน}

🎊 ยินดีด้วย!
```

**Benefits:**
- ✅ Immediate notification (within seconds)
- ✅ Team morale boost
- ✅ Track sales performance in real-time

---

### Use Case 2: High-Value Customer Alert
**Scenario:** Alert when VIP customer places high-value order

**Trigger Type:** Field Update
**Condition:**
```javascript
AND(
  CONTAINS([ชื่อลูกค้า], "VIP"),
  [ยอดขาย] > 100000
)
```

**Message Template:**
```
👑 **ลูกค้า VIP - มูลค่าสูง**

🏢 ชื่อลูกค้า: {ชื่อลูกค้า}
💎 ยอดสั่งซื้อ: {ยอดขาย|currency}
📞 เบอร์โทร: {เบอร์โทร}

⚡ ต้องการความสนใจเป็นพิเศษ
```

**Benefits:**
- ✅ Prioritize high-value customers
- ✅ Faster response time
- ✅ Better customer service

---

### Use Case 3: Overdue Follow-Up Alert
**Scenario:** Daily check for follow-ups overdue by 7+ days

**Trigger Type:** Scheduled
**Schedule:** `0 9 * * *` (Daily at 9:00 AM)
**Condition:**
```javascript
AND(
  [วันที่ติดตามงาน] + 7 < TODAY(),
  NOT(OR(
    [สถานะ] = "ปิดการขายแล้ว",
    [สถานะ] = "ปิดการขายไม่ได้"
  ))
)
```

**Message Template:**
```
⚠️ **แจ้งเตือนงานค้าง**

🏢 ลูกค้า: {ชื่อลูกค้า}
📅 นัดล่าสุด: {วันที่ติดตามงาน|DD/MM/YYYY}
⏰ เกินกำหนด: 7+ วัน
📊 สถานะ: {สถานะ}

👉 กรุณาติดตามงานโดยเร็ว!
```

**Benefits:**
- ✅ Never miss follow-ups
- ✅ Reduce churn rate
- ✅ Automated daily reminders

---

### Use Case 4: Customer Satisfaction Alert
**Scenario:** Alert when customer gives high rating (4-5 stars)

**Trigger Type:** Field Update
**Condition:**
```javascript
AND([คะแนน] >= 4, [คะแนน] <= 5)
```

**Message Template:**
```
⭐ **ลูกค้าพึงพอใจสูง**

👤 ลูกค้า: {ชื่อลูกค้า}
⭐ คะแนน: {คะแนน}/5
💬 ความคิดเห็น: {ความคิดเห็น}
👨‍💼 รับผิดชอบโดย: {ชื่อพนักงาน}

👏 เก่งมาก! ขอบคุณที่ให้บริการดี
```

**Benefits:**
- ✅ Recognize good performance
- ✅ Share success stories
- ✅ Motivate team

---

### Use Case 5: Low Rating Alert
**Scenario:** Alert when customer gives low rating (1-2 stars)

**Trigger Type:** Field Update
**Condition:**
```javascript
AND([คะแนน] >= 1, [คะแนน] <= 2)
```

**Message Template:**
```
🚨 **แจ้งเตือนคะแนนต่ำ**

👤 ลูกค้า: {ชื่อลูกค้า}
⭐ คะแนน: {คะแนน}/5
💬 ความคิดเห็น: {ความคิดเห็น}
📞 เบอร์โทร: {เบอร์โทร}

⚠️ ต้องติดตามและแก้ไขปัญหาด่วน!
```

**Benefits:**
- ✅ Quick recovery from bad experience
- ✅ Prevent negative reviews
- ✅ Show customers you care

---

### Use Case 6: Incomplete Data Alert
**Scenario:** Alert when customer data is incomplete

**Trigger Type:** Field Update
**Condition:**
```javascript
OR(
  ISBLANK([ชื่อลูกค้า]),
  ISBLANK([เบอร์โทร]),
  ISBLANK([อีเมล])
)
```

**Message Template:**
```
⚠️ **ข้อมูลไม่ครบถ้วน**

👤 ลูกค้า: {ชื่อลูกค้า}
📝 เลขที่ใบงาน: {submissionNumber}

ข้อมูลที่ขาด:
{?ISBLANK([เบอร์โทร]):- เบอร์โทร:}
{?ISBLANK([อีเมล]):- อีเมล:}

👉 กรุณาเพิ่มข้อมูลให้ครบ
```

**Benefits:**
- ✅ Data quality improvement
- ✅ Reduce data entry errors
- ✅ Complete customer profiles

---

### Use Case 7: Maintenance Overdue Alert
**Scenario:** Weekly check for machines needing maintenance

**Trigger Type:** Scheduled
**Schedule:** `0 8 * * 1` (Every Monday at 8:00 AM)
**Condition:**
```javascript
AND(
  [วันที่บำรุงรักษาล่าสุด] + 30 < TODAY(),
  OR(
    [สถานะเครื่องจักร] = "วิกฤต",
    [สถานะเครื่องจักร] = "ต้องตรวจสอบ"
  )
)
```

**Message Template:**
```
🔧 **แจ้งเตือนบำรุงรักษา**

🏭 เครื่องจักร: {ชื่อเครื่องจักร}
📅 บำรุงล่าสุด: {วันที่บำรุงรักษาล่าสุด|DD/MM/YYYY}
🚨 สถานะ: {สถานะเครื่องจักร}
⏰ เกินกำหนด: 30+ วัน

⚠️ ต้องดำเนินการบำรุงรักษาทันที!
```

**Benefits:**
- ✅ Prevent machine breakdown
- ✅ Reduce downtime
- ✅ Extend equipment lifespan

---

### Use Case 8: Sub-Form Completion Alert
**Scenario:** Alert when latest sub-form (repair work) is completed

**Trigger Type:** Field Update
**Form:** Main Form
**Sub-Form:** งานซ่อม
**Condition:**
```javascript
[สถานะซ่อม] = "เสร็จสิ้น"
```

**Message Template:**
```
✅ **งานซ่อมเสร็จสิ้น**

🔧 เลขที่ใบงาน: {เลขที่ใบงาน}
📝 รายละเอียด: {รายละเอียดงาน}
👨‍🔧 ช่างผู้รับผิดชอบ: {ชื่อช่าง}
📅 วันที่เสร็จ: {วันที่เสร็จ|DD/MM/YYYY}

🎉 ดำเนินการเรียบร้อยแล้ว
```

**Benefits:**
- ✅ Track work completion
- ✅ Notify relevant departments
- ✅ Update customer timely

---

### Use Case 9: Stock Low Alert
**Scenario:** Daily check for products with low stock

**Trigger Type:** Scheduled
**Schedule:** `0 17 * * *` (Daily at 5:00 PM)
**Condition:**
```javascript
AND(
  [จำนวนคงเหลือ] < [จำนวนต่ำสุด],
  [สถานะสินค้า] = "ใช้งาน"
)
```

**Message Template:**
```
📦 **แจ้งเตือนสต็อกต่ำ**

📦 สินค้า: {ชื่อสินค้า}
🔢 คงเหลือ: {จำนวนคงเหลือ} {หน่วย}
⚠️ ระดับต่ำสุด: {จำนวนต่ำสุด} {หน่วย}
💰 ราคาต่อหน่วย: {ราคา|currency}

👉 กรุณาสั่งซื้อเพิ่ม!
```

**Benefits:**
- ✅ Prevent stock-out
- ✅ Maintain optimal inventory
- ✅ Automated reorder alerts

---

### Use Case 10: Payment Due Reminder
**Scenario:** Daily check for invoices due within 3 days

**Trigger Type:** Scheduled
**Schedule:** `0 10 * * *` (Daily at 10:00 AM)
**Condition:**
```javascript
AND(
  [วันครบกำหนดชำระ] < TODAY() + 3,
  [สถานะการชำระ] = "ยังไม่ชำระ"
)
```

**Message Template:**
```
💰 **แจ้งเตือนชำระเงิน**

🏢 ลูกค้า: {ชื่อลูกค้า}
📄 เลขที่ใบแจ้งหนี้: {เลขที่ใบแจ้งหนี้}
💵 ยอดเงิน: {ยอดเงิน|currency}
📅 ครบกำหนด: {วันครบกำหนดชำระ|DD/MM/YYYY}

⏰ เหลือเวลาอีก 3 วัน - กรุณาชำระ
```

**Benefits:**
- ✅ Reduce late payments
- ✅ Improve cash flow
- ✅ Automated reminders

---

## ⚙️ Configuration Examples

### Configuration 1: Field Update Trigger (Simple)

```javascript
{
  name: "ปิดการขาย - แจ้งเตือน",
  description: "แจ้งเตือนเมื่อปิดการขายได้",
  enabled: true,
  priority: "high",
  triggerType: "field_update",

  // Targeting
  formId: "form_uuid_sales",
  subFormId: null, // Main form
  fieldId: "field_uuid_status", // สถานะ field

  // Condition
  condition: "[สถานะ] = \"ปิดการขายได้\"",
  sendOnce: true,

  // Message
  messageTemplate: "🎉 ปิดการขาย: {ชื่อลูกค้า} - ยอด {ยอดขาย} บาท",

  // Telegram
  botToken: "1234567890:ABCdef...",
  groupId: "-1001234567890",

  // Scheduling (N/A for field_update)
  schedule: null
}
```

---

### Configuration 2: Scheduled Check (Daily)

```javascript
{
  name: "งานค้าง 7 วัน - ตรวจสอบทุกเช้า",
  description: "ตรวจสอบงานที่เกินกำหนด 7 วันขึ้นไป",
  enabled: true,
  priority: "medium",
  triggerType: "scheduled",

  // Targeting
  formId: "form_uuid_followup",
  subFormId: null,
  fieldId: null, // Not specific to one field

  // Condition
  condition: `
    AND(
      [วันที่ติดตามงาน] + 7 < TODAY(),
      NOT(OR([สถานะ] = "ปิดการขายแล้ว", [สถานะ] = "ยกเลิก"))
    )
  `,
  sendOnce: false, // Send every time condition matches

  // Message
  messageTemplate: "⚠️ งานค้าง: {ชื่อลูกค้า} - เกิน 7 วัน",

  // Telegram
  botToken: "1234567890:ABCdef...",
  groupId: "-1001234567890",

  // Scheduling
  schedule: "0 9 * * *" // Every day at 9:00 AM
}
```

---

### Configuration 3: Sub-Form Trigger

```javascript
{
  name: "งานซ่อมเสร็จ - แจ้งเตือน",
  description: "แจ้งเตือนเมื่องานซ่อมเสร็จสิ้น",
  enabled: true,
  priority: "high",
  triggerType: "field_update",

  // Targeting
  formId: "form_uuid_maintenance",
  subFormId: "subform_uuid_repair", // Target sub-form
  fieldId: "field_uuid_repair_status",

  // Condition
  condition: "[สถานะซ่อม] = \"เสร็จสิ้น\"",
  sendOnce: true,

  // Message
  messageTemplate: `
✅ งานซ่อมเสร็จสิ้น

🔧 เลขที่: {เลขที่ใบงาน}
📝 รายละเอียด: {รายละเอียดงาน}
👨‍🔧 ช่าง: {ชื่อช่าง}
  `,

  // Telegram
  botToken: "9876543210:XYZabc...", // Different bot
  groupId: "-1009876543210", // Different group

  // Scheduling
  schedule: null
}
```

---

### Configuration 4: Complex Multi-Condition

```javascript
{
  name: "ลูกค้า VIP - มูลค่าสูง - ข้อมูลไม่ครบ",
  description: "แจ้งเตือนเมื่อลูกค้า VIP มูลค่าสูง แต่ข้อมูลไม่ครบ",
  enabled: true,
  priority: "high",
  triggerType: "field_update",

  // Targeting
  formId: "form_uuid_customers",
  subFormId: null,
  fieldId: null,

  // Complex Condition
  condition: `
    AND(
      CONTAINS([ชื่อลูกค้า], "VIP"),
      [ยอดขาย] > 100000,
      OR(
        ISBLANK([อีเมล]),
        ISBLANK([เบอร์โทร]),
        ISBLANK([ที่อยู่])
      )
    )
  `,
  sendOnce: true,

  // Message
  messageTemplate: `
⚠️ **ลูกค้า VIP - ข้อมูลไม่ครบ**

👤 ชื่อ: {ชื่อลูกค้า}
💰 ยอดขาย: {ยอดขาย|currency}

ข้อมูลที่ขาด: กรุณาตรวจสอบและเพิ่มข้อมูล
📞 เบอร์โทร: {เบอร์โทร}
📧 อีเมล: {อีเมล}
  `,

  // Telegram
  botToken: "1234567890:ABCdef...",
  groupId: "-1001234567890",

  // Scheduling
  schedule: null
}
```

---

## 💡 Best Practices

### Formula Writing

1. **Start Simple**
   - Begin with basic conditions
   - Test before adding complexity
   - Use "Validate" button frequently

2. **Use Parentheses**
   - Make complex logic clear
   - Example: `AND((A OR B), (C OR D))`

3. **Test with Real Data**
   - Use "Test Rule" button
   - Try edge cases
   - Verify field names are correct

4. **Document Your Logic**
   - Use clear rule names
   - Add descriptions
   - Comment complex formulas

### Message Template Design

1. **Keep It Concise**
   - Mobile-friendly length
   - Key information first
   - Use emojis sparingly

2. **Use Markdown**
   - **Bold** for emphasis
   - Line breaks for readability
   - Bullet points for lists

3. **Include Context**
   - Who, what, when, why
   - Relevant field values
   - Action items

4. **Test Formatting**
   - Send test message
   - Check on mobile
   - Verify placeholders work

### Performance Optimization

1. **Limit Active Rules**
   - Only enable needed rules
   - Disable unused rules
   - Combine similar rules if possible

2. **Use Specific Conditions**
   - Target specific fields
   - Avoid overly broad rules
   - Use field_id when possible

3. **Schedule Wisely**
   - Choose appropriate times
   - Avoid overlapping schedules
   - Consider time zones

4. **Monitor Performance**
   - Check execution time
   - Review history regularly
   - Optimize slow rules

### Security

1. **Protect Bot Tokens**
   - Never share tokens
   - Use separate bots per team
   - Rotate tokens periodically

2. **Control Access**
   - Only admin can create rules
   - Review rules regularly
   - Audit notification history

3. **Validate Inputs**
   - Use formula validation
   - Test before enabling
   - Check group IDs

### Maintenance

1. **Regular Reviews**
   - Check active rules monthly
   - Update outdated conditions
   - Remove obsolete rules

2. **Monitor Success Rate**
   - Review statistics
   - Investigate failures
   - Fix recurring errors

3. **Update Templates**
   - Refresh message content
   - Update field names if changed
   - Improve based on feedback

---

## 🔧 Troubleshooting

### Common Issues

#### Issue 1: Notification Not Sending

**Symptoms:**
- Rule is enabled but no messages sent
- History shows "failed" status

**Possible Causes:**
1. Invalid bot token
2. Bot not in group
3. Group ID incorrect
4. Condition not met
5. Already sent (send_once = true)

**Solutions:**
1. Verify bot token in [@BotFather](https://t.me/BotFather)
2. Add bot to group as administrator
3. Use [@RawDataBot](https://t.me/RawDataBot) to get correct group ID
4. Test condition with "Validate" button
5. Check notification history for duplicates

---

#### Issue 2: Condition Always False

**Symptoms:**
- Test shows "Condition Met: false"
- Validation passes but never triggers

**Possible Causes:**
1. Field name mismatch
2. Wrong data type comparison
3. Thai vs. English field names
4. Case sensitivity

**Solutions:**
1. Check exact field name in form builder
2. Use correct comparison operators
3. Use field title exactly as shown
4. Use UPPER/LOWER for case-insensitive

**Example Fix:**
```javascript
// Wrong: [status] = "closed"
// Correct: [สถานะ] = "ปิดการขาย"

// Wrong: [amount] > "100000" (string)
// Correct: [ยอดขาย] > 100000 (number)
```

---

#### Issue 3: Scheduled Job Not Running

**Symptoms:**
- Cron schedule set but no executions
- Last executed time not updating

**Possible Causes:**
1. Invalid cron expression
2. Service not started
3. Redis connection issue
4. Rule disabled

**Solutions:**
1. Validate cron at https://crontab.guru/
2. Check backend logs for errors
3. Verify Redis is running
4. Ensure rule is enabled

**Common Cron Expressions:**
```
0 9 * * *      → Every day at 9:00 AM
0 8 * * 1      → Every Monday at 8:00 AM
0 17 * * 1-5   → Weekdays at 5:00 PM
*/30 9-17 * * * → Every 30 min between 9 AM - 5 PM
```

---

#### Issue 4: Message Template Not Rendering

**Symptoms:**
- Message shows `{fieldName}` instead of value
- Some placeholders work, others don't

**Possible Causes:**
1. Field name typo
2. Field value is null
3. Placeholder syntax error
4. Field not included in submission data

**Solutions:**
1. Check field name spelling
2. Handle null values in condition
3. Use correct placeholder syntax
4. Ensure field has data

**Example Fix:**
```javascript
// Wrong: {{fieldName}}
// Correct: {fieldName}

// Wrong: {field-name}
// Correct: {fieldName}

// Handle null values:
IF(ISBLANK([หมายเหตุ]), "ไม่มี", [หมายเหตุ])
```

---

#### Issue 5: Duplicate Notifications

**Symptoms:**
- Same notification sent multiple times
- History shows duplicate entries

**Possible Causes:**
1. send_once = false
2. Multiple rules match
3. Condition triggers on every update

**Solutions:**
1. Set send_once = true
2. Make conditions more specific
3. Add additional filters

**Example Fix:**
```javascript
// Before: Triggers on any update
[สถานะ] = "ปิดการขาย"

// After: Only when status changes TO closed
AND(
  [สถานะ] = "ปิดการขาย",
  [สถานะ_previous] <> "ปิดการขาย"
)
```

---

#### Issue 6: Telegram API Rate Limit

**Symptoms:**
- Error: "Too Many Requests"
- Message sending delayed

**Possible Causes:**
1. Too many notifications in short time
2. Telegram API limit (30 msg/sec)
3. Multiple rules targeting same group

**Solutions:**
1. Add delays between messages
2. Use batch processing for scheduled
3. Consolidate rules if possible
4. Contact Telegram support for increase

---

### Debugging Tips

1. **Check Logs**
   ```
   Location: backend/logs/
   File: notification-service.log

   Look for:
   - "Rule evaluation failed"
   - "Telegram API error"
   - "Formula parsing error"
   ```

2. **Test Formula Separately**
   - Use formula validator tool
   - Test with sample data
   - Check each sub-condition

3. **Use Test Button**
   - Test before enabling
   - Try different submission IDs
   - Verify message format

4. **Review History**
   - Check execution times
   - Look for patterns in failures
   - Compare successful vs failed

5. **Simplify Rule**
   - Start with basic condition
   - Add complexity gradually
   - Isolate the problem

---

## ❓ FAQ

### General Questions

**Q: How many notification rules can I create?**
A: No hard limit, but we recommend <50 active rules per form for optimal performance.

**Q: Can I use the same bot token for multiple rules?**
A: Yes, but separate bots per department/team is recommended for better organization.

**Q: How long does it take for notifications to send?**
A: Field update triggers: 2-5 seconds. Scheduled: Based on cron schedule.

**Q: Can I send notifications to multiple groups?**
A: Currently one group per rule. Create multiple rules for multiple groups.

**Q: Are notifications sent if the system is offline?**
A: Immediate notifications are queued and sent when system comes back online. Scheduled notifications may be missed if downtime exceeds execution time.

---

### Formula Questions

**Q: What formula functions are supported?**
A: AND, OR, NOT, IF, CONTAINS, ISBLANK, ISNOTBLANK, UPPER, LOWER, TRIM, LEN. See [Formula Syntax Guide](#formula-syntax-guide).

**Q: Can I use date arithmetic in formulas?**
A: Yes, for scheduled rules. Use `[DateField] + days < TODAY()` syntax.

**Q: How do I reference sub-form fields?**
A: Use same syntax `[fieldName]`. System automatically uses LATEST sub-form submission.

**Q: Can I use calculated fields in formulas?**
A: Yes, any field in the form can be used, including calculated fields.

**Q: How do I handle Thai field names with spaces?**
A: Use brackets: `[ชื่อ ลูกค้า]` or `[Customer Name]`

---

### Template Questions

**Q: What placeholders are available?**
A: All form fields plus system fields (submissionNumber, submittedBy, submittedAt). See [Message Template Syntax](#message-template-syntax).

**Q: Can I use HTML in message templates?**
A: Limited HTML supported by Telegram: `<b>`, `<i>`, `<u>`, `<code>`, `<pre>`, `<a>`.

**Q: How do I format dates in messages?**
A: Use `{fieldName|DD/MM/YYYY}` or other date format patterns.

**Q: Can I include images in notifications?**
A: Not currently supported. Text-only notifications.

**Q: What's the character limit for messages?**
A: Telegram limit is 4096 characters. Recommended: <1000 for readability.

---

### Scheduling Questions

**Q: What cron expressions are supported?**
A: Standard cron format (5 fields). Use https://crontab.guru/ to validate.

**Q: Can I schedule notifications every hour?**
A: Yes, use `0 * * * *` for hourly.

**Q: What timezone is used for schedules?**
A: Server timezone (check with system admin). Usually Asia/Bangkok (UTC+7).

**Q: Can I run a rule manually instead of waiting for schedule?**
A: Yes, use "Test Rule" button or update the schedule temporarily.

**Q: What happens if scheduled job fails?**
A: Job is retried 3 times with exponential backoff. Check logs for details.

---

### Troubleshooting Questions

**Q: Why is my notification not sending?**
A: Check: (1) Rule enabled, (2) Condition met, (3) Bot token valid, (4) Bot in group, (5) No duplicates (send_once).

**Q: How do I debug a formula?**
A: Use "Validate" button, check field names, test with real submission data.

**Q: Where can I see notification history?**
A: Navigate to Settings → Notifications → History tab.

**Q: Can I delete old notification history?**
A: History is automatically cleaned after 30 days. Manual deletion available for admins.

**Q: What if I made a mistake in the rule?**
A: Edit the rule immediately and disable it. Already-sent notifications cannot be recalled.

---

### Best Practices Questions

**Q: Should I use send_once or allow duplicates?**
A: Use send_once for status changes. Allow duplicates for periodic reminders.

**Q: How often should I schedule checks?**
A: Depends on urgency. Daily for most cases, hourly for critical alerts.

**Q: Can I test before enabling?**
A: Yes! Always use "Test Rule" button before enabling.

**Q: Should I create separate rules or combine conditions?**
A: Separate rules for different purposes (better tracking). Combine similar conditions.

**Q: How do I organize many rules?**
A: Use clear naming conventions, enable only needed rules, group by form/department.

---

## 📞 Support

### Getting Help

**For Technical Issues:**
- Check [Troubleshooting](#troubleshooting) section
- Review backend logs
- Contact system administrator

**For Formula Help:**
- See [Formula Syntax Guide](#formula-syntax-guide)
- Use formula validator tool
- Ask in team chat

**For Feature Requests:**
- Submit via feedback form
- Discuss with team lead
- Check roadmap for planned features

### Resources

- **Telegram Bot API:** https://core.telegram.org/bots/api
- **Cron Expression Generator:** https://crontab.guru/
- **Formula Engine Documentation:** See `src/utils/formulaEngine.js`
- **Q-Collector Documentation:** See `CLAUDE.md`

---

**Document Version:** v0.8.0
**Last Updated:** 2025-10-20
**Author:** Q-Collector Team

---
