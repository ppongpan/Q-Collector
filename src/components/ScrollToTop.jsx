/**
 * ScrollToTop Component
 *
 * Automatically scrolls to top of page when route changes
 * Must be placed inside Router but outside Routes
 *
 * Triggers on:
 * - pathname changes (e.g., /forms -> /submissions)
 * - search params changes (e.g., ?formId=123 -> ?formId=456)
 * - hash changes (e.g., #section1 -> #section2)
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    // Scroll to top when location changes (pathname, search params, or hash)
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' // Use 'instant' for immediate scroll, 'smooth' for animated
    });
  }, [pathname, search, hash]);

  return null; // This component doesn't render anything
}
