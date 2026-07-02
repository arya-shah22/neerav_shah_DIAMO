// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Skeleton Loader
// Phase 17.1 §18: Pulsating gray placeholder blocks
// ═══════════════════════════════════════════════════════════════

import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  count?: number;
  gap?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '14px',
  borderRadius = 'var(--radius-sm)',
  count = 1,
  gap = 'var(--spacing-sm)',
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ width, height, borderRadius }}
        />
      ))}
    </div>
  );
};

/** Pre-built skeleton for table rows */
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 5,
  cols = 5,
}) => {
  return (
    <div style={{ padding: 'var(--spacing-md)' }}>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          style={{
            display: 'flex',
            gap: 'var(--spacing-md)',
            padding: 'var(--spacing-sm) 0',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="skeleton" style={{ flex: 1, height: '14px', borderRadius: '3px' }} />
          ))}
        </div>
      ))}
    </div>
  );
};

/** Pre-built skeleton for form fields */
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 6 }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 'var(--spacing-md)',
      padding: 'var(--spacing-md)',
    }}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
          <div className="skeleton" style={{ width: '80px', height: '12px', borderRadius: '3px' }} />
          <div className="skeleton" style={{ width: '100%', height: '32px', borderRadius: 'var(--radius-sm)' }} />
        </div>
      ))}
    </div>
  );
};
