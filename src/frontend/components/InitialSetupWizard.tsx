import React, { useState, useEffect } from 'react';
import { Server, Network, ShieldCheck, ArrowRight, RefreshCw, CheckCircle2, X } from 'lucide-react';

interface InitialSetupWizardProps {
  isOpen: boolean;
  onComplete: () => void;
  canClose?: boolean;
}

export const InitialSetupWizard: React.FC<InitialSetupWizardProps> = ({ isOpen, onComplete, canClose = true }) => {
  const [role, setRole] = useState<'HOST' | 'CLIENT'>('HOST');
  const [hostIp, setHostIp] = useState('127.0.0.1');
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [discoveredHosts, setDiscoveredHosts] = useState<Array<{ hostname: string; ip: string; port: number }>>([]);
  const [isAlreadyConfigured, setIsAlreadyConfigured] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    async function loadCurrent() {
      try {
        if (window.api && window.api.invoke) {
          const res = (await window.api.invoke('db:get-config')) as any;
          if (res && res.success && res.data) {
            if (res.data.role) setRole(res.data.role);
            if (res.data.hostIp && res.data.hostIp !== '127.0.0.1') setHostIp(res.data.hostIp);
            if (res.data.isConfigured) setIsAlreadyConfigured(true);
          }
        }
      } catch {}
    }
    loadCurrent();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScanNetwork = async () => {
    setScanning(true);
    setScanStatus(null);
    setDiscoveredHosts([]);
    try {
      if (window.api && window.api.invoke) {
        const res = (await window.api.invoke('db:discover-host')) as any;
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const list = res.data;
          setDiscoveredHosts(list);
          if (list.length === 1) {
            setHostIp(list[0].ip);
            setScanStatus(`Discovered Host PC: ${list[0].hostname} (${list[0].ip})`);
          } else {
            setScanStatus(`Detected ${list.length} Host PCs on network. Please select one below.`);
            setHostIp(list[0].ip);
          }
        } else {
          setScanStatus('No Host PC found on local Ethernet/LAN network. Please enter Host IP manually.');
        }
      }
    } catch {
      setScanStatus('Network scan failed. Please enter Host IP address manually.');
    } finally {
      setScanning(false);
    }
  };

  const handleSaveAndContinue = async () => {
    setSaving(true);
    try {
      if (window.api && window.api.invoke) {
        const currentConfig = (await window.api.invoke('db:get-config')) as any;
        const newConfig = {
          ...(currentConfig?.data || {}),
          role,
          isConfigured: true,
          hostIp: role === 'HOST' ? '127.0.0.1' : hostIp,
        };
        await window.api.invoke('db:save-config', newConfig);
        await window.api.invoke('app:relaunch');
        return;
      }
      onComplete();
    } catch (err) {
      console.error('[SetupWizard] Save failed:', err);
    } finally {
      setSaving(false);
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
        position: 'relative',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '20px',
        maxWidth: '620px',
        width: '100%',
        padding: '32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {canClose && isAlreadyConfigured && (
          <button
            type="button"
            onClick={onComplete}
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',
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
              transition: 'background 0.2s',
            }}
            title="Close Setup Wizard"
          >
            <X size={16} />
          </button>
        )}

        {/* Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div style={{
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            padding: '12px',
            borderRadius: '16px',
            color: '#2563EB',
            display: 'inline-flex',
            marginBottom: '4px',
          }}>
            <ShieldCheck size={32} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Welcome to DIAMO ERP</h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0, maxWidth: '440px', lineHeight: 1.5 }}>
            Please select the installation role for this computer to configure your local database or office network connection.
          </p>
        </div>

        {/* Option Selection Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div
            onClick={() => setRole('HOST')}
            style={{
              padding: '20px',
              borderRadius: '16px',
              border: role === 'HOST' ? '2px solid #2563EB' : '1px solid #E2E8F0',
              backgroundColor: role === 'HOST' ? '#F0F6FF' : '#F8FAFC',
              cursor: 'pointer',
              transition: 'all 200ms ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ backgroundColor: '#DBEAFE', padding: '10px', borderRadius: '12px', color: '#1D4ED8' }}>
                <Server size={22} />
              </div>
              {role === 'HOST' && <CheckCircle2 size={20} color="#2563EB" />}
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Main Host PC (Server)</h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
              Creates and manages the central database on this computer. Select this if this is your primary office PC.
            </p>
          </div>

          <div
            onClick={() => setRole('CLIENT')}
            style={{
              padding: '20px',
              borderRadius: '16px',
              border: role === 'CLIENT' ? '2px solid #4F46E5' : '1px solid #E2E8F0',
              backgroundColor: role === 'CLIENT' ? '#EEF2FF' : '#F8FAFC',
              cursor: 'pointer',
              transition: 'all 200ms ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ backgroundColor: '#E0E7FF', padding: '10px', borderRadius: '12px', color: '#4338CA' }}>
                <Network size={22} />
              </div>
              {role === 'CLIENT' && <CheckCircle2 size={20} color="#4F46E5" />}
            </div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Client Workstation (Ethernet / LAN)</h3>
            <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
              Connects over Ethernet LAN cable or Wi-Fi to your office Host PC. Does not store a separate local database.
            </p>
          </div>
        </div>

        {/* Client Sub-Configuration */}
        {role === 'CLIENT' && (
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '16px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Host PC IP Address or Computer Name</label>
              <button
                onClick={handleScanNetwork}
                disabled={scanning}
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
                  opacity: scanning ? 0.6 : 1,
                }}
              >
                <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
                <span>{scanning ? 'Scanning Network...' : 'Auto-Scan Ethernet / LAN'}</span>
              </button>
            </div>

            {discoveredHosts.length > 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B' }}>Select Host PC to Connect:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '120px', overflowY: 'auto' }}>
                  {discoveredHosts.map((h) => (
                    <div
                      key={`${h.ip}:${h.port}`}
                      onClick={() => setHostIp(h.ip)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: hostIp === h.ip ? '2px solid #4F46E5' : '1px solid #CBD5E1',
                        backgroundColor: hostIp === h.ip ? '#EEF2FF' : '#FFFFFF',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        fontWeight: hostIp === h.ip ? 600 : 400,
                        color: hostIp === h.ip ? '#3730A3' : '#1E293B',
                      }}
                    >
                      <span>🖥️ {h.hostname} ({h.ip})</span>
                      {hostIp === h.ip && <CheckCircle2 size={16} color="#4F46E5" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <input
              type="text"
              value={hostIp}
              onChange={(e) => setHostIp(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                padding: '10px 14px',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="e.g. 192.168.1.100 or NEERAV-HOST-PC"
            />
            {scanStatus && <p style={{ fontSize: '12px', color: '#4338CA', margin: 0 }}>{scanStatus}</p>}
          </div>
        )}

        <button
          onClick={handleSaveAndContinue}
          disabled={saving}
          style={{
            width: '100%',
            padding: '14px',
            backgroundColor: '#2563EB',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '14px',
            border: 'none',
            borderRadius: '14px',
            cursor: 'pointer',
            boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            opacity: saving ? 0.6 : 1,
            transition: 'all 150ms ease',
          }}
        >
          <span>{saving ? 'Applying Configuration...' : 'Confirm & Launch DIAMO ERP'}</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};
