# Q-Collector v0.8.0 - Advanced Telegram Notification System
**Implementation Plan & Progress Tracker**

---

## 📋 Project Overview

**Version:** v0.8.0
**Feature:** Advanced Telegram Notification System with Trigger-Based & Scheduled Notifications
**Sprint Duration:** 12-15 days (estimated)
**Status:** 🔵 Planning Phase
**Last Updated:** 2025-10-20

---

## 🎯 Executive Summary

### What We're Building
An advanced, configurable Telegram notification system that supports:
1. **Trigger-Based Notifications** - Real-time alerts when field values change
2. **Scheduled Notifications** - Cron-based checks for complex business logic
3. **Per-Rule Configuration** - Separate bot tokens, group IDs, and message templates
4. **Formula-Based Conditions** - Using existing FormulaEngine for powerful logic

### Key Objectives
- ✅ Non-breaking changes to existing system
- ✅ Support both main form and sub-form fields
- ✅ Prevent duplicate notifications with history tracking
- ✅ Scalable architecture using Bull Queue + Redis
- ✅ User-friendly configuration UI

### Expected Impact
- 🚀 **Automation:** Reduce manual monitoring by 80%
- ⚡ **Speed:** Real-time alerts within seconds
- 🎯 **Flexibility:** Custom rules for each business process
- 📊 **Visibility:** Track all notifications sent

---

## 📊 Requirements Analysis

### 1. Trigger-Based Notifications (Field Update Triggers)
**Use Case:** Send notification when specific field value changes (first time only)

**Example:**
```javascript
// Business Rule: Alert when sale is closed
{
  trigger: "field_update",
  condition: "[สถานะ] = \"ปิดการขายได้\"",
  sendOnce: true,
  message: "🎉 ปิดการขาย: {ชื่อลูกค้า} - ยอด {ยอดขาย} บาท"
}
```

**Key Features:**
- ✅ Evaluate condition on every submission update
- ✅ Track notification history (prevent duplicates)
- ✅ Support both main form and sub-form fields
- ✅ Immediate execution (within seconds)

**Technical Approach:**
- Hook into `SubmissionService.update()` method
- Evaluate all active trigger rules
- Check notification history before sending
- Use Bull Queue for async processing

---

### 2. Scheduled Notifications (Cron-Based)
**Use Case:** Daily/Weekly checks for overdue tasks, follow-ups, maintenance alerts

**Example:**
```javascript
// Business Rule: Alert for overdue follow-ups (7+ days)
{
  trigger: "scheduled",
  schedule: "0 9 * * *", // Every day at 9:00 AM
  condition: `
    AND(
      [วันที่ติดตามงาน] + 7 < TODAY(),
      NOT(OR(
        [สถานะ] = "ปิดการขายแล้ว",
        [สถานะ] = "ปิดการขายไม่ได้"
      ))
    )
  `,
  message: "⚠️ งานค้าง: {ชื่อลูกค้า} - เกิน 7 วัน"
}
```

**Key Features:**
- ✅ Cron-based scheduling (daily, weekly, custom)
- ✅ Query database for matching records
- ✅ Support date arithmetic (TODAY, +/- days)
- ✅ Batch processing for multiple matches

**Technical Approach:**
- Use Bull Queue repeatable jobs (cron)
- Query submissions matching condition
- For sub-forms: use LATEST submission date
- Send summary or individual notifications

---

### 3. Per-Rule Configuration
**Requirements:**
- Separate bot token + group ID per rule
- Custom message templates with placeholders
- Enable/disable toggle per rule
- Priority levels (high, medium, low)

**Configuration Schema:**
```javascript
{
  id: "rule_uuid",
  name: "ปิดการขาย - แจ้งเตือน",
  enabled: true,
  priority: "high",
  trigger: "field_update" | "scheduled",

  // Telegram config
  botToken: "1234567890:ABCdef...",
  groupId: "-1001234567890",

  // Condition & template
  condition: "[สถานะ] = \"ปิดการขายได้\"",
  messageTemplate: "🎉 ปิดการขาย...",

  // Scheduling (for scheduled type)
  schedule: "0 9 * * *",

  // Targeting
  formId: "form_uuid",
  subFormId: null, // or subform_uuid
  fieldId: "field_uuid", // monitored field

  // History tracking
  sendOnce: true,
  lastExecutedAt: null
}
```

