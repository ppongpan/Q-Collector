/**
 * BreadcrumbContext - Context for managing breadcrumb navigation
 *
 * Features:
 * - Track breadcrumb trail
 * - Update on page changes
 * - Support custom labels
 * - Provide useBreadcrumb hook
 *
 * @version 0.6.3
 * @since 2025-10-02
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Create the context
const BreadcrumbContext = createContext(undefined);

// Custom hook to use breadcrumb context
export const useBreadcrumb = () => {
  const context = useContext(BreadcrumbContext);
  if (context === undefined) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider');
  }
  return context;
};

// BreadcrumbProvider Component
export const BreadcrumbProvider = ({ children }) => {
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [customLabels, setCustomLabels] = useState({});

  // Set custom label for a specific path
  const setCustomLabel = useCallback((path, label) => {
    setCustomLabels(prev => ({
      ...prev,
      [path]: label
    }));
  }, []);

  // Clear custom labels
  const clearCustomLabels = useCallback(() => {
    setCustomLabels({});
  }, []);

  // Update breadcrumb trail
  const updateBreadcrumbs = useCallback((items) => {
    // Apply custom labels to items
    const itemsWithCustomLabels = items.map(item => ({
      ...item,
      label: customLabels[item.path] || item.label
    }));
    setBreadcrumbs(itemsWithCustomLabels);
  }, [customLabels]);

  // Generate breadcrumb items based on navigation state
  const generateBreadcrumbs = useCallback((currentPage, params = {}) => {
    const { formId, formTitle, submissionId, subFormId, subFormTitle } = params;
    const items = [];

    // Always start with home
    items.push({
      id: 'home',
      label: 'หน้าหลัก',
      path: 'form-list',
      params: {},
      isHome: true,
      isCurrent: currentPage === 'form-list'
    });

    // Build breadcrumb trail based on current page
    switch (currentPage) {
      case 'form-builder':
        if (formId && formTitle) {
          items.push({
            id: 'form',
            label: truncateText(formTitle, 20),
            path: 'submission-list',
            params: { formId },
            isCurrent: false
          });
          items.push({
            id: 'builder',
            label: 'แก้ไขฟอร์ม',
            path: 'form-builder',
            params: { formId },
            isCurrent: true
          });
        } else {
          items.push({
            id: 'builder',
            label: 'สร้างฟอร์มใหม่',
            path: 'form-builder',
            params: {},
            isCurrent: true
          });
        }
        break;

      case 'submission-list':
        if (formTitle) {
          items.push({
            id: 'submissions',
            label: truncateText(formTitle, 20),
            path: 'submission-list',
            params: { formId },
            isCurrent: true
          });
        }
        break;

      case 'submission-detail':
        if (formTitle) {
          items.push({
            id: 'form',
            label: truncateText(formTitle, 20),
            path: 'submission-list',
            params: { formId },
            isCurrent: false
          });
          items.push({
            id: 'submission',
            label: `ข้อมูล #${submissionId?.slice(-6) || ''}`,
            path: 'submission-detail',
            params: { formId, submissionId },
            isCurrent: true
          });
        }
        break;

      case 'main-form-edit':
        if (formTitle) {
          items.push({
            id: 'form',
            label: truncateText(formTitle, 20),
            path: 'submission-list',
            params: { formId },
            isCurrent: false
          });
          items.push({
            id: 'submission',
            label: `ข้อมูล #${submissionId?.slice(-6) || ''}`,
            path: 'submission-detail',
            params: { formId, submissionId },
            isCurrent: false
          });
          items.push({
            id: 'edit',
            label: 'แก้ไข',
            path: 'main-form-edit',
            params: { formId, submissionId },
            isCurrent: true
          });
        }
        break;

      case 'form-view':
        if (formTitle) {
          items.push({
            id: 'form',
            label: truncateText(formTitle, 20),
            path: 'submission-list',
            params: { formId },
            isCurrent: false
          });
          items.push({
            id: 'new',
            label: submissionId ? 'แก้ไขข้อมูล' : 'กรอกข้อมูลใหม่',
            path: 'form-view',
            params: { formId, submissionId },
            isCurrent: true
          });
        }
        break;

      case 'subform-detail':
        if (formTitle) {
          items.push({
            id: 'form',
            label: truncateText(formTitle, 20),
            path: 'submission-list',
            params: { formId },
            isCurrent: false
          });
          items.push({
            id: 'submission',
            label: `ข้อมูล #${submissionId?.slice(-6) || ''}`,
            path: 'submission-detail',
            params: { formId, submissionId },
            isCurrent: false
          });
          items.push({
            id: 'subform',
            label: truncateText(subFormTitle || 'ฟอร์มย่อย', 15),
            path: 'subform-detail',
            params: { formId, submissionId, subFormId },
            isCurrent: true
          });
        }
        break;

      case 'subform-edit':
        if (formTitle) {
          items.push({
            id: 'form',
            label: truncateText(formTitle, 20),
            path: 'submission-list',
            params: { formId },
            isCurrent: false
          });
          items.push({
            id: 'submission',
            label: `ข้อมูล #${submissionId?.slice(-6) || ''}`,
            path: 'submission-detail',
            params: { formId, submissionId },
            isCurrent: false
          });
          items.push({
            id: 'subform',
            label: truncateText(subFormTitle || 'ฟอร์มย่อย', 15),
            path: 'subform-detail',
            params: { formId, submissionId, subFormId },
            isCurrent: false
          });
          items.push({
            id: 'edit',
            label: 'แก้ไข',
            path: 'subform-edit',
            params: { formId, submissionId, subFormId },
            isCurrent: true
          });
        }
        break;

      case 'subform-view':
        if (formTitle) {
          items.push({
            id: 'form',
            label: truncateText(formTitle, 20),
            path: 'submission-list',
            params: { formId },
            isCurrent: false
          });
          items.push({
            id: 'submission',
            label: `ข้อมูล #${submissionId?.slice(-6) || ''}`,
            path: 'submission-detail',
            params: { formId, submissionId },
            isCurrent: false
          });
          items.push({
            id: 'subform-new',
            label: 'เพิ่มฟอร์มย่อย',
            path: 'subform-view',
            params: { formId, submissionId, subFormId },
            isCurrent: true
          });
        }
        break;

      case 'settings':
        items.push({
          id: 'settings',
          label: 'ตั้งค่าระบบ',
          path: 'settings',
          params: {},
          isCurrent: true
        });
        break;

      case 'user-management':
        items.push({
          id: 'users',
          label: 'จัดการผู้ใช้งาน',
          path: 'user-management',
          params: {},
          isCurrent: true
        });
        break;

      case 'theme-test':
        items.push({
          id: 'settings',
          label: 'ตั้งค่าระบบ',
          path: 'settings',
          params: {},
          isCurrent: false
        });
        items.push({
          id: 'theme-test',
          label: 'ทดสอบธีม',
          path: 'theme-test',
          params: {},
          isCurrent: true
        });
        break;

      default:
        // For unknown pages, just show home
        break;
    }

    updateBreadcrumbs(items);
    return items;
  }, [updateBreadcrumbs]);

  // Helper function to truncate text
  const truncateText = (text, maxLength = 20) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return `${text.substring(0, maxLength - 3)}...`;
  };

  // Context value
  const value = {
    breadcrumbs,
    generateBreadcrumbs,
    setCustomLabel,
    clearCustomLabels,
    updateBreadcrumbs
  };

  return (
    <BreadcrumbContext.Provider value={value}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

export default BreadcrumbProvider;