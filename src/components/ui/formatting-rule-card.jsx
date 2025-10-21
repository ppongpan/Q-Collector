import React from 'react';
import { GlassCard, GlassCardContent } from './glass-card';
import { GlassTextarea, GlassSelect } from './glass-input';
import { ColorPicker } from './color-picker';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faEye } from '@fortawesome/free-solid-svg-icons';

/**
 * FormattingRuleCard Component
 *
 * Displays a single conditional formatting rule with:
 * - Field selector (Main Form + Sub-Forms)
 * - Condition formula input
 * - Text color picker
 * - Background color picker
 * - Font weight selector
 * - Live preview
 * - Delete button
 *
 * @param {object} rule - Rule object with id, fieldId, condition, style
 * @param {number} index - Rule index for display
 * @param {array} fieldOptions - Array of grouped field options
 * @param {function} onUpdate - Callback when rule is updated
 * @param {function} onDelete - Callback when rule is deleted
 */
export function FormattingRuleCard({
  rule,
  index,
  fieldOptions,
  onUpdate,
  onDelete
}) {
  // Update a specific style property
  const updateStyle = (key, value) => {
    onUpdate({
      ...rule,
      style: {
        ...rule.style,
        [key]: value
      }
    });
  };

  // Update field selection
  const handleFieldChange = (e) => {
    const selectedFieldId = e.target.value;
    const selectedOption = e.target.options[e.target.selectedIndex];
    const fieldSource = selectedOption.getAttribute('data-source');
    const subFormId = selectedOption.getAttribute('data-subform');
    const fieldTitle = selectedOption.text;

    onUpdate({
      ...rule,
      fieldId: selectedFieldId,
      fieldSource: fieldSource || 'main',
      subFormId: subFormId || null,
      fieldTitle: fieldTitle
    });
  };

  // Get preview style
  const getPreviewStyle = () => {
    const style = {};

    if (rule.style.textColor) {
      style.color = rule.style.textColor;
    }

    if (rule.style.backgroundColor) {
      style.backgroundColor = rule.style.backgroundColor;
    }

    if (rule.style.fontWeight && rule.style.fontWeight !== 'normal') {
      style.fontWeight = rule.style.fontWeight;
    }

    return style;
  };

  // Get field source label
  const getFieldSourceLabel = () => {
    if (!rule.fieldId) return '';
    if (rule.fieldSource === 'main') return '📄 Main Form';

    // Find sub-form name
    const subFormGroup = fieldOptions.find(
      group => group.group.startsWith('Sub-Form:') &&
      group.fields.some(f => f.id === rule.fieldId)
    );

    return subFormGroup ? `📋 ${subFormGroup.group}` : '';
  };

  return (
    <GlassCard className="p-4 border border-border/50 hover:border-border/70 transition-colors duration-200">
      <GlassCardContent className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-orange-400">
            กฎที่ {index + 1}
          </h4>
          <button
            type="button"
            onClick={onDelete}
            className="text-xs px-2 py-1.5 rounded bg-destructive/20 hover:bg-destructive/30 text-destructive transition-colors duration-200"
            title="ลบกฎนี้"
          >
            <FontAwesomeIcon icon={faTrash} className="mr-1" />
            ลบ
          </button>
        </div>

        {/* Field Selector */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground/90">
            ฟิลด์
          </label>
          <GlassSelect
            value={rule.fieldId || ''}
            onChange={handleFieldChange}
            className="w-full"
          >
            <option value="">-- เลือกฟิลด์ --</option>
            {fieldOptions.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.fields.map((field) => (
                  <option
                    key={field.id}
                    value={field.id}
                    data-source={field.source}
                    data-subform={field.subFormId}
                  >
                    {field.title}
                  </option>
                ))}
              </optgroup>
            ))}
          </GlassSelect>
          {rule.fieldId && (
            <p className="text-xs text-muted-foreground">
              {getFieldSourceLabel()}
            </p>
          )}
        </div>

        {/* Condition Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground/90">
            เงื่อนไข (Formula)
          </label>
          <GlassTextarea
            value={rule.condition || ''}
            onChange={(e) => onUpdate({ ...rule, condition: e.target.value })}
            placeholder='ตัวอย่าง: [สถานะ] = "ปิดการขายได้"'
            rows={2}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            💡 ใช้ไวยากรณ์เดียวกับเงื่อนไขการแสดงฟิลด์ (ดู FIELD-VISIBILITY-MANUAL.md)
          </p>
        </div>

        {/* Color Pickers */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Text Color */}
          <ColorPicker
            label="สีข้อความ"
            value={rule.style.textColor}
            onChange={(color) => updateStyle('textColor', color)}
          />

          {/* Background Color */}
          <ColorPicker
            label="สีพื้นหลัง"
            value={rule.style.backgroundColor}
            onChange={(color) => updateStyle('backgroundColor', color)}
          />
        </div>

        {/* Font Weight */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground/90">
            น้ำหนักตัวอักษร
          </label>
          <GlassSelect
            value={rule.style.fontWeight || 'normal'}
            onChange={(e) => updateStyle('fontWeight', e.target.value)}
            className="w-full"
          >
            <option value="normal">ปกติ (Normal)</option>
            <option value="600">กลาง (Medium)</option>
            <option value="bold">หนา (Bold)</option>
            <option value="700">หนามาก (Extra Bold)</option>
          </GlassSelect>
        </div>

        {/* Preview */}
        <div className="space-y-2 pt-4 border-t border-border/30">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground/90">
            <FontAwesomeIcon icon={faEye} />
            <label>ตัวอย่างการแสดงผล</label>
          </div>
          <div
            className="px-4 py-3 rounded-md border-2 text-base font-medium transition-all duration-200"
            style={{
              ...getPreviewStyle(),
              borderColor: rule.style.backgroundColor ? 'transparent' : 'rgb(var(--border) / 0.3)',
              backgroundColor: rule.style.backgroundColor || 'rgb(var(--background) / 0.3)'
            }}
          >
            ตัวอย่างข้อความ (Sample Text)
          </div>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}

export default FormattingRuleCard;
