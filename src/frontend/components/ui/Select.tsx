// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Select / AutoComplete Component
// Phase 17.1 §9: Searchable dropdown with inline filter
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, X, Search } from 'lucide-react';

const OPTION_HEIGHT_PX = 32;

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
  /** Number of options visible before scrolling (default 10) */
  maxVisibleItems?: number;
  /** Allow entering custom values not present in the options list */
  creatable?: boolean;
  shortcutType?: string;
  shortcutGroup?: string;
}

interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
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
  maxVisibleItems = 10,
  creatable = false,
  shortcutType,
  shortcutGroup,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const normalizedPropValue = value == null ? '' : String(value);
  const [selectedValue, setSelectedValue] = useState(normalizedPropValue);
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition>({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: maxVisibleItems * OPTION_HEIGHT_PX,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectIdRef = useRef('sel-' + Math.random().toString(36).substring(2, 9));

  const listMaxHeight = maxVisibleItems * OPTION_HEIGHT_PX;

  const [tempOption, setTempOption] = useState<{ value: string; label: string } | null>(null);

  useEffect(() => {
    setSelectedValue(normalizedPropValue);
  }, [normalizedPropValue]);

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const handleSuccess = (e: Event) => {
      const { id, name, selectId } = (e as CustomEvent).detail;
      if (selectId === selectIdRef.current) {
        if (id && name) {
          setTempOption({ value: String(id), label: name });
        }
        setSelectedValue(String(id));
        onChange?.(String(id));
        setSearchText('');
        setIsOpen(false);
        // Put focus back to the trigger button
        setTimeout(() => trigger.focus(), 50);
      }
    };

    const handleShortcutTriggered = () => {
      setIsOpen(false);
      setSearchText('');
    };

    window.addEventListener('shortcut-master-success', handleSuccess);
    window.addEventListener('shortcut-triggered', handleShortcutTriggered);

    return () => {
      window.removeEventListener('shortcut-master-success', handleSuccess);
      window.removeEventListener('shortcut-triggered', handleShortcutTriggered);
    };
  }, [onChange]);

  const combinedOptions = useMemo(() => {
    if (tempOption && !options.some((o: SelectOption) => String(o.value) === tempOption.value)) {
      return [...options, tempOption];
    }
    return options;
  }, [options, tempOption]);

  // Find selected option, or fall back to treating value itself as label if not in list
  const selectedOption =
    combinedOptions.find((o: SelectOption) => String(o.value) === selectedValue) ||
    (selectedValue ? { value: selectedValue, label: selectedValue } : null);

  const filteredOptions = searchText
    ? combinedOptions.filter((o: SelectOption) => o.label.toLowerCase().includes(searchText.toLowerCase()))
    : combinedOptions;

  // Capitalize search text: "gujarat" -> "Gujarat"
  const capitalizedSearchText = searchText
    ? searchText
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : '';

  // Determine if we should show a creatable custom option row
  const showCreatableOption =
    creatable &&
    searchText.trim().length > 0 &&
    !combinedOptions.some((o: SelectOption) => o.label.toLowerCase() === searchText.trim().toLowerCase());

  const filteredOptionsWithCreatable = [...filteredOptions];
  if (showCreatableOption) {
    filteredOptionsWithCreatable.push({
      value: capitalizedSearchText,
      label: `+ Add "${capitalizedSearchText}"`,
    });
  }

  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const searchHeight = searchable ? 40 : 0;
    const desiredHeight = Math.min(
      listMaxHeight + searchHeight,
      filteredOptionsWithCreatable.length * OPTION_HEIGHT_PX + searchHeight,
    );
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openAbove = spaceBelow < desiredHeight && spaceAbove > spaceBelow;
    const availableSpace = openAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(OPTION_HEIGHT_PX * 3, Math.min(listMaxHeight, availableSpace - searchHeight));

    setDropdownPos({
      top: openAbove ? rect.top - maxHeight - searchHeight - 4 : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  }, [filteredOptionsWithCreatable.length, listMaxHeight, searchable]);

  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [isOpen, updateDropdownPosition]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const el = listRef.current.children[highlightedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex, isOpen]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
      setSearchText('');
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelectOption = (option: SelectOption) => {
    setSelectedValue(option.value);
    onChange?.(option.value);
    setIsOpen(false);
    setSearchText('');
  };

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
      setHighlightedIndex((prev) => Math.min(prev + 1, filteredOptionsWithCreatable.length - 1));
    } else if (e.key === 'ArrowUp') {
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && isOpen) {
      e.preventDefault();
      e.stopPropagation();
      const selected = filteredOptionsWithCreatable[highlightedIndex];
      if (selected) {
        handleSelectOption(selected);
      }
    }
  }, [isOpen, filteredOptionsWithCreatable, highlightedIndex, onChange]);

  const hasError = Boolean(error);

  const dropdownMenu = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: `${dropdownPos.top}px`,
        left: `${dropdownPos.left}px`,
        width: `${dropdownPos.width}px`,
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 1000000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
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
            data-select-id={selectIdRef.current}
            data-shortcut-type={shortcutType}
            data-shortcut-group={shortcutGroup}
            data-selected-value={selectedValue}
            data-search-text={searchText}
            value={searchText}
            onKeyDown={(evt) => {
              if (evt.key === 'Enter') {
                evt.preventDefault();
                evt.stopPropagation();
                const selected = filteredOptionsWithCreatable[highlightedIndex];
                if (selected) {
                  handleSelectOption(selected);
                }
              }
            }}
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

      <div
        ref={listRef}
        role="listbox"
        style={{
          maxHeight: `${dropdownPos.maxHeight}px`,
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-label)' }}>
            Loading...
          </div>
        ) : filteredOptionsWithCreatable.length === 0 ? (
          <div style={{ padding: 'var(--spacing-md)', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-label)' }}>
            No results found
          </div>
        ) : (
          filteredOptionsWithCreatable.map((option, i) => (
            <div
              key={option.value}
              role="option"
              aria-selected={String(option.value) === selectedValue}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSelectOption(option)}
              onMouseEnter={() => setHighlightedIndex(i)}
              style={{
                height: `${OPTION_HEIGHT_PX}px`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 var(--spacing-sm)',
                fontSize: 'var(--text-label)',
                cursor: 'pointer',
                background: String(option.value) === selectedValue
                  ? 'var(--color-accent-light)'
                  : i === highlightedIndex
                  ? 'var(--color-row-alt)'
                  : 'transparent',
                color: String(option.value) === selectedValue ? 'var(--color-accent)' : 'var(--color-text-primary)',
                fontWeight: String(option.value) === selectedValue ? 600 : 400,
              }}
            >
              {option.label}
            </div>
          ))
        )}
      </div>
    </div>
  ) : null;

  return (
    <div
      ref={containerRef}
      style={{ width: fullWidth ? '100%' : 'auto', position: 'relative' }}
      onKeyDown={handleKeyDown}
    >
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

      <button
        ref={triggerRef}
        type="button"
        data-select-id={selectIdRef.current}
        data-shortcut-type={shortcutType}
        data-shortcut-group={shortcutGroup}
        data-selected-value={selectedValue}
        disabled={disabled}
        aria-expanded={isOpen}
        onClick={() => {
          if (!disabled) {
            if (!isOpen) {
              updateDropdownPosition();
            }
            setIsOpen((open) => {
              const next = !open;
              if (next) {
                requestAnimationFrame(() => {
                  updateDropdownPosition();
                  if (searchable) inputRef.current?.focus();
                });
              }
              return next;
            });
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
          {clearable && selectedValue && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setSelectedValue('');
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

      {dropdownMenu && createPortal(dropdownMenu, document.body)}

      {hasError && (
        <span style={{ fontSize: 'var(--text-small)', color: 'var(--color-danger)', marginTop: '2px' }}>
          {error}
        </span>
      )}
    </div>
  );
};
