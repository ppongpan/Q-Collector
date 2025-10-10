import { useState, useEffect } from 'react';

/**
 * Custom hook to delay showing loading indicator
 * Prevents screen flickering for fast-loading content
 *
 * @param {boolean} isLoading - Current loading state
 * @param {number} delay - Delay in milliseconds before showing loading (default: 1000ms)
 * @returns {boolean} - Whether to show loading indicator
 *
 * @example
 * const [loading, setLoading] = useState(true);
 * const showLoading = useDelayedLoading(loading, 1000);
 *
 * if (showLoading) return <div>Loading...</div>;
 */
export function useDelayedLoading(isLoading, delay = 1000) {
  const [showLoading, setShowLoading] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // If loading finished, immediately hide loading indicator
      setShowLoading(false);
      return;
    }

    // Set timeout to show loading after delay
    const timer = setTimeout(() => {
      setShowLoading(true);
    }, delay);

    // Cleanup timeout if loading finishes before delay
    return () => {
      clearTimeout(timer);
    };
  }, [isLoading, delay]);

  return showLoading;
}

export default useDelayedLoading;
