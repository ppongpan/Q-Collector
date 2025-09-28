/**
 * Utility function for conditionally joining CSS classes
 * Similar to clsx/classnames but simplified for Q-Collector
 */

export function cn(...classes) {
  return classes
    .filter(Boolean)
    .map(cls => {
      if (typeof cls === 'string') {
        return cls.trim();
      }
      if (typeof cls === 'object' && cls !== null) {
        return Object.entries(cls)
          .filter(([_, condition]) => condition)
          .map(([className, _]) => className.trim())
          .join(' ');
      }
      return '';
    })
    .filter(Boolean)
    .join(' ');
}

export default cn;