// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Badge Component
// ═══════════════════════════════════════════════════════════════

import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const VARIANT_STYLES: Record<BadgeVariant, { bg: string; color: string }> = {
  default: { bg: 'var(--color-row-alt)', color: 'var(--color-text-secondary)' },
  success: { bg: 'var(--color-success-light)', color: '#065F46' },
  warning: { bg: 'var(--color-warning-light)', color: '#92400E' },
  danger: { bg: 'var(--color-danger-light)', color: '#991B1B' },
  info: { bg: 'var(--color-info-light)', color: '#075985' },
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children }) => {
  const s = VARIANT_STYLES[variant];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      fontSize: 'var(--text-small)',
      fontWeight: 600,
      lineHeight: 'var(--line-small)',
      borderRadius: 'var(--radius-full)',
      background: s.bg,
      color: s.color,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
};
