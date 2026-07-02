// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — DateInput Component
// Supports manual text entry (DD/MM/YYYY) and native calendar picker
// ═══════════════════════════════════════════════════════════════

import React, { forwardRef, useCallback, useEffect, useId, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
}

/** Convert YYYY-MM-DD → DD/MM/YYYY for display */
export function toDisplayDate(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Parse DD/MM/YYYY or YYYY-MM-DD → YYYY-MM-DD */
export function parseToIsoDate(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = dmy[1].padStart(2, '0');
    const month = dmy[2].padStart(2, '0');
    const year = dmy[3];
    return `${year}-${month}-${day}`;
  }

  return null;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(({
  label,
  error,
  hint,
  value = '',
  onChange,
  onBlur,
  disabled,
  required,
  placeholder = 'DD/MM/YYYY',
  id: externalId,
  ...props
}, _ref) => {
  const generatedId = useId();
  const inputId = externalId || generatedId;
  const pickerRef = useRef<HTMLInputElement>(null);
  const [textValue, setTextValue] = useState(() => toDisplayDate(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setTextValue(toDisplayDate(value));
    }
  }, [value, isFocused]);

  const emitChange = useCallback((iso: string) => {
    onChange?.(iso);
  }, [onChange]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTextValue(e.target.value);
  };

  const handleTextBlur = () => {
    setIsFocused(false);
    const iso = parseToIsoDate(textValue);
    if (iso) {
      setTextValue(toDisplayDate(iso));
      emitChange(iso);
    } else if (!textValue.trim()) {
      emitChange('');
    } else {
      // Invalid — revert to last valid value
      setTextValue(toDisplayDate(value));
    }
    onBlur?.();
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    setTextValue(toDisplayDate(iso));
    emitChange(iso);
  };

  const openPicker = () => {
    if (disabled) return;
    pickerRef.current?.showPicker?.();
    pickerRef.current?.focus();
  };

  const hasError = Boolean(error);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xxs)', width: '100%' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            fontSize: 'var(--text-label)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
          }}
        >
          {label}
          {required && <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {/* Manual text entry */}
        <input
          id={inputId}
          type="text"
          value={textValue}
          onChange={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleTextBlur}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            flex: 1,
            height: '32px',
            padding: '0 36px 0 var(--spacing-sm)',
            fontSize: 'var(--text-body)',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-primary)',
            background: disabled ? 'var(--color-disabled-bg)' : 'var(--color-surface)',
            border: `1px solid ${hasError ? 'var(--color-danger)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-sm)',
            outline: 'none',
            width: '100%',
          }}
          {...props}
        />

        {/* Hidden native date picker */}
        <input
          ref={pickerRef}
          type="date"
          value={value || ''}
          onChange={handlePickerChange}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden
          style={{
            position: 'absolute',
            right: '36px',
            width: '1px',
            height: '1px',
            opacity: 0,
            pointerEvents: 'none',
          }}
        />

        {/* Calendar button */}
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled}
          title="Open calendar"
          style={{
            position: 'absolute',
            right: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            border: 'none',
            background: 'transparent',
            borderRadius: 'var(--radius-sm)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            color: 'var(--color-accent)',
          }}
        >
          <Calendar size={16} />
        </button>
      </div>

      {hasError && (
        <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-danger)' }}>{error}</span>
      )}
      {hint && !hasError && (
        <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)' }}>{hint}</span>
      )}
    </div>
  );
});

DateInput.displayName = 'DateInput';
