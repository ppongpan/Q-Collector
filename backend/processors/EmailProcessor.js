/**
 * Q-Collector Email Job Processor
 * Handles email sending jobs in background queue
 */

const emailService = require('../services/EmailService');
const logger = require('../utils/logger.util');

class EmailProcessor {
  /**
   * Process single email job
   */
  static async processSingleEmail(job) {
    const { data } = job;
    const startTime = Date.now();

    try {
      logger.info(`Processing single email job ${job.id}`, {
        to: data.to,
        subject: data.subject,
      });

      // Update job progress
      await job.progress(10);

      // Validate email data
      if (!data.to || !data.subject) {
        throw new Error('Missing required email fields: to, subject');
      }

      await job.progress(30);

      // Send email
      const result = await emailService.sendEmail(data);

      await job.progress(80);

      // Log success
      logger.info(`Email sent successfully for job ${job.id}`, {
        messageId: result.messageId,
        to: data.to,
        processingTime: Date.now() - startTime,
      });

      await job.progress(100);

      return {
        success: true,
        messageId: result.messageId,
        processingTime: Date.now() - startTime,
        recipient: data.to,
      };
    } catch (error) {
      logger.error(`Email job ${job.id} failed:`, {
        error: error.message,
        to: data.to,
        processingTime: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Process batch email job
   */
  static async processBatchEmail(job) {
    const { emails, options = {} } = job.data;
    const startTime = Date.now();

    try {
      logger.info(`Processing batch email job ${job.id}`, {
        emailCount: emails.length,
        batchSize: options.batchSize || 10,
      });

      // Update job progress
      await job.progress(5);

      // Validate batch data
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        throw new Error('Invalid email batch data');
      }

      await job.progress(10);

      // Process batch with progress updates
      let completed = 0;
      const total = emails.length;

      const progressCallback = (increment) => {
        completed += increment;
        const progressPercent = Math.min(90, 10 + (completed / total) * 80);
        job.progress(progressPercent);
      };

      // Send batch emails with custom progress tracking
      const result = await this.sendBatchWithProgress(emails, options, progressCallback);

      await job.progress(95);

      // Log results
      logger.info(`Batch email job ${job.id} completed`, {
        total: result.total,
        successful: result.successful,
        failed: result.failed,
        processingTime: Date.now() - startTime,
      });

      await job.progress(100);

      return {
        ...result,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      logger.error(`Batch email job ${job.id} failed:`, {
        error: error.message,
        emailCount: emails ? emails.length : 0,
        processingTime: Date.now() - startTime,
      });

      throw error;
    }
  }

  /**
   * Send batch emails with progress tracking
   */
  static async sendBatchWithProgress(emails, options, progressCallback) {
    const batchSize = options.batchSize || 10;
    const delay = options.delay || 1000;
    const results = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      // Process batch in parallel
      const batchPromises = batch.map(async (email) => {
        try {
          const result = await emailService.sendEmail(email);
          return { success: true, result };
        } catch (error) {
          logger.error('Failed to send email in batch:', error);
          return { success: false, error: error.message };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(p => p.value || { success: false, error: p.reason?.message }));

      // Update progress
      if (progressCallback) {
        progressCallback(batch.length);
      }

      // Add delay between batches
      if (i + batchSize < emails.length && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return {
      total: emails.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Process welcome email job
   */
  static async processWelcomeEmail(job) {
    const { user } = job.data;

    try {
      logger.info(`Processing welcome email for user ${user.id}`);

      await job.progress(20);

      const emailData = {
        to: user.email,
        template: 'welcome',
        data: {
          name: user.first_name || user.username,
          username: user.username,
          email: user.email,
          department: user.department,
          role: user.role,
        },
      };

      await job.progress(50);

      const result = await emailService.sendEmail(emailData);

      await job.progress(100);

      logger.info(`Welcome email sent to ${user.email}`, {
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      logger.error(`Welcome email failed for user ${user.id}:`, error);
      throw error;
    }
  }

  /**
   * Process form submission notification email
   */
  static async processSubmissionNotification(job) {
    const { submission, form, recipients } = job.data;

    try {
      logger.info(`Processing submission notification for form ${form.id}`);

      await job.progress(10);

      if (!recipients || recipients.length === 0) {
        logger.warn(`No recipients for submission notification ${submission.id}`);
        return { skipped: true, reason: 'No recipients' };
      }

      await job.progress(30);

      const emails = recipients.map(recipient => ({
        to: recipient.email,
        template: 'form-submission',
        data: {
          formTitle: form.title,
          submissionId: submission.id,
          submittedBy: submission.submitted_by_name || 'Anonymous',
          submittedAt: new Date(submission.created_at).toLocaleString('th-TH'),
          formVersion: form.version || '1.0',
          hasAttachments: submission.has_attachments || false,
        },
      }));

      await job.progress(50);

      // Send as batch
      const result = await emailService.sendBatchEmails(emails, {
        batchSize: 5,
        delay: 500,
      });

      await job.progress(100);

      logger.info(`Submission notification emails sent for form ${form.id}`, {
        recipients: recipients.length,
        successful: result.successful,
        failed: result.failed,
      });

      return result;
    } catch (error) {
      logger.error(`Submission notification failed for form ${form.id}:`, error);
      throw error;
    }
  }

  /**
   * Process password reset email
   */
  static async processPasswordResetEmail(job) {
    const { user, resetToken, expiresAt } = job.data;

    try {
      logger.info(`Processing password reset email for user ${user.id}`);

      await job.progress(20);

      const emailData = {
        to: user.email,
        template: 'password-reset',
        data: {
          name: user.first_name || user.username,
          resetToken,
          expiresAt: new Date(expiresAt).toLocaleString('th-TH'),
        },
      };

      await job.progress(50);

      const result = await emailService.sendEmail(emailData);

      await job.progress(100);

      logger.info(`Password reset email sent to ${user.email}`, {
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      logger.error(`Password reset email failed for user ${user.id}:`, error);
      throw error;
    }
  }

  /**
   * Process export ready notification email
   */
  static async processExportNotification(job) {
    const { user, exportInfo } = job.data;

    try {
      logger.info(`Processing export notification for user ${user.id}`);

      await job.progress(20);

      const emailData = {
        to: user.email,
        template: 'export-ready',
        data: {
          name: user.first_name || user.username,
          exportType: exportInfo.type,
          fileFormat: exportInfo.format,
          recordsCount: exportInfo.recordsCount,
          fileSize: exportInfo.fileSize,
          generatedAt: new Date(exportInfo.generatedAt).toLocaleString('th-TH'),
        },
      };

      await job.progress(50);

      const result = await emailService.sendEmail(emailData);

      await job.progress(100);

      logger.info(`Export notification email sent to ${user.email}`, {
        messageId: result.messageId,
        exportType: exportInfo.type,
      });

      return result;
    } catch (error) {
      logger.error(`Export notification email failed for user ${user.id}:`, error);
      throw error;
    }
  }

  /**
   * Get processor function by job type
   */
  static getProcessor(jobType) {
    const processors = {
      'send': this.processSingleEmail,
      'batch': this.processBatchEmail,
      'welcome': this.processWelcomeEmail,
      'submission-notification': this.processSubmissionNotification,
      'password-reset': this.processPasswordResetEmail,
      'export-notification': this.processExportNotification,
    };

    return processors[jobType];
  }
}

module.exports = EmailProcessor;