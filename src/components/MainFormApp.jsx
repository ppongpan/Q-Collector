import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
// import { GlassInput } from './ui/glass-input'; // Unused
import EnhancedFormBuilder from './EnhancedFormBuilder';
import SettingsPage from './SettingsPage';
import FormView from './FormView';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit, faEye, faCog, faArrowLeft,
  faFileAlt, faUsers, faCalendarAlt, faBuilding, faBell, faSearch
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
  const [searchQuery, setSearchQuery] = useState('');

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
      selectedRoles: ['super_admin', 'admin', 'moderator'],
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
      selectedRoles: ['customer_service', 'technic'],
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
      selectedRoles: ['super_admin', 'admin', 'moderator', 'customer_service'],
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
      selectedRoles: ['technic', 'moderator'],
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
      selectedRoles: ['sale', 'marketing', 'general_user'],
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
      selectedRoles: ['super_admin', 'admin', 'moderator', 'customer_service', 'technic', 'sale', 'marketing', 'general_user'],
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
        case 'submission-list': return 'รายการข้อมูล';
        case 'detail-view': return 'รายละเอียดฟอร์ม';
        case 'form-view': return 'กรอกข้อมูลฟอร์ม';
        default: return 'จัดการฟอร์ม';
      }
    };

    // Unused function - commented out
    // const getPageIcon = () => {
    //   switch (currentPage) {
    //     case 'form-list': return faList;
    //     case 'form-builder': return faFileAlt;
    //     case 'settings': return faCog;
    //     case 'submission-list': return faEye;
    //     case 'detail-view': return faUser;
    //     case 'form-view': return faFileAlt;
    //     default: return faFileAlt;
    //   }
    // };

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
                <div
                  onClick={() => handleNavigate('form-list')}
                  title="กลับสู่รายการฟอร์ม"
                  className="flex items-center justify-center w-12 h-12 cursor-pointer touch-target-comfortable transition-all duration-300 group"
                  style={{
                    background: 'transparent',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  <FontAwesomeIcon
                    icon={faArrowLeft}
                    className="text-base text-muted-foreground group-hover:text-primary transition-colors duration-300"
                  />
                </div>
              )}

              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                  {getPageTitle()}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                onClick={() => handleNavigate('settings')}
                title="ตั้งค่า"
                className="flex items-center justify-center w-12 h-12 cursor-pointer touch-target-comfortable transition-all duration-300 group"
                style={{
                  background: 'transparent',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.1) rotate(90deg)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1) rotate(0deg)';
                }}
              >
                <FontAwesomeIcon
                  icon={faCog}
                  className="text-muted-foreground group-hover:text-primary transition-colors duration-300"
                />
              </div>

              <div
                onClick={() => handleNavigate('form-list')}
                title="หน้าหลัก"
                className="w-12 h-12 cursor-pointer touch-target-comfortable transition-all duration-300 group"
                style={{
                  background: 'transparent',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)';
                }}
              >
                <img
                  src="/qlogo.png"
                  alt="Q-Collector Logo"
                  className="w-full h-full object-cover rounded-lg transition-all duration-300 group-hover:rounded-full"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.header>
    );
  };

  // Filter forms based on search query
  const filteredForms = forms.filter(form =>
    form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    form.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    form.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderFormList = () => (
    <main className="container-responsive py-8">
      {/* Search and Create Section */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex gap-4 items-center justify-between">
          {/* Search Box */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground/50 w-4 h-4 z-10"
              />
              <input
                type="text"
                placeholder="ค้นหาฟอร์ม..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input-standard w-full pl-10 pr-4 py-3 bg-card/60 backdrop-blur-md border border-border/30 rounded-lg text-foreground placeholder:text-muted-foreground/60 transition-all duration-300 focus:outline-none focus:border-transparent focus:ring-0"
                style={{
                  boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                }}
                onFocus={(e) => {
                  e.target.style.boxShadow = `
                    inset 0 2px 8px rgba(0, 0, 0, 0.1),
                    0 0 0 1px rgba(255, 255, 255, 0.1),
                    0 0 20px rgba(249, 115, 22, 0.4),
                    0 0 40px rgba(249, 115, 22, 0.2),
                    inset 0 0 20px rgba(249, 115, 22, 0.1)
                  `;
                }}
                onBlur={(e) => {
                  e.target.style.boxShadow = 'inset 0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1)';
                }}
              />
            </div>
          </div>

          {/* Create Form Button with Orange Neon Effect */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <button
              onClick={handleNewForm}
              title="สร้างฟอร์ม"
              className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 text-primary hover:text-orange-400 transition-all duration-300 touch-target-comfortable group"
              style={{
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(249, 115, 22, 0.08) 0%, rgba(234, 88, 12, 0.04) 70%, transparent 70%)',
                backdropFilter: 'blur(8px)',
                border: 'none',
                clipPath: 'circle(50% at center)'
              }}
              onMouseEnter={(e) => {
                e.target.style.boxShadow = `
                  0 0 20px 4px rgba(249, 115, 22, 0.4),
                  0 0 40px 8px rgba(249, 115, 22, 0.25),
                  0 0 60px 12px rgba(249, 115, 22, 0.15),
                  inset 0 0 20px rgba(249, 115, 22, 0.1)
                `;
                e.target.style.borderRadius = '50%';
              }}
              onMouseLeave={(e) => {
                e.target.style.boxShadow = 'none';
              }}
            >
              {/* Background Glow Effect */}
              <div
                className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  inset: 0,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(249, 115, 22, 0.2) 0%, rgba(234, 88, 12, 0.15) 70%, transparent 70%)',
                  clipPath: 'circle(50% at center)'
                }}
              />

              {/* Orange Neon Ring on Hover */}
              <div
                className="absolute opacity-0 group-hover:opacity-100 transition-all duration-300 animate-pulse"
                style={{
                  inset: 0,
                  borderRadius: '50%',
                  boxShadow: '0 0 30px rgba(249, 115, 22, 0.8), 0 0 60px rgba(249, 115, 22, 0.6), inset 0 0 20px rgba(249, 115, 22, 0.2)',
                  clipPath: 'circle(50% at center)'
                }}
              />

              {/* Plus Icon */}
              <FontAwesomeIcon
                icon={faPlus}
                className="relative z-10 w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-90 transition-transform duration-300"
              />

              {/* Ripple Effect on Click */}
              <div
                className="absolute opacity-0 group-active:opacity-100 group-active:animate-ping"
                style={{
                  inset: 0,
                  borderRadius: '50%',
                  background: 'rgba(249, 115, 22, 0.3)',
                  clipPath: 'circle(50% at center)'
                }}
              />
            </button>
          </motion.div>
        </div>
      </motion.div>

      <motion.div
        className="form-list-grid-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="animated-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3">
          {filteredForms.map((form, index) => (
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
                  <div className="flex flex-wrap gap-1 justify-start">
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
                        {new Date(form.lastUpdated).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Right side - Action Icons with touch-friendly areas */}
                    <div className="flex items-center gap-1">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewSubmissions(form.id);
                        }}
                        className="flex items-center justify-center w-8 h-8 transition-all duration-300 cursor-pointer group"
                        title="ดูข้อมูล"
                        style={{
                          borderRadius: '50%',
                          background: 'transparent',
                          clipPath: 'circle(50% at center)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'radial-gradient(circle, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.05) 70%, transparent 70%)';
                          e.target.style.boxShadow = '0 0 15px rgba(249, 115, 22, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faEye}
                          className="text-sm text-muted-foreground/60 group-hover:text-primary transition-colors"
                        />
                      </div>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditForm(form.id);
                        }}
                        className="flex items-center justify-center w-8 h-8 transition-all duration-300 cursor-pointer group"
                        title="แก้ไขฟอร์ม"
                        style={{
                          borderRadius: '50%',
                          background: 'transparent',
                          clipPath: 'circle(50% at center)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = 'radial-gradient(circle, rgba(249, 115, 22, 0.1) 0%, rgba(234, 88, 12, 0.05) 70%, transparent 70%)';
                          e.target.style.boxShadow = '0 0 15px rgba(249, 115, 22, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'transparent';
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <FontAwesomeIcon
                          icon={faEdit}
                          className="text-sm text-muted-foreground/60 group-hover:text-primary transition-colors"
                        />
                      </div>
                    </div>
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
            <GlassCardTitle>รายการข้อมูล</GlassCardTitle>
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