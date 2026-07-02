// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Toast Notification System
// Phase 17.1 §19: Slide-in from top-right, auto-dismiss 4s
// ═══════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const VARIANT_CONFIG: Record<ToastVariant, { icon: React.ReactNode; bg: string; border: string; color: string }> = {
  success: {
    icon: <CheckCircle2 size={16} />,
    bg: 'var(--color-success-light)',
    border: 'var(--color-success)',
    color: '#065F46',
  },
  error: {
    icon: <XCircle size={16} />,
    bg: 'var(--color-danger-light)',
    border: 'var(--color-danger)',
    color: '#991B1B',
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    bg: 'var(--color-warning-light)',
    border: 'var(--color-warning)',
    color: '#92400E',
  },
  info: {
    icon: <Info size={16} />,
    bg: 'var(--color-info-light)',
    border: 'var(--color-info)',
    color: '#075985',
  },
};

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  const cfg = VARIANT_CONFIG[toast.variant];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-sm)',
      padding: 'var(--spacing-sm) var(--spacing-md)',
      background: cfg.bg,
      borderLeft: `3px solid ${cfg.border}`,
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-md)',
      color: cfg.color,
      fontSize: 'var(--text-label)',
      fontWeight: 500,
      minWidth: '280px',
      maxWidth: '400px',
      animation: 'toast-slide-in var(--transition-normal) forwards',
    }}>
      {cfg.icon}
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          display: 'flex',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: cfg.color,
          opacity: 0.6,
          padding: 0,
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info', duration = 4000) => {
    const id = `toast-${++counterRef.current}`;
    const newToast: Toast = { id, message, variant, duration };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => dismissToast(id), duration);
    }
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container — top-right */}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          top: 'calc(var(--header-height) + var(--spacing-sm))',
          right: 'var(--spacing-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-sm)',
          zIndex: 500,
        }}>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};
