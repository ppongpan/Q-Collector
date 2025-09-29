import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
// import { GlassInput } from './ui/glass-input'; // Unused
import { EnhancedToastProvider, useEnhancedToast } from './ui/enhanced-toast';
import EnhancedFormBuilder from './EnhancedFormBuilder';
import SettingsPage from './SettingsPage';
import FormView from './FormView';
import FormListApp from './FormListApp';
import FormSubmissionList from './FormSubmissionList';
import SubmissionDetail from './SubmissionDetail';
import SubFormView from './SubFormView';
import SubFormDetail from './SubFormDetail';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCog, faArrowLeft, faFileAlt, faPlus, faSave, faEdit, faTrashAlt
} from '@fortawesome/free-solid-svg-icons';

// Data services
import dataService from '../services/DataService.js';


// Main App Component with Toast Integration
function MainFormAppContent() {
  const [currentPage, setCurrentPage] = useState('form-list'); // 'form-list', 'form-builder', 'settings', 'submission-list', 'submission-detail', 'form-view', 'subform-view', 'subform-detail'
  const [currentFormId, setCurrentFormId] = useState(null);
  const [currentSubmissionId, setCurrentSubmissionId] = useState(null);
  const [currentSubFormId, setCurrentSubFormId] = useState(null);
  const [currentSubSubmissionId, setCurrentSubSubmissionId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const formBuilderSaveHandlerRef = useRef(null);
  const formViewSaveHandlerRef = useRef(null);
  const toast = useEnhancedToast();





  const handleNavigate = (page, formId = null, editing = false, submissionId = null, subFormId = null, subSubmissionId = null) => {
    setCurrentPage(page);
    setCurrentFormId(formId);
    setCurrentSubmissionId(submissionId);
    setCurrentSubFormId(subFormId);
    setCurrentSubSubmissionId(subSubmissionId);
    setIsEditing(editing);
  };

  const handleNewForm = () => {
    handleNavigate('form-builder', null, false);
  };

  const handleEditForm = (formId) => {
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
        case 'submission-list': return 'รายการข้อมูล';
        case 'submission-detail': return 'รายละเอียดข้อมูล';
        case 'form-view': return 'กรอกข้อมูลฟอร์ม';
        case 'subform-view': return 'กรอกข้อมูลฟอร์มย่อย';
        case 'subform-detail': return 'รายละเอียดฟอร์มย่อย';
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
                {currentPage === 'form-list' && (
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FontAwesomeIcon icon={faFileAlt} className="w-5 h-5 text-primary" />
                  </div>
                )}
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                  {getPageTitle()}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentPage === 'form-list' && (
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
                    e.target.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1) rotate(0deg)';
                    e.target.style.boxShadow = '';
                  }}
                >
                  <FontAwesomeIcon
                    icon={faPlus}
                    className="text-muted-foreground group-hover:text-primary transition-colors duration-300"
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
                    e.target.style.boxShadow = '0 0 20px rgba(249, 115, 22, 0.4), 0 0 40px rgba(249, 115, 22, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = '';
                  }}
                >
                  <FontAwesomeIcon
                    icon={faPlus}
                    className="text-muted-foreground group-hover:text-primary transition-colors duration-300"
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
        <SettingsPage />
      </motion.div>
    </main>
  );

  const renderSubmissionDetail = () => (
    <SubmissionDetail
      formId={currentFormId}
      submissionId={currentSubmissionId}
      onEdit={(submissionId) => handleNavigate('form-view', currentFormId, false, submissionId)}
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
    />
  );

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

  const renderSubFormDetail = () => (
    <SubFormDetail
      formId={currentFormId}
      submissionId={currentSubmissionId}
      subFormId={currentSubFormId}
      subSubmissionId={currentSubSubmissionId}
      onEdit={(subSubmissionId) => {
        handleNavigate('subform-view', currentFormId, false, currentSubmissionId, currentSubFormId, subSubmissionId);
      }}
      onDelete={(subSubmissionId) => {
        // After delete, go back to submission detail
        handleNavigate('submission-detail', currentFormId, false, currentSubmissionId);
      }}
      onBack={() => handleNavigate('submission-detail', currentFormId, false, currentSubmissionId)}
    />
  );



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
      case 'submission-detail':
        return renderSubmissionDetail();
      case 'form-view':
        return renderFormView();
      case 'subform-view':
        return renderSubFormView();
      case 'subform-detail':
        return renderSubFormDetail();
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

// Main App Wrapper with Toast Provider
export default function MainFormApp() {
  return (
    <EnhancedToastProvider>
      <MainFormAppContent />
    </EnhancedToastProvider>
  );
}