// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Database Architecture & LAN Settings Page
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { Server, Wifi, RefreshCw, CheckCircle, Save, HardDrive, ShieldCheck } from 'lucide-react';

interface IDatabaseConfig {
  role: 'HOST' | 'CLIENT';
  isConfigured: boolean;
  hostIp: string;
  hostPort: number;
  dbName: string;
  dbUser: string;
  dbPass: string;
  autoDiscover: boolean;
}

import { InitialSetupWizard } from '../../components/InitialSetupWizard';

export const DatabaseConfigPage: React.FC = () => {
  const [config, setConfig] = useState<IDatabaseConfig>({
    role: 'HOST',
    isConfigured: true,
    hostIp: '127.0.0.1',
    hostPort: 3306,
    dbName: 'diamo_db',
    dbUser: 'root',
    dbPass: '',
    autoDiscover: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [previewWizard, setPreviewWizard] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      if (window.api && window.api.invoke) {
        const res = (await window.api.invoke('db:get-config')) as any;
        if (res && res.success && res.data) {
          setConfig(res.data);
        }
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to load database configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      if (window.api && window.api.invoke) {
        const res = (await window.api.invoke('db:save-config', { ...config, isConfigured: true })) as any;
        if (res && res.success) {
          setStatusMsg({ type: 'success', text: 'Database configuration saved successfully! Restart app to apply changes.' });
        } else {
          setStatusMsg({ type: 'error', text: res?.message || 'Failed to save configuration' });
        }
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err?.message || 'Error saving database configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleAutoDiscover = async () => {
    setDiscovering(true);
    setStatusMsg(null);
    try {
      if (window.api && window.api.invoke) {
        const res = (await window.api.invoke('db:discover-host')) as any;
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          const hostData = res.data[0];
          setConfig((prev) => ({
            ...prev,
            role: 'CLIENT',
            hostIp: hostData.ip,
            hostPort: hostData.port || 3306,
          }));
          setStatusMsg({
            type: 'success',
            text: `Discovered Host PC (${hostData.hostname}) at IP: ${hostData.ip}:${hostData.port}`,
          });
        } else {
          setStatusMsg({
            type: 'error',
            text: 'No DIAMO Host PC discovered on local network. Ensure Host PC is turned ON.',
          });
        }
      }
    } catch {
      setStatusMsg({ type: 'error', text: 'Ethernet / LAN auto-discovery scan failed' });
    } finally {
      setDiscovering(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
        <span>Loading database configuration...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={24} color="#2563EB" />
            <span>Database Architecture & Ethernet / LAN Settings</span>
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0 0' }}>
            Configure local embedded database storage or multi-PC Ethernet LAN host connection.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setPreviewWizard(true)}
            style={{
              padding: '10px 14px',
              backgroundColor: '#F1F5F9',
              color: '#334155',
              border: '1px solid #CBD5E1',
              fontWeight: 600,
              fontSize: '13px',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ShieldCheck size={16} color="#2563EB" />
            <span>Preview Setup Wizard</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '10px 18px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontWeight: 600,
              fontSize: '13px',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      <InitialSetupWizard isOpen={previewWizard} onComplete={() => setPreviewWizard(false)} />

      {statusMsg && (
        <div style={{
          padding: '14px',
          borderRadius: '10px',
          border: statusMsg.type === 'success' ? '1px solid #A7F3D0' : '1px solid #FCA5A5',
          backgroundColor: statusMsg.type === 'success' ? '#ECFDF5' : '#FEE2E2',
          color: statusMsg.type === 'success' ? '#065F46' : '#991B1B',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          {statusMsg.type === 'success' ? <CheckCircle size={18} /> : <Server size={18} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Role Selection */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div
          onClick={() => setConfig((prev) => ({ ...prev, role: 'HOST' }))}
          style={{
            padding: '20px',
            borderRadius: '16px',
            border: config.role === 'HOST' ? '2px solid #2563EB' : '1px solid #E2E8F0',
            backgroundColor: config.role === 'HOST' ? '#F0F6FF' : '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ backgroundColor: '#DBEAFE', padding: '10px', borderRadius: '12px', color: '#1D4ED8' }}>
              <HardDrive size={22} />
            </div>
            {config.role === 'HOST' && <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 8px', backgroundColor: '#DBEAFE', color: '#1E40AF', borderRadius: '999px' }}>ACTIVE</span>}
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Main Host PC (Standalone / Server)</h3>
          <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
            Runs embedded database locally on this computer. Other computers on local network will connect to this PC.
          </p>
        </div>

        <div
          onClick={() => setConfig((prev) => ({ ...prev, role: 'CLIENT' }))}
          style={{
            padding: '20px',
            borderRadius: '16px',
            border: config.role === 'CLIENT' ? '2px solid #4F46E5' : '1px solid #E2E8F0',
            backgroundColor: config.role === 'CLIENT' ? '#EEF2FF' : '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ backgroundColor: '#E0E7FF', padding: '10px', borderRadius: '12px', color: '#4338CA' }}>
              <Wifi size={22} />
            </div>
            {config.role === 'CLIENT' && <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 8px', backgroundColor: '#E0E7FF', color: '#3730A3', borderRadius: '999px' }}>ACTIVE</span>}
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>Client Workstation (Ethernet / LAN)</h3>
          <p style={{ fontSize: '12px', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
            Connects over Ethernet LAN cable or Wi-Fi to the Host PC's central database. Does not store a separate local database.
          </p>
        </div>
      </div>

      {/* Configuration Details */}
      <div style={{ backgroundColor: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E2E8F0', paddingBottom: '12px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="#2563EB" />
            <span>{config.role === 'HOST' ? 'Host Database Parameters' : 'Ethernet / LAN Connection Parameters'}</span>
          </h2>
          {config.role === 'CLIENT' && (
            <button
              onClick={handleAutoDiscover}
              disabled={discovering}
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
                opacity: discovering ? 0.6 : 1,
              }}
            >
              <RefreshCw size={14} className={discovering ? 'animate-spin' : ''} />
              <span>{discovering ? 'Scanning Network...' : 'Auto-Discover Host'}</span>
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Host IP Address or Computer Name</label>
            <input
              type="text"
              value={config.hostIp}
              disabled={config.role === 'HOST'}
              onChange={(e) => setConfig({ ...config, hostIp: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: config.role === 'HOST' ? '#F1F5F9' : '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              placeholder="e.g. 192.168.1.100 or SERVER-PC"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Database Port</label>
            <input
              type="number"
              value={config.hostPort}
              onChange={(e) => setConfig({ ...config, hostPort: Number(e.target.value) })}
              style={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Database Name</label>
            <input
              type="text"
              value={config.dbName}
              onChange={(e) => setConfig({ ...config, dbName: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Database User</label>
            <input
              type="text"
              value={config.dbUser}
              onChange={(e) => setConfig({ ...config, dbUser: e.target.value })}
              style={{
                width: '100%',
                backgroundColor: '#FFFFFF',
                border: '1px solid #CBD5E1',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                color: '#0F172A',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