---

## 🗄️ Database Schema Design

### Table 1: `notification_rules`
**Purpose:** Store notification rule configurations

```sql
CREATE TABLE notification_rules (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Rule Info
  name VARCHAR(255) NOT NULL,
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'high', 'medium', 'low'

  -- Trigger Type
  trigger_type VARCHAR(50) NOT NULL, -- 'field_update', 'scheduled'

  -- Targeting
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  sub_form_id UUID REFERENCES sub_forms(id) ON DELETE CASCADE, -- NULL for main form
  field_id UUID REFERENCES fields(id) ON DELETE CASCADE, -- Monitored field (optional)

  -- Condition
  condition TEXT NOT NULL, -- Formula expression
  send_once BOOLEAN NOT NULL DEFAULT true, -- Prevent duplicate notifications

  -- Message Template
  message_template TEXT NOT NULL, -- Template with placeholders like {fieldName}

  -- Telegram Configuration
  bot_token VARCHAR(255) NOT NULL,
  group_id VARCHAR(255) NOT NULL, -- Can be negative for groups

  -- Scheduling (for scheduled type only)
  schedule VARCHAR(100), -- Cron expression like "0 9 * * *"

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  last_executed_at TIMESTAMP, -- Last time rule was checked/executed

  -- Indexes
  INDEX idx_notification_rules_enabled (enabled),
  INDEX idx_notification_rules_trigger_type (trigger_type),
  INDEX idx_notification_rules_form_id (form_id),
  INDEX idx_notification_rules_sub_form_id (sub_form_id),
  INDEX idx_notification_rules_schedule (schedule) -- For cron lookup
);
```

**Key Design Decisions:**
- ✅ Separate bot_token + group_id per rule (not global)
- ✅ Support both form_id and sub_form_id (NULL = main form)
- ✅ Store condition as TEXT (flexible formula)
- ✅ Optional field_id for quick targeting
- ✅ Schedule stored as cron expression

---

### Table 2: `notification_history`
**Purpose:** Track all sent notifications (prevent duplicates, audit trail)

```sql
CREATE TABLE notification_history (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Rule Reference
  rule_id UUID NOT NULL REFERENCES notification_rules(id) ON DELETE CASCADE,

  -- Submission Reference
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,

  -- Execution Details
  sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL, -- 'sent', 'failed', 'skipped'
  error_message TEXT, -- If status = 'failed'

  -- Message Content (for audit)
  message_sent TEXT, -- Actual message sent (rendered template)
  telegram_message_id VARCHAR(100), -- Telegram's message ID (for tracking)

  -- Metadata
  execution_time_ms INTEGER, -- How long it took to send

  -- Indexes
  INDEX idx_notification_history_rule_id (rule_id),
  INDEX idx_notification_history_submission_id (submission_id),
  INDEX idx_notification_history_sent_at (sent_at),
  INDEX idx_notification_history_status (status),

  -- Unique constraint to prevent duplicate notifications
  UNIQUE (rule_id, submission_id) -- Only for send_once rules
);
```

**Key Design Decisions:**
- ✅ Track every notification attempt (success + failure)
- ✅ Store rendered message for audit
- ✅ UNIQUE constraint on (rule_id, submission_id) prevents duplicates
- ✅ Store Telegram message ID for reference
- ✅ Track execution time for performance monitoring

---

### Migrations Plan

**Migration 1:** `20251020000001-create-notification-rules.js`
- Create `notification_rules` table
- Add indexes

**Migration 2:** `20251020000002-create-notification-history.js`
- Create `notification_history` table
- Add indexes
- Add UNIQUE constraint

---

## 🔌 API Endpoints Design

### Notification Rules API

#### 1. Create Notification Rule
```
POST /api/v1/notifications/rules
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "name": "ปิดการขาย - แจ้งเตือน",
  "description": "แจ้งเตือนเมื่อปิดการขายได้",
  "enabled": true,
  "priority": "high",
  "triggerType": "field_update",
  "formId": "form_uuid",
  "subFormId": null,
  "fieldId": "field_uuid",
  "condition": "[สถานะ] = \"ปิดการขายได้\"",
  "sendOnce": true,
  "messageTemplate": "🎉 ปิดการขาย: {ชื่อลูกค้า} - ยอด {ยอดขาย} บาท",
  "botToken": "1234567890:ABCdef...",
  "groupId": "-1001234567890",
  "schedule": null
}

Response: 201 Created
{
  "success": true,
  "rule": { ... }
}
```

