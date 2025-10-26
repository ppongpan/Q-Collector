# DataRetentionService - PDPA Data Retention Management

**Version:** v0.8.2-dev
**Date:** 2025-10-24
**Purpose:** Automatic identification and deletion of data that has exceeded PDPA retention periods

---

## Overview

The DataRetentionService ensures Q-Collector complies with PDPA requirements by automatically managing data that has exceeded its retention period. It prevents organizations from keeping personal data longer than necessary, as defined in consent items.

## Features

### Core Capabilities

1. **Expired Data Detection**
   - Automatically identifies consents and submissions past retention period
   - Supports multiple retention period formats
   - Groups data by category for easier management

2. **Retention Period Parsing**
   - "2 years" → 2 years from consented_at
   - "6 months" → 6 months from consented_at
   - "90 days" → 90 days from consented_at
   - "permanent" → never expires (null)

3. **Soft Delete with Audit Trail**
   - Non-destructive deletion (recommended)
   - Marks data as deleted without removing from database
   - Creates comprehensive audit logs
   - Maintains data integrity

4. **Hard Delete Option**
   - Permanent removal from database
   - Use with extreme caution
   - Creates audit trail before deletion

5. **Dry-Run Mode**
   - Test scheduled deletions without actually deleting
   - Reports what would be deleted
   - Safe for testing and validation

6. **Admin Notifications**
   - Telegram alerts for scheduled deletions
   - Summary of expired data
   - Error reporting

7. **Comprehensive Reporting**
   - Retention compliance statistics
   - Group by retention period, form, category
   - Compliance rate calculation

---

## API Methods

### 1. getExpiredData({ page, limit, category })

**Find all data that has exceeded retention period**

```javascript
const result = await DataRetentionService.getExpiredData({
  page: 1,
  limit: 50,
  category: 'all' // 'consents', 'submissions', 'all'
});

// Returns:
{
  expiredData: [
    {
      id: 'uuid',
      type: 'consent',
      consentId: 'uuid',
      submissionId: 'uuid',
      formId: 'uuid',
      formTitle: 'Customer Registration',
      consentItemTitle: 'Marketing Consent',
      retentionPeriod: '2 years',
      consentedAt: '2023-01-01T00:00:00.000Z',
      expiryDate: '2025-01-01T00:00:00.000Z',
      daysOverdue: 297,
      user: { id: 'uuid', username: 'john.doe', email: 'john@example.com' }
    },
    // ... more expired data
  ],
  total: 42,
  byCategory: {
    consents: 30,
    submissions: 12
  },
  oldestExpiry: '2024-01-01T00:00:00.000Z',
  newestExpiry: '2025-10-01T00:00:00.000Z',
  page: 1,
  limit: 50,
  totalPages: 1
}
```

---

### 2. calculateRetentionExpiry(retentionPeriod, startDate)

**Calculate expiry date from retention period**

```javascript
const expiryDate = DataRetentionService.calculateRetentionExpiry(
  '2 years',
  new Date('2023-01-01')
);
// Returns: Date('2025-01-01')

const permanent = DataRetentionService.calculateRetentionExpiry(
  'permanent',
  new Date('2023-01-01')
);
// Returns: null
```

**Supported Formats:**
- `"2 years"` → 2 years from start date
- `"6 months"` → 6 months from start date
- `"90 days"` → 90 days from start date
- `"permanent"` → never expires (null)

---

### 3. getExpiredConsents()

**Get all consents that have exceeded retention period**

```javascript
const expiredConsents = await DataRetentionService.getExpiredConsents();

// Returns array of:
[
  {
    id: 'uuid',
    type: 'consent',
    consentId: 'uuid',
    submissionId: 'uuid',
    formId: 'uuid',
    formTitle: 'Customer Registration',
    consentItemTitle: 'Marketing Consent',
    retentionPeriod: '2 years',
    consentedAt: '2023-01-01T00:00:00.000Z',
    expiryDate: '2025-01-01T00:00:00.000Z',
    daysOverdue: 297,
    user: { ... }
  },
  // ... more
]
```

---

### 4. getExpiredSubmissions()

**Get submissions where ALL consents have expired**

```javascript
const expiredSubmissions = await DataRetentionService.getExpiredSubmissions();

// Returns array of:
[
  {
    id: 'uuid',
    type: 'submission',
    submissionId: 'uuid',
    formId: 'uuid',
    formTitle: 'Customer Registration',
    submittedAt: '2023-01-01T00:00:00.000Z',
    expiryDate: '2025-01-01T00:00:00.000Z',
    daysOverdue: 297,
    consentsCount: 3,
    status: 'submitted'
  },
  // ... more
]
```

