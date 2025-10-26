/**
 * UnifiedUserProfileService
 * Manages unified user profiles for Personal Data Management Dashboard
 *
 * Purpose: Aggregate data subjects across forms for PDPA compliance
 * Features:
 * - List all data subjects with pagination and search
 * - Get comprehensive profile details with all related data
 * - Dashboard statistics for PDPA compliance monitoring
 * - Export user data in JSON format (GDPR/PDPA Article 20 - Right to Data Portability)
 * - Merge duplicate profiles with audit trail
 * - Find potential duplicates using email/phone/name matching
 *
 * @version v0.8.2-dev
 * @date 2025-10-24
 */

const {
  UnifiedUserProfile,
  Submission,
  SubmissionData,
  UserConsent,
  PersonalDataField,
  DSRRequest,
  Form,
  Field,
  ConsentItem,
  User
} = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger.util');
const { sequelize, Sequelize } = require('../config/database.config');
const DataRetentionService = require('./DataRetentionService');

class UnifiedUserProfileService {
  /**
   * Get all profiles with pagination and search
   *
   * @param {Object} options - Query options
   * @param {number} options.page - Page number (1-indexed)
   * @param {number} options.limit - Items per page (default: 20, max: 100)
   * @param {string|null} options.search - Search by email, phone, or name
   * @param {string} options.sortBy - Sort field (default: 'last_submission_date')
   * @param {string} options.sortOrder - Sort order ('ASC' or 'DESC', default: 'DESC')
   * @returns {Promise<Object>} { profiles, total, totalPages, page, limit }
   */
  async getAllProfiles({ page = 1, limit = 20, search = null, sortBy = 'last_submission_date', sortOrder = 'DESC' }) {
    try {
      // Validate and sanitize inputs
      const validPage = Math.max(1, parseInt(page, 10) || 1);
      const validLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
      const offset = (validPage - 1) * validLimit;
      const validSortOrder = ['ASC', 'DESC'].includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

      // Allowed sort fields
      const allowedSortFields = [
        'total_submissions',
        'last_submission_date',
        'first_submission_date',
        'created_at',
        'updated_at',
        'primary_email',
        'full_name'
      ];
      const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'last_submission_date';

      // Build where clause for search
      const where = {};
      if (search && search.trim()) {
        const searchTerm = search.trim();
        where[Op.or] = [
          { primary_email: { [Op.iLike]: `%${searchTerm}%` } },
          { primary_phone: { [Op.iLike]: `%${searchTerm}%` } },
          { full_name: { [Op.iLike]: `%${searchTerm}%` } },
          Sequelize.where(
            Sequelize.cast(Sequelize.col('linked_emails'), 'text'),
            { [Op.iLike]: `%${searchTerm}%` }
          ),
          Sequelize.where(
            Sequelize.cast(Sequelize.col('linked_phones'), 'text'),
            { [Op.iLike]: `%${searchTerm}%` }
          )
        ];
      }

      // Query profiles with counts
      const { count, rows } = await UnifiedUserProfile.findAndCountAll({
        where,
        order: [[validSortBy, validSortOrder]],
        limit: validLimit,
        offset
        // ⚠️ TODO: Fix consent_count query - user_consents table doesn't have user_email/user_phone columns
        // attributes: {
        //   include: [
        //     // Add consent count as virtual field
        //     [
        //       Sequelize.literal(`(
        //         SELECT COUNT(DISTINCT uc.id)
        //         FROM user_consents uc
        //         WHERE uc.user_email IN (
        //           SELECT jsonb_array_elements_text("UnifiedUserProfile"."linked_emails")
        //         )
        //         OR uc.user_phone IN (
        //           SELECT jsonb_array_elements_text("UnifiedUserProfile"."linked_phones")
        //         )
        //       )`),
        //       'consent_count'
        //     ]
        //   ]
        // }
      });

      const totalPages = Math.ceil(count / validLimit);

      logger.info(`Retrieved ${rows.length} profiles (page ${validPage}/${totalPages}, total: ${count})`);

      // ✅ v0.8.5: Use formIds (camelCase from toJSON()) directly (already populated)
      return {
        profiles: rows.map(profile => {
          const profileJson = profile.toJSON();
          return {
            ...profileJson,
            formCount: profileJson.formIds ? profileJson.formIds.length : 0,
            totalForms: profileJson.formIds ? profileJson.formIds.length : 0
          };
        }),
        total: count,
        totalPages,
        page: validPage,
        limit: validLimit
      };
    } catch (error) {
      logger.error('Error getting all profiles:', error);
      throw error;
    }
  }

