/**
 * DSR Validation Utility
 * Validates DSR requirements for consent changes and data operations
 *
 * PDPA Requirements:
 * - Consent withdrawal requires valid DSR (Section 19)
 * - Significant consent changes require DSR approval
 * - All DSR-linked operations must be audited
 *
 * @version v0.8.7-dev
 * @date 2025-10-25
 */

const { DSRRequest, ConsentHistory } = require('../models');
const { Op } = require('sequelize');
const logger = require('./logger.util');

/**
 * Check if consent change requires an approved DSR
 *
 * @param {string} changeType - Type of change (withdrawal, rectification, etc.)
 * @param {boolean} currentStatus - Current consent status
 * @param {boolean} newStatus - New consent status
 * @returns {boolean} True if DSR is required
 */
function requiresDSR(changeType, currentStatus, newStatus) {
  // Consent withdrawal always requires DSR
  if (changeType === 'withdrawal' || (currentStatus === true && newStatus === false)) {
    return true;
  }

  // Rectification requires DSR
  if (changeType === 'rectification') {
    return true;
  }

  // Renewal after withdrawal requires DSR
  if (changeType === 'renewal' && currentStatus === false) {
    return true;
  }

  return false;
}

/**
 * Find approved DSR for consent change
 *
 * @param {string} profileId - Profile UUID
 * @param {string} consentItemId - Consent item UUID
 * @param {Object} options - Additional options
 * @returns {Promise<Object|null>} Approved DSR request or null
 */
async function findApprovedDSRForConsentChange(profileId, consentItemId, options = {}) {
  try {
    // Find approved DSR that covers this consent change
    const dsrRequest = await DSRRequest.findOne({
      where: {
        profile_id: profileId,
        status: {
          [Op.in]: ['approved', 'completed']
        },
        request_type: {
          [Op.in]: ['rectification', 'restriction', 'objection']
        },
        // Ensure DSR was created recently (within last 30 days)
        created_at: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      },
      order: [['approved_at', 'DESC']],
      limit: 1
    });

    if (dsrRequest) {
      logger.info(
        `Found approved DSR ${dsrRequest.dsr_number} for consent change: ` +
        `profileId=${profileId}, consentItemId=${consentItemId}`
      );
    }

    return dsrRequest;

  } catch (error) {
    logger.error('Error finding approved DSR for consent change:', error);
    throw error;
  }
}

/**
 * Validate DSR requirement for consent change
 * Throws error if DSR is required but not found
 *
 * @param {Object} params - Validation parameters
 * @param {string} params.profileId - Profile UUID
 * @param {string} params.consentItemId - Consent item UUID
 * @param {string} params.changeType - Type of change
 * @param {boolean} params.currentStatus - Current consent status
 * @param {boolean} params.newStatus - New consent status
 * @param {string|null} params.dsrRequestId - Optional DSR request ID
 * @throws {Error} If DSR required but not found
 * @returns {Promise<Object|null>} DSR request if found, null if not required
 */
async function validateDSRRequirement({
  profileId,
  consentItemId,
  changeType,
  currentStatus,
  newStatus,
  dsrRequestId = null
}) {
  try {
    // Check if DSR is required for this change
    const isRequired = requiresDSR(changeType, currentStatus, newStatus);

    if (!isRequired) {
      logger.debug('DSR not required for this consent change');
      return null;
    }

    // If DSR ID provided, verify it exists and is approved
    if (dsrRequestId) {
      const dsrRequest = await DSRRequest.findByPk(dsrRequestId);

      if (!dsrRequest) {
        throw new Error(`DSR request ${dsrRequestId} not found`);
      }

      if (dsrRequest.status !== 'approved' && dsrRequest.status !== 'completed') {
        throw new Error(
          `DSR request ${dsrRequest.dsr_number} is not approved. ` +
          `Current status: ${dsrRequest.status}`
        );
      }

      if (dsrRequest.profile_id !== profileId) {
        throw new Error(
          `DSR request ${dsrRequest.dsr_number} does not belong to profile ${profileId}`
        );
      }

      logger.info(
        `DSR requirement validated: ${dsrRequest.dsr_number} (${dsrRequest.status})`
      );

      return dsrRequest;
    }

    // Auto-find approved DSR
    const dsrRequest = await findApprovedDSRForConsentChange(profileId, consentItemId);

    if (!dsrRequest) {
      throw new Error(
        'ไม่พบคำขอใช้สิทธิ์ (DSR) ที่ได้รับการอนุมัติสำหรับการเปลี่ยนแปลงนี้\n' +
        'กรุณาสร้างคำขอใช้สิทธิ์และรอการอนุมัติก่อนดำเนินการ\n\n' +
        'No approved DSR request found for this consent change. ' +
        'Please create and approve a DSR request before proceeding.'
      );
    }

    return dsrRequest;

  } catch (error) {
    logger.error('DSR validation failed:', error);
    throw error;
  }
}

/**
 * Get consent change history with DSR references
 *
 * @param {string} profileId - Profile UUID
 * @param {string|null} consentItemId - Optional consent item UUID filter
 * @returns {Promise<Array>} Consent history records
 */
async function getConsentHistoryWithDSR(profileId, consentItemId = null) {
  try {
    const where = { profile_id: profileId };
    if (consentItemId) {
      where.consent_item_id = consentItemId;
    }

    const history = await ConsentHistory.findAll({
      where,
      include: [
        {
          model: DSRRequest,
          as: 'dsrRequest',
          attributes: ['id', 'dsr_number', 'request_type', 'status', 'approved_at']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return history;

  } catch (error) {
    logger.error('Error getting consent history with DSR:', error);
    throw error;
  }
}

/**
 * Check if profile has any pending DSR requests
 *
 * @param {string} profileId - Profile UUID
 * @returns {Promise<boolean>} True if pending DSR exists
 */
async function hasPendingDSR(profileId) {
  try {
    const count = await DSRRequest.count({
      where: {
        profile_id: profileId,
        status: {
          [Op.in]: ['pending', 'in_progress']
        }
      }
    });

    return count > 0;

  } catch (error) {
    logger.error('Error checking pending DSR:', error);
    throw error;
  }
}

module.exports = {
  requiresDSR,
  findApprovedDSRForConsentChange,
  validateDSRRequirement,
  getConsentHistoryWithDSR,
  hasPendingDSR
};
