import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

/**
 * UnifiedFieldRow - Unified layout component for consistent input alignment
 *
 * Solves the problem of input boxes having different horizontal positions
 * when tags/buttons are present or absent on the right side.
 *
 * Key Features:
 * - 3-zone CSS Grid layout: [Icon+Label] [Input] [Tags+Actions]
 * - Input zone maintains consistent position regardless of right-side content
 * - Responsive design: stacks vertically on mobile while preserving input alignment
 * - Fixed widths for side columns ensure perfect horizontal alignment
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.icon - Icon element (FontAwesome, etc.)
 * @param {React.ReactNode} props.label - Field label/title
 * @param {React.ReactNode} props.inputElement - Input/textarea/select element
 * @param {React.ReactNode} props.tags - Status tags (Required, Table, etc.)
 * @param {React.ReactNode} props.actions - Action buttons (Edit, Delete, etc.)
 * @param {string} props.className - Additional CSS classes
 * @param {Function} props.onClick - Click handler for the entire row
 * @param {Object} props.style - Inline styles
 */
const UnifiedFieldRow = ({
  icon,
  label,
  inputElement,
  tags,
  actions,
  className = '',
  onClick,
  style,
  ...props
}) => {
  return (
    <div
      className={`
        unified-field-row
        grid grid-cols-1 lg:grid-cols-[200px_1fr_180px]
        gap-2 lg:gap-3
        w-full
        px-0 py-1.5
        transition-all duration-200
        ${className}
      `}
      onClick={onClick}
      style={style}
      {...props}
    >
      {/* Zone 1: Icon + Label (Fixed width 200px on desktop) */}
      <div className="flex items-center gap-3 min-w-0 justify-start">
        {/* Icon Container */}
        {icon && (
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
            {icon}
          </div>
        )}

        {/* Label Container */}
        {label && (
          <div className="flex-1 min-w-0 text-left">
            {label}
          </div>
        )}
      </div>

      {/* Zone 2: Input Element (flex-1, consistent left alignment) */}
      <div className="unified-input-zone flex-1 min-w-0 lg:min-w-[280px]">
        {inputElement && (
          <div className="w-full">
            {inputElement}
          </div>
        )}
      </div>

      {/* Zone 3: Tags + Actions (Fixed width 180px on desktop, auto on mobile) */}
      <div className="flex items-start justify-end lg:justify-end gap-2 min-w-0 lg:w-[180px]">
        {/* Tags Container */}
        {tags && (
          <div className="flex flex-wrap justify-end gap-1">
            {tags}
          </div>
        )}

        {/* Actions Container */}
        {actions && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {actions}
          </div>
        )}

        {/* Spacer when no tags/actions to maintain grid consistency */}
        {!tags && !actions && (
          <div className="hidden lg:block w-4" />
        )}
      </div>
    </div>
  );
};

/**
 * Specialized wrapper for Field Preview with consistent input styling
 */
export const UnifiedFieldPreview = ({
  fieldType,
  field,
  inputElement,
  statusTags = [],
  actions = [],
  toggleButtons = null,
  onClick,
  className = '',
  ...props
}) => {
  // Create standardized icon with consistent styling
  const standardIcon = fieldType ? (
    <div className={`
      w-8 h-8 rounded-lg
      bg-gradient-to-br from-${fieldType.color}-500/20 to-${fieldType.color}-600/20
      flex items-center justify-center
    `}>
      {/* Support both FontAwesome icons and React components */}
      {React.isValidElement(fieldType.icon) ? (
        fieldType.icon
      ) : typeof fieldType.icon === 'function' ? (
        <fieldType.icon className={`text-${fieldType.color}-600 w-4 h-4`} />
      ) : (
        <FontAwesomeIcon icon={fieldType.icon} className={`text-${fieldType.color}-600 w-4 h-4`} />
      )}
    </div>
  ) : null;


  // Wrap input element with consistent styling
  const standardInput = inputElement ? (
    <div className="unified-input-wrapper w-full">
      {inputElement}
    </div>
  ) : null;

  // Convert status tags to badges with consistent styling
  const standardTags = statusTags.length > 0 ? (
    statusTags.map((tag, index) => (
      <span
        key={tag.key || index}
        className={`
          inline-flex items-center gap-1
          px-2 py-0.5
          text-xs font-medium
          rounded-md
          ${tag.variant === 'destructive' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : ''}
          ${tag.variant === 'secondary' ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' : ''}
          ${tag.variant === 'default' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}
        `}
      >
        {tag.icon && <FontAwesomeIcon icon={tag.icon} className="w-3 h-3" />}
        {tag.text}
      </span>
    ))
  ) : null;

  // Create modified label with toggleButtons
  const labelWithToggles = (
    <div className="flex items-center justify-between w-full gap-2">
      <h3 className="text-[14px] font-semibold text-foreground/90 line-clamp-2 leading-tight text-left flex-1 min-w-0">
        {field.title || fieldType?.label || 'Untitled Field'}
      </h3>
      {toggleButtons && (
        <div className="flex-shrink-0">
          {toggleButtons}
        </div>
      )}
    </div>
  );

  return (
    <UnifiedFieldRow
      icon={standardIcon}
      label={labelWithToggles}
      inputElement={standardInput}
      tags={standardTags}
      actions={actions}
      onClick={onClick}
      className={className}
      {...props}
    />
  );
};

export default UnifiedFieldRow;

/**
 * CSS utilities explanation:
 *
 * 1. **Grid Layout**: `grid-cols-[200px_1fr_180px]`
 *    - Column 1: Fixed 200px for consistent icon+label width
 *    - Column 2: `1fr` (flex-grow) for input, with min-width protection
 *    - Column 3: Fixed 180px for tags+actions
 *
 * 2. **Input Alignment**: `lg:min-w-[280px]`
 *    - Ensures input zone never shrinks below minimum width
 *    - Maintains left alignment regardless of right-side content
 *
 * 3. **Responsive Behavior**: `grid-cols-1 lg:grid-cols-[...]`
 *    - Mobile: Single column stack (maintains input width)
 *    - Desktop: Three-column grid (perfect alignment)
 *
 * 4. **Content Protection**: `min-w-0` on flex containers
 *    - Prevents content overflow from breaking grid layout
 *    - Allows text truncation with ellipsis when needed
 *
 * Example Usage:
 *
 * ```jsx
 * // Basic usage
 * <UnifiedFieldRow
 *   icon={<FaUser className="text-blue-600" />}
 *   label={<span>Username</span>}
 *   inputElement={<input type="text" placeholder="Enter username" />}
 *   tags={[
 *     <Badge variant="destructive">Required</Badge>,
 *     <Badge variant="secondary">Table</Badge>
 *   ]}
 *   actions={[
 *     <Button size="sm">Edit</Button>,
 *     <Button size="sm" variant="destructive">Delete</Button>
 *   ]}
 * />
 *
 * // Using specialized wrapper
 * <UnifiedFieldPreview
 *   fieldType={{ icon: FaUser, color: 'blue', label: 'Username' }}
 *   field={{ title: 'User Name', required: true }}
 *   inputElement={<input type="text" placeholder="Enter username" />}
 *   statusTags={[
 *     { text: 'Required', variant: 'destructive', key: 'required' }
 *   ]}
 * />
 * ```
 */