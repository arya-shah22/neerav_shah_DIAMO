// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Ledger Book Page (Upgraded to Multi-Account Statement & Print Selector)
// Phase 11.1: General Ledger Book & Statements with Aging Details
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Printer, Search, Check, X, ShieldAlert, ArrowLeft, FileText } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Button, Input, useToast } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';

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
  accountId: number;
  accountName: string;
  phone: string;
  address: string;
  groupName: string;
  openingBalance: number;
  statements: ILedgerStatement[];
  closingBalance: number;
}

export const LedgerBookPage: React.FC = () => {
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const { showToast } = useToast();
  
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [onePartyPerPage, setOnePartyPerPage] = useState(true);
  const [showPagePartyModal, setShowPagePartyModal] = useState(false);

  // Fetch accounts list to populate dropdown / modal
  const { data: accountsRaw, invoke: fetchAccounts } = useIpc<any[]>('account:search');
  const { data: ledgerStatements, loading, invoke: getLedger } = useIpc<ILedgerResponse[]>('report:ledger');

  const refreshAccounts = useCallback(async () => {
    if (!companyId) return;
    await fetchAccounts({ companyId });
  }, [companyId, fetchAccounts]);

  useEffect(() => {
    refreshAccounts();
  }, [refreshAccounts]);

  // Load statements for all selected accounts
  const loadLedgers = useCallback(async () => {
    if (!companyId) return;
    if (selectedAccountIds.length === 0) {
      return;
    }
    const res = await getLedger({
      companyId,
      accountId: selectedAccountIds,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    if (!res.success) {
      showToast(res.error || 'Failed to fetch ledger statements', 'error');
    }
  }, [companyId, selectedAccountIds, startDate, endDate, getLedger, showToast]);

  useEffect(() => {
    loadLedgers();
  }, [selectedAccountIds, startDate, endDate, loadLedgers]);

  // Filter accounts for the modal selection list
  const filteredAccounts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!accountsRaw) return [];
    return accountsRaw.filter(acc => {
      const nameMatch = acc.accountName.toLowerCase().includes(query);
      const groupMatch = acc.accountGroup?.groupName?.toLowerCase().includes(query);
      return nameMatch || groupMatch;
    });
  }, [accountsRaw, searchQuery]);

  // Selected account names summary helper
  const selectedAccountsSummary = useMemo(() => {
    if (selectedAccountIds.length === 0) return 'No accounts selected';
    if (!accountsRaw) return `${selectedAccountIds.length} selected`;
    const selectedNames = accountsRaw
      .filter(acc => selectedAccountIds.includes(acc.id))
      .map(acc => acc.accountName);
    if (selectedNames.length <= 3) return selectedNames.join(', ');
    return `${selectedNames.slice(0, 3).join(', ')} and ${selectedNames.length - 3} others`;
  }, [selectedAccountIds, accountsRaw]);

  // Select/deselect account handlers
  const handleToggleAccount = (id: number) => {
    setSelectedAccountIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (!accountsRaw) return;
    setSelectedAccountIds(accountsRaw.map(acc => acc.id));
  };

  const handleClearSelection = () => {
    setSelectedAccountIds([]);
  };

  // Quick filter to show all outstanding customer/vendor ledger accounts
  const handleShowAllOutstanding = async () => {
    if (!accountsRaw || !companyId) return;
    const targetAccounts = accountsRaw.filter(acc => {
      const grp = acc.accountGroup?.groupName?.toLowerCase() || '';
      return grp.includes('debtors') || grp.includes('creditors') || grp.includes('customer') || grp.includes('supplier');
    });
    setSelectedAccountIds(targetAccounts.map(acc => acc.id));
    setIsModalOpen(false);
  };

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

  const triggerDirectPrint = () => {
    setShowPrintModal(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportPDF = async () => {
    setShowPrintPreview(true);
    setTimeout(async () => {
      try {
        const res = await window.api.invoke('system:print-to-pdf', {
          filename: `Ledger_Statement_${new Date().toISOString().split('T')[0]}.pdf`
        }) as any;
        if (res && !res.success && res.error !== 'Cancelled') {
          alert(res.error || 'Failed to export PDF');
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setShowPrintPreview(false);
      }
    }, 100);
  };

  // Render Print Preview Mode
  if (showPrintPreview && activeCompany && ledgerStatements && ledgerStatements.length > 0) {
    const paginatedPages: any[][] = [];
    let currentPageList: any[] = [];
    let currentHeight = 0;

    ledgerStatements.forEach((ledger) => {
      const estimatedHeight = 130 + (ledger.statements.length * 32) + 70;
      if (currentPageList.length > 0 && currentHeight + estimatedHeight > 850) {
        paginatedPages.push(currentPageList);
        currentPageList = [ledger];
        currentHeight = estimatedHeight;
      } else {
        currentPageList.push(ledger);
        currentHeight += estimatedHeight;
      }
    });
    if (currentPageList.length > 0) {
      paginatedPages.push(currentPageList);
    }

    return (
      <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 portrait; margin: 15mm; }
            body { background: #ffffff; padding: 0; margin: 0; }
            .no-print { display: none !important; }
            .print-page { padding: 0 !important; border: none !important; margin: 0 !important; width: 100% !important; max-width: 100% !important; box-shadow: none !important; }
            .page-break { page-break-after: always; break-after: page; }
          }
        `}} />
        
        {/* Preview Toolbar */}
        <div className="no-print" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '20px', 
          padding: '12px 24px', 
          background: 'var(--color-surface)', 
          border: '1px solid var(--color-border)', 
          borderRadius: '8px' 
        }}>
          <Button variant="ghost" onClick={() => setShowPrintPreview(false)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Page
          </Button>
          <Button variant="primary" onClick={triggerDirectPrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print / Save PDF
          </Button>
        </div>

        {/* Printable portrait sheets */}
        <div id="print-area">
          {onePartyPerPage ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {ledgerStatements.map((ledger, idx) => {
                const isDr = ledger.closingBalance >= 0;
                return (
                  <div 
                    key={ledger.accountId}
                    className={idx < ledgerStatements.length - 1 ? 'page-break print-page' : 'print-page'}
                    style={{
                      background: '#ffffff',
                      border: '1px solid var(--color-border)',
                      borderRadius: '4px',
                      padding: '20mm',
                      width: '210mm',
                      minHeight: '297mm',
                      margin: '0 auto',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                      color: '#1e293b',
                      boxSizing: 'border-box',
                    }}
                  >
                    {/* Header */}
                    <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
                      <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                        {activeCompany.companyName}
                      </h2>
                      <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '11px' }}>
                        {activeCompany.addressLine1} {activeCompany.addressLine2 && `, ${activeCompany.addressLine2}`} | {activeCompany.city} - {activeCompany.pincode}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '12px', fontWeight: 600 }}>
                        <span style={{ color: 'var(--color-primary)' }}>LEDGER STATEMENT: {ledger.accountName.toUpperCase()}</span>
                        <span>PERIOD: {startDate || 'INCEPTION'} TO {endDate || 'TODAY'}</span>
                      </div>
                    </div>

                    {/* Account Details and Outstanding */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px' }}>
                      <div>
                        {ledger.phone && <div><strong>Phone:</strong> {ledger.phone}</div>}
                        {ledger.address && <div style={{ marginTop: '2px' }}><strong>Address:</strong> {ledger.address}</div>}
                        <div style={{ marginTop: '2px' }}><strong>Account Group:</strong> {ledger.groupName}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Opening:</span> ₹{Math.abs(ledger.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledger.openingBalance >= 0 ? 'Dr' : 'Cr'}
                        <div style={{ fontSize: '15px', fontWeight: 800, color: isDr ? '#059669' : '#dc2626', marginTop: '4px' }}>
                          <strong>Closing Balance:</strong> ₹{Math.abs(ledger.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {isDr ? 'Dr' : 'Cr'}
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                          <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
                          <th style={{ textAlign: 'left', padding: '8px' }}>Voucher Type</th>
                          <th style={{ textAlign: 'left', padding: '8px' }}>Ref No</th>
                          <th style={{ textAlign: 'left', padding: '8px' }}>Narration</th>
                          <th style={{ textAlign: 'right', padding: '8px' }}>Debit (Dr)</th>
                          <th style={{ textAlign: 'right', padding: '8px' }}>Credit (Cr)</th>
                          <th style={{ textAlign: 'right', padding: '8px' }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.statements.map((st, sidx) => (
                          <tr key={sidx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ padding: '8px' }}>{new Date(st.voucherDate).toLocaleDateString('en-IN')}</td>
                            <td style={{ padding: '8px' }}>{st.sourceVoucherType.replace('_', ' ')}</td>
                            <td style={{ padding: '8px' }}>{st.sourceBillNumber || '—'}</td>
                            <td style={{ padding: '8px' }}>{st.narration || '—'}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{st.debitCreditType === 'DEBIT' ? `₹${st.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{st.debitCreditType === 'CREDIT' ? `₹${st.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>₹{Math.abs(st.runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {st.runningBalance >= 0 ? 'Dr' : 'Cr'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {paginatedPages.map((pageLedgers, pidx) => (
                <div 
                  key={pidx}
                  className={pidx < paginatedPages.length - 1 ? 'page-break print-page' : 'print-page'}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--color-border)',
                    borderRadius: '4px',
                    padding: '20mm',
                    width: '210mm',
                    minHeight: '297mm',
                    margin: '0 auto',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                    color: '#1e293b',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Shared Company Header on Each Page */}
                  <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                      {activeCompany.companyName}
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '11px' }}>
                      {activeCompany.addressLine1} {activeCompany.addressLine2 && `, ${activeCompany.addressLine2}`} | {activeCompany.city} - {activeCompany.pincode}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '12px', fontWeight: 600 }}>
                      <span style={{ color: 'var(--color-primary)' }}>CONSOLIDATED LEDGER STATEMENT (PAGE {pidx + 1} OF {paginatedPages.length})</span>
                      <span>PERIOD: {startDate || 'INCEPTION'} TO {endDate || 'TODAY'}</span>
                    </div>
                  </div>

                  {/* List of Party Ledgers Allocated to this page */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {pageLedgers.map((ledger) => {
                      const isDr = ledger.closingBalance >= 0;
                      return (
                        <div 
                          key={ledger.accountId}
                          style={{
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '16px',
                            background: '#ffffff',
                          }}
                        >
                          {/* Party Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-primary)' }}>{ledger.accountName.toUpperCase()}</span>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{ledger.groupName}</span>
                          </div>

                          {/* Details & Balances */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '12px', background: '#f8fafc', padding: '8px 12px', borderRadius: '4px' }}>
                            <div>
                              {ledger.phone && <div><strong>Phone:</strong> {ledger.phone}</div>}
                              {ledger.address && <div style={{ marginTop: '2px' }}><strong>Address:</strong> {ledger.address}</div>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div><strong>Opening:</strong> ₹{Math.abs(ledger.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledger.openingBalance >= 0 ? 'Dr' : 'Cr'}</div>
                              <div style={{ fontWeight: 700, color: isDr ? '#059669' : '#dc2626', marginTop: '2px' }}>
                                <strong>Closing:</strong> ₹{Math.abs(ledger.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {isDr ? 'Dr' : 'Cr'}
                              </div>
                            </div>
                          </div>

                          {/* Transactions Table */}
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #0f172a', fontWeight: 700 }}>
                                <th style={{ textAlign: 'left', padding: '6px' }}>Date</th>
                                <th style={{ textAlign: 'left', padding: '6px' }}>Voucher Type</th>
                                <th style={{ textAlign: 'left', padding: '6px' }}>Ref No</th>
                                <th style={{ textAlign: 'left', padding: '6px' }}>Narration</th>
                                <th style={{ textAlign: 'right', padding: '6px' }}>Debit (Dr)</th>
                                <th style={{ textAlign: 'right', padding: '6px' }}>Credit (Cr)</th>
                                <th style={{ textAlign: 'right', padding: '6px' }}>Balance</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ledger.statements.map((st: any, sidx: number) => (
                                <tr key={sidx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                  <td style={{ padding: '6px' }}>{new Date(st.voucherDate).toLocaleDateString('en-IN')}</td>
                                  <td style={{ padding: '6px' }}>{st.sourceVoucherType.replace('_', ' ')}</td>
                                  <td style={{ padding: '6px' }}>{st.sourceBillNumber || '—'}</td>
                                  <td style={{ padding: '6px' }}>{st.narration || '—'}</td>
                                  <td style={{ padding: '6px', textAlign: 'right' }}>{st.debitCreditType === 'DEBIT' ? `₹${st.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                                  <td style={{ padding: '6px', textAlign: 'right' }}>{st.debitCreditType === 'CREDIT' ? `₹${st.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}</td>
                                  <td style={{ padding: '6px', textAlign: 'right', fontWeight: 600 }}>₹{Math.abs(st.runningBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {st.runningBalance >= 0 ? 'Dr' : 'Cr'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      
      {/* CSS for print media layout breaks */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        }
      `}} />

      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Outstanding & General Ledger Book</h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Account statements for {activeCompany?.companyName}
          </p>
        </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} /> Export PDF
            </Button>
            <Button variant="primary" onClick={() => setShowPagePartyModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} /> Print Statement
            </Button>
          </div>
      </div>

      {/* Filters Grid */}
      <div className="no-print" style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '16px',
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr',
        gap: '16px',
        alignItems: 'end',
      }}>
        {/* Multi-Party Select Button trigger */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: 'var(--text-small)', fontWeight: 600, color: 'var(--color-text-primary)' }}>Select Accounts / Parties</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => setIsModalOpen(true)}
              style={{
                flexGrow: 1,
                textAlign: 'left',
                padding: '8px 12px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                color: selectedAccountIds.length > 0 ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: '14px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {selectedAccountsSummary}
            </button>
            {selectedAccountIds.length > 0 && (
              <button 
                onClick={handleClearSelection}
                style={{
                  background: 'none',
                  border: '1px solid var(--color-border)',
                  borderRadius: '6px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: 'var(--color-text-secondary)',
                }}
                title="Clear selection"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        <Input
          type="date"
          label="From Date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
          <div style={{ flexGrow: 1 }}>
            <Input
              type="date"
              label="To Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => { setStartDate(''); setEndDate(''); }}
              style={{
                height: '38px',
                background: 'none',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-text-secondary)',
              }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Statement Results Container */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {ledgerStatements && ledgerStatements.map((ledger) => {
          const isDr = ledger.closingBalance >= 0;
          return (
            <div 
              key={ledger.accountId} 
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Account details card top section */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>{ledger.accountName}</h2>
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: 700, 
                      textTransform: 'uppercase', 
                      background: 'var(--color-background)', 
                      padding: '2px 8px', 
                      borderRadius: '4px',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {ledger.groupName}
                    </span>
                  </div>
                  {ledger.phone && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>📞 {ledger.phone}</p>}
                  {ledger.address && <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>📍 {ledger.address}</p>}
                </div>

                {/* Closing Outstanding Balance prominently displayed */}
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Outstanding
                  </span>
                  <div style={{ 
                    fontSize: '24px', 
                    fontWeight: 800, 
                    color: isDr ? 'var(--color-success)' : 'var(--color-danger)', 
                    marginTop: '4px' 
                  }}>
                    ₹{Math.abs(ledger.closingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {isDr ? 'Dr' : 'Cr'}
                  </div>
                </div>
              </div>

              {/* Opening Balance reference row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: 'var(--color-background)', padding: '8px 12px', borderRadius: '6px' }}>
                <span style={{ fontWeight: 600 }}>Period Opening Balance:</span>
                <span style={{ fontWeight: 700, color: ledger.openingBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  ₹{Math.abs(ledger.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {ledger.openingBalance >= 0 ? 'Dr' : 'Cr'}
                </span>
              </div>

              {/* Entries Grid */}
              <DataGrid
                columns={columns}
                data={ledger.statements}
                keyField="id"
                loading={loading}
                emptyTitle="No transactions found"
                emptyDescription="There are no journal entries recorded for this period."
              />
            </div>
          );
        })}

        {/* Empty placeholder */}
        {(!ledgerStatements || ledgerStatements.length === 0) && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px dotted var(--color-border)',
            borderRadius: '8px',
            padding: '48px',
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
          }}>
            <p style={{ fontSize: '16px', fontWeight: 600 }}>Select accounts to query statement history</p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              Click the select box above to search and select one or more ledger accounts.
            </p>
          </div>
        )}
      </div>

      {/* Party Selection Modal Dialog */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--color-surface)',
            borderRadius: '12px',
            border: '1px solid var(--color-border)',
            width: '480px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>Select Ledger Accounts</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal search filter */}
            <div style={{ padding: '12px 16px', background: 'var(--color-background)', borderBottom: '1px solid var(--color-border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--color-text-muted)' }} />
                <input 
                  type="text"
                  placeholder="Search by name or account group..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    outline: 'none',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            {/* List of Accounts */}
            <div style={{ overflowY: 'auto', flexGrow: 1, padding: '8px 0' }}>
              {filteredAccounts.map(acc => {
                const isSelected = selectedAccountIds.includes(acc.id);
                return (
                  <div 
                    key={acc.id}
                    onClick={() => handleToggleAccount(acc.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 16px',
                      cursor: 'pointer',
                      background: isSelected ? 'var(--color-background)' : 'transparent',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{acc.accountName}</p>
                      {acc.accountGroup?.groupName && (
                        <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{acc.accountGroup.groupName}</p>
                      )}
                    </div>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: '1px solid var(--color-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isSelected ? 'var(--color-primary)' : 'transparent',
                      borderColor: isSelected ? 'var(--color-primary)' : 'var(--color-border)',
                    }}>
                      {isSelected && <Check size={14} color="#fff" />}
                    </div>
                  </div>
                );
              })}
              {filteredAccounts.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px 0', fontSize: '13px' }}>
                  No matching accounts found
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{
              padding: '16px',
              borderTop: '1px solid var(--color-border)',
              display: 'flex',
              justifyContent: 'space-between',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={handleSelectAll} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  All
                </Button>
                <Button variant="secondary" onClick={handleClearSelection} style={{ padding: '6px 12px', fontSize: '12px' }}>
                  Clear
                </Button>
                <Button variant="secondary" onClick={handleShowAllOutstanding} style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <ShieldAlert size={12} /> Parties Only
                </Button>
              </div>
              <Button variant="primary" onClick={() => setIsModalOpen(false)}>
                Done
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Choose Print Destination Modal */}
      {showPrintModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            textAlign: 'center',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Choose Print Destination</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
              Select "Preview on Screen" to see the copy first, or "System Print Dialog" to print directly.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => { setShowPrintModal(false); setShowPrintPreview(true); }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                Preview on Screen
              </button>
              <button 
                onClick={triggerDirectPrint}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                System Print Dialog
              </button>
              <button 
                onClick={() => setShowPrintModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '12px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Page per Party Layout Prompt Modal */}
      {showPagePartyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            textAlign: 'center',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Print Layout Style</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
              Do you want to print one party per page?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => {
                  setOnePartyPerPage(true);
                  setShowPagePartyModal(false);
                  setShowPrintModal(true);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                Yes (One Party per Page)
              </button>
              <button 
                onClick={() => {
                  setOnePartyPerPage(false);
                  setShowPagePartyModal(false);
                  setShowPrintModal(true);
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                No (Continuous Ledger)
              </button>
              <button 
                onClick={() => setShowPagePartyModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '12px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
