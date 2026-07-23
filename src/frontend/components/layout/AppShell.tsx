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
import { useReportScheduler } from '../../hooks/useReportScheduler';
import { useSessionTimeout } from '../../hooks/useSessionTimeout';

export const AppShell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { isReady, isRestoring } = useSessionBootstrap();

  // Run the background automated export scheduler catch-up
  useReportScheduler();

  // Run the inactivity logout monitor
  useSessionTimeout();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isReady || isRestoring) {
    return <LoadingOverlay visible message="Restoring session..." />;
  }

  return (
    <div id="app-shell-root" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'var(--color-bg)',
    }}>
      {/* Global Print Layout CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print {
            display: none !important;
          }
          #app-shell-root {
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }
          #app-shell-content-wrapper {
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }
          main.content-area {
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            overflow: visible !important;
            width: 100% !important;
            height: auto !important;
          }
          body, html {
            background: #ffffff !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
        }
      `}} />
      <TopHeader
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div id="app-shell-content-wrapper" style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
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
