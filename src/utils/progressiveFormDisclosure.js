/**
 * Progressive Form Disclosure System for Q-Collector Framework v1.0
 * Advanced form flow control with section-based visibility and dynamic form progression
 *
 * Features:
 * - Section-based form progression
 * - Dynamic section visibility based on responses
 * - Multi-step form wizard with validation
 * - Branching logic and conditional paths
 * - Progress tracking and completion indicators
 * - Smart form sections with auto-advance
 */

import { advancedFormulaEngine } from './advancedFormulaEngine.js';
import { formulaEngine } from './formulaEngine.js';

/**
 * Form Section Definition
 */
class FormSection {
  constructor(options = {}) {
    this.id = options.id || `section_${Date.now()}`;
    this.title = options.title || 'Untitled Section';
    this.description = options.description || '';
    this.fields = options.fields || [];
    this.showCondition = options.showCondition || null; // Formula for section visibility
    this.requiredCondition = options.requiredCondition || null; // Formula for section requirement
    this.completionCondition = options.completionCondition || null; // Formula for section completion
    this.order = options.order || 0;
    this.allowSkip = options.allowSkip !== false;
    this.autoAdvance = options.autoAdvance === true;
    this.advanceDelay = options.advanceDelay || 1000; // ms
    this.icon = options.icon || null;
    this.color = options.color || 'primary';
    this.layout = options.layout || 'vertical'; // vertical, horizontal, grid
  }

  /**
   * Check if section should be visible
   */
  isVisible(formData, fieldMap) {
    if (!this.showCondition) return true;

    try {
      return formulaEngine.evaluate(this.showCondition, formData, fieldMap);
    } catch (error) {
      console.warn(`Section visibility check failed for ${this.id}:`, error);
      return true; // Default to visible on error
    }
  }

  /**
   * Check if section is required
   */
  isRequired(formData, fieldMap) {
    if (!this.requiredCondition) return true;

    try {
      return formulaEngine.evaluate(this.requiredCondition, formData, fieldMap);
    } catch (error) {
      console.warn(`Section requirement check failed for ${this.id}:`, error);
      return true; // Default to required on error
    }
  }

  /**
   * Check if section is complete
   */
  isComplete(formData, fieldMap) {
    // Custom completion condition
    if (this.completionCondition) {
      try {
        return formulaEngine.evaluate(this.completionCondition, formData, fieldMap);
      } catch (error) {
        console.warn(`Section completion check failed for ${this.id}:`, error);
        return false;
      }
    }

    // Default: check if all required fields in section are filled
    return this.fields.every(fieldId => {
      const field = fieldMap[fieldId];
      if (!field || !field.required) return true;

      const value = formData[fieldId];
      return value !== null && value !== undefined && value !== '';
    });
  }

  /**
   * Get completion percentage for section
   */
  getCompletionPercentage(formData, fieldMap) {
    if (this.fields.length === 0) return 100;

    const filledFields = this.fields.filter(fieldId => {
      const value = formData[fieldId];
      return value !== null && value !== undefined && value !== '';
    });

    return Math.round((filledFields.length / this.fields.length) * 100);
  }
}

/**
 * Progressive Form Disclosure Engine
 */
class ProgressiveFormDisclosureEngine {
  constructor() {
    this.sections = new Map(); // Section definitions
    this.sectionOrder = []; // Ordered list of section IDs
    this.currentSection = null;
    this.completedSections = new Set();
    this.visitedSections = new Set();
    this.sectionHistory = []; // Navigation history
    this.listeners = new Map(); // Event listeners
    this.config = {
      enableAutoAdvance: true,
      enableBackNavigation: true,
      enableSkipping: true,
      showProgress: true,
      validateOnAdvance: true,
      saveOnSectionChange: true
    };
  }

  /**
   * Register a form section
   */
  registerSection(sectionOptions) {
    const section = new FormSection(sectionOptions);
    this.sections.set(section.id, section);

    // Maintain order
    if (!this.sectionOrder.includes(section.id)) {
      this.sectionOrder.push(section.id);
      this.sectionOrder.sort((a, b) => {
        const sectionA = this.sections.get(a);
        const sectionB = this.sections.get(b);
        return sectionA.order - sectionB.order;
      });
    }

    return section;
  }

  /**
   * Remove a section
   */
  removeSection(sectionId) {
    this.sections.delete(sectionId);
    this.sectionOrder = this.sectionOrder.filter(id => id !== sectionId);
    this.completedSections.delete(sectionId);
    this.visitedSections.delete(sectionId);
  }

  /**
   * Get all visible sections for current form data
   */
  getVisibleSections(formData, fieldMap) {
    return this.sectionOrder
      .map(id => this.sections.get(id))
      .filter(section => section && section.isVisible(formData, fieldMap));
  }

