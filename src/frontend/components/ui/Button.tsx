// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Button Component
// Phase 17.1 §8: Primary, Secondary, Danger, Success variants
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; bgHover: string; color: string; border: string }> = {
  primary: {
    bg: 'var(--color-accent)',
    bgHover: 'var(--color-accent-hover)',
    color: '#FFFFFF',
    border: 'transparent',
  },
  secondary: {
    bg: 'transparent',
    bgHover: 'var(--color-accent-light)',
    color: 'var(--color-accent)',
    border: 'var(--color-accent)',
  },
  danger: {
    bg: 'var(--color-danger)',
    bgHover: 'var(--color-danger-hover)',
    color: '#FFFFFF',
    border: 'transparent',
  },
  success: {
    bg: 'var(--color-success)',
    bgHover: 'var(--color-success-hover)',
    color: '#FFFFFF',
    border: 'transparent',
  },
};

const SIZE_STYLES: Record<ButtonSize, { padding: string; fontSize: string; height: string }> = {
  sm: { padding: '0 var(--spacing-sm)', fontSize: 'var(--text-small)', height: '28px' },
  md: { padding: '0 var(--spacing-md)', fontSize: 'var(--text-label)', height: '32px' },
  lg: { padding: '0 var(--spacing-lg)', fontSize: 'var(--text-body)', height: '36px' },
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  disabled,
  children,
  style,
  ...props
}) => {
  const v = VARIANT_STYLES[variant];
  const s = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--spacing-xs)',
        height: s.height,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 600,
        fontFamily: 'var(--font-family)',
        color: isDisabled ? 'var(--color-disabled-text)' : v.color,
        background: isDisabled ? 'var(--color-disabled-bg)' : v.bg,
        border: `1px solid ${isDisabled ? 'var(--color-disabled-bg)' : v.border}`,
        borderRadius: 'var(--radius-md)',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--transition-fast)',
        width: fullWidth ? '100%' : 'auto',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...props}
    >
      {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : icon}
      {children}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </button>
  );
};
