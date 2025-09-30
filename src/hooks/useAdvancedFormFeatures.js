/**
 * Advanced Form Features Hook for Q-Collector Framework v1.0
 * Integrates auto-calculation, advanced validation, and progressive disclosure
 *
 * Features:
 * - Auto-calculation fields with real-time updates
 * - Advanced validation with custom rules
 * - Progressive form sections with conditional visibility
 * - Field dependency tracking and efficient recalculation
 * - Business rule validation
 * - Section-based form progression
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { advancedFormulaEngine } from '../utils/advancedFormulaEngine.js';
import { progressiveFormDisclosure } from '../utils/progressiveFormDisclosure.js';
import { useEnhancedToast } from '../components/ui/enhanced-toast.js';

/**
 * Advanced Form Features Hook
 * @param {Object} options - Configuration options
 * @returns {Object} Advanced form state and methods
 */
export function useAdvancedFormFeatures(options = {}) {
  const {
    formId,
    initialFormData = {},
    fieldMap = {},
    enableAutoCalculation = true,
    enableAdvancedValidation = true,
    enableProgressiveDisclosure = false,
    enableSectionManagement = false,
    calculationUpdateDelay = 300,
    validationUpdateDelay = 500,
    onFieldCalculated,
    onValidationFailed,
    onSectionChanged
  } = options;

  // State management
  const [formData, setFormData] = useState(initialFormData);
  const [calculatedValues, setCalculatedValues] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [fieldDependencies, setFieldDependencies] = useState({});
  const [currentSection, setCurrentSection] = useState(null);
  const [sectionProgress, setSectionProgress] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  // Refs for performance optimization
  const calculationTimeoutRef = useRef(null);
  const validationTimeoutRef = useRef(null);
  const lastCalculationRef = useRef({});
  const lastValidationRef = useRef({});

  // Enhanced toast for user feedback
  const toast = useEnhancedToast();

  /**
   * Register auto-calculation field
   */
  const registerCalculationField = useCallback((fieldId, formula, options = {}) => {
    if (!enableAutoCalculation) return;

    advancedFormulaEngine.registerCalculationField(fieldId, formula, {
      updateMode: 'realtime',
      formatType: 'auto',
      readOnly: true,
      ...options
    });

    // Update field dependencies
    const deps = advancedFormulaEngine.getDependencies(formula);
    setFieldDependencies(prev => ({
      ...prev,
      [fieldId]: deps
    }));
  }, [enableAutoCalculation]);

  /**
   * Register validation rule
   */
  const registerValidationRule = useCallback((fieldId, formula, errorMessage, options = {}) => {
    if (!enableAdvancedValidation) return;

    advancedFormulaEngine.registerValidationRule(fieldId, formula, errorMessage, {
      severity: 'error',
      when: 'realtime',
      priority: 0,
      ...options
    });
  }, [enableAdvancedValidation]);

  /**
   * Register form section for progressive disclosure
   */
  const registerFormSection = useCallback((sectionOptions) => {
    if (!enableProgressiveDisclosure) return;

    const section = progressiveFormDisclosure.registerSection(sectionOptions);

    // Update section progress
    updateSectionProgress();

    return section;
  }, [enableProgressiveDisclosure]);

  /**
   * Calculate field values
   */
  const calculateFieldValues = useCallback((targetFormData = null, changedFieldId = null) => {
    if (!enableAutoCalculation) return;

    const currentFormData = targetFormData || formData;
    setIsCalculating(true);

    try {
      const newCalculatedValues = {};
      let hasChanges = false;

      // Get affected fields if a specific field changed
      const fieldsToRecalculate = changedFieldId
        ? advancedFormulaEngine.getAffectedFields(changedFieldId)
        : Array.from(advancedFormulaEngine.calculationFields.keys());

      // Calculate values for affected fields
      fieldsToRecalculate.forEach(fieldId => {
        try {
          const calculatedValue = advancedFormulaEngine.calculateFieldValue(
            fieldId,
            currentFormData,
            fieldMap
          );

          if (calculatedValue !== null && calculatedValue !== lastCalculationRef.current[fieldId]) {
            newCalculatedValues[fieldId] = calculatedValue;
            lastCalculationRef.current[fieldId] = calculatedValue;
            hasChanges = true;

            // Notify callback
            if (onFieldCalculated) {
              onFieldCalculated(fieldId, calculatedValue, currentFormData);
            }
          }
        } catch (error) {
          console.error(`Calculation error for field ${fieldId}:`, error);
        }
      });

      // Update calculated values if there are changes
      if (hasChanges) {
        setCalculatedValues(prev => ({
          ...prev,
          ...newCalculatedValues
        }));

        // Update form data with calculated values
        setFormData(prev => ({
          ...prev,
          ...newCalculatedValues
        }));
      }

    } catch (error) {
      console.error('Field calculation error:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [enableAutoCalculation, formData, fieldMap, onFieldCalculated]);

  /**
   * Validate field values
   */
  const validateFieldValues = useCallback((targetFormData = null, changedFieldId = null) => {
    if (!enableAdvancedValidation) return;

    const currentFormData = targetFormData || formData;
    setIsValidating(true);

    try {
      const newValidationErrors = {};
      let hasChanges = false;

      // Get fields to validate
      const fieldsToValidate = changedFieldId
        ? [changedFieldId]
        : Object.keys(fieldMap);

      fieldsToValidate.forEach(fieldId => {
        try {
          const fieldValue = currentFormData[fieldId];
          const errors = advancedFormulaEngine.validateField(
            fieldId,
            fieldValue,
            currentFormData,
            fieldMap
          );

          const errorMessage = errors.length > 0 ? errors[0].message : null;

          if (errorMessage !== lastValidationRef.current[fieldId]) {
            if (errorMessage) {
              newValidationErrors[fieldId] = errorMessage;
            }
            lastValidationRef.current[fieldId] = errorMessage;
            hasChanges = true;

            // Notify callback for validation failures
            if (errorMessage && onValidationFailed) {
              onValidationFailed(fieldId, errorMessage, errors, currentFormData);
            }
          }
        } catch (error) {
          console.error(`Validation error for field ${fieldId}:`, error);
        }
      });

      // Update validation errors if there are changes
      if (hasChanges) {
        setValidationErrors(prev => {
          const updated = { ...prev };

          // Remove cleared errors
          Object.keys(updated).forEach(fieldId => {
            if (!newValidationErrors[fieldId]) {
              delete updated[fieldId];
            }
          });

          // Add new errors
          Object.assign(updated, newValidationErrors);

          return updated;
        });
      }

    } catch (error) {
      console.error('Field validation error:', error);
    } finally {
      setIsValidating(false);
    }
  }, [enableAdvancedValidation, formData, fieldMap, onValidationFailed]);

  /**
   * Update section progress
   */
  const updateSectionProgress = useCallback(() => {
    if (!enableProgressiveDisclosure) return;

    try {
      const progress = progressiveFormDisclosure.getSectionProgress(formData, fieldMap);
      setSectionProgress(progress);

      // Update current section
      const current = progressiveFormDisclosure.getCurrentSection();
      setCurrentSection(current?.id || null);
    } catch (error) {
      console.error('Section progress update error:', error);
    }
  }, [enableProgressiveDisclosure, formData, fieldMap]);

  /**
   * Handle form data change with debounced calculations and validation
   */
  const handleFormDataChange = useCallback((fieldId, value, options = {}) => {
    const { skipCalculation = false, skipValidation = false, immediate = false } = options;

    // Update form data immediately
    setFormData(prev => {
      const newFormData = { ...prev, [fieldId]: value };

      // Immediate updates if requested
      if (immediate) {
        if (!skipCalculation && enableAutoCalculation) {
          calculateFieldValues(newFormData, fieldId);
        }
        if (!skipValidation && enableAdvancedValidation) {
          validateFieldValues(newFormData, fieldId);
        }
        if (enableProgressiveDisclosure) {
          progressiveFormDisclosure.recalculateFlow(newFormData, fieldMap);
          updateSectionProgress();
        }
      }

      return newFormData;
    });

    // Debounced calculations
    if (!skipCalculation && enableAutoCalculation && !immediate) {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
      calculationTimeoutRef.current = setTimeout(() => {
        calculateFieldValues(null, fieldId);
      }, calculationUpdateDelay);
    }

    // Debounced validation
    if (!skipValidation && enableAdvancedValidation && !immediate) {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
      validationTimeoutRef.current = setTimeout(() => {
        validateFieldValues(null, fieldId);
      }, validationUpdateDelay);
    }

    // Progressive disclosure updates
    if (enableProgressiveDisclosure && !immediate) {
      setTimeout(() => {
        setFormData(currentFormData => {
          progressiveFormDisclosure.recalculateFlow(currentFormData, fieldMap);
          updateSectionProgress();
          return currentFormData;
        });
      }, 100);
    }
  }, [
    enableAutoCalculation,
    enableAdvancedValidation,
    enableProgressiveDisclosure,
    calculationUpdateDelay,
    validationUpdateDelay,
    calculateFieldValues,
    validateFieldValues,
    updateSectionProgress,
    fieldMap
  ]);

  /**
   * Navigate to next section
   */
  const navigateToNextSection = useCallback(() => {
    if (!enableProgressiveDisclosure) return false;

    try {
      const nextSection = progressiveFormDisclosure.navigateNext(formData, fieldMap);
      if (nextSection) {
        updateSectionProgress();
        if (onSectionChanged) {
          onSectionChanged('next', nextSection.id, nextSection);
        }
        return true;
      }
    } catch (error) {
      console.error('Navigation to next section failed:', error);
      toast.error(error.message, {
        title: 'ไม่สามารถไปขั้นตอนถัดไปได้',
        duration: 5000
      });
    }
    return false;
  }, [enableProgressiveDisclosure, formData, fieldMap, updateSectionProgress, onSectionChanged, toast]);

  /**
   * Navigate to previous section
   */
  const navigateToPreviousSection = useCallback(() => {
    if (!enableProgressiveDisclosure) return false;

    try {
      const previousSection = progressiveFormDisclosure.navigatePrevious(formData, fieldMap);
      if (previousSection) {
        updateSectionProgress();
        if (onSectionChanged) {
          onSectionChanged('previous', previousSection.id, previousSection);
        }
        return true;
      }
    } catch (error) {
      console.error('Navigation to previous section failed:', error);
      toast.error(error.message, {
        title: 'ไม่สามารถกลับขั้นตอนก่อนหน้าได้',
        duration: 5000
      });
    }
    return false;
  }, [enableProgressiveDisclosure, formData, fieldMap, updateSectionProgress, onSectionChanged, toast]);

  /**
   * Navigate to specific section
   */
  const navigateToSection = useCallback((sectionId) => {
    if (!enableProgressiveDisclosure) return false;

    try {
      const section = progressiveFormDisclosure.navigateToSection(sectionId, formData, fieldMap);
      if (section) {
        updateSectionProgress();
        if (onSectionChanged) {
          onSectionChanged('direct', sectionId, section);
        }
        return true;
      }
    } catch (error) {
      console.error(`Navigation to section ${sectionId} failed:`, error);
      toast.error(error.message, {
        title: 'ไม่สามารถไปยังขั้นตอนที่ระบุได้',
        duration: 5000
      });
    }
    return false;
  }, [enableProgressiveDisclosure, formData, fieldMap, updateSectionProgress, onSectionChanged, toast]);

  /**
   * Get overall form completion status
   */
  const getFormCompletionStatus = useCallback(() => {
    const totalFields = Object.keys(fieldMap).length;
    const filledFields = Object.keys(formData).filter(fieldId => {
      const value = formData[fieldId];
      return value !== null && value !== undefined && value !== '';
    }).length;

    const fieldCompletion = totalFields > 0 ? (filledFields / totalFields) * 100 : 100;

    let sectionCompletion = 100;
    if (enableProgressiveDisclosure) {
      sectionCompletion = progressiveFormDisclosure.getFormProgress(formData, fieldMap);
    }

    const hasValidationErrors = Object.keys(validationErrors).length > 0;
    const hasCalculations = Object.keys(calculatedValues).length > 0;

    return {
      fieldCompletion: Math.round(fieldCompletion),
      sectionCompletion,
      overallCompletion: Math.round((fieldCompletion + sectionCompletion) / 2),
      hasValidationErrors,
      hasCalculations,
      isCalculating,
      isValidating,
      canSubmit: !hasValidationErrors && !isCalculating && !isValidating
    };
  }, [formData, fieldMap, validationErrors, calculatedValues, isCalculating, isValidating, enableProgressiveDisclosure]);

  /**
   * Reset all advanced features
   */
  const resetAdvancedFeatures = useCallback(() => {
    // Clear timeouts
    if (calculationTimeoutRef.current) {
      clearTimeout(calculationTimeoutRef.current);
    }
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Reset state
    setCalculatedValues({});
    setValidationErrors({});
    setFieldDependencies({});
    setCurrentSection(null);
    setSectionProgress([]);
    setIsCalculating(false);
    setIsValidating(false);

    // Reset engines
    advancedFormulaEngine.clear();
    progressiveFormDisclosure.reset();

    // Reset refs
    lastCalculationRef.current = {};
    lastValidationRef.current = {};
  }, []);

  /**
   * Initialize advanced features on mount
   */
  useEffect(() => {
    if (enableAutoCalculation || enableAdvancedValidation) {
      // Initial calculation and validation
      calculateFieldValues();
      validateFieldValues();
    }

    if (enableProgressiveDisclosure) {
      updateSectionProgress();
    }

    // Cleanup on unmount
    return () => {
      if (calculationTimeoutRef.current) {
        clearTimeout(calculationTimeoutRef.current);
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [enableAutoCalculation, enableAdvancedValidation, enableProgressiveDisclosure]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Update calculations and validations when form data changes externally
   */
  useEffect(() => {
    if (enableAutoCalculation) {
      calculateFieldValues();
    }
    if (enableAdvancedValidation) {
      validateFieldValues();
    }
    if (enableProgressiveDisclosure) {
      updateSectionProgress();
    }
  }, [formData]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // State
    formData,
    calculatedValues,
    validationErrors,
    fieldDependencies,
    currentSection,
    sectionProgress,
    isCalculating,
    isValidating,

    // Registration methods
    registerCalculationField,
    registerValidationRule,
    registerFormSection,

    // Data manipulation
    handleFormDataChange,
    setFormData,

    // Navigation methods
    navigateToNextSection,
    navigateToPreviousSection,
    navigateToSection,

    // Status methods
    getFormCompletionStatus,

    // Utility methods
    resetAdvancedFeatures,
    calculateFieldValues,
    validateFieldValues,
    updateSectionProgress,

    // Computed properties
    hasCalculations: Object.keys(calculatedValues).length > 0,
    hasValidationErrors: Object.keys(validationErrors).length > 0,
    canNavigateNext: enableProgressiveDisclosure ? progressiveFormDisclosure.canAdvance(formData, fieldMap) : true,
    canNavigateBack: enableProgressiveDisclosure ? progressiveFormDisclosure.canGoBack() : false,

    // Engine instances (for advanced usage)
    advancedFormulaEngine,
    progressiveFormDisclosure
  };
}

export default useAdvancedFormFeatures;