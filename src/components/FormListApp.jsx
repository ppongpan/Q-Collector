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

// USER_ROLES - Matches Form Settings (EnhancedFormBuilder.jsx)
const USER_ROLES = {
  SUPER_ADMIN: { id: 'super_admin', color: 'text-red-500', bgColor: 'bg-red-500/10', name: 'Super Admin', isDefault: true },
  ADMIN: { id: 'admin', color: 'text-pink-500', bgColor: 'bg-pink-500/10', name: 'Admin', isDefault: true },
  MODERATOR: { id: 'moderator', color: 'text-purple-500', bgColor: 'bg-purple-500/10', name: 'Moderator', isDefault: false },
  CUSTOMER_SERVICE: { id: 'customer_service', color: 'text-blue-500', bgColor: 'bg-blue-500/10', name: 'Customer Service', isDefault: false },
  TECHNIC: { id: 'technic', color: 'text-cyan-500', bgColor: 'bg-cyan-500/10', name: 'Technic', isDefault: false },
  SALE: { id: 'sale', color: 'text-green-500', bgColor: 'bg-green-500/10', name: 'Sale', isDefault: false },
  MARKETING: { id: 'marketing', color: 'text-orange-500', bgColor: 'bg-orange-500/10', name: 'Marketing', isDefault: false },
  GENERAL_USER: { id: 'general_user', color: 'text-gray-500', bgColor: 'bg-gray-500/10', name: 'General User', isDefault: false }
};

export default function FormListApp({ onCreateForm, onEditForm, onViewSubmissions, onFormView }) {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false); // Prevent duplicate calls

  // Enhanced toast notifications
  const toast = useEnhancedToast();
  const { user } = useAuth();

  // Helper function to check if user can create/edit forms
  const canCreateOrEditForms = () => {
    if (!user || !user.role) return false;
    return ['super_admin', 'admin', 'moderator'].includes(user.role);
  };

  // Role helper functions from version 0.1.5
  const getRoleByName = (roleName) => {
    return Object.values(USER_ROLES).find(role => role.name === roleName);
  };

  const getRoleById = (roleId) => {
    return Object.values(USER_ROLES).find(role => role.id === roleId);
  };

  const getRoleColor = (role) => {
    // Special handling for "ALL" tag
    if (role === 'ALL') {
      return 'bg-black text-white';
    }

    // Handle both role names and role IDs
    let roleObj;
    if (typeof role === 'string') {
      roleObj = getRoleByName(role) || getRoleById(role);
    }

    if (roleObj) {
      return `${roleObj.bgColor} ${roleObj.color}`;
    }

    // Fallback for old role names
    const colors = {
      'Admin': 'bg-red-500/20 text-red-200',
      'Manager': 'bg-blue-500/20 text-blue-200',
      'HR Manager': 'bg-purple-500/20 text-purple-200',
      'Supervisor': 'bg-green-500/20 text-green-200',
      'Employee': 'bg-yellow-500/20 text-yellow-200',
      'Technician': 'bg-cyan-500/20 text-cyan-200', // FIXED v0.6.6: Changed from orange to cyan
      'All': 'bg-gray-500/20 text-gray-200'
    };
    return colors[role] || 'bg-gray-500/20 text-gray-200';
  };

  const convertRoleIdsToNames = (roleIds) => {
    if (!Array.isArray(roleIds)) return ['All'];

    // Check if all user roles are selected
    const allRoleIds = Object.values(USER_ROLES).map(role => role.id);
    const hasAllRoles = allRoleIds.length > 0 && allRoleIds.every(roleId => roleIds.includes(roleId));

    if (hasAllRoles) {
      return ['ALL'];
    }

    return roleIds.map(roleId => {
      const role = getRoleById(roleId);
      return role ? role.name : roleId;
    });
  };

  // Load forms from DataService
  useEffect(() => {
    loadForms();
  }, []);

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
      toast.error(warningMessage, {
        title: confirmMessage,
        duration: 10000,
        action: {
          label: "ยืนยันการลบ",
          onClick: async () => {
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
        {loading ? (
          <motion.div
            className="flex items-center justify-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center">
              <div className="text-xl font-semibold text-foreground/80 mb-2">กำลังโหลดฟอร์ม...</div>
              <div className="text-sm text-muted-foreground">โปรดรอสักครู่</div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            className="form-list-grid-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="animated-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
                  className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out h-full flex flex-col cursor-pointer"
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
                      {/* Role Tags */}
                      {convertRoleIdsToNames(form.selectedRoles)?.map((roleName, index) => (
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
                    {/* Stats with Action Icons */}
                    <div className="form-card-stats flex items-center justify-between border-t border-border/20 pt-3">
                      {/* Left side - Submissions and Update date as tags */}
                      <div className="flex items-center gap-2 text-left">
                        <span
                          className="form-card-tag inline-flex items-center justify-center border border-muted-foreground/30 text-muted-foreground/60"
                          title="จำนวนข้อมูล"
                        >
                          {form.submissions}
                        </span>
                        <span
                          className="form-card-tag inline-flex items-center justify-center border border-muted-foreground/30 text-muted-foreground/60"
                          title="Updated date"
                        >
                          {form.lastUpdated}
                        </span>
                      </div>

                      {/* Right side - Action Icons with touch-friendly areas */}
                      <div className="flex items-center gap-6">
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(form.id, form.title);
                          }}
                          className="flex items-center justify-center cursor-pointer group"
                          title="คัดลอกลิงก์"
                          style={{ background: 'transparent' }}
                        >
                          <FontAwesomeIcon
                            icon={faLink}
                            className="text-lg text-muted-foreground/60 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-300"
                          />
                        </div>

                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(form.id);
                          }}
                          className="flex items-center justify-center cursor-pointer group"
                          title="ดูข้อมูล"
                          style={{ background: 'transparent' }}
                        >
                          <FontAwesomeIcon
                            icon={faEye}
                            className="text-lg text-muted-foreground/60 group-hover:text-cyan-400 group-hover:scale-110 transition-all duration-300"
                          />
                        </div>

                        {canCreateOrEditForms() && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(form.id);
                            }}
                            className="flex items-center justify-center cursor-pointer group"
                            title="แก้ไขฟอร์ม"
                            style={{ background: 'transparent' }}
                          >
                            <FontAwesomeIcon
                              icon={faEdit}
                              className="text-lg text-muted-foreground/60 group-hover:text-cyan-400 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
                            />
                          </div>
                        )}
                      </div>
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