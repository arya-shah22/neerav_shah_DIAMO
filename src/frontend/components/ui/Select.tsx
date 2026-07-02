// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Select / AutoComplete Component
// Phase 17.1 §9: Searchable dropdown with inline filter
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  required = false,
  error,
  disabled = false,
  searchable = true,
  clearable = true,
  fullWidth = true,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const filteredOptions = searchText
    ? options.filter((o) => o.label.toLowerCase().includes(searchText.toLowerCase()))
    : options;

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchText('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen && (e.key === 'Enter' || e.key === 'ArrowDown')) {
      setIsOpen(true);
      return;
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      setSearchText('');
      return;
    }
    if (e.key === 'ArrowDown') {
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && isOpen) {
      const selected = filteredOptions[highlightedIndex];
      if (selected) {
        onChange?.(selected.value);
        setIsOpen(false);
        setSearchText('');
      }
    }
  }, [isOpen, filteredOptions, highlightedIndex, onChange]);

  const hasError = Boolean(error);

  return (
    <div
      ref={containerRef}
      style={{ width: fullWidth ? '100%' : 'auto', position: 'relative' }}
      onKeyDown={handleKeyDown}
    >
      {/* Label */}
      {label && (
        <label style={{
          display: 'block',
          fontSize: 'var(--text-label)',
          fontWeight: 600,
          lineHeight: 'var(--line-label)',
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--spacing-xxs)',
        }}>
          {label}
          {required && <span style={{ color: 'var(--color-danger)', marginLeft: '2px' }}>*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          height: '32px',
          padding: '0 var(--spacing-sm)',
          fontSize: 'var(--text-body)',
          color: selectedOption ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
          background: disabled ? 'var(--color-disabled-bg)' : 'var(--color-surface)',
          border: `1px solid ${hasError ? 'var(--color-danger)' : isOpen ? 'var(--color-accent)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-sm)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          fontFamily: 'var(--font-family)',
          textAlign: 'left',
          boxShadow: isOpen ? '0 0 0 2px var(--color-accent-light)' : 'none',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {clearable && value && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange?.('');
              }}
              style={{ cursor: 'pointer', display: 'flex' }}
            >
              <X size={12} color="var(--color-text-muted)" />
            </span>
          )}
          <ChevronDown
            size={14}
            color="var(--color-text-muted)"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-fast)' }}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: '4px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 'var(--z-dropdown)',
          maxHeight: '240px',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Search input */}
          {searchable && (
            <div style={{
              padding: 'var(--spacing-xs)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
            }}>
              <Search size={12} color="var(--color-text-muted)" />
              <input
                ref={inputRef}
                type="text"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Search..."
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  fontSize: 'var(--text-label)',
                  fontFamily: 'var(--font-family)',
                  background: 'transparent',
                  color: 'var(--color-text-primary)',
                }}
              />
            </div>
          )}

          {/* Options list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-label)' }}>
                Loading...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-label)' }}>
                No results found
              </div>
            ) : (
              filteredOptions.map((option, i) => (
                <div
                  key={option.value}
                  onClick={() => {
                    onChange?.(option.value);
                    setIsOpen(false);
                    setSearchText('');
                  }}
                  style={{
                    padding: 'var(--spacing-xs) var(--spacing-sm)',
                    fontSize: 'var(--text-label)',
                    cursor: 'pointer',
                    background: option.value === value
                      ? 'var(--color-accent-light)'
                      : i === highlightedIndex
                      ? 'var(--color-row-alt)'
                      : 'transparent',
                    color: option.value === value ? 'var(--color-accent)' : 'var(--color-text-primary)',
                    fontWeight: option.value === value ? 600 : 400,
                  }}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {hasError && (
        <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-danger)', marginTop: '2px' }}>
          {error}
        </span>
      )}
    </div>
  );
};
