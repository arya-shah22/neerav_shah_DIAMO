// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Access Denied Interception Page
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { ShieldOff } from 'lucide-react';

export const AccessDeniedPage: React.FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      gap: '16px',
      padding: '48px',
      textAlign: 'center',
    }}>
      <div style={{
        background: '#fef2f2',
        padding: '20px',
        borderRadius: '16px',
        color: '#dc2626',
      }}>
        <ShieldOff size={48} />
      </div>

      <h1 style={{
        fontSize: '24px',
        fontWeight: 700,
        color: 'var(--color-text-primary)',
        marginTop: '8px',
      }}>
        Access Denied
      </h1>

      <p style={{
        fontSize: '14px',
        color: 'var(--color-text-secondary)',
        maxWidth: '400px',
        lineHeight: '1.6',
      }}>
        You do not have permission to access this page.
        <br />
        Please contact your Super Administrator.
      </p>
    </div>
  );
};