**Important:** Only submissions where ALL associated consents have expired are included.

---

### 5. deleteExpiredData({ dataIds, category, reason, deletedBy, hardDelete })

**Delete expired data (soft or hard delete)**

```javascript
const result = await DataRetentionService.deleteExpiredData({
  dataIds: ['uuid1', 'uuid2', 'uuid3'],
  category: 'consents', // 'consents', 'submissions', 'all'
  reason: 'PDPA retention period expired',
  deletedBy: 'admin-user-id',
  hardDelete: false // Use soft delete (recommended)
});

// Returns:
{
  deleted: 3,
  failed: [],
  audit: [
    { id: 'audit-uuid-1', entityType: 'consent', entityId: 'uuid1', ... },
    // ... more audit entries
  ],
  category: 'consents',
  deletionMethod: 'soft'
}
```

**Deletion Methods:**

**Soft Delete (Recommended):**
- Marks data as deleted (adds `deleted_at` and `deletion_reason`)
- Data remains in database for audit purposes
- Can be excluded from queries
- Maintains referential integrity

**Hard Delete (Caution):**
- Permanently removes data from database
- Cannot be recovered
- Use only when absolutely necessary
- Creates audit trail before deletion

---

### 6. scheduleAutoDeletion({ category, dryRun, deletedBy })

**Scheduled job to auto-delete expired data**

```javascript
// Dry run (testing)
const dryRunResult = await DataRetentionService.scheduleAutoDeletion({
  category: 'all',
  dryRun: true,
  deletedBy: 'SYSTEM'
});

// Actual deletion
const realResult = await DataRetentionService.scheduleAutoDeletion({
  category: 'all',
  dryRun: false,
  deletedBy: 'SYSTEM'
});

// Returns:
{
  dryRun: true,
  category: 'all',
  startedAt: '2025-10-24T10:00:00.000Z',
  completedAt: '2025-10-24T10:00:05.000Z',
  duration: 5000,
  expired: {
    consents: 30,
    submissions: 12,
    total: 42
  },
  deleted: {
    consents: 0, // 0 if dryRun
    submissions: 0,
    total: 0
  },
  errors: [],
  message: 'Dry run completed - no data was deleted'
}
```

**Cron Job Setup (recommended):**

```javascript
// In backend/server.js or separate cron service
const cron = require('node-cron');
const DataRetentionService = require('./services/DataRetentionService');

// Run every day at 2 AM
cron.schedule('0 2 * * *', async () => {
  logger.info('Starting scheduled data retention cleanup');

  try {
    const result = await DataRetentionService.scheduleAutoDeletion({
      category: 'all',
      dryRun: false, // Set to true for testing
      deletedBy: 'SYSTEM'
    });

    logger.info('Data retention cleanup completed', result);
  } catch (error) {
    logger.error('Data retention cleanup failed', error);
  }
});
```

---

### 7. getRetentionReport({ startDate, endDate })

**Generate retention compliance report**

```javascript
const report = await DataRetentionService.getRetentionReport({
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-10-24')
});

// Returns:
{
  generatedAt: '2025-10-24T10:00:00.000Z',
  period: {
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2025-10-24T00:00:00.000Z'
  },
  summary: {
    totalConsents: 1000,
    expiredConsents: 42,
    activeConsents: 958,
    totalSubmissions: 500,
    expiredSubmissions: 12,
    activeSubmissions: 488
  },
  byRetentionPeriod: {
    '2 years': 500,
    '6 months': 300,
    '90 days': 150,
    'permanent': 50
  },
  byForm: {
    'Customer Registration': {
      formId: 'uuid',
      totalConsents: 300
    },
    'Feedback Form': {
      formId: 'uuid',
      totalConsents: 200
    }
    // ... more forms
  },
  complianceRate: 95.8 // Percentage of active (non-expired) data
}
```

---

## Database Schema Changes

### Migration: 20251024000000-add-soft-delete-to-user-consents.js

Adds soft delete fields to `user_consents` table:

```sql
ALTER TABLE user_consents
  ADD COLUMN deleted_at TIMESTAMP NULL,
  ADD COLUMN deletion_reason TEXT NULL;

CREATE INDEX user_consents_deleted_at_idx ON user_consents(deleted_at);
```

**Usage in queries:**