#### 2. List Notification Rules
```
GET /api/v1/notifications/rules?formId={uuid}&enabled=true
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "rules": [
    {
      "id": "rule_uuid",
      "name": "ปิดการขาย - แจ้งเตือน",
      "enabled": true,
      "triggerType": "field_update",
      "lastExecutedAt": "2025-10-20T09:00:00Z",
      "totalSent": 42
    }
  ],
  "total": 1
}
```

#### 3. Update Notification Rule
```
PATCH /api/v1/notifications/rules/:ruleId
Authorization: Bearer {token}

Body: { "enabled": false }

Response: 200 OK
{
  "success": true,
  "rule": { ... }
}
```

#### 4. Delete Notification Rule
```
DELETE /api/v1/notifications/rules/:ruleId
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "message": "Rule deleted successfully"
}
```

#### 5. Test Notification Rule
```
POST /api/v1/notifications/rules/:ruleId/test
Authorization: Bearer {token}

Body: {
  "submissionId": "submission_uuid" // Optional
}

Response: 200 OK
{
  "success": true,
  "result": {
    "conditionMet": true,
    "messageSent": "🎉 ปิดการขาย...",
    "telegramResponse": { ... }
  }
}
```

### Notification History API

#### 6. Get Notification History
```
GET /api/v1/notifications/history?ruleId={uuid}&limit=50
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "history": [
    {
      "id": "history_uuid",
      "ruleId": "rule_uuid",
      "submissionId": "submission_uuid",
      "sentAt": "2025-10-20T09:00:00Z",
      "status": "sent",
      "messageSent": "🎉 ปิดการขาย...",
      "executionTimeMs": 234
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50
}
```

#### 7. Get Rule Statistics
```
GET /api/v1/notifications/rules/:ruleId/stats
Authorization: Bearer {token}

Response: 200 OK
{
  "success": true,
  "stats": {
    "totalSent": 150,
    "totalFailed": 5,
    "totalSkipped": 12,
    "averageExecutionTimeMs": 210,
    "lastExecutedAt": "2025-10-20T09:00:00Z",
    "successRate": 0.96
  }
}
```

---

## 🏗️ Service Architecture

### 1. NotificationRuleService
**Location:** `backend/services/NotificationRuleService.js`

**Responsibilities:**
- CRUD operations for notification rules
- Validate formulas using FormulaEngine
- Test rule execution
- Get rule statistics

**Key Methods:**
```javascript
class NotificationRuleService {
  async createRule(ruleData, userId)
  async updateRule(ruleId, updates, userId)
  async deleteRule(ruleId, userId)
  async getRule(ruleId)
  async listRules(filters, pagination)
  async testRule(ruleId, submissionId)
  async validateCondition(condition, formId)
  async getRuleStatistics(ruleId)
}
```

---

### 2. NotificationExecutorService
**Location:** `backend/services/NotificationExecutorService.js`

**Responsibilities:**
- Execute notification rules
- Evaluate conditions using FormulaEngine
- Render message templates
- Send to Telegram
- Record history

**Key Methods:**
```javascript
class NotificationExecutorService {
  async executeRule(rule, submission)
  async evaluateCondition(rule, submissionData)
  async renderMessageTemplate(template, submissionData)
  async sendToTelegram(botToken, groupId, message)
  async recordHistory(ruleId, submissionId, status, details)
  async shouldSendNotification(rule, submission) // Check history
}
```

---

### 3. NotificationTriggerService
**Location:** `backend/services/NotificationTriggerService.js`

**Responsibilities:**
- Hook into submission lifecycle
- Process field update triggers
- Queue notification jobs

**Key Methods:**
```javascript
class NotificationTriggerService {
  async onSubmissionCreated(submission)
  async onSubmissionUpdated(submission, previousData)
  async onSubFormSubmissionCreated(subFormSubmission)
  async processFieldUpdateTriggers(formId, submissionId)
  async queueNotificationJob(ruleId, submissionId)
}
```

---

### 4. NotificationSchedulerService
**Location:** `backend/services/NotificationSchedulerService.js`

