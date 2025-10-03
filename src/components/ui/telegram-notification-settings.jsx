import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faToggleOn,
  faToggleOff,
  faEye,
  faEyeSlash,
  faPlug,
  faCheckCircle,
  faExclamationTriangle,
  faSpinner,
  faComments,
  faArrowRight,
  faArrowLeft,
  faRedo,
  faCheck,
  faTextHeight,
  faParagraph,
  faAt,
  faPhone,
  faSortNumericUp,
  faLink,
  faFile,
  faImage,
  faCalendar,
  faClock,
  faCalendarAlt,
  faListUl,
  faStar,
  faSliders,
  faMapPin,
  faMapMarkerAlt,
  faBuilding,
  faInfoCircle,
  faGripVertical
} from '@fortawesome/free-solid-svg-icons';
// Drag and Drop imports
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
  rectIntersection,
  pointerWithin,
  useDroppable
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createPortal } from 'react-dom';

import { cn } from '../../utils/cn';
import { GlassCard, GlassCardHeader, GlassCardTitle, GlassCardDescription, GlassCardContent } from './glass-card';
import { GlassInput } from './glass-input';
import { GlassButton } from './glass-button';
import { useEnhancedToast } from './enhanced-toast';

// Field type icon mapping
const FIELD_TYPE_ICONS = {
  short_answer: faTextHeight,
  paragraph: faParagraph,
  email: faAt,
  phone: faPhone,
  number: faSortNumericUp,
  url: faLink,
  file_upload: faFile,
  image_upload: faImage,
  date: faCalendar,
  time: faClock,
  datetime: faCalendarAlt,
  multiple_choice: faListUl,
  rating: faStar,
  slider: faSliders,
  lat_long: faMapPin,
  province: faMapMarkerAlt,
  factory: faBuilding
};

// Field type color mapping
const FIELD_TYPE_COLORS = {
  short_answer: "blue",
  paragraph: "indigo",
  email: "green",
  phone: "emerald",
  number: "purple",
  url: "cyan",
  file_upload: "orange",
  image_upload: "pink",
  date: "red",
  time: "yellow",
  datetime: "amber",
  multiple_choice: "teal",
  rating: "rose",
  slider: "violet",
  lat_long: "lime",
  province: "sky",
  factory: "slate"
};

// Animation variants for enhanced motion effects
const dragAnimationVariants = {
  idle: {
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',
    boxShadow: 'rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.06) 0px 1px 2px 0px'
  },
  dragging: {
    scale: 1.05,
    opacity: 0.9,
    filter: 'blur(0.5px)',
    boxShadow: 'rgba(249, 115, 22, 0.25) 0px 25px 50px -12px, rgba(249, 115, 22, 0.1) 0px 0px 0px 1px',
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  dragEnd: {
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',
    boxShadow: 'rgba(0, 0, 0, 0.1) 0px 1px 3px 0px, rgba(0, 0, 0, 0.06) 0px 1px 2px 0px',
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      duration: 0.3
    }
  }
};


const fieldTagVariants = {
  initial: { opacity: 0, y: 10, scale: 0.95 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 25,
      duration: 0.4
    }
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1]
    }
  },
  hover: {
    scale: 1.02,
    y: -1,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  tap: {
    scale: 0.98,
    y: 0,
    transition: {
      duration: 0.1,
      ease: [0.4, 0, 0.2, 1]
    }
  }
};

const staggerContainerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

// Custom collision detection for dual-panel system
const customCollisionDetection = (entries) => {
  const pointerIntersections = pointerWithin(entries);
  const rectIntersections = rectIntersection(entries);

  return pointerIntersections.length > 0 ? pointerIntersections : rectIntersections;
};

// Drop animation configuration
const dropAnimationConfig = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

// Drop indicator animation variants
const dropIndicatorVariants = {
  initial: {
    opacity: 0,
    scale: 0.8,
    height: 0,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  animate: {
    opacity: 1,
    scale: 1,
    height: 3,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
      type: 'spring',
      stiffness: 400,
      damping: 25
    }
  },
  exit: {
    opacity: 0,
    scale: 0.8,
    height: 0,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1]
    }
  }
};

