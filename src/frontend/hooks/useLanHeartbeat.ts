// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — LAN Heartbeat & Connection Watchdog Hook
// ═══════════════════════════════════════════════════════════════
// Runs a silent 15-second background ping on LAN Client PCs.
// If connectivity to the Host PC is lost, alerts the user and
// gracefully transitions back to the Login Screen with Reconnect tools.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../state/auth-store';
import { useLanStore } from '../state/lan-store';

export function useLanHeartbeat() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const clearSession = useAuthStore((s) => s.clearSession);
  const setLanStatus = useLanStore((s) => s.setLanStatus);

  const [isLanDisconnected, setIsLanDisconnected] = useState(false);
  const [hostIp, setHostIp] = useState('127.0.0.1');
  const [isChecking, setIsChecking] = useState(false);

  const failCountRef = useRef(0);
  const roleRef = useRef<'HOST' | 'CLIENT'>('HOST');

  const checkHeartbeat = useCallback(async () => {
    if (!window.api || !window.api.invoke) return;

    if (roleRef.current === 'HOST') {
      // On host PC, verify localhost
      try {
        const res = (await window.api.invoke('db:test-host', {
          hostIp: '127.0.0.1',
          hostPort: 3306,
        })) as any;
        if (res && res.success) {
          setLanStatus({
            role: 'HOST',
            isConnected: true,
            pingMs: res.pingMs || 1,
            lastChecked: Date.now(),
          });
        }
      } catch {}
      return;
    }

    // Client PC ping
    setIsChecking(true);
    try {
      const res = (await window.api.invoke('db:test-host', {
        hostIp: hostIp || '127.0.0.1',
        hostPort: 3306,
      })) as any;

      if (res && res.success) {
        failCountRef.current = 0;
        setIsLanDisconnected(false);
        setLanStatus({
          role: 'CLIENT',
          hostIp: hostIp || '127.0.0.1',
          isConnected: true,
          pingMs: res.pingMs || 1,
          lastChecked: Date.now(),
        });
      } else {
        failCountRef.current += 1;
        setLanStatus({
          role: 'CLIENT',
          hostIp: hostIp || '127.0.0.1',
          isConnected: false,
          pingMs: null,
          lastChecked: Date.now(),
        });
        // Require 2 consecutive failed pings (~30 seconds) to avoid temporary Wi-Fi blips
        if (failCountRef.current >= 2) {
          setIsLanDisconnected(true);
        }
      }
    } catch {
      failCountRef.current += 1;
      setLanStatus({
        role: 'CLIENT',
        hostIp: hostIp || '127.0.0.1',
        isConnected: false,
        pingMs: null,
        lastChecked: Date.now(),
      });
      if (failCountRef.current >= 2) {
        setIsLanDisconnected(true);
      }
    } finally {
      setIsChecking(false);
    }
  }, [hostIp, setLanStatus]);

  // Initial config load
  useEffect(() => {
    if (!isAuthenticated) return;

    async function initConfig() {
      try {
        if (window.api && window.api.invoke) {
          const cfgRes = (await window.api.invoke('db:get-config')) as any;
          if (cfgRes && cfgRes.success && cfgRes.data) {
            roleRef.current = cfgRes.data.role || 'HOST';
            const curHostIp = cfgRes.data.hostIp || '127.0.0.1';
            setHostIp(curHostIp);
            setLanStatus({
              role: cfgRes.data.role || 'HOST',
              hostIp: curHostIp,
              hostPort: cfgRes.data.hostPort || 3306,
            });
            // Initial check
            setTimeout(() => {
              checkHeartbeat();
            }, 500);
          }
        }
      } catch {}
    }

    initConfig();
  }, [isAuthenticated, checkHeartbeat, setLanStatus]);

  // Heartbeat interval
  useEffect(() => {
    if (!isAuthenticated) return;

    // Check every 15 seconds
    const interval = setInterval(() => {
      checkHeartbeat();
    }, 15000);

    return () => clearInterval(interval);
  }, [isAuthenticated, checkHeartbeat]);

  const goToLogin = useCallback(() => {
    setIsLanDisconnected(false);
    clearSession();
    navigate('/login');
  }, [clearSession, navigate]);

  const retryConnection = useCallback(async () => {
    await checkHeartbeat();
  }, [checkHeartbeat]);

  return {
    isLanDisconnected,
    hostIp,
    isChecking,
    retryConnection,
    goToLogin,
  };
}
