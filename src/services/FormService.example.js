/**
 * Form Service Example
 * Example implementation of a service layer using API Client
 * Use this as a template for creating other services
 * @version 0.4.1
 */

import apiClient from './ApiClient';
import API_CONFIG from '../config/api.config';
import { buildQueryString } from '../utils/apiHelpers';

/**
 * Form Service
 * Handles all form-related API operations
 */
class FormService {
  /**
   * Get all forms with optional filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.limit - Items per page
   * @param {string} params.search - Search query
   * @param {string} params.status - Filter by status (draft, published)
   * @param {string[]} params.roles - Filter by allowed roles
   * @returns {Promise<Object>} Forms list with pagination
   */
  async getForms(params = {}) {
    const queryString = buildQueryString(params);
    const url = `${API_CONFIG.endpoints.forms.base}${
      queryString ? `?${queryString}` : ''
    }`;
    return apiClient.get(url);
  }

  /**
   * Get single form by ID
   * @param {string} id - Form ID
   * @returns {Promise<Object>} Form object
   */
  async getForm(id) {
    if (!id) {
      throw new Error('Form ID is required');
    }
    return apiClient.get(API_CONFIG.endpoints.forms.byId(id));
  }

  /**
   * Create new form
   * @param {Object} formData - Form data
   * @param {string} formData.title - Form title
   * @param {string} formData.description - Form description
   * @param {Array} formData.fields - Form fields
   * @param {Array} formData.allowedRoles - Allowed user roles
   * @returns {Promise<Object>} Created form object
   */
  async createForm(formData) {
    // Validate required fields
    if (!formData.title) {
      throw new Error('Form title is required');
    }

    // Transform data if needed
    const payload = {
      title: formData.title,
      description: formData.description || '',
      fields: formData.fields || [],
      allowedRoles: formData.allowedRoles || ['user'],
      status: 'draft',
    };

    return apiClient.post(API_CONFIG.endpoints.forms.base, payload);
  }

  /**
   * Update existing form
   * @param {string} id - Form ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated form object
   */
  async updateForm(id, updates) {
    if (!id) {
      throw new Error('Form ID is required');
    }

    return apiClient.put(API_CONFIG.endpoints.forms.byId(id), updates);
  }

  /**
   * Delete form
   * @param {string} id - Form ID
   * @returns {Promise<void>}
   */
  async deleteForm(id) {
    if (!id) {
      throw new Error('Form ID is required');
    }

    return apiClient.delete(API_CONFIG.endpoints.forms.byId(id));
  }

  /**
   * Publish form (make it available to users)
   * @param {string} id - Form ID
   * @returns {Promise<Object>} Updated form object
   */
  async publishForm(id) {
    if (!id) {
      throw new Error('Form ID is required');
    }

    return apiClient.post(API_CONFIG.endpoints.forms.publish(id));
  }

  /**
   * Unpublish form (hide from users)
   * @param {string} id - Form ID
   * @returns {Promise<Object>} Updated form object
   */
  async unpublishForm(id) {
    if (!id) {
      throw new Error('Form ID is required');
    }

    return apiClient.post(API_CONFIG.endpoints.forms.unpublish(id));
  }

  /**
   * Duplicate form
   * @param {string} id - Form ID to duplicate
   * @param {string} newTitle - Title for duplicated form
   * @returns {Promise<Object>} New form object
   */
  async duplicateForm(id, newTitle) {
    // Get original form
    const originalForm = await this.getForm(id);

    // Create copy with new title
    const duplicateData = {
      ...originalForm,
      id: undefined, // Remove ID so backend creates new one
      title: newTitle || `${originalForm.title} (Copy)`,
      status: 'draft',
    };

    return this.createForm(duplicateData);
  }

  /**
   * Search forms by title or description
   * @param {string} query - Search query
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Search results
   */
  async searchForms(query, options = {}) {
    const params = {
      search: query,
      ...options,
    };

    return this.getForms(params);
  }
}

// Export singleton instance
const formService = new FormService();
export default formService;

// Also export class for testing or custom instances
export { FormService };

/**
 * Usage Examples:
 *
 * // Import
 * import formService from './services/FormService.example';
 *
 * // Get all forms
 * const forms = await formService.getForms();
 *
 * // Get with pagination
 * const forms = await formService.getForms({ page: 1, limit: 10 });
 *
 * // Search forms
 * const results = await formService.searchForms('customer survey');
 *
 * // Get single form
 * const form = await formService.getForm('form_123');
 *
 * // Create form
 * const newForm = await formService.createForm({
 *   title: 'Customer Feedback',
 *   description: 'Quarterly survey',
 *   fields: [...],
 *   allowedRoles: ['user', 'manager']
 * });
 *
 * // Update form
 * const updated = await formService.updateForm('form_123', {
 *   title: 'Updated Title'
 * });
 *
 * // Publish form
 * await formService.publishForm('form_123');
 *
 * // Delete form
 * await formService.deleteForm('form_123');
 *
 * // Duplicate form
 * const copy = await formService.duplicateForm('form_123', 'Survey Copy');
 *
 * // In React component:
 * function FormList() {
 *   const [forms, setForms] = useState([]);
 *   const [loading, setLoading] = useState(false);
 *   const [error, setError] = useState(null);
 *
 *   useEffect(() => {
 *     const loadForms = async () => {
 *       try {
 *         setLoading(true);
 *         const data = await formService.getForms();
 *         setForms(data);
 *       } catch (err) {
 *         setError(parseApiError(err));
 *       } finally {
 *         setLoading(false);
 *       }
 *     };
 *     loadForms();
 *   }, []);
 *
 *   return (
 *     <div>
 *       {loading && <div>Loading...</div>}
 *       {error && <div>Error: {error}</div>}
 *       {forms.map(form => (
 *         <div key={form.id}>{form.title}</div>
 *       ))}
 *     </div>
 *   );
 * }
 */