// Panel glow variants for drop zones
const panelGlowVariants = {
  idle: {
    boxShadow: '0 0 0 0px rgba(249, 115, 22, 0)',
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
    borderColor: 'rgba(75, 85, 99, 0.5)'
  },
  dragOver: {
    boxShadow: '0 0 0 2px rgba(249, 115, 22, 0.3), 0 0 20px rgba(249, 115, 22, 0.2)',
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    borderColor: 'rgba(249, 115, 22, 0.6)',
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  validDrop: {
    boxShadow: '0 0 0 2px rgba(34, 197, 94, 0.4), 0 0 20px rgba(34, 197, 94, 0.2)',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: 'rgba(34, 197, 94, 0.6)'
  },
  invalidDrop: {
    boxShadow: '0 0 0 2px rgba(239, 68, 68, 0.4), 0 0 20px rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.6)'
  }
};

/**
 * TelegramNotificationSettings - Comprehensive Telegram notification configuration component
 * Provides dual-panel field ordering system with modern ShadCN UI design
 */
const TelegramNotificationSettings = ({
  form = {},
  onUpdate = () => {},
  availableFields = [],
  className = ''
}) => {
  const toast = useEnhancedToast();

  // Local state management
  const [localSettings, setLocalSettings] = useState({
    enabled: form.telegramSettings?.enabled || false,
    botToken: form.telegramSettings?.botToken || '',
    groupId: form.telegramSettings?.groupId || '',
    messagePrefix: form.telegramSettings?.messagePrefix || 'ข้อมูลใหม่จาก [FormName] [DateTime]',
    selectedFields: form.telegramSettings?.selectedFields || []
  });

  const [uiState, setUiState] = useState({
    showToken: false,
    isTestingConnection: false,
    lastTestResult: null,
    characterCount: 0,
    isDragging: false,
    draggedField: null,
    activeDragId: null
  });

  // Drag and drop state
  const [activeId, setActiveId] = useState(null);
  const [dropIndicatorPosition, setDropIndicatorPosition] = useState(null);
  const [dropIndicatorPanel, setDropIndicatorPanel] = useState(null);
  const shouldReduceMotion = useReducedMotion();
  const dragOverlayRef = useRef(null);

  // Enhanced sensors with better touch support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Calculate character count for message prefix
  useEffect(() => {
    setUiState(prev => ({
      ...prev,
      characterCount: localSettings.messagePrefix.length
    }));
  }, [localSettings.messagePrefix]);

  // Debounced update to parent component
  const debouncedUpdate = useCallback(
    (() => {
      let timeoutId;
      return (newSettings) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          onUpdate({
            ...form,
            telegramSettings: newSettings
          });
        }, 300);
      };
    })(),
    [form, onUpdate]
  );

  // Update parent when local settings change
  useEffect(() => {
    debouncedUpdate(localSettings);
  }, [localSettings, debouncedUpdate]);

  // Memoized field lists for performance
  const { leftPanelFields, rightPanelFields } = useMemo(() => {
    const selectedFieldIds = new Set(localSettings.selectedFields.map(f => f.id));

    const left = availableFields.filter(field =>
      field.sendTelegram && !selectedFieldIds.has(field.id)
    );

    const right = localSettings.selectedFields
      .map(selectedField => availableFields.find(f => f.id === selectedField.id))
      .filter(Boolean);

    return { leftPanelFields: left, rightPanelFields: right };
  }, [availableFields, localSettings.selectedFields]);

  // Handle setting updates
  const updateSetting = useCallback((key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Connection test handler
  const handleTestConnection = useCallback(async () => {
    if (!localSettings.botToken || !localSettings.groupId) {
      toast.warning('กรุณากรอก Bot Token และ Group ID ก่อนทดสอบ', {
        title: 'ข้อมูลไม่ครบถ้วน'
      });
      return;
    }

    setUiState(prev => ({ ...prev, isTestingConnection: true }));

    try {
      // Import TelegramService dynamically
      const TelegramService = (await import('../../services/TelegramService')).default;

      // Test connection with actual API call
      const result = await TelegramService.testTelegramConfiguration(localSettings, form);

      if (result.success) {
        setUiState(prev => ({
          ...prev,
          isTestingConnection: false,
          lastTestResult: 'success'
        }));
        toast.success('เชื่อมต่อ Telegram สำเร็จ และส่งข้อความทดสอบแล้ว', {
          title: 'ทดสอบการเชื่อมต่อ',
          duration: 3000
        });
      } else {
        throw new Error(result.error || 'Connection failed');
      }
    } catch (error) {
      setUiState(prev => ({
        ...prev,
        isTestingConnection: false,
        lastTestResult: 'error'
      }));
      toast.error(error.message || 'ไม่สามารถเชื่อมต่อ Telegram ได้', {
        title: 'การทดสอบล้มเหลว',
        duration: 5000
      });
    }
  }, [localSettings, form, toast]);

  // Enhanced drag and drop handlers
  const handleDragStart = useCallback((event) => {
    const { active } = event;
    const activeData = active.data.current;

    setActiveId(active.id);
    setDropIndicatorPosition(null);
    setDropIndicatorPanel(null);
    setUiState(prev => ({
      ...prev,
      isDragging: true,
      draggedField: activeData?.field,
      activeDragId: active.id
    }));

    // Add haptic feedback for touch devices
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }, []);

  // Handle drag over for drop indicators
  // Field movement handlers (for non-drag interactions) - MUST BE BEFORE handleDragEnd
  const moveFieldToRight = useCallback((field) => {
    setLocalSettings(prev => ({
      ...prev,
      selectedFields: [...prev.selectedFields, { id: field.id, order: prev.selectedFields.length }]
    }));
  }, []);

  const moveFieldToLeft = useCallback((fieldId) => {
    setLocalSettings(prev => ({
      ...prev,
      selectedFields: prev.selectedFields.filter(f => f.id !== fieldId)
    }));
  }, []);

  const handleDragOver = useCallback((event) => {
    const { active, over } = event;

    if (!over || !active.data.current) {
      setDropIndicatorPosition(null);
      setDropIndicatorPanel(null);
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;

    // Determine drop indicator position and panel
    if (overData?.field && overData?.panelType) {
      setDropIndicatorPanel(overData.panelType);

      // Calculate position based on panel type and field position
      if (activeData.panelType !== overData.panelType) {
        // Cross-panel drop - show at end for available->selected, or remove for selected->available
        if (activeData.panelType === 'available' && overData.panelType === 'selected') {
          setDropIndicatorPosition(rightPanelFields.length);
        } else {
          setDropIndicatorPosition(null); // No indicator for removal
        }
      } else if (overData.panelType === 'selected') {
        // Reordering within selected panel
        setDropIndicatorPosition(overData.index);
      }
    } else if (over.id && (over.id.includes('panel') || over.id.includes('droppable'))) {
      // Direct panel drop
      const targetPanel = over.id.includes('selected') ? 'selected' : 'available';
      setDropIndicatorPanel(targetPanel);

      if (targetPanel === 'selected' && activeData.panelType === 'available') {
        setDropIndicatorPosition(rightPanelFields.length);
      } else {
        setDropIndicatorPosition(null);
      }
    } else {
      setDropIndicatorPosition(null);
      setDropIndicatorPanel(null);
    }
  }, [rightPanelFields.length]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;

    setActiveId(null);
    setDropIndicatorPosition(null);
    setDropIndicatorPanel(null);
    setUiState(prev => ({
      ...prev,
      isDragging: false,
      draggedField: null,
      activeDragId: null
    }));

    if (!over || !active.data.current) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    const field = activeData.field;

    // Handle cross-panel drops
    if (activeData.panelType !== overData?.panelType) {
      if (activeData.panelType === 'available' && overData?.panelType === 'selected') {
        // Move from available to selected
        moveFieldToRight(field);
        toast.success(`เพิ่ม "${field.title}" เข้าสู่รายการแจ้งเตือนแล้ว`, {
          duration: 2000
        });
      } else if (activeData.panelType === 'selected' && overData?.panelType === 'available') {
        // Move from selected to available
        moveFieldToLeft(field.id);
        toast.success(`นำ "${field.title}" ออกจากรายการแจ้งเตือนแล้ว`, {
          duration: 2000
        });
      }
    }
    // Handle reordering within selected panel
    else if (activeData.panelType === 'selected' && overData?.panelType === 'selected') {
      const oldIndex = activeData.index;
      const newIndex = overData.index;

      if (oldIndex !== newIndex) {
        setLocalSettings(prev => {
          const newSelectedFields = arrayMove(
            prev.selectedFields,
            oldIndex,
            newIndex
          ).map((field, index) => ({ ...field, order: index }));

          return {
            ...prev,
            selectedFields: newSelectedFields
          };
        });

        toast.success(`เรียงลำดับ "${field.title}" ใหม่แล้ว`, {
          duration: 2000
        });
      }
    }
    // Handle direct panel drops (empty zones)
    else if (!overData?.field && over.id) {
      if (over.id === 'selected-panel' && activeData.panelType === 'available') {
        moveFieldToRight(field);
        toast.success(`เพิ่ม "${field.title}" เข้าสู่รายการแจ้งเตือนแล้ว`, {
          duration: 2000
        });
      } else if (over.id === 'available-panel' && activeData.panelType === 'selected') {
        moveFieldToLeft(field.id);
        toast.success(`นำ "${field.title}" ออกจากรายการแจ้งเตือนแล้ว`, {
          duration: 2000
        });
      }
    }

    // Add success haptic feedback
    if (navigator.vibrate && (active.id !== over.id || activeData.panelType !== overData?.panelType)) {
      navigator.vibrate([50, 50, 50]);
    }
  }, [toast, moveFieldToRight, moveFieldToLeft]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setDropIndicatorPosition(null);
    setDropIndicatorPanel(null);
    setUiState(prev => ({
      ...prev,
      isDragging: false,
      draggedField: null,
      activeDragId: null
    }));
  }, []);

  const moveAllToRight = useCallback(() => {
    const newFields = leftPanelFields.map((field, index) => ({
      id: field.id,
      order: localSettings.selectedFields.length + index
    }));

    setLocalSettings(prev => ({
      ...prev,
      selectedFields: [...prev.selectedFields, ...newFields]
    }));
  }, [leftPanelFields, localSettings.selectedFields.length]);

  const resetAllFields = useCallback(() => {
    setLocalSettings(prev => ({
      ...prev,
      selectedFields: []
    }));
  }, []);

  // Enhanced draggable field tag component
  const DraggableFieldTag = ({ field, isSelected = false, onClick, isDragging = false, panelType, index }) => {
    const shouldReduceMotion = useReducedMotion();
    const color = FIELD_TYPE_COLORS[field.type] || 'gray';
    const icon = FIELD_TYPE_ICONS[field.type] || faInfoCircle;
    const dragId = `${panelType}-${field.id}`;

    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging: isSortableDragging
    } = useSortable({
      id: dragId,
      data: {
        type: 'field-tag',
        field: field,
        panelType: panelType,
        index: index
      }
    });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      zIndex: isSortableDragging ? 1000 : 1,
      opacity: isSortableDragging ? 0.5 : 1,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          'group relative touch-none',
          isSortableDragging && 'z-50 opacity-50'
        )}
        {...attributes}
      >
        <div
          className={cn(
            'flex items-center gap-2 p-2 rounded-lg transition-all duration-200',
            'text-left w-full min-h-[44px] text-[14px] cursor-grab active:cursor-grabbing',
            'transform-gpu will-change-transform',
            'border shadow-sm backdrop-blur-sm',
            isSelected
              ? 'bg-orange-100 dark:bg-gray-800/80 border-orange-500/60 text-orange-900 dark:text-white shadow-orange-500/20'
              : 'bg-muted/50 dark:bg-gray-700/70 border-border dark:border-gray-600/60 hover:border-orange-400/50 hover:shadow-orange-400/20 text-foreground dark:text-gray-200',
            isSortableDragging && 'shadow-2xl shadow-orange-500/50 ring-2 ring-orange-500/30 scale-105',
            'group-hover:shadow-lg group-active:shadow-xl'
          )}
          {...listeners}
          onClick={() => !isSortableDragging && onClick && onClick(field)}
        >
          {/* Drag handle */}
          <div className="flex items-center justify-center w-5 h-5 rounded bg-muted dark:bg-gray-600/50 group-hover:bg-orange-600/50 transition-colors touch-manipulation">
            <FontAwesomeIcon
              icon={faGripVertical}
              className="w-2 h-2 text-gray-400 group-hover:text-orange-300 transition-colors"
            />
          </div>

          {/* Field type icon */}
          <div className={cn(
            'flex items-center justify-center w-6 h-6 rounded text-white text-xs shadow-sm',
            `bg-${color}-500 group-hover:shadow-md transition-shadow`
          )}>
            <FontAwesomeIcon icon={icon} className="w-2.5 h-2.5" />
          </div>

          {/* Field info - single line only */}
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate text-[14px] group-hover:text-orange-300 transition-colors">
              {field.title}
            </div>
          </div>

          {/* Order number for selected fields */}
          {isSelected && panelType === 'selected' && (
            <div className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center font-medium shadow-sm">
              {index + 1}
            </div>
          )}

          {/* Direction arrow */}
          <div className="flex items-center justify-center w-5 h-5">
            <FontAwesomeIcon
              icon={isSelected ? faArrowLeft : faArrowRight}
              className="w-2.5 h-2.5 text-gray-400 group-hover:text-orange-400 transition-colors"
            />
          </div>
        </div>

      </div>
    );
  };

  // Legacy field tag component for non-draggable scenarios
  const FieldTag = ({ field, isSelected = false, onClick }) => {
    const color = FIELD_TYPE_COLORS[field.type] || 'gray';
    const icon = FIELD_TYPE_ICONS[field.type] || faInfoCircle;

    return (
      <motion.button
        type="button"
        onClick={() => onClick(field)}
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg transition-all duration-200',
          'text-left w-full min-h-[44px] text-[14px]',
          'hover:scale-[1.02] active:scale-[0.98]',
          isSelected
            ? 'bg-orange-100 dark:bg-gray-800/80 border border-orange-500/60 text-orange-900 dark:text-white shadow-md shadow-orange-500/20'
            : 'bg-muted/50 dark:bg-gray-700/70 border border-border dark:border-gray-600/60 hover:bg-muted/70 dark:hover:bg-gray-600/70 hover:border-orange-400/50 text-foreground dark:text-gray-200'
        )}
        whileHover={{ y: -1 }}
        whileTap={{ y: 0 }}
      >
        <div className={cn(
          'flex items-center justify-center w-6 h-6 rounded text-white text-xs',
          `bg-${color}-500`
        )}>
          <FontAwesomeIcon icon={icon} className="w-2.5 h-2.5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate text-[14px]">{field.title}</div>
        </div>
        <FontAwesomeIcon
          icon={isSelected ? faArrowLeft : faArrowRight}
          className="w-2.5 h-2.5 text-gray-400"
        />
      </motion.button>
    );
  };

  // Drop Indicator Component
  const DropIndicator = ({ position, panelType, isVisible }) => {
    if (!isVisible || position === null) return null;

    return (
      <AnimatePresence>
        <motion.div
          key={`${panelType}-${position}`}
          className="relative w-full px-2"
          variants={shouldReduceMotion ? {} : dropIndicatorVariants}
          initial={shouldReduceMotion ? {} : "initial"}
          animate={shouldReduceMotion ? {} : "animate"}
          exit={shouldReduceMotion ? {} : "exit"}
          style={{
            position: 'absolute',
            top: position * 52 + 8, // Adjust based on field height + gap
            left: 0,
            right: 0,
            zIndex: 100
          }}
        >
          <motion.div
            className="w-full bg-gradient-to-r from-orange-500 via-orange-400 to-orange-500 rounded-full shadow-lg"
            animate={shouldReduceMotion ? {} : {
              boxShadow: [
                '0 0 0 0px rgba(249, 115, 22, 0.4)',
                '0 0 0 4px rgba(249, 115, 22, 0.2)',
                '0 0 0 0px rgba(249, 115, 22, 0.4)'
              ],
              transition: {
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut'
              }
            }}
            style={{ height: 3 }}
          />
          {/* Insertion point indicators */}
          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1">
            <motion.div
              className="w-2 h-2 bg-orange-500 rounded-full shadow-lg"
              animate={shouldReduceMotion ? {} : {
                scale: [1, 1.3, 1],
                transition: {
                  duration: 0.6,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }
              }}
            />
          </div>
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 translate-x-1">
            <motion.div
              className="w-2 h-2 bg-orange-500 rounded-full shadow-lg"
              animate={shouldReduceMotion ? {} : {
                scale: [1, 1.3, 1],
                transition: {
                  duration: 0.6,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: 0.3
                }
              }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  // Enhanced droppable wrapper component
  const DroppableWrapper = ({ children, id, panelType }) => {
    const { setNodeRef } = useDroppable({
      id,
      data: {
        type: 'panel',
        panelType
      }
    });

    return (
      <div ref={setNodeRef} className="relative">
        {children}
      </div>
    );
  };

  // Enhanced drop zone component
  const DropZone = ({ children, className, panelType, fields }) => {
    const shouldReduceMotion = useReducedMotion();
    const isDragOverThisPanel = dropIndicatorPanel === panelType;

    const getVariant = () => {
      if (isDragOverThisPanel) {
        return uiState.isDragging ? 'dragOver' : 'idle';
      }
      return 'idle';
    };

    return (
      <motion.div
        className={cn(
          'relative min-h-[200px] max-h-[400px] overflow-y-auto p-2 rounded-lg border-2 border-dashed transition-all duration-300',
          'transform-gpu will-change-transform',
          className
        )}
        variants={shouldReduceMotion ? {} : panelGlowVariants}
        animate={shouldReduceMotion ? {} : getVariant()}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 25
        }}
      >
        {/* Drop indicator overlay */}
        <DropIndicator
          position={dropIndicatorPosition}
          panelType={panelType}
          isVisible={isDragOverThisPanel && dropIndicatorPosition !== null}
        />

        <div className="space-y-1 relative">
          {children}
        </div>
      </motion.div>
    );
  };

  // Enhanced empty state component with animations
  const EmptyState = ({ message, icon, panelType, isOver, canDrop }) => {
    const shouldReduceMotion = useReducedMotion();

    return (
      <motion.div
        className="flex flex-col items-center justify-center p-8 text-center"
        variants={shouldReduceMotion ? {} : {
          idle: { opacity: 0.6, scale: 1 },
          dragOver: {
            opacity: 1,
            scale: 1.05,
            transition: { duration: 0.2 }
          }
        }}
        animate={isOver && canDrop ? 'dragOver' : 'idle'}
      >
        <motion.div
          variants={shouldReduceMotion ? {} : {
            idle: { rotate: 0 },
            dragOver: { rotate: 5, transition: { duration: 0.2 } }
          }}
        >
          <FontAwesomeIcon
            icon={icon}
            className={cn(
              'w-12 h-12 mb-4 transition-colors duration-300',
              isOver && canDrop ? 'text-orange-400' : 'text-gray-500'
            )}
          />
        </motion.div>
        <motion.p
          className={cn(
            'text-sm transition-colors duration-300',
            isOver && canDrop ? 'text-orange-400' : 'text-gray-400'
          )}
          variants={shouldReduceMotion ? {} : {
            idle: { y: 0 },
            dragOver: { y: -2, transition: { duration: 0.2 } }
          }}
        >
          {isOver && canDrop ? `วาง${panelType === 'available' ? 'เพื่อนำออก' : 'เพื่อเลือก'}ฟิลด์ที่นี่` : message}
        </motion.p>
      </motion.div>
    );
  };

  // Accessibility live region for screen reader announcements
  useEffect(() => {
    const liveRegion = document.createElement('div');
    liveRegion.id = 'telegram-dnd-announcements';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only absolute -left-10000 w-1 h-1 overflow-hidden';
    document.body.appendChild(liveRegion);

    return () => {
      const existingRegion = document.getElementById('telegram-dnd-announcements');
      if (existingRegion) {
        document.body.removeChild(existingRegion);
      }
    };
  }, []);

  return (
    <GlassCard className={cn('glass-container bg-black/20 border-gray-800/50', className)}>
      <GlassCardHeader>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/20">
            <FontAwesomeIcon icon={faComments} className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <GlassCardTitle className="text-[14px]">การแจ้งเตือน Telegram</GlassCardTitle>
            <GlassCardDescription className="text-[12px]">
              ตั้งค่าการส่งข้อความแจ้งเตือนผ่าน Telegram เมื่อมีการส่งฟอร์ม
            </GlassCardDescription>
          </div>
        </div>
      </GlassCardHeader>

      <GlassCardContent className="space-y-4">
        {/* Enable/Disable Checkbox */}
        <div className="p-3 rounded-lg border border-border bg-muted/20">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.enabled}
              onChange={(e) => {
                const newState = e.target.checked;
                updateSetting('enabled', newState);
                if (newState) {
                  toast.success("เปิดการแจ้งเตือนแล้ว", {
                    title: "Telegram Notifications",
                    description: "ระบบจะส่งแจ้งเตือนไปยัง Telegram เมื่อมีข้อมูลใหม่"
                  });
                } else {
                  toast.warning("ปิดการแจ้งเตือนแล้ว", {
                    title: "Telegram Notifications",
                    description: "ระบบจะไม่ส่งการแจ้งเตือนใด ๆ"
                  });
                }
              }}
              className="w-5 h-5 rounded border-gray-600 text-orange-500 focus:ring-orange-500 focus:ring-2"
            />
            <div className="flex items-center gap-3 flex-1">
              <FontAwesomeIcon
                icon={faComments}
                className={cn(
                  "w-6 h-6 transition-colors",
                  localSettings.enabled ? "text-green-500" : "text-gray-500"
                )}
              />
              <div>
                <div className="font-semibold text-white text-[14px]">
                  เปิดการแจ้งเตือน Telegram
                </div>
                <div className="text-[12px] text-gray-400">
                  {localSettings.enabled ? 'ส่งแจ้งเตือนอัตโนมัติเมื่อมีข้อมูลใหม่' : 'การแจ้งเตือนถูกปิดใช้งาน'}
                </div>
              </div>
            </div>
          </label>
        </div>

        {/* Basic Settings Section */}
        <div className="space-y-3">
          <h3 className="text-[14px] font-semibold text-foreground/90 flex items-center gap-2">
            <FontAwesomeIcon icon={faPlug} className="w-4 h-4 text-orange-600" />
            การตั้งค่าพื้นฐาน
          </h3>

          {/* Connection Settings */}
          <AnimatePresence>
            {localSettings.enabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-4"
              >
                {/* Bot Token */}
                <div className="relative">
                  <GlassInput
                    label="Bot Token"
                    type={uiState.showToken ? 'text' : 'password'}
                    value={localSettings.botToken}
                    onChange={(e) => updateSetting('botToken', e.target.value)}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                    tooltip="Token ที่ได้จาก @BotFather ใน Telegram"
                  />
                  <button
                    type="button"
                    onClick={() => setUiState(prev => ({ ...prev, showToken: !prev.showToken }))}
                    className="absolute right-3 top-9 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <FontAwesomeIcon icon={uiState.showToken ? faEyeSlash : faEye} className="w-4 h-4" />
                  </button>
                </div>

                {/* Group ID */}
                <GlassInput
                  label="Group/Chat ID"
                  value={localSettings.groupId}
                  onChange={(e) => updateSetting('groupId', e.target.value)}
                  placeholder="-123456789"
                  tooltip="ID ของกลุ่มหรือแชทที่จะส่งข้อความ (เริ่มด้วย - สำหรับกลุ่ม)"
                />

                {/* Test Connection Button */}
                <div className="flex items-center gap-3">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={handleTestConnection}
                    disabled={uiState.isTestingConnection || !localSettings.botToken || !localSettings.groupId}
                    className="flex items-center gap-2"
                  >
                    <FontAwesomeIcon
                      icon={uiState.isTestingConnection ? faSpinner : faPlug}
                      className={cn('w-4 h-4', uiState.isTestingConnection && 'animate-spin')}
                    />
                    {uiState.isTestingConnection ? 'กำลังทดสอบ...' : 'ทดสอบการเชื่อมต่อ'}
                  </GlassButton>

                  {/* Test Result Indicator */}
                  {uiState.lastTestResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-2"
                    >
                      <FontAwesomeIcon
                        icon={uiState.lastTestResult === 'success' ? faCheckCircle : faExclamationTriangle}
                        className={cn(
                          'w-4 h-4',
                          uiState.lastTestResult === 'success' ? 'text-green-500' : 'text-red-500'
                        )}
                      />
                      <span className={cn(
                        'text-xs',
                        uiState.lastTestResult === 'success' ? 'text-green-600' : 'text-red-600'
                      )}>
                        {uiState.lastTestResult === 'success' ? 'เชื่อมต่อสำเร็จ' : 'เชื่อมต่อล้มเหลว'}
                      </span>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Message Prefix Section */}
        {localSettings.enabled && (
          <div className="space-y-3">
            <h3 className="text-[14px] font-semibold text-foreground/90 flex items-center gap-2">
              <FontAwesomeIcon icon={faComments} className="w-4 h-4 text-orange-600" />
              ข้อความนำหน้า
            </h3>

            <div className="space-y-1">
              <GlassInput
                label="ข้อความนำหน้าการแจ้งเตือน"
                value={localSettings.messagePrefix}
                onChange={(e) => updateSetting('messagePrefix', e.target.value)}
                placeholder="ข้อมูลใหม่จาก [FormName] [DateTime]"
                tooltip="ใช้ [FormName] และ [DateTime] สำหรับแทนที่ด้วยชื่อฟอร์มและวันเวลาจริง"
              />
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-muted-foreground">
                  ใช้ [FormName] และ [DateTime] สำหรับแทนที่อัตโนมัติ
                </span>
                <span className={cn(
                  'font-medium',
                  uiState.characterCount > 100 ? 'text-orange-500' : 'text-muted-foreground'
                )}>
                  {uiState.characterCount}/200 ตัวอักษร
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Field Ordering System */}
        {localSettings.enabled && availableFields.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-semibold text-foreground/90 flex items-center gap-2">
                <FontAwesomeIcon icon={faListUl} className="w-4 h-4 text-orange-600" />
                การเรียงลำดับฟิลด์ในการแจ้งเตือน
              </h3>
              <div className="flex items-center gap-2">
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={moveAllToRight}
                  disabled={leftPanelFields.length === 0}
                  tooltip="เลือกฟิลด์ทั้งหมด"
                >
                  <FontAwesomeIcon icon={faCheck} className="w-3 h-3" />
                </GlassButton>
                <GlassButton
                  variant="ghost"
                  size="sm"
                  onClick={resetAllFields}
                  disabled={rightPanelFields.length === 0}
                  tooltip="ยกเลิกการเลือกทั้งหมด"
                >
                  <FontAwesomeIcon icon={faRedo} className="w-3 h-3" />
                </GlassButton>
              </div>
            </div>

            {/* Enhanced Drag-and-Drop Dual Panel System */}
            <DndContext
              sensors={sensors}
              collisionDetection={customCollisionDetection}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Panel - Available Fields */}
                <motion.div
                  className="space-y-2"
                  variants={shouldReduceMotion ? {} : staggerContainerVariants}
                  initial={shouldReduceMotion ? {} : "initial"}
                  animate={shouldReduceMotion ? {} : "animate"}
                >
                  <div className="flex items-center gap-2 text-[12px] font-medium text-gray-300">
                    <motion.div
                      className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"
                      animate={shouldReduceMotion ? {} : {
                        scale: uiState.isDragging ? [1, 1.2, 1] : 1,
                        transition: {
                          duration: 0.6,
                          repeat: uiState.isDragging ? Infinity : 0
                        }
                      }}
                    />
                    <span>ฟิลด์ที่เปิดใช้ Telegram ({leftPanelFields.length})</span>
                  </div>

                  <SortableContext
                    items={leftPanelFields.map(field => `available-${field.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableWrapper id="available-panel-droppable" panelType="available">
                      <DropZone
                        panelType="available"
                        fields={leftPanelFields}
                        className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-gray-600/50"
                      >
                        <div
                          data-panel-type="available"
                          className="space-y-1"
                        >
                        <AnimatePresence>
                          {leftPanelFields.length > 0 ? (
                            leftPanelFields.map((field, index) => (
                              <motion.div
                                key={field.id}
                                variants={shouldReduceMotion ? {} : fieldTagVariants}
                                initial={shouldReduceMotion ? {} : "initial"}
                                animate={shouldReduceMotion ? {} : "animate"}
                                exit={shouldReduceMotion ? {} : "exit"}
                                layout={!shouldReduceMotion}
                                transition={shouldReduceMotion ? {} : {
                                  layout: {
                                    type: 'spring',
                                    stiffness: 400,
                                    damping: 25
                                  }
                                }}
                              >
                                <DraggableFieldTag
                                  field={field}
                                  onClick={moveFieldToRight}
                                  panelType="available"
                                  index={index}
                                  isDragging={activeId === `available-${field.id}`}
                                />
                              </motion.div>
                            ))
                          ) : (
                            <EmptyState
                              message="ไม่มีฟิลด์ที่เปิดใช้ Telegram"
                              icon={faInfoCircle}
                              panelType="available"
                              isOver={false}
                              canDrop={false}
                            />
                          )}
                        </AnimatePresence>
                        </div>
                      </DropZone>
                    </DroppableWrapper>
                  </SortableContext>
                </motion.div>

                {/* Right Panel - Selected Fields */}
                <motion.div
                  className="space-y-2"
                  variants={shouldReduceMotion ? {} : staggerContainerVariants}
                  initial={shouldReduceMotion ? {} : "initial"}
                  animate={shouldReduceMotion ? {} : "animate"}
                >
                  <div className="flex items-center gap-2 text-[12px] font-medium text-gray-300">
                    <motion.div
                      className="w-3 h-3 rounded-full bg-orange-500 shadow-sm"
                      animate={shouldReduceMotion ? {} : {
                        scale: uiState.isDragging ? [1, 1.2, 1] : 1,
                        boxShadow: uiState.isDragging
                          ? ['0 0 0 0 rgba(249, 115, 22, 0.4)', '0 0 0 8px rgba(249, 115, 22, 0)', '0 0 0 0 rgba(249, 115, 22, 0)']
                          : '0 0 0 0 rgba(249, 115, 22, 0)',
                        transition: {
                          duration: 0.6,
                          repeat: uiState.isDragging ? Infinity : 0
                        }
                      }}
                    />
                    <span>ฟิลด์ที่จะแจ้งเตือน ({rightPanelFields.length})</span>
                  </div>

                  <SortableContext
                    items={rightPanelFields.map(field => `selected-${field.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <DroppableWrapper id="selected-panel-droppable" panelType="selected">
                      <DropZone
                        panelType="selected"
                        fields={rightPanelFields}
                        className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border-orange-500/30"
                      >
                        <div
                          data-panel-type="selected"
                          className="space-y-1"
                        >
                        <AnimatePresence>
                          {rightPanelFields.length > 0 ? (
                            rightPanelFields.map((field, index) => (
                              <motion.div
                                key={field.id}
                                variants={shouldReduceMotion ? {} : fieldTagVariants}
                                initial={shouldReduceMotion ? {} : "initial"}
                                animate={shouldReduceMotion ? {} : "animate"}
                                exit={shouldReduceMotion ? {} : "exit"}
                                layout={!shouldReduceMotion}
                                transition={shouldReduceMotion ? {} : {
                                  layout: {
                                    type: 'spring',
                                    stiffness: 400,
                                    damping: 25
                                  }
                                }}
                              >
                                <DraggableFieldTag
                                  field={field}
                                  isSelected={true}
                                  onClick={(field) => moveFieldToLeft(field.id)}
                                  panelType="selected"
                                  index={index}
                                  isDragging={activeId === `selected-${field.id}`}
                                />
                              </motion.div>
                            ))
                          ) : (
                            <EmptyState
                              message="ลากฟิลด์จากด้านซ้ายมาวางที่นี่"
                              icon={faArrowLeft}
                              panelType="selected"
                              isOver={false}
                              canDrop={false}
                            />
                          )}
                        </AnimatePresence>
                        </div>
                      </DropZone>
                    </DroppableWrapper>
                  </SortableContext>
                </motion.div>
              </div>

              {/* Drag Overlay */}
              {createPortal(
                <DragOverlay
                  dropAnimation={dropAnimationConfig}
                  style={{
                    transformOrigin: '0 0',
                    zIndex: 9999
                  }}
                >
                  {activeId && uiState.draggedField ? (
                    <motion.div
                      ref={dragOverlayRef}
                      className="transform-gpu cursor-grabbing"
                      initial={shouldReduceMotion ? {} : { scale: 0.95, opacity: 0.8 }}
                      animate={shouldReduceMotion ? {} : {
                        scale: 1.08,
                        opacity: 0.98,
                        rotate: [0, 1, -1, 0],
                        y: -2,
                        transition: {
                          scale: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
                          opacity: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
                          y: { duration: 0.15, ease: [0.4, 0, 0.2, 1] },
                          rotate: {
                            duration: 0.8,
                            repeat: Infinity,
                            ease: 'easeInOut'
                          }
                        }
                      }}
                      style={{
                        filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.15)) drop-shadow(0 0 20px rgba(249, 115, 22, 0.3))'
                      }}
                    >
                      <FieldTag
                        field={uiState.draggedField}
                        isSelected={activeId.startsWith('selected-')}
                      />
                    </motion.div>
                  ) : null}
                </DragOverlay>,
                document.body
              )}
            </DndContext>

            {/* Field ordering help text */}
            <div className="text-[12px] text-muted-foreground p-2 bg-blue-50/50 rounded-lg border border-blue-200/50">
              <FontAwesomeIcon icon={faInfoCircle} className="w-3 h-3 mr-2 text-blue-500" />
              ฟิลด์ที่เลือกจะแสดงในข้อความ Telegram ตามลำดับที่กำหนด คลิกฟิลด์เพื่อย้ายระหว่างช่อง
            </div>
          </div>
        )}

        {/* No available fields message */}
        {localSettings.enabled && availableFields.length === 0 && (
          <div className="text-center p-4 bg-yellow-50/50 rounded-xl border border-yellow-200/50">
            <FontAwesomeIcon icon={faInfoCircle} className="w-8 h-8 text-yellow-500 mb-2" />
            <p className="text-[14px] text-yellow-700 font-medium">ไม่มีฟิลด์ที่เปิดใช้การแจ้งเตือน Telegram</p>
            <p className="text-[12px] text-yellow-600 mt-1">
              กรุณาเปิดใช้การแจ้งเตือน Telegram ในฟิลด์ที่ต้องการก่อน
            </p>
          </div>
        )}
      </GlassCardContent>
    </GlassCard>
  );
};

