import React from 'react';
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

/**
 * FieldPreviewCard - Modern dark neon-style field preview component
 * Displays field types with consistent layout, spacing, and hover animations
 *
 * @param {Object} props - Component props
 * @param {Object} props.icon - FontAwesome icon object
 * @param {string} props.label - Primary field label
 * @param {string} props.description - Optional field description
 * @param {React.ReactNode} props.previewElement - Interactive preview control
 * @param {Function} props.onEdit - Edit callback function
 * @param {Function} props.onDelete - Delete callback function
 * @param {string} props.fieldType - Field type for styling variants
 * @param {boolean} props.isActive - Whether this field is currently active/selected
 * @param {string} props.className - Additional CSS classes
 */
const FieldPreviewCard = ({
  icon,
  label,
  description,
  previewElement,
  onEdit,
  onDelete,
  fieldType = 'default',
  isActive = false,
  className = ''
}) => {
  const cardVariants = {
    initial: {
      scale: 1,
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      borderColor: 'rgba(64, 64, 64, 0.3)'
    },
    hover: {
      scale: 1.02,
      boxShadow: [
        '0 10px 25px -3px rgba(255, 123, 0, 0.1), 0 4px 6px -2px rgba(255, 123, 0, 0.05)',
        '0 20px 40px -4px rgba(255, 123, 0, 0.15), 0 8px 16px -4px rgba(255, 123, 0, 0.1)'
      ],
      borderColor: 'rgba(255, 123, 0, 0.4)',
      transition: {
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
        boxShadow: {
          duration: 0.6,
          ease: "easeOut"
        }
      }
    },
    focus: {
      scale: 1.01,
      boxShadow: '0 0 0 3px rgba(255, 123, 0, 0.2), 0 20px 40px -4px rgba(255, 123, 0, 0.15)',
      borderColor: 'rgba(255, 123, 0, 0.6)'
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1 }
    }
  };

  const iconVariants = {
    initial: {
      color: 'rgba(156, 163, 175, 0.8)',
      scale: 1
    },
    hover: {
      color: 'rgba(255, 123, 0, 0.9)',
      scale: 1.1,
      transition: { duration: 0.2 }
    }
  };

  const actionVariants = {
    initial: {
      opacity: 0.6,
      scale: 1
    },
    hover: {
      opacity: 1,
      scale: 1.05,
      transition: { duration: 0.2 }
    }
  };

  const getFieldTypeColor = (type) => {
    const colors = {
      text: 'rgba(59, 130, 246, 0.8)',     // blue
      rating: 'rgba(245, 158, 11, 0.8)',   // amber
      slider: 'rgba(16, 185, 129, 0.8)',   // emerald
      upload: 'rgba(139, 92, 246, 0.8)',   // violet
      date: 'rgba(236, 72, 153, 0.8)',     // pink
      choice: 'rgba(34, 197, 94, 0.8)',    // green
      default: 'rgba(156, 163, 175, 0.8)'  // gray
    };
    return colors[type] || colors.default;
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="initial"
      whileHover="hover"
      whileFocus="focus"
      whileTap="tap"
      className={`
        relative group
        bg-[#1a1a1a]
        border border-gray-700/30
        rounded-2xl
        p-6
        cursor-pointer
        backdrop-blur-sm
        transition-all duration-300
        ${isActive ? 'ring-2 ring-orange-500/50 border-orange-500/40' : ''}
        ${className}
      `}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit && onEdit();
        }
      }}
    >
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.02] via-transparent to-black/[0.02] pointer-events-none" />

      {/* Content Grid */}
      <div className="relative z-10 grid grid-cols-[auto_1fr_auto] gap-6 items-center">

        {/* Left: Icon */}
        <motion.div
          variants={iconVariants}
          className="flex-shrink-0"
        >
          <div className="
            w-14 h-14
            rounded-xl
            bg-gradient-to-br from-gray-800/80 to-gray-900/80
            border border-gray-600/30
            flex items-center justify-center
            group-hover:from-orange-500/10 group-hover:to-orange-600/10
            group-hover:border-orange-500/30
            transition-all duration-300
          ">
            <FontAwesomeIcon
              icon={icon}
              className="text-xl transition-colors duration-300"
              style={{ color: getFieldTypeColor(fieldType) }}
            />
          </div>
        </motion.div>

        {/* Center: Label & Description */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h3 className="
              text-lg font-semibold
              text-white
              leading-tight
              truncate
              group-hover:text-orange-100
              transition-colors duration-300
            ">
              {label}
            </h3>

            {/* Mobile-friendly action buttons */}
            <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
              <motion.button
                variants={actionVariants}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit();
                }}
                className="
                  w-8 h-8
                  rounded-lg
                  bg-muted/60 dark:bg-gray-800/60 hover:bg-orange-500/20
                  border border-border dark:border-gray-600/40 hover:border-orange-500/50
                  flex items-center justify-center
                  text-gray-400 hover:text-orange-400
                  transition-all duration-200
                "
                title="แก้ไขฟิลด์"
              >
                <FontAwesomeIcon icon={faEdit} className="text-sm" />
              </motion.button>

              <motion.button
                variants={actionVariants}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete();
                }}
                className="
                  w-8 h-8
                  rounded-lg
                  bg-muted/60 dark:bg-gray-800/60 hover:bg-red-500/20
                  border border-border dark:border-gray-600/40 hover:border-red-500/50
                  flex items-center justify-center
                  text-gray-400 hover:text-red-400
                  transition-all duration-200
                "
                title="ลบฟิลด์"
              >
                <FontAwesomeIcon icon={faTrashAlt} className="text-sm" />
              </motion.button>
            </div>
          </div>

          {description && (
            <p className="
              text-[12px]
              text-gray-400
              leading-relaxed
              group-hover:text-gray-300
              transition-colors duration-300
              line-clamp-2
            ">
              {description}
            </p>
          )}
        </div>

        {/* Right: Preview Element */}
        <div className="flex-shrink-0 min-w-0">
          <div className="
            bg-muted/50 dark:bg-gray-900/50
            border border-border dark:border-gray-700/40
            rounded-xl
            p-4
            group-hover:bg-muted/70 dark:group-hover:bg-gray-900/70
            group-hover:border-border dark:group-hover:border-gray-600/60
            transition-all duration-300
            min-w-[200px] max-w-[280px]
          ">
            {previewElement || (
              <div className="text-center text-gray-500 text-sm py-4">
                No preview available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hover glow effect */}
      <div className="
        absolute inset-0 rounded-2xl
        opacity-0 group-hover:opacity-100
        bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5
        transition-opacity duration-500
        pointer-events-none
      " />
    </motion.div>
  );
};