**Responsibilities:**
- Manage cron jobs for scheduled notifications
- Query database for matching submissions
- Process batch notifications

**Key Methods:**
```javascript
class NotificationSchedulerService {
  async initialize() // Set up all active scheduled rules
  async registerScheduledRule(rule)
  async unregisterScheduledRule(ruleId)
  async executeCronJob(ruleId)
  async findMatchingSubmissions(rule)
  async processScheduledRule(rule)
}
```

---

## 📦 Bull Queue Job Design

### Queue: `telegram-notifications`

**Job Types:**

#### 1. Immediate Notification (Field Update)
```javascript
{
  type: 'immediate',
  ruleId: 'rule_uuid',
  submissionId: 'submission_uuid',
  priority: 'high', // 1=high, 2=medium, 3=low
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
}
```

#### 2. Scheduled Notification (Cron)
```javascript
{
  type: 'scheduled',
  ruleId: 'rule_uuid',
  submissionIds: ['uuid1', 'uuid2', ...], // Batch
  priority: 'medium',
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000
  }
}
```

**Queue Configuration:**
```javascript
const notificationQueue = new Queue('telegram-notifications', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: {
      age: 86400, // 24 hours
      count: 1000
    },
    removeOnFail: {
      age: 604800 // 7 days
    }
  }
});
```

**Processor:**
```javascript
notificationQueue.process(async (job) => {
  const { type, ruleId, submissionId, submissionIds } = job.data;

  if (type === 'immediate') {
    await NotificationExecutorService.executeRule(ruleId, submissionId);
  } else if (type === 'scheduled') {
    for (const sid of submissionIds) {
      await NotificationExecutorService.executeRule(ruleId, sid);
    }
  }
});
```

---

## 🔧 Formula Examples & Use Cases

### Example 1: Simple Field Match
```javascript
// Alert when status changes to "Closed Won"
{
  condition: "[สถานะ] = \"ปิดการขายได้\"",
  messageTemplate: "🎉 ปิดการขาย: {ชื่อลูกค้า} - ยอด {ยอดขาย} บาท"
}
```

### Example 2: Multiple Conditions (AND)
```javascript
// Alert when high-value sale is closed
{
  condition: "AND([สถานะ] = \"ปิดการขายได้\", [ยอดขาย] > 100000)",
  messageTemplate: "💰 ปิดการขายมูลค่าสูง: {ชื่อลูกค้า} - {ยอดขาย} บาท"
}
```

### Example 3: Multiple Conditions (OR)
```javascript
// Alert when sale is either won or lost
{
  condition: "OR([สถานะ] = \"ปิดการขายได้\", [สถานะ] = \"ปิดการขายไม่ได้\")",
  messageTemplate: "📊 สถานะการขาย: {ชื่อลูกค้า} - {สถานะ}"
}
```

### Example 4: Range Check
```javascript
// Alert when score is between 4-5
{
  condition: "AND([คะแนน] >= 4, [คะแนน] <= 5)",
  messageTemplate: "⭐ ลูกค้าให้คะแนนสูง: {ชื่อลูกค้า} - {คะแนน} ดาว"
}
```

### Example 5: String Contains
```javascript
// Alert when customer name contains "VIP"
{
  condition: "CONTAINS([ชื่อลูกค้า], \"VIP\")",
  messageTemplate: "👑 ลูกค้า VIP: {ชื่อลูกค้า}"
}
```

### Example 6: Not Blank Check
```javascript
// Alert when remarks field is filled
{
  condition: "ISNOTBLANK([หมายเหตุ])",
  messageTemplate: "📝 มีหมายเหตุเพิ่มเติม: {หมายเหตุ}"
}
```

### Example 7: Date Arithmetic (Scheduled)
```javascript
// Alert for follow-ups overdue by 7+ days
{
  trigger: "scheduled",
  schedule: "0 9 * * *", // Daily at 9 AM
  condition: `
    AND(
      [วันที่ติดตามงาน] + 7 < TODAY(),
      NOT(OR([สถานะ] = "ปิดการขายแล้ว", [สถานะ] = "ปิดการขายไม่ได้"))
    )
  `,
  messageTemplate: "⚠️ งานค้าง: {ชื่อลูกค้า} - เกิน 7 วัน (นัดล่าสุด: {วันที่ติดตามงาน})"
}
```

