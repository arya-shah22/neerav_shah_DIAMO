// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Financial Statements Page
// Phase 11.2: Balance Sheet, Profit & Loss, Trial Balance
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';

export const FinancialStatementsPage: React.FC = () => {
  const { activeCompany, companyId, isReady } = useActiveCompany();

  const [activeTab, setActiveTab] = useState<'TB' | 'PL' | 'BS'>('TB');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  // IPC Hooks
  const { data: tbData, loading: tbLoading, invoke: getTrialBalance } = useIpc<any>('report:trial-balance');
  const { data: plData, invoke: getProfitLoss } = useIpc<any>('report:profit-loss');
  const { data: bsData, invoke: getBalanceSheet } = useIpc<any>('report:balance-sheet');

  const refreshReports = useCallback(async () => {
    if (!companyId) return;

    if (activeTab === 'TB') {
      await getTrialBalance({ companyId, date: filterDate });
    } else if (activeTab === 'PL') {
      await getProfitLoss({ companyId, endDate: filterDate });
    } else if (activeTab === 'BS') {
      await getBalanceSheet({ companyId, date: filterDate });
    }
  }, [companyId, activeTab, filterDate, getTrialBalance, getProfitLoss, getBalanceSheet]);

  useEffect(() => {
    refreshReports();
  }, [refreshReports]);

  // Columns for Trial Balance
  const tbColumns: Column<any>[] = [
    { key: 'groupName', header: 'ACCOUNT GROUP', sortable: true },
    {
      key: 'debit',
      header: 'DEBIT (Dr)',
      align: 'right',
      render: (row) => row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—',
    },
    {
      key: 'credit',
      header: 'CREDIT (Cr)',
      align: 'right',
      render: (row) => row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—',
    },
  ];

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
  }

  const tabStyle = (tab: typeof activeTab) => ({
    padding: '8px 16px',
    border: 'none',
    background: activeTab === tab ? 'var(--color-primary)' : 'var(--color-surface)',
    color: activeTab === tab ? '#fff' : 'var(--color-text-primary)',
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
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Financial Statements</h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Compliance statements for {activeCompany?.companyName}
          </p>
        </div>
      </div>

      {/* Navigation and Date Filters */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={tabStyle('TB')} onClick={() => setActiveTab('TB')}>Trial Balance</button>
          <button style={tabStyle('PL')} onClick={() => setActiveTab('PL')}>Profit & Loss</button>
          <button style={tabStyle('BS')} onClick={() => setActiveTab('BS')}>Balance Sheet</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>As Of Date:</span>
          <Input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{ width: '160px', height: '32px' }}
          />
        </div>
      </div>

      {/* Tab Contents: Trial Balance */}
      {activeTab === 'TB' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
            <DataGrid
              columns={tbColumns}
              data={tbData?.groups || []}
              keyField="id"
              loading={tbLoading}
              emptyTitle="No Ledger Postings"
              emptyDescription="Save some business vouchers to generate Trial Balance."
            />
            {tbData && (
              <div style={{
                marginTop: '16px',
                paddingTop: '16px',
                borderTop: '2px solid var(--color-border)',
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                fontSize: '14px',
                fontWeight: 700,
                textAlign: 'right',
              }}>
                <span style={{ textAlign: 'left' }}>Total Balance:</span>
                <span>₹{Number(tbData.totalDebit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                <span>₹{Number(tbData.totalCredit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Contents: Profit & Loss Statement */}
      {activeTab === 'PL' && plData && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          {/* Revenue */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>1. REVENUE</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Sales Income:</span>
                <span style={{ fontWeight: 600 }}>₹{plData.revenue.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Job Work Income:</span>
                <span style={{ fontWeight: 600 }}>₹{plData.revenue.jobWorkIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border)', paddingTop: '6px', fontWeight: 700 }}>
                <span>Total Revenue (A):</span>
                <span>₹{plData.revenue.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Cost of Sales */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>2. COST OF SALES</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Purchases:</span>
                <span style={{ fontWeight: 600 }}>₹{plData.costOfGoods.purchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Job Work Expenses:</span>
                <span style={{ fontWeight: 600 }}>₹{plData.costOfGoods.jobWorkExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Direct Expenses:</span>
                <span style={{ fontWeight: 600 }}>₹{plData.costOfGoods.directExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border)', paddingTop: '6px', fontWeight: 700 }}>
                <span>Total Cost of Sales (B):</span>
                <span>₹{plData.costOfGoods.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Gross Margin */}
          <div style={{
            background: 'var(--color-row-alt)',
            padding: '12px 16px',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '15px',
            fontWeight: 700,
            color: 'var(--color-success)',
          }}>
            <span>GROSS PROFIT (A - B):</span>
            <span>₹{plData.grossProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          {/* Indirect Expenses */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>3. OPERATING EXPENSES</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Indirect & Operating Expenses:</span>
                <span style={{ fontWeight: 600 }}>₹{plData.expenses.operatingExpense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border)', paddingTop: '6px', fontWeight: 700 }}>
                <span>Total Operating Expenses (C):</span>
                <span>₹{plData.expenses.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Other Income */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-primary)' }}>4. OTHER INDIRECT INCOME</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '13px' }}>
              <span>Interest & Other Incomes (D):</span>
              <span style={{ fontWeight: 600 }}>₹{plData.otherIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Net Profit */}
          <div style={{
            background: 'var(--color-accent-light)',
            padding: '16px 20px',
            borderRadius: '6px',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '16px',
            fontWeight: 800,
            color: 'var(--color-accent)',
            border: '1px solid var(--color-accent)',
          }}>
            <span>NET PROFIT FOR THE PERIOD:</span>
            <span>₹{plData.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      {/* Tab Contents: Balance Sheet */}
      {activeTab === 'BS' && bsData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Liabilities & Capital column */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '2px solid var(--color-primary)', paddingBottom: '8px', color: 'var(--color-primary)' }}>LIABILITIES & CAPITAL</h3>
            
            {/* Capital accounts */}
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Capital & Reserves</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', fontSize: '13px' }}>
                {bsData.capital.map((c: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{c.groupName}</span>
                    <span style={{ fontWeight: 600 }}>₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Liability accounts */}
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Current & Non-Current Liabilities</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', fontSize: '13px' }}>
                {bsData.liabilities.map((l: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{l.groupName}</span>
                    <span style={{ fontWeight: 600 }}>₹{l.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              marginTop: 'auto',
              paddingTop: '16px',
              borderTop: '2px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '14px',
            }}>
              <span>Total Liabilities & Capital:</span>
              <span>₹{(bsData.totalLiabilities + bsData.totalCapital).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Assets column */}
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '8px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '2px solid var(--color-success)', paddingBottom: '8px', color: 'var(--color-success)' }}>ASSETS</h3>
            
            <div>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Assets schedule</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px', fontSize: '13px' }}>
                {bsData.assets.map((a: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{a.groupName}</span>
                    <span style={{ fontWeight: 600 }}>₹{a.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              marginTop: 'auto',
              paddingTop: '16px',
              borderTop: '2px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 700,
              fontSize: '14px',
            }}>
              <span>Total Assets:</span>
              <span>₹{bsData.totalAssets.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
