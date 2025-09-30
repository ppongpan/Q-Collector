/**
 * Advanced Formula Engine for Q-Collector Framework v1.0
 * Enhanced calculation capabilities with auto-calculation fields and complex business logic
 *
 * Features:
 * - Auto-calculation fields with real-time updates
 * - Advanced mathematical functions (SUM, AVG, MIN, MAX, COUNT)
 * - Date/time calculations (DATEDIFF, NOW, TODAY)
 * - Complex conditional logic with nested dependencies
 * - Field validation with custom error messages
 * - Business rule validation
 */

import { formulaEngine } from './formulaEngine.js';

// Extended functions for advanced calculations
const ADVANCED_FUNCTIONS = {
  // Mathematical functions
  SUM: 'SUM',
  AVG: 'AVG',
  MIN: 'MIN',
  MAX: 'MAX',
  COUNT: 'COUNT',
  ROUND: 'ROUND',
  CEIL: 'CEIL',
  FLOOR: 'FLOOR',
  ABS: 'ABS',
  POWER: 'POWER',
  SQRT: 'SQRT',

  // Date/time functions
  NOW: 'NOW',
  TODAY: 'TODAY',
  DATEDIFF: 'DATEDIFF',
  DATEADD: 'DATEADD',
  YEAR: 'YEAR',
  MONTH: 'MONTH',
  DAY: 'DAY',
  WEEKDAY: 'WEEKDAY',

  // Text functions (extended)
  CONCATENATE: 'CONCATENATE',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  MID: 'MID',
  FIND: 'FIND',
  SUBSTITUTE: 'SUBSTITUTE',

  // Lookup functions
  VLOOKUP: 'VLOOKUP',
  INDEX: 'INDEX',
  MATCH: 'MATCH',

  // Statistical functions
  MEDIAN: 'MEDIAN',
  MODE: 'MODE',
  STDEV: 'STDEV',
  VAR: 'VAR'
};

/**
 * Advanced Formula Engine with enhanced capabilities
 */
class AdvancedFormulaEngine {
  constructor() {
    this.baseEngine = formulaEngine;
    this.calculationFields = new Map(); // Track auto-calculation fields
    this.validationRules = new Map(); // Track validation rules
    this.dependencyGraph = new Map(); // Track field dependencies
    this.cache = new Map(); // Enhanced caching
  }

  /**
   * Register an auto-calculation field
   * @param {string} fieldId - Field ID
   * @param {string} formula - Calculation formula
   * @param {Object} options - Calculation options
   */
  registerCalculationField(fieldId, formula, options = {}) {
    this.calculationFields.set(fieldId, {
      formula,
      dependencies: this.getDependencies(formula),
      updateMode: options.updateMode || 'realtime', // realtime, onblur, onsubmit
      formatType: options.formatType || 'auto', // number, currency, percentage, date
      precision: options.precision || 2,
      prefix: options.prefix || '',
      suffix: options.suffix || '',
      readOnly: options.readOnly !== false, // Default to read-only
      recalculateOnLoad: options.recalculateOnLoad !== false
    });

    // Update dependency graph
    this.updateDependencyGraph(fieldId, formula);
  }

  /**
   * Register a validation rule
   * @param {string} fieldId - Field ID
   * @param {string} formula - Validation formula (should return boolean)
   * @param {string} errorMessage - Error message if validation fails
   * @param {Object} options - Validation options
   */
  registerValidationRule(fieldId, formula, errorMessage, options = {}) {
    if (!this.validationRules.has(fieldId)) {
      this.validationRules.set(fieldId, []);
    }

    this.validationRules.get(fieldId).push({
      formula,
      errorMessage,
      dependencies: this.getDependencies(formula),
      severity: options.severity || 'error', // error, warning, info
      when: options.when || 'always', // always, onblur, onsubmit
      priority: options.priority || 0
    });

    // Update dependency graph
    this.updateDependencyGraph(`${fieldId}_validation`, formula);
  }

  /**
   * Update dependency graph for efficient recalculation
   */
  updateDependencyGraph(targetId, formula) {
    const dependencies = this.getDependencies(formula);

    // Add reverse dependencies
    dependencies.forEach(depFieldId => {
      if (!this.dependencyGraph.has(depFieldId)) {
        this.dependencyGraph.set(depFieldId, new Set());
      }
      this.dependencyGraph.get(depFieldId).add(targetId);
    });
  }

