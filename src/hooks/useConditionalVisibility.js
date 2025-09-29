/**
 * useConditionalVisibility Hook
 * React hook for field visibility based on formula evaluation
 * Q-Collector Framework v0.2
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { formulaEngine } from '../utils/formulaEngine';

/**
 * Hook for managing conditional field visibility
 * @param {string|object} formula - Formula string or compiled AST
 * @param {object} formData - Current form data
 * @param {array} allFields - Array of all form fields for reference mapping
 * @param {object} options - Additional options
 * @returns {object} { isVisible, error, dependencies, recompile }
 */
export const useConditionalVisibility = (formula, formData = {}, allFields = [], options = {}) => {
  const {
    defaultVisible = true,        // Default visibility when no formula
    enableCaching = true,         // Enable formula caching
    debounceMs = 0,              // Debounce evaluation
    onError = null,              // Error callback
    onVisibilityChange = null    // Visibility change callback
  } = options;

  // State for tracking results
  const [state, setState] = useState({
    isVisible: defaultVisible,
    error: null,
    lastEvaluation: null,
    dependencies: []
  });

  // Create field mapping for efficient lookups
  const fieldMap = useMemo(() => {
    const map = {};
    allFields.forEach(field => {
      if (field.id) {
        map[field.id] = field;
      }
    });
    return map;
  }, [allFields]);

  // Extract formula dependencies
  const dependencies = useMemo(() => {
    if (!formula) return [];

    try {
      return formulaEngine.getDependencies(formula);
    } catch (error) {
      console.warn('Error extracting formula dependencies:', error.message);
      return [];
    }
  }, [formula]);

  // Check if form data has changed for dependent fields
  const relevantFormData = useMemo(() => {
    if (dependencies.length === 0) return {};

    const relevant = {};
    dependencies.forEach(fieldName => {
      // Try direct field name match first
      if (formData.hasOwnProperty(fieldName)) {
        relevant[fieldName] = formData[fieldName];
        return;
      }

      // Try to find field by title/name in fieldMap
      const field = Object.values(fieldMap).find(f =>
        f.title === fieldName || f.name === fieldName || f.id === fieldName
      );

      if (field && formData.hasOwnProperty(field.id)) {
        relevant[fieldName] = formData[field.id];
      }
    });

    return relevant;
  }, [dependencies, formData, fieldMap]);

  // Debounced evaluation function
  const evaluateFormula = useCallback(
    debounce((currentFormula, currentFormData, currentFieldMap) => {
      if (!currentFormula) {
        setState(prev => ({
          ...prev,
          isVisible: defaultVisible,
          error: null,
          lastEvaluation: Date.now()
        }));
        return;
      }

      try {
        const result = formulaEngine.evaluate(currentFormula, currentFormData, currentFieldMap);
        const newVisibility = Boolean(result);

        setState(prev => {
          const hasChanged = prev.isVisible !== newVisibility;

          if (hasChanged && onVisibilityChange) {
            onVisibilityChange(newVisibility, prev.isVisible);
          }

          return {
            ...prev,
            isVisible: newVisibility,
            error: null,
            lastEvaluation: Date.now()
          };
        });
      } catch (error) {
        const errorMessage = `Formula evaluation failed: ${error.message}`;

        setState(prev => ({
          ...prev,
          isVisible: defaultVisible,
          error: errorMessage,
          lastEvaluation: Date.now()
        }));

        if (onError) {
          onError(error, currentFormula);
        }

        console.error('Formula evaluation error:', error);
      }
    }, debounceMs),
    [defaultVisible, onError, onVisibilityChange, debounceMs]
  );

  // Effect to evaluate formula when dependencies change
  useEffect(() => {
    evaluateFormula(formula, relevantFormData, fieldMap);
  }, [formula, relevantFormData, fieldMap, evaluateFormula]);

  // Store dependencies in state for debugging
  useEffect(() => {
    setState(prev => ({
      ...prev,
      dependencies
    }));
  }, [dependencies]);

  // Function to manually recompile formula (useful for formula editor)
  const recompile = useCallback(() => {
    if (enableCaching) {
      formulaEngine.clearCache();
    }
    evaluateFormula(formula, relevantFormData, fieldMap);
  }, [formula, relevantFormData, fieldMap, enableCaching, evaluateFormula]);

  // Function to test formula validity
  const isValidFormula = useCallback((testFormula = formula) => {
    if (!testFormula) return true;
    return formulaEngine.isValid(testFormula);
  }, [formula]);

  // Function to get formula syntax suggestions
  const getSyntaxHelp = useCallback(() => {
    return {
      fieldReference: '[FieldName] - Reference to form field',
      comparison: '=, <>, <, >, <=, >= - Comparison operators',
      logical: 'AND(), OR(), NOT() - Logical functions',
      conditional: 'IF(condition, true_value, false_value) - Conditional logic',
      text: 'CONTAINS(), ISBLANK(), ISNOTBLANK() - Text functions',
      examples: [
        'AND([ลักษณะงาน] = "งานตรวจสอบอาคาร", [สถานะงาน] = "ปิดงานแล้ว")',
        'IF([Status] = "Complete", [Amount] > 100, FALSE)',
        'CONTAINS([Description], "keyword")',
        'NOT(ISBLANK([Comments]))',
        'OR([Priority] = "High", [Amount] > 1000)'
      ]
    };
  }, []);

  return {
    isVisible: state.isVisible,
    error: state.error,
    dependencies: state.dependencies,
    lastEvaluation: state.lastEvaluation,
    recompile,
    isValidFormula,
    getSyntaxHelp,
    // Debugging helpers
    _debug: {
      relevantFormData,
      fieldMap: Object.keys(fieldMap),
      cacheSize: formulaEngine.getCacheSize()
    }
  };
};

