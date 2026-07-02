// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Root Application Component
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';
import { LoginPage } from './features/auth';
import { useAuthStore } from './state/auth-store';

// ─── Route Guards ─────────────────────────────────────────────
const ProtectedRoutes = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const GuestRoutes = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return !isAuthenticated ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

// ─── Placeholder pages ────────────────────────────────────────
const DashboardPage: React.FC = () => (
  <div style={{ padding: 'var(--spacing-lg)' }}>
    <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
      Welcome to DIAMO ERP
    </h1>
    <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-disabled-text)', marginTop: 'var(--spacing-sm)' }}>
      Enterprise Diamond Industry Management System
    </p>
    <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-lg)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
      <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-primary)' }}>
        🚀 Stage 0 — Project scaffolding complete. Ready for module development.
      </p>
    </div>
  </div>
);

// ─── App Root ────────────────────────────────────────────────

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Guest/Unauthenticated Routes */}
            <Route element={<GuestRoutes />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            {/* Authenticated Application Wrapper */}
            <Route element={<ProtectedRoutes />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
