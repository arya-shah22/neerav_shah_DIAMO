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
      setErrorMsg(err?.message || 'Could not connect to Host PC. Ensure it is powered on and connected to Wi-Fi.');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-6 text-white text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400">
          <WifiOff className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-wide">Host PC Connection Lost</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            DIAMO ERP could not reach the central database on <span className="font-semibold text-white">{hostName}</span> ({hostIp}).
          </p>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 text-left text-xs space-y-2 text-slate-300">
          <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Recommended Troubleshooting Steps:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-slate-400">
            <li>Ensure the Host PC (<span className="text-slate-200">{hostName}</span>) is turned <strong>ON</strong> and active.</li>
            <li>Verify both computers are connected to the same Wi-Fi network.</li>
            <li>Check if DIAMO ERP is open on the Host PC.</li>
          </ul>
        </div>

        {errorMsg && (
          <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/40 p-2.5 rounded-lg">
            {errorMsg}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all"
            >
              <Server className="w-4 h-4 inline mr-2" />
              Settings
            </button>
          )}
          <button
            onClick={handleRetryClick}
            disabled={retrying}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            <span>{retrying ? 'Connecting...' : 'Retry Connection'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
