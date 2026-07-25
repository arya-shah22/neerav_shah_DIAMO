// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Combobox (searchable + creatable dropdown)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

const OPTION_HEIGHT_PX = 32;

interface ComboboxProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  options: string[];
  placeholder?: string;
  hint?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Number of options visible before scrolling (default 10) */
  maxVisibleItems?: number;
}

export const Combobox: React.FC<ComboboxProps> = ({
  label,
  value = '',
  onChange,
  options,
  placeholder = 'Select or type...',
  hint,
  error,
  disabled = false,
  fullWidth = true,
  maxVisibleItems = 10,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [dropdownCoords, setDropdownCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const toggleCloseRef = useRef(false);

  const listMaxHeight = maxVisibleItems * OPTION_HEIGHT_PX;

  const updateCoords = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    setInputText(value);
  }, [value]);

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('resize', updateCoords);
      window.addEventListener('scroll', updateCoords, true);
      return () => {
        window.removeEventListener('resize', updateCoords);
        window.removeEventListener('scroll', updateCoords, true);
      };
    }
  }, [isOpen, updateCoords]);

  const filteredOptions = useMemo(() => {
    const query = inputText.trim().toLowerCase();
    if (!query) return options;
    return options.filter((opt) => opt.toLowerCase().includes(query));
  }, [inputText, options]);

  const commitValue = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      onChange?.(trimmed);
      setInputText(trimmed);
      setIsOpen(false);
    },
    [onChange],
  );

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        if (isOpen) {
          commitValue(inputText);
        }
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, inputText, commitValue]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      setHighlightedIndex((i) => Math.min(i + 1, filteredOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (isOpen && filteredOptions[highlightedIndex]) {
        commitValue(filteredOptions[highlightedIndex]);
      } else {
        commitValue(inputText);
      }
    } else if (e.key === 'Escape') {
      setInputText(value);
      setIsOpen(false);
    }
  };

  const hasError = Boolean(error);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-xxs)',
        width: fullWidth ? '100%' : 'auto',
        position: 'relative',
      }}
    >
      {label && (
        <label style={{
          fontSize: 'var(--text-label)',
          fontWeight: 600,
          lineHeight: 'var(--line-label)',
          color: 'var(--color-text-primary)',
        }}>
          {label}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => {
            setInputText(e.target.value);
            setHighlightedIndex(0);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (toggleCloseRef.current) {
              toggleCloseRef.current = false;
              return;
            }
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            height: '32px',
            padding: '0 28px 0 8px',
            fontSize: 'var(--text-body)',
            fontFamily: 'var(--font-family)',
            color: 'var(--color-text-primary)',
            background: disabled ? 'var(--color-disabled-bg)' : 'var(--color-surface)',
            border: `1px solid ${hasError ? 'var(--color-danger)' : isOpen ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-sm)',
            outline: 'none',
            boxShadow: isOpen ? '0 0 0 2px var(--color-accent-light)' : 'none',
          }}
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Close options' : 'Open options'}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            if (disabled) return;
            if (isOpen) {
              toggleCloseRef.current = true;
              setIsOpen(false);
              inputRef.current?.blur();
            } else {
              setIsOpen(true);
              inputRef.current?.focus();
            }
          }}
          style={{
            position: 'absolute',
            right: '4px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            border: 'none',
            background: 'transparent',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: 0,
          }}
        >
          <ChevronDown
            size={14}
            color="var(--color-text-muted)"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform var(--transition-fast)',
            }}
          />
        </button>

        {isOpen && !disabled && createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: 'fixed',
              top: `${dropdownCoords.top - window.scrollY}px`,
              left: `${dropdownCoords.left - window.scrollX}px`,
              width: `${dropdownCoords.width}px`,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
              zIndex: 99999,
              overflow: 'hidden',
            }}
          >
            <div
              ref={listRef}
              role="listbox"
              style={{
                maxHeight: `${listMaxHeight}px`,
                overflowY: 'auto',
                overflowX: 'hidden',
              }}
            >
              {filteredOptions.length === 0 ? (
                <div style={{
                  height: `${OPTION_HEIGHT_PX}px`,
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  fontSize: 'var(--text-label)',
                  color: 'var(--color-text-muted)',
                }}>
                  {inputText.trim() ? `Use "${inputText.trim()}"` : 'No shapes found'}
                </div>
              ) : (
                filteredOptions.map((option, index) => (
                  <div
                    key={option}
                    role="option"
                    aria-selected={option === value}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => commitValue(option)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    style={{
                      height: `${OPTION_HEIGHT_PX}px`,
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 10px',
                      fontSize: 'var(--text-body)',
                      color: option === value ? 'var(--color-accent)' : 'var(--color-text-primary)',
                      fontWeight: option === value ? 600 : 400,
                      background: index === highlightedIndex ? 'var(--color-row-alt)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background var(--transition-fast)',
                    }}
                  >
                    {option}
                  </div>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
      </div>

      {hasError && (
        <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-danger)' }}>{error}</span>
      )}
      {hint && !hasError && (
        <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-text-muted)' }}>{hint}</span>
      )}
    </div>
  );
};
