// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Modal Component
// Phase 17.1 §12: Small(400), Medium(640), Large(960)
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Warn if user tries to close with unsaved changes */
  preventClose?: boolean;
}

const SIZE_MAP: Record<ModalSize, string> = {
  sm: '400px',
  md: '640px',
  lg: '960px',
  xl: '1140px',
  full: '95vw',
};

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  preventClose = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (preventClose) {
          if (window.confirm('You have unsaved changes. Discard them?')) {
            onClose();
          }
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, preventClose]);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Fixed full-screen wrapper to guarantee centering */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 'var(--z-overlay)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
        }}
      >
        {/* Backdrop */}
        <div
          onClick={() => !preventClose && onClose()}
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            animation: 'modal-fade-in var(--transition-normal) forwards',
          }}
        />

        {/* Modal Panel */}
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          style={{
            position: 'relative',
            width: SIZE_MAP[size],
            maxWidth: '95vw',
            maxHeight: '85vh',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 'var(--z-modal)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'modal-scale-in var(--transition-normal) forwards',
          }}
        >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--spacing-md)',
          borderBottom: '1px solid var(--color-border)',
          flexShrink: 0,
        }}>
          <h2 style={{
            fontSize: 'var(--text-heading)',
            fontWeight: 600,
            color: 'var(--color-text-primary)',
            margin: 0,
          }}>
            {title}
          </h2>
          <button
            onClick={() => {
              if (preventClose) {
                if (window.confirm('You have unsaved changes. Discard them?')) onClose();
              } else {
                onClose();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              border: 'none',
              background: 'transparent',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              color: 'var(--color-text-muted)',
              transition: 'background var(--transition-fast)',
            }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 'var(--spacing-md)',
        }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-md)',
            borderTop: '1px solid var(--color-border)',
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
      </div>
    </>,
    document.body,
  );
};
