// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Input Component
// Phase 17.1 §9: Text, Number, Date inputs with validation states
// ═══════════════════════════════════════════════════════════════

import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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

export const Input = React.memo(forwardRef<HTMLInputElement, InputProps>(({
  type = 'text',
  label,
  error,
  required = false,
  hint,
  decimals,
  inputSize = 'md',
  fullWidth = true,
  style,
  onFocus,
  onBlur,
  onWheel,
  ...props
}, ref) => {
  const hasError = Boolean(error);
  const s = SIZE_MAP[inputSize];
  const isNumber = type === 'number';
  const isPasswordType = type === 'password';
  const [showPassword, setShowPassword] = useState(false);

  // Dynamic input type for password visibility toggle
  const actualType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

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

      {/* Input Wrapper for Eye Icon positioning */}
      <div style={{ position: 'relative', width: '100%' }}>
        <input
          ref={ref}
          type={actualType}
          step={isNumber && decimals ? `0.${'0'.repeat(decimals - 1)}1` : undefined}
          style={{
            height: s.height,
            padding: isPasswordType ? '0 32px 0 var(--spacing-sm)' : '0 var(--spacing-sm)',
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
            e.currentTarget.style.borderColor = hasError ? 'var(--color-danger)' : 'var(--color-accent)';
            e.currentTarget.style.boxShadow = hasError ? 'none' : '0 0 0 2px var(--color-accent-light)';
            onFocus?.(e);
          }}
          onWheel={(e) => {
            // Prevent accidental value changes on mouse wheel for number inputs.
            if (isNumber) {
              (e.currentTarget as HTMLElement).blur();
              e.preventDefault();
            }
            onWheel?.(e);
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = hasError ? 'var(--color-danger)' : 'var(--color-border)';
            e.currentTarget.style.boxShadow = 'none';
            onBlur?.(e);
          }}
          {...props}
        />

        {/* Eye toggle button for password fields */}
        {isPasswordType && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
            title={showPassword ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
              outline: 'none',
            }}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>

      {/* Error or Hint Text */}
      {hasError && (
        <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-danger)', marginTop: '2px' }}>
          {error}
        </span>
      )}
      {!hasError && hint && (
        <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
          {hint}
        </span>
      )}
    </div>
  );
}));

Input.displayName = 'Input';