```javascript
// Exclude soft-deleted consents
const activeConsents = await UserConsent.findAll({
  where: {
    deleted_at: null
  }
});

// Find only deleted consents
const deletedConsents = await UserConsent.findAll({
  where: {
    deleted_at: { [Op.ne]: null }
  }
});
```

---

## Integration Examples

### Example 1: Manual Cleanup from Admin Panel

```javascript
// Admin controller
async cleanupExpiredData(req, res) {
  try {
    // Get expired data for review
    const expiredData = await DataRetentionService.getExpiredData({
      category: 'all',
      page: 1,
      limit: 100
    });

    if (req.body.confirm) {
      // User confirmed deletion
      const result = await DataRetentionService.deleteExpiredData({
        dataIds: req.body.dataIds,
        category: 'all',
        reason: 'Manual cleanup by admin',
        deletedBy: req.user.id,
        hardDelete: false
      });

      res.json({
        success: true,
        deleted: result.deleted,
        audit: result.audit
      });
    } else {
      // Just show preview
      res.json({
        expiredData: expiredData.expiredData,
        total: expiredData.total
      });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

### Example 2: Automated Daily Cleanup

```javascript
// backend/jobs/dataRetentionJob.js
const cron = require('node-cron');
const DataRetentionService = require('../services/DataRetentionService');
const logger = require('../utils/logger.util');

function setupDataRetentionJob() {
  // Run every day at 2:00 AM Bangkok time
  cron.schedule('0 2 * * *', async () => {
    logger.info('=== Starting Daily Data Retention Cleanup ===');

    try {
      // Run dry run first for logging
      const dryRun = await DataRetentionService.scheduleAutoDeletion({
        category: 'all',
        dryRun: true,
        deletedBy: 'SYSTEM'
      });

      logger.info('Dry run results:', {
        expired: dryRun.expired,
        duration: dryRun.duration
      });

      // If there's data to delete, do actual deletion
      if (dryRun.expired.total > 0) {
        const result = await DataRetentionService.scheduleAutoDeletion({
          category: 'all',
          dryRun: false,
          deletedBy: 'SYSTEM'
        });

        logger.info('Cleanup completed:', {
          deleted: result.deleted,
          errors: result.errors.length
        });
      } else {
        logger.info('No expired data found - skipping cleanup');
      }

    } catch (error) {
      logger.error('Data retention job failed:', error);
    }

    logger.info('=== Data Retention Cleanup Completed ===');
  }, {
    timezone: 'Asia/Bangkok'
  });

  logger.info('Data retention cron job scheduled (2:00 AM daily)');
}

