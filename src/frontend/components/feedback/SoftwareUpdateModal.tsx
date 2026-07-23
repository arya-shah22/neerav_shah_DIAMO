// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Software Update Modal Component
// Live animated progress bar, release notes, and restart prompt
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Button } from '../ui';
import { DownloadCloud, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { invokeIpc } from '../../../shared/utils/ipc';

interface SoftwareUpdateModalProps {
  companyId: number;
  updateData: {
    currentVersion: string;
    latestVersion: string;
    releaseDate: string;
    releaseNotes: string;
  };
  onClose: () => void;
  onUpdateCompleted: () => void;
}

export const SoftwareUpdateModal: React.FC<SoftwareUpdateModalProps> = ({
  companyId,
  updateData,
  onClose,
  onUpdateCompleted,
}) => {
  const [status, setStatus] = useState<'prompt' | 'updating' | 'completed' | 'error'>('prompt');
  const [progress, setProgress] = useState(0);
  const [stepLabel, setStepLabel] = useState('Initializing update pipeline...');
  const [errorMsg, setErrorMsg] = useState('');

  const handleStartUpdate = async () => {
    setStatus('updating');
    setProgress(5);
    setStepLabel('Verifying package signatures & internet connection...');

    // Live progress simulation
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 40) {
          setStepLabel('Downloading update payload package (v' + updateData.latestVersion + ')...');
          return prev + 15;
        } else if (prev < 75) {
          setStepLabel('Extracting binary patch and verifying database schemas...');
          return prev + 12;
        } else if (prev < 95) {
          setStepLabel('Applying patch files and updating local release logs...');
          return prev + 6;
        }
        return prev;
      });
    }, 400);

    try {
      // Apply patch via IPC
      const res = await invokeIpc<any>('license:apply-update', {
        companyId,
        version: updateData.latestVersion,
      });

      clearInterval(interval);

      if (res.success) {
        setProgress(100);
        setStepLabel('Update installed successfully!');
        setStatus('completed');
        onUpdateCompleted();
      } else {
        setStatus('error');
        setErrorMsg(res.error || 'Failed to install update patch.');
      }
    } catch (err) {
      clearInterval(interval);
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Software update failed.');
    }
  };

  const handleRestartSoftware = () => {
    window.location.reload();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '16px',
        width: '520px',
        padding: '28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        boxShadow: 'var(--shadow-xl)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: status === 'completed' ? '#ecfdf5' : '#eff6ff',
            color: status === 'completed' ? '#059669' : '#2563eb',
            padding: '10px',
            borderRadius: '10px',
          }}>
            {status === 'completed' ? <CheckCircle2 size={24} /> : <DownloadCloud size={24} />}
          </div>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
              {status === 'completed' ? 'Software Update Complete!' : 'New Software Update Available'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              DIAMO ERP — {updateData.latestVersion} ({updateData.releaseDate})
            </p>
          </div>
        </div>

        <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />

        {/* Status Views */}
        {status === 'prompt' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '14px',
              fontSize: '13px',
              color: 'var(--color-text-primary)',
              lineHeight: 1.5,
            }}>
              <span style={{ fontWeight: 700, display: 'block', marginBottom: '4px' }}>Release Highlights:</span>
              {updateData.releaseNotes}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleStartUpdate}>
                <DownloadCloud size={16} /> Update Now
              </Button>
            </div>
          </div>
        )}

        {status === 'updating' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={16} className="spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                Installing Patch v{updateData.latestVersion}
              </span>
              <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{progress}%</span>
            </div>

            {/* Live Progress Bar */}
            <div style={{ background: '#f1f5f9', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{
                background: 'linear-gradient(90deg, #2563eb, #3b82f6)',
                height: '100%',
                width: `${progress}%`,
                transition: 'width 0.3s ease',
              }}></div>
            </div>

            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
              {stepLabel}
            </span>
          </div>
        )}

        {status === 'completed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              padding: '14px',
              fontSize: '13px',
              color: '#065f46',
              lineHeight: 1.5,
            }}>
              Update <strong>v{updateData.latestVersion}</strong> has been successfully installed onto your machine. Please restart DIAMO ERP to apply changes.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
              <Button variant="primary" onClick={handleRestartSoftware}>
                <RefreshCw size={16} /> Restart Software Now
              </Button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '14px',
              fontSize: '13px',
              color: '#991b1b',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
              <AlertCircle size={20} />
              <span>{errorMsg}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" onClick={handleStartUpdate}>
                Retry Update
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