  /**
   * Calculate value for auto-calculation field
   * @param {string} fieldId - Field ID
   * @param {Object} formData - Current form data
   * @param {Object} fieldMap - Field definitions
   * @returns {*} Calculated value
   */
  calculateFieldValue(fieldId, formData, fieldMap) {
    const calcField = this.calculationFields.get(fieldId);
    if (!calcField) return null;

    try {
      const rawValue = this.evaluate(calcField.formula, formData, fieldMap);
      return this.formatCalculatedValue(rawValue, calcField);
    } catch (error) {
      console.error(`Calculation error for field ${fieldId}:`, error);
      return null;
    }
  }

  /**
   * Format calculated value based on field options
   */
  formatCalculatedValue(value, calcField) {
    if (value === null || value === undefined) return '';

    const { formatType, precision, prefix, suffix } = calcField;

    switch (formatType) {
      case 'number':
        return prefix + Number(value).toFixed(precision) + suffix;

      case 'currency':
        return prefix + Number(value).toLocaleString('th-TH', {
          minimumFractionDigits: precision,
          maximumFractionDigits: precision
        }) + suffix;

      case 'percentage':
        return prefix + (Number(value) * 100).toFixed(precision) + '%' + suffix;

      case 'date':
        if (value instanceof Date) {
          return value.toLocaleDateString('th-TH');
        }
        return String(value);

      case 'auto':
      default:
        if (typeof value === 'number') {
          return prefix + value.toFixed(precision) + suffix;
        }
        return prefix + String(value) + suffix;
    }
  }

  /**
   * Validate field using registered validation rules
   * @param {string} fieldId - Field ID
   * @param {*} value - Field value
   * @param {Object} formData - Current form data
   * @param {Object} fieldMap - Field definitions
   * @returns {Array} Array of validation errors
   */
  validateField(fieldId, value, formData, fieldMap) {
    const rules = this.validationRules.get(fieldId);
    if (!rules) return [];

    const errors = [];

    // Add current field value to form data for validation
    const validationData = { ...formData, [fieldId]: value };

    rules.forEach((rule, index) => {
      try {
        const isValid = this.evaluate(rule.formula, validationData, fieldMap);

        if (!isValid) {
          errors.push({
            fieldId,
            ruleIndex: index,
            message: rule.errorMessage,
            severity: rule.severity,
            priority: rule.priority
          });
        }
      } catch (error) {
        console.error(`Validation error for field ${fieldId}, rule ${index}:`, error);
        errors.push({
          fieldId,
          ruleIndex: index,
          message: 'Validation rule error',
          severity: 'error',
          priority: 999
        });
      }
    });

    // Sort by priority (lower numbers = higher priority)
    return errors.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get all fields that need recalculation when a field changes
   * @param {string} changedFieldId - Field that changed
   * @returns {Array} Array of field IDs that need recalculation
   */
  getAffectedFields(changedFieldId) {
    const affected = new Set();

    // Get direct dependents
    const directDependents = this.dependencyGraph.get(changedFieldId) || new Set();
    directDependents.forEach(dep => affected.add(dep));

    // Get transitive dependents (fields that depend on fields that depend on this field)
    const visited = new Set();
    const stack = Array.from(directDependents);

    while (stack.length > 0) {
      const current = stack.pop();
      if (visited.has(current)) continue;
      visited.add(current);

      const transitiveDeps = this.dependencyGraph.get(current) || new Set();
      transitiveDeps.forEach(dep => {
        if (!affected.has(dep)) {
          affected.add(dep);
          stack.push(dep);
        }
      });
    }

    return Array.from(affected).filter(id =>
      this.calculationFields.has(id) && !id.includes('_validation')
    );
  }

  /**
   * Enhanced evaluate function with advanced functions
   */
  evaluate(formula, formData = {}, fieldMap = {}) {
    // Extend the base engine with advanced functions
    try {
      return this.evaluateAdvanced(formula, formData, fieldMap);
    } catch (error) {
      // Fallback to base engine
      return this.baseEngine.evaluate(formula, formData, fieldMap);
    }
  }

  /**
   * Advanced evaluation with extended functions
   */
  evaluateAdvanced(formula, formData, fieldMap) {
    // Pre-process formula to handle advanced functions
    const processedFormula = this.preprocessFormula(formula, formData, fieldMap);
    return this.baseEngine.evaluate(processedFormula, formData, fieldMap);
  }

  /**
   * Preprocess formula to expand advanced functions
   */
  preprocessFormula(formula, formData, fieldMap) {
    if (typeof formula !== 'string') return formula;

    // Handle SUM function
    formula = formula.replace(/SUM\(([^)]+)\)/gi, (match, args) => {
      const fieldRefs = this.parseFieldReferences(args);
      const values = fieldRefs.map(ref => this.getFieldValue(ref, formData, fieldMap) || 0);
      return values.reduce((sum, val) => sum + Number(val), 0);
    });

    // Handle AVG function
    formula = formula.replace(/AVG\(([^)]+)\)/gi, (match, args) => {
      const fieldRefs = this.parseFieldReferences(args);
      const values = fieldRefs.map(ref => this.getFieldValue(ref, formData, fieldMap) || 0);
      const sum = values.reduce((sum, val) => sum + Number(val), 0);
      return values.length > 0 ? sum / values.length : 0;
    });

