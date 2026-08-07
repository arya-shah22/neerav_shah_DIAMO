// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — First-Time Initial Setup Wizard (Host vs Client)
// ═══════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Server, Network, ShieldCheck, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';

interface InitialSetupWizardProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const InitialSetupWizard: React.FC<InitialSetupWizardProps> = ({ isOpen, onComplete }) => {
  const [role, setRole] = useState<'HOST' | 'CLIENT'>('HOST');
  const [hostIp, setHostIp] = useState('127.0.0.1');
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [discoveredHosts, setDiscoveredHosts] = useState<Array<{ hostname: string; ip: string; port: number }>>([]);

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
      }
      onComplete();
    } catch (err) {
      console.error('[SetupWizard] Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-2xl w-full shadow-2xl space-y-6 text-white">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 mb-2">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome to DIAMO ERP</h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Please select the installation role for this computer to configure your local database or office network connection.
          </p>
        </div>

        {/* Option Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div
            onClick={() => setRole('HOST')}
            className={`p-6 rounded-2xl border cursor-pointer transition-all ${
              role === 'HOST'
                ? 'bg-blue-950/50 border-blue-500 shadow-xl shadow-blue-500/10 scale-[1.02]'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                <Server className="w-6 h-6" />
              </div>
              {role === 'HOST' && <CheckCircle2 className="w-5 h-5 text-blue-400" />}
            </div>
            <h3 className="text-base font-bold text-white">Main Host PC (Server)</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Creates and manages the central database on this computer. Select this if this is your primary office PC.
            </p>
          </div>

          <div
            onClick={() => setRole('CLIENT')}
            className={`p-6 rounded-2xl border cursor-pointer transition-all ${
              role === 'CLIENT'
                ? 'bg-indigo-950/50 border-indigo-500 shadow-xl shadow-indigo-500/10 scale-[1.02]'
                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-75'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                <Network className="w-6 h-6" />
              </div>
              {role === 'CLIENT' && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
            </div>
            <h3 className="text-base font-bold text-white">Client Workstation (Ethernet / LAN)</h3>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Connects over Ethernet LAN cable or Wi-Fi to your office Host PC. Does not store a separate local database.
            </p>
          </div>
        </div>

        {/* Client Sub-Configuration */}
        {role === 'CLIENT' && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 text-sm animate-fadeIn">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Host PC IP Address or Computer Name</label>
              <button
                onClick={handleScanNetwork}
                disabled={scanning}
                className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
                <span>{scanning ? 'Scanning Network...' : 'Auto-Scan Ethernet / LAN'}</span>
              </button>
            </div>
            {discoveredHosts.length > 1 && (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-semibold text-slate-400">Select Host PC to Connect:</label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {discoveredHosts.map((h) => (
                    <div
                      key={`${h.ip}:${h.port}`}
                      onClick={() => setHostIp(h.ip)}
                      className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        hostIp === h.ip
                          ? 'bg-indigo-950/60 border-indigo-500 text-white font-semibold'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span>🖥️ {h.hostname} ({h.ip})</span>
                      {hostIp === h.ip && <CheckCircle2 className="w-4 h-4 text-indigo-400" />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <input
              type="text"
              value={hostIp}
              onChange={(e) => setHostIp(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500"
              placeholder="e.g. 192.168.1.100 or NEERAV-HOST-PC"
            />
            {scanStatus && <p className="text-xs text-indigo-400 pt-1">{scanStatus}</p>}
          </div>
        )}

        <button
          onClick={handleSaveAndContinue}
          disabled={saving}
          className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 transition-all text-sm"
        >
          <span>{saving ? 'Applying Configuration...' : 'Confirm & Launch DIAMO ERP'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
