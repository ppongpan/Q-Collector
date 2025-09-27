import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from './ui/glass-card';
import { GlassButton } from './ui/glass-button';
import { GlassInput } from './ui/glass-input';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faSave, faFileAlt } from '@fortawesome/free-solid-svg-icons';

export default function FormView({ form, onSave, onCancel }) {
  const [formData, setFormData] = useState({});

  const handleInputChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSubmit = () => {
    const submission = {
      id: Date.now(),
      formId: form.id,
      data: formData,
      submittedAt: new Date().toISOString(),
      submittedBy: 'User' // This would come from auth context
    };

    onSave(submission);
  };

  const renderField = (field) => {
    switch (field.type) {
      case 'short_answer':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <GlassInput
            key={field.id}
            label={field.label}
            required={field.required}
            placeholder={field.placeholder || `กรอก${field.label}`}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="form-card-description"
          />
        );

      case 'paragraph':
        return (
          <div key={field.id} className="space-y-2">
            <label className="form-card-title text-sm">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <textarea
              className="w-full px-4 py-3 bg-card/50 border border-border/40 rounded-lg backdrop-blur-sm text-foreground placeholder-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all duration-200 form-card-description"
              placeholder={field.placeholder || `กรอก${field.label}`}
              rows={4}
              value={formData[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
            />
          </div>
        );

      case 'number':
        return (
          <GlassInput
            key={field.id}
            type="number"
            label={field.label}
            required={field.required}
            placeholder={field.placeholder || `กรอก${field.label}`}
            value={formData[field.id] || ''}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            className="form-card-description"
          />
        );

      case 'multiple_choice':
        return (
          <div key={field.id} className="space-y-3">
            <label className="form-card-title text-sm">
              {field.label}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </label>
            <div className="space-y-2">
              {field.options?.map((option, index) => (
                <label key={index} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type={field.allowMultiple ? "checkbox" : "radio"}
                    name={field.id}
                    value={option}
                    checked={
                      field.allowMultiple
                        ? (formData[field.id] || []).includes(option)
                        : formData[field.id] === option
                    }
                    onChange={(e) => {
                      if (field.allowMultiple) {
                        const current = formData[field.id] || [];
                        const newValue = e.target.checked
                          ? [...current, option]
                          : current.filter(item => item !== option);
                        handleInputChange(field.id, newValue);
                      } else {
                        handleInputChange(field.id, option);
                      }
                    }}
                    className="w-4 h-4 text-primary border-border/40 rounded focus:ring-primary/40"
                  />
                  <span className="form-card-description">{option}</span>
                </label>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div key={field.id} className="p-4 border border-border/40 rounded-lg bg-muted/20">
            <p className="form-card-description text-muted-foreground">
              Field type "{field.type}" ยังไม่รองรับในหน้านี้
            </p>
          </div>
        );
    }
  };

  if (!form) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <GlassCard>
          <GlassCardContent className="text-center py-8">
            <p className="form-card-description text-muted-foreground">ไม่พบข้อมูลฟอร์ม</p>
          </GlassCardContent>
        </GlassCard>
      </div>
    );
  }

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
              <GlassButton
                variant="ghost"
                size="icon"
                onClick={onCancel}
                tooltip="กลับสู่รายการฟอร์ม"
                className="touch-target-comfortable"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="text-base" />
              </GlassButton>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <FontAwesomeIcon icon={faFileAlt} className="text-primary text-lg" />
                </div>
                <div>
                  <h1 className="form-card-title">
                    {form.title}
                  </h1>
                  <p className="form-card-stats">
                    กรอกข้อมูลฟอร์ม
                  </p>
                </div>
              </div>
            </div>

            <GlassButton
              onClick={handleSubmit}
              className="gap-2"
            >
              <FontAwesomeIcon icon={faSave} />
              บันทึกข้อมูล
            </GlassButton>
          </div>
        </div>
      </motion.header>

      {/* Form Content */}
      <main className="container-responsive py-8">
        <motion.div
          className="max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <GlassCard className="form-card-glow">
            <GlassCardHeader>
              <GlassCardTitle className="form-card-title">
                {form.title}
              </GlassCardTitle>
              {form.description && (
                <GlassCardDescription className="form-card-description">
                  {form.description}
                </GlassCardDescription>
              )}
            </GlassCardHeader>

            <GlassCardContent className="space-y-6">
              {/* Main Form Fields */}
              {form.fields?.map(field => renderField(field))}

              {/* Submit Button */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-border/40">
                <GlassButton
                  variant="ghost"
                  onClick={onCancel}
                  className="gap-2"
                >
                  ยกเลิก
                </GlassButton>

                <GlassButton
                  onClick={handleSubmit}
                  className="gap-2 px-8"
                >
                  <FontAwesomeIcon icon={faSave} />
                  บันทึกข้อมูล
                </GlassButton>
              </div>
            </GlassCardContent>
          </GlassCard>
        </motion.div>
      </main>
    </div>
  );
}