### Example 8: Sub-Form Field (Latest Record)
```javascript
// Alert when latest sub-form status is "Complete"
{
  formId: "main_form_uuid",
  subFormId: "subform_uuid",
  condition: "[สถานะซ่อม] = \"เสร็จสิ้น\"",
  messageTemplate: "✅ งานซ่อมเสร็จสิ้น: {เลขที่ใบงาน} - {รายละเอียด}"
}
```

### Example 9: Complex Business Logic
```javascript
// Alert when maintenance is overdue AND machine status is critical
{
  trigger: "scheduled",
  schedule: "0 8 * * 1", // Every Monday at 8 AM
  condition: `
    AND(
      [วันที่บำรุงรักษาครั้งล่าสุด] + 30 < TODAY(),
      OR([สถานะเครื่องจักร] = "วิกฤต", [สถานะเครื่องจักร] = "ต้องตรวจสอบ")
    )
  `,
  messageTemplate: `
⚠️ **แจ้งเตือนบำรุงรักษา**

🏭 เครื่องจักร: {ชื่อเครื่องจักร}
📅 บำรุงล่าสุด: {วันที่บำรุงรักษาครั้งล่าสุด}
🚨 สถานะ: {สถานะเครื่องจักร}

👉 ต้องบำรุงรักษาทันที!
  `
}
```

### Example 10: Multi-Field Validation
```javascript
// Alert when customer data is incomplete
{
  condition: `
    OR(
      ISBLANK([ชื่อลูกค้า]),
      ISBLANK([เบอร์โทร]),
      ISBLANK([อีเมล])
    )
  `,
  messageTemplate: "⚠️ ข้อมูลลูกค้าไม่ครบ: {ชื่อลูกค้า} - กรุณาเพิ่มข้อมูล"
}
```

---

## 📅 Implementation Phases

### **Phase 1: Database & Models (2-3 days)**
**Goal:** Set up database schema and Sequelize models

**Tasks:**
- [ ] Create migration: `notification_rules` table
- [ ] Create migration: `notification_history` table
- [ ] Create Sequelize model: `NotificationRule.js`
- [ ] Create Sequelize model: `NotificationHistory.js`
- [ ] Add associations (Form, SubForm, Field, User)
- [ ] Test migrations on dev database
- [ ] Seed sample notification rules for testing

**Acceptance Criteria:**
- ✅ Both tables created with correct schema
- ✅ Models loaded without errors
- ✅ Associations working (can query related data)
- ✅ Sample rules inserted successfully

---

### **Phase 2: NotificationRuleService (2-3 days)**
**Goal:** Implement CRUD operations for notification rules

**Tasks:**
- [ ] Create `NotificationRuleService.js`
- [ ] Implement `createRule(ruleData, userId)`
- [ ] Implement `updateRule(ruleId, updates, userId)`
- [ ] Implement `deleteRule(ruleId, userId)`
- [ ] Implement `getRule(ruleId)`
- [ ] Implement `listRules(filters, pagination)`
- [ ] Implement `validateCondition(condition, formId)` using FormulaEngine
- [ ] Add unit tests for all methods
- [ ] Add validation (required fields, formula syntax)

**Acceptance Criteria:**
- ✅ All CRUD methods working
- ✅ Formula validation integrated
- ✅ Unit tests passing (80%+ coverage)
- ✅ Input validation working

---

### **Phase 3: NotificationExecutorService (2-3 days)**
**Goal:** Implement notification execution logic

**Tasks:**
- [ ] Create `NotificationExecutorService.js`
- [ ] Implement `evaluateCondition(rule, submissionData)` using FormulaEngine
- [ ] Implement `renderMessageTemplate(template, submissionData)`
- [ ] Implement `sendToTelegram(botToken, groupId, message)`
- [ ] Implement `recordHistory(ruleId, submissionId, status, details)`
- [ ] Implement `shouldSendNotification(rule, submission)` (check history)
- [ ] Add error handling and retry logic
- [ ] Add unit tests for template rendering
- [ ] Test Telegram API integration

**Acceptance Criteria:**
- ✅ Conditions evaluated correctly
- ✅ Message templates rendered with placeholders
- ✅ Telegram messages sent successfully
- ✅ History recorded for all attempts
- ✅ Duplicate prevention working (send_once)

