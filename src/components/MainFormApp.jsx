import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import EnhancedFormBuilder from './EnhancedFormBuilder';
import SettingsPage from './SettingsPage';
import FormView from './FormView';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit, faEye, faHome, faCog, faArrowLeft,
  faFileAlt, faUsers, faCalendarAlt, faBuilding, faList, faUser, faBell
} from '@fortawesome/free-solid-svg-icons';

// Import USER_ROLES from EnhancedFormBuilder
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

export default function MainFormApp() {
  const [currentPage, setCurrentPage] = useState('form-list'); // 'form-list', 'form-builder', 'settings', 'submission-list', 'detail-view', 'form-view'
  const [currentFormId, setCurrentFormId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [forms, setForms] = useState([
    {
      id: 1,
      title: 'ฟอร์มลงทะเบียนพนักงาน',
      description: 'ฟอร์มสำหรับลงทะเบียนพนักงานใหม่ รวมข้อมูลส่วนบุคคลและตำแหน่งงาน',
      category: 'HR',
      icon: faUsers,
      submissions: 45,
      lastUpdated: '2024-01-15',
      status: 'active',
      selectedRoles: ['HR Manager', 'Admin'],
      telegramEnabled: true
    },
    {
      id: 2,
      title: 'ฟอร์มขออนุมัติลางาน',
      description: 'ฟอร์มสำหรับการขออนุมัติลางานประเภทต่างๆ พร้อมระบบอนุมัติ',
      category: 'HR',
      icon: faCalendarAlt,
      submissions: 128,
      lastUpdated: '2024-01-10',
      status: 'active',
      selectedRoles: ['All'],
      telegramEnabled: false
    },
    {
      id: 3,
      title: 'ฟอร์มรายงานการประชุม',
      description: 'ฟอร์มบันทึกรายงานการประชุม วาระการประชุม และมติที่ได้',
      category: 'Meeting',
      icon: faFileAlt,
      submissions: 23,
      lastUpdated: '2024-01-08',
      status: 'active',
      selectedRoles: ['Manager', 'Supervisor'],
      telegramEnabled: true
    },
    {
      id: 4,
      title: 'ฟอร์มการตรวจสอบอุปกรณ์',
      description: 'ฟอร์มสำหรับการตรวจสอบและบำรุงรักษาอุปกรณ์ในโรงงาน',
      category: 'Maintenance',
      icon: faBuilding,
      submissions: 67,
      lastUpdated: '2024-01-12',
      status: 'active',
      selectedRoles: ['Technician'],
      telegramEnabled: false
    },
    {
      id: 5,
      title: 'ฟอร์มประเมินความพึงพอใจ',
      description: 'ฟอร์มประเมินความพึงพอใจของลูกค้าต่อการให้บริการ',
      category: 'Survey',
      icon: faUsers,
      submissions: 89,
      lastUpdated: '2024-01-14',
      status: 'active',
      selectedRoles: ['All'],
      telegramEnabled: true
    },
    {
      id: 6,
      title: 'ฟอร์มคำร้องขอวัสดุอุปกรณ์',
      description: 'ฟอร์มสำหรับการขอวัสดุและอุปกรณ์สำนักงาน',
      category: 'Request',
      icon: faFileAlt,
      submissions: 156,
      lastUpdated: '2024-01-16',
      status: 'active',
      selectedRoles: ['Employee', 'Manager'],
      telegramEnabled: false
    }
  ]);


  const getRoleByName = (roleName) => {
    return Object.values(USER_ROLES).find(role => role.name === roleName);
  };

  const getRoleById = (roleId) => {
    return Object.values(USER_ROLES).find(role => role.id === roleId);
  };

  const getRoleColor = (role) => {
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
      'Technician': 'bg-orange-500/20 text-orange-200',
      'All': 'bg-gray-500/20 text-gray-200'
    };
    return colors[role] || 'bg-gray-500/20 text-gray-200';
  };

  const convertRoleIdsToNames = (roleIds) => {
    if (!Array.isArray(roleIds)) return ['All'];
    return roleIds.map(roleId => {
      const role = getRoleById(roleId);
      return role ? role.name : roleId;
    });
  };

  const handleFormClick = (formId) => {
    // Navigate to form view for adding new submission
    handleNavigate('form-view', formId);
  };

  const handleViewSubmissions = (formId) => {
    handleNavigate('submission-list', formId);
  };

  const handleNavigate = (page, formId = null, editing = false) => {
    setCurrentPage(page);
    setCurrentFormId(formId);
    setIsEditing(editing);
  };

  const handleNewForm = () => {
    handleNavigate('form-builder', null, false);
  };

  const handleEditForm = (formId) => {
    handleNavigate('form-builder', formId, true);
  };


  const renderNavigation = () => {
    const getPageTitle = () => {
      switch (currentPage) {
        case 'form-list': return 'จัดการฟอร์ม';
        case 'form-builder': return isEditing ? 'แก้ไขฟอร์ม' : 'สร้างฟอร์มใหม่';
        case 'settings': return 'ตั้งค่า';
        case 'submission-list': return 'รายการ Submissions';
        case 'detail-view': return 'รายละเอียดฟอร์ม';
        case 'form-view': return 'กรอกข้อมูลฟอร์ม';
        default: return 'จัดการฟอร์ม';
      }
    };

    const getPageIcon = () => {
      switch (currentPage) {
        case 'form-list': return faList;
        case 'form-builder': return faFileAlt;
        case 'settings': return faCog;
        case 'submission-list': return faEye;
        case 'detail-view': return faUser;
        case 'form-view': return faFileAlt;
        default: return faFileAlt;
      }
    };

    const canGoBack = currentPage !== 'form-list';

    return (
      <motion.header
        className="glass-nav sticky top-0 z-50 border-b border-border/40"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container-responsive">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-4">
              {canGoBack && (
                <GlassButton
                  variant="ghost"
                  size="icon"
                  onClick={() => handleNavigate('form-list')}
                  tooltip="กลับสู่รายการฟอร์ม"
                  className="touch-target-comfortable"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="text-base" />
                </GlassButton>
              )}

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <FontAwesomeIcon icon={getPageIcon()} className="text-primary text-lg" />
                </div>
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                    {getPageTitle()}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {currentPage === 'form-list' ? 'รายการฟอร์มทั้งหมดในระบบ' : 'Form Builder System'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentPage === 'form-list' && (
                <GlassButton
                  onClick={handleNewForm}
                  className="gap-2"
                >
                  <FontAwesomeIcon icon={faPlus} />
                  สร้างฟอร์มใหม่
                </GlassButton>
              )}

              <GlassButton
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate('settings')}
                tooltip="ตั้งค่า"
                className="touch-target-comfortable"
              >
                <FontAwesomeIcon icon={faCog} />
              </GlassButton>

              <GlassButton
                variant="ghost"
                size="icon"
                onClick={() => handleNavigate('form-list')}
                tooltip="หน้าหลัก"
                className="touch-target-comfortable"
              >
                <FontAwesomeIcon icon={faHome} />
              </GlassButton>
            </div>
          </div>
        </div>
      </motion.header>
    );
  };

  const renderFormList = () => (
    <main className="container-responsive py-8">
      <motion.div
        className="form-list-grid-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="animated-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out h-full flex flex-col cursor-pointer"
                onClick={() => handleFormClick(form.id)}
              >
                <GlassCardHeader className="flex-1">
                  {/* Form Title */}
                  <GlassCardTitle className="form-card-title mb-3 group-hover:text-primary/90 transition-colors">
                    {form.title}
                  </GlassCardTitle>

                  {/* Form Description */}
                  <GlassCardDescription className="form-card-description line-clamp-3 mb-4 group-hover:text-muted-foreground transition-colors">
                    {form.description}
                  </GlassCardDescription>

                  {/* Tags Section */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {/* Role Tags */}
                    {convertRoleIdsToNames(form.selectedRoles)?.map((roleName, index) => (
                      <span
                        key={index}
                        className={`form-card-tag inline-flex items-center ${getRoleColor(roleName)}`}
                      >
                        {roleName}
                      </span>
                    ))}

                    {/* Telegram Tag */}
                    {form.telegramEnabled && (
                      <span className="form-card-tag inline-flex items-center bg-blue-500/20 text-blue-200 gap-1">
                        <FontAwesomeIcon icon={faBell} className="text-xs" />
                        Telegram
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="form-card-stats flex items-center justify-between">
                    <span>{form.submissions} submissions</span>
                    <span>อัพเดต: {form.lastUpdated}</span>
                  </div>
                </GlassCardHeader>

                {/* Action Buttons */}
                <div className="px-6 pb-6">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewSubmissions(form.id);
                      }}
                      className="p-2 text-muted-foreground/60 hover:text-primary transition-colors"
                      title="ดูข้อมูล Submissions"
                    >
                      <FontAwesomeIcon icon={faEye} className="text-sm" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditForm(form.id);
                      }}
                      className="p-2 text-muted-foreground/60 hover:text-primary transition-colors"
                      title="แก้ไขฟอร์ม"
                    >
                      <FontAwesomeIcon icon={faEdit} className="text-sm" />
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Empty State */}
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
            เริ่มต้นสร้างฟอร์มแรกของคุณเพื่อจัดเก็บและจัดการข้อมูล
          </p>
          <GlassButton onClick={handleNewForm} className="gap-2">
            <FontAwesomeIcon icon={faPlus} />
            สร้างฟอร์มใหม่
          </GlassButton>
        </motion.div>
      )}
    </main>
  );

  const renderFormBuilder = () => {
    const form = isEditing ? forms.find(f => f.id === currentFormId) : null;

    return (
      <main className="container-responsive py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <EnhancedFormBuilder
            initialForm={form}
            onSave={(savedForm) => {
              console.log('Saved form data:', savedForm); // Debug log
              if (isEditing) {
                const updatedForm = {
                  ...forms.find(f => f.id === currentFormId),
                  ...savedForm,
                  // Extract settings from savedForm for form list display
                  selectedRoles: savedForm.visibleRoles || savedForm.selectedRoles || ['All'],
                  telegramEnabled: savedForm.settings?.telegram?.enabled || savedForm.telegramEnabled || false,
                  lastUpdated: new Date().toISOString().split('T')[0]
                };
                console.log('Updated form:', updatedForm); // Debug log
                setForms(forms.map(f => f.id === currentFormId ? updatedForm : f));
              } else {
                const newForm = {
                  ...savedForm,
                  id: Math.max(...forms.map(f => f.id), 0) + 1,
                  submissions: 0,
                  category: 'General',
                  icon: faFileAlt,
                  status: 'active',
                  lastUpdated: new Date().toISOString().split('T')[0],
                  // Extract settings for form list display
                  selectedRoles: savedForm.visibleRoles || savedForm.selectedRoles || ['All'],
                  telegramEnabled: savedForm.settings?.telegram?.enabled || savedForm.telegramEnabled || false
                };
                console.log('New form:', newForm); // Debug log
                setForms([...forms, newForm]);
              }
              handleNavigate('form-list');
            }}
            onCancel={(formId, action) => {
              if (action === 'delete' && formId) {
                // Handle delete action
                setForms(forms.filter(f => f.id !== formId));
              }
              handleNavigate('form-list');
            }}
          />
        </motion.div>
      </main>
    );
  };

  const renderSettings = () => (
    <main className="container-responsive py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <SettingsPage />
      </motion.div>
    </main>
  );

  const renderSubmissionList = () => (
    <main className="container-responsive py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle>รายการ Submissions</GlassCardTitle>
            <GlassCardDescription>
              รายการข้อมูลที่ถูกส่งผ่านฟอร์มนี้
            </GlassCardDescription>
          </GlassCardHeader>
        </GlassCard>
      </motion.div>
    </main>
  );

  const renderFormView = () => {
    const form = forms.find(f => f.id === currentFormId);

    return (
      <main className="container-responsive py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <FormView
            form={form}
            onSave={(submission) => {
              console.log('Form submission saved:', submission);
              handleNavigate('form-list');
            }}
            onCancel={() => handleNavigate('form-list')}
          />
        </motion.div>
      </main>
    );
  };

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'form-list':
        return renderFormList();
      case 'form-builder':
        return renderFormBuilder();
      case 'settings':
        return renderSettings();
      case 'submission-list':
        return renderSubmissionList();
      case 'form-view':
        return renderFormView();
      default:
        return renderFormList();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderNavigation()}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderCurrentPage()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}