module.exports = { setupDataRetentionJob };
```

---

### Example 3: Compliance Dashboard

```javascript
// Admin dashboard endpoint
async getComplianceDashboard(req, res) {
  try {
    const report = await DataRetentionService.getRetentionReport({
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      endDate: new Date()
    });

    const expiredData = await DataRetentionService.getExpiredData({
      category: 'all',
      limit: 10
    });

    res.json({
      complianceReport: report,
      recentExpired: expiredData.expiredData.slice(0, 10),
      totalExpired: expiredData.total,
      complianceRate: report.complianceRate
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## Error Handling

The service handles errors gracefully:

```javascript
try {
  const result = await DataRetentionService.deleteExpiredData({
    dataIds: ['invalid-id'],
    category: 'consents',
    reason: 'Test',
    deletedBy: 'admin',
    hardDelete: false
  });

  // Check for failures
  if (result.failed.length > 0) {
    logger.warn('Some deletions failed:', result.failed);
  }

} catch (error) {
  // Critical errors (transaction failures, database errors)
  logger.error('Deletion failed completely:', error);
}
```

---

## Logging

All operations are logged using Winston:

```javascript
logger.info(`Found ${result.total} expired data items (category: ${category})`);
logger.info(`Deleted ${result.deleted} expired data items (soft delete)`);
logger.warn(`Invalid retention period format: ${retentionPeriod}`);
logger.error('Error getting expired data:', error);
logger.debug(`Created audit log for ${category} deletion: ${entityId}`);
```

---

## Telegram Notifications

When auto-deletion completes, admins receive a Telegram alert:

```
🗑️ PDPA Data Retention Cleanup Report

📅 Date: 24/10/2025, 02:00:00
⏱️ Duration: 5000ms

📊 Expired Data Found:
• Consents: 30
• Submissions: 12
• Total: 42

✅ Deleted:
• Consents: 30
• Submissions: 12
• Total: 42

✅ No errors

📋 Category: all
```

---

## Best Practices

### 1. Use Soft Delete by Default
```javascript
// ✅ Recommended
await DataRetentionService.deleteExpiredData({
  hardDelete: false // Soft delete
});

// ❌ Use with caution
await DataRetentionService.deleteExpiredData({
  hardDelete: true // Permanent deletion
});
```

### 2. Always Use Dry Run First
```javascript
// Test first
const dryRun = await DataRetentionService.scheduleAutoDeletion({
  dryRun: true
});

// Review results, then delete
if (dryRun.expired.total > 0) {
  const result = await DataRetentionService.scheduleAutoDeletion({
    dryRun: false
  });
}
```

### 3. Schedule During Off-Peak Hours
```javascript
// Run at 2 AM when traffic is low
cron.schedule('0 2 * * *', async () => {
  // Cleanup logic
});
```

### 4. Monitor Compliance Rate
```javascript
const report = await DataRetentionService.getRetentionReport();

if (report.complianceRate < 90) {
  logger.warn('Low compliance rate:', report.complianceRate);
  // Send alert to admins
}
```

### 5. Exclude Soft-Deleted Data from Queries
```javascript
// Always exclude deleted consents
const activeConsents = await UserConsent.findAll({
  where: {
    deleted_at: null // ✅ Important!
  }
});
```

---

## Testing

### Unit Tests
```javascript
describe('DataRetentionService', () => {
  it('should parse retention periods correctly', () => {
    const result = DataRetentionService._parseRetentionPeriod('2 years');
    expect(result).toEqual({ value: 2, unit: 'years' });
  });

  it('should calculate expiry dates', () => {
    const expiry = DataRetentionService.calculateRetentionExpiry(
      '2 years',
      new Date('2023-01-01')
    );
    expect(expiry.getFullYear()).toBe(2025);
  });

  it('should detect expired consents', async () => {
    const expired = await DataRetentionService.getExpiredConsents();
    expect(Array.isArray(expired)).toBe(true);
  });
});
```

### Integration Tests
```javascript
describe('Data Retention Integration', () => {
  it('should soft delete expired consents', async () => {
    const result = await DataRetentionService.deleteExpiredData({
      dataIds: [testConsentId],
      category: 'consents',
      hardDelete: false
    });

    expect(result.deleted).toBeGreaterThan(0);

    const consent = await UserConsent.findByPk(testConsentId);
    expect(consent.deleted_at).not.toBeNull();
  });
});
```

---

## Troubleshooting

### Issue: No expired data found
**Check:**
1. ConsentItem.retention_period is set correctly
2. UserConsent.consented_at dates are in the past
3. Retention period has actually expired

### Issue: Deletion fails
**Check:**
1. Database transaction errors in logs
2. Foreign key constraints (use soft delete)
3. User permissions (deletedBy user exists)

### Issue: Telegram notifications not working
**Check:**
1. TELEGRAM_BOT_TOKEN and TELEGRAM_GROUP_ID in .env
2. TelegramService.isInitialized === true
3. Bot has permission to send messages to group

---

## Security Considerations

1. **Access Control**: Only admins should access deletion endpoints
2. **Audit Trail**: All deletions are logged with user ID and timestamp
3. **Soft Delete First**: Use hard delete only when necessary
4. **Backup Before Delete**: Create backups before running hard deletes
5. **Rate Limiting**: Limit deletion API calls to prevent abuse

---

## Performance Optimization

1. **Pagination**: Always use pagination for large datasets
2. **Batch Processing**: Delete in batches (e.g., 100 items at a time)
3. **Indexes**: Use indexes on deleted_at and consented_at columns
4. **Caching**: Cache retention reports for dashboard views
5. **Background Jobs**: Run heavy deletions in background workers

---

## Version History

**v0.8.2-dev (2025-10-24)**
- Initial implementation
- Soft delete support for user_consents
- Retention period parsing
- Automated cleanup scheduling
- Telegram notifications
- Compliance reporting

---

## Future Enhancements

1. **Backup Before Delete**: Automatically create backups before deletion
2. **Restore Functionality**: Allow restoration of soft-deleted data
3. **Granular Permissions**: Role-based deletion permissions
4. **Advanced Scheduling**: Multiple schedules for different categories
5. **Analytics**: Track deletion trends and compliance over time
6. **Email Notifications**: In addition to Telegram
7. **Data Export**: Export expired data before deletion

---

## Support

For questions or issues:
- Check logs: `backend/logs/app.log`
- Review audit trail: `audit_logs` table
- Contact: Q-Collector Development Team

---

**Last Updated:** 2025-10-24
**Version:** v0.8.2-dev
**Author:** Q-Collector Team
