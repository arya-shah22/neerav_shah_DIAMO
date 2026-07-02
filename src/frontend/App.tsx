// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Root Application Component
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { ToastProvider } from './components/ui/Toast';

// ─── Placeholder pages (replaced in Stage 1+) ─────────────

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
            {/* Application shell wraps all authenticated routes */}
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Stage 1+ routes will be added here */}
              {/* <Route path="/masters/accounts" element={<AccountListPage />} /> */}
              {/* <Route path="/transactions/sales" element={<SaleListPage />} /> */}
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
