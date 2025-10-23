import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
// import { GlassInput } from './ui/glass-input'; // Unused
import { useEnhancedToast } from './ui/enhanced-toast';
import { UserMenu } from './ui/user-menu';
import { GeneralUserWelcomeModal } from './ui/general-user-welcome-modal';
import { ResponsiveBreadcrumb } from './ui/breadcrumb';
import { BreadcrumbProvider, useBreadcrumb } from '../contexts/BreadcrumbContext';
import { NavigationProvider } from '../contexts/NavigationContext'; // ✅ v0.7.45: Navigation context
import { ThemeToggle } from './ThemeToggle';
import EnhancedFormBuilder from './EnhancedFormBuilder';
import SettingsPage from './SettingsPage';
import UserManagement from './UserManagement';
import ThemeTestPage from './ThemeTestPage';
import FormView from './FormView';
import FormListApp from './FormListApp';
import FormSubmissionList from './FormSubmissionList';
import SubmissionDetail from './SubmissionDetail';
import SubFormView from './SubFormView';
import SubFormDetail from './SubFormDetail';
import MainFormEditPage from './pages/MainFormEditPage';
import SubFormEditPage from './pages/SubFormEditPage';
import UserEditPage from './pages/UserEditPage';
import GoogleSheetsImportPage from './sheets/GoogleSheetsImportPage';
import NotificationRulesPage from './NotificationRulesPage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCog, faArrowLeft, faFileAlt, faPlus, faSave, faEdit, faTrashAlt, faUsers
} from '@fortawesome/free-solid-svg-icons';

// Data services
import apiClient from '../services/ApiClient';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext'; // ✅ v0.7.45: Navigation context


