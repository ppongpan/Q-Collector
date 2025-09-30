/**
 * Q-Collector Email Service
 * Nodemailer-based email service with template support
 * Integrates with background queue processing
 */

const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger.util');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
    this.templates = new Map();
    this.config = {
      smtp: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true' || false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
        pool: true,
        maxConnections: parseInt(process.env.SMTP_MAX_CONNECTIONS) || 5,
        maxMessages: parseInt(process.env.SMTP_MAX_MESSAGES) || 100,
      },
      defaults: {
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        replyTo: process.env.EMAIL_REPLY_TO,
      },
      templatesDir: path.join(__dirname, '../templates/email'),
    };
  }

  /**
   * Initialize email service
   */
  async initialize() {
    try {
      logger.info('Initializing Email Service...');

      // Validate SMTP configuration
      this.validateConfig();

      // Create nodemailer transporter
      this.createTransporter();

      // Verify SMTP connection
      await this.verifyConnection();

      // Load email templates
      await this.loadTemplates();

      // Register Handlebars helpers
      this.registerHelpers();

      this.isInitialized = true;
      logger.info('Email Service initialized successfully');

      return true;
    } catch (error) {
      logger.error('Failed to initialize Email Service:', error);
      throw error;
    }
  }

  /**
   * Validate SMTP configuration
   */
  validateConfig() {
    if (!this.config.smtp.auth.user || !this.config.smtp.auth.pass) {
      throw new Error('SMTP credentials not configured');
    }

    if (!this.config.defaults.from) {
      throw new Error('Default sender email not configured');
    }
  }

  /**
   * Create nodemailer transporter
   */
  createTransporter() {
    this.transporter = nodemailer.createTransport(this.config.smtp);

    // Handle transporter events
    this.transporter.on('error', (error) => {
      logger.error('SMTP transporter error:', error);
    });

    this.transporter.on('idle', () => {
      logger.debug('SMTP transporter is idle');
    });
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified successfully');
    } catch (error) {
      logger.error('SMTP connection verification failed:', error);
      throw new Error(`SMTP verification failed: ${error.message}`);
    }
  }

  /**
   * Load email templates
   */
  async loadTemplates() {
    try {
      // Ensure templates directory exists
      await this.ensureTemplatesDirectory();

      // Create default templates if they don't exist
      await this.createDefaultTemplates();

      // Load all templates
      const templateFiles = await fs.readdir(this.config.templatesDir);
      const hbsFiles = templateFiles.filter(file => file.endsWith('.hbs'));

      for (const file of hbsFiles) {
        const templateName = path.basename(file, '.hbs');
        const templatePath = path.join(this.config.templatesDir, file);
        const templateContent = await fs.readFile(templatePath, 'utf-8');

        const compiledTemplate = handlebars.compile(templateContent);
        this.templates.set(templateName, compiledTemplate);

        logger.debug(`Loaded email template: ${templateName}`);
      }

      logger.info(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      logger.error('Failed to load email templates:', error);
      // Don't throw error, continue without templates
    }
  }

  /**
   * Ensure templates directory exists
   */
  async ensureTemplatesDirectory() {
    try {
      await fs.access(this.config.templatesDir);
    } catch (error) {
      await fs.mkdir(this.config.templatesDir, { recursive: true });
      logger.info(`Created templates directory: ${this.config.templatesDir}`);
    }
  }

  /**
   * Create default email templates
   */
  async createDefaultTemplates() {
    const defaultTemplates = {
      'welcome': {
        subject: 'Welcome to Q-Collector',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Welcome to Q-Collector</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f97316;">Welcome to Q-Collector!</h1>
        <p>Hello {{name}},</p>
        <p>Welcome to Q-Collector, your modern form builder and data collection platform.</p>
        <p>Your account has been created successfully with the following details:</p>
        <ul>
            <li><strong>Username:</strong> {{username}}</li>
            <li><strong>Email:</strong> {{email}}</li>
            <li><strong>Department:</strong> {{department}}</li>
            <li><strong>Role:</strong> {{role}}</li>
        </ul>
        <p>You can now log in and start creating forms and collecting data.</p>
        <p>If you have any questions, please don't hesitate to contact our support team.</p>
        <p>Best regards,<br>The Q-Collector Team</p>
    </div>
</body>
</html>`,
        text: `
Welcome to Q-Collector!

Hello {{name}},

Welcome to Q-Collector, your modern form builder and data collection platform.

Your account has been created successfully with the following details:
- Username: {{username}}
- Email: {{email}}
- Department: {{department}}
- Role: {{role}}

You can now log in and start creating forms and collecting data.

If you have any questions, please don't hesitate to contact our support team.

Best regards,
The Q-Collector Team
        `,
      },

      'form-submission': {
        subject: 'New Form Submission - {{formTitle}}',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Form Submission</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f97316;">New Form Submission</h1>
        <p>A new submission has been received for form: <strong>{{formTitle}}</strong></p>

        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Submission Details:</h3>
            <ul>
                <li><strong>Submission ID:</strong> {{submissionId}}</li>
                <li><strong>Submitted By:</strong> {{submittedBy}}</li>
                <li><strong>Submitted At:</strong> {{submittedAt}}</li>
                <li><strong>Form Version:</strong> {{formVersion}}</li>
            </ul>
        </div>

        {{#if hasAttachments}}
        <p><strong>Note:</strong> This submission includes file attachments.</p>
        {{/if}}

        <p>You can view the complete submission in your Q-Collector dashboard.</p>

        <p>Best regards,<br>Q-Collector System</p>
    </div>
</body>
</html>`,
        text: `
New Form Submission

A new submission has been received for form: {{formTitle}}

Submission Details:
- Submission ID: {{submissionId}}
- Submitted By: {{submittedBy}}
- Submitted At: {{submittedAt}}
- Form Version: {{formVersion}}

{{#if hasAttachments}}
Note: This submission includes file attachments.
{{/if}}

You can view the complete submission in your Q-Collector dashboard.

Best regards,
Q-Collector System
        `,
      },

      'password-reset': {
        subject: 'Password Reset Request - Q-Collector',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset Request</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f97316;">Password Reset Request</h1>
        <p>Hello {{name}},</p>
        <p>You have requested to reset your password for your Q-Collector account.</p>

        <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Reset Token:</strong> {{resetToken}}</p>
            <p><strong>Expires:</strong> {{expiresAt}}</p>
        </div>

        <p>Please use this token to reset your password. This token will expire in 1 hour for security reasons.</p>

        <p>If you did not request this password reset, please ignore this email.</p>

        <p>Best regards,<br>The Q-Collector Team</p>
    </div>
</body>
</html>`,
        text: `
Password Reset Request

Hello {{name}},

You have requested to reset your password for your Q-Collector account.

Reset Token: {{resetToken}}
Expires: {{expiresAt}}

Please use this token to reset your password. This token will expire in 1 hour for security reasons.

If you did not request this password reset, please ignore this email.

Best regards,
The Q-Collector Team
        `,
      },

      'export-ready': {
        subject: 'Data Export Ready - {{exportType}}',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Data Export Ready</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f97316;">Data Export Ready</h1>
        <p>Hello {{name}},</p>
        <p>Your requested data export is now ready for download.</p>

        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Export Details:</h3>
            <ul>
                <li><strong>Export Type:</strong> {{exportType}}</li>
                <li><strong>File Format:</strong> {{fileFormat}}</li>
                <li><strong>Records Count:</strong> {{recordsCount}}</li>
                <li><strong>File Size:</strong> {{fileSize}}</li>
                <li><strong>Generated At:</strong> {{generatedAt}}</li>
            </ul>
        </div>

        <p>The export file will be available for download for the next 7 days.</p>

        <p>You can download your export from the Q-Collector dashboard.</p>

        <p>Best regards,<br>Q-Collector System</p>
    </div>
</body>
</html>`,
        text: `
Data Export Ready

Hello {{name}},

Your requested data export is now ready for download.

Export Details:
- Export Type: {{exportType}}
- File Format: {{fileFormat}}
- Records Count: {{recordsCount}}
- File Size: {{fileSize}}
- Generated At: {{generatedAt}}

The export file will be available for download for the next 7 days.

You can download your export from the Q-Collector dashboard.

Best regards,
Q-Collector System
        `,
      },
    };

    for (const [templateName, template] of Object.entries(defaultTemplates)) {
      const templatePath = path.join(this.config.templatesDir, `${templateName}.hbs`);

      try {
        await fs.access(templatePath);
        // Template already exists, skip
      } catch (error) {
        // Template doesn't exist, create it
        await fs.writeFile(templatePath, template.html);
        logger.info(`Created default template: ${templateName}.hbs`);
      }
    }
  }

  /**
   * Register Handlebars helpers
   */
  registerHelpers() {
    // Date formatting helper
    handlebars.registerHelper('formatDate', (date, format = 'YYYY-MM-DD HH:mm:ss') => {
      if (!date) return '';
      return new Date(date).toLocaleString('th-TH');
    });

    // Conditional helper
    handlebars.registerHelper('ifCond', function(v1, operator, v2, options) {
      switch (operator) {
        case '==':
          return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
          return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '!=':
          return (v1 != v2) ? options.fn(this) : options.inverse(this);
        case '!==':
          return (v1 !== v2) ? options.fn(this) : options.inverse(this);
        case '<':
          return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
          return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
          return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
          return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        default:
          return options.inverse(this);
      }
    });

    // Uppercase helper
    handlebars.registerHelper('uppercase', (str) => {
      return str ? str.toString().toUpperCase() : '';
    });

    // Lowercase helper
    handlebars.registerHelper('lowercase', (str) => {
      return str ? str.toString().toLowerCase() : '';
    });

    logger.debug('Handlebars helpers registered');
  }

  /**
   * Send single email
   */
  async sendEmail(options) {
    if (!this.isInitialized) {
      throw new Error('Email Service not initialized');
    }

    try {
      const emailOptions = {
        from: options.from || this.config.defaults.from,
        to: options.to,
        cc: options.cc,
        bcc: options.bcc,
        replyTo: options.replyTo || this.config.defaults.replyTo,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
        headers: options.headers,
      };

      // Use template if specified
      if (options.template && options.data) {
        const renderedEmail = await this.renderTemplate(options.template, options.data);
        emailOptions.subject = renderedEmail.subject || emailOptions.subject;
        emailOptions.html = renderedEmail.html;
        emailOptions.text = renderedEmail.text;
      }

      const result = await this.transporter.sendMail(emailOptions);

      logger.info('Email sent successfully:', {
        messageId: result.messageId,
        to: emailOptions.to,
        subject: emailOptions.subject,
      });

      return {
        success: true,
        messageId: result.messageId,
        response: result.response,
      };
    } catch (error) {
      logger.error('Failed to send email:', error);
      throw error;
    }
  }

  /**
   * Send batch emails
   */
  async sendBatchEmails(emails, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Email Service not initialized');
    }

    const results = [];
    const batchSize = options.batchSize || 10;
    const delay = options.delay || 1000; // 1 second delay between batches

    logger.info(`Sending batch emails: ${emails.length} emails in batches of ${batchSize}`);

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      const batchResults = [];

      // Process batch in parallel
      const batchPromises = batch.map(async (email, index) => {
        try {
          const result = await this.sendEmail(email);
          return { index: i + index, success: true, result };
        } catch (error) {
          logger.error(`Failed to send email ${i + index}:`, error);
          return { index: i + index, success: false, error: error.message };
        }
      });

      const batchCompleted = await Promise.allSettled(batchPromises);
      batchResults.push(...batchCompleted.map(p => p.value || p.reason));

      results.push(...batchResults);

      // Add delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      logger.info(`Batch ${Math.floor(i / batchSize) + 1} completed`);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logger.info(`Batch email sending completed: ${successful} successful, ${failed} failed`);

    return {
      total: emails.length,
      successful,
      failed,
      results,
    };
  }

  /**
   * Render email template
   */
  async renderTemplate(templateName, data) {
    if (!this.templates.has(templateName)) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    try {
      const template = this.templates.get(templateName);
      const rendered = template(data);

      // Extract subject from rendered content if present
      const subjectMatch = rendered.match(/<title>(.*?)<\/title>/i);
      const subject = subjectMatch ? subjectMatch[1] : undefined;

      // Generate text version from HTML
      const text = this.htmlToText(rendered);

      return {
        subject,
        html: rendered,
        text,
      };
    } catch (error) {
      logger.error(`Failed to render template '${templateName}':`, error);
      throw error;
    }
  }

  /**
   * Convert HTML to plain text
   */
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim(); // Remove leading/trailing whitespace
  }

  /**
   * Validate email address
   */
  validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get email service status
   */
  async getStatus() {
    try {
      const status = {
        initialized: this.isInitialized,
        connected: false,
        templates: this.templates.size,
        config: {
          host: this.config.smtp.host,
          port: this.config.smtp.port,
          secure: this.config.smtp.secure,
          from: this.config.defaults.from,
        },
      };

      if (this.isInitialized) {
        try {
          await this.transporter.verify();
          status.connected = true;
        } catch (error) {
          status.connectionError = error.message;
        }
      }

      return status;
    } catch (error) {
      return {
        initialized: false,
        error: error.message,
      };
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const status = await this.getStatus();

      if (!status.initialized) {
        return { status: 'unhealthy', reason: 'Service not initialized' };
      }

      if (!status.connected) {
        return {
          status: 'unhealthy',
          reason: `SMTP connection failed: ${status.connectionError}`
        };
      }

      return {
        status: 'healthy',
        templates: status.templates,
        smtp: status.config,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        reason: error.message,
      };
    }
  }
}

// Export singleton instance
const emailService = new EmailService();

module.exports = emailService;