  /**
   * Get current section
   */
  getCurrentSection() {
    return this.currentSection ? this.sections.get(this.currentSection) : null;
  }

  /**
   * Navigate to specific section
   */
  navigateToSection(sectionId, formData = {}, fieldMap = {}) {
    const section = this.sections.get(sectionId);
    if (!section) {
      throw new Error(`Section not found: ${sectionId}`);
    }

    // Check if section is visible
    if (!section.isVisible(formData, fieldMap)) {
      throw new Error(`Section not visible: ${sectionId}`);
    }

    // Update history
    if (this.currentSection && this.currentSection !== sectionId) {
      this.sectionHistory.push(this.currentSection);
    }

    // Mark as visited
    this.visitedSections.add(sectionId);

    // Update current section
    const previousSection = this.currentSection;
    this.currentSection = sectionId;

    // Emit navigation event
    this.emit('sectionChanged', {
      from: previousSection,
      to: sectionId,
      section: section,
      formData: formData
    });

    return section;
  }

  /**
   * Navigate to next section
   */
  navigateNext(formData = {}, fieldMap = {}, options = {}) {
    const visibleSections = this.getVisibleSections(formData, fieldMap);
    const currentIndex = visibleSections.findIndex(s => s.id === this.currentSection);

    if (currentIndex === -1) {
      // No current section, go to first
      if (visibleSections.length > 0) {
        return this.navigateToSection(visibleSections[0].id, formData, fieldMap);
      }
      return null;
    }

    // Validate current section if required
    if (this.config.validateOnAdvance && !options.skipValidation) {
      const currentSectionObj = visibleSections[currentIndex];
      if (!currentSectionObj.isComplete(formData, fieldMap)) {
        this.emit('validationFailed', {
          section: currentSectionObj,
          formData: formData
        });
        throw new Error(`Current section incomplete: ${this.currentSection}`);
      }
    }

    // Mark current section as completed
    if (this.currentSection) {
      this.completedSections.add(this.currentSection);
    }

    // Find next visible section
    const nextIndex = currentIndex + 1;
    if (nextIndex < visibleSections.length) {
      return this.navigateToSection(visibleSections[nextIndex].id, formData, fieldMap);
    }

    // No more sections - form complete
    this.emit('formCompleted', {
      completedSections: Array.from(this.completedSections),
      formData: formData
    });

    return null;
  }

  /**
   * Navigate to previous section
   */
  navigatePrevious(formData = {}, fieldMap = {}) {
    if (!this.config.enableBackNavigation) {
      throw new Error('Back navigation is disabled');
    }

    if (this.sectionHistory.length === 0) {
      return null; // No previous section
    }

    const previousSectionId = this.sectionHistory.pop();
    const previousSection = this.sections.get(previousSectionId);

    if (!previousSection || !previousSection.isVisible(formData, fieldMap)) {
      // Previous section no longer visible, try earlier one
      return this.navigatePrevious(formData, fieldMap);
    }

    this.currentSection = previousSectionId;

    this.emit('sectionChanged', {
      from: this.currentSection,
      to: previousSectionId,
      section: previousSection,
      direction: 'backward',
      formData: formData
    });

    return previousSection;
  }

  /**
   * Check if form can advance to next section
   */
  canAdvance(formData = {}, fieldMap = {}) {
    if (!this.currentSection) return true;

    const section = this.sections.get(this.currentSection);
    if (!section) return false;

    // Check if section allows skipping
    if (section.allowSkip) return true;

    // Check if section is complete
    return section.isComplete(formData, fieldMap);
  }

  /**
   * Check if form can go back
   */
  canGoBack() {
    return this.config.enableBackNavigation && this.sectionHistory.length > 0;
  }

  /**
   * Get overall form progress
   */
  getFormProgress(formData = {}, fieldMap = {}) {
    const visibleSections = this.getVisibleSections(formData, fieldMap);
    const totalSections = visibleSections.length;

    if (totalSections === 0) return 100;

    const completedCount = visibleSections.filter(section =>
      this.completedSections.has(section.id) || section.isComplete(formData, fieldMap)
    ).length;

    return Math.round((completedCount / totalSections) * 100);
  }

  /**
   * Get section progress details
   */
  getSectionProgress(formData = {}, fieldMap = {}) {
    const visibleSections = this.getVisibleSections(formData, fieldMap);

    return visibleSections.map((section, index) => ({
      id: section.id,
      title: section.title,
      order: index + 1,
      isVisible: true,
      isRequired: section.isRequired(formData, fieldMap),
      isComplete: section.isComplete(formData, fieldMap),
      isCurrent: section.id === this.currentSection,
      isVisited: this.visitedSections.has(section.id),
      completionPercentage: section.getCompletionPercentage(formData, fieldMap),
      allowSkip: section.allowSkip,
      icon: section.icon,
      color: section.color
    }));
  }

