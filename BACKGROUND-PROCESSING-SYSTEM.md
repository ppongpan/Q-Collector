# Q-Collector Background Processing System

**Complete Queue & Background Job Processing Implementation**

## Overview

The Q-Collector backend now includes a comprehensive background processing system built with Bull.js and Redis, providing:

- **Asynchronous Job Processing** - Heavy tasks run in background
- **Email System** - SMTP-based email sending with templates
- **File Processing** - Image optimization, compression, cleanup
- **Data Export** - CSV, JSON, Excel export capabilities
- **Analytics Processing** - Statistics and reporting
- **System Maintenance** - Automated cleanup and backup jobs
- **Queue Monitoring** - Real-time dashboard and API endpoints

## Architecture

### Core Components

1. **QueueService** (`backend/services/QueueService.js`)
   - Bull.js queue management
   - Redis-based job storage
   - Queue monitoring and statistics
   - Job retry and failure handling

2. **EmailService** (`backend/services/EmailService.js`)
   - Nodemailer SMTP integration
   - Handlebars template engine
   - Batch email processing
   - HTML/text email support

3. **ProcessorService** (`backend/services/ProcessorService.js`)
   - Processor initialization and management
   - Recurring job scheduling
   - Convenience methods for common tasks

4. **Job Processors** (`backend/processors/`)
   - EmailProcessor - Email sending jobs
   - FileProcessor - File and image processing
   - ExportProcessor - Data export jobs
   - AnalyticsProcessor - Statistics calculation
   - SystemProcessor - Maintenance and cleanup

5. **Queue API** (`backend/api/routes/queue.routes.js`)
   - RESTful queue management endpoints
   - Job monitoring and control
   - Dashboard data aggregation

## Queue Types

### Email Queues
- `email:send` - Single email sending (concurrency: 5)
- `email:batch` - Batch email processing (concurrency: 2)

### File Processing Queues
- `file:process` - Image processing, compression (concurrency: 2)
- `file:cleanup` - File cleanup and maintenance (concurrency: 1)

### Data Export Queues
- `export:data` - CSV, JSON, Excel exports (concurrency: 1-2)

### Analytics Queues
- `analytics:calculate` - Statistics calculation (concurrency: 2)

### System Maintenance Queues
- `system:cleanup` - System cleanup tasks (concurrency: 1)
- `system:backup` - Backup operations (concurrency: 1)

## Job Types

### Email Jobs

#### Welcome Email
```javascript
await processorService.sendWelcomeEmail(user, options);
```

#### Form Submission Notification
```javascript
await processorService.sendSubmissionNotification(
  submission,
  form,
  recipients,
  options
);
```

#### Password Reset Email
```javascript
await processorService.sendPasswordResetEmail(
  user,
  resetToken,
  expiresAt,
  options
);
```

#### Batch Email
```javascript
const job = await queueService.addJob('email:batch', 'batch', {
  emails: [
    { to: 'user1@example.com', template: 'welcome', data: {...} },
    { to: 'user2@example.com', template: 'welcome', data: {...} }
  ],
  options: { batchSize: 10, delay: 1000 }
});
```

### File Processing Jobs

#### Image Processing
```javascript
await processorService.processImageUpload(
  filePath,
  outputDir,
  {
    generateThumbnails: true,
    thumbnailSizes: [
      { name: 'small', width: 150, height: 150 },
      { name: 'medium', width: 300, height: 300 }
    ],
    optimizeOriginal: true,
    generateWebP: true,
    quality: 85
  }
);
```

#### File Cleanup
```javascript
const job = await queueService.addJob('file:cleanup', 'cleanup', {
  files: ['/path/to/file1.jpg', '/path/to/file2.png'],
  olderThan: 24 * 60 * 60 * 1000 // 24 hours
});
```

#### File Compression
```javascript
const job = await queueService.addJob('file:process', 'compress', {
  inputFiles: ['/path/to/file1.txt', '/path/to/file2.pdf'],
  outputDir: '/path/to/archives',
  compressionLevel: 6
});
```