/**
 * Helper hook for multiple conditional fields
 * @param {array} fields - Array of fields with showCondition
 * @param {object} formData - Current form data
 * @param {array} allFields - All form fields
 * @returns {object} Map of field IDs to visibility state
 */
export const useMultipleConditionalVisibility = (fields = [], formData = {}, allFields = []) => {
  const [visibilityMap, setVisibilityMap] = useState({});

  // Process each field with conditional visibility
  useEffect(() => {
    const newVisibilityMap = {};

    fields.forEach(field => {
      if (field.showCondition?.enabled && field.showCondition?.formula) {
        try {
          const isVisible = formulaEngine.evaluate(
            field.showCondition.formula,
            formData,
            createFieldMap(allFields)
          );
          newVisibilityMap[field.id] = Boolean(isVisible);
        } catch (error) {
          console.error(`Error evaluating formula for field ${field.id}:`, error);
          newVisibilityMap[field.id] = true; // Default to visible on error
        }
      } else {
        newVisibilityMap[field.id] = true; // No condition means always visible
      }
    });

    setVisibilityMap(newVisibilityMap);
  }, [fields, formData, allFields]);

  return visibilityMap;
};

/**
 * Hook for form-level conditional logic (advanced use cases)
 * @param {object} conditions - Object with multiple named conditions
 * @param {object} formData - Current form data
 * @param {array} allFields - All form fields
 * @returns {object} Results for each condition
 */
export const useConditionalLogic = (conditions = {}, formData = {}, allFields = []) => {
  const [results, setResults] = useState({});

  const fieldMap = useMemo(() => createFieldMap(allFields), [allFields]);

  useEffect(() => {
    const newResults = {};

    Object.entries(conditions).forEach(([name, formula]) => {
      if (formula) {
        try {
          const result = formulaEngine.evaluate(formula, formData, fieldMap);
          newResults[name] = {
            result: Boolean(result),
            error: null,
            rawResult: result
          };
        } catch (error) {
          newResults[name] = {
            result: false,
            error: error.message,
            rawResult: null
          };
        }
      } else {
        newResults[name] = {
          result: true,
          error: null,
          rawResult: true
        };
      }
    });

    setResults(newResults);
  }, [conditions, formData, fieldMap]);

  return results;
};

// Utility functions

/**
 * Create field mapping for efficient lookups
 */
function createFieldMap(fields) {
  const map = {};
  fields.forEach(field => {
    if (field.id) {
      map[field.id] = field;
    }
  });
  return map;
}

/**
 * Debounce utility function
 */
function debounce(func, wait) {
  if (wait <= 0) return func;

  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func.apply(this, args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Hook for formula builder/editor interface
 * @param {string} initialFormula - Initial formula string
 * @param {array} availableFields - Available fields for reference
 * @returns {object} Formula editor state and actions
 */
export const useFormulaBuilder = (initialFormula = '', availableFields = []) => {
  const [formula, setFormula] = useState(initialFormula);
  const [isValid, setIsValid] = useState(true);
  const [errors, setErrors] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  // Validate formula on change
  useEffect(() => {
    if (!formula.trim()) {
      setIsValid(true);
      setErrors([]);
      setSuggestions([]);
      return;
    }

    try {
      const valid = formulaEngine.isValid(formula);
      setIsValid(valid);

      if (valid) {
        setErrors([]);
        // Get dependencies and validate field references
        const deps = formulaEngine.getDependencies(formula);
        const invalidFields = deps.filter(fieldName =>
          !availableFields.some(field =>
            field.title === fieldName || field.name === fieldName || field.id === fieldName
          )
        );

        if (invalidFields.length > 0) {
          setErrors([`Unknown fields: ${invalidFields.join(', ')}`]);
          setIsValid(false);
        }
      } else {
        setErrors(['Invalid formula syntax']);
      }
    } catch (error) {
      setIsValid(false);
      setErrors([error.message]);
    }
  }, [formula, availableFields]);

  // Generate field suggestions
  const getFieldSuggestions = useCallback(() => {
    return availableFields.map(field => ({
      value: `[${field.title || field.name || field.id}]`,
      label: field.title || field.name || field.id,
      type: field.type,
      description: field.description
    }));
  }, [availableFields]);

  // Generate function suggestions
  const getFunctionSuggestions = useCallback(() => {
    return [
      { value: 'AND()', label: 'AND', description: 'Logical AND operation' },
      { value: 'OR()', label: 'OR', description: 'Logical OR operation' },
      { value: 'NOT()', label: 'NOT', description: 'Logical NOT operation' },
      { value: 'IF()', label: 'IF', description: 'Conditional logic' },
      { value: 'CONTAINS()', label: 'CONTAINS', description: 'Text contains check' },
      { value: 'ISBLANK()', label: 'ISBLANK', description: 'Check if value is blank' },
      { value: 'ISNOTBLANK()', label: 'ISNOTBLANK', description: 'Check if value is not blank' }
    ];
  }, []);

  // Test formula with sample data
  const testFormula = useCallback((testData = {}) => {
    if (!formula.trim()) return { result: true, error: null };

    try {
      const fieldMap = createFieldMap(availableFields);
      const result = formulaEngine.evaluate(formula, testData, fieldMap);
      return { result: Boolean(result), error: null, rawResult: result };
    } catch (error) {
      return { result: false, error: error.message, rawResult: null };
    }
  }, [formula, availableFields]);

  return {
    formula,
    setFormula,
    isValid,
    errors,
    suggestions,
    getFieldSuggestions,
    getFunctionSuggestions,
    testFormula,
    dependencies: formula ? formulaEngine.getDependencies(formula) : []
  };
};

export default useConditionalVisibility;