// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — System Preferences Configuration View
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { Button, useToast } from '../../components/ui';
import { ISystemPreferences } from '../../../shared/types/preferences.types';
import { formatDate, formatTime } from '../../../shared/utils/formatters';
import { Calendar, Clock, Save, ShieldCheck, RefreshCw, LogIn } from 'lucide-react';

interface PreferencesConfigProps {
  companyId: number;
}

export const PreferencesConfig: React.FC<PreferencesConfigProps> = ({ companyId }) => {
  const { showToast } = useToast();

  // IPC hooks
  const { invoke: getSettings } = useIpc<ISystemPreferences>('preferences:get-settings');
  const { invoke: saveSettings, loading: savingSettings } = useIpc<any>('preferences:save-settings');

  // Component States
  const [preferences, setPreferences] = useState<ISystemPreferences | null>(null);
  const [liveTime, setLiveTime] = useState<Date>(new Date());

  // Update live preview clock
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Settings on Mount
  const loadData = React.useCallback(async () => {
    try {
      const res = await getSettings({ companyId });
      if (res.success && res.data) {
        setPreferences(res.data);
      }
    } catch (err) {
      showToast('Failed to load system preferences', 'error');
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preferences) return;

    const res = await saveSettings({ companyId, settings: preferences });
    if (res.success) {
      localStorage.setItem('require-login-on-startup', preferences.requireLoginOnStartup ? 'true' : 'false');
      showToast('System preferences saved successfully', 'success');
      loadData();
    } else {
      showToast(res.error || 'Failed to save system preferences', 'error');
    }
  };

  if (!preferences) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <RefreshCw size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '100%', width: '100%' }}>
      
      {/* SECTION 1: Date & Time Formats */}
      <div style={{ display: 'flex', gap: '20px', width: '100%', flexWrap: 'wrap' }}>
        {/* 1. Date Format Card (Read-only) */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          flex: '1 1 340px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} /> System Date Format
          </h3>
          
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
              System-Wide Date Display Format
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={preferences.dateFormat || 'DD-MM-YYYY'}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: '#f8fafc',
                  color: '#64748b',
                  cursor: 'not-allowed'
                }}
              />
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 700,
                padding: '6px 10px',
                borderRadius: '6px',
                background: '#ecfdf5',
                color: '#059669',
                border: '1px solid #a7f3d0'
              }}>
                <ShieldCheck size={14} /> LOCKED
              </span>
            </div>
          </div>

          <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', lineHeight: 1.4 }}>
            ℹ️ Date layout is locked uniformly to <b>DD-MM-YYYY</b> across all ledgers, prints, and lists.
          </span>
        </div>

        {/* 2. Time Format Card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          flex: '1 1 340px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} /> System Time Format
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <input
                type="radio"
                name="timeFormat"
                checked={preferences.timeFormat === '12H'}
                onChange={() => setPreferences({ ...preferences, timeFormat: '12H' })}
                style={{ width: '16px', height: '16px' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  12-Hour Format (AM/PM) <span style={{ color: '#059669', fontSize: '11px', background: '#ecfdf5', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px' }}>Recommended</span>
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Example: 10:30 PM (Legible for bills)</span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', border: '1px solid var(--color-border)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <input
                type="radio"
                name="timeFormat"
                checked={preferences.timeFormat === '24H'}
                onChange={() => setPreferences({ ...preferences, timeFormat: '24H' })}
                style={{ width: '16px', height: '16px' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>24-Hour Format (Military)</span>
                <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Example: 22:30</span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Live Format Preview Panel (Spans full width below formats) */}
      <div style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live Format Preview
          </span>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Formatted Date</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                {formatDate(liveTime)}
              </span>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'var(--color-border)' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Formatted Time</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                {formatTime(liveTime, preferences.timeFormat === '12H')}
              </span>
            </div>
          </div>
        </div>
        
        <Clock size={32} color="var(--color-primary-light)" style={{ opacity: 0.8 }} />
      </div>

      {/* Section Divider */}
      <div style={{ width: '100%', height: '1px', background: 'var(--color-border)', margin: '4px 0' }} />

      {/* SECTION 2: Startup Behavior */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LogIn size={18} /> Startup Behavior
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={preferences.requireLoginOnStartup}
              onChange={(e) => setPreferences({ ...preferences, requireLoginOnStartup: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Require login credentials on app startup
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                When enabled, the app will always start fresh at the login screen. When disabled, it stays logged in.
              </span>
            </div>
          </label>
        </div>
      </div>

      <Button type="submit" variant="primary" disabled={savingSettings} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}>
        <Save size={16} /> {savingSettings ? 'Saving Preferences...' : 'Save Preferences'}
      </Button>
    </form>
  );
};
