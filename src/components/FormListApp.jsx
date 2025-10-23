import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit, faEye, faTrashAlt, faCopy,
  faFileAlt, faUsers, faCalendarAlt, faBuilding, faBell, faLink
} from '@fortawesome/free-solid-svg-icons';
import apiClient from '../services/ApiClient';
import { useEnhancedToast } from './ui/enhanced-toast';
import { useAuth } from '../contexts/AuthContext';
import { ALL_ROLES, getRoleLabel, getRoleBadgeColor } from '../config/roles.config';

export default function FormListApp({ onCreateForm, onEditForm, onViewSubmissions, onFormView }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false); // Prevent duplicate calls

  // Enhanced toast notifications
  const toast = useEnhancedToast();
  const { user, isAuthenticated, isLoading } = useAuth();

  // Helper function to check if user can create/edit forms
  const canCreateOrEditForms = () => {
    if (!user || !user.role) return false;
    return ['super_admin', 'admin'].includes(user.role);
  };

  // Role helper functions (v0.8.1 - Uses centralized roles.config.js)
  const getRoleColor = (role) => {
    // Special handling for "ALL" tag
    if (role === 'ALL') {
      return 'bg-black text-white';
    }

    // Use centralized getRoleBadgeColor from roles.config.js
    // Convert role name to role ID format (lowercase with underscores)
    const roleId = typeof role === 'string'
      ? role.toLowerCase().replace(/\s+/g, '_')
      : role;

    return getRoleBadgeColor(roleId);
  };

  const convertRoleIdsToNames = (roleIds) => {
    if (!Array.isArray(roleIds)) return ['All'];

    // Check if all user roles are selected
    const allRoleIds = ALL_ROLES.map(role => role.value);
    const hasAllRoles = allRoleIds.length > 0 && allRoleIds.every(roleId => roleIds.includes(roleId));

    if (hasAllRoles) {
      return ['ALL'];
    }

    return roleIds.map(roleId => getRoleLabel(roleId));
  };

  // Load forms from API - only when authenticated
  useEffect(() => {
    // Wait for authentication to be ready AND user to be set
    // This prevents loading with stale tokens during login
    if (isAuthenticated && !isLoading && user) {
      console.log('FormListApp - Loading forms for user:', user.username);
      loadForms();
    } else {
      console.log('FormListApp - Skipping load:', { isAuthenticated, isLoading, hasUser: !!user });
    }
  }, [isAuthenticated, isLoading, user]);

  const loadForms = async () => {
    // Prevent duplicate calls
    if (loadingRef.current) {
      console.log('loadForms already in progress, skipping...');
      return;
    }

    loadingRef.current = true;
    setLoading(true);

    try {
      // Fetch forms from database API
      const response = await apiClient.listForms();

      // Check if response is successful
      if (!response || !response.data) {
        throw new Error('ไม่ได้รับข้อมูลจาก server');
      }

      const formsData = response.data?.forms || response.data || [];

      // Process forms with submission counts and enhanced display data
      const formsWithStats = formsData.map(form => {
        // Extract category from form settings or default
        const category = form.settings?.category || form.category || 'General';

        // Get appropriate icon based on form type or category
        const icon = getFormIcon(form, category);

        // Format last updated date
        const formatDate = (dateValue) => {
          try {
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return 'Invalid Date';
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
          } catch (error) {
            return 'Invalid Date';
          }
        };
        const lastUpdated = formatDate(form.updatedAt || form.updated_at || form.createdAt || form.created_at);

        return {
          ...form,
          category,
          icon,
          submissions: form.submission_count || 0,
          lastUpdated,
          status: form.is_active ? 'active' : 'inactive',
          // Extract user roles and Telegram settings from form data
          selectedRoles: form.roles_allowed || form.visible_roles || form.visibleRoles || ['general_user'],
          telegramEnabled: form.telegram_enabled || form.settings?.telegram?.enabled || false
        };
      });

      setForms(formsWithStats);

      // Log success for debugging
      console.log(`✅ Loaded ${formsWithStats.length} forms successfully`);

    } catch (error) {
      console.error('❌ Error loading forms from API:', error);

      // Determine error type and show appropriate message
      let errorTitle = 'เกิดข้อผิดพลาด';
      let errorMessage = 'กรุณาลองใหม่อีกครั้ง';

      if (error.response) {
        // Server responded with error
        const status = error.response.status;

        if (status === 401) {
          errorTitle = 'ไม่มีสิทธิ์เข้าถึง';
          errorMessage = 'กรุณาเข้าสู่ระบบใหม่';
        } else if (status === 403) {
          errorTitle = 'ไม่มีสิทธิ์ดูฟอร์ม';
          errorMessage = 'คุณไม่มีสิทธิ์ในการดูฟอร์ม';
        } else if (status === 500) {
          errorTitle = 'ปัญหาเซิร์ฟเวอร์';
          errorMessage = 'เกิดข้อผิดพลาดที่เซิร์ฟเวอร์';
        } else {
          errorMessage = error.response.data?.error?.message || error.message || errorMessage;
        }
      } else if (error.request) {
        // Request made but no response (network error, backend down)
        errorTitle = 'ไม่สามารถเชื่อมต่อ';
        errorMessage = 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้';
      } else {
        // Other errors
        errorMessage = error.message || errorMessage;
      }

      // Only show error toast if this is a real error (not empty DB)
      // Empty DB returns success with empty array, not an error
      if (loadingRef.current) {
        toast.error(errorMessage, {
          title: errorTitle,
          duration: 5000
        });
      }

      setForms([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  };

  // Get appropriate icon for form based on its content
  const getFormIcon = (form, category) => {
    // Check form fields for specific types to suggest icons
    if (form.fields) {
      const hasUserFields = form.fields.some(field =>
        ['email', 'phone'].includes(field.type) ||
        field.title.toLowerCase().includes('ชื่อ') ||
        field.title.toLowerCase().includes('name')
      );
      if (hasUserFields) return faUsers;

      const hasLocationFields = form.fields.some(field =>
        ['lat_long', 'province', 'factory'].includes(field.type)
      );
      if (hasLocationFields) return faBuilding;

      const hasDateFields = form.fields.some(field =>
        ['date', 'datetime'].includes(field.type)
      );
      if (hasDateFields) return faCalendarAlt;
    }

    // Default icon
    return faFileAlt;
  };

  // Handle form card click - navigate to form view for new submission
  const handleFormClick = (formId) => {
    // Navigate to form view for data entry (not submissions list)
    if (onFormView) {
      onFormView(formId);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'HR': 'from-blue-500/20 to-blue-600/20',
      'Meeting': 'from-green-500/20 to-green-600/20',
      'Maintenance': 'from-yellow-500/20 to-yellow-600/20',
      'Survey': 'from-purple-500/20 to-purple-600/20',
      'Request': 'from-cyan-500/20 to-cyan-600/20' // FIXED v0.6.6: Changed from orange to cyan for liquid theme
    };
    return colors[category] || 'from-gray-500/20 to-gray-600/20';
  };

  // Get appropriate glow class based on form's role tags
  const getFormGlowClass = (selectedRoles) => {
    if (!selectedRoles || !Array.isArray(selectedRoles)) {
      return 'form-card-glow'; // Default orange
    }

    // Convert role IDs to display names
    const roleNames = convertRoleIdsToNames(selectedRoles);

    // Check if ALL roles - use white glow
    if (roleNames.includes('ALL')) {
      return 'form-card-glow-white';
    }

    // Filter out Super Admin, Admin, Moderator
    const filteredRoles = roleNames.filter(roleName =>
      roleName !== 'Super Admin' &&
      roleName !== 'Admin' &&
      roleName !== 'Moderator'
    );

    // Single role (excluding admin roles) - use role-specific color
    if (filteredRoles.length === 1) {
      const role = filteredRoles[0];

      // Map role names to CSS glow class names
      const roleGlowMap = {
        'Customer Service': 'form-card-glow-blue',
        'Sales': 'form-card-glow-green',
        'Marketing': 'form-card-glow', // Default orange
        'Technic': 'form-card-glow-cyan',
        'Accounting': 'form-card-glow-indigo',
        'BD': 'form-card-glow-teal',
        'HR': 'form-card-glow-rose',
        'IT': 'form-card-glow-violet',
        'Maintenance': 'form-card-glow-amber',
        'Operation': 'form-card-glow-lime',
        'Production': 'form-card-glow-emerald',
        'Purchasing': 'form-card-glow-sky',
        'QC': 'form-card-glow-fuchsia',
        'R&D': 'form-card-glow-yellow',
        'Warehouse': 'form-card-glow-slate',
        'General User': 'form-card-glow' // Default orange
      };

      return roleGlowMap[role] || 'form-card-glow';
    }

    // Multiple roles or no valid roles - default orange
    return 'form-card-glow';
  };

  const handleNewForm = () => {
    if (onCreateForm) {
      onCreateForm();
    }
  };

  const handleEdit = (formId) => {
    if (!canCreateOrEditForms()) {
      toast.error('ไม่มีสิทธิ์แก้ไขฟอร์ม', {
        title: 'ไม่มีสิทธิ์เข้าถึง',
        description: 'เฉพาะผู้ดูแลระบบ, ผู้จัดการ, และผู้ควบคุมเท่านั้นที่สามารถแก้ไขฟอร์มได้'
      });
      return;
    }
    if (onEditForm) {
      onEditForm(formId);
    }
  };

  const handleView = (formId) => {
    if (onViewSubmissions) {
      onViewSubmissions(formId);
    }
  };

  const handleCopyLink = (formId, formTitle) => {
    // Create direct link to submission list for this form
    const baseUrl = window.location.origin;
    const directLink = `${baseUrl}/?form=${formId}&view=submissions`;

    // Copy to clipboard
    navigator.clipboard.writeText(directLink).then(() => {
      toast.success('คัดลอกลิงก์เรียบร้อยแล้ว', {
        title: '✅ สำเร็จ',
        description: `ลิงก์สำหรับฟอร์ม "${formTitle}" ถูกคัดลอกไปยังคลิปบอร์ดแล้ว`,
        duration: 3000
      });
    }).catch((error) => {
      console.error('Copy error:', error);
      toast.error('ไม่สามารถคัดลอกลิงก์ได้', {
        title: '❌ ข้อผิดพลาด',
        description: 'กรุณาลองใหม่อีกครั้ง',
        duration: 5000
      });
    });
  };

  const handleDuplicate = async (formId) => {
    try {
      // Get form from API
      const response = await apiClient.getForm(formId);
      const originalForm = response.data?.form || response.data;

      if (!originalForm) {
        toast.error('ไม่พบฟอร์มที่ต้องการทำสำเนา', {
          title: "ไม่พบฟอร์ม",
          duration: 5000
        });
        return;
      }

      // Use backend duplicate API endpoint
      const duplicateResponse = await apiClient.duplicateForm(formId, {
        title: `${originalForm.title} (สำเนา)`
      });

      // Reload forms to show the duplicate
      await loadForms();

      toast.success('ทำสำเนาฟอร์มเรียบร้อยแล้ว', {
        title: "ทำสำเนาสำเร็จ",
        duration: 3000
      });
    } catch (error) {
      console.error('Duplicate error:', error);
      toast.error(`เกิดข้อผิดพลาดในการทำสำเนาฟอร์ม: ${error.message}`, {
        title: "ทำสำเนาไม่สำเร็จ",
        duration: 5000
      });
    }
  };

  const handleDelete = async (formId) => {
    try {
      // Get form from API
      const response = await apiClient.getForm(formId);
      const form = response.data?.form || response.data;

      if (!form) {
        toast.error('ไม่พบฟอร์มที่ต้องการลบ', {
          title: "ไม่พบฟอร์ม",
          duration: 5000
        });
        return;
      }

      // Get submission count from form data
      const submissionCount = form.submission_count || 0;

      let confirmMessage = `คุณแน่ใจหรือไม่ที่จะลบฟอร์ม "${form.title}"?`;
      let warningMessage = "การลบจะไม่สามารถย้อนกลับได้";

      if (submissionCount > 0) {
        warningMessage += ` ฟอร์มนี้มีข้อมูล ${submissionCount} รายการ ข้อมูลทั้งหมดจะถูกลบด้วย`;
      }

      // Show confirmation toast with action buttons
      const confirmToastId = toast.error(warningMessage, {
        title: confirmMessage,
        duration: 10000,
        action: {
          label: "ยืนยันการลบ",
          onClick: async () => {
            // Close confirmation toast immediately when user clicks confirm
            toast.dismiss(confirmToastId);

            try {
              // Delete via API
              await apiClient.deleteForm(formId);

              // Reload forms to reflect deletion
              await loadForms();

              toast.success('ลบฟอร์มเรียบร้อยแล้ว', {
                title: "ลบสำเร็จ",
                duration: 3000
              });
            } catch (error) {
              console.error('Delete error:', error);
              toast.error(`เกิดข้อผิดพลาดในการลบฟอร์ม: ${error.message}`, {
                title: "ลบไม่สำเร็จ",
                duration: 5000
              });
            }
          }
        }
      });
    } catch (error) {
      console.error('Delete preparation error:', error);
      toast.error('เกิดข้อผิดพลาดในการเตรียมการลบฟอร์ม', {
        title: "เกิดข้อผิดพลาด",
        duration: 5000
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">

      {/* Form List Content */}
      <main className="container-responsive py-8">
        {/* ❌ REMOVED: Full-screen loading page (causes screen flicker) */}
        {/* Now show content immediately, no loading overlay */}
        {!loading && (
          <motion.div
            className="form-list-grid-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="animated-grid grid grid-cols-1 lg:grid-cols-2">
              {forms.map((form, index) => (
              <motion.div
                key={form.id}
                className="animated-grid-item"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: index * 0.1,
                  ease: [0.4, 0, 0.2, 1]
                }}
              >
                <GlassCard
                  data-testid="form-card"
                  className={`${getFormGlowClass(form.selectedRoles)} form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out h-full flex flex-col cursor-pointer`}
                  onClick={() => handleFormClick(form.id)}
                >
                  {/* Content Area - Expandable */}
                  <div className="flex-1 p-4">
                    {/* Form Title with Telegram Icon */}
                    <GlassCardTitle className="form-card-title mb-2 group-hover:text-primary/90 transition-colors text-left flex items-center gap-2">
                      <span>{form.title}</span>
                      {form.telegramEnabled && (
                        <FontAwesomeIcon
                          icon={faBell}
                          className="text-sm text-blue-400 flex-shrink-0"
                          title="มีการแจ้งเตือน Telegram"
                        />
                      )}
                    </GlassCardTitle>

                    {/* Form Description */}
                    <GlassCardDescription className="form-card-description line-clamp-2 mb-3 group-hover:text-muted-foreground transition-colors text-left">
                      {form.description}
                    </GlassCardDescription>

                    {/* Role Tags Section */}
                    <div className="flex flex-wrap gap-1 justify-start mb-3">
                      {/* Role Tags - Hide Super Admin, Admin, and Moderator (they can see all forms anyway) */}
                      {convertRoleIdsToNames(form.selectedRoles)
                        ?.filter(roleName => {
                          const lowerRoleName = roleName.toLowerCase();
                          return lowerRoleName !== 'super admin' && lowerRoleName !== 'admin' && lowerRoleName !== 'moderator';
                        })
                        .map((roleName, index) => (
                          <span
                            key={index}
                            className={`form-card-tag inline-flex items-center ${getRoleColor(roleName)}`}
                          >
                            {roleName}
                          </span>
                        ))}
                    </div>
                  </div>

                  {/* Footer Area - Fixed at Bottom */}
                  <div className="mt-auto p-4 pt-0">
                    {/* Action Icons - Spread evenly across full width */}
                    <div className="form-card-stats flex items-center justify-between border-t border-border/20 pt-4">
                      {/* Action Icons - Distributed evenly with larger touch targets and individual hover effects */}
                      {/* Icon 1: Copy Link - Blue */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(form.id, form.title);
                        }}
                        className="flex items-center justify-center cursor-pointer group/copy w-12 h-12 sm:w-14 sm:h-14 touch-target-comfortable rounded-lg hover:bg-blue-500/10 transition-all duration-300"
                        title="คัดลอกลิงก์"
                      >
                        <FontAwesomeIcon
                          icon={faLink}
                          className="text-xl sm:text-2xl text-muted-foreground/60 group-hover/copy:text-blue-500 group-hover/copy:scale-125 transition-all duration-300"
                        />
                      </div>

                      {/* Icon 2: View Submissions - Green */}
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(form.id);
                        }}
                        className="flex items-center justify-center cursor-pointer group/view w-12 h-12 sm:w-14 sm:h-14 touch-target-comfortable rounded-lg hover:bg-green-500/10 transition-all duration-300"
                        title="ดูข้อมูล"
                      >
                        <FontAwesomeIcon
                          icon={faEye}
                          className="text-xl sm:text-2xl text-muted-foreground/60 group-hover/view:text-green-500 group-hover/view:scale-125 transition-all duration-300"
                        />
                      </div>

                      {canCreateOrEditForms() && (
                        <>
                          {/* Icon 3: Edit Form - Orange */}
                          <div
                            data-testid="edit-form-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(form.id);
                            }}
                            className="flex items-center justify-center cursor-pointer group/edit w-12 h-12 sm:w-14 sm:h-14 touch-target-comfortable rounded-lg hover:bg-orange-500/10 transition-all duration-300"
                            title="แก้ไขฟอร์ม"
                          >
                            <FontAwesomeIcon
                              icon={faEdit}
                              className="text-xl sm:text-2xl text-muted-foreground/60 group-hover/edit:text-orange-500 group-hover/edit:scale-125 group-hover/edit:rotate-12 transition-all duration-300"
                            />
                          </div>

                          {/* Icon 4: Delete Form - Red */}
                          <div
                            data-testid="delete-form-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(form.id);
                            }}
                            className="flex items-center justify-center cursor-pointer group/delete w-12 h-12 sm:w-14 sm:h-14 touch-target-comfortable rounded-lg hover:bg-red-500/10 transition-all duration-300"
                            title="ลบฟอร์ม"
                          >
                            <FontAwesomeIcon
                              icon={faTrashAlt}
                              className="text-xl sm:text-2xl text-muted-foreground/60 group-hover/delete:text-red-500 group-hover/delete:scale-125 transition-all duration-300"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
              ))}
            </div>

            {/* Empty State (if no forms) */}
            {forms.length === 0 && (
              <motion.div
                className="text-center py-16"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
              >
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-muted/20 to-muted/40 flex items-center justify-center">
                  <FontAwesomeIcon icon={faFileAlt} className="text-4xl text-muted-foreground/50" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  ยังไม่มีฟอร์ม
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  เริ่มต้นสร้างฟอร์มแรกของคุณเพื่อจัดเก็บและจัดการข้อมูล<br/>
                  ใช้ปุ่ม + ด้านบนขวาเพื่อสร้างฟอร์มใหม่
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}