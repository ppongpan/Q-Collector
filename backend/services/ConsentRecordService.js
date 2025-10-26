/**
 * ConsentRecordService
 * Manages consent records with digital signatures for PDPA compliance
 *
 * Purpose: Store and retrieve user consents linked to form submissions
 * Features:
 * - Save consents atomically with submissions
 * - Store digital signatures (base64 PNG)
 * - Record metadata for legal proof (IP, user-agent, timestamp)
 * - Link consents to consent items
 *
 * @version v0.8.2-dev
 * @date 2025-10-23
 */

const { UserConsent, ConsentItem, Form, Submission } = require('../models');
const logger = require('../utils/logger.util');

class ConsentRecordService {
  /**
   * Create consent records for a submission
   * This should be called within the same transaction as submission creation
   *
   * @param {Object} params
   * @param {string} params.submissionId - UUID of the submission
   * @param {string} params.formId - UUID of the form
   * @param {string|null} params.userId - UUID of the user (nullable for anonymous)
   * @param {Array} params.consents - Array of consent data
   * @param {string} params.consents[].consentItemId - UUID of consent item
   * @param {boolean} params.consents[].consentGiven - Whether consent was given
   * @param {string|null} params.signatureData - Base64 encoded signature (optional)
   * @param {string|null} params.fullName - Full name for identity verification (optional)
   * @param {string|null} params.ipAddress - Client IP address
   * @param {string|null} params.userAgent - Browser user agent
   * @param {boolean} params.privacyNoticeAccepted - Whether privacy notice was accepted
   * @param {string|null} params.privacyNoticeVersion - Version of privacy notice
   * @param {Object} params.transaction - Sequelize transaction object
   * @returns {Promise<Array>} Created consent records
   */
  async createConsentRecords({
    submissionId,
    formId,
    userId = null,
    consents = [],
    signatureData = null,
    fullName = null,
    ipAddress = null,
    userAgent = null,
    privacyNoticeAccepted = false,
    privacyNoticeVersion = null,
    transaction = null
  }) {
    try {
      if (!submissionId || !formId) {
        throw new Error('submissionId and formId are required');
      }

      if (!Array.isArray(consents) || consents.length === 0) {
        logger.info(`No consents to create for submission ${submissionId}`);
        return [];
      }

      // Validate all consent items exist
      const consentItemIds = consents.map(c => c.consentItemId);
      const existingItems = await ConsentItem.findAll({
        where: {
          id: consentItemIds,
          form_id: formId
        },
        transaction
      });

      if (existingItems.length !== consentItemIds.length) {
        throw new Error('One or more consent items not found or do not belong to this form');
      }

      // Create consent records
      const consentRecords = consents.map(consent => ({
        submission_id: submissionId,
        form_id: formId,
        user_id: userId,
        consent_item_id: consent.consentItemId,
        consent_given: consent.consentGiven,
        signature_data: signatureData,
        full_name: fullName,
        ip_address: ipAddress,
        user_agent: userAgent,
        consented_at: new Date(),
        privacy_notice_accepted: privacyNoticeAccepted,
        privacy_notice_version: privacyNoticeVersion
      }));

      const createdRecords = await UserConsent.bulkCreate(consentRecords, {
        transaction,
        returning: true
      });

      logger.info(`Created ${createdRecords.length} consent records for submission ${submissionId}`);
      return createdRecords;
    } catch (error) {
      logger.error('Error creating consent records:', error);
      throw error;
    }
  }

  /**
   * Get consent records for a submission
   *
   * @param {string} submissionId - UUID of the submission
   * @returns {Promise<Array>} Consent records with related data
   */
  async getConsentsBySubmission(submissionId) {
    try {
      const consents = await UserConsent.findAll({
        where: { submission_id: submissionId },
        include: [
          {
            model: ConsentItem,
            as: 'consentItem',
            attributes: ['id', 'title_th', 'title_en', 'purpose', 'retention_period']
          },
          {
            model: Form,
            as: 'form',
            attributes: ['id', 'title']
          }
        ],
        order: [['consented_at', 'ASC']]
      });

      return consents;
    } catch (error) {
      logger.error(`Error fetching consents for submission ${submissionId}:`, error);
      throw error;
    }
  }

