import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
// import { GlassInput } from './ui/glass-input'; // Unused
import { EnhancedToastProvider, useEnhancedToast } from './ui/enhanced-toast';
import { UserMenu } from './ui/user-menu';
import { ResponsiveBreadcrumb } from './ui/breadcrumb';
import { BreadcrumbProvider, useBreadcrumb } from '../contexts/BreadcrumbContext';
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
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCog, faArrowLeft, faFileAlt, faPlus, faSave, faEdit, faTrashAlt, faUsers
} from '@fortawesome/free-solid-svg-icons';

// Data services
import dataService from '../services/DataService.js';
import { useAuth } from '../contexts/AuthContext';


// Main App Component with Toast Integration
function MainFormAppContent() {
  const [currentPage, setCurrentPage] = useState('form-list'); // 'form-list', 'form-builder', 'settings', 'user-management', 'theme-test', 'submission-list', 'submission-detail', 'form-view', 'subform-view', 'subform-detail', 'main-form-edit', 'subform-edit'
  const [currentFormId, setCurrentFormId] = useState(null);
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null);
  const [currentSubFormId, setCurrentSubFormId] = useState(null);
  const [currentSubSubmissionId, setCurrentSubSubmissionId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEditSubmissionId, setCurrentEditSubmissionId] = useState(null);
  const [currentEditSubFormId, setCurrentEditSubFormId] = useState(null);
  const [currentFormTitle, setCurrentFormTitle] = useState('');
  const [currentSubFormTitle, setCurrentSubFormTitle] = useState('');
  const formBuilderSaveHandlerRef = useRef(null);
  const formViewSaveHandlerRef = useRef(null);
  const toast = useEnhancedToast();
  const { user } = useAuth();
  const { generateBreadcrumbs, breadcrumbs } = useBreadcrumb();

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
    return ['super_admin', 'admin', 'moderator'].includes(user.role);
  };





  const handleNavigate = (page, formId = null, editing = false, submissionId = null, subFormId = null, subSubmissionId = null) => {
    setCurrentPage(page);
    setCurrentFormId(formId);
    setCurrentSubmissionId(submissionId);
    setCurrentSubFormId(subFormId);
    setCurrentSubSubmissionId(subSubmissionId);
    setIsEditing(editing);

    // Update form titles when navigating
    if (formId) {
      const form = dataService.getForm(formId);
      if (form) {
        setCurrentFormTitle(form.title);
        if (subFormId && form.subForms) {
          const subForm = form.subForms.find(sf => sf.id === subFormId);
          if (subForm) {
            setCurrentSubFormTitle(subForm.title);
          }
        }
      }
    }
  };

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


  const renderNavigation = () => {
    const getPageTitle = () => {
      switch (currentPage) {
        case 'form-list': return 'จัดการฟอร์ม';
        case 'form-builder': return isEditing ? 'แก้ไขฟอร์ม' : 'สร้างฟอร์มใหม่';
        case 'settings': return 'ตั้งค่าระบบ';
        case 'user-management': return 'จัดการผู้ใช้งาน';
        case 'submission-list': return 'รายการข้อมูล';
        case 'submission-detail': return 'รายละเอียดข้อมูล';
        case 'form-view': return 'กรอกข้อมูลฟอร์ม';
        case 'subform-view': return 'กรอกข้อมูลฟอร์มย่อย';
        case 'subform-detail': return 'รายละเอียดฟอร์มย่อย';
        case 'main-form-edit': return 'แก้ไขข้อมูลฟอร์ม';
        case 'subform-edit': return 'แก้ไขข้อมูลฟอร์มย่อย';
        case 'theme-test': return 'ทดสอบธีม';
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

              <div className="flex items-center gap-3">
                <h1 className="text-base font-bold text-foreground">
                  {getPageTitle()}
                </h1>
                {/* Dark mode toggle - only on form list page */}
                {currentPage === 'form-list' && (
                  <ThemeToggle />
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* New Form button - only for Super Admin, Admin, Moderator */}
              {currentPage === 'form-list' && canCreateOrEditForms() && (
                <div
                  onClick={handleNewForm}
                  title="สร้างฟอร์มใหม่"
                  className="flex items-center justify-center w-12 h-12 cursor-pointer touch-target-comfortable transition-all duration-300 group"
                  style={{
                    background: 'transparent',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.1) rotate(90deg)';
                    e.target.style.boxShadow = '0 0 20px rgba(255, 100, 0, 0.5), 0 0 40px rgba(255, 100, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1) rotate(0deg)';
                    e.target.style.boxShadow = '';
                  }}
                >
                  <FontAwesomeIcon
                    icon={faPlus}
                    className="text-xl text-muted-foreground group-hover:text-[#ff6400] transition-colors duration-300"
                  />
                </div>
              )}

              {currentPage === 'form-builder' && (
                <div
                  onClick={() => {
                    if (formBuilderSaveHandlerRef.current) {
                      formBuilderSaveHandlerRef.current();
                    }
                  }}
                  title="บันทึกฟอร์ม"
                  className="flex items-center justify-center w-12 h-12 cursor-pointer touch-target-comfortable transition-all duration-300 group"
                  style={{
                    background: 'transparent',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                    e.target.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '';
                  }}
                >
                  <FontAwesomeIcon
                    icon={faSave}
                    className="text-muted-foreground group-hover:text-primary transition-colors duration-300"
                  />
                </div>
              )}

              {currentPage === 'form-view' && (
                <div
                  onClick={() => {
                    if (formViewSaveHandlerRef.current) {
                      formViewSaveHandlerRef.current.handleSubmit();
                    }
                  }}
                  title="บันทึกข้อมูล"
                  className="flex items-center justify-center w-12 h-12 cursor-pointer touch-target-comfortable transition-all duration-300 group"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                    e.target.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '';
                  }}
                >
                  <FontAwesomeIcon
                    icon={faSave}
                    className="text-muted-foreground group-hover:text-primary transition-colors duration-300"
                  />
                </div>
              )}

              {currentPage === 'submission-list' && (
                <div
                  onClick={() => handleNavigate('form-view', currentFormId)}
                  title="เพิ่มข้อมูลใหม่"
                  className="flex items-center justify-center w-12 h-12 cursor-pointer touch-target-comfortable transition-all duration-300 group"
                  style={{
                    background: 'transparent',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                    e.target.style.boxShadow = '0 0 20px rgba(255, 100, 0, 0.5), 0 0 40px rgba(255, 100, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '';
                  }}
                >
                  <FontAwesomeIcon
                    icon={faPlus}
                    className="text-xl text-muted-foreground group-hover:text-[#ff6400] transition-colors duration-300"
                  />
                </div>
              )}

              {currentPage === 'submission-detail' && (
                <>
                  {/* Edit Button */}
                  <div
                    onClick={() => handleNavigate('form-view', currentFormId, false, currentSubmissionId)}
                    title="แก้ไขข้อมูล"
                    className="flex items-center justify-center w-12 h-12 cursor-pointer touch-target-comfortable transition-all duration-300 group"
                    style={{
                      background: 'transparent',
                      border: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.1)';
                      e.target.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.boxShadow = '';
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faEdit}
                      className="text-muted-foreground group-hover:text-primary transition-colors duration-300"
                    />
                  </div>

                  {/* Delete Button */}
                  <div
                    onClick={() => {
                      toast.warning('คุณแน่ใจหรือไม่ที่จะลบข้อมูลนี้?', {
                        title: '⚠️ ยืนยันการลบข้อมูล',
                        duration: 8000,
                        action: {
                          label: 'ลบข้อมูล',
                          onClick: () => {
                            try {
                              dataService.deleteSubmission(currentSubmissionId);
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
                    className="flex items-center justify-center w-12 h-12 cursor-pointer touch-target-comfortable transition-all duration-300 group"
                    style={{
                      background: 'transparent',
                      border: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.1)';
                      e.target.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.4), 0 0 40px rgba(239, 68, 68, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.boxShadow = '';
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faTrashAlt}
                      className="text-muted-foreground group-hover:text-destructive transition-colors duration-300"
                    />
                  </div>
                </>
              )}

              {/* User Management Icon - only for Super Admin, Admin, Moderator */}
              {currentPage === 'form-list' && canCreateOrEditForms() && (
                <div
                  onClick={() => handleNavigate('user-management')}
                  title="จัดการผู้ใช้งาน"
                  className="flex items-center justify-center w-12 h-12 cursor-pointer touch-target-comfortable transition-all duration-300 group"
                  style={{
                    background: 'transparent',
                    border: 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.1)';
                    e.target.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '';
                  }}
                >
                  <FontAwesomeIcon
                    icon={faUsers}
                    className="text-muted-foreground group-hover:text-primary transition-colors duration-300"
                  />
                </div>
              )}

              {/* User Menu */}
              <UserMenu onSettingsClick={() => handleNavigate('settings')} />

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
        handleNavigate('form-view', currentFormId, false, submissionId);
      }}
      onBack={() => handleNavigate('form-list')}
    />
  );

  const renderFormBuilder = () => {
    // Load the actual form from DataService for editing
    let form = null;
    if (isEditing && currentFormId) {
      const dataService = require('../services/DataService.js').default;
      form = dataService.getForm(currentFormId);
    }

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

  const renderSubmissionDetail = () => {
    // Get all submissions for this form to determine navigation
    const allSubmissions = dataService.getSubmissionsByFormId(currentFormId);
    const currentIndex = allSubmissions.findIndex(sub => sub.id === currentSubmissionId);
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < allSubmissions.length - 1;

    const handleNavigatePrevious = () => {
      if (hasPrevious) {
        const previousSubmission = allSubmissions[currentIndex - 1];
        handleNavigate('submission-detail', currentFormId, false, previousSubmission.id);
      }
    };

    const handleNavigateNext = () => {
      if (hasNext) {
        const nextSubmission = allSubmissions[currentIndex + 1];
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
        hasPrevious={hasPrevious}
        hasNext={hasNext}
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
    // Get all sub-form submissions for this parent submission to determine navigation
    const allSubSubmissions = dataService.getSubSubmissionsByParentId(currentSubmissionId)
      .filter(sub => sub.subFormId === currentSubFormId);
    const currentIndex = allSubSubmissions.findIndex(sub => sub.id === currentSubSubmissionId);
    const hasPrevious = currentIndex > 0;
    const hasNext = currentIndex < allSubSubmissions.length - 1;

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
        onNavigatePrevious={handleNavigatePrevious}
        onNavigateNext={handleNavigateNext}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
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
        return <UserManagement />;
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
    </div>
  );
}

// Main App Wrapper with Toast Provider and Breadcrumb Provider
export default function MainFormApp() {
  return (
    <EnhancedToastProvider>
      <BreadcrumbProvider>
        <MainFormAppContent />
      </BreadcrumbProvider>
    </EnhancedToastProvider>
  );
}