---

### **Phase 4: Bull Queue Setup (1-2 days)**
**Goal:** Set up Bull Queue for async notification processing

**Tasks:**
- [ ] Create `NotificationQueue.js` (similar to MigrationQueue)
- [ ] Configure queue with Redis connection
- [ ] Implement job processor for `immediate` type
- [ ] Implement job processor for `scheduled` type
- [ ] Add job retry logic (3 attempts, exponential backoff)
- [ ] Add event handlers (completed, failed, stalled)
- [ ] Test queue processing
- [ ] Monitor queue performance

**Acceptance Criteria:**
- ✅ Queue initialized successfully
- ✅ Jobs processed asynchronously
- ✅ Failed jobs retried correctly
- ✅ Event logs working

---

### **Phase 5: NotificationTriggerService (2-3 days)**
**Goal:** Hook into submission lifecycle for field update triggers

**Tasks:**
- [ ] Create `NotificationTriggerService.js`
- [ ] Hook into `SubmissionService.create()` method
- [ ] Hook into `SubmissionService.update()` method
- [ ] Implement `processFieldUpdateTriggers(formId, submissionId)`
- [ ] Query active rules for the form
- [ ] Evaluate each rule's condition
- [ ] Queue notification jobs for matching rules
- [ ] Add integration tests
- [ ] Test with real submission updates

**Acceptance Criteria:**
- ✅ Triggers fire on submission create/update
- ✅ Only matching rules processed
- ✅ Jobs queued correctly
- ✅ No performance impact on submission flow

---

### **Phase 6: NotificationSchedulerService (2-3 days)**
**Goal:** Implement cron-based scheduled notifications

**Tasks:**
- [ ] Create `NotificationSchedulerService.js`
- [ ] Implement `initialize()` - Load all active scheduled rules
- [ ] Implement `registerScheduledRule(rule)` - Create Bull repeatable job
- [ ] Implement `unregisterScheduledRule(ruleId)` - Remove job
- [ ] Implement `executeCronJob(ruleId)` - Run scheduled check
- [ ] Implement `findMatchingSubmissions(rule)` - Query database
- [ ] Add support for date arithmetic (TODAY, +/- days)
- [ ] Add support for sub-form latest record
- [ ] Test cron execution
- [ ] Add error handling for failed cron jobs

**Acceptance Criteria:**
- ✅ Cron jobs registered on service start
- ✅ Jobs execute at scheduled times
- ✅ Matching submissions found correctly
- ✅ Batch notifications sent
- ✅ Date arithmetic working (TODAY, +7, -30)

---

### **Phase 7: API Endpoints (2-3 days)**
**Goal:** Create REST API for notification rules

**Tasks:**
- [ ] Create `notification.routes.js`
- [ ] Implement `POST /api/v1/notifications/rules` (Create)
- [ ] Implement `GET /api/v1/notifications/rules` (List)
- [ ] Implement `GET /api/v1/notifications/rules/:ruleId` (Get)
- [ ] Implement `PATCH /api/v1/notifications/rules/:ruleId` (Update)
- [ ] Implement `DELETE /api/v1/notifications/rules/:ruleId` (Delete)
- [ ] Implement `POST /api/v1/notifications/rules/:ruleId/test` (Test)
- [ ] Implement `GET /api/v1/notifications/history` (History)
- [ ] Implement `GET /api/v1/notifications/rules/:ruleId/stats` (Statistics)
- [ ] Add authentication middleware
- [ ] Add RBAC middleware (admin/super_admin only)
- [ ] Add request validation
- [ ] Test all endpoints with Postman

**Acceptance Criteria:**
- ✅ All endpoints working
- ✅ Authentication required
- ✅ RBAC enforced
- ✅ Input validation working
- ✅ Error responses correct

---

### **Phase 8: Frontend UI - List & Create (2-3 days)**
**Goal:** Build React components for notification rules management

**Tasks:**
- [ ] Create `NotificationRulesPage.jsx` - Main page
- [ ] Create `NotificationRulesList.jsx` - List component
- [ ] Create `NotificationRuleForm.jsx` - Create/Edit form
- [ ] Add form dropdown selector (Form + SubForm)
- [ ] Add trigger type selector (Field Update / Scheduled)
- [ ] Add condition formula input with validation
- [ ] Add message template editor
- [ ] Add Telegram config inputs (botToken, groupId)
- [ ] Add cron expression input with helper
- [ ] Add "Test Rule" button
- [ ] Integrate with API endpoints
- [ ] Add loading states and error handling
- [ ] Style with ShadCN components

