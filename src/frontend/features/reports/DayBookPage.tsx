// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Day Book Report Page
// Phase 11.1: Chronological journal of all transactions per calendar day
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw, Printer, ArrowLeft, Eye, Download, FileText } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { useCompanyStore, formatFinancialYearLabel } from '../../state/company-store';
import { getDayBookCSV } from '../../utils/reportExports';

export const DayBookPage: React.FC = () => {
  const { activeCompany, companyId } = useActiveCompany();
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);

  // Date filters for the list page
  const now = new Date();
  const fyStart = now.getMonth() >= 3
    ? `${now.getFullYear()}-04-01`
    : `${now.getFullYear() - 1}-04-01`;
  const todayStr = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(todayStr);

  // States
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  // IPC Hooks
  const { data: listData, loading: listLoading, invoke: fetchList } = useIpc<any[]>('report:day-book-list');
  const { data: detailData, loading: detailLoading, invoke: fetchDetail } = useIpc<any>('report:day-book');

  const loadList = useCallback(async () => {
    if (!companyId) return;
    await fetchList({ companyId, startDate, endDate });
  }, [companyId, startDate, endDate, fetchList]);

  const loadDetail = useCallback(async () => {
    if (!companyId || !activeDate) return;
    await fetchDetail({ companyId, dateStr: activeDate });
  }, [companyId, activeDate, fetchDetail]);

  useEffect(() => {
    loadList();
  }, [companyId, startDate, endDate]);

  useEffect(() => {
    if (activeDate) {
      loadDetail();
    }
  }, [companyId, activeDate]);

  const triggerDirectPrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrint = () => {
    setShowPrintDialog(true);
  };

  const handleExportCSV = () => {
    if (!detailData || !detailData.transactions) return;
    const csvContent = getDayBookCSV(detailData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Day_Book_${activeDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    setShowPrintPreview(true);
    setTimeout(async () => {
      try {
        const res = await window.api.invoke('system:print-to-pdf', {
          filename: `Day_Book_${activeDate}.pdf`
        }) as any;
        if (res && !res.success && res.error !== 'Cancelled') {
          alert(res.error || 'Failed to export PDF');
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setShowPrintPreview(false);
      }
    }, 500);
  };

  const renderAmount = (amount: number) => {
    if (amount === undefined || amount === null) return '₹0.00';
    const isNeg = amount < 0;
    const formatted = Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isNeg ? `₹${formatted} Cr` : `₹${formatted} Dr`;
  };

  // Day list grid columns
  const listColumns: Column<any>[] = [
    { key: 'dateStr', header: 'DATE', sortable: true, width: '110px' },
    { 
      key: 'openingCash', 
      header: 'OPENING CASH (INR / USD)', 
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ fontWeight: 600 }}>{renderAmount(row.openingCashInr ?? row.openingCash)}</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>
            $ {(row.openingCashUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )
    },
    { 
      key: 'openingBank', 
      header: 'OPENING BANK (INR / USD)', 
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ fontWeight: 600 }}>{renderAmount(row.openingBankInr ?? row.openingBank)}</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#06b6d4' }}>
            $ {(row.openingBankUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )
    },
    { 
      key: 'closingCash', 
      header: 'CLOSING CASH (INR / USD)', 
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ fontWeight: 600 }}>{renderAmount(row.closingCashInr ?? row.closingCash)}</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>
            $ {(row.closingCashUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )
    },
    { 
      key: 'closingBank', 
      header: 'CLOSING BANK (INR / USD)', 
      align: 'right',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span style={{ fontWeight: 600 }}>{renderAmount(row.closingBankInr ?? row.closingBank)}</span>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#06b6d4' }}>
            $ {(row.closingBankUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )
    },
    { key: 'transactionCount', header: 'TRANSACTIONS', align: 'center' },
    {
      key: 'actions',
      header: 'ACTION',
      align: 'center',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => setActiveDate(row.dateStr)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px' }}>
          <Eye size={14} /> View Details
        </Button>
      )
    }
  ];

  // Day detail grid columns
  const detailColumns: Column<any>[] = [
    { key: 'voucherNumber', header: 'VOUCHER NO', sortable: true, width: '130px' },
    { key: 'voucherType', header: 'TYPE', sortable: true, width: '100px' },
    { key: 'accountName', header: 'PARTICULARS', sortable: true },
    { 
      key: 'originalCurrency', 
      header: 'CURRENCY', 
      align: 'center',
      width: '90px',
      render: (row) => (
        <span style={{
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 700,
          background: row.originalCurrency === 'USD' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          color: row.originalCurrency === 'USD' ? '#10b981' : '#3b82f6'
        }}>
          {row.originalCurrency || 'INR'}
        </span>
      )
    },
    {
      key: 'originalAmount',
      header: 'ORIGINAL AMT',
      align: 'right',
      width: '130px',
      render: (row) => `${row.originalCurrency === 'USD' ? '$' : '₹'} ${Number(row.originalAmount || row.amount || 0).toLocaleString(row.originalCurrency === 'USD' ? 'en-US' : 'en-IN', { minimumFractionDigits: 2 })}`
    },
    {
      key: 'exchangeRate',
      header: 'EX. RATE',
      align: 'right',
      width: '100px',
      render: (row) => row.originalCurrency === 'USD' ? `@ ₹${Number(row.exchangeRate || 90).toFixed(2)}` : '1.00'
    },
    { 
      key: 'debit', 
      header: 'DEBIT (DR - ₹)', 
      align: 'right',
      width: '140px',
      render: (row) => row.debitCreditType === 'DEBIT' ? `₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'credit', 
      header: 'CREDIT (CR - ₹)', 
      align: 'right',
      width: '140px',
      render: (row) => row.debitCreditType === 'CREDIT' ? `₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { key: 'narration', header: 'NARRATION' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* List Page Header */}
      {!activeDate && (
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>Day Book</h1>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Chronological daily log and running cash/bank balances.
            </p>
          </div>
          <Button variant="primary" onClick={loadList} disabled={listLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={16} className={listLoading ? 'animate-spin' : ''} /> Refresh List
          </Button>
        </div>
      )}

      {/* Detail Page Header */}
      {activeDate && (
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button variant="ghost" onClick={() => setActiveDate(null)} style={{ padding: '8px' }}>
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>Day Book - {activeDate}</h1>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Detailed transactions list and cash vs bank splits for {activeDate}.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} /> Download CSV
            </Button>
            <Button variant="secondary" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} /> Download PDF
            </Button>
            <Button variant="ghost" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} /> Print Day Book
            </Button>
            <Button variant="primary" onClick={loadDetail} disabled={detailLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RefreshCw size={16} className={detailLoading ? 'animate-spin' : ''} /> Refresh Details
            </Button>
          </div>
        </div>
      )}

      {/* Date Filters (Only visible on List view) */}
      {!activeDate && (
        <div className="no-print" style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 20px',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} style={{ color: 'var(--color-text-secondary)' }} />
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Filter Period:</span>
          </div>
          <div style={{ width: '160px' }}>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} label="" />
          </div>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>to</span>
          <div style={{ width: '160px' }}>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} label="" />
          </div>
        </div>
      )}

      {/* Day summary list grid view */}
      {!activeDate && (
        <div className="no-print">
          <DataGrid
            columns={listColumns}
            data={listData || []}
            keyField="dateStr"
            loading={listLoading}
            emptyTitle="No Daily Logs Found"
            emptyDescription="Adjust your date filters or record a new transaction to generate daily logs."
            onRowClick={(row) => setActiveDate(row.dateStr)}
          />
        </div>
      )}

      {/* Day Details View */}
      {activeDate && (
        <>
          {/* Balance Cards Grid */}
          <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Opening Cash (INR / USD)</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  ₹ {(detailData?.openingCashInr ?? detailData?.openingCash ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                  $ {(detailData?.openingCashUsd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Opening Bank (INR / USD)</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-success)' }}>
                  ₹ {(detailData?.openingBankInr ?? detailData?.openingBank ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#06b6d4' }}>
                  $ {(detailData?.openingBankUsd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Closing Cash (INR / USD)</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>
                  ₹ {(detailData?.closingCashInr ?? detailData?.closingCash ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>
                  $ {(detailData?.closingCashUsd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Closing Bank (INR / USD)</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-success)' }}>
                  ₹ {(detailData?.closingBankInr ?? detailData?.closingBank ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#06b6d4' }}>
                  $ {(detailData?.closingBankUsd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Details Table */}
          <div className="no-print">
            <DataGrid
              columns={detailColumns}
              data={detailData?.transactions || []}
              keyField="id"
              loading={detailLoading}
              emptyTitle="No Entries Found"
              emptyDescription="There are no transactions recorded on this day."
            />
          </div>
        </>
      )}

      {/* Print Preview Overlay */}
      {showPrintPreview && activeCompany && detailData && activeDate && (
        <div id="print-preview-root" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: '#f8fafc',
          zIndex: 9999,
          overflowY: 'auto',
          padding: '24px'
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page { size: A4 portrait; margin: 15mm; }
              body { background: #ffffff !important; padding: 0 !important; margin: 0 !important; }
              .no-print { display: none !important; }
              #print-preview-root {
                position: static !important;
                background: transparent !important;
                padding: 0 !important;
                margin: 0 !important;
                width: auto !important;
                height: auto !important;
                overflow: visible !important;
              }
              .print-page {
                padding: 5mm 0 !important;
                border: none !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                box-shadow: none !important;
                min-height: auto !important;
                background: transparent !important;
              }
            }
          `}} />

          <div className="no-print" style={{
            display: 'flex',
            justifyContent: 'space-between',
            maxWidth: '210mm',
            margin: '0 auto 20px auto',
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

          <div id="print-area" className="print-page" style={{
            background: '#ffffff',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            padding: '20mm',
            width: '210mm',
            margin: '0 auto',
            boxSizing: 'border-box',
            color: '#1e293b'
          }}>
            {/* Header */}
            <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                {activeCompany.companyName}
              </h2>
              <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0 0 0' }}>
                GSTIN: {activeCompany.gstinNumber || 'Unregistered'} | Financial Year: {activeFinancialYear ? formatFinancialYearLabel(activeFinancialYear) : ''}
              </p>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '12px 0 0 0', color: 'var(--color-primary)' }}>
                DAY BOOK
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Date: {activeDate}
              </p>
            </div>

            {/* Daily Balances Summary Table */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase' }}>Daily Cash & Bank Summary</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #e2e8f0' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #0f172a', fontWeight: 600 }}>
                    <th style={{ textAlign: 'left', padding: '8px', borderRight: '1px solid #e2e8f0' }}>Balance Type</th>
                    <th style={{ textAlign: 'right', padding: '8px', borderRight: '1px solid #e2e8f0' }}>Opening Balance</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>Closing Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 500, borderRight: '1px solid #e2e8f0' }}>Cash (On Hand)</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>{renderAmount(detailData?.openingCash)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{renderAmount(detailData?.closingCash)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', fontWeight: 500, borderRight: '1px solid #e2e8f0' }}>Bank Balances</td>
                    <td style={{ padding: '8px', textAlign: 'right', borderRight: '1px solid #e2e8f0' }}>{renderAmount(detailData?.openingBank)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{renderAmount(detailData?.closingBank)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Transactions list */}
            <div>
              <h4 style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', textTransform: 'uppercase' }}>Chronological Transactions</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ borderBottom: '1.5px solid #0f172a', fontWeight: 600, color: '#334155' }}>
                    <th style={{ textAlign: 'left', padding: '8px' }}>VOUCHER NO</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>TYPE</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>PARTICULARS</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>DEBIT (DR)</th>
                    <th style={{ textAlign: 'right', padding: '8px' }}>CREDIT (CR)</th>
                    <th style={{ textAlign: 'left', padding: '8px' }}>NARRATION</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailData?.transactions || []).map((row: any, rowIdx: number) => (
                    <tr key={rowIdx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '8px' }}>{row.voucherNumber}</td>
                      <td style={{ padding: '8px' }}>{row.voucherType}</td>
                      <td style={{ padding: '8px' }}>{row.accountName}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {row.debitCreditType === 'DEBIT' ? `₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>
                        {row.debitCreditType === 'CREDIT' ? `₹${row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td style={{ padding: '8px' }}>{row.narration}</td>
                    </tr>
                  ))}
                  {(!detailData?.transactions || detailData.transactions.length === 0) && (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                        No transactions recorded on this day.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
              <span>Generated on: {new Date().toLocaleDateString()}</span>
              <span style={{ borderTop: '1px solid #94a3b8', width: '150px', textAlign: 'center', paddingTop: '4px' }}>Authorised Signatory</span>
            </div>
          </div>
        </div>
      )}

      {/* Choose Print Destination Dialog */}
      {showPrintDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            width: '400px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)' }}>
                Choose Print Destination
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: '1.5' }}>
                Select "Preview on Screen" to see the copy first, or "System Print Dialog" to print directly.
              </p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  setShowPrintDialog(false);
                  setShowPrintPreview(true);
                }}
              >
                Preview on Screen
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => {
                  setShowPrintDialog(false);
                  triggerDirectPrint();
                }}
              >
                System Print Dialog
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setShowPrintDialog(false)}
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
