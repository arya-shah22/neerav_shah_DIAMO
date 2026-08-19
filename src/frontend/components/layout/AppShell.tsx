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
import { useLanHeartbeat } from '../../hooks/useLanHeartbeat';
import { ShortcutModalProvider } from '../shortcut/ShortcutModalProvider';
import { WifiOff, RefreshCw, LogOut } from 'lucide-react';

export const AppShell: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activeCompany = useCompanyStore((s) => s.activeCompany);
  const { isReady, isRestoring } = useSessionBootstrap();
  const { isLanDisconnected, hostIp, isChecking, retryConnection, goToLogin } = useLanHeartbeat();

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

      {/* LAN Connection Lost Warning Modal */}
      {isLanDisconnected && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 20,
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 20,
              maxWidth: 480,
              width: '100%',
              padding: 32,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 20,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: '#FEE2E2',
                color: '#EF4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <WifiOff size={32} />
            </div>

            <div>
              <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#0F172A' }}>
                LAN Connection Lost
              </h2>
              <p style={{ margin: 0, fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>
                Unable to communicate with the Host PC at <strong style={{ color: '#0F172A' }}>{hostIp}</strong>.
                Please verify that your office Ethernet cable or Wi-Fi is connected and the Host PC is running.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button
                type="button"
                onClick={retryConnection}
                disabled={isChecking}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
                <span>{isChecking ? 'Checking...' : 'Retry Now'}</span>
              </button>

              <button
                type="button"
                onClick={goToLogin}
                style={{
                  flex: 1,
                  padding: '12px',
                  backgroundColor: '#EF4444',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)',
                }}
              >
                <LogOut size={14} />
                <span>Go to Login</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