### Data Export Jobs

#### Form Submissions Export
```javascript
await processorService.exportFormSubmissions(
  formId,
  'csv', // or 'json', 'xlsx'
  {
    start: '2025-01-01',
    end: '2025-12-31'
  },
  options
);
```

#### Custom Data Export
```javascript
const job = await queueService.addJob('export:data', 'csv', {
  query: {
    model: 'Submission',
    options: {
      where: { form_id: 123 },
      include: [{ model: 'SubmissionData' }]
    }
  },
  fields: ['id', 'created_at', 'status'],
  outputPath: '/path/to/export.csv'
});
```

### Analytics Jobs

#### Form Statistics
```javascript
await processorService.calculateFormStats(
  formId,
  {
    start: '2025-01-01',
    end: '2025-12-31'
  }
);
```

#### System Analytics
```javascript
const job = await queueService.addJob('analytics:calculate', 'system-analytics', {
  period: 'month' // or 'day', 'week', 'quarter', 'year'
});
```

### System Maintenance Jobs

#### System Cleanup
```javascript
await processorService.triggerSystemCleanup([
  {
    type: 'temp_files',
    maxAge: 24 * 60 * 60 * 1000
  },
  {
    type: 'old_sessions',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
]);
```

#### Backup
```javascript
const job = await queueService.addJob('system:backup', 'backup', {
  type: 'manual',
  targets: [
    { type: 'database' },
    { type: 'uploads' },
    { type: 'logs' }
  ]
});
```

## API Endpoints

### Queue Management

#### Get All Queue Statistics
```http
GET /api/v1/queue/stats
Authorization: Bearer <token>
```

#### Get Specific Queue Statistics
```http
GET /api/v1/queue/{queueName}/stats
Authorization: Bearer <token>
```

#### Add Job to Queue
```http
POST /api/v1/queue/jobs
Authorization: Bearer <token>
Content-Type: application/json

{
  "queueName": "email:send",
  "jobType": "welcome",
  "data": {
    "user": { "id": 1, "email": "user@example.com" }
  },
  "options": {
    "priority": 5,
    "delay": 0
  }
}
```

#### Get Job Details
```http
GET /api/v1/queue/{queueName}/jobs/{jobId}
Authorization: Bearer <token>
```

#### Remove Job
```http
DELETE /api/v1/queue/{queueName}/jobs/{jobId}
Authorization: Bearer <token>
```

#### Pause/Resume Queue
```http
POST /api/v1/queue/{queueName}/pause
POST /api/v1/queue/{queueName}/resume
Authorization: Bearer <token>
```

#### Clean Queue
```http
POST /api/v1/queue/{queueName}/clean
Authorization: Bearer <token>
Content-Type: application/json

{
  "grace": 86400000
}
```

#### Queue Dashboard
```http
GET /api/v1/queue/dashboard
Authorization: Bearer <token>
```

### Health Checks

#### Queue Service Health
```http
GET /api/v1/queue/health
Authorization: Bearer <token>
```

#### Email Service Health
```http
GET /api/v1/queue/email/health
Authorization: Bearer <token>
```

## Email Templates

### Available Templates

1. **welcome** - Welcome email for new users
2. **form-submission** - Form submission notifications
3. **password-reset** - Password reset emails
4. **export-ready** - Data export completion notifications

### Template Variables

#### Welcome Template
```handlebars
{{name}} - User's display name
{{username}} - User's username
{{email}} - User's email
{{department}} - User's department
{{role}} - User's role
```

#### Form Submission Template
```handlebars
{{formTitle}} - Form title
{{submissionId}} - Submission ID
{{submittedBy}} - Submitter name
{{submittedAt}} - Submission timestamp
{{formVersion}} - Form version
{{hasAttachments}} - Boolean for attachments
```

#### Password Reset Template
```handlebars
{{name}} - User's display name
{{resetToken}} - Password reset token
{{expiresAt}} - Token expiration time
```

### Custom Templates

Templates are stored in `backend/templates/email/` as Handlebars (.hbs) files.