  /**
   * Auto-advance logic for sections with autoAdvance enabled
   */
  checkAutoAdvance(formData = {}, fieldMap = {}) {
    if (!this.config.enableAutoAdvance || !this.currentSection) return;

    const section = this.sections.get(this.currentSection);
    if (!section || !section.autoAdvance) return;

    // Check if section is complete and can advance
    if (section.isComplete(formData, fieldMap) && this.canAdvance(formData, fieldMap)) {
      // Delay auto-advance to give user time to see completion
      setTimeout(() => {
        try {
          this.navigateNext(formData, fieldMap, { skipValidation: true });
        } catch (error) {
          console.warn('Auto-advance failed:', error);
        }
      }, section.advanceDelay);
    }
  }

  /**
   * Recalculate section visibility and update navigation
   */
  recalculateFlow(formData = {}, fieldMap = {}) {
    const previousVisibleSections = this.getVisibleSections({}, {});
    const currentVisibleSections = this.getVisibleSections(formData, fieldMap);

    // Check if current section is still visible
    if (this.currentSection) {
      const currentSection = this.sections.get(this.currentSection);
      if (!currentSection || !currentSection.isVisible(formData, fieldMap)) {
        // Current section no longer visible, navigate to next available
        const nextSection = currentVisibleSections.find(s =>
          this.sectionOrder.indexOf(s.id) > this.sectionOrder.indexOf(this.currentSection)
        );

        if (nextSection) {
          this.navigateToSection(nextSection.id, formData, fieldMap);
        } else if (currentVisibleSections.length > 0) {
          this.navigateToSection(currentVisibleSections[0].id, formData, fieldMap);
        } else {
          this.currentSection = null;
        }
      }
    }

    // Check auto-advance
    this.checkAutoAdvance(formData, fieldMap);

    // Emit flow change event
    this.emit('flowRecalculated', {
      previousSections: previousVisibleSections.map(s => s.id),
      currentSections: currentVisibleSections.map(s => s.id),
      formData: formData
    });
  }

  /**
   * Event system
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Event listener error for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Reset form progression
   */
  reset() {
    this.currentSection = null;
    this.completedSections.clear();
    this.visitedSections.clear();
    this.sectionHistory = [];
    this.emit('formReset');
  }

  /**
   * Export form state for persistence
   */
  exportState() {
    return {
      currentSection: this.currentSection,
      completedSections: Array.from(this.completedSections),
      visitedSections: Array.from(this.visitedSections),
      sectionHistory: [...this.sectionHistory]
    };
  }

  /**
   * Import form state from persistence
   */
  importState(state) {
    this.currentSection = state.currentSection || null;
    this.completedSections = new Set(state.completedSections || []);
    this.visitedSections = new Set(state.visitedSections || []);
    this.sectionHistory = state.sectionHistory || [];
  }

  /**
   * Common section templates
   */
  static getCommonSectionTemplates() {
    return {
      // Personal Information Section
      personalInfo: {
        id: 'personal_info',
        title: 'ข้อมูลส่วนตัว',
        description: 'กรุณากรอกข้อมูลส่วนตัวของคุณ',
        icon: 'user',
        color: 'blue',
        order: 1
      },

      // Contact Information Section
      contactInfo: {
        id: 'contact_info',
        title: 'ข้อมูลการติดต่อ',
        description: 'กรุณากรอกข้อมูลการติดต่อ',
        icon: 'phone',
        color: 'green',
        order: 2,
        showCondition: 'ISNOTBLANK([Name])' // Show only if name is filled
      },

      // Employment Information (conditional)
      employmentInfo: {
        id: 'employment_info',
        title: 'ข้อมูลการทำงาน',
        description: 'กรุณากรอกข้อมูลการทำงาน',
        icon: 'briefcase',
        color: 'orange',
        order: 3,
        showCondition: '[EmploymentStatus] = "Employed"'
      },

      // Additional Documents (conditional)
      additionalDocs: {
        id: 'additional_docs',
        title: 'เอกสารเพิ่มเติม',
        description: 'กรุณาแนบเอกสารที่จำเป็น',
        icon: 'file',
        color: 'purple',
        order: 4,
        showCondition: 'OR([RequiresDocuments] = "Yes", [Age] >= 18)',
        allowSkip: true
      },

      // Review and Submit
      reviewSubmit: {
        id: 'review_submit',
        title: 'ตรวจสอบและส่งข้อมูล',
        description: 'กรุณาตรวจสอบข้อมูลก่อนส่ง',
        icon: 'check',
        color: 'green',
        order: 999,
        allowSkip: false
      }
    };
  }
}

// Export singleton instance
export const progressiveFormDisclosure = new ProgressiveFormDisclosureEngine();

// Export classes
export {
  ProgressiveFormDisclosureEngine,
  FormSection
};

// Export default
export default progressiveFormDisclosure;