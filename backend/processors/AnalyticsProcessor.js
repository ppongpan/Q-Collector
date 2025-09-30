/**
 * Q-Collector Analytics Job Processor
 * Handles analytics calculation jobs in background queue
 */

const logger = require('../utils/logger.util');

class AnalyticsProcessor {
  /**
   * Calculate form statistics
   */
  static async calculateFormStats(job) {
    const { formId, dateRange } = job.data;
    const startTime = Date.now();

    try {
      logger.info(`Calculating form statistics for job ${job.id}`, {
        formId,
        dateRange,
      });

      await job.progress(10);

      // Get database models
      const db = require('../models');

      await job.progress(20);

      // Get form information
      const form = await db.Form.findByPk(formId, {
        include: [{ model: db.Field, as: 'fields' }],
      });

      if (!form) {
        throw new Error(`Form not found: ${formId}`);
      }

      await job.progress(30);

      // Build date filter
      const dateFilter = {};
      if (dateRange) {
        if (dateRange.start) {
          dateFilter[db.Sequelize.Op.gte] = new Date(dateRange.start);
        }
        if (dateRange.end) {
          dateFilter[db.Sequelize.Op.lte] = new Date(dateRange.end);
        }
      }

      await job.progress(40);

      // Calculate submission statistics
      const submissionStats = await this.calculateSubmissionStats(form, dateFilter, db);

      await job.progress(60);

      // Calculate field statistics
      const fieldStats = await this.calculateFieldStats(form, dateFilter, db);

      await job.progress(80);

      // Calculate response time statistics
      const responseTimeStats = await this.calculateResponseTimeStats(form, dateFilter, db);

      await job.progress(90);

      // Compile final statistics
      const stats = {
        formId,
        formTitle: form.title,
        calculatedAt: new Date().toISOString(),
        dateRange,
        submissions: submissionStats,
        fields: fieldStats,
        responseTimes: responseTimeStats,
        summary: {
          totalSubmissions: submissionStats.total,
          averageCompletionTime: responseTimeStats.averageMinutes,
          topFields: fieldStats.slice(0, 5).map(f => ({
            fieldKey: f.fieldKey,
            responseRate: f.responseRate,
          })),
        },
      };

      await job.progress(100);

      const processingTime = Date.now() - startTime;
      logger.info(`Form statistics calculated for job ${job.id}`, {
        formId,
        totalSubmissions: stats.submissions.total,
        processingTime,
      });

      return {
        success: true,
        stats,
        processingTime,
      };
    } catch (error) {
      logger.error(`Form statistics calculation failed for job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Calculate system-wide analytics
   */
  static async calculateSystemAnalytics(job) {
    const { period = 'month' } = job.data;
    const startTime = Date.now();

    try {
      logger.info(`Calculating system analytics for job ${job.id}`, {
        period,
      });

      await job.progress(10);

      // Get database models
      const db = require('../models');

      await job.progress(20);

      // Calculate date range based on period
      const dateRange = this.getDateRangeForPeriod(period);

      await job.progress(30);

      // Calculate user statistics
      const userStats = await this.calculateUserStats(dateRange, db);

      await job.progress(50);

      // Calculate form statistics
      const formStats = await this.calculateSystemFormStats(dateRange, db);

      await job.progress(70);

      // Calculate submission statistics
      const submissionStats = await this.calculateSystemSubmissionStats(dateRange, db);

      await job.progress(85);

      // Calculate performance metrics
      const performanceStats = await this.calculatePerformanceStats(dateRange, db);

      await job.progress(95);

      // Compile system analytics
      const analytics = {
        period,
        dateRange,
        calculatedAt: new Date().toISOString(),
        users: userStats,
        forms: formStats,
        submissions: submissionStats,
        performance: performanceStats,
        summary: {
          activeUsers: userStats.active,
          totalForms: formStats.total,
          totalSubmissions: submissionStats.total,
          avgSubmissionsPerForm: formStats.total > 0 ? submissionStats.total / formStats.total : 0,
        },
      };

      await job.progress(100);

      const processingTime = Date.now() - startTime;
      logger.info(`System analytics calculated for job ${job.id}`, {
        period,
        activeUsers: analytics.users.active,
        totalForms: analytics.forms.total,
        processingTime,
      });

      return {
        success: true,
        analytics,
        processingTime,
      };
    } catch (error) {
      logger.error(`System analytics calculation failed for job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Calculate user activity analytics
   */
  static async calculateUserActivity(job) {
    const { userId, dateRange } = job.data;
    const startTime = Date.now();

    try {
      logger.info(`Calculating user activity for job ${job.id}`, {
        userId,
        dateRange,
      });

      await job.progress(10);

      // Get database models
      const db = require('../models');

      await job.progress(20);

      // Get user information
      const user = await db.User.findByPk(userId);
      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      await job.progress(30);

      // Build date filter
      const dateFilter = {};
      if (dateRange) {
        if (dateRange.start) {
          dateFilter[db.Sequelize.Op.gte] = new Date(dateRange.start);
        }
        if (dateRange.end) {
          dateFilter[db.Sequelize.Op.lte] = new Date(dateRange.end);
        }
      }

      await job.progress(40);

      // Calculate form creation activity
      const formActivity = await this.calculateUserFormActivity(userId, dateFilter, db);

      await job.progress(60);

      // Calculate submission activity
      const submissionActivity = await this.calculateUserSubmissionActivity(userId, dateFilter, db);

      await job.progress(80);

      // Calculate login activity (if audit logs exist)
      const loginActivity = await this.calculateUserLoginActivity(userId, dateFilter, db);

      await job.progress(90);

      // Compile user activity
      const activity = {
        userId,
        username: user.username,
        calculatedAt: new Date().toISOString(),
        dateRange,
        forms: formActivity,
        submissions: submissionActivity,
        logins: loginActivity,
        summary: {
          formsCreated: formActivity.created,
          submissionsMade: submissionActivity.made,
          lastActivity: Math.max(
            formActivity.lastCreated || 0,
            submissionActivity.lastMade || 0,
            loginActivity.lastLogin || 0
          ),
        },
      };

      await job.progress(100);

      const processingTime = Date.now() - startTime;
      logger.info(`User activity calculated for job ${job.id}`, {
        userId,
        formsCreated: activity.forms.created,
        submissionsMade: activity.submissions.made,
        processingTime,
      });

      return {
        success: true,
        activity,
        processingTime,
      };
    } catch (error) {
      logger.error(`User activity calculation failed for job ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Calculate submission statistics
   */
  static async calculateSubmissionStats(form, dateFilter, db) {
    const whereClause = { form_id: form.id };
    if (Object.keys(dateFilter).length > 0) {
      whereClause.created_at = dateFilter;
    }

    const total = await db.Submission.count({ where: whereClause });

    const statusCounts = await db.Submission.findAll({
      where: whereClause,
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    const dailyCounts = await db.Submission.findAll({
      where: whereClause,
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'date'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
      ],
      group: [db.sequelize.fn('DATE', db.sequelize.col('created_at'))],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'ASC']],
      raw: true,
    });

    return {
      total,
      byStatus: statusCounts.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
      daily: dailyCounts.map(item => ({
        date: item.date,
        count: parseInt(item.count),
      })),
    };
  }

  /**
   * Calculate field statistics
   */
  static async calculateFieldStats(form, dateFilter, db) {
    const whereClause = {};
    if (Object.keys(dateFilter).length > 0) {
      whereClause['$submission.created_at$'] = dateFilter;
    }

    const fieldStats = await Promise.all(
      form.fields.map(async (field) => {
        const responseCount = await db.SubmissionData.count({
          where: {
            field_id: field.id,
            value: { [db.Sequelize.Op.ne]: null },
            ...whereClause,
          },
          include: [{
            model: db.Submission,
            as: 'submission',
            attributes: [],
          }],
        });

        const totalSubmissions = await db.Submission.count({
          where: { form_id: form.id, ...(whereClause['$submission.created_at$'] ? { created_at: whereClause['$submission.created_at$'] } : {}) },
        });

        return {
          fieldId: field.id,
          fieldKey: field.field_key,
          fieldType: field.field_type,
          responseCount,
          responseRate: totalSubmissions > 0 ? (responseCount / totalSubmissions) * 100 : 0,
        };
      })
    );

    return fieldStats.sort((a, b) => b.responseRate - a.responseRate);
  }

  /**
   * Calculate response time statistics
   */
  static async calculateResponseTimeStats(form, dateFilter, db) {
    const whereClause = { form_id: form.id };
    if (Object.keys(dateFilter).length > 0) {
      whereClause.created_at = dateFilter;
    }

    const submissions = await db.Submission.findAll({
      where: {
        ...whereClause,
        started_at: { [db.Sequelize.Op.ne]: null },
        completed_at: { [db.Sequelize.Op.ne]: null },
      },
      attributes: ['started_at', 'completed_at'],
      raw: true,
    });

    if (submissions.length === 0) {
      return {
        averageMinutes: 0,
        medianMinutes: 0,
        minMinutes: 0,
        maxMinutes: 0,
        count: 0,
      };
    }

    const durations = submissions.map(s => {
      const start = new Date(s.started_at);
      const end = new Date(s.completed_at);
      return (end - start) / (1000 * 60); // minutes
    });

    durations.sort((a, b) => a - b);

    return {
      averageMinutes: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      medianMinutes: durations[Math.floor(durations.length / 2)],
      minMinutes: durations[0],
      maxMinutes: durations[durations.length - 1],
      count: durations.length,
    };
  }

  /**
   * Calculate user statistics
   */
  static async calculateUserStats(dateRange, db) {
    const total = await db.User.count();

    const activeFilter = {};
    if (dateRange.start) {
      activeFilter.last_login = { [db.Sequelize.Op.gte]: dateRange.start };
    }

    const active = await db.User.count({ where: activeFilter });

    const byRole = await db.User.findAll({
      attributes: [
        'role',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
      ],
      group: ['role'],
      raw: true,
    });

    return {
      total,
      active,
      byRole: byRole.reduce((acc, item) => {
        acc[item.role] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }

  /**
   * Calculate system form statistics
   */
  static async calculateSystemFormStats(dateRange, db) {
    const whereClause = {};
    if (dateRange.start) {
      whereClause.created_at = { [db.Sequelize.Op.gte]: dateRange.start };
    }

    const total = await db.Form.count();
    const created = await db.Form.count({ where: whereClause });

    const byStatus = await db.Form.findAll({
      attributes: [
        'status',
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
      ],
      group: ['status'],
      raw: true,
    });

    return {
      total,
      created,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = parseInt(item.count);
        return acc;
      }, {}),
    };
  }

  /**
   * Calculate system submission statistics
   */
  static async calculateSystemSubmissionStats(dateRange, db) {
    const whereClause = {};
    if (dateRange.start) {
      whereClause.created_at = { [db.Sequelize.Op.gte]: dateRange.start };
    }

    const total = await db.Submission.count({ where: whereClause });

    const daily = await db.Submission.findAll({
      where: whereClause,
      attributes: [
        [db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'date'],
        [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count'],
      ],
      group: [db.sequelize.fn('DATE', db.sequelize.col('created_at'))],
      order: [[db.sequelize.fn('DATE', db.sequelize.col('created_at')), 'ASC']],
      raw: true,
    });

    return {
      total,
      daily: daily.map(item => ({
        date: item.date,
        count: parseInt(item.count),
      })),
    };
  }

  /**
   * Calculate performance statistics
   */
  static async calculatePerformanceStats(dateRange, db) {
    // This would typically pull from application logs or monitoring systems
    // For now, return mock data
    return {
      averageResponseTime: 250, // ms
      uptime: 99.9, // %
      errorRate: 0.1, // %
      requestsPerSecond: 10.5,
    };
  }

  /**
   * Get date range for period
   */
  static getDateRangeForPeriod(period) {
    const now = new Date();
    let start;

    switch (period) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { start, end: now };
  }

  /**
   * Calculate user form activity
   */
  static async calculateUserFormActivity(userId, dateFilter, db) {
    const whereClause = { created_by: userId };
    if (Object.keys(dateFilter).length > 0) {
      whereClause.created_at = dateFilter;
    }

    const created = await db.Form.count({ where: whereClause });

    const lastForm = await db.Form.findOne({
      where: { created_by: userId },
      order: [['created_at', 'DESC']],
      attributes: ['created_at'],
    });

    return {
      created,
      lastCreated: lastForm ? new Date(lastForm.created_at).getTime() : null,
    };
  }

  /**
   * Calculate user submission activity
   */
  static async calculateUserSubmissionActivity(userId, dateFilter, db) {
    const whereClause = { submitted_by: userId };
    if (Object.keys(dateFilter).length > 0) {
      whereClause.created_at = dateFilter;
    }

    const made = await db.Submission.count({ where: whereClause });

    const lastSubmission = await db.Submission.findOne({
      where: { submitted_by: userId },
      order: [['created_at', 'DESC']],
      attributes: ['created_at'],
    });

    return {
      made,
      lastMade: lastSubmission ? new Date(lastSubmission.created_at).getTime() : null,
    };
  }

  /**
   * Calculate user login activity
   */
  static async calculateUserLoginActivity(userId, dateFilter, db) {
    // This would typically pull from audit logs
    // For now, return mock data based on user's last_login
    const user = await db.User.findByPk(userId, {
      attributes: ['last_login'],
    });

    return {
      count: 0, // Would be calculated from audit logs
      lastLogin: user?.last_login ? new Date(user.last_login).getTime() : null,
    };
  }

  /**
   * Get processor function by job type
   */
  static getProcessor(jobType) {
    const processors = {
      'form-stats': this.calculateFormStats,
      'system-analytics': this.calculateSystemAnalytics,
      'user-activity': this.calculateUserActivity,
    };

    return processors[jobType];
  }
}

module.exports = AnalyticsProcessor;