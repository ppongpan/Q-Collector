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
const Translation = require('./Translation');
const APIUsage = require('./APIUsage');
const TelegramSettings = require('./TelegramSettings');
const FieldMigration = require('./FieldMigration');
const FieldDataBackup = require('./FieldDataBackup');
const SheetImportConfig = require('./SheetImportConfig');
const SheetImportHistory = require('./SheetImportHistory');
const GoogleAuthToken = require('./GoogleAuthToken');
const NotificationRule = require('./NotificationRule');
const NotificationHistory = require('./NotificationHistory');
const UserPreference = require('./UserPreference');
// PDPA Compliance Models
const ConsentItem = require('./ConsentItem');
const UserConsent = require('./UserConsent');
const PersonalDataField = require('./PersonalDataField');
const UnifiedUserProfile = require('./UnifiedUserProfile');
const DSRRequest = require('./DSRRequest');

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
  Translation: Translation(sequelize, Sequelize.DataTypes),
  APIUsage: APIUsage(sequelize, Sequelize.DataTypes),
  TelegramSettings: TelegramSettings(sequelize, Sequelize.DataTypes),
  FieldMigration: FieldMigration(sequelize, Sequelize.DataTypes),
  FieldDataBackup: FieldDataBackup(sequelize, Sequelize.DataTypes),
  SheetImportConfig: SheetImportConfig(sequelize, Sequelize.DataTypes),
  SheetImportHistory: SheetImportHistory(sequelize, Sequelize.DataTypes),
  GoogleAuthToken: GoogleAuthToken(sequelize, Sequelize.DataTypes),
  NotificationRule: NotificationRule(sequelize, Sequelize.DataTypes),
  NotificationHistory: NotificationHistory(sequelize, Sequelize.DataTypes),
  UserPreference: UserPreference(sequelize, Sequelize.DataTypes),
  // PDPA Compliance Models
  ConsentItem: ConsentItem(sequelize, Sequelize.DataTypes),
  UserConsent: UserConsent(sequelize, Sequelize.DataTypes),
  PersonalDataField: PersonalDataField(sequelize, Sequelize.DataTypes),
  UnifiedUserProfile: UnifiedUserProfile(sequelize, Sequelize.DataTypes),
  DSRRequest: DSRRequest(sequelize, Sequelize.DataTypes),
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
 * - hasMany SheetImportConfigs (user_id)
 * - hasMany SheetImportHistory (user_id)
 * - hasOne GoogleAuthToken (user_id)
 * - hasMany PersonalDataFields (confirmed_by)
 * - hasMany UserConsents (withdrawn_by)
 * - hasMany DSRRequests (processed_by)
 *
 * Form:
 * - belongsTo User (created_by)
 * - hasMany Fields
 * - hasMany SubForms
 * - hasMany Submissions
 * - hasMany SheetImportConfigs (form_id)
 * - hasMany SheetImportHistory (form_id)
 * - hasMany ConsentItems
 * - hasMany UserConsents
 * - hasMany PersonalDataFields
 *
 * SubForm:
 * - belongsTo Form
 * - hasMany Fields
 * - hasMany SheetImportConfigs (sub_form_id)
 *
 * Field:
 * - belongsTo Form
 * - belongsTo SubForm (nullable)
 * - hasMany SubmissionData
 * - hasMany Files
 * - hasMany PersonalDataFields
 *
 * Submission:
 * - belongsTo Form
 * - belongsTo User (submitted_by)
 * - hasMany SubmissionData
 * - hasMany Files
 * - hasMany UserConsents
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
 *
 * SheetImportConfig:
 * - belongsTo User (user_id)
 * - belongsTo Form (form_id)
 * - belongsTo SubForm (sub_form_id, nullable)
 * - hasMany SheetImportHistory (config_id)
 *
 * SheetImportHistory:
 * - belongsTo SheetImportConfig (config_id)
 * - belongsTo User (user_id)
 * - belongsTo Form (form_id)
 *
 * GoogleAuthToken:
 * - belongsTo User (user_id, one-to-one)
 *
 * NotificationRule:
 * - belongsTo Form (form_id, nullable)
 * - belongsTo SubForm (sub_form_id, nullable)
 * - belongsTo User (created_by)
 * - belongsTo User (updated_by)
 * - hasMany NotificationHistory (notification_rule_id)
 *
 * NotificationHistory:
 * - belongsTo NotificationRule (notification_rule_id)
 * - belongsTo Submission (submission_id, nullable)
 *
 * PDPA Compliance Models:
 *
 * ConsentItem:
 * - belongsTo Form
 * - hasMany UserConsents
 *
 * UserConsent:
 * - belongsTo Submission
 * - belongsTo ConsentItem
 * - belongsTo Form
 * - belongsTo User (withdrawn_by)
 *
 * PersonalDataField:
 * - belongsTo Form
 * - belongsTo Field
 * - belongsTo User (confirmed_by)
 *
 * UnifiedUserProfile:
 * - No direct associations (uses JSONB arrays)
 *
 * DSRRequest:
 * - belongsTo User (processed_by)
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