// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — LoginPage UI Component (with Live LAN/Host Status)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Server,
  Network,
  RefreshCw,
  Settings,
  CheckCircle2,
  Wifi,
  WifiOff,
  ArrowRight,
  X,
} from 'lucide-react';
import { loginSchema, LoginFormData } from './login.schema';
import { useToast } from '../../components/ui';
import { useAuthStore } from '../../state/auth-store';
import { useIpc } from '../../hooks/useIpc';
import { loadCompanyContext } from '../../services/company-context';
import { InitialSetupWizard } from '../../components/InitialSetupWizard';
// @ts-ignore
import logoUrl from '../../../../Logo_Full.png';

// ─── Design System Styling Constants ───────────────────────────
const G = {
  navy: '#0f172a', // Main Background Container color
  surface: '#ffffff', // Login Card container color
  border: '#e2e8f0', // Input border color
  text: '#1e293b', // Main text color
  textSub: '#64748b', // Subtitle text color
  textMid: '#475569', // Input label text color
  gold: '#b89030', // Submit button background color
  navyText: '#94a3b8', // Footer text color
};

const font = "'Inter', sans-serif";

const inp = {
  width: '100%',
  padding: '11px 14px',
  border: `1px solid ${G.border}`,
  borderRadius: 10,
  fontSize: 14,
  fontFamily: font,
  color: G.text,
  background: G.surface,
  outline: 'none',
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

interface IDbConfig {
  role: 'HOST' | 'CLIENT';
  hostIp: string;
  hostPort: number;
  isConfigured: boolean;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const setSession = useAuthStore((s) => s.setSession);
  const [showPassword, setShowPassword] = useState(false);

  // Network & Host Status State
  const [dbConfig, setDbConfig] = useState<IDbConfig>({
    role: 'HOST',
    hostIp: '127.0.0.1',
    hostPort: 3306,
    isConfigured: true,
  });
  const [connectionStatus, setConnectionStatus] = useState<'CHECKING' | 'CONNECTED' | 'DISCONNECTED'>('CHECKING');
  const [testingConnection, setTestingConnection] = useState(false);

  // Modals
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);

  // Quick Reconnect state
  const [manualHostIp, setManualHostIp] = useState('');
  const [discoveredHosts, setDiscoveredHosts] = useState<Array<{ hostname: string; ip: string; port: number }>>([]);
  const [scanningLan, setScanningLan] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  const { invoke: loginIpc, loading } = useIpc<any>('auth:login');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      userIdHandle: '',
      password: '',
      rememberMe: false,
    },
  });

  // Check connection to Database / Host
  const checkConnection = useCallback(async (cfg?: IDbConfig) => {
    setTestingConnection(true);
    try {
      if (window.api && window.api.invoke) {
        const configRes = (await window.api.invoke('db:get-config')) as any;
        const activeConfig: IDbConfig = cfg || configRes?.data || {
          role: 'HOST',
          hostIp: '127.0.0.1',
          hostPort: 3306,
          isConfigured: true,
        };
        setDbConfig(activeConfig);
        setManualHostIp(activeConfig.hostIp && activeConfig.hostIp !== '127.0.0.1' ? activeConfig.hostIp : '');

        if (activeConfig.role === 'HOST') {
          // On Host PC, test localhost MySQL
          const testRes = (await window.api.invoke('db:test-host', { hostIp: '127.0.0.1', hostPort: 3306 })) as any;
          if (testRes && testRes.success) {
            setConnectionStatus('CONNECTED');
          } else {
            setConnectionStatus('DISCONNECTED');
          }
        } else {
          // On Client PC, test Host reachability
          const targetIp = activeConfig.hostIp || '127.0.0.1';
          const testRes = (await window.api.invoke('db:test-host', { hostIp: targetIp, hostPort: activeConfig.hostPort || 3306 })) as any;
          if (testRes && testRes.success) {
            setConnectionStatus('CONNECTED');
          } else {
            setConnectionStatus('DISCONNECTED');
          }
        }
      } else {
        setConnectionStatus('CONNECTED');
      }
    } catch {
      setConnectionStatus('DISCONNECTED');
    } finally {
      setTestingConnection(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Quick LAN Discovery
  const handleScanLan = async () => {
    setScanningLan(true);
    setScanMessage(null);
    setDiscoveredHosts([]);
    try {
      if (window.api && window.api.invoke) {
        const res = (await window.api.invoke('db:discover-host')) as any;
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          setDiscoveredHosts(res.data);
          setManualHostIp(res.data[0].ip);
          setScanMessage(`Discovered ${res.data.length} Host PC(s) on your office network.`);
        } else {
          setScanMessage('No Host PC detected via broadcast. Enter Host IP manually below.');
        }
      }
    } catch {
      setScanMessage('LAN scan timed out. Please enter Host IP manually.');
    } finally {
      setScanningLan(false);
    }
  };

  // Save new Host IP and Relaunch
  const handleApplyHostIp = async (targetIp: string) => {
    const cleanIp = targetIp.trim();
    if (!cleanIp) {
      showToast('Please enter a valid Host IP address', 'error');
      return;
    }

    setSavingConfig(true);
    try {
      if (window.api && window.api.invoke) {
        // Test connectivity first
        const testRes = (await window.api.invoke('db:test-host', { hostIp: cleanIp, hostPort: 3306 })) as any;
        if (!testRes?.success) {
          showToast(`Warning: Cannot reach ${cleanIp}. Saving configuration...`, 'error');
        }

        const newConfig = {
          ...dbConfig,
          role: 'CLIENT' as const,
          hostIp: cleanIp,
          isConfigured: true,
        };

        await window.api.invoke('db:save-config', newConfig);
        showToast('Host configuration updated. Reconnecting...', 'success');
        setShowReconnectModal(false);

        // Relaunch app to connect with new host
        setTimeout(async () => {
          await window.api.invoke('app:relaunch');
        }, 600);
      }
    } catch (err: any) {
      showToast('Failed to apply new host IP: ' + (err.message || ''), 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const onSubmit = async (data: LoginFormData) => {
    const response = await loginIpc({
      userIdHandle: data.userIdHandle,
      password: data.password,
    });

    if (response && response.success && response.data) {
      const { sessionToken, ...userData } = response.data;
      setSession(
        {
          id: userData.id,
          username: userData.userIdHandle,
          fullName: userData.fullName,
          role: userData.isSuperAdmin ? 'SUPER_ADMIN' : 'OPERATOR',
          isSuperAdmin: userData.isSuperAdmin,
        },
        sessionToken,
      );
      await loadCompanyContext();
      showToast('Logged in successfully', 'success');
      const landingPage = localStorage.getItem('diamo_landing_page') || '/dashboard';
      navigate(landingPage);
    } else {
      showToast(response?.error || 'Invalid credentials or login failed', 'error');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: G.navy,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      {/* Full Setup Wizard (On-Demand Mode) */}
      <InitialSetupWizard
        isOpen={showSetupWizard}
        onComplete={() => {
          setShowSetupWizard(false);
          checkConnection();
        }}
        canClose={true}
      />

      {/* Quick LAN Reconnect Modal */}
      {showReconnectModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              position: 'relative',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              fontFamily: font,
            }}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowReconnectModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                border: 'none',
                background: '#F1F5F9',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748B',
              }}
              title="Close"
            >
              <X size={16} />
            </button>

            {/* Modal Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  background: '#EEF2FF',
                  padding: '10px',
                  borderRadius: '12px',
                  color: '#4F46E5',
                  display: 'flex',
                }}
              >
                <Network size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: G.text }}>
                  LAN Host Connection
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: G.textSub }}>
                  Reconnect or update the office Host PC IP address
                </p>
              </div>
            </div>

            {/* Auto-Scan Button */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                  Option 1: Auto-Detect Host on Office Network
                </span>
                <button
                  type="button"
                  onClick={handleScanLan}
                  disabled={scanningLan}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#EEF2FF',
                    color: '#4338CA',
                    border: '1px solid #C7D2FE',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    opacity: scanningLan ? 0.6 : 1,
                  }}
                >
                  <RefreshCw size={13} className={scanningLan ? 'animate-spin' : ''} />
                  <span>{scanningLan ? 'Scanning...' : '1-Click Auto-Scan'}</span>
                </button>
              </div>

              {scanMessage && (
                <p style={{ margin: 0, fontSize: 12, color: '#4338CA', fontWeight: 500 }}>
                  {scanMessage}
                </p>
              )}

              {/* Discovered Hosts List */}
              {discoveredHosts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  {discoveredHosts.map((h) => (
                    <div
                      key={`${h.ip}:${h.port}`}
                      onClick={() => setManualHostIp(h.ip)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: manualHostIp === h.ip ? '2px solid #4F46E5' : '1px solid #CBD5E1',
                        backgroundColor: manualHostIp === h.ip ? '#EEF2FF' : '#FFFFFF',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontWeight: manualHostIp === h.ip ? 600 : 400,
                      }}
                    >
                      <span>🖥️ {h.hostname} ({h.ip})</span>
                      {manualHostIp === h.ip && <CheckCircle2 size={16} color="#4F46E5" />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Manual Host IP Entry */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: G.textMid }}>
                Option 2: Enter Host IP Address Manually
              </label>
              <input
                type="text"
                value={manualHostIp}
                onChange={(e) => setManualHostIp(e.target.value)}
                placeholder="e.g. 192.168.1.100"
                style={{
                  ...inp,
                  padding: '10px 12px',
                  fontSize: 13,
                }}
              />
              <span style={{ fontSize: 11, color: G.textSub }}>
                Current configured Host IP: <code style={{ fontWeight: 600 }}>{dbConfig.hostIp || '127.0.0.1'}</code>
              </span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  setShowReconnectModal(false);
                  setShowSetupWizard(true);
                }}
                style={{
                  flex: 1,
                  padding: '11px',
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                }}
              >
                Full Setup Wizard
              </button>

              <button
                type="button"
                onClick={() => handleApplyHostIp(manualHostIp)}
                disabled={savingConfig || !manualHostIp.trim()}
                style={{
                  flex: 2,
                  padding: '11px',
                  background: '#2563EB',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#FFFFFF',
                  cursor: savingConfig ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  opacity: savingConfig || !manualHostIp.trim() ? 0.6 : 1,
                }}
              >
                <span>{savingConfig ? 'Connecting...' : 'Save & Reconnect'}</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Login Container */}
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Brand Header Logo */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <img
            src={logoUrl}
            alt="DIAMO Logo"
            style={{
              width: 300,
              height: 120,
              objectFit: 'contain',
              filter: 'drop-shadow(0px 10px 25px rgba(0, 0, 0, 0.4))',
            }}
          />
        </div>

        {/* Live Network & Host Status Bar */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.85)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 14,
            padding: '10px 14px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* Left: Indicator & Role Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background:
                  dbConfig.role === 'HOST'
                    ? 'rgba(184, 144, 48, 0.18)'
                    : connectionStatus === 'CONNECTED'
                    ? 'rgba(34, 197, 94, 0.18)'
                    : 'rgba(239, 68, 68, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color:
                  dbConfig.role === 'HOST'
                    ? '#eab308'
                    : connectionStatus === 'CONNECTED'
                    ? '#22c55e'
                    : '#ef4444',
                flexShrink: 0,
              }}
            >
              {dbConfig.role === 'HOST' ? (
                <Server size={17} />
              ) : connectionStatus === 'CONNECTED' ? (
                <Wifi size={17} />
              ) : (
                <WifiOff size={17} />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#F8FAFC',
                    fontFamily: font,
                    letterSpacing: '0.02em',
                  }}
                >
                  {dbConfig.role === 'HOST' ? '👑 Master Host PC' : '💻 LAN Client PC'}
                </span>
                <span
                  style={{
                    display: 'inline-block',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background:
                      connectionStatus === 'CHECKING'
                        ? '#eab308'
                        : connectionStatus === 'CONNECTED'
                        ? '#22c55e'
                        : '#ef4444',
                    boxShadow:
                      connectionStatus === 'CONNECTED'
                        ? '0 0 6px #22c55e'
                        : connectionStatus === 'DISCONNECTED'
                        ? '0 0 6px #ef4444'
                        : 'none',
                  }}
                />
              </div>

              <span
                style={{
                  fontSize: 11,
                  color: connectionStatus === 'CONNECTED' ? '#94A3B8' : '#FCA5A5',
                  fontFamily: font,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {testingConnection
                  ? 'Checking connectivity...'
                  : dbConfig.role === 'HOST'
                  ? '🟢 Local Database Online'
                  : connectionStatus === 'CONNECTED'
                  ? `🟢 Online (${dbConfig.hostIp || '127.0.0.1'})`
                  : `🔴 Disconnected (${dbConfig.hostIp || 'No IP'})`}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {dbConfig.role === 'CLIENT' && (
              <button
                type="button"
                onClick={() => setShowReconnectModal(true)}
                style={{
                  border: connectionStatus === 'DISCONNECTED' ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.15)',
                  background:
                    connectionStatus === 'DISCONNECTED'
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  padding: '5px 10px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontFamily: font,
                  transition: 'all 0.2s',
                  boxShadow:
                    connectionStatus === 'DISCONNECTED' ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none',
                }}
                title="Reconnect to Host PC"
              >
                <RefreshCw size={12} className={testingConnection ? 'animate-spin' : ''} />
                <span>{connectionStatus === 'DISCONNECTED' ? '⚡ Reconnect' : 'Change Host'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowSetupWizard(true)}
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255, 255, 255, 0.06)',
                color: '#CBD5E1',
                padding: '5px 9px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: font,
              }}
              title="Open Setup & Network Configuration"
            >
              <Settings size={12} />
              <span>Setup</span>
            </button>
          </div>
        </div>

        {/* Login Card */}
        <div
          className="animate-scale-in"
          style={{
            background: G.surface,
            borderRadius: 20,
            padding: 34,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          }}
        >
          {/* Welcome Text */}
          <h2
            style={{
              margin: '0 0 4px',
              fontSize: 18,
              fontWeight: 600,
              color: G.text,
              fontFamily: font,
            }}
          >
            Welcome back
          </h2>
          <p
            style={{
              margin: '0 0 22px',
              fontSize: 13,
              color: G.textSub,
              fontFamily: font,
            }}
          >
            Sign in to your DIAMO ERP account
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Username Field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  color: G.textMid,
                  marginBottom: 6,
                  fontFamily: font,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                USER ID / HANDLE
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: G.textSub,
                  }}
                />
                <input
                  type="text"
                  placeholder="admin"
                  autoFocus
                  disabled={loading}
                  style={{
                    ...inp,
                    paddingLeft: 38,
                    borderColor: errors.userIdHandle ? '#ef4444' : G.border,
                  }}
                  {...register('userIdHandle')}
                />
              </div>
              {errors.userIdHandle && (
                <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: 'block', fontFamily: font }}>
                  {errors.userIdHandle.message}
                </span>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 11,
                  fontWeight: 600,
                  color: G.textMid,
                  marginBottom: 6,
                  fontFamily: font,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                PASSWORD
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: G.textSub,
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  disabled={loading}
                  style={{
                    ...inp,
                    paddingLeft: 38,
                    paddingRight: 38,
                    borderColor: errors.password ? '#ef4444' : G.border,
                  }}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: G.textSub,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 4,
                    borderRadius: 6,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <span style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: 'block', fontFamily: font }}>
                  {errors.password.message}
                </span>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: G.gold,
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'wait' : 'pointer',
                fontFamily: font,
                opacity: loading ? 0.8 : 1,
                marginTop: 6,
                boxShadow: '0 4px 6px -1px rgba(184, 144, 48, 0.2), 0 2px 4px -1px rgba(184, 144, 48, 0.1)',
              }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>

        {/* Footer Text */}
        <div
          style={{
            textAlign: 'center',
            marginTop: 18,
            fontSize: 12,
            color: G.navyText,
            fontFamily: font,
          }}
        >
          DIAMO ERP v1.0 · Offline &amp; Local Network Architecture
        </div>
      </div>
    </div>
  );
};
