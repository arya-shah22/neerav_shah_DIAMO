// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Loading Overlay
// Phase 17.1 §18: Full overlay with spinner
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Processing...',
}) => {
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(248, 250, 252, 0.8)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 'var(--spacing-md)',
      zIndex: 'var(--z-overlay)',
    }}>
      <Loader2
        size={32}
        color="var(--color-accent)"
        style={{ animation: 'spin 1s linear infinite' }}
      />
      <span style={{
        fontSize: 'var(--text-body)',
        fontWeight: 500,
        color: 'var(--color-text-secondary)',
      }}>
        {message}
      </span>
    </div>
  );
};