// Performance optimization: Memoize the component for better rendering performance
const MemoizedTelegramNotificationSettings = React.memo(TelegramNotificationSettings, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.form?.id === nextProps.form?.id &&
    prevProps.availableFields?.length === nextProps.availableFields?.length &&
    JSON.stringify(prevProps.form?.telegramSettings) === JSON.stringify(nextProps.form?.telegramSettings)
  );
});

MemoizedTelegramNotificationSettings.displayName = 'TelegramNotificationSettings';

export default MemoizedTelegramNotificationSettings;

// Performance optimization: Preload drag-and-drop resources
if (typeof window !== 'undefined') {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReducedMotion) {
    // Warm up the GPU for transform operations
    requestIdleCallback(() => {
      const testElement = document.createElement('div');
      testElement.style.cssText = `
        position: absolute;
        top: -1px;
        left: -1px;
        width: 1px;
        height: 1px;
        opacity: 0;
        transform: translate3d(0, 0, 0) scale(1.02);
        will-change: transform;
        pointer-events: none;
      `;
      document.body.appendChild(testElement);

      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(testElement);
      }, 100);
    }, { timeout: 1000 });
  }

  // Note: Haptic feedback detection removed to prevent Chrome intervention warning
  // The vibration API is checked inline during user interactions (drag events)
}
