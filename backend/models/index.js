/**
 * Sequelize Models Initialization
 * This file initializes all models and sets up their associations
 */

const { sequelize, Sequelize } = require('../config/database.config');
const logger = require('../utils/logger.util');

// Import all models
const User = require('./User');
const Form = require('./Form');
const Field = require('./Field');
const SubForm = require('./SubForm');
const Submission = require('./Submission');
const SubmissionData = require('./SubmissionData');
const File = require('./File');
const AuditLog = require('./AuditLog');
const Session = require('./Session');

// Initialize models with sequelize instance
const models = {
  User: User(sequelize, Sequelize.DataTypes),
  Form: Form(sequelize, Sequelize.DataTypes),
  Field: Field(sequelize, Sequelize.DataTypes),
  SubForm: SubForm(sequelize, Sequelize.DataTypes),
  Submission: Submission(sequelize, Sequelize.DataTypes),
  SubmissionData: SubmissionData(sequelize, Sequelize.DataTypes),
  File: File(sequelize, Sequelize.DataTypes),
  AuditLog: AuditLog(sequelize, Sequelize.DataTypes),
  Session: Session(sequelize, Sequelize.DataTypes),
};

// Set up associations between models
Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

/**
 * Model Associations Summary:
 *
 * User:
 * - hasMany Forms (created_by)
 * - hasMany Submissions (submitted_by)
 * - hasMany Files (uploaded_by)
 * - hasMany AuditLogs
 * - hasMany Sessions
 *
 * Form:
 * - belongsTo User (created_by)
 * - hasMany Fields
 * - hasMany SubForms
 * - hasMany Submissions
 *
 * SubForm:
 * - belongsTo Form
 * - hasMany Fields
 *
 * Field:
 * - belongsTo Form
 * - belongsTo SubForm (nullable)
 * - hasMany SubmissionData
 * - hasMany Files
 *
 * Submission:
 * - belongsTo Form
 * - belongsTo User (submitted_by)
 * - hasMany SubmissionData
 * - hasMany Files
 *
 * SubmissionData:
 * - belongsTo Submission
 * - belongsTo Field
 *
 * File:
 * - belongsTo Submission
 * - belongsTo Field
 * - belongsTo User (uploaded_by)
 *
 * AuditLog:
 * - belongsTo User
 *
 * Session:
 * - belongsTo User
 */

// Add sequelize instance and Sequelize constructor to models
models.sequelize = sequelize;
models.Sequelize = Sequelize;

/**
 * Sync all models with database
 * Only use in development - use migrations in production
 */
models.syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    logger.info('All models synchronized successfully');
    return true;
  } catch (error) {
    logger.error('Error synchronizing models:', error);
    throw error;
  }
};

/**
 * Drop all tables and recreate (DANGEROUS - only for development)
 */
models.resetDatabase = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cannot reset database in production environment');
  }

  try {
    await sequelize.drop();
    logger.warn('All tables dropped');
    await sequelize.sync({ force: true });
    logger.info('Database reset complete');
    return true;
  } catch (error) {
    logger.error('Error resetting database:', error);
    throw error;
  }
};

module.exports = models;