  /**
   * Get PII field values for a submission
   * @private
   * @param {string} submissionId - Submission ID
   * @param {string} formId - Form ID
   * @returns {Promise<Array>} Array of PII field data with values
   */
  async _getPIIDataForSubmission(submissionId, formId) {
    try {
      // Get all PII field IDs for this form
      const piiFields = await PersonalDataField.findAll({
        where: { form_id: formId },
        include: [
          {
            model: Field,
            as: 'field',
            attributes: ['id', 'title', 'type']
          }
        ]
      });

      if (piiFields.length === 0) return [];

      const piiFieldIds = piiFields.map(pf => pf.field_id);

      // Get submission data for PII fields only
      const submissionData = await SubmissionData.findAll({
        where: {
          submission_id: submissionId,
          field_id: { [Op.in]: piiFieldIds }
        },
        include: [
          {
            model: Field,
            as: 'field',
            attributes: ['id', 'title', 'type']
          }
        ]
      });

      // Map to structured format with decrypted values
      return submissionData.map(sd => ({
        fieldId: sd.field_id,
        fieldTitle: sd.field?.title || 'Unknown Field',
        fieldType: sd.field?.type || 'unknown',
        value: sd.getDecryptedValue(), // Use the model's decrypt method
        isEncrypted: sd.is_encrypted
      }));
    } catch (error) {
      logger.error(`Error getting PII data for submission ${submissionId}:`, error);
      return [];
    }
  }

