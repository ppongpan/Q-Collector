/**
 * Conditional Formatting Engine
 *
 * Evaluates formatting rules and returns CSS styles based on field values and conditions.
 * Works with the existing formulaEngine for condition evaluation.
 *
 * v0.7.40 - Form-level configuration (stored in form.settings)
 */

import formulaEngine from './formulaEngine';

/**
 * Get conditional formatting style for a field value
 *
 * @param {Object} formSettings - Form settings object (form.settings)
 * @param {String} fieldId - Field ID to check
 * @param {*} value - Current field value
 * @param {Object} formData - All form data for formula evaluation
 * @param {Object} fieldMap - Map of field IDs to field objects
 * @returns {Object} CSS style object with color, backgroundColor, fontWeight, etc.
 *
 * @example
 * const style = getConditionalStyle(
 *   form.settings,
 *   'field_123',
 *   'ปิดการขายได้',
 *   { field_123: 'ปิดการขายได้', field_456: 150000 },
 *   fieldMap
 * );
 * // Returns: { color: '#22c55e', fontWeight: 'bold' }
 */
export function getConditionalStyle(formSettings, fieldId, value, formData, fieldMap) {
  // Return empty style if conditional formatting not enabled
  if (!formSettings?.conditionalFormatting?.enabled) {
    return {};
  }

  const rules = formSettings.conditionalFormatting.rules || [];

  // Find rules for this specific field
  const fieldRules = rules
    .filter(rule => rule.fieldId === fieldId)
    .sort((a, b) => (a.order || 0) - (b.order || 0)); // Sort by priority (lower order = higher priority)

  // Evaluate rules in order and return first match
  for (const rule of fieldRules) {
    // Skip rules without condition
    if (!rule.condition || !rule.condition.trim()) {
      continue;
    }

    try {
      // Prepare data for formula evaluation
      // Include the current field value in the evaluation context
      const evaluationData = {
        ...formData,
        [fieldId]: value
      };

      // Evaluate condition using formula engine
      const result = formulaEngine.evaluate(
        rule.condition,
        evaluationData,
        fieldMap
      );

      // If condition matches, return style and stop evaluating
      if (result) {
        const style = {};

        // Apply text color
        if (rule.style.textColor) {
          style.color = rule.style.textColor;
        }

        // Apply background color
        if (rule.style.backgroundColor) {
          style.backgroundColor = rule.style.backgroundColor;
        }

        // Apply font weight
        if (rule.style.fontWeight && rule.style.fontWeight !== 'normal') {
          style.fontWeight = rule.style.fontWeight;
        }

        // Apply font size (if specified)
        if (rule.style.fontSize) {
          style.fontSize = rule.style.fontSize;
        }

        // Apply border styles (if specified)
        if (rule.style.borderColor) {
          style.borderColor = rule.style.borderColor;
          style.borderWidth = rule.style.borderWidth || '2px';
          style.borderStyle = rule.style.borderStyle || 'solid';
        } else if (rule.style.borderWidth) {
          style.borderWidth = rule.style.borderWidth;
          style.borderStyle = rule.style.borderStyle || 'solid';
        }

        console.log(`✅ [ConditionalFormatting] Rule matched for field ${fieldId}:`, {
          ruleId: rule.id,
          condition: rule.condition,
          value,
          style
        });

        return style;
      }
    } catch (error) {
      // Log warning but don't crash
      console.warn(`⚠️ [ConditionalFormatting] Error evaluating rule for field ${fieldId}:`, {
        ruleId: rule.id,
        condition: rule.condition,
        error: error.message
      });
    }
  }

  // No matching rule found
  return {};
}

/**
 * Check if conditional formatting is enabled for a form
 *
 * @param {Object} formSettings - Form settings object
 * @returns {Boolean} True if enabled, false otherwise
 */
export function isConditionalFormattingEnabled(formSettings) {
  return formSettings?.conditionalFormatting?.enabled === true;
}

/**
 * Get all rules for a specific field
 *
 * @param {Object} formSettings - Form settings object
 * @param {String} fieldId - Field ID
 * @returns {Array} Array of rules for the field
 */
export function getFieldRules(formSettings, fieldId) {
  if (!formSettings?.conditionalFormatting?.rules) {
    return [];
  }

  return formSettings.conditionalFormatting.rules
    .filter(rule => rule.fieldId === fieldId)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Validate a formatting rule
 *
 * @param {Object} rule - Rule to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateRule(rule) {
  const errors = [];

  if (!rule.id) {
    errors.push('Rule must have an ID');
  }

  if (!rule.fieldId) {
    errors.push('Rule must reference a field');
  }

  if (!rule.condition || !rule.condition.trim()) {
    errors.push('Rule must have a condition');
  }

  if (!rule.style) {
    errors.push('Rule must have style properties');
  }

  // Check if at least one style property is defined
  if (rule.style && !rule.style.textColor && !rule.style.backgroundColor && !rule.style.fontWeight) {
    errors.push('Rule must have at least one style property (textColor, backgroundColor, or fontWeight)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default {
  getConditionalStyle,
  isConditionalFormattingEnabled,
  getFieldRules,
  validateRule
};