**Acceptance Criteria:**
- ✅ Users can view all rules
- ✅ Users can create new rules
- ✅ Users can edit existing rules
- ✅ Formula validation works in UI
- ✅ Test button sends test message
- ✅ UI is responsive and user-friendly

---

### **Phase 9: Frontend UI - History & Stats (1-2 days)**
**Goal:** Build components for notification history and statistics

**Tasks:**
- [ ] Create `NotificationHistory.jsx` - History list
- [ ] Create `NotificationStats.jsx` - Statistics dashboard
- [ ] Add filters (status, date range, rule)
- [ ] Add pagination for history
- [ ] Display execution time, status, message sent
- [ ] Add "View Chat" link (opens Telegram)
- [ ] Display rule statistics (total sent, success rate)
- [ ] Add charts for visualization (optional)
- [ ] Style with ShadCN components

**Acceptance Criteria:**
- ✅ Users can view notification history
- ✅ Users can filter history
- ✅ Statistics displayed correctly
- ✅ Links to Telegram working

---

### **Phase 10: Testing & Documentation (2-3 days)**
**Goal:** Comprehensive testing and documentation

**Tasks:**
- [ ] Write integration tests for full notification flow
- [ ] Test field update triggers end-to-end
- [ ] Test scheduled notifications end-to-end
- [ ] Test with real Telegram bot and group
- [ ] Test error scenarios (invalid token, API down)
- [ ] Test performance with 100+ rules
- [ ] Write user manual (TELEGRAM-NOTIFICATION-SYSTEM-MANUAL.md)
- [ ] Write API documentation
- [ ] Create video tutorial (optional)
- [ ] Update CLAUDE.md with v0.8.0 changes

**Acceptance Criteria:**
- ✅ All integration tests passing
- ✅ No critical bugs found
- ✅ Performance acceptable (<200ms per notification)
- ✅ Documentation complete
- ✅ User manual ready

---

### **Phase 11: Deployment & Monitoring (1 day)**
**Goal:** Deploy to production and set up monitoring

**Tasks:**
- [ ] Run migrations on production database
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Configure Redis for production
- [ ] Test in production environment
- [ ] Set up monitoring (queue metrics, error alerts)
- [ ] Train users on new feature
- [ ] Monitor for 24 hours

**Acceptance Criteria:**
- ✅ Feature deployed successfully
- ✅ No errors in production logs
- ✅ Users can create and test rules
- ✅ Monitoring working

---

## ⏱️ Time Estimates

| Phase | Days | Status |
|-------|------|--------|
| Phase 1: Database & Models | 2-3 | 🔵 Not Started |
| Phase 2: NotificationRuleService | 2-3 | 🔵 Not Started |
| Phase 3: NotificationExecutorService | 2-3 | 🔵 Not Started |
| Phase 4: Bull Queue Setup | 1-2 | 🔵 Not Started |
| Phase 5: NotificationTriggerService | 2-3 | 🔵 Not Started |
| Phase 6: NotificationSchedulerService | 2-3 | 🔵 Not Started |
| Phase 7: API Endpoints | 2-3 | 🔵 Not Started |
| Phase 8: Frontend UI - List & Create | 2-3 | 🔵 Not Started |
| Phase 9: Frontend UI - History & Stats | 1-2 | 🔵 Not Started |
| Phase 10: Testing & Documentation | 2-3 | 🔵 Not Started |
| Phase 11: Deployment & Monitoring | 1 | 🔵 Not Started |
| **Total** | **18-27 days** | **🔵 Planning** |

**Realistic Timeline:** 3-4 weeks (20-25 working days)

---

## 🧪 Testing Plan

### Unit Tests
- [ ] NotificationRuleService methods
- [ ] NotificationExecutorService methods
- [ ] Template rendering logic
- [ ] Formula evaluation
- [ ] Message placeholder replacement

### Integration Tests
- [ ] Full notification flow (trigger → queue → send → history)
- [ ] Field update triggers
- [ ] Scheduled cron jobs
- [ ] Duplicate prevention (send_once)
- [ ] Error handling and retry

