/**
 * DataService.js - Local Storage Management for Q-Collector
 *
 * ⚠️ DEPRECATED - DO NOT USE IN NEW CODE ⚠️
 *
 * This service is being phased out in favor of API-based data management.
 * All components should use apiClient and backend services instead.
 *
 * Migration Guide:
 * - dataService.createForm() → apiClient.createForm()
 * - dataService.getForm() → apiClient.getForm()
 * - dataService.updateForm() → apiClient.updateForm()
 * - dataService.deleteForm() → apiClient.deleteForm()
 * - dataService.createSubmission() → submissionService.createSubmission()
 * - dataService.getSubmission() → apiClient.getSubmission()
 * - dataService.updateSubmission() → submissionService.updateSubmission()
 * - dataService.deleteSubmission() → apiClient.deleteSubmission()
 *
 * See: src/services/ApiClient.js and backend/services/
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
    this._logDeprecationWarning('DataService initialized - Consider migrating to API-based services');
  }

  /**
   * Log deprecation warning
   * @private
   */
  _logDeprecationWarning(method) {
    console.warn(
      `%c⚠️ DEPRECATED: ${method}`,
      'color: #f97316; font-weight: bold; font-size: 12px;',
      '\n📝 DataService is deprecated and will be removed in v0.8.0',
      '\n✅ Use apiClient and backend services instead',
      '\n📖 See migration guide in DataService.js header'
    );
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
   * @deprecated Use apiClient.createForm() instead
   * @param {Object} formData - Form configuration data
   * @returns {Object} Created form with ID and timestamps
   */
  createForm(formData) {
    this._logDeprecationWarning('dataService.createForm() - Use apiClient.createForm()');
    const formId = this.generateId('form-');
    const timestamp = this.getCurrentTimestamp();

    const form = {
      id: formId,
      title: formData.title || 'ฟอร์มใหม่',
      description: formData.description || '',
      fields: formData.fields || [],
      subForms: formData.subForms || [],
      settings: formData.settings || {},
      visibleRoles: formData.visibleRoles || formData.roles_allowed || formData.userRoles || [],
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
   * @deprecated Use apiClient.listForms() instead
   * @returns {Object} All forms indexed by ID
   */
  getAllForms() {
    this._logDeprecationWarning('dataService.getAllForms() - Use apiClient.listForms()');
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
   * @deprecated Use apiClient.getForm(formId) instead
   * @param {string} formId - Form ID
   * @returns {Object|null} Form data or null if not found
   */
  getForm(formId) {
    this._logDeprecationWarning('dataService.getForm() - Use apiClient.getForm()');
    const forms = this.getAllForms();
    return forms[formId] || null;
  }

  /**
   * Update existing form
   * @deprecated Use apiClient.updateForm(formId, updates) instead
   * @param {string} formId - Form ID
   * @param {Object} updates - Form updates
   * @returns {Object} Updated form
   */
  updateForm(formId, updates) {
    this._logDeprecationWarning('dataService.updateForm() - Use apiClient.updateForm()');
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
   * @deprecated Use apiClient.deleteForm(formId) instead
   * @param {string} formId - Form ID
   * @returns {boolean} Success status
   */
  deleteForm(formId) {
    this._logDeprecationWarning('dataService.deleteForm() - Use apiClient.deleteForm()');
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
   * @deprecated Use submissionService.createSubmission() or apiClient.createSubmission() instead
   * @param {string} formId - Form ID
   * @param {Object} data - Submission data
   * @returns {Object} Created submission
   */
  createSubmission(formId, data) {
    this._logDeprecationWarning('dataService.createSubmission() - Use submissionService.createSubmission()');
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
   * @deprecated Use apiClient.listSubmissions(formId) instead
   * @param {string} formId - Form ID
   * @returns {Array} Array of submissions for the form
   */
  getSubmissionsByFormId(formId) {
    this._logDeprecationWarning('dataService.getSubmissionsByFormId() - Use apiClient.listSubmissions()');
    const submissions = this.getAllSubmissions();
    return Object.values(submissions)
      .filter(sub => sub.formId === formId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  /**
   * Get submission by ID
   * @deprecated Use apiClient.getSubmission(submissionId) instead
   * @param {string} submissionId - Submission ID
   * @returns {Object|null} Submission data or null
   */
  getSubmission(submissionId) {
    this._logDeprecationWarning('dataService.getSubmission() - Use apiClient.getSubmission()');
    const submissions = this.getAllSubmissions();
    return submissions[submissionId] || null;
  }

  /**
   * Update submission
   * @deprecated Use submissionService.updateSubmission() or apiClient.put() instead
   * @param {string} submissionId - Submission ID
   * @param {Object} data - Updated data
   * @returns {Object} Updated submission
   */
  updateSubmission(submissionId, data) {
    this._logDeprecationWarning('dataService.updateSubmission() - Use submissionService.updateSubmission()');
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
   * @deprecated Use apiClient.deleteSubmission(submissionId) instead
   * @param {string} submissionId - Submission ID
   * @returns {boolean} Success status
   */
  deleteSubmission(submissionId) {
    this._logDeprecationWarning('dataService.deleteSubmission() - Use apiClient.deleteSubmission()');
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
   * @deprecated Use apiClient.post(`/api/v1/subforms/${subFormId}/submissions`, data) instead
   * @param {string} parentSubmissionId - Parent submission ID
   * @param {string} subFormId - Sub form ID
   * @param {Object} data - Sub form data
   * @returns {Object} Created sub submission
   */
  createSubSubmission(parentSubmissionId, subFormId, data) {
    this._logDeprecationWarning('dataService.createSubSubmission() - Use API endpoint');
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
   * @deprecated Use apiClient.get(`/api/v1/subforms/${subFormId}/submissions?parentId=${parentId}`) instead
   * @param {string} parentSubmissionId - Parent submission ID
   * @returns {Array} Array of sub submissions
   */
  getSubSubmissionsByParentId(parentSubmissionId) {
    this._logDeprecationWarning('dataService.getSubSubmissionsByParentId() - Use API endpoint');
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
   * @deprecated Use apiClient.get(`/api/v1/subforms/${subFormId}/submissions/${id}`) instead
   * @param {string} subSubmissionId - Sub submission ID
   * @returns {Object|null} Sub submission data or null
   */
  getSubSubmission(subSubmissionId) {
    this._logDeprecationWarning('dataService.getSubSubmission() - Use API endpoint');
    const subSubmissions = this.getAllSubSubmissions();
    return subSubmissions[subSubmissionId] || null;
  }

  /**
   * Update sub submission
   * @deprecated Use apiClient.put(`/api/v1/subforms/${subFormId}/submissions/${id}`, data) instead
   * @param {string} subSubmissionId - Sub submission ID
   * @param {Object} data - Updated data
   * @returns {Object} Updated sub submission
   */
  updateSubSubmission(subSubmissionId, data) {
    this._logDeprecationWarning('dataService.updateSubSubmission() - Use API endpoint');
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