    // Handle MIN/MAX functions
    formula = formula.replace(/(MIN|MAX)\(([^)]+)\)/gi, (match, func, args) => {
      const fieldRefs = this.parseFieldReferences(args);
      const values = fieldRefs.map(ref => Number(this.getFieldValue(ref, formData, fieldMap)) || 0);
      return values.length > 0 ? Math[func.toLowerCase()](...values) : 0;
    });

    // Handle COUNT function
    formula = formula.replace(/COUNT\(([^)]+)\)/gi, (match, args) => {
      const fieldRefs = this.parseFieldReferences(args);
      return fieldRefs.filter(ref => {
        const value = this.getFieldValue(ref, formData, fieldMap);
        return value !== null && value !== undefined && value !== '';
      }).length;
    });

    // Handle ROUND function
    formula = formula.replace(/ROUND\(([^,]+),\s*(\d+)\)/gi, (match, value, decimals) => {
      const numValue = Number(this.evaluateExpression(value, formData, fieldMap));
      return Number(numValue.toFixed(Number(decimals)));
    });

    // Handle NOW and TODAY functions
    formula = formula.replace(/NOW\(\)/gi, () => new Date().getTime());
    formula = formula.replace(/TODAY\(\)/gi, () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today.getTime();
    });

    // Handle DATEDIFF function
    formula = formula.replace(/DATEDIFF\(([^,]+),\s*([^,]+),\s*"([^"]+)"\)/gi, (match, date1, date2, unit) => {
      const d1 = new Date(this.evaluateExpression(date1, formData, fieldMap));
      const d2 = new Date(this.evaluateExpression(date2, formData, fieldMap));
      const diffMs = Math.abs(d2.getTime() - d1.getTime());

      switch (unit.toLowerCase()) {
        case 'days': return Math.floor(diffMs / (1000 * 60 * 60 * 24));
        case 'hours': return Math.floor(diffMs / (1000 * 60 * 60));
        case 'minutes': return Math.floor(diffMs / (1000 * 60));
        case 'seconds': return Math.floor(diffMs / 1000);
        default: return diffMs;
      }
    });

    return formula;
  }

  /**
   * Parse field references from function arguments
   */
  parseFieldReferences(args) {
    const refs = [];
    const matches = args.match(/\[([^\]]+)\]/g);
    if (matches) {
      refs.push(...matches.map(match => match.slice(1, -1)));
    }
    return refs;
  }

  /**
   * Get field value helper
   */
  getFieldValue(fieldRef, formData, fieldMap) {
    // Try direct field ID match
    if (formData.hasOwnProperty(fieldRef)) {
      return formData[fieldRef];
    }

    // Try field name/title match
    const field = Object.values(fieldMap).find(f =>
      f.title === fieldRef || f.name === fieldRef || f.id === fieldRef
    );

    if (field && formData.hasOwnProperty(field.id)) {
      return formData[field.id];
    }

    return null;
  }

  /**
   * Evaluate simple expressions for preprocessing
   */
  evaluateExpression(expr, formData, fieldMap) {
    if (expr.startsWith('[') && expr.endsWith(']')) {
      return this.getFieldValue(expr.slice(1, -1), formData, fieldMap);
    }

    if (!isNaN(expr)) {
      return Number(expr);
    }

    if (expr.startsWith('"') && expr.endsWith('"')) {
      return expr.slice(1, -1);
    }

    return expr;
  }

  /**
   * Get dependencies from formula
   */
  getDependencies(formula) {
    return this.baseEngine.getDependencies(formula);
  }

  /**
   * Business rule validation examples
   */
  getCommonValidationRules() {
    return {
      // Age validation
      ageValidation: {
        formula: 'AND([Age] >= 18, [Age] <= 65)',
        message: 'อายุต้องอยู่ระหว่าง 18-65 ปี'
      },

      // Email format validation (enhanced)
      emailValidation: {
        formula: 'AND(CONTAINS([Email], "@"), CONTAINS([Email], "."), LEN([Email]) > 5)',
        message: 'รูปแบบอีเมลไม่ถูกต้อง'
      },

      // Password strength validation
      passwordValidation: {
        formula: 'AND(LEN([Password]) >= 8, CONTAINS(UPPER([Password]), [Password]) = FALSE)',
        message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษรและมีตัวพิมพ์ใหญ่'
      },

      // Phone number validation
      phoneValidation: {
        formula: 'AND(LEN([Phone]) = 10, LEFT([Phone], 1) = "0")',
        message: 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย 0 และมี 10 หลัก'
      },

      // Date range validation
      dateRangeValidation: {
        formula: 'AND([StartDate] < [EndDate], [StartDate] >= TODAY())',
        message: 'วันที่เริ่มต้องน้อยกว่าวันที่สิ้นสุดและไม่น้อยกว่าวันนี้'
      },

      // Budget validation
      budgetValidation: {
        formula: 'SUM([Item1Cost], [Item2Cost], [Item3Cost]) <= [TotalBudget]',
        message: 'ผลรวมค่าใช้จ่ายต้องไม่เกินงบประมาณที่กำหนด'
      }
    };
  }

  /**
   * Common calculation examples
   */
  getCommonCalculations() {
    return {
      // Total calculation
      totalCalculation: {
        formula: 'SUM([Quantity], [UnitPrice])',
        formatType: 'currency'
      },

      // Percentage calculation
      percentageCalculation: {
        formula: '[ActualValue] / [TargetValue]',
        formatType: 'percentage'
      },

      // Age calculation from birth date
      ageCalculation: {
        formula: 'DATEDIFF([BirthDate], TODAY(), "days") / 365',
        formatType: 'number',
        precision: 0
      },

      // Working days calculation
      workingDaysCalculation: {
        formula: 'DATEDIFF([StartDate], [EndDate], "days") - (DATEDIFF([StartDate], [EndDate], "days") / 7 * 2)',
        formatType: 'number',
        precision: 0
      },

      // Tax calculation
      taxCalculation: {
        formula: '[SubTotal] * 0.07',
        formatType: 'currency',
        prefix: '฿'
      },

      // Discount calculation
      discountCalculation: {
        formula: 'IF([OrderAmount] > 1000, [OrderAmount] * 0.1, 0)',
        formatType: 'currency',
        prefix: '฿'
      }
    };
  }

  /**
   * Clear all registrations and cache
   */
  clear() {
    this.calculationFields.clear();
    this.validationRules.clear();
    this.dependencyGraph.clear();
    this.cache.clear();
    this.baseEngine.clearCache();
  }

  /**
   * Export configuration for persistence
   */
  exportConfiguration() {
    return {
      calculationFields: Array.from(this.calculationFields.entries()),
      validationRules: Array.from(this.validationRules.entries()),
      dependencyGraph: Array.from(this.dependencyGraph.entries()).map(([key, value]) => [key, Array.from(value)])
    };
  }

  /**
   * Import configuration from persistence
   */
  importConfiguration(config) {
    this.clear();

    if (config.calculationFields) {
      this.calculationFields = new Map(config.calculationFields);
    }

    if (config.validationRules) {
      this.validationRules = new Map(config.validationRules);
    }

    if (config.dependencyGraph) {
      this.dependencyGraph = new Map(
        config.dependencyGraph.map(([key, value]) => [key, new Set(value)])
      );
    }
  }
}

// Export singleton instance
export const advancedFormulaEngine = new AdvancedFormulaEngine();

// Export classes for testing
export {
  AdvancedFormulaEngine,
  ADVANCED_FUNCTIONS
};

// Export default
export default advancedFormulaEngine;