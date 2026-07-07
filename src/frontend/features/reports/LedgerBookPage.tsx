// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Ledger Book Page
// Phase 11.1: General Ledger & Ledger Statement
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Printer } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Input, Select, useToast } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { PrintTemplate } from '../../components/ui/PrintTemplate';

interface ILedgerStatement {
  id: number;
  voucherDate: string;
  sourceVoucherType: string;
  sourceVoucherId: number;
  sourceBillNumber: string | null;
  debitCreditType: 'DEBIT' | 'CREDIT';
  amount: number;
  narration: string | null;
  runningBalance: number;
}

interface ILedgerResponse {
  accountName: string;
  openingBalance: number;
  statements: ILedgerStatement[];
  closingBalance: number;
}

export const LedgerBookPage: React.FC = () => {
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const { showToast } = useToast();
  
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [printData, setPrintData] = useState<any>(null);

  // Fetch accounts list to populate dropdown
  const { data: accountsRaw, invoke: fetchAccounts } = useIpc<any[]>('account:search');
  const { data: ledgerData, loading, invoke: getLedger } = useIpc<ILedgerResponse>('report:ledger');

  const refreshAccounts = useCallback(async () => {
    if (!companyId) return;
    await fetchAccounts({ companyId });
  }, [companyId, fetchAccounts]);

  useEffect(() => {
    refreshAccounts();
  }, [refreshAccounts]);

  const accountOptions = useMemo(() => {
    return (accountsRaw || []).map((acc) => {
      const groupName = acc.accountGroup?.groupName;
      return {
        value: String(acc.id),
        label: groupName ? `${acc.accountName} (${groupName})` : acc.accountName,
      };
    });
  }, [accountsRaw]);

  const loadLedger = useCallback(async () => {
    if (!companyId || !selectedAccountId) return;
    const res = await getLedger({
      companyId,
      accountId: Number(selectedAccountId),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    if (!res.success) {
      showToast(res.error || 'Failed to fetch ledger', 'error');
    }
  }, [companyId, selectedAccountId, startDate, endDate, getLedger, showToast]);

  useEffect(() => {
    if (selectedAccountId) {
      loadLedger();
    }
  }, [selectedAccountId, startDate, endDate, loadLedger]);

  const columns: Column<ILedgerStatement>[] = [
    {
      key: 'voucherDate',
      header: 'DATE',
      render: (row) => new Date(row.voucherDate).toLocaleDateString('en-IN'),
    },
    {
      key: 'sourceVoucherType',
      header: 'VOUCHER TYPE',
      render: (row) => row.sourceVoucherType.replace('_', ' '),
    },
    {
      key: 'sourceBillNumber',
      header: 'REF / BILL NO',
      render: (row) => row.sourceBillNumber || '—',
    },
    {
      key: 'narration',
      header: 'NARRATION',
      render: (row) => row.narration || '—',
    },
    {
      key: 'debit',
      header: 'DEBIT (Dr)',
      align: 'right',
      render: (row) =>
        row.debitCreditType === 'DEBIT'
          ? `₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
          : '—',
    },
    {
      key: 'credit',
      header: 'CREDIT (Cr)',
      align: 'right',
      render: (row) =>
        row.debitCreditType === 'CREDIT'
          ? `₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
          : '—',
    },
    {
      key: 'runningBalance',
      header: 'BALANCE',
      align: 'right',
      render: (row) => (
        <span style={{ fontWeight: 600, color: row.runningBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
          ₹{Math.abs(row.runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {row.runningBalance >= 0 ? 'Dr' : 'Cr'}
        </span>
      ),
    },
  ];

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
  }

  // Prepares printable layout mapping
  const handlePrint = () => {
    if (!ledgerData) return;
    setPrintData({
      voucherNumber: `GL-${selectedAccountId}`,
      invoiceDate: new Date(),
      party: { accountName: ledgerData.accountName },
      items: ledgerData.statements.map((st) => ({
        quality: { qualityName: st.sourceVoucherType.replace('_', ' ') },
        hsnNumber: st.sourceBillNumber || '—',
        carats: st.debitCreditType === 'DEBIT' ? st.amount : 0, // Mock columns to map A4 table nicely
        pieces: st.debitCreditType === 'CREDIT' ? st.amount : 0,
        rate: st.runningBalance,
        grossAmount: st.amount,
      })),
      netAmount: ledgerData.closingBalance,
      narration: `Statement Period: ${startDate || 'Inception'} to ${endDate || 'Today'}. Opening Balance: ₹${ledgerData.openingBalance.toLocaleString()}`,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>General Ledger Book</h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Account statements for {activeCompany?.companyName}
          </p>
        </div>
        {ledgerData && (
          <Button variant="primary" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print Ledger
          </Button>
        )}
      </div>

      {/* Filters Grid */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '16px',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        gap: '16px',
        alignItems: 'end',
      }}>
        <Select
          label="Select Account"
          options={accountOptions}
          value={selectedAccountId}
          onChange={(val) => setSelectedAccountId(val)}
          placeholder="Choose ledger account..."
        />
        <Input
          type="date"
          label="Start Date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          type="date"
          label="End Date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      {/* Account Info Cards */}
      {ledgerData && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Opening Balance</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: ledgerData.openingBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)', marginTop: '4px' }}>
              ₹{Math.abs(ledgerData.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledgerData.openingBalance >= 0 ? 'Dr' : 'Cr'}
            </div>
          </div>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Closing Balance</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: ledgerData.closingBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)', marginTop: '4px' }}>
              ₹{Math.abs(ledgerData.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledgerData.closingBalance >= 0 ? 'Dr' : 'Cr'}
            </div>
          </div>
        </div>
      )}

      {/* Statements Grid */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '20px',
      }}>
        <DataGrid
          columns={columns}
          data={ledgerData?.statements || []}
          keyField="id"
          loading={loading}
          emptyTitle="No Ledger Entries"
          emptyDescription={selectedAccountId ? "No transaction records found for the selected period." : "Select an account to view General Ledger statement."}
        />
      </div>

      {printData && (
        <PrintTemplate
          type="INVOICE" // Uses formatted list style columns
          data={printData}
          onClose={() => setPrintData(null)}
        />
      )}
    </div>
  );
};