### End-to-End Tests
- [ ] Create rule via UI → Save → Test send
- [ ] Update submission → Trigger notification
- [ ] Scheduled job runs → Sends batch notifications
- [ ] View history in UI

### Performance Tests
- [ ] 100+ active rules performance
- [ ] Queue processing speed
- [ ] Database query optimization
- [ ] Telegram API rate limits

---

## 🚀 Best Practices & Considerations

### Security
- ✅ **Bot Token Protection:** Store in environment variables, never expose in frontend
- ✅ **RBAC Enforcement:** Only admin/super_admin can create/edit rules
- ✅ **Input Validation:** Validate all user inputs (formulas, templates, cron)
- ✅ **Rate Limiting:** Prevent abuse of test notification feature

### Performance
- ✅ **Async Processing:** Use Bull Queue for all notifications (non-blocking)
- ✅ **Batch Processing:** Group scheduled notifications for efficiency
- ✅ **Database Indexing:** Index rule_id, submission_id, sent_at columns
- ✅ **Cache Compiled Formulas:** Use FormulaEngine cache

### Reliability
- ✅ **Retry Logic:** 3 attempts with exponential backoff
- ✅ **Error Logging:** Log all failures with details
- ✅ **Monitoring:** Track queue metrics, success rate, execution time
- ✅ **Graceful Degradation:** Don't block submission if notification fails

### Maintainability
- ✅ **Clear Naming:** Use descriptive variable/function names
- ✅ **Code Comments:** Document complex logic (especially formulas)
- ✅ **Modular Design:** Separate concerns (Rule, Executor, Trigger, Scheduler)
- ✅ **Version Control:** Commit frequently with clear messages

### Scalability
- ✅ **Horizontal Scaling:** Bull Queue supports multiple workers
- ✅ **Database Optimization:** Use EXPLAIN ANALYZE for slow queries
- ✅ **Redis Tuning:** Configure maxmemory and eviction policy
- ✅ **Telegram API Limits:** Respect rate limits (30 messages/second)

---

## 📚 Additional Resources

### Documentation References
- **Bull Queue:** https://github.com/OptimalBits/bull
- **Telegram Bot API:** https://core.telegram.org/bots/api
- **Cron Syntax:** https://crontab.guru/
- **FormulaEngine:** `src/utils/formulaEngine.js`

### Related Files
- `backend/services/MigrationQueue.js` - Bull Queue pattern reference
- `backend/services/TelegramService.js` - Telegram integration reference
- `src/utils/formulaEngine.js` - Formula evaluation reference

---

## 🐛 Known Issues & Limitations

### Current Limitations
1. **Sub-Form Date Logic:** For scheduled checks, only LATEST sub-form submission date is used
2. **Telegram Rate Limits:** Max 30 messages/second (need throttling for large batches)
3. **Formula Engine:** No date arithmetic functions yet (need to add TODAY, DATEADD, etc.)
4. **Template Engine:** Basic placeholder replacement only (no loops, conditionals)

### Future Enhancements
- [ ] Support for email notifications (not just Telegram)
- [ ] Advanced template engine with loops/conditionals
- [ ] Notification batching (group multiple alerts into one message)
- [ ] User-level notification preferences
- [ ] Webhook support (send to external APIs)
- [ ] A/B testing for message templates
- [ ] Multi-language message templates

---

## ✅ Completion Checklist

Before marking v0.8.0 as complete:

- [ ] All 11 phases completed
- [ ] Database migrations successful (dev + prod)
- [ ] All unit tests passing (80%+ coverage)
- [ ] All integration tests passing
- [ ] End-to-end tests passing
- [ ] Performance tests passing (<200ms per notification)
- [ ] API documentation complete
- [ ] User manual complete (TELEGRAM-NOTIFICATION-SYSTEM-MANUAL.md)
- [ ] Frontend UI tested on desktop + mobile
- [ ] Deployed to production successfully
- [ ] Monitoring set up
- [ ] Users trained
- [ ] CLAUDE.md updated with v0.8.0 changes
- [ ] No critical bugs in production (24-hour monitoring)

---

**Last Updated:** 2025-10-20
**Status:** 🔵 Planning Phase
**Next Action:** Start Phase 1 - Database & Models

---
