// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Status Footer Bar
// Phase 17.1 §4: 24px fixed height
// Connection status, active user, printer, background tasks
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { Wifi, User, Printer, Clock } from 'lucide-react';

export const StatusFooter: React.FC = () => {
  const currentTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <footer style={{
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
      {/* Left — Connection Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <Wifi size={10} color="var(--color-success)" />
          <span>Database Connected</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <User size={10} />
          <span>Super Admin</span>
        </div>
      </div>

      {/* Right — Printer + Time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <Printer size={10} />
          <span>Default Printer</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <Clock size={10} />
          <span>{currentTime}</span>
        </div>
        <span style={{ opacity: 0.4 }}>v1.0.0</span>
      </div>
    </footer>
  );
};
