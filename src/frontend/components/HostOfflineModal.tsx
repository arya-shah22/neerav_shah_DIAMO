// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Host PC Offline Recovery Modal
// ═══════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { WifiOff, RefreshCw, Server, AlertCircle } from 'lucide-react';

interface HostOfflineModalProps {
  isOpen: boolean;
  hostName?: string;
  hostIp?: string;
  onRetry: () => Promise<void>;
  onOpenSettings?: () => void;
}

export const HostOfflineModal: React.FC<HostOfflineModalProps> = ({
  isOpen,
  hostName = 'Server PC',
  hostIp = '192.168.x.x',
  onRetry,
  onOpenSettings,
}) => {
  const [retrying, setRetrying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRetryClick = async () => {
    setRetrying(true);
    setErrorMsg(null);
    try {
      await onRetry();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not connect to Host PC. Ensure it is powered on and connected to Wi-Fi/Ethernet.');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div style={{
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
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '20px',
        maxWidth: '460px',
        width: '100%',
        padding: '28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        textAlign: 'center',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          backgroundColor: '#FEE2E2',
          border: '1px solid #FCA5A5',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto',
          color: '#DC2626',
        }}>
          <WifiOff size={32} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Host PC Connection Lost</h2>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: 1.5 }}>
            DIAMO ERP could not reach the central database on <strong style={{ color: '#0F172A' }}>{hostName}</strong> ({hostIp}).
          </p>
        </div>

        <div style={{
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '14px',
          textAlign: 'left',
          fontSize: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          color: '#334155',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#D97706', fontWeight: 600 }}>
            <AlertCircle size={16} />
            <span>Troubleshooting Steps:</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '4px', color: '#475569' }}>
            <li>Ensure the Host PC (<strong>{hostName}</strong>) is turned <strong>ON</strong> and active.</li>
            <li>Verify both computers are connected to the same Ethernet/Wi-Fi network.</li>
            <li>Check if DIAMO ERP is open on the Host PC.</li>
          </ul>
        </div>

        {errorMsg && (
          <p style={{ fontSize: '12px', color: '#DC2626', backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', padding: '10px', borderRadius: '8px', margin: 0 }}>
            {errorMsg}
          </p>
        )}

        <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '12px',
                color: '#334155',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Server size={16} />
              <span>Settings</span>
            </button>
          )}
          <button
            onClick={handleRetryClick}
            disabled={retrying}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              opacity: retrying ? 0.6 : 1,
            }}
          >
            <RefreshCw size={16} className={retrying ? 'animate-spin' : ''} />
            <span>{retrying ? 'Connecting...' : 'Retry Connection'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
