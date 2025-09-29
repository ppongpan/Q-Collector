import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEllipsisV, faArrowUp, faArrowDown, faCopy, faTrashAlt,
  faChevronDown, faChevronUp, faQuestionCircle,
  faCode, faMagicWandSparkles, faExclamationTriangle, faCheckCircle, faList
} from '@fortawesome/free-solid-svg-icons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './dropdown-menu';
import { GlassTextarea } from './glass-input';
import { formulaEngine } from '../../utils/formulaEngine';

/**
 * FieldOptionsMenu - Field options dropdown for field management and conditional visibility
 * Handles field operations (move, duplicate, delete) and conditional visibility settings
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {Function} props.onUpdate - Parent update callback
 * @param {Function} props.onRemove - Field removal callback
 * @param {Function} props.onDuplicate - Field duplication callback
 * @param {Function} props.onMoveUp - Move field up callback
 * @param {Function} props.onMoveDown - Move field down callback
 * @param {boolean} props.canMoveUp - Whether field can move up
 * @param {boolean} props.canMoveDown - Whether field can move down
 * @param {boolean} props.isSubForm - Whether this is a sub form field
 * @param {Array} props.allFields - All fields in the form for formula references
 */
const FieldOptionsMenu = React.memo(({
  field,
  onUpdate,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  isSubForm = false,
  allFields = []
}) => {
  // Local state for conditional visibility settings
  const [localSettings, setLocalSettings] = useState({
    showConditionFormula: field.showCondition?.formula || '',
    showConditionEnabled: field.showCondition?.enabled !== false // default to true
  });

  // UI state for expandable sections
  const [showConditionalSettings, setShowConditionalSettings] = useState(false);
  const [showFieldReference, setShowFieldReference] = useState(false);
  const [formulaValidation, setFormulaValidation] = useState({ isValid: true, error: '' });

  // Sync local state when field prop changes
  useEffect(() => {
    setLocalSettings({
      showConditionFormula: field.showCondition?.formula || '',
      showConditionEnabled: field.showCondition?.enabled !== false
    });
  }, [field.showCondition?.formula, field.showCondition?.enabled]);

  // Validate formula when it changes
  useEffect(() => {
    if (localSettings.showConditionFormula.trim()) {
      try {
        const isValid = formulaEngine.isValid(localSettings.showConditionFormula);
        if (isValid) {
          setFormulaValidation({ isValid: true, error: '' });
        } else {
          setFormulaValidation({ isValid: false, error: 'สูตรไม่ถูกต้อง' });
        }
      } catch (error) {
        setFormulaValidation({ isValid: false, error: error.message || 'สูตรไม่ถูกต้อง' });
      }
    } else {
      setFormulaValidation({ isValid: true, error: '' });
    }
  }, [localSettings.showConditionFormula]);


  // Show checkbox change handler
  const handleShowCheckboxChange = useCallback((e) => {
    const checked = e.target.checked;

    setLocalSettings(prev => ({ ...prev, showConditionEnabled: checked }));

    onUpdate({
      ...field,
      showCondition: {
        enabled: checked,
        formula: checked ? field.showCondition?.formula || '' : ''
      }
    });
  }, [field, onUpdate]);

  // Formula change handler
  const handleFormulaChange = useCallback((e) => {
    const formula = e.target.value;

    setLocalSettings(prev => ({ ...prev, showConditionFormula: formula }));

    // Update parent state with debounced effect
    const timeoutId = setTimeout(() => {
      onUpdate({
        ...field,
        showCondition: {
          enabled: false, // when unchecked (show is false), formula is enabled
          formula: formula
        }
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [field, onUpdate]);


  // Get available fields for formula reference (exclude current field)
  const availableFields = allFields.filter(f => f.id !== field.id).map(f => ({
    id: f.id,
    title: f.title || 'ไม่มีชื่อ',
    type: f.type
  }));

  // Group fields by type for better organization
  const groupedFields = availableFields.reduce((groups, field) => {
    const typeGroup = getFieldTypeGroup(field.type);
    if (!groups[typeGroup]) groups[typeGroup] = [];
    groups[typeGroup].push(field);
    return groups;
  }, {});

  // Helper function to get field type group
  function getFieldTypeGroup(fieldType) {
    const textTypes = ['short_answer', 'paragraph', 'email', 'phone', 'url'];
    const numberTypes = ['number', 'rating', 'slider'];
    const selectionTypes = ['multiple_choice', 'province', 'factory'];
    const dateTypes = ['date', 'time', 'datetime'];
    const fileTypes = ['file_upload', 'image_upload'];
    const locationTypes = ['lat_long'];

    if (textTypes.includes(fieldType)) return 'ข้อความ';
    if (numberTypes.includes(fieldType)) return 'ตัวเลข';
    if (selectionTypes.includes(fieldType)) return 'ตัวเลือก';
    if (dateTypes.includes(fieldType)) return 'วันที่/เวลา';
    if (fileTypes.includes(fieldType)) return 'ไฟล์';
    if (locationTypes.includes(fieldType)) return 'พิกัด';
    return 'อื่นๆ';
  }

  const insertFieldReference = useCallback((fieldTitle) => {
    const currentFormula = localSettings.showConditionFormula || '';
    const newFormula = currentFormula + `[${fieldTitle}]`;

    setLocalSettings(prev => ({ ...prev, showConditionFormula: newFormula }));

    onUpdate({
      ...field,
      showCondition: {
        enabled: true,
        formula: newFormula
      }
    });

    setShowFieldReference(false);
  }, [localSettings.showConditionFormula, field, onUpdate]);

  // Generate formula examples
  const formulaExamples = [
    {
      formula: 'AND([สถานะงาน] = "เสร็จสิ้น", [ประเภทงาน] = "ตรวจสอบ")',
      description: 'แสดงเมื่อสถานะงานเป็น "เสร็จสิ้น" และประเภทงานเป็น "ตรวจสอบ"'
    },
    {
      formula: 'IF([จำนวน] > 100, TRUE, FALSE)',
      description: 'แสดงเมื่อจำนวนมากกว่า 100'
    },
    {
      formula: 'CONTAINS([หมายเหตุ], "สำคัญ")',
      description: 'แสดงเมื่อหมายเหตุมีคำว่า "สำคัญ"'
    },
    {
      formula: 'NOT(ISBLANK([ความคิดเห็น]))',
      description: 'แสดงเมื่อมีความคิดเห็น (ไม่ว่าง)'
    }
  ];

  const insertFormulaExample = useCallback((formula) => {
    setLocalSettings(prev => ({ ...prev, showConditionFormula: formula }));

    onUpdate({
      ...field,
      showCondition: {
        enabled: true,
        formula: formula
      }
    });
  }, [field, onUpdate]);

  // Always show the show/hide section for all fields

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          title="ตัวเลือกเพิ่มเติม"
          className="flex items-center justify-center opacity-70 hover:opacity-100 w-7 h-7 cursor-pointer transition-all duration-300"
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
          <FontAwesomeIcon icon={faEllipsisV} className="w-3 h-3" />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="glass-container min-w-48">
        {/* Move Up/Down Options */}
        {canMoveUp && (
          <DropdownMenuItem onClick={onMoveUp}>
            <FontAwesomeIcon icon={faArrowUp} className="mr-2 w-4 h-4" />
            ย้ายขึ้น
          </DropdownMenuItem>
        )}

        {canMoveDown && (
          <DropdownMenuItem onClick={onMoveDown}>
            <FontAwesomeIcon icon={faArrowDown} className="mr-2 w-4 h-4" />
            ย้ายลง
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={onDuplicate}>
          <FontAwesomeIcon icon={faCopy} className="mr-2 w-4 h-4" />
          ทำสำเนา
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Show/Hide Field with Checkbox */}
        <DropdownMenuItem onClick={(e) => e.preventDefault()}>
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm text-foreground/80 font-medium flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.showConditionEnabled}
                  onChange={handleShowCheckboxChange}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                <span>แสดงฟิลด์นี้</span>
              </label>
              {!localSettings.showConditionEnabled && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConditionalSettings(!showConditionalSettings);
                  }}
                  className="p-1 hover:bg-muted/20 rounded transition-colors"
                  title={showConditionalSettings ? "ย่อการตั้งค่า" : "ขยายการตั้งค่า"}
                >
                  <FontAwesomeIcon
                    icon={showConditionalSettings ? faChevronUp : faChevronDown}
                    className="w-3 h-3 text-muted-foreground"
                  />
                </button>
              )}
            </div>

            {!localSettings.showConditionEnabled && (
              <div className="text-xs text-muted-foreground/70 pl-6">
                ฟิลด์จะแสดงตามเงื่อนไขที่กำหนด
              </div>
            )}
          </div>
        </DropdownMenuItem>

        {/* Conditional Visibility Settings - shown when checkbox is unchecked */}
        {!localSettings.showConditionEnabled && showConditionalSettings && (
          <>
            <DropdownMenuItem onClick={(e) => e.preventDefault()}>
              <div className="w-full">
                {/* Expandable Conditional Settings */}
                <div className="px-2 py-1">
                  <div className="mt-1">
                  <div className="px-2 py-1">
                    <div className="mt-3 space-y-3 p-3 bg-purple-500/5 rounded-lg border border-purple-500/20">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs text-muted-foreground flex items-center gap-1">
                              <FontAwesomeIcon icon={faMagicWandSparkles} className="w-3 h-3" />
                              สูตรเงื่อนไข
                              <FontAwesomeIcon
                                icon={faQuestionCircle}
                                className="w-3 h-3 ml-1 opacity-60"
                                title="สูตรที่กำหนดเงื่อนไขการแสดงฟิลด์ (ใช้รูปแบบ Google AppSheet)"
                              />
                            </label>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowFieldReference(!showFieldReference);
                                }}
                                className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 px-2 py-1 rounded transition-colors"
                                title="แสดงรายการฟิลด์ที่สามารถใช้ได้"
                              >
                                <FontAwesomeIcon icon={faList} className="w-3 h-3" />
                                ฟิลด์
                              </button>
                            </div>
                          </div>

                          <div className="relative">
                            <GlassTextarea
                              value={localSettings.showConditionFormula}
                              onChange={handleFormulaChange}
                              placeholder='เช่น: AND([สถานะ] = "เสร็จสิ้น", [จำนวน] > 0)'
                              className={`text-xs min-h-16 resize-none font-mono ${
                                !formulaValidation.isValid ? 'border-red-500/50 bg-red-500/5' : ''
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            />

                            {/* Formula validation indicator */}
                            <div className="absolute right-2 top-2">
                              {localSettings.showConditionFormula.trim() && (
                                <FontAwesomeIcon
                                  icon={formulaValidation.isValid ? faCheckCircle : faExclamationTriangle}
                                  className={`w-3 h-3 ${
                                    formulaValidation.isValid ? 'text-green-500' : 'text-red-500'
                                  }`}
                                  title={formulaValidation.isValid ? 'สูตรถูกต้อง' : formulaValidation.error}
                                />
                              )}
                            </div>
                          </div>

                          {/* Formula validation error */}
                          {!formulaValidation.isValid && formulaValidation.error && (
                            <div className="text-xs text-red-600 bg-red-500/10 px-2 py-1 rounded flex items-center gap-1">
                              <FontAwesomeIcon icon={faExclamationTriangle} className="w-3 h-3" />
                              {formulaValidation.error}
                            </div>
                          )}
                        </div>

                        {/* Field Reference Helper */}
                        {showFieldReference && availableFields.length > 0 && (
                          <div className="space-y-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">ฟิลด์ที่สามารถใช้ได้</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowFieldReference(false);
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground"
                              >
                                ×
                              </button>
                            </div>

                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {Object.entries(groupedFields).map(([groupName, fields]) => (
                                <div key={groupName}>
                                  <div className="text-xs font-medium text-muted-foreground/70 mb-1">{groupName}</div>
                                  <div className="grid grid-cols-1 gap-1 mb-2">
                                    {fields.map((availableField) => (
                                      <button
                                        key={availableField.id}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          insertFieldReference(availableField.title);
                                        }}
                                        className="text-xs text-left px-2 py-1 rounded hover:bg-primary/10 transition-colors truncate"
                                        title={`แทรก [${availableField.title}] ลงในสูตร`}
                                      >
                                        {availableField.title}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Formula Examples */}
                        <div className="space-y-2 pt-2 border-t border-purple-500/20">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">ตัวอย่างสูตร</span>
                          </div>

                          <div className="space-y-1 max-h-24 overflow-y-auto">
                            {formulaExamples.map((example, index) => (
                              <div key={index} className="text-xs">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    insertFormulaExample(example.formula);
                                  }}
                                  className="w-full text-left p-1.5 rounded hover:bg-purple-500/10 transition-colors border border-purple-500/20"
                                >
                                  <div className="font-mono text-purple-700 dark:text-purple-300 text-[10px] mb-1 truncate">
                                    {example.formula}
                                  </div>
                                  <div className="text-muted-foreground text-[10px]">
                                    {example.description}
                                  </div>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Status indicator */}
                        <div className="text-xs text-muted-foreground p-2 bg-purple-500/5 rounded border border-purple-500/20">
                          <FontAwesomeIcon icon={faQuestionCircle} className="w-3 h-3 mr-1" />
                          ฟิลด์จะแสดงเมื่อเงื่อนไขในสูตรเป็นจริง (TRUE)
                        </div>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onRemove} className="text-destructive">
          <FontAwesomeIcon icon={faTrashAlt} className="mr-2 w-4 h-4" />
          ลบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

FieldOptionsMenu.displayName = 'FieldOptionsMenu';

export default FieldOptionsMenu;