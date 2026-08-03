// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Application Shell Layout
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopHeader } from './TopHeader';
import { StatusFooter } from './StatusFooter';
import { LoadingOverlay } from '../feedback/LoadingOverlay';
import { SoftwareUpdateModal } from '../feedback/SoftwareUpdateModal';
import { useSessionBootstrap } from '../../hooks/useSessionBootstrap';
import { useAuthStore } from '../../state/auth-store';
import { useCompanyStore } from '../../state/company-store';
import { useReportScheduler } from '../../hooks/useReportScheduler';
import { useSessionTimeout } from '../../hooks/useSessionTimeout';
import { invokeIpc } from '../../../shared/utils/ipc';

import { useMasterShortcut } from '../../hooks/useMasterShortcut';
import { ShortcutModalProvider } from '../shortcut/ShortcutModalProvider';

export const AppShell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activeCompany = useCompanyStore((s) => s.activeCompany);
  const { isReady, isRestoring } = useSessionBootstrap();

  // Background update check state
  const [showAutoUpdateModal, setShowAutoUpdateModal] = useState(false);
  const [autoUpdateInfo, setAutoUpdateInfo] = useState<any | null>(null);
  const hasCheckedAutoUpdate = useRef(false);

  // Initialize Ctrl + A master shortcuts
  useMasterShortcut();

  // Run the background automated export scheduler catch-up
  useReportScheduler();

  // Run the inactivity logout monitor
  useSessionTimeout();

  // Silent background check for updates on startup/login
  useEffect(() => {
    if (!isAuthenticated || !isReady || hasCheckedAutoUpdate.current) return;

    const companyId = activeCompany?.id || 1;
    hasCheckedAutoUpdate.current = true;

    const runBackgroundCheck = async () => {
      try {
        const res = await invokeIpc<any>('license:check-update', { companyId });
        if (res.success && res.data && res.data.hasInternet && res.data.updateAvailable) {
          setAutoUpdateInfo(res.data);
          setShowAutoUpdateModal(true);
        }
      } catch (err) {
        console.warn('Background update check skipped:', err);
      }
    };

    runBackgroundCheck();
  }, [isAuthenticated, isReady, activeCompany?.id]);

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
            overflowY: 'auto',
            overflowX: 'hidden',
            background: 'var(--color-bg)',
            padding: 'var(--spacing-lg)',
            contain: 'content',
            willChange: 'scroll-position',
          }}
        >
          <Outlet />
        </main>
      </div>

      <StatusFooter />

      {/* Floating Modal shortcut overlay */}
      <ShortcutModalProvider />

      {/* Background Auto-Update Modal */}
      {showAutoUpdateModal && autoUpdateInfo && (
        <SoftwareUpdateModal
          companyId={activeCompany?.id || 1}
          updateData={autoUpdateInfo}
          onClose={() => setShowAutoUpdateModal(false)}
          onUpdateCompleted={() => {
            setShowAutoUpdateModal(false);
          }}
        />
      )}
    </div>
  );
};
