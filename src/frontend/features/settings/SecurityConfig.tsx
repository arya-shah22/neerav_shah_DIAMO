// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Security & Audit Settings Configuration View
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { Button, useToast, Input, Select } from '../../components/ui';
import { IAuditSecuritySettings } from '../../../shared/types/audit-security.types';
import { ShieldCheck, Save, Clock, KeyRound } from 'lucide-react';

interface SecurityConfigProps {
  companyId: number;
}

export const SecurityConfig: React.FC<SecurityConfigProps> = ({ companyId }) => {
  const { showToast } = useToast();

  const { invoke: getSettings } = useIpc<IAuditSecuritySettings>('audit:get-settings');
  const { invoke: saveSettings, loading: saving } = useIpc<any>('audit:save-settings');

  const [settings, setSettings] = useState<IAuditSecuritySettings | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      const res = await getSettings({ companyId });
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      showToast('Failed to load security settings', 'error');
    }
  }, [companyId, getSettings, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    const res = await saveSettings({ companyId, settings });
    if (res.success) {
      showToast('Security settings saved successfully', 'success');
      loadData();
    } else {
      showToast(res.error || 'Failed to save security settings', 'error');
    }
  };

  if (!settings) {
    return <div style={{ padding: '24px', color: 'var(--color-text-secondary)' }}>Loading settings...</div>;
  }

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        
        {/* Card 1: Audit Logging level */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: 'var(--color-primary)' }}>
            <ShieldCheck size={20} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Database Audit Controls</h3>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Audit Logging Level
            </label>
            <Select
              value={settings.auditLevel}
              onChange={(val) => setSettings({ ...settings, auditLevel: val as any })}
              options={[
                { value: 'BASIC', label: 'Basic (Logins, logouts, voucher creation)' },
                { value: 'STANDARD', label: 'Standard (Add updates, deletions, and prints)' },
                { value: 'DETAILED', label: 'Detailed (Field-level before/after JSON snapshots)' },
              ]}
            />
            <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Enforces the tracing level for database modification logs across all accounting books.
            </p>
          </div>
        </div>



        {/* Card 3: Session Security */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: '#d97706' }}>
            <Clock size={20} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Session & Inactivity Locks</h3>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Auto-Logout Inactivity (Mins)
              </label>
              <Input
                type="number"
                min={0}
                max={120}
                value={settings.sessionTimeoutMinutes}
                onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: Number(e.target.value) })}
              />
              <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>0 to disable auto-logout</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Concurrent Session Limit
              </label>
              <Input
                type="number"
                min={0}
                max={10}
                value={settings.concurrentLoginsLimit}
                onChange={(e) => setSettings({ ...settings, concurrentLoginsLimit: Number(e.target.value) })}
              />
              <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>0 for unlimited logins</span>
            </div>
          </div>
        </div>

        {/* Card 4: Login Security */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', color: '#2563eb' }}>
            <KeyRound size={20} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Login Lockout Controls</h3>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Max Failed Login Attempts
              </label>
              <Input
                type="number"
                min={3}
                max={10}
                value={settings.maxFailedLoginAttempts}
                onChange={(e) => setSettings({ ...settings, maxFailedLoginAttempts: Number(e.target.value) })}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Lockout Duration (Mins)
              </label>
              <Input
                type="number"
                min={5}
                max={180}
                value={settings.lockoutDurationMinutes}
                onChange={(e) => setSettings({ ...settings, lockoutDurationMinutes: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '12px' }}>
        <Button variant="primary" type="submit" loading={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Save size={16} /> Save Security Settings
        </Button>
      </div>
    </form>
  );
};
