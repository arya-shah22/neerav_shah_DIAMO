// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Session Bootstrap Hook
// Restores auth session and loads company/FY context on startup
// ═══════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { invokeIpc } from '../../shared/utils/ipc';
import { useAuthStore } from '../state/auth-store';
import { useCompanyStore } from '../state/company-store';
import { loadCompanyContext } from '../services/company-context';

interface BootstrapState {
  isReady: boolean;
  isRestoring: boolean;
}

export function useSessionBootstrap(): BootstrapState {
  const sessionToken = useAuthStore((s) => s.sessionToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  const [isReady, setIsReady] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    if (hasBootstrapped.current) return;

    const bootstrap = async () => {
      if (!isAuthenticated || !sessionToken) {
        setIsReady(true);
        hasBootstrapped.current = true;
        return;
      }

      setIsRestoring(true);

      try {
        const sessionRes = await invokeIpc<{
          id: number;
          userIdHandle: string;
          fullName: string;
          email: string;
          isSuperAdmin: boolean;
        }>('auth:session', { sessionToken });

        if (!sessionRes.success || !sessionRes.data) {
          clearSession();
          useCompanyStore.getState().reset();
          return;
        }

        const user = sessionRes.data;
        setSession(
          {
            id: user.id,
            username: user.userIdHandle,
            fullName: user.fullName,
            role: user.isSuperAdmin ? 'SUPER_ADMIN' : 'OPERATOR',
            isSuperAdmin: user.isSuperAdmin,
          },
          sessionToken,
        );

        const preferredId = useCompanyStore.getState().activeCompany?.id;
        await loadCompanyContext(preferredId);
      } catch {
        clearSession();
        useCompanyStore.getState().reset();
      } finally {
        setIsRestoring(false);
        setIsReady(true);
        hasBootstrapped.current = true;
      }
    };

    bootstrap();
  }, [isAuthenticated, sessionToken, setSession, clearSession]);

  return { isReady, isRestoring };
}