export default FieldPreviewCard;

// Example usage components for different field types
export const ExampleFieldCards = () => {
  return (
    <div className="space-y-6 p-6 bg-[#0f0f0f] min-h-screen">

      {/* Short Text Field */}
      <FieldPreviewCard
        icon={{ prefix: 'fas', iconName: 'font' }}
        label="ชื่อผู้ใช้"
        description="ช่องกรอกข้อความสั้น ๆ สำหรับชื่อผู้ใช้"
        fieldType="text"
        previewElement={
          <input
            type="text"
            placeholder="กรอกชื่อผู้ใช้..."
            className="
              w-full px-3 py-2
              bg-muted/60 dark:bg-gray-800/60 border border-border dark:border-gray-600/40
              rounded-lg text-sm text-white
              placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-orange-500/50
              transition-all duration-200
            "
            readOnly
          />
        }
        onEdit={() => console.log('Edit text field')}
        onDelete={() => console.log('Delete text field')}
      />

      {/* Star Rating Field */}
      <FieldPreviewCard
        icon={{ prefix: 'fas', iconName: 'star' }}
        label="คะแนนความพึงพอใจ"
        description="ให้คะแนนความพึงพอใจจาก 0-10 ดาว"
        fieldType="rating"
        previewElement={
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <FontAwesomeIcon
                  key={i}
                  icon={{ prefix: 'fas', iconName: 'star' }}
                  className={`text-lg transition-colors duration-200 ${
                    i < 3 ? 'text-yellow-400' : 'text-gray-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-400 ml-3">3/5</span>
          </div>
        }
        onEdit={() => console.log('Edit rating field')}
        onDelete={() => console.log('Delete rating field')}
      />

      {/* Slider Field */}
      <FieldPreviewCard
        icon={{ prefix: 'fas', iconName: 'sliders-h' }}
        label="ระดับความสำคัญ"
        description="เลื่อนเพื่อกำหนดระดับความสำคัญ (0-100)"
        fieldType="slider"
        previewElement={
          <div className="space-y-3">
            <div className="relative">
              <input
                type="range"
                min="0"
                max="100"
                value="65"
                className="
                  w-full h-2
                  bg-gray-700 rounded-lg
                  appearance-none cursor-pointer
                  slider-thumb
                "
                readOnly
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>0</span>
              <span className="text-orange-400 font-medium">65</span>
              <span>100</span>
            </div>
          </div>
        }
        onEdit={() => console.log('Edit slider field')}
        onDelete={() => console.log('Delete slider field')}
      />

      {/* Image Upload Field */}
      <FieldPreviewCard
        icon={{ prefix: 'fas', iconName: 'image' }}
        label="อัปโหลดรูปภาพ"
        description="เลือกไฟล์รูปภาพเพื่ออัปโหลด (PNG, JPG, GIF)"
        fieldType="upload"
        previewElement={
          <div className="
            border-2 border-dashed border-gray-600/50
            rounded-lg p-6
            text-center
            hover:border-gray-500/70
            transition-colors duration-200
          ">
            <FontAwesomeIcon
              icon={{ prefix: 'fas', iconName: 'cloud-upload-alt' }}
              className="text-2xl text-gray-500 mb-2"
            />
            <p className="text-sm text-gray-500">
              คลิกหรือลากไฟล์มาที่นี่
            </p>
            <p className="text-xs text-gray-600 mt-1">
              PNG, JPG, GIF (max 5MB)
            </p>
          </div>
        }
        onEdit={() => console.log('Edit upload field')}
        onDelete={() => console.log('Delete upload field')}
      />
    </div>
  );
};

// Custom CSS for slider styling (add to your global CSS)
export const SliderStyles = `
.slider-thumb::-webkit-slider-thumb {
  appearance: none;
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff7b00 0%, #ff9500 100%);
  border: 2px solid #1a1a1a;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(255, 123, 0, 0.3);
  transition: all 0.2s ease;
}

.slider-thumb::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(255, 123, 0, 0.5);
}

.slider-thumb::-moz-range-thumb {
  height: 20px;
  width: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ff7b00 0%, #ff9500 100%);
  border: 2px solid #1a1a1a;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(255, 123, 0, 0.3);
  transition: all 0.2s ease;
}
`;