Example custom template:
```handlebars
<!DOCTYPE html>
<html>
<head>
    <title>{{subject}}</title>
</head>
<body>
    <h1>Hello {{name}}!</h1>
    <p>{{message}}</p>

    {{#if showButton}}
    <a href="{{buttonUrl}}" style="background: #f97316; color: white; padding: 10px 20px; text-decoration: none;">
        {{buttonText}}
    </a>
    {{/if}}

    <p>Generated at: {{formatDate generatedAt}}</p>
</body>
</html>
```

## Recurring Jobs

### Automatic Scheduling

The system automatically sets up recurring jobs:

1. **Daily Cleanup** (2:00 AM)
   - Temporary files cleanup
   - Old sessions removal
   - Log file rotation

2. **Weekly Backup** (3:00 AM Sunday)
   - Database backup
   - Uploads backup
   - Logs backup

3. **Analytics Calculation**
   - Daily analytics (1:00 AM daily)
   - Weekly analytics (1:00 AM Monday)
   - Monthly analytics (1:00 AM 1st of month)

4. **Health Checks** (Every 30 minutes)
   - Database health
   - Redis health
   - Email service health
   - Queue service health

5. **File Cleanup** (Every 6 hours)
   - Orphaned files removal
   - Temporary file cleanup

## Configuration

### Environment Variables

```bash
# Queue Service
ENABLE_QUEUE_SERVICE=true
REDIS_QUEUE_DB=1

# Email Service
ENABLE_EMAIL_SERVICE=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=Q-Collector <your-email@gmail.com>

# Processing Concurrency
EMAIL_CONCURRENCY=5
FILE_CONCURRENCY=2
EXPORT_CONCURRENCY=1
ANALYTICS_CONCURRENCY=2
SYSTEM_CONCURRENCY=1

# File Processing
TEMP_DIR=./temp
IMAGE_QUALITY=85
WEBP_QUALITY=80

# Export/Backup
EXPORT_DIR=./exports
BACKUP_DIR=./backups
EXPORT_RETENTION_DAYS=7
BACKUP_RETENTION_DAYS=30
```

## Monitoring & Observability

### Queue Dashboard

The queue dashboard provides:
- Real-time queue statistics
- Job counts by status (waiting, active, completed, failed)
- Processing time metrics
- System health status
- Queue performance graphs

### Health Checks

Health checks are available for:
- Queue service connectivity
- Email service SMTP connectivity
- Redis connection status
- Individual queue health

### Logging

All job processing is logged with:
- Job start/completion times
- Processing duration
- Success/failure status
- Error details for failed jobs
- Performance metrics

## Error Handling

### Job Retry Logic

- **Email jobs**: 3 attempts with exponential backoff
- **File processing**: 3 attempts with fixed delay
- **Export jobs**: 2 attempts with fixed delay
- **System jobs**: 1-2 attempts based on criticality

### Failure Recovery

- Failed jobs are retained for investigation
- Dead letter queue for permanently failed jobs
- Automatic cleanup of old failed jobs
- Email notifications for critical failures

### Graceful Degradation

- System continues without background processing if Redis unavailable
- Email service failures don't affect main application
- Queue service failures are logged but don't crash application

## Performance Optimizations

### Concurrency Control

- Different concurrency levels per job type
- CPU-intensive jobs (image processing) limited to 2 concurrent
- I/O-intensive jobs (email) allow higher concurrency (5)
- System jobs run sequentially to avoid conflicts

### Memory Management

- Automatic cleanup of completed jobs
- Configurable job retention periods
- Memory-efficient streaming for large exports
- Chunked processing for batch operations

### Redis Optimization

- Separate Redis database for queues (DB 1)
- Connection pooling for better performance
- Efficient job serialization
- Automatic key expiration for old jobs

## Usage Examples

### Send Welcome Email After User Registration

```javascript
// In user registration handler
const user = await User.create(userData);

// Queue welcome email
await processorService.sendWelcomeEmail(user, {
  priority: 8, // High priority
  delay: 5000  // 5 second delay
});
```

