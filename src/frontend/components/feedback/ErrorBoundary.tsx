// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Error Boundary
// Phase 17.2 §10: Wrap pages to prevent Electron crashes
// ═══════════════════════════════════════════════════════════════

import React, { Component, ErrorInfo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[DIAMO ERP] Uncaught error:', error, errorInfo);
    // In production: write to logs/error.log via IPC
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 'var(--spacing-2xl)',
          textAlign: 'center',
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-danger-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 'var(--spacing-md)',
          }}>
            <AlertTriangle size={32} color="var(--color-danger)" />
          </div>

          <h2 style={{
            fontSize: 'var(--text-title)',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            marginBottom: 'var(--spacing-xs)',
          }}>
            Something went wrong
          </h2>

          <p style={{
            fontSize: 'var(--text-body)',
            color: 'var(--color-text-muted)',
            maxWidth: '400px',
            marginBottom: 'var(--spacing-md)',
          }}>
            An unexpected error occurred. Please try again or contact your system administrator.
          </p>

          {this.state.error && (
            <pre style={{
              fontSize: 'var(--text-small)',
              fontFamily: 'var(--font-mono)',
              color: 'var(--color-danger)',
              background: 'var(--color-danger-light)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--radius-sm)',
              maxWidth: '500px',
              overflow: 'auto',
              marginBottom: 'var(--spacing-md)',
              textAlign: 'left',
            }}>
              {this.state.error.message}
            </pre>
          )}

          <button
            onClick={this.handleRetry}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              fontSize: 'var(--text-label)',
              fontWeight: 600,
              color: '#FFFFFF',
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
