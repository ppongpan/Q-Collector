/**
 * Cron Expression Validator Utility
 *
 * Validates cron expressions for Q-Collector notification system
 * Supports standard cron format: "minute hour day month weekday"
 */

/**
 * Validate cron expression format
 * @param {string} expression - Cron expression to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateCronExpression(expression) {
  if (!expression || typeof expression !== 'string') {
    return false;
  }

  // Remove extra whitespace and split
  const parts = expression.trim().split(/\s+/);

  // Standard cron has 5 parts: minute hour day month weekday
  if (parts.length !== 5) {
    return false;
  }

  const [minute, hour, day, month, weekday] = parts;

  // Validate each part
  return (
    validateCronPart(minute, 0, 59) &&    // Minutes: 0-59
    validateCronPart(hour, 0, 23) &&      // Hours: 0-23
    validateCronPart(day, 1, 31) &&       // Days: 1-31
    validateCronPart(month, 1, 12) &&     // Months: 1-12
    validateCronPart(weekday, 0, 7)       // Weekdays: 0-7 (0 and 7 are Sunday)
  );
}

/**
 * Validate individual cron part
 * @param {string} part - Cron part to validate
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean}
 */
function validateCronPart(part, min, max) {
  // Allow wildcard
  if (part === '*') {
    return true;
  }

  // Allow step values (e.g., */5, 0-23/2)
  if (part.includes('/')) {
    const [range, step] = part.split('/');
    if (!isValidNumber(step, 1, max)) {
      return false;
    }
    if (range === '*') {
      return true;
    }
    return validateCronPart(range, min, max);
  }

  // Allow ranges (e.g., 1-5)
  if (part.includes('-')) {
    const [start, end] = part.split('-');
    return isValidNumber(start, min, max) && isValidNumber(end, min, max);
  }

  // Allow lists (e.g., 1,3,5)
  if (part.includes(',')) {
    const values = part.split(',');
    return values.every(v => isValidNumber(v, min, max));
  }

  // Single number
  return isValidNumber(part, min, max);
}

/**
 * Check if string is a valid number within range
 * @param {string} value - Value to check
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {boolean}
 */
function isValidNumber(value, min, max) {
  const num = parseInt(value, 10);
  return !isNaN(num) && num >= min && num <= max && String(num) === value.trim();
}

/**
 * Get human-readable description of cron expression
 * @param {string} expression - Cron expression
 * @returns {string} Human-readable description
 */
function describeCronExpression(expression) {
  if (!validateCronExpression(expression)) {
    return 'Invalid cron expression';
  }

  const [minute, hour, day, month, weekday] = expression.trim().split(/\s+/);

  let description = '';

  // Build description
  if (minute === '*' && hour === '*' && day === '*' && month === '*' && weekday === '*') {
    return 'Every minute';
  }

  if (minute !== '*' && hour !== '*' && day === '*' && month === '*' && weekday === '*') {
    return `Daily at ${hour}:${minute.padStart(2, '0')}`;
  }

  if (minute !== '*' && hour !== '*' && day !== '*' && month === '*' && weekday === '*') {
    return `Monthly on day ${day} at ${hour}:${minute.padStart(2, '0')}`;
  }

  if (minute !== '*' && hour !== '*' && day === '*' && month === '*' && weekday !== '*') {
    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = weekday === '7' ? 'Sunday' : weekdayNames[parseInt(weekday)];
    return `Weekly on ${dayName} at ${hour}:${minute.padStart(2, '0')}`;
  }

  // Generic description
  description = 'At';
  if (minute !== '*') description += ` minute ${minute}`;
  if (hour !== '*') description += ` hour ${hour}`;
  if (day !== '*') description += ` day ${day}`;
  if (month !== '*') description += ` month ${month}`;
  if (weekday !== '*') description += ` weekday ${weekday}`;

  return description || 'Custom schedule';
}

module.exports = {
  validateCronExpression,
  describeCronExpression,
};