// Main App Component with Toast Integration
function MainFormAppContent() {
  const [currentPage, setCurrentPage] = useState('form-list'); // 'form-list', 'form-builder', 'settings', 'user-management', 'user-edit', 'theme-test', 'submission-list', 'submission-detail', 'form-view', 'subform-view', 'subform-detail', 'main-form-edit', 'subform-edit', 'sheets-import', 'notification-rules'
  const [currentFormId, setCurrentFormId] = useState(null);
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null);
  const [currentSubFormId, setCurrentSubFormId] = useState(null);
  const [currentSubSubmissionId, setCurrentSubSubmissionId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditSubmissionId, setCurrentEditSubmissionId] = useState(null);
  const [currentEditSubFormId, setCurrentEditSubFormId] = useState(null);
  const [currentFormTitle, setCurrentFormTitle] = useState('');
  const [currentSubFormTitle, setCurrentSubFormTitle] = useState('');
  const [editFormData, setEditFormData] = useState(null);
  const [loadingEditForm, setLoadingEditForm] = useState(false);
  const formBuilderSaveHandlerRef = useRef(null);
  const formViewSaveHandlerRef = useRef(null);
  // ✅ v0.7.43-fix: Form cache to prevent duplicate API calls
  const formCacheRef = useRef({});
  const toast = useEnhancedToast();
  const { user } = useAuth();
  const { generateBreadcrumbs, breadcrumbs } = useBreadcrumb();
  const { navigationFilters } = useNavigation(); // ✅ v0.7.45: Get filter state for navigation (no longer using filteredSubmissions from context)

  // Navigation state for submission detail
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [allSubSubmissions, setAllSubSubmissions] = useState([]);
  const [navCurrentIndex, setNavCurrentIndex] = useState(-1);
  const [navHasPrevious, setNavHasPrevious] = useState(false);
  const [navHasNext, setNavHasNext] = useState(false);

  // Load form data for editing
  useEffect(() => {
    async function loadFormForEdit() {
      if (isEditing && currentFormId && currentPage === 'form-builder') {
        setLoadingEditForm(true);
        try {
          const response = await apiClient.getForm(currentFormId);
          const formData = response.data?.form || response.data;
          console.log('[Editing] Form loaded for editing:', { formId: currentFormId, title: formData?.title });
          setEditFormData(formData);
        } catch (error) {
          console.error('Failed to load form from API:', error);
          setEditFormData(null);
        } finally {
          setLoadingEditForm(false);
        }
      } else if (!isEditing) {
        setEditFormData(null);
      }
    }
    loadFormForEdit();
  }, [isEditing, currentFormId, currentPage]);

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }, [currentPage, currentFormId, currentSubmissionId, currentSubFormId, currentSubSubmissionId, currentUserId]);

  // Update breadcrumbs when navigation changes
  useEffect(() => {
    generateBreadcrumbs(currentPage, {
      formId: currentFormId,
      formTitle: currentFormTitle,
      submissionId: currentSubmissionId,
      subFormId: currentSubFormId,
      subFormTitle: currentSubFormTitle
    });
  }, [currentPage, currentFormId, currentFormTitle, currentSubmissionId, currentSubFormId, currentSubFormTitle, generateBreadcrumbs]);

  // Handle URL parameters for direct links
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const formId = urlParams.get('form');
    const view = urlParams.get('view');
    const mode = urlParams.get('mode');
    const submissionId = urlParams.get('submission');
    const subFormId = urlParams.get('subform');
    const subSubmissionId = urlParams.get('subsub');

    // Handle different URL patterns
    if (formId) {
      if (view === 'submissions') {
        // Navigate directly to submission list
        handleNavigate('submission-list', formId);
      } else if (view === 'detail' && submissionId) {
        // Navigate directly to submission detail
        handleNavigate('submission-detail', formId, false, submissionId);
      } else if (view === 'subform' && submissionId && subFormId && subSubmissionId) {
        // Navigate directly to sub-form detail
        handleNavigate('subform-detail', formId, false, submissionId, subFormId, subSubmissionId);
      } else if (mode === 'edit' && submissionId) {
        // Navigate directly to edit page
        handleNavigate('main-form-edit', formId, false, submissionId);
      } else if (mode === 'builder') {
        // Navigate directly to form builder in edit mode
        handleNavigate('form-builder', formId, true);
      } else if (mode === 'create') {
        // Navigate directly to form view for new submission
        handleNavigate('form-view', formId);
      }
      // Clear URL parameters after navigation
      window.history.replaceState({}, '', window.location.pathname);
    } else if (mode === 'builder') {
      // Create new form
      handleNavigate('form-builder', null, false);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Helper function to check if user can create/edit forms
  const canCreateOrEditForms = () => {
    if (!user || !user.role) return false;
    return ['super_admin', 'admin'].includes(user.role);
  };

  // ✅ NEW: Smart back navigation - goes back one step in breadcrumb
  const handleSmartBack = () => {
    console.log('[Back] Smart Back - Current state:', {
      currentPage,
      breadcrumbsLength: breadcrumbs?.length,
      breadcrumbs: breadcrumbs?.map(b => b.label)
    });

    // If breadcrumbs exist and has more than 1 item, go to previous breadcrumb
    if (breadcrumbs && breadcrumbs.length > 1) {
      const previousBreadcrumb = breadcrumbs[breadcrumbs.length - 2]; // Second to last
      console.log('[Navigation] Going back to:', previousBreadcrumb);

      handleNavigate(
        previousBreadcrumb.path,
        previousBreadcrumb.params?.formId,
        false,
        previousBreadcrumb.params?.submissionId,
        previousBreadcrumb.params?.subFormId,
        previousBreadcrumb.params?.subSubmissionId
      );
    } else {
      // Fallback: Go to form-list
      console.log('[Warning] No breadcrumbs, fallback to form-list');
      handleNavigate('form-list');
    }
  };





  const handleNavigate = async (page, formId = null, editing = false, submissionId = null, subFormId = null, subSubmissionId = null) => {
    console.log('[Navigate] handleNavigate called:', { page, formId, editing, submissionId, subFormId, subSubmissionId });
    setCurrentPage(page);
    setCurrentFormId(formId);
    setCurrentSubmissionId(submissionId);
    setCurrentSubFormId(subFormId);
    setCurrentSubSubmissionId(subSubmissionId);
    setIsEditing(editing);

    // Update form titles when navigating
    if (formId) {
      try {
        // ✅ v0.7.43-fix: Check cache first to prevent duplicate API calls
        let form = formCacheRef.current[formId];
        
        if (!form) {
          console.log('[Cache MISS] Loading form from API:', formId);
          const response = await apiClient.getForm(formId);
          form = response.data?.form || response.data;
          
          // Store in cache
          if (form) {
            formCacheRef.current[formId] = form;
            console.log('[Cached] Form stored:', { formId, title: form?.title });
          }
        } else {
          console.log('[Cache HIT] Form loaded from cache:', { formId, title: form?.title });
        }
        
        console.log('[Breadcrumb] Form loaded:', { formId, title: form?.title, name: form?.name });
        if (form) {
          const title = form.title || form.name || '';
          console.log('[Setting] currentFormTitle:', title);
          setCurrentFormTitle(title);
          if (subFormId && form.subForms) {
            const subForm = form.subForms.find(sf => sf.id === subFormId);
            if (subForm) {
              setCurrentSubFormTitle(subForm.title);
            }
          }
        }
      } catch (error) {
        console.error('Failed to load form from API:', error);
        setCurrentFormTitle('');
        setCurrentSubFormTitle('');
      }
    } else {
      // Clear form title when no formId
      setCurrentFormTitle('');
      setCurrentSubFormTitle('');
    }
  };

  // Load sub-form submissions for navigation
  useEffect(() => {
    console.log('[Debug] useEffect [sub-form navigation] triggered:', {
      currentPage,
      currentSubFormId,
      currentSubmissionId,
      currentSubSubmissionId,
      conditionPassed: currentPage === 'subform-detail' && !!currentSubFormId && !!currentSubmissionId
    });

    async function loadSubFormSubmissions() {
      if (currentPage === 'subform-detail' && currentSubFormId && currentSubmissionId) {
        try {
          console.log('[Debug] Loading sub-form submissions for navigation:', {
            currentSubFormId,
            currentSubmissionId,
            apiEndpoint: `/submissions/${currentSubmissionId}/sub-forms/${currentSubFormId}`
          });
          // ✅ FIX: Use correct API endpoint that matches SubmissionDetail.jsx
          const response = await apiClient.get(`/submissions/${currentSubmissionId}/sub-forms/${currentSubFormId}`);
          console.log('[Debug] Raw API response:', {
            response,
            responseData: response.data,
            responseDataSubFormSubmissions: response.data?.subFormSubmissions,
            responseDataSubmissions: response.data?.submissions,
            responseDataType: typeof response.data,
            responseDataKeys: response.data ? Object.keys(response.data) : []
          });
          // ✅ FIX: Support multiple response formats (match SubmissionDetail.jsx line 348)
          const subs = response.data?.subFormSubmissions || response.data?.submissions || response.data || [];
          console.log('[Success] Sub-form submissions loaded:', {
            count: subs.length,
            submissions: subs.map(s => ({ id: s.id, submittedAt: s.submittedAt }))
          });
          setAllSubSubmissions(subs);
        } catch (error) {
          console.error('❌ Failed to load sub-form submissions:', error);
          console.error('❌ Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          });
          setAllSubSubmissions([]);
        }
      } else {
        console.log('[Skip] Skipping sub-form load (condition not met) - Setting empty array', {
          why: {
            wrongPage: currentPage !== 'subform-detail',
            noSubFormId: !currentSubFormId,
            noSubmissionId: !currentSubmissionId
          }
        });
        setAllSubSubmissions([]);
      }
    }
    loadSubFormSubmissions();
  }, [currentPage, currentSubFormId, currentSubmissionId, currentSubSubmissionId]);

  const handleNewForm = () => {
    if (!canCreateOrEditForms()) {
      toast.error('ไม่มีสิทธิ์สร้างฟอร์มใหม่', {
        title: 'ไม่มีสิทธิ์เข้าถึง',
        description: 'เฉพาะผู้ดูแลระบบ, ผู้จัดการ, และผู้ควบคุมเท่านั้นที่สามารถสร้างฟอร์มได้'
      });
      return;
    }
    handleNavigate('form-builder', null, false);
  };

  const handleEditForm = (formId) => {
    if (!canCreateOrEditForms()) {
      toast.error('ไม่มีสิทธิ์แก้ไขฟอร์ม', {
        title: 'ไม่มีสิทธิ์เข้าถึง',
        description: 'เฉพาะผู้ดูแลระบบ, ผู้จัดการ, และผู้ควบคุมเท่านั้นที่สามารถแก้ไขฟอร์มได้'
      });
      return;
    }
    handleNavigate('form-builder', formId, true);
  };

  const handleViewSubmissions = (formId) => {
    handleNavigate('submission-list', formId);
  };

  const handleFormView = (formId) => {
    handleNavigate('form-view', formId);
  };

  // New navigation handlers for the updated flow
  const handleViewSubmissionDetail = (formId, submissionId) => {
    handleNavigate('submission-detail', formId, false, submissionId);
  };

  const handleViewSubFormView = (formId, submissionId, subFormId) => {
    handleNavigate('subform-view', formId, false, submissionId, subFormId);
  };

  const handleViewSubFormDetail = (formId, submissionId, subFormId, subSubmissionId) => {
    handleNavigate('subform-detail', formId, false, submissionId, subFormId, subSubmissionId);
  };

  const handleEditUser = (userId) => {
    setCurrentUserId(userId);
    handleNavigate('user-edit');
  };

  const renderNavigation = () => {
    const getPageTitle = () => {
      switch (currentPage) {
        case 'form-list': return 'จัดการฟอร์ม';
        case 'form-builder': return isEditing ? 'แก้ไขฟอร์ม' : 'สร้างฟอร์มใหม่';
        case 'settings': return 'ตั้งค่าระบบ';
        case 'user-management': return 'จัดการผู้ใช้งาน';
        case 'user-edit': return 'แก้ไขข้อมูลผู้ใช้';
        case 'submission-list': return 'รายการข้อมูล';
        case 'submission-detail': return 'รายละเอียดข้อมูล';
        case 'form-view': return 'กรอกข้อมูลฟอร์ม';
        case 'subform-view': return 'กรอกข้อมูลฟอร์มย่อย';
        case 'subform-detail': return 'รายละเอียดฟอร์มย่อย';
        case 'main-form-edit': return 'แก้ไขข้อมูลฟอร์ม';
        case 'subform-edit': return 'แก้ไขข้อมูลฟอร์มย่อย';
        case 'theme-test': return 'ทดสอบธีม';
        case 'sheets-import': return 'นำเข้าจาก Google Sheets';
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
          <div className="flex items-center justify-between h-14 sm:h-16 lg:h-20">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
              {canGoBack && (
                <div
                  onClick={handleSmartBack}
                  title="ย้อนกลับ"
                  className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 cursor-pointer touch-target-comfortable group flex-shrink-0"
                  style={{
                    background: 'transparent',
                    border: 'none'
                  }}
                >
                  <FontAwesomeIcon
                    icon={faArrowLeft}
                    className="text-2xl sm:text-3xl lg:text-4xl text-[#ff6400] group-hover:text-[#ff8533] group-hover:scale-110 group-hover:-translate-x-1 transition-all duration-300"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <h1 className="text-sm sm:text-base lg:text-lg font-bold text-[#10B981] truncate">
                  {getPageTitle()}
                </h1>
                {/* Dark mode toggle - only on form list page */}
                {/* HIDDEN: Theme toggle disabled per user request (2025-10-21) */}
                {/* {currentPage === 'form-list' && (
                  <ThemeToggle />
                )} */}
              </div>
            </div>

            {/* ✅ v0.7.45: Position Indicator - Shows "X of Y" in navigation bar */}
            {currentPage === 'submission-detail' && navCurrentIndex >= 0 && allSubmissions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center flex-shrink-0 mx-2 sm:mx-3"
              >
                <div className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full bg-gradient-to-br from-orange-500/10 to-orange-600/5 dark:from-orange-500/20 dark:to-orange-600/10 backdrop-blur-xl border border-orange-500/30 dark:border-orange-400/40 shadow-lg">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500 dark:text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 whitespace-nowrap">
                      {navCurrentIndex + 1} <span className="text-gray-500 dark:text-gray-400 font-normal">of</span> {allSubmissions.length}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* New Form button - only for Super Admin, Admin,  */}
              {currentPage === 'form-list' && canCreateOrEditForms() && (
                <div
                  data-testid="create-form-btn"
                  onClick={handleNewForm}
                  title="สร้างฟอร์มใหม่"
                  className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 cursor-pointer touch-target-comfortable group"
                  style={{
                    background: 'transparent',
                    border: 'none'
                  }}
                >
                  <FontAwesomeIcon
                    icon={faPlus}
                    className="text-2xl sm:text-3xl lg:text-4xl text-[#ff6400] group-hover:text-[#ff8533] group-hover:scale-110 group-hover:rotate-90 transition-all duration-300"
                  />
                </div>
              )}

              {currentPage === 'form-builder' && (
                <motion.div
                  data-testid="save-form-btn"
                  onClick={() => {
                    if (formBuilderSaveHandlerRef.current) {
                      formBuilderSaveHandlerRef.current();
                    }
                  }}
                  title="บันทึกฟอร์ม"
                  className="relative flex items-center justify-center w-12 h-12 cursor-pointer touch-target-comfortable group"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none'
                  }}
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.9, 1, 0.9]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {/* Pulsing glow background */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.6, 0.2, 0.6]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    style={{
                      background: 'radial-gradient(circle, rgba(255, 100, 0, 0.4) 0%, rgba(249, 115, 22, 0.2) 50%, transparent 70%)',
                      filter: 'blur(8px)'
                    }}
                  />

                  {/* Icon with orange color and rotation on hover */}
                  <motion.div
                    className="relative z-10"
                    initial={{ rotate: 0 }}
                    whileHover={{
                      rotate: 360,
                      scale: 1.1
                    }}
                    animate={{ rotate: 0 }}
                    transition={{
                      rotate: {
                        duration: 0.5,
                        ease: "linear"
                      },
                      scale: {
                        duration: 0.2,
                        ease: "easeInOut"
                      }
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faSave}
                      className="text-2xl text-[#ff6400] group-hover:text-[#ff8533] transition-colors duration-300"
                      style={{
                        filter: 'drop-shadow(0 0 8px rgba(255, 100, 0, 0.6))'
                      }}
                    />
                  </motion.div>
                </motion.div>
              )}

              {currentPage === 'form-view' && (
                <motion.div
                  onClick={() => {
                    if (formViewSaveHandlerRef.current) {
                      formViewSaveHandlerRef.current.handleSubmit();
                    }
                  }}
                  title="บันทึกข้อมูล"
                  className="relative flex items-center justify-center w-12 h-12 cursor-pointer touch-target-comfortable group"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none'
                  }}
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.9, 1, 0.9]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {/* Pulsing glow background */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.6, 0.2, 0.6]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    style={{
                      background: 'radial-gradient(circle, rgba(255, 100, 0, 0.4) 0%, rgba(249, 115, 22, 0.2) 50%, transparent 70%)',
                      filter: 'blur(8px)'
                    }}
                  />

                  {/* Icon with orange color and rotation on hover */}
                  <motion.div
                    className="relative z-10"
                    initial={{ rotate: 0 }}
                    whileHover={{
                      rotate: 360,
                      scale: 1.1
                    }}
                    animate={{ rotate: 0 }}
                    transition={{
                      rotate: {
                        duration: 0.5,
                        ease: "linear"
                      },
                      scale: {
                        duration: 0.2,
                        ease: "easeInOut"
                      }
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faSave}
                      className="text-2xl text-[#ff6400] group-hover:text-[#ff8533] transition-colors duration-300"
                      style={{
                        filter: 'drop-shadow(0 0 8px rgba(255, 100, 0, 0.6))'
                      }}
                    />
                  </motion.div>
                </motion.div>
              )}

              {currentPage === 'main-form-edit' && (
                <motion.div
                  onClick={() => {
                    console.log('[Save] Save button clicked for main-form-edit');
                    if (formViewSaveHandlerRef.current) {
                      console.log('[Save] Calling handleSubmit...');
                      formViewSaveHandlerRef.current.handleSubmit();
                    }
                  }}
                  title="บันทึกการแก้ไข"
                  className="relative flex items-center justify-center w-12 h-12 cursor-pointer touch-target-comfortable group"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none'
                  }}
                  animate={{
                    scale: [1, 1.15, 1],
                    opacity: [0.9, 1, 0.9]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  {/* Pulsing glow background */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    animate={{
                      scale: [1, 1.4, 1],
                      opacity: [0.6, 0.2, 0.6]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    style={{
                      background: 'radial-gradient(circle, rgba(255, 100, 0, 0.4) 0%, rgba(249, 115, 22, 0.2) 50%, transparent 70%)',
                      filter: 'blur(8px)'
                    }}
                  />

                  {/* Icon with orange color and rotation on hover */}
                  <motion.div
                    className="relative z-10"
                    initial={{ rotate: 0 }}
                    whileHover={{
                      rotate: 360,
                      scale: 1.1
                    }}
                    animate={{ rotate: 0 }}
                    transition={{
                      rotate: {
                        duration: 0.5,
                        ease: "linear"
                      },
                      scale: {
                        duration: 0.2,
                        ease: "easeInOut"
                      }
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faSave}
                      className="text-2xl text-[#ff6400] group-hover:text-[#ff8533] transition-colors duration-300"
                      style={{
                        filter: 'drop-shadow(0 0 8px rgba(255, 100, 0, 0.6))'
                      }}
                    />
                  </motion.div>
                </motion.div>
              )}

              {currentPage === 'submission-list' && (
                <div
                  onClick={() => handleNavigate('form-view', currentFormId)}
                  title="เพิ่มข้อมูลใหม่"
                  className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 cursor-pointer touch-target-comfortable group"
                  style={{
                    background: 'transparent',
                    border: 'none'
                  }}
                >
                  <FontAwesomeIcon
                    icon={faPlus}
                    className="text-2xl sm:text-3xl lg:text-4xl text-[#ff6400] group-hover:text-[#ff8533] group-hover:scale-110 group-hover:rotate-90 transition-all duration-300"
                  />
                </div>
              )}

              {currentPage === 'submission-detail' && (
                <>
                  {/* Edit Button */}
                  <div
                    onClick={() => handleNavigate('main-form-edit', currentFormId, false, currentSubmissionId)}
                    title="แก้ไขข้อมูล"
                    className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 cursor-pointer touch-target-comfortable group"
                    style={{
                      background: 'transparent',
                      border: 'none'
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faEdit}
                      className="text-sm sm:text-base text-muted-foreground group-hover:text-primary group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
                    />
                  </div>

                  {/* Delete Button */}
                  <div
                    onClick={() => {
                      const confirmToastId = toast.warning('คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้?', {
                        title: '⚠️ ยืนยันการลบข้อมูล',
                        duration: 8000,
                        action: {
                          label: 'ลบข้อมูล',
                          onClick: async () => {
                            // ✅ ปิด toast ยืนยันทันที
                            toast.dismiss(confirmToastId);

                            try {
                              await apiClient.deleteSubmission(currentSubmissionId);
                              handleNavigate('submission-list', currentFormId);
                              toast.success('ลบข้อมูลเรียบร้อยแล้ว', {
                                title: '✅ สำเร็จ'
                              });
                            } catch (error) {
                              console.error('Delete error:', error);
                              toast.error('เกิดข้อผิดพลาดในการลบข้อมูล', {
                                title: '❌ ข้อผิดพลาด'
                              });
                            }
                          }
                        }
                      });
                    }}
                    title="ลบข้อมูล"
                    className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 cursor-pointer touch-target-comfortable group"
                    style={{
                      background: 'transparent',
                      border: 'none'
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faTrashAlt}
                      className="text-sm sm:text-base text-muted-foreground group-hover:text-destructive group-hover:scale-110 transition-all duration-300"
                    />
                  </div>
                </>
              )}

              {/* ✅ Sub-Form Detail Page - Edit/Delete Buttons */}
              {currentPage === 'subform-detail' && (
                <>
                  {/* Edit Button */}
                  <div
                    onClick={() => handleNavigate('subform-edit', currentFormId, false, currentSubmissionId, currentSubFormId, currentSubSubmissionId)}
                    title="แก้ไขข้อมูล"
                    className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 cursor-pointer touch-target-comfortable group"
                    style={{
                      background: 'transparent',
                      border: 'none'
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faEdit}
                      className="text-sm sm:text-base text-muted-foreground group-hover:text-primary group-hover:scale-110 group-hover:rotate-12 transition-all duration-300"
                    />
                  </div>

                  {/* Delete Button - Only deletes sub-form submission, not parent */}
                  <div
                    onClick={() => {
                      const confirmToastId = toast.warning('คุณแน่ใจหรือไม่ที่จะลบข้อมูลฟอร์มย่อยนี้?', {
                        title: '⚠️ ยืนยันการลบข้อมูลฟอร์มย่อย',
                        duration: 8000,
                        action: {
                          label: 'ลบข้อมูล',
                          onClick: async () => {
                            // ✅ ปิด toast ยืนยันทันที
                            toast.dismiss(confirmToastId);

                            try {
                              await apiClient.delete(`/subforms/${currentSubFormId}/submissions/${currentSubSubmissionId}`);
                              // After delete, go back to parent submission detail
                              handleNavigate('submission-detail', currentFormId, false, currentSubmissionId);
                              toast.success('ลบข้อมูลฟอร์มย่อยเรียบร้อยแล้ว', {
                                title: '✅ สำเร็จ'
                              });
                            } catch (error) {
                              console.error('Delete sub-form submission error:', error);
                              toast.error('เกิดข้อผิดพลาดในการลบข้อมูลฟอร์มย่อย', {
                                title: '❌ ข้อผิดพลาด'
                              });
                            }
                          }
                        }
                      });
                    }}
                    title="ลบข้อมูลฟอร์มย่อย"
                    className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 cursor-pointer touch-target-comfortable group"
                    style={{
                      background: 'transparent',
                      border: 'none'
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faTrashAlt}
                      className="text-sm sm:text-base text-muted-foreground group-hover:text-destructive group-hover:scale-110 transition-all duration-300"
                    />
                  </div>
                </>
              )}

              {/* User Management Icon - only for Super Admin, Admin,  */}
              {currentPage === 'form-list' && canCreateOrEditForms() && (
                <div
                  onClick={() => handleNavigate('user-management')}
                  title="จัดการผู้ใช้งาน"
                  className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 cursor-pointer touch-target-comfortable group"
                  style={{
                    background: 'transparent',
                    border: 'none'
                  }}
                >
                  <FontAwesomeIcon
                    icon={faUsers}
                    className="text-sm sm:text-base text-muted-foreground group-hover:text-primary group-hover:scale-110 transition-all duration-300"
                  />
                </div>
              )}

              {/* User Menu */}
              <UserMenu
                onSettingsClick={() => handleNavigate('settings')}
                onSheetsImportClick={() => handleNavigate('sheets-import')}
                onUserManagementClick={() => handleNavigate('user-management')}
              />

              <div
                onClick={() => handleNavigate('form-list')}
                title="หน้าหลัก"
                className="w-10 h-10 sm:w-12 sm:h-12 cursor-pointer touch-target-comfortable group"
                style={{
                  background: 'transparent',
                  border: 'none'
                }}
              >
                <img
                  src="/qlogo.png"
                  alt="Q-Collector Logo"
                  className="w-full h-full object-cover rounded-lg transition-all duration-300 group-hover:rounded-full group-hover:scale-110"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.header>
    );
  };

  const renderFormList = () => (
    <FormListApp
      onCreateForm={handleNewForm}
      onEditForm={handleEditForm}
      onViewSubmissions={handleViewSubmissions}
      onFormView={handleFormView}
    />
  );

  const renderSubmissionList = () => (
    <FormSubmissionList
      formId={currentFormId}
      onNewSubmission={(formId) => handleNavigate('form-view', formId)}
      onViewSubmission={(submissionId) => {
        handleViewSubmissionDetail(currentFormId, submissionId);
      }}
      onEditSubmission={(submissionId) => {
        handleNavigate('main-form-edit', currentFormId, false, submissionId);
      }}
      onBack={() => handleNavigate('form-list')}
    />
  );

  const renderFormBuilder = () => {
    if (isEditing && loadingEditForm) {
      return (
        <main className="container-responsive py-8">
          <div className="text-center py-16">
            <p className="text-muted-foreground">กำลังโหลดฟอร์ม...</p>
          </div>
        </main>
      );
    }

    return (
      <main className="container-responsive py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <EnhancedFormBuilder
            initialForm={editFormData}
            onSave={(savedForm) => {
              console.log('Form saved successfully:', savedForm);
              // Toast notification is already handled in EnhancedFormBuilder.jsx, no need to duplicate
              handleNavigate('form-list');
            }}
            onCancel={() => handleNavigate('form-list')}
            onSaveHandlerReady={(handler) => {
              formBuilderSaveHandlerRef.current = handler;
            }}
          />
        </motion.div>
      </main>
    );
  };

  const renderFormView = () => {
    return (
      <main className="container-responsive py-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <FormView
            ref={formViewSaveHandlerRef}
            formId={currentFormId}
            submissionId={currentSubmissionId}
            onSave={(submission, isEdit) => {
              console.log('Form submitted successfully:', submission);
              // Toast notification is already handled in FormView.jsx, no need to duplicate
              if (isEdit) {
                // If editing, go back to submission detail
                handleNavigate('submission-detail', currentFormId, false, currentSubmissionId);
              } else {
                // If new submission, go to detail view of the new submission
                handleNavigate('submission-detail', currentFormId, false, submission.id);
              }
            }}
            onCancel={() => {
              if (currentSubmissionId) {
                // If editing, go back to submission detail
                handleNavigate('submission-detail', currentFormId, false, currentSubmissionId);
              } else {
                // If new, go back to form list
                handleNavigate('form-list');
              }
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
        <SettingsPage onNavigate={handleNavigate} />
      </motion.div>
    </main>
  );

  // ✅ v0.7.45: Load ALL filtered submissions for navigation (not limited by pagination)
  useEffect(() => {
    console.log('🔍 [v0.7.45] useEffect triggered:', { currentPage, currentFormId, navigationFilters });

    const loadSubmissions = async () => {
      if (currentPage === 'submission-detail' && currentFormId) {
        console.log('✅ [v0.7.45] Condition passed - loading submissions');
        try {
          let submissions = [];

          // ✅ STRATEGY: Check if we have any filters from context (formId match is enough)
          // Load with filters if available, otherwise load all
          const hasFilters = navigationFilters.formId === currentFormId;
          console.log('🔍 [v0.7.45] hasFilters check:', { hasFilters, contextFormId: navigationFilters.formId, currentFormId });

          if (hasFilters) {
            console.log('🔄 [v0.7.45 Navigation] Loading ALL filtered submissions (no pagination limit):', navigationFilters);

            const filters = {
              limit: 10000, // ✅ Load ALL filtered items (very high limit)
              page: 1
            };

            // Apply filters from context (if present)
            if (navigationFilters.month) filters.month = navigationFilters.month;
            if (navigationFilters.year) filters.year = navigationFilters.year;
            // ✅ FIX: Skip _auto_date (it's not a real field, just UI indicator)
            if (navigationFilters.sortBy && navigationFilters.sortBy !== '_auto_date') {
              filters.sortBy = navigationFilters.sortBy;
            }
            if (navigationFilters.sortOrder) filters.sortOrder = navigationFilters.sortOrder;
            if (navigationFilters.selectedDateField) filters.dateField = navigationFilters.selectedDateField;
            if (navigationFilters.searchTerm) filters.search = navigationFilters.searchTerm;

            const response = await apiClient.listSubmissions(currentFormId, filters);
            submissions = response.data?.submissions || response.data || [];
            const totalCount = response.data?.pagination?.total || submissions.length;

            console.log(`✅ [v0.7.45 Navigation] Loaded ${submissions.length} of ${totalCount} total filtered submissions`);
            console.log('📊 [v0.7.45 Navigation] Filter details:', {
              month: navigationFilters.month,
              year: navigationFilters.year,
              sortBy: navigationFilters.sortBy,
              sortOrder: navigationFilters.sortOrder,
              dateField: navigationFilters.selectedDateField,
              search: navigationFilters.searchTerm
            });
          }
          // ✅ FALLBACK: Load all submissions (no filter context available)
          else {
            console.log('⚠️  [v0.7.45 Navigation] No filter context, loading ALL submissions');
            const response = await apiClient.listSubmissions(currentFormId);
            submissions = response.data?.submissions || response.data || [];
            console.log(`✅ [v0.7.45 Navigation] Loaded ${submissions.length} total submissions (no filters)`);
          }

          setAllSubmissions(submissions);

          const index = submissions.findIndex(sub => sub.id === currentSubmissionId);
          setNavCurrentIndex(index);
          setNavHasPrevious(index > 0);
          setNavHasNext(index < submissions.length - 1);

          // ✅ v0.7.45 DEBUG: Navigation state logging
          console.log('[Debug] [v0.7.45] Navigation Debug - MainFormApp:', {
            currentPage,
            currentFormId,
            currentSubmissionId,
            submissionsLoaded: submissions.length,
            currentIndex: index,
            navHasPrevious: index > 0,
            navHasNext: index < submissions.length - 1,
            usingFilters: hasFilters,
            filterSummary: hasFilters ? {
              month: navigationFilters.month,
              year: navigationFilters.year,
              sortBy: navigationFilters.sortBy,
              sortOrder: navigationFilters.sortOrder
            } : null
          });
        } catch (error) {
          console.error('Failed to load submissions for navigation:', error);
        }
      }
    };

    loadSubmissions();
  }, [currentPage, currentFormId, currentSubmissionId, navigationFilters]); // ✅ Removed filteredSubmissions - we load ALL items ourselves

  const renderSubmissionDetail = () => {
    const handleNavigatePrevious = () => {
      if (navHasPrevious && navCurrentIndex > 0) {
        const previousSubmission = allSubmissions[navCurrentIndex - 1];
        handleNavigate('submission-detail', currentFormId, false, previousSubmission.id);
      }
    };

    const handleNavigateNext = () => {
      if (navHasNext && navCurrentIndex < allSubmissions.length - 1) {
        const nextSubmission = allSubmissions[navCurrentIndex + 1];
        handleNavigate('submission-detail', currentFormId, false, nextSubmission.id);
      }
    };

    return (
      <SubmissionDetail
        formId={currentFormId}
        submissionId={currentSubmissionId}
        onEdit={(submissionId) => handleNavigate('main-form-edit', currentFormId, false, submissionId)}
        onDelete={(submissionId) => {
          // After delete, go back to submission list
          handleNavigate('submission-list', currentFormId);
        }}
        onBack={() => handleNavigate('submission-list', currentFormId)}
        onAddSubForm={(formId, submissionId, subFormId) => {
          handleViewSubFormView(formId, submissionId, subFormId);
        }}
        onViewSubFormDetail={(formId, submissionId, subFormId, subSubmissionId) => {
          handleViewSubFormDetail(formId, submissionId, subFormId, subSubmissionId);
        }}
        onAddNew={(formId) => {
          console.log('Add new submission for form:', formId);
          handleNavigate('form-view', formId);
        }}
        onNavigatePrevious={handleNavigatePrevious}
        onNavigateNext={handleNavigateNext}
        hasPrevious={navHasPrevious}
        hasNext={navHasNext}
        currentIndex={navCurrentIndex}
        totalCount={allSubmissions.length}
      />
    );
  };

  const renderSubFormView = () => (
    <SubFormView
      formId={currentFormId}
      submissionId={currentSubmissionId}
      subFormId={currentSubFormId}
      subSubmissionId={currentSubSubmissionId}
      onSave={(result) => {
        // After save, go back to submission detail
        handleNavigate('submission-detail', currentFormId, false, currentSubmissionId);
      }}
      onCancel={() => handleNavigate('submission-detail', currentFormId, false, currentSubmissionId)}
    />
  );

  const renderSubFormDetail = () => {
    // ✅ FIX: Use state-loaded sub-form submissions for navigation
    console.log('[Debug] renderSubFormDetail - Raw data check:', {
      allSubSubmissionsArray: allSubSubmissions,
      allSubSubmissionsCount: allSubSubmissions.length,
      currentSubSubmissionId,
      currentSubSubmissionIdType: typeof currentSubSubmissionId
    });

    const currentIndex = allSubSubmissions.findIndex(sub => {
      console.log(`  Comparing: sub.id="${sub.id}" (${typeof sub.id}) === currentSubSubmissionId="${currentSubSubmissionId}" (${typeof currentSubSubmissionId})`);
      return sub.id === currentSubSubmissionId;
    });
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < allSubSubmissions.length - 1;

    console.log('[Navigation] renderSubFormDetail navigation state:', {
      allSubSubmissionsCount: allSubSubmissions.length,
      currentSubSubmissionId,
      currentIndex,
      hasPrevious,
      hasNext,
      allSubSubmissionIds: allSubSubmissions.map(s => s.id)
    });

    const handleNavigatePrevious = () => {
      if (hasPrevious) {
        const previousSubSubmission = allSubSubmissions[currentIndex - 1];
        handleNavigate('subform-detail', currentFormId, false, currentSubmissionId, currentSubFormId, previousSubSubmission.id);
      }
    };

    const handleNavigateNext = () => {
      if (hasNext) {
        const nextSubSubmission = allSubSubmissions[currentIndex + 1];
        handleNavigate('subform-detail', currentFormId, false, currentSubmissionId, currentSubFormId, nextSubSubmission.id);
      }
    };

    return (
      <SubFormDetail
        formId={currentFormId}
        submissionId={currentSubmissionId}
        subFormId={currentSubFormId}
        subSubmissionId={currentSubSubmissionId}
        onEdit={(subSubmissionId) => {
          handleNavigate('subform-edit', currentFormId, false, currentSubmissionId, currentSubFormId, subSubmissionId);
        }}
        onDelete={(subSubmissionId) => {
          // After delete, go back to submission detail
          handleNavigate('submission-detail', currentFormId, false, currentSubmissionId);
        }}
        onBack={() => handleNavigate('submission-detail', currentFormId, false, currentSubmissionId)}
        onAddNew={(formId, submissionId, subFormId) => {
          // ✅ FIX v0.7.31: Add new sub-form submission
          console.log('Add new sub-form submission:', { formId, submissionId, subFormId });
          handleNavigate('subform-view', formId, false, submissionId, subFormId);
        }}
        onNavigatePrevious={handleNavigatePrevious}
        onNavigateNext={handleNavigateNext}
        hasPrevious={hasPrevious}  // ✅ FIX: Use local variable instead of navHasPrevious
        hasNext={hasNext}          // ✅ FIX: Use local variable instead of navHasNext
      />
    );
  };

  const renderMainFormEdit = () => (
    <main className="container-responsive py-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <MainFormEditPage
          ref={formViewSaveHandlerRef}
          formId={currentFormId}
          submissionId={currentSubmissionId}
          onSave={(submission, isEdit) => {
            console.log('Form updated successfully:', submission);
            // After edit, go back to submission detail
            handleNavigate('submission-detail', currentFormId, false, currentSubmissionId);
          }}
          onCancel={() => {
            // Go back to submission detail
            handleNavigate('submission-detail', currentFormId, false, currentSubmissionId);
          }}
        />
      </motion.div>
    </main>
  );

  const renderSubFormEdit = () => (
    <main className="container-responsive py-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <SubFormEditPage
          formId={currentFormId}
          submissionId={currentSubmissionId}
          subFormId={currentSubFormId}
          subSubmissionId={currentSubSubmissionId}
          onSave={(submission, isEdit) => {
            console.log('Sub-form updated successfully:', submission);
            // After edit, go back to sub-form detail
            handleNavigate('subform-detail', currentFormId, false, currentSubmissionId, currentSubFormId, currentSubSubmissionId);
          }}
          onCancel={() => {
            // Go back to sub-form detail
            handleNavigate('subform-detail', currentFormId, false, currentSubmissionId, currentSubFormId, currentSubSubmissionId);
          }}
        />
      </motion.div>
    </main>
  );


  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'form-list':
        return renderFormList();
      case 'form-builder':
        return renderFormBuilder();
      case 'settings':
        return renderSettings();
      case 'user-management':
        return <UserManagement onEditUser={handleEditUser} />;
      case 'user-edit':
        return (
          <UserEditPage
            userId={currentUserId}
            onSave={() => {
              handleNavigate('user-management');
            }}
            onCancel={() => {
              handleNavigate('user-management');
            }}
          />
        );
      case 'theme-test':
        return <ThemeTestPage onNavigate={handleNavigate} />;
      case 'submission-list':
        return renderSubmissionList();
      case 'submission-detail':
        return renderSubmissionDetail();
      case 'form-view':
        return renderFormView();
      case 'subform-view':
        return renderSubFormView();
      case 'subform-detail':
        return renderSubFormDetail();
      case 'main-form-edit':
        return renderMainFormEdit();
      case 'subform-edit':
        return renderSubFormEdit();
      case 'sheets-import':
        return (
          <main className="container-responsive py-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <GoogleSheetsImportPage
                onNavigate={(page, params) => {
                  // Handle navigation from Google Sheets Import Page
                  if (page === 'form-builder') {
                    handleNavigate('form-builder', params?.formId, true);
                  } else if (page === 'form-list') {
                    handleNavigate('form-list');
                  }
                }}
              />
            </motion.div>
          </main>
        );
      case 'notification-rules':
        return <NotificationRulesPage onNavigate={handleNavigate} />;
      default:
        return renderFormList();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderNavigation()}

      {/* Breadcrumb Navigation */}
      {breadcrumbs && breadcrumbs.length > 1 && (
        <div className="container-responsive px-4 sm:px-6 lg:px-8 py-2">
          <ResponsiveBreadcrumb
            items={breadcrumbs}
            onNavigate={(path, params) => {
              // Navigate based on breadcrumb click
              handleNavigate(
                path,
                params.formId,
                false,
                params.submissionId,
                params.subFormId,
                params.subSubmissionId
              );
            }}
            maxItems={3}
          />
        </div>
      )}

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

      {/* General User Welcome Modal - Shows once per session for general_user role */}
      <GeneralUserWelcomeModal />
    </div>
  );
}

// Main App Wrapper with Breadcrumb Provider
// Note: EnhancedToastProvider is already provided at App.js level
export default function MainFormApp() {
  return (
    <NavigationProvider>
      <BreadcrumbProvider>
        <MainFormAppContent />
      </BreadcrumbProvider>
    </NavigationProvider>
  );
}