  /**
   * Get detailed profile with all related data
   *
   * @param {string} profileId - UUID of the profile
   * @returns {Promise<Object>} Comprehensive profile object
   */
  async getProfileDetail(profileId) {
    try {
      // Get base profile
      const profile = await UnifiedUserProfile.findByPk(profileId);

      if (!profile) {
        throw new Error(`Profile not found: ${profileId}`);
      }

      // Get all submissions using submission_ids array
      const submissions = await Submission.findAll({
        where: {
          id: { [Op.in]: profile.submission_ids }
        },
        include: [
          {
            model: Form,
            as: 'form',
            attributes: ['id', 'title', 'table_name']
          }
        ],
        order: [['submitted_at', 'DESC']]
      });

      // Get all consents using linked emails/phones
      const consents = await this._getConsentsForProfile(profile);

      // Get all personal data fields from forms this user has submitted
      const personalDataFields = await this._getPersonalDataFieldsForProfile(profile);

      // Get all DSR requests using linked emails/phones
      const dsrRequests = await this._getDSRRequestsForProfile(profile);

      // Calculate consent compliance percentage
      const consentStats = this._calculateConsentCompliance(consents);

      // Count total PII fields across all submissions
      const totalPIIFields = this._countPIIFields(submissions, personalDataFields);

      // Enrich submissions with PII field values
      const enrichedSubmissions = await Promise.all(
        submissions.map(async (s) => {
          const submissionJson = s.toJSON();
          const piiData = await this._getPIIDataForSubmission(s.id, s.form_id);

          return {
            ...submissionJson,
            piiFieldValues: piiData, // Add PII field values array
            piiFieldCount: piiData.length
          };
        })
      );

      // ✅ v0.8.5: Group submissions by form WITH consent items and signatures
      const formMap = new Map();

      for (const submission of enrichedSubmissions) {
        const formId = submission.form_id;

        if (!formMap.has(formId)) {
          formMap.set(formId, {
            formId,
            formTitle: submission.form?.title || 'ไม่ระบุชื่อฟอร์ม',
            formTableName: submission.form?.table_name,
            submissionCount: 0,
            submissions: [],
            latestSubmission: null,
            firstSubmission: null,
            consentItems: [], // ✅ NEW: Consent items for this form
            signatures: [] // ✅ NEW: Digital signatures
          });
        }

        const formGroup = formMap.get(formId);
        formGroup.submissionCount++;
        formGroup.submissions.push(submission);

        // Track latest and first submissions
        const submittedAt = new Date(submission.submitted_at || submission.submittedAt);
        if (!formGroup.latestSubmission || submittedAt > new Date(formGroup.latestSubmission.submitted_at || formGroup.latestSubmission.submittedAt)) {
          formGroup.latestSubmission = submission;
        }
        if (!formGroup.firstSubmission || submittedAt < new Date(formGroup.firstSubmission.submitted_at || formGroup.firstSubmission.submittedAt)) {
          formGroup.firstSubmission = submission;
        }

        // ✅ v0.8.5: Add consent items from this submission
        const submissionConsents = await UserConsent.findAll({
          where: { submission_id: submission.id },
          include: [
            {
              model: ConsentItem,
              as: 'consentItem',
              attributes: ['id', 'title_th', 'title_en', 'description_th', 'description_en', 'purpose', 'retention_period'] // ✅ v0.8.5: Thai/English descriptions
            }
          ]
        });

        submissionConsents.forEach(consent => {
          // Check if this consent item already exists in formGroup
          const existingIndex = formGroup.consentItems.findIndex(
            ci => ci.consentItemId === consent.consent_item_id
          );

          const consentData = {
            consentItemId: consent.consent_item_id,
            consentItemTitle: consent.consentItem?.title_th || consent.consentItem?.title_en || 'ไม่ระบุ',
            consentItemDescription: consent.consentItem?.description_th || consent.consentItem?.description_en, // ✅ v0.8.5: Thai/English descriptions
            purpose: consent.consentItem?.purpose,
            retentionPeriod: consent.consentItem?.retention_period,
            consentGiven: consent.consent_given,
            consentedAt: consent.consented_at,
            submissionId: submission.id,
            // ✅ Signature data
            hasSignature: !!consent.signature_data,
            signatureDataUrl: consent.signature_data, // Keep frontend-friendly name
            fullName: consent.full_name,
            ipAddress: consent.ip_address,
            userAgent: consent.user_agent
          };

          if (existingIndex === -1) {
            // First time seeing this consent item
            formGroup.consentItems.push({
              ...consentData,
              timesGiven: consent.consent_given ? 1 : 0,
              timesTotal: 1,
              latestConsentDate: consent.consented_at,
              allConsents: [consentData] // Track all instances
            });
          } else {
            // Update existing consent item stats
            const existing = formGroup.consentItems[existingIndex];
            existing.timesTotal++;
            if (consent.consent_given) existing.timesGiven++;
            existing.allConsents.push(consentData);

            // Update latest consent date
            if (new Date(consent.consented_at) > new Date(existing.latestConsentDate)) {
              existing.latestConsentDate = consent.consented_at;
              existing.consentGiven = consent.consent_given; // Use latest status
              // Update signature info if latest has signature
              if (consentData.hasSignature) {
                existing.hasSignature = true;
                existing.signatureDataUrl = consentData.signatureDataUrl;
                existing.fullName = consentData.fullName;
                existing.ipAddress = consentData.ipAddress;
                existing.userAgent = consentData.userAgent;
              }
            }
          }
        });

        // ✅ v0.8.5: Track signatures (latest submission only to avoid duplicates)
        if (submissionConsents.length > 0) {
          const latestSignature = submissionConsents.find(c => !!c.signature_data);
          if (latestSignature) {
            // Only add if not already added for this submission
            const signatureExists = formGroup.signatures.some(s => s.submissionId === submission.id);
            if (!signatureExists) {
              formGroup.signatures.push({
                submissionId: submission.id,
                signatureDataUrl: latestSignature.signature_data, // Keep frontend-friendly name
                fullName: latestSignature.full_name,
                consentedAt: latestSignature.consented_at,
                ipAddress: latestSignature.ip_address,
                userAgent: latestSignature.user_agent
              });
            }
          }
        }
      }

      const uniqueForms = Array.from(formMap.values());

      // Build comprehensive profile object
      const detailedProfile = {
        ...profile.toJSON(),
        submissions: enrichedSubmissions, // Keep all submissions for detail view
        uniqueForms, // ✅ v0.8.4: Add grouped forms summary
        consents, // ✅ v0.8.5: Already plain objects from _getConsentsForProfile()
        personalDataFields: personalDataFields.map(f => f.toJSON()),
        dsrRequests: dsrRequests.map(r => r.toJSON()),
        statistics: {
          totalSubmissions: profile.total_submissions,
          totalForms: uniqueForms.length, // ✅ v0.8.4: Count unique forms
          totalConsents: consents.length,
          consentCompliance: consentStats.compliancePercentage,
          consentsGiven: consentStats.given,
          consentsDenied: consentStats.denied,
          totalPIIFields: totalPIIFields,
          activeDSRRequests: dsrRequests.filter(r => ['pending', 'in_progress'].includes(r.status)).length,
          completedDSRRequests: dsrRequests.filter(r => r.status === 'completed').length,
          firstSubmissionDate: profile.first_submission_date,
          lastSubmissionDate: profile.last_submission_date,
          matchConfidence: parseFloat(profile.match_confidence),
          isMerged: profile.merged_from_ids.length > 0,
          mergedProfilesCount: profile.merged_from_ids.length
        }
      };

      logger.info(`Retrieved detailed profile for ${profileId}`);
      return detailedProfile;
    } catch (error) {
      logger.error(`Error getting profile detail for ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Get dashboard statistics for PDPA compliance monitoring
   *
   * @returns {Promise<Object>} Dashboard statistics
   */
  async getDashboardStats() {
    try {
      // Total data subjects count
      const dataSubjects = await UnifiedUserProfile.count();

      // Total consents given (distinct consents)
      const consentsGiven = await UserConsent.count({
        where: { consent_given: true }
      });

      // Total consents denied
      const consentsDenied = await UserConsent.count({
        where: { consent_given: false }
      });

      // Pending DSR requests
      const pendingDSR = await DSRRequest.count({
        where: {
          status: { [Op.in]: ['pending', 'in_progress'] }
        }
      });

      // Overdue DSR requests
      const overdueDSR = await DSRRequest.count({
        where: {
          deadline_date: { [Op.lt]: new Date() },
          status: { [Op.notIn]: ['completed', 'rejected', 'cancelled'] }
        }
      });

      // Data to be deleted (consents and submissions with retention period expired)
      const retentionData = await DataRetentionService.getExpiredData({
        category: 'all',
        limit: 1 // We only need the counts, not the actual data
      });

      // Recent submissions count (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentSubmissions = await Submission.count({
        where: {
          submitted_at: { [Op.gte]: thirtyDaysAgo }
        }
      });

      // Total forms with PDPA features enabled
      const formsWithConsents = await Form.count({
        include: [{
          model: ConsentItem,
          as: 'consentItems',
          required: true
        }]
      });

      // Sensitive data fields count
      const sensitiveFields = await PersonalDataField.count({
        where: { is_sensitive: true }
      });

      const stats = {
        dataSubjects,
        consents: {
          total: consentsGiven + consentsDenied,
          given: consentsGiven,
          denied: consentsDenied,
          complianceRate: consentsGiven + consentsDenied > 0
            ? ((consentsGiven / (consentsGiven + consentsDenied)) * 100).toFixed(2)
            : 0
        },
        dsrRequests: {
          pending: pendingDSR,
          overdue: overdueDSR
        },
        dataRetention: {
          total: retentionData.total,
          expiredConsents: retentionData.byCategory.consents,
          expiredSubmissions: retentionData.byCategory.submissions,
          oldestExpiry: retentionData.oldestExpiry,
          newestExpiry: retentionData.newestExpiry
        },
        activity: {
          recentSubmissions,
          formsWithConsents,
          sensitiveFields
        }
      };

      logger.info('Retrieved dashboard statistics');
      return stats;
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Export all data for a user profile (GDPR/PDPA Right to Data Portability)
   *
   * @param {string} profileId - UUID of the profile
   * @param {string} format - Export format ('json' or 'csv' - CSV in phase 2)
   * @returns {Promise<Object>} Formatted data ready for download
   */
  async exportUserData(profileId, format = 'json') {
    try {
      if (format !== 'json') {
        throw new Error('Only JSON format is currently supported');
      }

      // Get comprehensive profile data
      const profileData = await this.getProfileDetail(profileId);

      // Build export object compliant with PDPR/PDPA Article 20
      const exportData = {
        exportMetadata: {
          exportDate: new Date().toISOString(),
          exportVersion: '1.0',
          dataSubjectId: profileId,
          exportFormat: format
        },
        personalInformation: {
          primaryEmail: profileData.primaryEmail,
          primaryPhone: profileData.primaryPhone,
          fullName: profileData.fullName,
          linkedEmails: profileData.linkedEmails,
          linkedPhones: profileData.linkedPhones,
          linkedNames: profileData.linkedNames,
          matchConfidence: profileData.matchConfidence,
          firstSubmissionDate: profileData.firstSubmissionDate,
          lastSubmissionDate: profileData.lastSubmissionDate
        },
        submissions: profileData.submissions.map(submission => ({
          id: submission.id,
          formId: submission.formId,
          formTitle: submission.form?.title,
          submittedAt: submission.submittedAt,
          status: submission.status,
          ipAddress: submission.ipAddress,
          metadata: submission.metadata
        })),
        consents: profileData.consents.map(consent => ({
          id: consent.id,
          consentItemId: consent.consentItemId,
          consentGiven: consent.consentGiven,
          purpose: consent.consentItem?.purpose,
          retentionPeriod: consent.consentItem?.retentionPeriod,
          consentedAt: consent.consentedAt,
          hasSignature: !!consent.signatureData,
          fullName: consent.fullName,
          privacyNoticeAccepted: consent.privacyNoticeAccepted,
          privacyNoticeVersion: consent.privacyNoticeVersion
        })),
        personalDataFields: profileData.personalDataFields.map(field => ({
          formId: field.formId,
          fieldId: field.fieldId,
          dataCategory: field.dataCategory,
          isSensitive: field.isSensitive,
          purpose: field.purpose,
          legalBasis: field.legalBasis,
          retentionPeriod: field.retentionPeriod
        })),
        dsrRequests: profileData.dsrRequests.map(request => ({
          id: request.id,
          requestType: request.requestType,
          status: request.status,
          createdAt: request.createdAt,
          processedAt: request.processedAt,
          responseNotes: request.responseNotes
        })),
        statistics: profileData.statistics
      };

      logger.info(`Exported data for profile ${profileId} in ${format} format`);
      return exportData;
    } catch (error) {
      logger.error(`Error exporting user data for ${profileId}:`, error);
      throw error;
    }
  }

  /**
   * Merge duplicate profiles into a primary profile
   *
   * @param {string} primaryId - UUID of the primary profile to keep
   * @param {string[]} duplicateIds - Array of duplicate profile UUIDs to merge
   * @returns {Promise<Object>} Updated primary profile
   */
  async mergeDuplicateProfiles(primaryId, duplicateIds) {
    const transaction = await sequelize.transaction();

    try {
      if (!Array.isArray(duplicateIds) || duplicateIds.length === 0) {
        throw new Error('duplicateIds must be a non-empty array');
      }

      // Get primary profile
      const primaryProfile = await UnifiedUserProfile.findByPk(primaryId, { transaction });
      if (!primaryProfile) {
        throw new Error(`Primary profile not found: ${primaryId}`);
      }

      // Get duplicate profiles
      const duplicateProfiles = await UnifiedUserProfile.findAll({
        where: {
          id: { [Op.in]: duplicateIds }
        },
        transaction
      });

      if (duplicateProfiles.length !== duplicateIds.length) {
        throw new Error('One or more duplicate profiles not found');
      }

      // Merge each duplicate into primary
      for (const duplicateProfile of duplicateProfiles) {
        // Merge emails
        duplicateProfile.linked_emails.forEach(email => {
          if (!primaryProfile.linked_emails.includes(email)) {
            primaryProfile.linked_emails.push(email);
          }
        });

        // Merge phones
        duplicateProfile.linked_phones.forEach(phone => {
          if (!primaryProfile.linked_phones.includes(phone)) {
            primaryProfile.linked_phones.push(phone);
          }
        });

        // Merge names
        duplicateProfile.linked_names.forEach(name => {
          if (!primaryProfile.linked_names.includes(name)) {
            primaryProfile.linked_names.push(name);
          }
        });

        // Merge submission IDs
        duplicateProfile.submission_ids.forEach(id => {
          if (!primaryProfile.submission_ids.includes(id)) {
            primaryProfile.submission_ids.push(id);
          }
        });

        // Merge form IDs
        duplicateProfile.form_ids.forEach(id => {
          if (!primaryProfile.form_ids.includes(id)) {
            primaryProfile.form_ids.push(id);
          }
        });

        // Update dates
        if (duplicateProfile.first_submission_date &&
            (!primaryProfile.first_submission_date || duplicateProfile.first_submission_date < primaryProfile.first_submission_date)) {
          primaryProfile.first_submission_date = duplicateProfile.first_submission_date;
        }
        if (duplicateProfile.last_submission_date &&
            (!primaryProfile.last_submission_date || duplicateProfile.last_submission_date > primaryProfile.last_submission_date)) {
          primaryProfile.last_submission_date = duplicateProfile.last_submission_date;
        }

        // Track merge in merged_from_ids
        if (!primaryProfile.merged_from_ids.includes(duplicateProfile.id)) {
          primaryProfile.merged_from_ids.push(duplicateProfile.id);
        }
      }

      // Update total submissions
      primaryProfile.total_submissions = primaryProfile.submission_ids.length;

      // Reduce confidence score slightly for merged profiles
      primaryProfile.match_confidence = Math.max(50, parseFloat(primaryProfile.match_confidence) - (duplicateProfiles.length * 5));

      // Save primary profile
      await primaryProfile.save({ transaction });

      // Delete duplicate profiles
      await UnifiedUserProfile.destroy({
        where: {
          id: { [Op.in]: duplicateIds }
        },
        transaction
      });

      // Create audit trail
      logger.logAudit(
        'MERGE_PROFILES',
        null, // System action
        'UnifiedUserProfile',
        primaryId,
        { duplicateIds },
        {
          mergedCount: duplicateProfiles.length,
          totalSubmissions: primaryProfile.total_submissions,
          newConfidence: primaryProfile.match_confidence
        }
      );

      await transaction.commit();

      logger.info(`Merged ${duplicateProfiles.length} duplicate profiles into ${primaryId}`);
      return await this.getProfileDetail(primaryId);
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error merging profiles into ${primaryId}:`, error);
      throw error;
    }
  }

