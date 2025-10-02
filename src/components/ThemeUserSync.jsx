/**
 * ThemeUserSync - Syncs user authentication state with theme preferences
 *
 * This component watches for auth state changes and updates theme context
 * to load/save per-user theme preferences. Must be placed inside AuthProvider.
 *
 * @version 0.6.7
 * @since 2025-10-02
 */

import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

/**
 * ThemeUserSync Component
 * Synchronizes user ID from AuthContext to ThemeContext for per-user preferences
 *
 * @component
 * @returns {null} This component only handles side effects, renders nothing
 */
function ThemeUserSync() {
  const { user } = useAuth();
  const { setUserId } = useTheme();

  useEffect(() => {
    // Update theme context with current user ID
    // When user logs in: userId = user.id
    // When user logs out: userId = null (reverts to global/default)
    const userId = user?.id || null;
    setUserId(userId);
  }, [user?.id, setUserId]);

  // This component only handles side effects, no UI
  return null;
}

export default ThemeUserSync;
