// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Outstanding & Aging Reports Page
// Phase 11.3: Age-wise Customer & Supplier Receivables/Payables
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { DataGrid, Column } from '../../components/ui/DataGrid';

interface IOutstandingEntry {
  id: number;
  accountName: string;
  creditDays: number;
  creditLimit: number;
  totalOutstanding: number;
  aging: {
    bucket_0_30: number;
    bucket_31_60: number;
    bucket_61_90: number;
    bucket_91_180: number;
    bucket_181_365: number;
    bucket_above_365: number;
  };
}

export const OutstandingReportPage: React.FC = () => {
  const { activeCompany, companyId, isReady } = useActiveCompany();
  
  const [reportType, setReportType] = useState<'RECEIVABLE' | 'PAYABLE'>('RECEIVABLE');

  const { data: outstandingList, loading, invoke: getOutstanding } = useIpc<IOutstandingEntry[]>('report:outstanding');

  const refreshReport = useCallback(async () => {
    if (!companyId) return;
    await getOutstanding({ companyId, type: reportType });
  }, [companyId, reportType, getOutstanding]);

  useEffect(() => {
    refreshReport();
  }, [refreshReport]);

  const columns: Column<IOutstandingEntry>[] = [
    { key: 'accountName', header: 'ACCOUNT NAME', sortable: true },
    {
      key: 'creditDays',
      header: 'CREDIT DAYS',
      render: (row) => `${row.creditDays || 0} Days`,
    },
    {
      key: 'creditLimit',
      header: 'CREDIT LIMIT',
      align: 'right',
      render: (row) => row.creditLimit > 0 ? `₹${row.creditLimit.toLocaleString('en-IN')}` : 'Unlimited',
    },
    {
      key: 'totalOutstanding',
      header: 'PENDING OUTSTANDING',
      align: 'right',
      render: (row) => (
        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
          ₹{row.totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: 'aging',
      header: 'AGING SLOTS (0-30 / 31-90 / >90 Days)',
      render: (row) => {
        const bucket30 = row.aging.bucket_0_30;
        const bucket90 = row.aging.bucket_31_60 + row.aging.bucket_61_90;
        const bucketAbove = row.aging.bucket_91_180 + row.aging.bucket_181_365 + row.aging.bucket_above_365;

        return (
          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontWeight: 600 }}>
            <span style={{ color: 'var(--color-success)', background: 'var(--color-success-light)', padding: '2px 6px', borderRadius: '4px' }}>
              ₹{bucket30.toLocaleString()}
            </span>
            <span style={{ color: 'var(--color-warning)', background: 'var(--color-warning-light)', padding: '2px 6px', borderRadius: '4px' }}>
              ₹{bucket90.toLocaleString()}
            </span>
            <span style={{ color: 'var(--color-danger)', background: 'var(--color-danger-light)', padding: '2px 6px', borderRadius: '4px' }}>
              ₹{bucketAbove.toLocaleString()}
            </span>
          </div>
        );
      },
    },
  ];

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
  }

  const tabStyle = (tab: typeof reportType) => ({
    padding: '8px 16px',
    border: 'none',
    background: reportType === tab ? 'var(--color-primary)' : 'var(--color-surface)',
    color: reportType === tab ? '#fff' : 'var(--color-text-primary)',
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'all 0.15s ease',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Outstanding Statements</h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Receivables and Payables aging status for {activeCompany?.companyName}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '16px',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={tabStyle('RECEIVABLE')} onClick={() => setReportType('RECEIVABLE')}>Receivables (Debtors)</button>
          <button style={tabStyle('PAYABLE')} onClick={() => setReportType('PAYABLE')}>Payables (Creditors)</button>
        </div>
      </div>

      {/* Report Summary Cards */}
      {outstandingList && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
              Total {reportType === 'RECEIVABLE' ? 'Receivable' : 'Payable'}
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>
              ₹{outstandingList.reduce((sum, item) => sum + item.totalOutstanding, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
              Due In 0-30 Days
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>
              ₹{outstandingList.reduce((sum, item) => sum + item.aging.bucket_0_30, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
              Overdue (&gt;30 Days)
            </span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-danger)', marginTop: '4px' }}>
              ₹{outstandingList.reduce((sum, item) => {
                const age = item.aging;
                return sum + (age.bucket_31_60 + age.bucket_61_90 + age.bucket_91_180 + age.bucket_181_365 + age.bucket_above_365);
              }, 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '20px',
      }}>
        <DataGrid
          columns={columns}
          data={outstandingList || []}
          keyField="id"
          loading={loading}
          emptyTitle={`No ${reportType === 'RECEIVABLE' ? 'debtors' : 'creditors'} outstanding`}
          emptyDescription={`All ${reportType === 'RECEIVABLE' ? 'customer' : 'supplier'} accounts are settled.`}
        />
      </div>
    </div>
  );
};
