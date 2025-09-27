import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faEdit, faEye, faTrashAlt, faCopy,
  faFileAlt, faUsers, faCalendarAlt, faBuilding
} from '@fortawesome/free-solid-svg-icons';

export default function FormListApp() {
  const [forms] = useState([
    {
      id: 1,
      title: 'ฟอร์มลงทะเบียนพนักงาน',
      description: 'ฟอร์มสำหรับลงทะเบียนพนักงานใหม่ รวมข้อมูลส่วนบุคคลและตำแหน่งงาน',
      category: 'HR',
      icon: faUsers,
      submissions: 45,
      lastUpdated: '2024-01-15',
      status: 'active'
    },
    {
      id: 2,
      title: 'ฟอร์มขออนุมัติลางาน',
      description: 'ฟอร์มสำหรับการขออนุมัติลางานประเภทต่างๆ พร้อมระบบอนุมัติ',
      category: 'HR',
      icon: faCalendarAlt,
      submissions: 128,
      lastUpdated: '2024-01-10',
      status: 'active'
    },
    {
      id: 3,
      title: 'ฟอร์มรายงานการประชุม',
      description: 'ฟอร์มบันทึกรายงานการประชุม วาระการประชุม และมติที่ได้',
      category: 'Meeting',
      icon: faFileAlt,
      submissions: 23,
      lastUpdated: '2024-01-08',
      status: 'active'
    },
    {
      id: 4,
      title: 'ฟอร์มการตรวจสอบอุปกรณ์',
      description: 'ฟอร์มสำหรับการตรวจสอบและบำรุงรักษาอุปกรณ์ในโรงงาน',
      category: 'Maintenance',
      icon: faBuilding,
      submissions: 67,
      lastUpdated: '2024-01-12',
      status: 'active'
    },
    {
      id: 5,
      title: 'ฟอร์มประเมินความพึงพอใจ',
      description: 'ฟอร์มประเมินความพึงพอใจของลูกค้าต่อการให้บริการ',
      category: 'Survey',
      icon: faUsers,
      submissions: 89,
      lastUpdated: '2024-01-14',
      status: 'active'
    },
    {
      id: 6,
      title: 'ฟอร์มคำร้องขอวัสดุอุปกรณ์',
      description: 'ฟอร์มสำหรับการขอวัสดุและอุปกรณ์สำนักงาน',
      category: 'Request',
      icon: faFileAlt,
      submissions: 156,
      lastUpdated: '2024-01-16',
      status: 'active'
    }
  ]);

  const getCategoryColor = (category) => {
    const colors = {
      'HR': 'from-blue-500/20 to-blue-600/20',
      'Meeting': 'from-green-500/20 to-green-600/20',
      'Maintenance': 'from-yellow-500/20 to-yellow-600/20',
      'Survey': 'from-purple-500/20 to-purple-600/20',
      'Request': 'from-orange-500/20 to-orange-600/20'
    };
    return colors[category] || 'from-gray-500/20 to-gray-600/20';
  };

  const handleNewForm = () => {
    console.log('Create new form');
  };

  const handleEdit = (formId) => {
    console.log('Edit form:', formId);
  };

  const handleView = (formId) => {
    console.log('View form submissions:', formId);
  };

  const handleDuplicate = (formId) => {
    console.log('Duplicate form:', formId);
  };

  const handleDelete = (formId) => {
    console.log('Delete form:', formId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        className="glass-nav sticky top-0 z-50 border-b border-border/40"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="container-responsive">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <FontAwesomeIcon icon={faFileAlt} className="text-primary text-lg" />
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-foreground">
                  จัดการฟอร์ม
                </h1>
                <p className="text-sm text-muted-foreground">
                  รายการฟอร์มทั้งหมดในระบบ
                </p>
              </div>
            </div>

            <GlassButton
              onClick={handleNewForm}
              className="gap-2"
            >
              <FontAwesomeIcon icon={faPlus} />
              สร้างฟอร์มใหม่
            </GlassButton>
          </div>
        </div>
      </motion.header>

      {/* Form List Content */}
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
                <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out h-full flex flex-col">
                  <GlassCardHeader className="flex-1">
                    {/* Category Badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${getCategoryColor(form.category)} text-foreground/80 border border-border/30`}>
                        {form.category}
                      </span>
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getCategoryColor(form.category)} flex items-center justify-center`}>
                        <FontAwesomeIcon icon={form.icon} className="text-sm text-foreground/70" />
                      </div>
                    </div>

                    {/* Form Title & Description */}
                    <GlassCardTitle className="text-lg font-semibold leading-tight mb-2 group-hover:text-primary/90 transition-colors">
                      {form.title}
                    </GlassCardTitle>

                    <GlassCardDescription className="text-sm text-muted-foreground/80 line-clamp-3 mb-4 group-hover:text-muted-foreground transition-colors">
                      {form.description}
                    </GlassCardDescription>

                    {/* Stats */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground/60 mb-4">
                      <span>{form.submissions} submissions</span>
                      <span>อัพเดต: {form.lastUpdated}</span>
                    </div>
                  </GlassCardHeader>

                  {/* Action Buttons */}
                  <div className="px-6 pb-6">
                    <div className="flex items-center gap-2">
                      <GlassButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleView(form.id)}
                        className="flex-1 gap-2 hover:bg-primary/10"
                        tooltip="ดู Submissions"
                      >
                        <FontAwesomeIcon icon={faEye} className="text-xs" />
                        ดู
                      </GlassButton>

                      <GlassButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(form.id)}
                        className="flex-1 gap-2 hover:bg-blue-500/10"
                        tooltip="แก้ไขฟอร์ม"
                      >
                        <FontAwesomeIcon icon={faEdit} className="text-xs" />
                        แก้ไข
                      </GlassButton>

                      <GlassButton
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(form.id)}
                        className="hover:bg-green-500/10"
                        tooltip="ทำสำเนา"
                      >
                        <FontAwesomeIcon icon={faCopy} className="text-xs" />
                      </GlassButton>

                      <GlassButton
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(form.id)}
                        className="hover:bg-red-500/10 text-red-400/70 hover:text-red-400"
                        tooltip="ลบฟอร์ม"
                      >
                        <FontAwesomeIcon icon={faTrashAlt} className="text-xs" />
                      </GlassButton>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>

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
              เริ่มต้นสร้างฟอร์มแรกของคุณเพื่อจัดเก็บและจัดการข้อมูล
            </p>
            <GlassButton onClick={handleNewForm} className="gap-2">
              <FontAwesomeIcon icon={faPlus} />
              สร้างฟอร์มใหม่
            </GlassButton>
          </motion.div>
        )}
      </main>
    </div>
  );
}