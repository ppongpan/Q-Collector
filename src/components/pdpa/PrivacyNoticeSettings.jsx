/**
 * Privacy Notice Settings Component
 *
 * Form Builder settings section for configuring PDPA privacy notice.
 * Supports 3 modes: disabled, custom text, external link.
 *
 * @version 0.9.0-dev
 */

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldAlt } from '@fortawesome/free-solid-svg-icons';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from '../ui/glass-card';
import { GlassInput, GlassTextarea, GlassSelect } from '../ui/glass-input';

const PrivacyNoticeSettings = ({ form, onUpdate }) => {
  const privacyNotice = form.settings?.privacyNotice || {
    enabled: false,
    mode: 'disabled',
    customText: { th: '', en: '' },
    linkUrl: '',
    linkText: { th: 'นโยบายความเป็นส่วนตัว', en: 'Privacy Policy' },
    requireAcknowledgment: true
  };

  const updatePrivacyNotice = (updates) => {
    onUpdate({
      settings: {
        ...form.settings,
        privacyNotice: {
          ...privacyNotice,
          ...updates
        }
      }
    });
  };

  const modeOptions = [
    { value: 'disabled', label: 'ปิดการใช้งาน (Disabled)' },
    { value: 'custom', label: 'ข้อความกำหนดเอง (Custom Text)' },
    { value: 'link', label: 'ลิงก์ภายนอก (External Link)' }
  ];

  return (
    <GlassCard className="form-card-glow form-card-animate form-card-borderless motion-container animation-optimized group transition-all duration-400 ease-out">
      <GlassCardHeader>
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center"
            style={{ clipPath: 'circle(50% at center)' }}
          >
            <FontAwesomeIcon icon={faShieldAlt} className="text-blue-600 w-4 h-4" />
          </div>
          <div>
            <GlassCardTitle className="form-card-title">Privacy Notice</GlassCardTitle>
            <GlassCardDescription className="form-card-description">
              กำหนดข้อความแจ้งเตือนเกี่ยวกับความเป็นส่วนตัวของข้อมูล
            </GlassCardDescription>
          </div>
        </div>
      </GlassCardHeader>

      <GlassCardContent className="space-y-6">
        {/* Enable Toggle */}
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={privacyNotice.enabled || false}
            onChange={(e) => {
              updatePrivacyNotice({
                enabled: e.target.checked,
                mode: e.target.checked ? 'custom' : 'disabled'
              });
            }}
            className="w-4 h-4 rounded border-2 border-border bg-background checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
          />
          <span className="text-[14px] font-medium text-foreground/80 group-hover:text-foreground transition-colors">
            เปิดใช้งาน Privacy Notice
          </span>
        </label>

        {/* Mode Selection */}
        {privacyNotice.enabled && (
          <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-2">
              <label className="text-[14px] font-medium text-foreground/80">รูปแบบการแสดงผล</label>
              <GlassSelect
                value={privacyNotice.mode || 'disabled'}
                onChange={(e) => updatePrivacyNotice({ mode: e.target.value })}
                className="w-full"
              >
                {modeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </GlassSelect>
            </div>

            {/* Custom Text Mode */}
            {privacyNotice.mode === 'custom' && (
              <div className="space-y-4 p-4 bg-muted/10 rounded-lg border border-border/30">
                <h3 className="text-[14px] font-semibold text-foreground/90">ข้อความกำหนดเอง</h3>

                {/* Thai Text */}
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-foreground/70">
                    ข้อความภาษาไทย <span className="text-red-500">*</span>
                  </label>
                  <GlassTextarea
                    value={privacyNotice.customText?.th || ''}
                    onChange={(e) => updatePrivacyNotice({
                      customText: {
                        ...privacyNotice.customText,
                        th: e.target.value
                      }
                    })}
                    placeholder="กรุณาป้อนข้อความแจ้งเตือนความเป็นส่วนตัวภาษาไทย..."
                    rows={5}
                    className="w-full"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    ข้อความนี้จะแสดงให้ผู้ใช้อ่านก่อนกรอกฟอร์ม
                  </p>
                </div>

                {/* English Text */}
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-foreground/70">
                    English Text
                  </label>
                  <GlassTextarea
                    value={privacyNotice.customText?.en || ''}
                    onChange={(e) => updatePrivacyNotice({
                      customText: {
                        ...privacyNotice.customText,
                        en: e.target.value
                      }
                    })}
                    placeholder="Enter privacy notice text in English (optional)..."
                    rows={5}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* External Link Mode */}
            {privacyNotice.mode === 'link' && (
              <div className="space-y-4 p-4 bg-muted/10 rounded-lg border border-border/30">
                <h3 className="text-[14px] font-semibold text-foreground/90">ลิงก์ภายนอก</h3>

                {/* Link URL */}
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-foreground/70">
                    URL <span className="text-red-500">*</span>
                  </label>
                  <GlassInput
                    type="url"
                    value={privacyNotice.linkUrl || ''}
                    onChange={(e) => updatePrivacyNotice({ linkUrl: e.target.value })}
                    placeholder="https://example.com/privacy-policy"
                    className="w-full"
                  />
                </div>

                {/* Link Text - Thai */}
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-foreground/70">
                    ข้อความลิงก์ (ไทย) <span className="text-red-500">*</span>
                  </label>
                  <GlassInput
                    type="text"
                    value={privacyNotice.linkText?.th || ''}
                    onChange={(e) => updatePrivacyNotice({
                      linkText: {
                        ...privacyNotice.linkText,
                        th: e.target.value
                      }
                    })}
                    placeholder="นโยบายความเป็นส่วนตัว"
                    className="w-full"
                  />
                </div>

                {/* Link Text - English */}
                <div className="space-y-2">
                  <label className="text-[13px] font-medium text-foreground/70">
                    Link Text (English)
                  </label>
                  <GlassInput
                    type="text"
                    value={privacyNotice.linkText?.en || ''}
                    onChange={(e) => updatePrivacyNotice({
                      linkText: {
                        ...privacyNotice.linkText,
                        en: e.target.value
                      }
                    })}
                    placeholder="Privacy Policy"
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {/* Require Acknowledgment */}
            {privacyNotice.mode !== 'disabled' && (
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={privacyNotice.requireAcknowledgment !== false}
                  onChange={(e) => updatePrivacyNotice({ requireAcknowledgment: e.target.checked })}
                  className="w-4 h-4 rounded border-2 border-border bg-background checked:bg-primary checked:border-primary focus:ring-2 focus:ring-primary/50 transition-all cursor-pointer"
                />
                <span className="text-[13px] text-foreground/70 group-hover:text-foreground transition-colors">
                  บังคับให้ผู้ใช้ยอมรับก่อนกรอกฟอร์ม (Require acknowledgment checkbox)
                </span>
              </label>
            )}

            {/* Preview */}
            {privacyNotice.mode !== 'disabled' && (
              <div className="p-4 bg-background/50 rounded-lg border border-border/50">
                <h4 className="text-[12px] font-semibold text-foreground/60 mb-2">ตัวอย่างการแสดงผล:</h4>
                <div className="space-y-3">
                  {privacyNotice.mode === 'custom' && privacyNotice.customText?.th && (
                    <div className="text-[13px] text-foreground/80 whitespace-pre-wrap">
                      {privacyNotice.customText.th}
                    </div>
                  )}
                  {privacyNotice.mode === 'link' && privacyNotice.linkUrl && (
                    <a
                      href={privacyNotice.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[13px] text-primary hover:underline"
                    >
                      {privacyNotice.linkText?.th || 'นโยบายความเป็นส่วนตัว'}
                    </a>
                  )}
                  {privacyNotice.requireAcknowledgment && (
                    <label className="flex items-center gap-2 text-[12px] text-foreground/70">
                      <input type="checkbox" disabled className="w-3 h-3" />
                      ฉันได้อ่านและยอมรับนโยบายความเป็นส่วนตัว
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
};

export default PrivacyNoticeSettings;
