// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Empty State Component
// Phase 17.1 §20: Icon + Title + Description + Action
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
}) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--spacing-2xl) var(--spacing-lg)',
      textAlign: 'center',
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-row-alt)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 'var(--spacing-md)',
        color: 'var(--color-text-muted)',
      }}>
        {icon || <Inbox size={28} />}
      </div>

      <h3 style={{
        fontSize: 'var(--text-heading)',
        fontWeight: 600,
        color: 'var(--color-text-primary)',
        marginBottom: 'var(--spacing-xs)',
      }}>
        {title}
      </h3>

      {description && (
        <p style={{
          fontSize: 'var(--text-body)',
          color: 'var(--color-text-muted)',
          maxWidth: '320px',
          marginBottom: action ? 'var(--spacing-md)' : '0',
        }}>
          {description}
        </p>
      )}

      {action && (
        <Button variant="primary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};
