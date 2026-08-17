// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Status Footer Bar
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { Wifi, User, Building2, Clock } from 'lucide-react';
import { useAuthStore } from '../../state/auth-store';
import { useCompanyStore, formatFinancialYearLabel } from '../../state/company-store';

export const StatusFooter: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const activeCompany = useCompanyStore((s) => s.activeCompany);
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);

  const [currentTime, setCurrentTime] = useState(
    new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  );

  // Real build version of this machine — previously hardcoded to "v1.0.0".
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = (await window.api?.invoke('system:version')) as { app?: string } | undefined;
        if (!cancelled && res?.app) setAppVersion(`v${String(res.app).replace(/^v/, '')}`);
      } catch {
        // Leave blank rather than showing a version we cannot verify.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      );
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer className="no-print" style={{
      height: 'var(--footer-height)',
      minHeight: 'var(--footer-height)',
      background: 'var(--color-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--spacing-md)',
      fontSize: 'var(--text-small)',
      color: 'rgba(255,255,255,0.6)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <Wifi size={10} color="var(--color-success)" />
          <span>Database Connected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <User size={10} />
          <span>{user?.fullName || '—'}</span>
        </div>
        {activeCompany && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <Building2 size={10} />
            <span>{activeCompany.companyCode}</span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        {activeFinancialYear && (
          <span>FY {formatFinancialYearLabel(activeFinancialYear)}</span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <Clock size={10} />
          <span>{currentTime}</span>
        </div>
        <span style={{ opacity: 0.4 }}>{appVersion}</span>
      </div>
    </footer>
  );
};
