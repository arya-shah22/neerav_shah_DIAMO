// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Session Inactivity Timeout Hook
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef } from 'react';
import { useAuthStore } from '../state/auth-store';
import { useCompanyStore } from '../state/company-store';
import { useIpc } from './useIpc';
import { useToast } from '../components/ui';
import { IAuditSecuritySettings } from '../../shared/types/audit-security.types';

export function useSessionTimeout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearSession = useAuthStore((s) => s.clearSession);
  const companyId = useCompanyStore((s) => s.activeCompany?.id);
  const { showToast } = useToast();

  const { invoke: getSettings } = useIpc<IAuditSecuritySettings>('audit:get-settings');

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const settingsRef = useRef<IAuditSecuritySettings | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !companyId) return;

    // Load settings
    getSettings({ companyId }).then((res) => {
      if (res.success && res.data) {
        settingsRef.current = res.data;
        resetTimeout();
      }
    });

    const resetTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const limitMins = settingsRef.current?.sessionTimeoutMinutes || 0;
      if (limitMins <= 0) return; // 0 means disabled

      timeoutRef.current = setTimeout(() => {
        // Log out user
        clearSession();
        useCompanyStore.getState().reset();
        showToast('You have been logged out due to inactivity', 'info');
      }, limitMins * 60 * 1000);
    };

    // Listen to user activity events to reset timeout
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleActivity = () => {
      resetTimeout();
    };

    events.forEach((ev) => {
      window.addEventListener(ev, handleActivity);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((ev) => {
        window.removeEventListener(ev, handleActivity);
      });
    };
  }, [isAuthenticated, companyId, clearSession, getSettings, showToast]);
}
