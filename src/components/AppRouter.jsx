/**
 * App Router - Main routing configuration
 *
 * Routes:
 * - Public: /login, /register, /2fa-setup
 * - Public Forms (v0.9.0): /public/forms/:slug, /public/thank-you/:submissionId, /public/404, /public/expired, /public/limit-reached
 * - Protected: /, /forms, /submissions, /settings, etc.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import LoginPage from './auth/LoginPage';
import RegisterPage from './auth/RegisterPage';
import TwoFactorSetupPage from './auth/TwoFactorSetupPage';
import MainFormApp from './MainFormApp';
import ScrollToTop from './ScrollToTop';
// Public Form Routes (v0.9.0-dev)
import PublicFormView from './PublicFormView';
import PublicThankYouPage from './PublicThankYouPage';
import { NotFoundPage, ExpiredPage, LimitReachedPage, GenericErrorPage } from './PublicErrorPages';

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />
          }
        />
        <Route
          path="/2fa-setup"
          element={<TwoFactorSetupPage />}
        />

        {/* Public Form Routes - v0.9.0-dev */}
        <Route
          path="/public/forms/:slug"
          element={<PublicFormView />}
        />
        <Route
          path="/public/thank-you/:submissionId"
          element={<PublicThankYouPage />}
        />
        <Route
          path="/public/404"
          element={<NotFoundPage />}
        />
        <Route
          path="/public/expired"
          element={<ExpiredPage />}
        />
        <Route
          path="/public/limit-reached"
          element={<LimitReachedPage />}
        />
        <Route
          path="/public/error"
          element={<GenericErrorPage />}
        />

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MainFormApp />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;