  /**
   * Find potential duplicate profiles using matching algorithms
   *
   * @param {Object} options - Search options
   * @param {number} options.minConfidence - Minimum confidence score (0-100, default: 70)
   * @param {number} options.minSubmissions - Minimum submissions to consider (default: 1)
   * @param {number} options.limit - Maximum duplicate groups to return (default: 50)
   * @returns {Promise<Array>} Array of duplicate groups with confidence scores
   */
  async findPotentialDuplicates({ minConfidence = 70, minSubmissions = 1, limit = 50 }) {
    try {
      const validMinConfidence = Math.max(0, Math.min(100, parseInt(minConfidence, 10) || 70));
      const validLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

      // Get all active profiles
      const profiles = await UnifiedUserProfile.findAll({
        where: {
          total_submissions: { [Op.gte]: minSubmissions }
        },
        order: [['total_submissions', 'DESC']],
        limit: 500 // Limit to avoid performance issues
      });

      const duplicateGroups = [];
      const processedPairs = new Set();

      for (let i = 0; i < profiles.length; i++) {
        for (let j = i + 1; j < profiles.length; j++) {
          const profile1 = profiles[i];
          const profile2 = profiles[j];

          const pairKey = [profile1.id, profile2.id].sort().join('|');
          if (processedPairs.has(pairKey)) continue;

          const matchResult = this._calculateMatchConfidence(profile1, profile2);

          if (matchResult.confidence >= validMinConfidence) {
            duplicateGroups.push({
              confidence: matchResult.confidence,
              matchReasons: matchResult.reasons,
              profiles: [
                profile1.toJSON(),
                profile2.toJSON()
              ]
            });

            processedPairs.add(pairKey);

            if (duplicateGroups.length >= validLimit) {
              break;
            }
          }
        }

        if (duplicateGroups.length >= validLimit) {
          break;
        }
      }

      // Sort by confidence descending
      duplicateGroups.sort((a, b) => b.confidence - a.confidence);

      logger.info(`Found ${duplicateGroups.length} potential duplicate groups (min confidence: ${validMinConfidence}%)`);
      return duplicateGroups;
    } catch (error) {
      logger.error('Error finding potential duplicates:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Get all consents for a profile using linked emails/phones
   * @private
   */
  async _getConsentsForProfile(profile) {
    const where = { [Op.or]: [] };

    if (profile.linked_emails.length > 0) {
      // UserConsent doesn't have user_email/user_phone fields in the model we saw
      // We need to query through submissions instead
      const consents = await UserConsent.findAll({
        where: {
          submission_id: { [Op.in]: profile.submission_ids }
        },
        include: [
          {
            model: ConsentItem,
            as: 'consentItem',
            attributes: ['id', 'title_th', 'title_en', 'description_th', 'description_en', 'purpose', 'retention_period'] // ✅ v0.8.5: Thai/English descriptions
          },
          {
            model: Form,
            as: 'form',
            attributes: ['id', 'title']
          }
        ],
        attributes: [
          'id',
          'submission_id',
          'consent_item_id',
          'consent_given',
          'consented_at',
          'signature_data', // ✅ v0.8.5: Digital signature (base64 PNG)
          'full_name', // ✅ v0.8.5: Signer's full name
          'ip_address', // ✅ v0.8.5: IP address when signed
          'user_agent', // ✅ v0.8.5: Browser user-agent
          'privacy_notice_accepted',
          'privacy_notice_version'
        ],
        order: [['consented_at', 'DESC']]
      });

      // ✅ v0.8.5: Enrich consents with metadata
      return consents.map(consent => {
        const consentJson = consent.toJSON();
        return {
          ...consentJson,
          hasSignature: !!consent.signature_data,
          signatureDataUrl: consent.signature_data, // Keep frontend-friendly name
          metadata: {
            ipAddress: consent.ip_address,
            userAgent: consent.user_agent,
            consentedAt: consent.consented_at,
            fullName: consent.full_name
          }
        };
      });
    }

    return [];
  }

  /**
   * Get personal data fields for forms this user has submitted
   * @private
   */
  async _getPersonalDataFieldsForProfile(profile) {
    if (profile.form_ids.length === 0) return [];

    const fields = await PersonalDataField.findAll({
      where: {
        form_id: { [Op.in]: profile.form_ids }
      },
      include: [
        {
          model: Form,
          as: 'form',
          attributes: ['id', 'title']
        },
        {
          model: Field,
          as: 'field',
          attributes: ['id', 'title', 'type']
        }
      ]
    });

    return fields;
  }

  /**
   * Get DSR requests for a profile using linked emails/phones
   * @private
   */
  async _getDSRRequestsForProfile(profile) {
    const identifiers = [
      ...profile.linked_emails,
      ...profile.linked_phones
    ];

    if (identifiers.length === 0) return [];

    const requests = await DSRRequest.findAll({
      where: {
        user_identifier: { [Op.in]: identifiers }
      },
      include: [
        {
          model: User,
          as: 'processor',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return requests;
  }

  /**
   * Calculate consent compliance statistics
   * @private
   */
  _calculateConsentCompliance(consents) {
    const given = consents.filter(c => c.consent_given === true).length;
    const denied = consents.filter(c => c.consent_given === false).length;
    const total = given + denied;

    return {
      given,
      denied,
      total,
      compliancePercentage: total > 0 ? ((given / total) * 100).toFixed(2) : 0
    };
  }

  /**
   * Count total PII fields across submissions
   * @private
   */
  _countPIIFields(submissions, personalDataFields) {
    // Create a set of unique PII field IDs across all forms
    const uniquePIIFields = new Set(personalDataFields.map(f => f.field_id));
    return uniquePIIFields.size * submissions.length; // Total PII data points
  }


  /**
   * Calculate match confidence between two profiles
   * @private
   */
  _calculateMatchConfidence(profile1, profile2) {
    let confidence = 0;
    const reasons = [];

    // Exact email match (highest weight: 50 points)
    const emailMatch = profile1.linked_emails.some(email =>
      profile2.linked_emails.includes(email)
    );
    if (emailMatch) {
      confidence += 50;
      reasons.push('Exact email match');
    }

    // Exact phone match (high weight: 40 points)
    const phoneMatch = profile1.linked_phones.some(phone =>
      profile2.linked_phones.includes(phone)
    );
    if (phoneMatch) {
      confidence += 40;
      reasons.push('Exact phone match');
    }

    // Name similarity (fuzzy match: up to 30 points)
    const nameSimilarity = this._calculateNameSimilarity(
      profile1.linked_names,
      profile2.linked_names
    );
    if (nameSimilarity > 0) {
      confidence += nameSimilarity * 30;
      reasons.push(`Name similarity: ${(nameSimilarity * 100).toFixed(0)}%`);
    }

    // Both email AND phone match = very high confidence bonus
    if (emailMatch && phoneMatch) {
      confidence = Math.min(100, confidence + 10);
      reasons.push('Both email and phone match');
    }

    return {
      confidence: Math.min(100, Math.round(confidence)),
      reasons
    };
  }

  /**
   * Calculate name similarity (simple Levenshtein-based approach)
   * @private
   */
  _calculateNameSimilarity(names1, names2) {
    if (names1.length === 0 || names2.length === 0) return 0;

    let maxSimilarity = 0;

    for (const name1 of names1) {
      for (const name2 of names2) {
        // Simple similarity: exact match
        if (name1.toLowerCase() === name2.toLowerCase()) {
          maxSimilarity = Math.max(maxSimilarity, 1.0);
        } else {
          // Simple partial match
          const shorter = name1.length < name2.length ? name1 : name2;
          const longer = name1.length >= name2.length ? name1 : name2;

          if (longer.toLowerCase().includes(shorter.toLowerCase())) {
            const similarity = shorter.length / longer.length;
            maxSimilarity = Math.max(maxSimilarity, similarity * 0.8); // Reduce score for partial matches
          }
        }
      }
    }

    return maxSimilarity;
  }

  /**
   * Auto-sync submission to unified_user_profiles
   * ✅ v0.8.5: Automatic profile creation/update when submission is created
   *
   * @param {string} submissionId - Submission UUID
   * @returns {Promise<Object>} Sync result with profile info
   */
  async syncSubmission(submissionId) {
    try {
      logger.info(`🔄 Auto-syncing submission ${submissionId} to unified_user_profiles`);

      // Step 1: Get submission with all data
      const submission = await Submission.findByPk(submissionId, {
        include: [
          {
            model: SubmissionData,
            as: 'submissionData',  // ← Use correct alias from model association
            include: [
              {
                model: Field,
                as: 'field',
                attributes: ['id', 'title', 'type']
              }
            ]
          }
        ]
      });

      if (!submission) {
        logger.warn(`⚠️ Submission ${submissionId} not found for auto-sync`);
        return { success: false, error: 'Submission not found' };
      }

      // Step 2: Extract email and phone from submission data (with decryption support)
      const emailFields = submission.submissionData?.filter(d => d.field?.type === 'email') || [];
      const phoneFields = submission.submissionData?.filter(d => d.field?.type === 'phone') || [];

      const emails = emailFields
        .map(d => d.getDecryptedValue())  // ← Use getDecryptedValue() to support encryption
        .filter(email => email && typeof email === 'string' && email.trim());

      const phones = phoneFields
        .map(d => d.getDecryptedValue())  // ← Use getDecryptedValue() to support encryption
        .filter(phone => phone && typeof phone === 'string' && phone.trim());

      // Must have at least email or phone
      if (emails.length === 0 && phones.length === 0) {
        logger.info(`ℹ️ Submission ${submissionId} has no email/phone - skipping profile sync`);
        return { success: true, skipped: true, reason: 'No email or phone field' };
      }

      const primaryEmail = emails[0] || null;
      const primaryPhone = phones[0] || null;

      logger.info(`📧 Extracted: email=${primaryEmail}, phone=${primaryPhone}`);

      // Step 3: Find or create unified_user_profile
      const whereClause = [];
      if (primaryEmail) {
        whereClause.push({ primary_email: { [Op.iLike]: primaryEmail } });
      }
      if (primaryPhone) {
        whereClause.push({ primary_phone: primaryPhone });
      }

      let profile = await UnifiedUserProfile.findOne({
        where: { [Op.or]: whereClause }
      });

      const isNewProfile = !profile;

      if (!profile) {
        // Create new profile
        logger.info(`✨ Creating new profile for ${primaryEmail || primaryPhone}`);

        // Try to extract full name from submission (with decryption support)
        const nameFields = submission.submissionData?.filter(d =>
          d.field?.type === 'short_answer' &&
          (d.field.title.toLowerCase().includes('ชื่อ') ||
           d.field.title.toLowerCase().includes('name'))
        ) || [];

        const fullName = nameFields[0]?.getDecryptedValue() || 'ไม่ระบุชื่อ';

        profile = await UnifiedUserProfile.create({
          primary_email: primaryEmail,
          primary_phone: primaryPhone,
          full_name: fullName,
          linked_emails: emails.length > 0 ? emails : [],
          linked_phones: phones.length > 0 ? phones : [],
          linked_names: [fullName],
          submission_ids: [submissionId],
          form_ids: [submission.form_id],
          total_submissions: 1,
          first_submission_date: submission.submitted_at || submission.createdAt,
          last_submission_date: submission.submitted_at || submission.createdAt,
          match_confidence: 1.0
        });

        logger.info(`✅ Created profile ${profile.id} for ${primaryEmail || primaryPhone}`);
      } else {
        // Update existing profile
        logger.info(`🔄 Updating existing profile ${profile.id}`);

        // Add submission_id if not exists
        if (!profile.submission_ids.includes(submissionId)) {
          profile.submission_ids = [...profile.submission_ids, submissionId];
        }

        // Add form_id if not exists
        if (!profile.form_ids.includes(submission.form_id)) {
          profile.form_ids = [...profile.form_ids, submission.form_id];
        }

        // Update linked emails/phones
        emails.forEach(email => {
          if (!profile.linked_emails.includes(email.toLowerCase())) {
            profile.linked_emails = [...profile.linked_emails, email.toLowerCase()];
          }
        });

        phones.forEach(phone => {
          if (!profile.linked_phones.includes(phone)) {
            profile.linked_phones = [...profile.linked_phones, phone];
          }
        });

        // Update counts and dates
        profile.total_submissions = profile.submission_ids.length;

        const submissionDate = submission.submitted_at || submission.createdAt;
        if (!profile.first_submission_date || submissionDate < profile.first_submission_date) {
          profile.first_submission_date = submissionDate;
        }
        if (!profile.last_submission_date || submissionDate > profile.last_submission_date) {
          profile.last_submission_date = submissionDate;
        }

        await profile.save();

        logger.info(`✅ Updated profile ${profile.id}: ${profile.submission_ids.length} submissions, ${profile.form_ids.length} forms`);
      }

      return {
        success: true,
        profileId: profile.id,
        primaryEmail: profile.primary_email,
        primaryPhone: profile.primary_phone,
        totalSubmissions: profile.total_submissions,
        totalForms: profile.form_ids.length,
        isNewProfile
      };

    } catch (error) {
      logger.error(`❌ Error auto-syncing submission ${submissionId}:`, error);
      // Don't throw - we don't want to block submission creation
      return { success: false, error: error.message };
    }
  }

  /**
   * Get list of forms for a profile (for DSR submission)
   * v0.8.7-dev: Used in DSR request form to show which forms the data subject has submitted
   *
   * @param {string} profileId - Profile UUID
   * @returns {Promise<Array>} Array of forms with submission counts
   *
   * Response format:
   * [
   *   {
   *     formId: "uuid",
   *     formTitle: "ฟอร์มทดสอบ",
   *     submissionCount: 3,
   *     lastSubmissionDate: "2025-10-24T10:30:00Z",
   *     hasConsents: true,
   *     hasPII: true
   *   }
   * ]
   */
  async getProfileForms(profileId) {
    try {
      // ✅ v0.8.7-dev: Get profile (UnifiedUserProfile doesn't have FK associations)
      const profile = await UnifiedUserProfile.findByPk(profileId);

      if (!profile) {
        throw new Error(`Profile ${profileId} not found`);
      }

      // Get submissions for this profile using submission_ids array
      const submissionIds = profile.submission_ids || [];

      if (submissionIds.length === 0) {
        logger.warn(`Profile ${profileId} has no submissions`);
        return [];
      }

      const submissions = await Submission.findAll({
        where: {
          id: { [Op.in]: submissionIds }
        },
        attributes: ['id', 'form_id', 'submitted_at'],
        include: [
          {
            model: Form,
            as: 'form',
            attributes: ['id', 'title']
          }
        ],
        order: [['submitted_at', 'DESC']]
      });

      // Group submissions by form
      const formMap = new Map();

      for (const submission of submissions) {
        const formId = submission.form_id;

        if (!formMap.has(formId)) {
          formMap.set(formId, {
            formId: formId,
            formTitle: submission.form?.title || 'Unknown Form',
            formTitleEn: submission.form?.title_en || null,
            submissions: [],
            submissionCount: 0,
            lastSubmissionDate: null
          });
        }

        const formData = formMap.get(formId);
        formData.submissions.push(submission);
        formData.submissionCount++;

        // Update last submission date
        const submittedAt = new Date(submission.submitted_at);
        if (!formData.lastSubmissionDate || submittedAt > new Date(formData.lastSubmissionDate)) {
          formData.lastSubmissionDate = submission.submitted_at;
        }
      }

      // Check which forms have consents and PII
      const forms = [];

      for (const [formId, formData] of formMap) {
        // Check for consents
        const consentCount = await ConsentItem.count({
          where: { form_id: formId }
        });

        // Check for PII fields
        const piiCount = await PersonalDataField.count({
          where: { form_id: formId }
        });

        forms.push({
          formId: formData.formId,
          formTitle: formData.formTitle,
          formTitleEn: formData.formTitleEn,
          submissionCount: formData.submissionCount,
          lastSubmissionDate: formData.lastSubmissionDate,
          hasConsents: consentCount > 0,
          hasPII: piiCount > 0,
          consentItemCount: consentCount,
          piiFieldCount: piiCount
        });
      }

      // Sort by last submission date (most recent first)
      forms.sort((a, b) => {
        return new Date(b.lastSubmissionDate) - new Date(a.lastSubmissionDate);
      });

      logger.info(`Retrieved ${forms.length} forms for profile ${profileId}`);

      return forms;

    } catch (error) {
      logger.error(`Error getting forms for profile ${profileId}:`, error);
      throw error;
    }
  }
}

module.exports = new UnifiedUserProfileService();
