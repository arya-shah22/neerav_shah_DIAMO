// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Database Architecture & LAN Settings Page
// ═══════════════════════════════════════════════════════════════
import React, { useState, useEffect } from 'react';
import { Server, Wifi, RefreshCw, CheckCircle, Save, HardDrive, ShieldCheck } from 'lucide-react';

interface IDatabaseConfig {
  role: 'HOST' | 'CLIENT';
  hostIp: string;
  hostPort: number;
  dbName: string;
  dbUser: string;
  dbPass: string;
  autoDiscover: boolean;
}

export const DatabaseConfigPage: React.FC = () => {
  const [config, setConfig] = useState<IDatabaseConfig>({
    role: 'HOST',
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
    } catch (err: any) {
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
        const res = (await window.api.invoke('db:save-config', config)) as any;
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
        if (res && res.success && res.data) {
          const hostData = res.data;
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
            text: 'No DIAMO Host PC discovered on current Wi-Fi network. Ensure Host PC is turned ON.',
          });
        }
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: 'Wi-Fi LAN auto-discovery scan failed' });
    } finally {
      setDiscovering(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
        <span>Loading database configuration...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Server className="w-7 h-7 text-blue-400" />
            <span>Database Architecture & Multi-Device LAN</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure local embedded database storage or multi-PC Wi-Fi LAN host connection.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl border flex items-center gap-3 text-sm ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
              : 'bg-red-950/40 border-red-800/50 text-red-300'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <Server className="w-5 h-5 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Role Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          onClick={() => setConfig((prev) => ({ ...prev, role: 'HOST' }))}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            config.role === 'HOST'
              ? 'bg-blue-950/40 border-blue-500 shadow-lg shadow-blue-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
              <HardDrive className="w-6 h-6" />
            </div>
            {config.role === 'HOST' && <span className="text-xs font-semibold px-2.5 py-1 bg-blue-500/20 text-blue-300 rounded-full">ACTIVE</span>}
          </div>
          <h3 className="text-lg font-bold text-white">Main Host PC (Standalone / Server)</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Runs embedded database locally on this computer. Other computers on local Wi-Fi will connect to this PC.
          </p>
        </div>

        <div
          onClick={() => setConfig((prev) => ({ ...prev, role: 'CLIENT' }))}
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            config.role === 'CLIENT'
              ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-500/10'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Wifi className="w-6 h-6" />
            </div>
            {config.role === 'CLIENT' && <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-full">ACTIVE</span>}
          </div>
          <h3 className="text-lg font-bold text-white">Client Workstation (Multi-Device)</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Connects over Wi-Fi/LAN to the Host PC's central database. Does not run a local database process.
          </p>
        </div>
      </div>

      {/* Configuration Details */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <span>{config.role === 'HOST' ? 'Host Database Parameters' : 'Wi-Fi LAN Connection Parameters'}</span>
          </h2>
          {config.role === 'CLIENT' && (
            <button
              onClick={handleAutoDiscover}
              disabled={discovering}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${discovering ? 'animate-spin' : ''}`} />
              <span>{discovering ? 'Scanning Wi-Fi...' : 'Auto-Discover Host'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Host IP Address or Computer Name</label>
            <input
              type="text"
              value={config.hostIp}
              disabled={config.role === 'HOST'}
              onChange={(e) => setConfig({ ...config, hostIp: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white disabled:opacity-60 focus:outline-none focus:border-blue-500"
              placeholder="e.g. 192.168.1.100 or SERVER-PC"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Database Port</label>
            <input
              type="number"
              value={config.hostPort}
              onChange={(e) => setConfig({ ...config, hostPort: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Database Name</label>
            <input
              type="text"
              value={config.dbName}
              onChange={(e) => setConfig({ ...config, dbName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Database User</label>
            <input
              type="text"
              value={config.dbUser}
              onChange={(e) => setConfig({ ...config, dbUser: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
