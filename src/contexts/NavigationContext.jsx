/**
 * NavigationContext - Manages filtered/sorted submission state for detail view navigation
 *
 * This context allows FormSubmissionList to share its filter/sort state with MainFormApp,
 * ensuring that navigation arrows in SubmissionDetail respect the active filters.
 *
 * v0.7.45 - Filter/Sort-Aware Navigation
 *
 * @module NavigationContext
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

/**
 * Navigation Context
 *
 * Provides filter/sort state and filtered submissions array for cross-component navigation
 */
const NavigationContext = createContext({
  // Filter/Sort state for navigation
  navigationFilters: {
    formId: null,
    month: null,
    year: null,
    sortBy: null,
    sortOrder: null,
    selectedDateField: null,
    searchTerm: ''
  },
  // Methods
  setNavigationFilters: () => {},
  // Filtered submissions for navigation (current page only)
  filteredSubmissions: [],
  setFilteredSubmissions: () => {},
  // Total count from backend (for "X of Y" display)
  totalFilteredCount: 0,
  setTotalFilteredCount: () => {},
  // Clear context (when leaving form)
  clearNavigationContext: () => {}
});

/**
 * NavigationProvider Component
 *
 * Wraps the application to provide navigation state to all components
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export function NavigationProvider({ children }) {
  // Filter/Sort state
  const [navigationFilters, setNavigationFiltersState] = useState({
    formId: null,
    month: null,
    year: null,
    sortBy: null,
    sortOrder: null,
    selectedDateField: null,
    searchTerm: ''
  });

  // Filtered submissions array (from FormSubmissionList current page)
  const [filteredSubmissions, setFilteredSubmissionsState] = useState([]);

  // Total count of filtered items (across all pages)
  const [totalFilteredCount, setTotalFilteredCount] = useState(0);

  /**
   * Update navigation filters
   * Only updates if formId matches or is being set for first time
   */
  const setNavigationFilters = useCallback((filters) => {
    console.log('🔄 [NavigationContext] Setting navigation filters:', filters);
    setNavigationFiltersState(prev => {
      // If formId changed, this is a new form - reset everything
      if (prev.formId && filters.formId !== prev.formId) {
        console.log('📝 [NavigationContext] Form changed, resetting context');
        setFilteredSubmissionsState([]);
        setTotalFilteredCount(0);
      }
      return filters;
    });
  }, []);

  /**
   * Update filtered submissions
   * These are the submissions visible in the current list view
   */
  const setFilteredSubmissions = useCallback((submissions) => {
    console.log('📋 [NavigationContext] Setting filtered submissions:', {
      count: submissions?.length || 0,
      formId: navigationFilters.formId
    });
    setFilteredSubmissionsState(submissions || []);
  }, [navigationFilters.formId]);

  /**
   * Clear navigation context
   * Call this when navigating away from form or logging out
   */
  const clearNavigationContext = useCallback(() => {
    console.log('🧹 [NavigationContext] Clearing navigation context');
    setNavigationFiltersState({
      formId: null,
      month: null,
      year: null,
      sortBy: null,
      sortOrder: null,
      selectedDateField: null,
      searchTerm: ''
    });
    setFilteredSubmissionsState([]);
    setTotalFilteredCount(0);
  }, []);

  const value = {
    navigationFilters,
    setNavigationFilters,
    filteredSubmissions,
    setFilteredSubmissions,
    totalFilteredCount,
    setTotalFilteredCount,
    clearNavigationContext
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

/**
 * useNavigation Hook
 *
 * Access navigation context in any component
 *
 * @returns {Object} Navigation context value
 *
 * @example
 * const { navigationFilters, setNavigationFilters } = useNavigation();
 */
export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export default NavigationContext;
