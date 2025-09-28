import React from 'react';
import { cn } from '../../utils/cn';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faExclamationTriangle,
  faExclamationCircle,
  faInfoCircle,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

const Alert = React.forwardRef(({ className, variant = "default", children, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(
      // Base styles with glass morphism
      "relative w-full rounded-xl border backdrop-blur-md transition-all duration-300 ease-out",
      "shadow-lg hover:shadow-xl",

      // Glass container effect
      "bg-gradient-to-r from-white/10 to-white/5",
      "dark:from-slate-800/60 dark:to-slate-900/40",
      "border-white/20 dark:border-slate-700/50",

      // Variant styles
      {
        "border-l-4 border-l-blue-500 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100":
          variant === "default",
        "border-l-4 border-l-red-500 bg-red-50/80 dark:bg-red-950/40 text-red-900 dark:text-red-100":
          variant === "destructive",
        "border-l-4 border-l-yellow-500 bg-yellow-50/80 dark:bg-yellow-950/40 text-yellow-900 dark:text-yellow-100":
          variant === "warning",
        "border-l-4 border-l-green-500 bg-green-50/80 dark:bg-green-950/40 text-green-900 dark:text-green-100":
          variant === "success",
      },
      className
    )}
    {...props}
  >
    {children}
  </div>
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef(({ className, children, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn(
      "mb-1 font-semibold leading-none tracking-tight text-sm",
      className
    )}
    {...props}
  >
    {children}
  </h5>
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm leading-relaxed [&_p]:leading-relaxed", className)}
    {...props}
  >
    {children}
  </div>
));
AlertDescription.displayName = "AlertDescription";

// Enhanced Alert with icon and dismiss functionality
const EnhancedAlert = React.forwardRef(({
  variant = "default",
  title,
  children,
  onDismiss,
  className,
  showIcon = true,
  ...props
}, ref) => {
  const getIcon = () => {
    switch (variant) {
      case "success":
        return faCheckCircle;
      case "warning":
        return faExclamationTriangle;
      case "destructive":
        return faExclamationCircle;
      default:
        return faInfoCircle;
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case "success":
        return "text-green-600 dark:text-green-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "destructive":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-blue-600 dark:text-blue-400";
    }
  };

  return (
    <Alert ref={ref} variant={variant} className={className} {...props}>
      <div className="flex items-start gap-3 p-4">
        {showIcon && (
          <div className={cn("flex-shrink-0 mt-0.5", getIconColor())}>
            <FontAwesomeIcon icon={getIcon()} className="w-4 h-4" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {title && (
            <AlertTitle className="mb-2">
              {title}
            </AlertTitle>
          )}
          <AlertDescription>
            {children}
          </AlertDescription>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className={cn(
              "flex-shrink-0 p-1 rounded-md transition-colors duration-200",
              "hover:bg-black/10 dark:hover:bg-white/10",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent",
              variant === "destructive" && "focus:ring-red-500",
              variant === "warning" && "focus:ring-yellow-500",
              variant === "success" && "focus:ring-green-500",
              variant === "default" && "focus:ring-blue-500"
            )}
            aria-label="ปิดการแจ้งเตือน"
          >
            <FontAwesomeIcon
              icon={faTimes}
              className="w-3 h-3 opacity-60 hover:opacity-100 transition-opacity"
            />
          </button>
        )}
      </div>
    </Alert>
  );
});
EnhancedAlert.displayName = "EnhancedAlert";

// Validation Error Alert Component
const ValidationErrorAlert = ({ errors, fieldList, onDismiss, className }) => {
  if (!errors || Object.keys(errors).length === 0) return null;

  const errorEntries = Object.entries(errors);
  const errorCount = errorEntries.length;

  // Helper function to get field title from field ID
  const getFieldTitle = (fieldId) => {
    if (fieldList) {
      const field = fieldList.find(f => f.id === fieldId);
      return field ? field.title : fieldId;
    }
    return fieldId;
  };

  return (
    <EnhancedAlert
      variant="destructive"
      title={`พบข้อผิดพลาด ${errorCount} จุด`}
      onDismiss={onDismiss}
      className={cn("mb-4", className)}
    >
      <div className="space-y-2">
        <div className="text-sm text-red-800 dark:text-red-200 mb-2">
          กรุณาแก้ไขข้อมูลในฟิลด์ต่อไปนี้:
        </div>

        <div className="space-y-1">
          {errorEntries.slice(0, 5).map(([fieldId, error]) => (
            <div key={fieldId} className="flex items-start gap-2 text-sm">
              <span className="text-red-600 dark:text-red-400 font-semibold min-w-0 flex-shrink-0">•</span>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-red-900 dark:text-red-100">
                  {getFieldTitle(fieldId)}:
                </span>{' '}
                <span className="text-red-700 dark:text-red-300">
                  {error}
                </span>
              </div>
            </div>
          ))}
          {errorCount > 5 && (
            <div className="text-sm opacity-75 mt-2 pl-4">
              และอีก {errorCount - 5} ข้อผิดพลาด...
            </div>
          )}
        </div>

        <div className="mt-3 pt-2 border-t border-red-200 dark:border-red-800">
          <div className="text-xs text-red-600 dark:text-red-400">
            💡 คลิกปิดการแจ้งเตือนนี้เพื่อลองส่งข้อมูลใหม่
          </div>
        </div>
      </div>
    </EnhancedAlert>
  );
};

// Field Error Alert Component
const FieldErrorAlert = ({ error, className }) => {
  if (!error) return null;

  return (
    <div className={cn(
      "mt-2 p-2 rounded-lg border-l-4 border-l-red-500",
      "bg-red-50/80 dark:bg-red-950/40",
      "backdrop-blur-sm",
      "text-red-700 dark:text-red-300",
      "text-sm",
      className
    )}>
      <div className="flex items-center gap-2">
        <FontAwesomeIcon
          icon={faExclamationCircle}
          className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0"
        />
        <span>{error}</span>
      </div>
    </div>
  );
};

export {
  Alert,
  AlertTitle,
  AlertDescription,
  EnhancedAlert,
  ValidationErrorAlert,
  FieldErrorAlert
};