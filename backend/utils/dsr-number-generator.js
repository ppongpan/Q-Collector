/**
 * DSR Number Generator Utility
 *
 * Generates unique DSR (Data Subject Rights) request numbers
 * Format: DSR-YYYYMMDD-XXXX
 *
 * Example: DSR-20251025-0001
 *
 * Features:
 * - Thread-safe with database-level uniqueness
 * - Date-based prefix for easy organization
 * - Sequential numbering resets daily
 * - Max 9999 DSRs per day (can handle high volume)
 *
 * @version v0.8.7-dev
 * @date 2025-10-25
 */

const { DSRRequest } = require('../models');
const { Op } = require('sequelize');

/**
 * Generate next available DSR number for today
 *
 * @param {Object} transaction - Optional Sequelize transaction
 * @returns {Promise<string>} DSR number (e.g., "DSR-20251025-0001")
 * @throws {Error} If DSR limit exceeded or generation fails
 */
async function generateDSRNumber(transaction = null) {
  const today = new Date();
  const datePrefix = formatDatePrefix(today);
  const dsrPrefix = `DSR-${datePrefix}`;

  try {
    // Find highest sequential number for today
    // Uses LIKE pattern to find all DSRs for today
    const latestDSR = await DSRRequest.findOne({
      where: {
        dsr_number: {
          [Op.like]: `${dsrPrefix}-%`
        }
      },
      order: [['dsr_number', 'DESC']],
      transaction,
      lock: transaction ? transaction.LOCK.UPDATE : undefined, // Lock row if in transaction
    });

    let nextSequence = 1;

    if (latestDSR && latestDSR.dsr_number) {
      // Extract sequence number from latest DSR
      // Format: DSR-YYYYMMDD-XXXX
      const sequencePart = latestDSR.dsr_number.split('-')[2];
      const currentSequence = parseInt(sequencePart, 10);

      if (isNaN(currentSequence)) {
        throw new Error(`Invalid DSR number format: ${latestDSR.dsr_number}`);
      }

      nextSequence = currentSequence + 1;

      // Check daily limit (9999 DSRs per day)
      if (nextSequence > 9999) {
        throw new Error(
          `Daily DSR limit exceeded (9999). Date: ${datePrefix}. ` +
          `Please contact system administrator.`
        );
      }
    }

    // Format sequence with leading zeros (4 digits)
    const sequenceStr = nextSequence.toString().padStart(4, '0');
    const dsrNumber = `${dsrPrefix}-${sequenceStr}`;

    return dsrNumber;

  } catch (error) {
    console.error('Error generating DSR number:', error);
    throw error;
  }
}

/**
 * Format date as YYYYMMDD for DSR prefix
 *
 * @param {Date} date - Date object
 * @returns {string} Formatted date string (YYYYMMDD)
 *
 * @example
 * formatDatePrefix(new Date('2025-10-25')) // Returns: "20251025"
 */
function formatDatePrefix(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}${month}${day}`;
}

/**
 * Validate DSR number format
 *
 * @param {string} dsrNumber - DSR number to validate
 * @returns {boolean} True if valid format
 *
 * @example
 * validateDSRNumber("DSR-20251025-0001") // Returns: true
 * validateDSRNumber("INVALID") // Returns: false
 */
function validateDSRNumber(dsrNumber) {
  const dsrPattern = /^DSR-\d{8}-\d{4}$/;
  return dsrPattern.test(dsrNumber);
}

/**
 * Parse DSR number into components
 *
 * @param {string} dsrNumber - DSR number to parse
 * @returns {Object|null} Parsed components or null if invalid
 *
 * @example
 * parseDSRNumber("DSR-20251025-0001")
 * // Returns: { date: "20251025", sequence: 1, year: 2025, month: 10, day: 25 }
 */
function parseDSRNumber(dsrNumber) {
  if (!validateDSRNumber(dsrNumber)) {
    return null;
  }

  const parts = dsrNumber.split('-');
  const datePart = parts[1]; // YYYYMMDD
  const sequencePart = parts[2]; // XXXX

  return {
    date: datePart,
    sequence: parseInt(sequencePart, 10),
    year: parseInt(datePart.substring(0, 4), 10),
    month: parseInt(datePart.substring(4, 6), 10),
    day: parseInt(datePart.substring(6, 8), 10),
  };
}

/**
 * Get count of DSRs created today
 *
 * @param {Object} transaction - Optional Sequelize transaction
 * @returns {Promise<number>} Count of DSRs created today
 */
async function getTodayDSRCount(transaction = null) {
  const today = new Date();
  const datePrefix = formatDatePrefix(today);
  const dsrPrefix = `DSR-${datePrefix}`;

  try {
    const count = await DSRRequest.count({
      where: {
        dsr_number: {
          [Op.like]: `${dsrPrefix}-%`
        }
      },
      transaction,
    });

    return count;

  } catch (error) {
    console.error('Error counting today DSRs:', error);
    throw error;
  }
}

/**
 * Check if DSR number exists
 *
 * @param {string} dsrNumber - DSR number to check
 * @param {Object} transaction - Optional Sequelize transaction
 * @returns {Promise<boolean>} True if exists
 */
async function dsrNumberExists(dsrNumber, transaction = null) {
  try {
    const existingDSR = await DSRRequest.findOne({
      where: { dsr_number: dsrNumber },
      transaction,
    });

    return !!existingDSR;

  } catch (error) {
    console.error('Error checking DSR number existence:', error);
    throw error;
  }
}

module.exports = {
  generateDSRNumber,
  validateDSRNumber,
  parseDSRNumber,
  getTodayDSRCount,
  dsrNumberExists,
  formatDatePrefix, // Exported for testing
};
