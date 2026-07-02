// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Application Shell Layout
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { StatusFooter } from './StatusFooter';
import { LoadingOverlay } from '../feedback/LoadingOverlay';
import { useSessionBootstrap } from '../../hooks/useSessionBootstrap';
import { useAuthStore } from '../../state/auth-store';

export const AppShell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isReady, isRestoring } = useSessionBootstrap();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isReady || isRestoring) {
    return <LoadingOverlay visible message="Restoring session..." />;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'var(--color-bg)',
    }}>
      <TopHeader
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar collapsed={sidebarCollapsed} />

        <main
          className="content-area"
          style={{
            flex: 1,
            overflow: 'auto',
            background: 'var(--color-bg)',
            padding: 'var(--spacing-lg)',
          }}
        >
          <Outlet />
        </main>
      </div>

      <StatusFooter />
    </div>
  );
};