### Process Uploaded Images

```javascript
// In file upload handler
const uploadedFile = req.file;

await processorService.processImageUpload(
  uploadedFile.path,
  path.join('uploads', 'processed'),
  {
    generateThumbnails: true,
    optimizeOriginal: true,
    generateWebP: true
  }
);
```

### Export Form Data

```javascript
// In export handler
const job = await processorService.exportFormSubmissions(
  formId,
  'xlsx',
  {
    start: req.query.startDate,
    end: req.query.endDate
  }
);

// Return job ID to client for tracking
res.json({ jobId: job.id });
```

### Schedule Custom Analytics

```javascript
// Calculate form statistics
await processorService.calculateFormStats(
  formId,
  { start: '2025-01-01', end: '2025-12-31' }
);
```

## Integration with Frontend

### Job Status Tracking

Frontend can track job progress:

```javascript
// Check job status
const response = await fetch(`/api/v1/queue/email:send/jobs/${jobId}`, {
  headers: { Authorization: `Bearer ${token}` }
});

const job = await response.json();
console.log(`Job progress: ${job.data.progress}%`);
```

### Queue Dashboard Integration

```javascript
// Get dashboard data
const dashboard = await fetch('/api/v1/queue/dashboard');
const data = await dashboard.json();

// Display queue statistics
console.log(`Active jobs: ${data.overview.activeJobs}`);
console.log(`Completed jobs: ${data.overview.completedJobs}`);
```

## Security Considerations

### Authentication & Authorization

- All queue API endpoints require authentication
- Admin/Super Admin roles required for queue management
- Job data includes user context for security

### Data Protection

- Email templates sanitized to prevent XSS
- File processing with virus scanning support
- Export data access controlled by user permissions
- Backup encryption for sensitive data

### Rate Limiting

- Built-in queue concurrency limits
- SMTP rate limiting to prevent abuse
- Export job throttling for system protection

## Troubleshooting

### Common Issues

1. **Queue Service Won't Start**
   - Check Redis connection
   - Verify REDIS_QUEUE_DB setting
   - Check Redis authentication

2. **Email Jobs Failing**
   - Verify SMTP credentials
   - Check SMTP server connectivity
   - Review email template syntax

3. **File Processing Errors**
   - Check file permissions
   - Verify Sharp installation
   - Review file path configurations

4. **Export Jobs Timing Out**
   - Increase job timeout settings
   - Reduce export data size
   - Check database performance

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug
```

### Queue Monitoring

Monitor queue health:
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/v1/queue/health
```

## Future Enhancements

### Planned Features

1. **Bull Board Integration** - Web UI for queue monitoring
2. **Job Scheduling UI** - Frontend for managing recurring jobs
3. **Advanced Analytics** - Real-time processing metrics
4. **Webhook Integration** - Job completion callbacks
5. **Multi-tenant Queues** - Organization-specific queues
6. **Job Dependencies** - Chain related jobs
7. **Priority Queues** - Advanced priority management
8. **Distributed Processing** - Multi-server queue processing

### Performance Improvements

1. **Queue Sharding** - Distribute load across multiple Redis instances
2. **Worker Scaling** - Dynamic worker scaling based on load
3. **Memory Optimization** - Reduce memory footprint for large jobs
4. **Batch Processing** - More efficient batch job handling

---

## Summary

The Q-Collector background processing system provides a robust, scalable solution for handling asynchronous tasks. With comprehensive email support, file processing capabilities, data export functionality, and system maintenance automation, it significantly enhances the application's capabilities while maintaining performance and reliability.

**Key Benefits:**
- ✅ **Scalable** - Handle thousands of background jobs
- ✅ **Reliable** - Built-in retry and error handling
- ✅ **Monitored** - Real-time dashboard and health checks
- ✅ **Flexible** - Easy to add new job types and processors
- ✅ **Performant** - Optimized for high throughput
- ✅ **Secure** - Authentication and authorization built-in

The system is production-ready and provides a solid foundation for handling Q-Collector's background processing needs.