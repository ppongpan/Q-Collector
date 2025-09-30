/**
 * Protected Route Component
 *
 * Wrapper for routes that require authentication
 * - Redirects to login if not authenticated
 * - Checks role-based permissions
 * - Shows loading state while checking auth
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission } from '../../config/roles.config';

/**
 * Protected Route Component
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render
 * @param {string} props.requiredPermission - Permission required to access (optional)
 * @param {Array<string>} props.allowedRoles - Roles allowed to access (optional)
 * @param {string} props.redirectTo - Path to redirect if not authorized (default: /login)
 */
export function ProtectedRoute({
  children,
  requiredPermission = null,
  allowedRoles = null,
  redirectTo = '/login'
}) {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check role-based access if allowedRoles specified
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="glass-container p-8 max-w-md text-center">
            <div className="text-red-500 text-4xl mb-4">🚫</div>
            <h2 className="text-xl font-bold mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
            <p className="text-muted-foreground mb-4">
              คุณไม่มีสิทธิ์เข้าถึงหน้านี้
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              ย้อนกลับ
            </button>
          </div>
        </div>
      );
    }
  }

  // Check permission-based access if requiredPermission specified
  if (requiredPermission) {
    const userRole = user?.role;
    if (!userRole || !hasPermission(userRole, requiredPermission)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="glass-container p-8 max-w-md text-center">
            <div className="text-orange-500 text-4xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold mb-2">ไม่มีสิทธิ์</h2>
            <p className="text-muted-foreground mb-4">
              คุณต้องมีสิทธิ์ <strong>{requiredPermission}</strong> เพื่อเข้าถึงหน้านี้
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              ย้อนกลับ
            </button>
          </div>
        </div>
      );
    }
  }

  // User is authenticated and authorized
  return <>{children}</>;
}

export default ProtectedRoute;