// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Input Component
// Phase 17.1 §9: Text, Number, Date inputs with validation states
// ═══════════════════════════════════════════════════════════════

import React, { forwardRef } from 'react';

type InputType = 'text' | 'number' | 'date' | 'password' | 'email' | 'tel';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  type?: InputType;
  label?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  /** Number of decimal places for number inputs */
  decimals?: number;
  /** Input size */
  inputSize?: 'sm' | 'md' | 'lg';
  /** Full width */
  fullWidth?: boolean;
}

const SIZE_MAP = {
  sm: { height: '28px', fontSize: 'var(--text-small)' },
  md: { height: '32px', fontSize: 'var(--text-body)' },
  lg: { height: '36px', fontSize: 'var(--text-body)' },
};

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  type = 'text',
  label,
  error,
  required = false,
  hint,
  decimals,
  inputSize = 'md',
  fullWidth = true,
  style,
  ...props
}, ref) => {
  const hasError = Boolean(error);
  const s = SIZE_MAP[inputSize];
  const isNumber = type === 'number';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-xxs)',
      width: fullWidth ? '100%' : 'auto',
    }}>
      {/* Label */}
      {label && (
        <label style={{
          fontSize: 'var(--text-label)',
          fontWeight: 600,
          lineHeight: 'var(--line-label)',
          color: 'var(--color-text-primary)',
        }}>
          {label}
          {required && (
            <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>
          )}
        </label>
      )}

      {/* Input */}
      <input
        ref={ref}
        type={type === 'date' ? 'text' : type}
        step={isNumber && decimals ? `0.${'0'.repeat(decimals - 1)}1` : undefined}
        style={{
          height: s.height,
          padding: '0 var(--spacing-sm)',
          fontSize: s.fontSize,
          fontFamily: isNumber ? 'var(--font-mono)' : 'var(--font-family)',
          textAlign: isNumber ? 'right' : 'left',
          color: 'var(--color-text-primary)',
          background: props.disabled ? 'var(--color-disabled-bg)' : 'var(--color-surface)',
          border: `1px solid ${hasError ? 'var(--color-danger)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-sm)',
          outline: 'none',
          transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
          width: '100%',
          ...style,
        }}
        onFocus={(e) => {
          if (!hasError) {
            e.target.style.borderColor = 'var(--color-accent)';
            e.target.style.boxShadow = '0 0 0 2px var(--color-accent-light)';
          }
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.target.style.borderColor = hasError ? 'var(--color-danger)' : 'var(--color-border)';
          e.target.style.boxShadow = 'none';
          props.onBlur?.(e);
        }}
        {...props}
      />

      {/* Error Message */}
      {hasError && (
        <span style={{
          fontSize: 'var(--text-small)',
          color: 'var(--color-danger)',
          lineHeight: 'var(--line-small)',
        }}>
          {error}
        </span>
      )}

      {/* Hint */}
      {hint && !hasError && (
        <span style={{
          fontSize: 'var(--text-small)',
          color: 'var(--color-text-muted)',
          lineHeight: 'var(--line-small)',
        }}>
          {hint}
        </span>
      )}
    </div>
  );
});

Input.displayName = 'Input';