  /**
   * Get consent records for a user
   *
   * @param {string} userId - UUID of the user
   * @param {Object} options - Query options
   * @param {string|null} options.formId - Filter by form ID
   * @param {boolean|null} options.consentGiven - Filter by consent given
   * @returns {Promise<Array>} Consent records
   */
  async getConsentsByUser(userId, options = {}) {
    try {
      const where = { user_id: userId };

      if (options.formId) {
        where.form_id = options.formId;
      }

      if (options.consentGiven !== undefined) {
        where.consent_given = options.consentGiven;
      }

      const consents = await UserConsent.findAll({
        where,
        include: [
          {
            model: ConsentItem,
            as: 'consentItem',
            attributes: ['id', 'title_th', 'title_en', 'purpose']
          },
          {
            model: Form,
            as: 'form',
            attributes: ['id', 'title']
          },
          {
            model: Submission,
            as: 'submission',
            attributes: ['id', 'created_at']
          }
        ],
        order: [['consented_at', 'DESC']]
      });

      return consents;
    } catch (error) {
      logger.error(`Error fetching consents for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get consent statistics for a form
   *
   * @param {string} formId - UUID of the form
   * @returns {Promise<Object>} Statistics object
   */
  async getConsentStatsByForm(formId) {
    try {
      return await UserConsent.getStatsByForm(formId);
    } catch (error) {
      logger.error(`Error fetching consent stats for form ${formId}:`, error);
      throw error;
    }
  }

  /**
   * Validate consent data before saving
   *
   * @param {Array} consents - Array of consent objects
   * @param {string} formId - UUID of the form
   * @returns {Promise<Object>} Validation result
   */
  async validateConsents(consents, formId) {
    try {
      const errors = [];

      if (!Array.isArray(consents)) {
        return { valid: false, errors: ['Consents must be an array'] };
      }

      // Get all consent items for the form
      const consentItems = await ConsentItem.findAll({
        where: {
          form_id: formId,
          is_active: true
        }
      });

      // Check required consents
      const requiredItems = consentItems.filter(item => item.required);
      const providedItemIds = consents.map(c => c.consentItemId);

      for (const requiredItem of requiredItems) {
        const consent = consents.find(c => c.consentItemId === requiredItem.id);
        if (!consent || !consent.consentGiven) {
          errors.push(`Required consent item "${requiredItem.title_th}" must be accepted`);
        }
      }

      // Validate each consent
      for (const consent of consents) {
        if (!consent.consentItemId) {
          errors.push('Each consent must have a consentItemId');
        }

        if (typeof consent.consentGiven !== 'boolean') {
          errors.push('consentGiven must be a boolean');
        }

        // Check if consent item exists and belongs to form
        const item = consentItems.find(ci => ci.id === consent.consentItemId);
        if (!item) {
          errors.push(`Consent item ${consent.consentItemId} not found or inactive`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        requiredCount: requiredItems.length,
        providedCount: consents.filter(c => c.consentGiven).length
      };
    } catch (error) {
      logger.error('Error validating consents:', error);
      throw error;
    }
  }

  /**
   * Check if submission has valid consents
   *
   * @param {string} submissionId - UUID of the submission
   * @returns {Promise<boolean>} True if all required consents are given
   */
  async hasValidConsents(submissionId) {
    try {
      const consents = await UserConsent.findAll({
        where: { submission_id: submissionId },
        include: [
          {
            model: ConsentItem,
            as: 'consentItem',
            where: { required: true }
          }
        ]
      });

      return consents.every(consent => consent.consent_given === true);
    } catch (error) {
      logger.error(`Error checking consents for submission ${submissionId}:`, error);
      throw error;
    }
  }

  /**
   * Get consents with digital signatures
   *
   * @param {string|null} formId - Filter by form ID (optional)
   * @returns {Promise<Array>} Consent records with signatures
   */
  async getConsentsWithSignatures(formId = null) {
    try {
      return await UserConsent.findWithSignatures(formId);
    } catch (error) {
      logger.error('Error fetching consents with signatures:', error);
      throw error;
    }
  }

  /**
   * Verify signature data format
   *
   * @param {string} signatureData - Base64 encoded signature
   * @returns {boolean} True if valid format
   */
  verifySignatureFormat(signatureData) {
    if (!signatureData) return false;

    // Check if it's a valid base64 string
    const base64Regex = /^data:image\/(png|jpeg|jpg);base64,/;
    if (!base64Regex.test(signatureData)) {
      return false;
    }

    // Check if base64 data exists after prefix
    const base64Data = signatureData.split(',')[1];
    return base64Data && base64Data.length > 0;
  }
}

module.exports = new ConsentRecordService();
