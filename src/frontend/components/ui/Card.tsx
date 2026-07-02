// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Card Component
// ═══════════════════════════════════════════════════════════════

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  padding?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  padding = 'var(--spacing-md)',
  style,
}) => {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-sm)',
      ...style,
    }}>
      {title && (
        <div style={{
          padding: 'var(--spacing-sm) var(--spacing-md)',
          borderBottom: '1px solid var(--color-border)',
          fontSize: 'var(--text-heading)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
        }}>
          {title}
        </div>
      )}
      <div style={{ padding }}>
        {children}
      </div>
    </div>
  );
};
