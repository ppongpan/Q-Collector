/**
 * DataService.js - Local Storage Management for Q-Collector
 *
 * Features:
 * - Form CRUD operations (Create, Read, Update, Delete)
 * - Submission CRUD operations
 * - Sub Form Submission CRUD operations
 * - Data validation and schema enforcement
 * - Import/Export functionality
 * - Local Storage persistence
 */

class DataService {
  constructor() {
    this.STORAGE_KEYS = {
      FORMS: 'qcollector_forms',
      SUBMISSIONS: 'qcollector_submissions',
      SUB_SUBMISSIONS: 'qcollector_sub_submissions',
      SETTINGS: 'qcollector_settings'
    };
    this.initializeStorage();
  }

  // ========== INITIALIZATION ==========

  initializeStorage() {
    // Initialize empty storage if not exists
    Object.values(this.STORAGE_KEYS).forEach(key => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({}));
      }
    });
  }

  generateId(prefix = '') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}${timestamp}-${random}`;
  }

  getCurrentTimestamp() {
    return new Date().toISOString();
  }

  // ========== FORM OPERATIONS ==========

  /**
   * Create a new form
   * @param {Object} formData - Form configuration data
   * @returns {Object} Created form with ID and timestamps
   */
  createForm(formData) {
    const formId = this.generateId('form-');
    const timestamp = this.getCurrentTimestamp();

    const form = {
      id: formId,
      title: formData.title || 'ฟอร์มใหม่',
      description: formData.description || '',
      fields: formData.fields || [],
      subForms: formData.subForms || [],
      settings: formData.settings || {},
      visibleRoles: formData.visibleRoles || formData.userRoles || [],
      telegramSettings: formData.telegramSettings || {},
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Validate form data
    if (!this.validateForm(form)) {
      throw new Error('Form validation failed');
    }

    const forms = this.getAllForms();
    forms[formId] = form;
    localStorage.setItem(this.STORAGE_KEYS.FORMS, JSON.stringify(forms));

    return form;
  }

  /**
   * Get all forms
   * @returns {Object} All forms indexed by ID
   */
  getAllForms() {
    try {
      const formsData = localStorage.getItem(this.STORAGE_KEYS.FORMS);
      return formsData ? JSON.parse(formsData) : {};
    } catch (error) {
      console.error('Error loading forms:', error);
      return {};
    }
  }

  /**
   * Get forms as array sorted by updatedAt
   * @returns {Array} Array of forms sorted by most recent
   */
  getFormsArray() {
    const forms = this.getAllForms();
    return Object.values(forms).sort((a, b) =>
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  /**
   * Get form by ID
   * @param {string} formId - Form ID
   * @returns {Object|null} Form data or null if not found
   */
  getForm(formId) {
    const forms = this.getAllForms();
    return forms[formId] || null;
  }

  /**
   * Update existing form
   * @param {string} formId - Form ID
   * @param {Object} updates - Form updates
   * @returns {Object} Updated form
   */
  updateForm(formId, updates) {
    const forms = this.getAllForms();
    const existingForm = forms[formId];

    if (!existingForm) {
      throw new Error(`Form with ID ${formId} not found`);
    }

    const updatedForm = {
      ...existingForm,
      ...updates,
      id: formId, // Ensure ID doesn't change
      updatedAt: this.getCurrentTimestamp()
    };

    // Validate updated form
    if (!this.validateForm(updatedForm)) {
      throw new Error('Form validation failed');
    }

    forms[formId] = updatedForm;
    localStorage.setItem(this.STORAGE_KEYS.FORMS, JSON.stringify(forms));

    return updatedForm;
  }

  /**
   * Delete form and all related submissions
   * @param {string} formId - Form ID
   * @returns {boolean} Success status
   */
  deleteForm(formId) {
    const forms = this.getAllForms();

    if (!forms[formId]) {
      throw new Error(`Form with ID ${formId} not found`);
    }

    // Delete all submissions for this form
    this.deleteAllSubmissionsByFormId(formId);

    // Delete the form
    delete forms[formId];
    localStorage.setItem(this.STORAGE_KEYS.FORMS, JSON.stringify(forms));

    return true;
  }

  /**
   * Validate form structure
   * @param {Object} form - Form to validate
   * @returns {boolean} Is valid
   */
  validateForm(form) {
    return (
      form.id &&
      typeof form.title === 'string' &&
      Array.isArray(form.fields) &&
      Array.isArray(form.subForms) &&
      typeof form.settings === 'object'
    );
  }

  // ========== SUBMISSION OPERATIONS ==========

  /**
   * Create new submission
   * @param {string} formId - Form ID
   * @param {Object} data - Submission data
   * @returns {Object} Created submission
   */
  createSubmission(formId, data) {
    const submissionId = this.generateId('sub-');
    const timestamp = this.getCurrentTimestamp();

    const submission = {
      id: submissionId,
      formId: formId,
      data: data,
      submittedAt: timestamp
    };

    const submissions = this.getAllSubmissions();
    submissions[submissionId] = submission;
    localStorage.setItem(this.STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));

    return submission;
  }

  /**
   * Get all submissions
   * @returns {Object} All submissions indexed by ID
   */
  getAllSubmissions() {
    try {
      const submissionsData = localStorage.getItem(this.STORAGE_KEYS.SUBMISSIONS);
      return submissionsData ? JSON.parse(submissionsData) : {};
    } catch (error) {
      console.error('Error loading submissions:', error);
      return {};
    }
  }

  /**
   * Get submissions by form ID
   * @param {string} formId - Form ID
   * @returns {Array} Array of submissions for the form
   */
  getSubmissionsByFormId(formId) {
    const submissions = this.getAllSubmissions();
    return Object.values(submissions)
      .filter(sub => sub.formId === formId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  /**
   * Get submission by ID
   * @param {string} submissionId - Submission ID
   * @returns {Object|null} Submission data or null
   */
  getSubmission(submissionId) {
    const submissions = this.getAllSubmissions();
    return submissions[submissionId] || null;
  }

  /**
   * Update submission
   * @param {string} submissionId - Submission ID
   * @param {Object} data - Updated data
   * @returns {Object} Updated submission
   */
  updateSubmission(submissionId, data) {
    const submissions = this.getAllSubmissions();
    const existingSubmission = submissions[submissionId];

    if (!existingSubmission) {
      throw new Error(`Submission with ID ${submissionId} not found`);
    }

    const updatedSubmission = {
      ...existingSubmission,
      data: data,
      updatedAt: this.getCurrentTimestamp()
    };

    submissions[submissionId] = updatedSubmission;
    localStorage.setItem(this.STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));

    return updatedSubmission;
  }

  /**
   * Delete submission
   * @param {string} submissionId - Submission ID
   * @returns {boolean} Success status
   */
  deleteSubmission(submissionId) {
    const submissions = this.getAllSubmissions();

    if (!submissions[submissionId]) {
      throw new Error(`Submission with ID ${submissionId} not found`);
    }

    // Delete all sub form submissions for this submission
    this.deleteAllSubSubmissionsByParentId(submissionId);

    delete submissions[submissionId];
    localStorage.setItem(this.STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));

    return true;
  }

  /**
   * Delete all submissions by form ID
   * @param {string} formId - Form ID
   * @returns {number} Number of deleted submissions
   */
  deleteAllSubmissionsByFormId(formId) {
    const submissions = this.getAllSubmissions();
    const submissionsToDelete = Object.values(submissions).filter(sub => sub.formId === formId);

    // Delete all sub submissions first
    submissionsToDelete.forEach(sub => {
      this.deleteAllSubSubmissionsByParentId(sub.id);
    });

    // Delete main submissions
    submissionsToDelete.forEach(sub => {
      delete submissions[sub.id];
    });

    localStorage.setItem(this.STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));
    return submissionsToDelete.length;
  }

  // ========== SUB FORM SUBMISSION OPERATIONS ==========

  /**
   * Create sub form submission
   * @param {string} parentSubmissionId - Parent submission ID
   * @param {string} subFormId - Sub form ID
   * @param {Object} data - Sub form data
   * @returns {Object} Created sub submission
   */
  createSubSubmission(parentSubmissionId, subFormId, data) {
    const subSubmissionId = this.generateId('subsub-');
    const timestamp = this.getCurrentTimestamp();

    const subSubmission = {
      id: subSubmissionId,
      parentSubmissionId: parentSubmissionId,
      subFormId: subFormId,
      data: data,
      submittedAt: timestamp
    };

    const subSubmissions = this.getAllSubSubmissions();
    subSubmissions[subSubmissionId] = subSubmission;
    localStorage.setItem(this.STORAGE_KEYS.SUB_SUBMISSIONS, JSON.stringify(subSubmissions));

    return subSubmission;
  }

  /**
   * Get all sub submissions
   * @returns {Object} All sub submissions indexed by ID
   */
  getAllSubSubmissions() {
    try {
      const subSubmissionsData = localStorage.getItem(this.STORAGE_KEYS.SUB_SUBMISSIONS);
      return subSubmissionsData ? JSON.parse(subSubmissionsData) : {};
    } catch (error) {
      console.error('Error loading sub submissions:', error);
      return {};
    }
  }

  /**
   * Get sub submissions by parent submission ID
   * @param {string} parentSubmissionId - Parent submission ID
   * @returns {Array} Array of sub submissions
   */
  getSubSubmissionsByParentId(parentSubmissionId) {
    const subSubmissions = this.getAllSubSubmissions();
    return Object.values(subSubmissions)
      .filter(sub => sub.parentSubmissionId === parentSubmissionId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  /**
   * Get sub submissions by sub form ID
   * @param {string} subFormId - Sub form ID
   * @returns {Array} Array of sub submissions
   */
  getSubSubmissionsBySubFormId(subFormId) {
    const subSubmissions = this.getAllSubSubmissions();
    return Object.values(subSubmissions)
      .filter(sub => sub.subFormId === subFormId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  /**
   * Get sub submission by ID
   * @param {string} subSubmissionId - Sub submission ID
   * @returns {Object|null} Sub submission data or null
   */
  getSubSubmission(subSubmissionId) {
    const subSubmissions = this.getAllSubSubmissions();
    return subSubmissions[subSubmissionId] || null;
  }

  /**
   * Update sub submission
   * @param {string} subSubmissionId - Sub submission ID
   * @param {Object} data - Updated data
   * @returns {Object} Updated sub submission
   */
  updateSubSubmission(subSubmissionId, data) {
    const subSubmissions = this.getAllSubSubmissions();
    const existingSubSubmission = subSubmissions[subSubmissionId];

    if (!existingSubSubmission) {
      throw new Error(`Sub submission with ID ${subSubmissionId} not found`);
    }

    const updatedSubSubmission = {
      ...existingSubSubmission,
      data: data,
      updatedAt: this.getCurrentTimestamp()
    };

    subSubmissions[subSubmissionId] = updatedSubSubmission;
    localStorage.setItem(this.STORAGE_KEYS.SUB_SUBMISSIONS, JSON.stringify(subSubmissions));

    return updatedSubSubmission;
  }

  /**
   * Delete sub submission
   * @param {string} subSubmissionId - Sub submission ID
   * @returns {boolean} Success status
   */
  deleteSubSubmission(subSubmissionId) {
    const subSubmissions = this.getAllSubSubmissions();

    if (!subSubmissions[subSubmissionId]) {
      throw new Error(`Sub submission with ID ${subSubmissionId} not found`);
    }

    delete subSubmissions[subSubmissionId];
    localStorage.setItem(this.STORAGE_KEYS.SUB_SUBMISSIONS, JSON.stringify(subSubmissions));

    return true;
  }

  /**
   * Delete all sub submissions by parent ID
   * @param {string} parentSubmissionId - Parent submission ID
   * @returns {number} Number of deleted sub submissions
   */
  deleteAllSubSubmissionsByParentId(parentSubmissionId) {
    const subSubmissions = this.getAllSubSubmissions();
    const subSubmissionsToDelete = Object.values(subSubmissions)
      .filter(sub => sub.parentSubmissionId === parentSubmissionId);

    subSubmissionsToDelete.forEach(sub => {
      delete subSubmissions[sub.id];
    });

    localStorage.setItem(this.STORAGE_KEYS.SUB_SUBMISSIONS, JSON.stringify(subSubmissions));
    return subSubmissionsToDelete.length;
  }

  // ========== UTILITY OPERATIONS ==========

  /**
   * Get statistics
   * @returns {Object} Usage statistics
   */
  getStatistics() {
    const forms = this.getAllForms();
    const submissions = this.getAllSubmissions();
    const subSubmissions = this.getAllSubSubmissions();

    return {
      totalForms: Object.keys(forms).length,
      totalSubmissions: Object.keys(submissions).length,
      totalSubSubmissions: Object.keys(subSubmissions).length,
      lastActivity: this.getLastActivityDate()
    };
  }

  /**
   * Get last activity date
   * @returns {string|null} ISO date string or null
   */
  getLastActivityDate() {
    const forms = Object.values(this.getAllForms());
    const submissions = Object.values(this.getAllSubmissions());
    const subSubmissions = Object.values(this.getAllSubSubmissions());

    const allDates = [
      ...forms.map(f => f.updatedAt || f.createdAt),
      ...submissions.map(s => s.submittedAt),
      ...subSubmissions.map(s => s.submittedAt)
    ].filter(Boolean);

    return allDates.length > 0
      ? allDates.sort((a, b) => new Date(b) - new Date(a))[0]
      : null;
  }

  /**
   * Export all data
   * @returns {Object} All data for backup
   */
  exportAllData() {
    return {
      forms: this.getAllForms(),
      submissions: this.getAllSubmissions(),
      subSubmissions: this.getAllSubSubmissions(),
      exportedAt: this.getCurrentTimestamp(),
      version: '0.1.5'
    };
  }

  /**
   * Import data (replaces existing)
   * @param {Object} data - Data to import
   * @returns {boolean} Success status
   */
  importData(data) {
    try {
      if (data.forms) {
        localStorage.setItem(this.STORAGE_KEYS.FORMS, JSON.stringify(data.forms));
      }
      if (data.submissions) {
        localStorage.setItem(this.STORAGE_KEYS.SUBMISSIONS, JSON.stringify(data.submissions));
      }
      if (data.subSubmissions) {
        localStorage.setItem(this.STORAGE_KEYS.SUB_SUBMISSIONS, JSON.stringify(data.subSubmissions));
      }
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }

  /**
   * Clear all data
   * @returns {boolean} Success status
   */
  clearAllData() {
    try {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.setItem(key, JSON.stringify({}));
      });
      return true;
    } catch (error) {
      console.error('Clear data failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const dataService = new DataService();
export default dataService;

// Export class for testing
export { DataService };