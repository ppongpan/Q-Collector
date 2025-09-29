import React from 'react';
import { faTable, faComments } from '@fortawesome/free-solid-svg-icons';
import FieldInlinePreview from '../FieldInlinePreview';
import { UnifiedFieldPreview } from './unified-field-row';
import FieldToggleButtons from './field-toggle-buttons';

/**
 * FieldPreviewRow - Perfectly aligned collapsed field preview component
 *
 * Layout: Three-column flex grid:
 * A) [Icon + Field Name] (fixed min-width for alignment)
 * B) [Preview Input] (flex-1 for consistent width)
 * C) [Status Tags] (auto width, wrap-enabled, right-aligned)
 *
 * Key improvements:
 * - All input boxes start at identical left position
 * - Fixed-width first column prevents label length from affecting input alignment
 * - Tags can wrap to second row with proper spacing
 * - Uses items-start for natural multi-row tag alignment
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {Object} props.fieldType - Field type info with icon and color
 * @param {boolean} props.isExpanded - Whether field is expanded
 * @param {Function} props.onUpdate - Update callback function
 * @param {boolean} props.isSubForm - Whether this is a sub form field
 * @param {number} props.tableFieldCount - Current count of fields showing in table
 * @param {number} props.maxTableFields - Maximum allowed table fields
 * @param {Array} props.allFields - All fields in the form for ordering
 * @param {string} props.formTitle - Form title for Telegram prefix
 */
const FieldPreviewRow = ({
  field,
  fieldType,
  isExpanded = false,
  showFieldTypeIcon = true,
  onUpdate,
  isSubForm = false,
  tableFieldCount = 0,
  maxTableFields = 5,
  allFields = [],
  formTitle = ''
}) => {
  if (!fieldType) return null;

  // Create FieldToggleButtons component instead of status tags
  const toggleButtonsElement = onUpdate ? (
    <FieldToggleButtons
      field={field}
      onUpdate={onUpdate}
      isSubForm={isSubForm}
      tableFieldCount={tableFieldCount}
      maxTableFields={maxTableFields}
      allFields={allFields}
      formTitle={formTitle}
    />
  ) : null;

  // Only render if not expanded
  if (isExpanded) return null;

  // Create input element for the unified layout
  const inputElement = (
    <FieldInlinePreview
      field={field}
      collapsed={!isExpanded}
      onTempChange={(value) => {
        // Optional: Handle temporary preview changes
        console.log(`Preview value changed for ${field.title}: ${value}`);
      }}
    />
  );

  return (
    <UnifiedFieldPreview
      fieldType={showFieldTypeIcon ? fieldType : null}
      field={field}
      inputElement={inputElement}
      statusTags={[]}
      toggleButtons={toggleButtonsElement}
    />
  );
};

export default FieldPreviewRow;

/**
 * Example Usage:
 *
 * // Short Text Field
 * <FieldPreviewRow
 *   field={{
 *     id: '1',
 *     type: 'short_answer',
 *     title: 'ชื่อ-นามสกุล',
 *     placeholder: 'กรอกชื่อของคุณ',
 *     required: true,
 *     showInTable: true,
 *     sendTelegram: false
 *   }}
 *   fieldType={{
 *     icon: faFont,
 *     color: 'blue',
 *     label: 'ข้อความสั้น'
 *   }}
 *   isExpanded={false}
 * />
 *
 * // Long Text Field
 * <FieldPreviewRow
 *   field={{
 *     id: '2',
 *     type: 'paragraph',
 *     title: 'คำอธิบายรายละเอียด',
 *     placeholder: 'กรอกรายละเอียดเพิ่มเติม',
 *     required: false,
 *     showInTable: false,
 *     sendTelegram: true
 *   }}
 *   fieldType={{
 *     icon: faAlignLeft,
 *     color: 'green',
 *     label: 'ข้อความยาว'
 *   }}
 *   isExpanded={false}
 * />
 *
 * // Email Field
 * <FieldPreviewRow
 *   field={{
 *     id: '3',
 *     type: 'email',
 *     title: 'อีเมล',
 *     placeholder: 'example@domain.com',
 *     required: true,
 *     showInTable: true,
 *     sendTelegram: true
 *   }}
 *   fieldType={{
 *     icon: faEnvelope,
 *     color: 'purple',
 *     label: 'อีเมล'
 *   }}
 *   isExpanded={false}
 * />
 */