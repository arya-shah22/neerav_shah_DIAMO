// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — DataGrid Component
// Phase 17.1 §10: Sortable, filterable, alternating rows, summary
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  mono?: boolean;
  render?: (row: T, index: number) => React.ReactNode;
  summaryValue?: string | number;
}

interface DataGridProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T & string;
  pageSize?: number;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: { label: string; onClick: () => void };
}

type SortDir = 'asc' | 'desc' | null;

function getRowValue(row: object, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

export function DataGrid<T extends object>({
  columns,
  data,
  keyField,
  pageSize = 25,
  onRowClick,
  loading = false,
  emptyTitle = 'No Records Found',
  emptyDescription = 'Adjust your filters or add a new record.',
  emptyAction,
}: DataGridProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);

  // Sort
  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const aVal = getRowValue(a, sortKey);
      const bVal = getRowValue(b, sortKey);
      if (aVal == null || bVal == null) return 0;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const pageData = sortedData.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'));
      if (sortDir === 'desc') setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const hasSummary = columns.some((c) => c.summaryValue !== undefined);

  if (!loading && data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }

  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--color-surface)' }}>
      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-label)' }}>
          {/* Header */}
          <thead>
            <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && toggleSort(col.key)}
                  style={{
                    padding: 'var(--spacing-sm)',
                    fontWeight: 600,
                    fontSize: 'var(--text-label)',
                    textAlign: col.align || 'left',
                    color: 'var(--color-text-secondary)',
                    cursor: col.sortable ? 'pointer' : 'default',
                    width: col.width,
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {col.header}
                    {col.sortable && (
                      sortKey === col.key
                        ? sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                        : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              // Skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skel-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key} style={{ padding: 'var(--spacing-sm)' }}>
                      <div className="skeleton" style={{ height: '14px', width: '70%', borderRadius: '3px' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              pageData.map((row, i) => (
                <tr
                  key={String(row[keyField])}
                  onClick={() => onRowClick?.(row)}
                  style={{
                    background: i % 2 === 1 ? 'var(--color-row-alt)' : 'var(--color-surface)',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background var(--transition-fast)',
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: 'var(--spacing-sm)',
                        textAlign: col.align || 'left',
                        fontFamily: col.mono ? 'var(--font-mono)' : 'var(--font-family)',
                        fontSize: col.mono ? 'var(--text-cell)' : 'var(--text-label)',
                        color: 'var(--color-text-primary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {col.render ? col.render(row, i) : String(getRowValue(row, col.key) ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>

          {/* Summary Row */}
          {hasSummary && !loading && (
            <tfoot>
              <tr style={{
                borderTop: '2px solid var(--color-primary)',
                background: 'var(--color-bg)',
                fontWeight: 700,
              }}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: 'var(--spacing-sm)',
                      textAlign: col.align || 'left',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--text-cell)',
                    }}
                  >
                    {col.summaryValue ?? ''}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination & Count */}
      {sortedData.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderTop: '1px solid var(--color-border)',
          fontSize: '13px',
          color: 'var(--color-text-secondary)',
          background: 'var(--color-surface)',
          borderBottomLeftRadius: '8px',
          borderBottomRightRadius: '8px'
        }}>
          <span style={{ fontWeight: 500 }}>
            Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sortedData.length)} of {sortedData.length} total records
          </span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-bg-card)',
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                  color: 'var(--color-text)',
                  opacity: page === 0 ? 0.4 : 1,
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-text)' }}>
                Page {page + 1} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  background: 'var(--color-bg-card)',
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  color: 'var(--color-text)',
                  opacity: page >= totalPages - 1 ? 0.4 : 1,
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
