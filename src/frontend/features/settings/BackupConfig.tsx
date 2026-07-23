// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Backup & Recovery Dashboard Configuration View
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { Button, Input, useToast } from '../../components/ui';
import { DataGrid } from '../../components/ui/DataGrid';
import { IBackupSettings, IBackupHistoryEntry } from '../../../shared/types/backup.types';
import { 
  Play, Trash2, RotateCcw, FolderOpen, RefreshCw, 
  Settings, CheckCircle, AlertTriangle, HardDrive 
} from 'lucide-react';

interface BackupConfigProps {
  companyId: number;
}

export const BackupConfig: React.FC<BackupConfigProps> = ({ companyId }) => {
  const { showToast } = useToast();

  // IPC Hooks
  const { invoke: getSettings } = useIpc<IBackupSettings>('backup:get-settings');
  const { invoke: saveSettings, loading: savingSettings } = useIpc<any>('backup:save-settings');
  const { invoke: createBackup, loading: creatingBackup } = useIpc<any>('backup:create');
  const { invoke: getHistory, loading: loadingHistory } = useIpc<IBackupHistoryEntry[]>('backup:get-history');
  const { invoke: restoreBackup, loading: restoringBackup } = useIpc<any>('backup:restore');
  const { invoke: deleteBackup } = useIpc<any>('backup:delete');
  const { invoke: selectFolder } = useIpc<{ path: string }>('backup:select-folder');

  // Component States
  const [settings, setSettings] = useState<IBackupSettings | null>(null);
  const [history, setHistory] = useState<IBackupHistoryEntry[]>([]);
  const [manualComments, setManualComments] = useState('');
  const [backupType, setBackupType] = useState<'MANUAL' | 'COMPANY'>('MANUAL');

  // Load Settings & History on Mount
  const loadData = React.useCallback(async () => {
    try {
      const settingsRes = await getSettings({ companyId });
      if (settingsRes.success && settingsRes.data) {
        setSettings(settingsRes.data);
      }
      const historyRes = await getHistory({ companyId });
      if (historyRes.success && historyRes.data) {
        setHistory(historyRes.data);
      }
    } catch (err) {
      showToast('Failed to load backup configurations', 'error');
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleCompleted = () => {
      loadData();
    };
    window.api.on('backup:completed', handleCompleted);
    return () => {
      window.api.removeAllListeners('backup:completed');
    };
  }, [loadData]);

  // Handle manual path select browse dialog
  const handleSelectFolder = async () => {
    const res = await selectFolder();
    if (res.success && res.data && res.data.path && settings) {
      setSettings({ ...settings, destinationPath: res.data.path });
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    const res = await saveSettings({ companyId, settings });
    if (res.success) {
      showToast('Backup settings updated successfully', 'success');
      loadData();
    } else {
      showToast(res.error || 'Failed to update backup settings', 'error');
    }
  };

  // Trigger Manual Backup
  const handleCreateManualBackup = async () => {
    if (!settings) return;
    const res = await createBackup({
      companyId,
      type: backupType,
      comments: manualComments || 'Manual user-initiated backup snapshot',
    });

    if (res.success) {
      showToast('Backup archive generated successfully', 'success');
      setManualComments('');
      loadData();
    } else {
      showToast(res.error || 'Failed to generate backup', 'error');
    }
  };

  // Trigger Restore
  const handleRestore = async (backup: IBackupHistoryEntry) => {
    const confirmRestore = window.confirm(
      `CRITICAL WARNING:\n\nAre you sure you want to restore the backup "${backup.fileName}"?\n\nThis will overwrite all current system data. A safety auto-rollback checkpoint will be created before restoring.`
    );
    if (!confirmRestore) return;

    const res = await restoreBackup({
      companyId,
      backupId: Number(backup.id),
    });

    if (res.success) {
      showToast('Database restore completed successfully!', 'success');
      loadData();
    } else {
      showToast(res.error || 'Restore failed. Rollback checkpoint remains restorable.', 'error');
    }
  };

  // Trigger Delete Backup
  const handleDelete = async (backupId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to permanently delete this backup record and its archive file from your computer?');
    if (!confirmDelete) return;

    const res = await deleteBackup({ backupId: Number(backupId) });
    if (res.success) {
      showToast('Backup record deleted successfully', 'success');
      loadData();
    } else {
      showToast(res.error || 'Failed to delete backup record', 'error');
    }
  };

  // Format bytes to KB/MB
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = 2;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // History Grid Columns
  const columns = [
    {
      key: 'createdAt',
      header: 'DATE & TIME',
      width: '180px',
      render: (row: IBackupHistoryEntry) => new Date(row.createdAt).toLocaleString('en-IN'),
    },
    {
      key: 'backupType',
      header: 'TYPE',
      width: '100px',
      render: (row: IBackupHistoryEntry) => (
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: '4px',
          background: row.backupType === 'MANUAL' ? '#eff6ff' : row.backupType === 'COMPANY' ? '#fdf2f8' : '#f0fdf4',
          color: row.backupType === 'MANUAL' ? '#1d4ed8' : row.backupType === 'COMPANY' ? '#db2777' : '#15803d',
        }}>
          {row.backupType}
        </span>
      ),
    },
    {
      key: 'fileName',
      header: 'ARCHIVE FILE',
      width: '280px',
      render: (row: IBackupHistoryEntry) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>{row.fileName}</span>
          <span style={{ fontSize: '10px', color: '#64748b' }}>{formatBytes(row.fileSize)}</span>
        </div>
      ),
    },
    {
      key: 'validationStatus',
      header: 'CHECKSUM (MD5)',
      width: '140px',
      render: (row: IBackupHistoryEntry) => (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          fontWeight: 600,
          color: row.validationStatus === 'PASSED' ? '#16a34a' : '#dc2626',
        }}>
          {row.validationStatus === 'PASSED' ? (
            <>
              <CheckCircle size={12} /> Passed
            </>
          ) : (
            <>
              <AlertTriangle size={12} /> Failed
            </>
          )}
        </span>
      ),
    },
    {
      key: 'comments',
      header: 'REMARKS',
      width: '220px',
      render: (row: IBackupHistoryEntry) => row.comments || '—',
    },
    {
      key: 'actions',
      header: 'ACTIONS',
      width: '120px',
      render: (row: IBackupHistoryEntry) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <Button 
            variant="secondary" 
            size="sm" 
            onClick={() => handleRestore(row)} 
            disabled={restoringBackup}
            title="Restore this backup"
            style={{ padding: '4px 8px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <RotateCcw size={12} /> Restore
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleDelete(row.id)} 
            title="Delete backup file"
            style={{ padding: '4px' }}
          >
            <Trash2 size={14} color="var(--color-danger)" />
          </Button>
        </div>
      ),
    },
  ];

  if (!settings) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <RefreshCw size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px', width: '100%', alignItems: 'start' }}>
      {/* Column 1: Backup Configuration Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Ad-hoc Manual Backup */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: 'var(--color-primary)' }}>
            <Play size={16} /> Instant Backup
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="backupType" 
                  checked={backupType === 'MANUAL'} 
                  onChange={() => setBackupType('MANUAL')} 
                />
                Full System Backup
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="backupType" 
                  checked={backupType === 'COMPANY'} 
                  onChange={() => setBackupType('COMPANY')} 
                />
                Company-Wise Backup
              </label>
            </div>

            <Input
              label="Backup Comment / Remarks"
              placeholder="e.g., Before FY closure, Year end snapshot"
              value={manualComments}
              onChange={(e) => setManualComments(e.target.value)}
            />

            <Button 
              variant="primary" 
              onClick={handleCreateManualBackup} 
              disabled={creatingBackup}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}
            >
              {creatingBackup ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Generating Backup...
                </>
              ) : (
                <>
                  <Play size={14} /> Run Backup Now
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Backup Settings Form */}
        <form onSubmit={handleSaveSettings} style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)' }}>
            <Settings size={16} /> Backup Preferences
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Backup Storage Path</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={settings.destinationPath}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  fontSize: '13px',
                  background: '#f8fafc',
                }}
              />
              <Button type="button" variant="secondary" onClick={handleSelectFolder} style={{ padding: '8px 12px' }}>
                <FolderOpen size={16} />
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
            <div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Automated Backup Service</span>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>Schedule / startup / exit backups</p>
            </div>
            <button
              type="button"
              onClick={() => setSettings({ ...settings, backupEnabled: !settings.backupEnabled })}
              style={{
                border: 'none',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                background: settings.backupEnabled ? '#dcfce7' : '#fee2e2',
                color: settings.backupEnabled ? '#15803d' : '#b91c1c',
                transition: 'all 0.2s',
              }}
            >
              {settings.backupEnabled ? '● ACTIVE' : '○ INACTIVE'}
            </button>
          </div>

          {!settings.backupEnabled && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <AlertTriangle size={16} color="#dc2626" style={{ marginTop: '2px', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#991b1b', lineHeight: 1.4 }}>
                Automated backups are currently suspended. Only manual ad-hoc backups can be triggered.
              </span>
            </div>
          )}

          {settings.backupEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingLeft: '16px', borderLeft: '2px solid var(--color-primary-light)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Backup Trigger Mode</label>
                <select
                  value={settings.backupMode || 'BOTH'}
                  onChange={(e) => {
                    const mode = e.target.value as 'SCHEDULE' | 'START_END' | 'BOTH';
                    setSettings({ 
                      ...settings, 
                      backupMode: mode,
                      backupOnExit: mode === 'START_END' || mode === 'BOTH'
                    });
                  }}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    fontSize: '13px',
                    background: 'var(--color-surface)',
                  }}
                >
                  <option value="SCHEDULE">Auto Schedule Backup (Time-based)</option>
                  <option value="START_END">Software Start and End Backup (On Open/Close)</option>
                  <option value="BOTH">Both (Schedule + Start & End Backup)</option>
                </select>
              </div>

              {(settings.backupMode === 'SCHEDULE' || settings.backupMode === 'BOTH' || !settings.backupMode) && (
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Frequency</label>
                    <select
                      value={settings.frequency}
                      onChange={(e) => setSettings({ ...settings, frequency: e.target.value as any })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        fontSize: '13px',
                        background: 'var(--color-surface)',
                      }}
                    >
                      <option value="DAILY">Daily</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                  <div style={{ width: '120px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Time (HH:MM)</label>
                    <input
                      type="time"
                      value={settings.executionTime}
                      onChange={(e) => setSettings({ ...settings, executionTime: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '7px 8px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-border)',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <Input
              type="number"
              label="Auto-Purge Threshold (Days)"
              placeholder="15"
              min={1}
              value={settings.retentionDays || ''}
              onChange={(e) => setSettings({ ...settings, retentionDays: Number(e.target.value) })}
            />
            <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '-4px' }}>
              ℹ️ Backups older than {settings.retentionDays || 15} days will be automatically deleted to save storage.
            </span>
          </div>

          <Button type="submit" variant="primary" disabled={savingSettings} style={{ marginTop: '8px' }}>
            {savingSettings ? 'Saving Settings...' : 'Save Preferences'}
          </Button>
        </form>
      </div>

      {/* Column 2: Backup History Log Registry */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={18} /> Backup Archive History
          </h3>
          <Button variant="secondary" size="sm" onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={12} /> Refresh History
          </Button>
        </div>

        <DataGrid
          columns={columns}
          data={history}
          keyField="id"
          loading={loadingHistory || restoringBackup}
          emptyTitle="No backups found"
          emptyDescription="You have not created any manual or automatic backups yet."
        />
      </div>
    </div>
  );
};
