/**
 * Slug Generation Utility
 * Generates SEO-friendly URL slugs from form titles
 *
 * Features:
 * - Thai character removal
 * - Unique slug guarantee
 * - URL-safe format (lowercase, alphanumeric + hyphens)
 *
 * @version v0.9.0-dev
 * @date 2025-10-26
 */

const { Form, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Generate slug from form title
 *
 * @param {string} title - Form title (Thai or English)
 * @returns {string} URL-safe slug
 *
 * @example
 * generateSlug("แบบฟอร์มติดต่อเรา") → "contact-form"
 * generateSlug("Customer Feedback 2024!") → "customer-feedback-2024"
 */
const generateSlug = (title) => {
  if (!title || typeof title !== 'string') {
    throw new Error('Title must be a non-empty string');
  }

  return title
    .toLowerCase()
    .trim()
    // Remove Thai characters (ก-๙)
    .replace(/[ก-๙]/g, '')
    // Replace spaces and special chars with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Limit to 50 characters
    .substring(0, 50)
    // Remove trailing hyphen if substring cut in middle
    .replace(/-+$/, '') || 'form';
};

/**
 * Ensure slug is unique across all forms
 * Adds numeric suffix if slug already exists
 *
 * @param {string} slug - Base slug
 * @param {string|null} excludeFormId - Form ID to exclude from check (for updates)
 * @returns {Promise<string>} Unique slug
 *
 * @example
 * ensureUniqueSlug("customer-feedback") → "customer-feedback"
 * ensureUniqueSlug("customer-feedback") → "customer-feedback-2" (if exists)
 * ensureUniqueSlug("customer-feedback", "form-id-123") → "customer-feedback" (excluding form-id-123)
 */
const ensureUniqueSlug = async (slug, excludeFormId = null) => {
  if (!slug || typeof slug !== 'string') {
    throw new Error('Slug must be a non-empty string');
  }

  let uniqueSlug = slug;
  let counter = 1;

  // Max 100 attempts to prevent infinite loop
  const MAX_ATTEMPTS = 100;
  let attempts = 0;

  while (attempts < MAX_ATTEMPTS) {
    // Check if slug exists in any form's publicLink settings
    const whereClause = {
      [Op.and]: [
        sequelize.literal(`settings->'publicLink'->>'slug' = '${uniqueSlug}'`)
      ]
    };

    // Exclude current form if updating
    if (excludeFormId) {
      whereClause.id = { [Op.ne]: excludeFormId };
    }

    const existingForm = await Form.findOne({
      where: whereClause
    });

    // Slug is unique
    if (!existingForm) {
      return uniqueSlug;
    }

    // Slug exists, try next suffix
    counter++;
    uniqueSlug = `${slug}-${counter}`;
    attempts++;
  }

  // Fallback: use timestamp if max attempts reached
  return `${slug}-${Date.now()}`;
};

/**
 * Validate slug format
 *
 * @param {string} slug - Slug to validate
 * @returns {Object} Validation result { valid: boolean, error: string|null }
 */
const validateSlug = (slug) => {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: 'Slug must be a non-empty string' };
  }

  if (slug.length < 3) {
    return { valid: false, error: 'Slug must be at least 3 characters' };
  }

  if (slug.length > 50) {
    return { valid: false, error: 'Slug must not exceed 50 characters' };
  }

  // Only lowercase alphanumeric and hyphens
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return {
      valid: false,
      error: 'Slug must contain only lowercase letters, numbers, and hyphens'
    };
  }

  // Cannot start or end with hyphen
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return {
      valid: false,
      error: 'Slug cannot start or end with a hyphen'
    };
  }

  // Cannot have consecutive hyphens
  if (slug.includes('--')) {
    return {
      valid: false,
      error: 'Slug cannot contain consecutive hyphens'
    };
  }

  return { valid: true, error: null };
};

/**
 * Generate slug from form title and ensure uniqueness
 * Convenience method combining generateSlug() and ensureUniqueSlug()
 *
 * @param {string} title - Form title
 * @param {string|null} excludeFormId - Form ID to exclude from uniqueness check
 * @returns {Promise<string>} Unique, valid slug
 */
const createUniqueSlug = async (title, excludeFormId = null) => {
  const baseSlug = generateSlug(title);
  const validation = validateSlug(baseSlug);

  if (!validation.valid) {
    throw new Error(`Invalid slug generated: ${validation.error}`);
  }

  return await ensureUniqueSlug(baseSlug, excludeFormId);
};

module.exports = {
  generateSlug,
  ensureUniqueSlug,
  validateSlug,
  createUniqueSlug
};
