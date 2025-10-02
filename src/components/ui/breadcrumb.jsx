/**
 * Breadcrumb Navigation Component
 *
 * Features:
 * - Support glass/minimal themes
 * - Mobile responsive (collapse/truncate on mobile)
 * - Clickable trail
 * - Smooth transitions
 * - Auto-truncate long labels
 *
 * @version 0.6.3
 * @since 2025-10-02
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { ChevronRight, Home } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

// Breadcrumb Container
export const Breadcrumb = ({ children, className }) => {
  const { theme } = useTheme();
  const isMinimalTheme = theme === 'minimal';

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex items-center py-2 px-3 rounded-lg transition-all duration-300',
        isMinimalTheme
          ? 'bg-white/50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800'
          : 'glass-container backdrop-blur-md',
        className
      )}
    >
      {children}
    </nav>
  );
};

// Breadcrumb List
export const BreadcrumbList = ({ children, className }) => {
  return (
    <ol
      className={cn(
        'flex items-center space-x-1 md:space-x-2 text-sm',
        className
      )}
    >
      {children}
    </ol>
  );
};

// Breadcrumb Item
export const BreadcrumbItem = ({ children, className }) => {
  return (
    <li
      className={cn(
        'flex items-center',
        className
      )}
    >
      {children}
    </li>
  );
};

// Breadcrumb Link
export const BreadcrumbLink = ({
  href,
  onClick,
  children,
  isHome,
  className
}) => {
  const { theme } = useTheme();
  const isMinimalTheme = theme === 'minimal';

  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  const content = (
    <>
      {isHome && <Home className="w-4 h-4 mr-1" />}
      <span className="hidden sm:inline">{children}</span>
      <span className="sm:hidden">
        {typeof children === 'string' && children.length > 15
          ? `${children.substring(0, 12)}...`
          : children}
      </span>
    </>
  );

  if (!onClick && !href) {
    return (
      <span
        className={cn(
          'flex items-center px-2 py-1 rounded transition-colors',
          isMinimalTheme
            ? 'text-gray-600 dark:text-gray-400'
            : 'text-muted-foreground',
          className
        )}
      >
        {content}
      </span>
    );
  }

  return (
    <motion.a
      href={href || '#'}
      onClick={handleClick}
      className={cn(
        'flex items-center px-2 py-1 rounded cursor-pointer transition-all duration-200',
        isMinimalTheme
          ? 'text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20'
          : 'text-foreground/80 hover:text-primary hover:bg-primary/10',
        className
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {content}
    </motion.a>
  );
};

// Breadcrumb Page (current page, not clickable)
export const BreadcrumbPage = ({ children, className }) => {
  const { theme } = useTheme();
  const isMinimalTheme = theme === 'minimal';

  // Truncate long page names
  const displayText = typeof children === 'string' && children.length > 20
    ? `${children.substring(0, 17)}...`
    : children;

  return (
    <span
      className={cn(
        'px-2 py-1 font-medium rounded',
        isMinimalTheme
          ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
          : 'text-primary bg-primary/10',
        className
      )}
      aria-current="page"
    >
      <span className="hidden sm:inline">{children}</span>
      <span className="sm:hidden">{displayText}</span>
    </span>
  );
};

// Breadcrumb Separator
export const BreadcrumbSeparator = ({ className }) => {
  const { theme } = useTheme();
  const isMinimalTheme = theme === 'minimal';

  return (
    <ChevronRight
      className={cn(
        'w-4 h-4 mx-1 flex-shrink-0',
        isMinimalTheme
          ? 'text-gray-400 dark:text-gray-600'
          : 'text-muted-foreground/50',
        className
      )}
    />
  );
};

// Breadcrumb Ellipsis (for deep paths)
export const BreadcrumbEllipsis = ({ onClick, className }) => {
  const { theme } = useTheme();
  const isMinimalTheme = theme === 'minimal';

  return (
    <button
      onClick={onClick}
      className={cn(
        'px-2 py-1 rounded transition-colors',
        isMinimalTheme
          ? 'text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
          : 'text-muted-foreground hover:text-primary hover:bg-primary/10',
        className
      )}
      aria-label="Show all breadcrumbs"
    >
      •••
    </button>
  );
};

// Responsive Breadcrumb with auto-collapse
export const ResponsiveBreadcrumb = ({ items, onNavigate, maxItems = 3 }) => {
  const { theme } = useTheme();
  const [showAll, setShowAll] = React.useState(false);

  // Determine which items to show
  const visibleItems = React.useMemo(() => {
    if (showAll || items.length <= maxItems) {
      return items;
    }

    // Always show first and last items
    const first = items[0];
    const last = items[items.length - 1];

    if (items.length === maxItems + 1) {
      // If we're only hiding one item, show all
      return items;
    }

    // Show first, ellipsis, and last few items
    return [
      first,
      { type: 'ellipsis', id: 'ellipsis' },
      ...items.slice(-(maxItems - 1))
    ];
  }, [items, maxItems, showAll]);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {visibleItems.map((item, index) => (
          <React.Fragment key={item.id || index}>
            {index > 0 && item.type !== 'ellipsis' && <BreadcrumbSeparator />}

            <BreadcrumbItem>
              {item.type === 'ellipsis' ? (
                <BreadcrumbEllipsis onClick={() => setShowAll(true)} />
              ) : item.isCurrent ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  onClick={() => onNavigate && onNavigate(item.path, item.params)}
                  isHome={item.isHome}
                >
                  {item.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default ResponsiveBreadcrumb;