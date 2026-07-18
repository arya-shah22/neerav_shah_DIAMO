// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — TDS & TCS Dashboard & Reports Page
// Phase 11.6: Enterprise TDS & TCS Reports
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Printer, Download, RefreshCw, ArrowLeft } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button, Modal } from '../../components/ui';
import { DataGrid } from '../../components/ui/DataGrid';
import type { Column } from '../../components/ui/DataGrid';

type TdsTcsTab = 'DASHBOARD' | 'TDS_REGISTER' | 'TCS_REGISTER' | 'TDS_PARTY' | 'TCS_PARTY' | 'SECTION';

const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d: string | Date) => {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const TdsTcsDashboardPage: React.FC = () => {
  const { activeCompany, companyId, isReady } = useActiveCompany();

  // FY default dates
  const now = new Date();
  const fyStart = now.getMonth() >= 3 ? `${now.getFullYear()}-04-01` : `${now.getFullYear() - 1}-04-01`;
  const todayStr = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(todayStr);
  const [activeTab, setActiveTab] = useState<TdsTcsTab>('DASHBOARD');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // IPC Hooks
  const { data: dashboardData, loading: dashLoading, invoke: getDashboard } = useIpc<any>('report:tds-tcs-dashboard');
  const { data: tdsRegister, loading: tdsRegLoading, invoke: getTdsRegister } = useIpc<any>('report:tds-register');
  const { data: tcsRegister, loading: tcsRegLoading, invoke: getTcsRegister } = useIpc<any>('report:tcs-register');
  const { data: tdsPartyData, loading: tdsPartyLoading, invoke: getTdsPartywise } = useIpc<any>('report:tds-partywise');
  const { data: tcsPartyData, loading: tcsPartyLoading, invoke: getTcsPartywise } = useIpc<any>('report:tcs-partywise');

  const refreshAll = useCallback(async () => {
    if (!companyId) return;
    const payload = { companyId, startDate, endDate };
    await Promise.all([
      getDashboard(payload),
      getTdsRegister(payload),
      getTcsRegister(payload),
      getTdsPartywise(payload),
      getTcsPartywise(payload),
    ]);
  }, [companyId, startDate, endDate, getDashboard, getTdsRegister, getTcsRegister, getTdsPartywise, getTcsPartywise]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const isLoading = dashLoading || tdsRegLoading || tcsRegLoading || tdsPartyLoading || tcsPartyLoading;

  // Print / Export

  const handleExportPDF = async () => {
    setShowPrintPreview(true);
    setTimeout(async () => {
      try {
        const res = await window.api.invoke('system:print-to-pdf', {
          filename: `TDS_TCS_Report_${startDate}_to_${endDate}.pdf`
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

  const handleExportCSV = () => {
    let rows: any[] = [];
    let filename = 'TDS_TCS_Report';
    let headers: string[] = [];

    if (activeTab === 'TDS_REGISTER' && tdsRegister) {
      headers = ['Date', 'Voucher No', 'Bill No', 'Party Name', 'PAN', 'Section', 'Deductible Value', 'TDS Rate %', 'TDS Amount', 'Net Payment'];
      rows = tdsRegister.map((r: any) => [fmtDate(r.date), r.voucherNumber, r.billNumber, r.partyName, r.panNumber, r.tdsSection, r.deductibleValue, r.tdsRate, r.tdsAmount, r.netPayment]);
      filename = 'TDS_Register';
    } else if (activeTab === 'TCS_REGISTER' && tcsRegister) {
      headers = ['Date', 'Voucher No', 'Bill No', 'Party Name', 'PAN', 'Section', 'Taxable Value', 'TCS Rate %', 'TCS Amount', 'Invoice Total'];
      rows = tcsRegister.map((r: any) => [fmtDate(r.date), r.voucherNumber, r.billNumber, r.partyName, r.panNumber, r.tcsSection, r.taxableValue, r.tcsRate, r.tcsAmount, r.invoiceTotal]);
      filename = 'TCS_Register';
    } else if (activeTab === 'TDS_PARTY' && tdsPartyData) {
      headers = ['Party Name', 'PAN', 'Section', 'Bill Count', 'Taxable Value', 'TDS Deducted', 'Net Payments'];
      rows = tdsPartyData.map((r: any) => [r.partyName, r.pan, r.tdsSection, r.billCount, r.totalTaxableValue, r.tdsDeducted, r.netPayments]);
      filename = 'TDS_Partywise';
    } else if (activeTab === 'TCS_PARTY' && tcsPartyData) {
      headers = ['Party Name', 'PAN', 'Section', 'Bill Count', 'Taxable Value', 'TCS Collected'];
      rows = tcsPartyData.map((r: any) => [r.partyName, r.pan, r.tcsSection, r.billCount, r.totalTaxableValue, r.tcsCollected]);
      filename = 'TCS_Partywise';
    } else {
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(',') + '\n';
    rows.forEach((r) => { csvContent += r.join(',') + '\n'; });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ─── Summary data ──────────────────────────────────────────
  const summary = dashboardData?.summary || {
    totalTdsDeducted: 0,
    totalTdsTaxableValue: 0,
    tdsTransactionCount: 0,
    totalTcsCollected: 0,
    totalTcsTaxableValue: 0,
    tcsTransactionCount: 0,
  };

  const tabs: { key: TdsTcsTab; label: string }[] = [
    { key: 'DASHBOARD', label: 'Dashboard' },
    { key: 'TDS_REGISTER', label: 'TDS Register' },
    { key: 'TCS_REGISTER', label: 'TCS Register' },
    { key: 'TDS_PARTY', label: 'Party-wise TDS' },
    { key: 'TCS_PARTY', label: 'Party-wise TCS' },
    { key: 'SECTION', label: 'Section-wise' },
  ];

  // ─── Styles ────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    padding: 'var(--spacing-lg)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
  };

  const kpiCardStyle: React.CSSProperties = {
    ...cardStyle,
    textAlign: 'center',
    minWidth: 180,
  };

  const kpiLabel: React.CSSProperties = {
    fontSize: 'var(--text-label)',
    color: 'var(--color-text-secondary)',
    marginBottom: '4px',
  };

  const kpiValue: React.CSSProperties = {
    fontSize: 'var(--text-heading)',
    fontWeight: 700,
    color: 'var(--color-primary)',
  };

  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: '2px',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-lg)',
    padding: '4px',
    border: '1px solid var(--color-border)',
  };

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: 'pointer',
    fontSize: 'var(--text-label)',
    fontWeight: active ? 600 : 400,
    background: active ? 'var(--color-primary)' : 'transparent',
    color: active ? '#fff' : 'var(--color-text-secondary)',
    transition: 'all 0.2s ease',
  });

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: 'var(--text-heading)',
    fontWeight: 600,
    color: 'var(--color-primary)',
    marginBottom: 'var(--spacing-md)',
  };

  // ─── TDS Register Columns ─────────────────────────────────
  const tdsRegisterColumns: Column<any>[] = [
    { key: 'date', header: 'Date', width: '100px', render: (row: any) => fmtDate(row.date) },
    { key: 'voucherNumber', header: 'Voucher No', width: '120px' },
    { key: 'billNumber', header: 'Bill No', width: '120px' },
    { key: 'partyName', header: 'Party Name', width: '200px' },
    { key: 'panNumber', header: 'PAN', width: '120px' },
    { key: 'tdsSection', header: 'TDS Section', width: '100px' },
    { key: 'deductibleValue', header: 'Deductible Value', width: '140px', align: 'right', render: (row: any) => `₹${fmt(row.deductibleValue)}` },
    { key: 'tdsRate', header: 'Rate %', width: '80px', align: 'right', render: (row: any) => `${row.tdsRate}%` },
    { key: 'tdsAmount', header: 'TDS Amount', width: '130px', align: 'right', render: (row: any) => `₹${fmt(row.tdsAmount)}` },
    { key: 'netPayment', header: 'Net Payment', width: '140px', align: 'right', render: (row: any) => `₹${fmt(row.netPayment)}` },
  ];

  // ─── TCS Register Columns ─────────────────────────────────
  const tcsRegisterColumns: Column<any>[] = [
    { key: 'date', header: 'Date', width: '100px', render: (row: any) => fmtDate(row.date) },
    { key: 'voucherNumber', header: 'Voucher No', width: '120px' },
    { key: 'billNumber', header: 'Bill No', width: '120px' },
    { key: 'partyName', header: 'Party Name', width: '200px' },
    { key: 'panNumber', header: 'PAN', width: '120px' },
    { key: 'tcsSection', header: 'TCS Section', width: '100px' },
    { key: 'taxableValue', header: 'Taxable Value', width: '140px', align: 'right', render: (row: any) => `₹${fmt(row.taxableValue)}` },
    { key: 'tcsRate', header: 'Rate %', width: '80px', align: 'right', render: (row: any) => `${row.tcsRate}%` },
    { key: 'tcsAmount', header: 'TCS Amount', width: '130px', align: 'right', render: (row: any) => `₹${fmt(row.tcsAmount)}` },
    { key: 'invoiceTotal', header: 'Invoice Total', width: '140px', align: 'right', render: (row: any) => `₹${fmt(row.invoiceTotal)}` },
  ];

  // ─── Party-wise TDS Columns ────────────────────────────────
  const tdsPartyColumns: Column<any>[] = [
    { key: 'partyName', header: 'Party Name', width: '200px' },
    { key: 'pan', header: 'PAN', width: '120px' },
    { key: 'tdsSection', header: 'TDS Section', width: '120px' },
    { key: 'billCount', header: 'Bills', width: '70px', align: 'right' },
    { key: 'totalTaxableValue', header: 'Taxable Value', width: '150px', align: 'right', render: (row: any) => `₹${fmt(row.totalTaxableValue)}` },
    { key: 'tdsDeducted', header: 'TDS Deducted', width: '140px', align: 'right', render: (row: any) => `₹${fmt(row.tdsDeducted)}` },
    { key: 'netPayments', header: 'Net Payments', width: '150px', align: 'right', render: (row: any) => `₹${fmt(row.netPayments)}` },
  ];

  // ─── Party-wise TCS Columns ────────────────────────────────
  const tcsPartyColumns: Column<any>[] = [
    { key: 'partyName', header: 'Party Name', width: '200px' },
    { key: 'pan', header: 'PAN', width: '120px' },
    { key: 'tcsSection', header: 'TCS Section', width: '120px' },
    { key: 'billCount', header: 'Bills', width: '70px', align: 'right' },
    { key: 'totalTaxableValue', header: 'Taxable Value', width: '150px', align: 'right', render: (row: any) => `₹${fmt(row.totalTaxableValue)}` },
    { key: 'tcsCollected', header: 'TCS Collected', width: '140px', align: 'right', render: (row: any) => `₹${fmt(row.tcsCollected)}` },
  ];

  // ─── Section-wise Columns ──────────────────────────────────
  const sectionColumns: Column<any>[] = [
    { key: 'sectionCode', header: 'Section Code', width: '130px' },
    { key: 'transactionCount', header: 'Transactions', width: '110px', align: 'right' },
    { key: 'totalTaxableValue', header: 'Taxable Value', width: '160px', align: 'right', render: (row: any) => `₹${fmt(row.totalTaxableValue)}` },
    { key: 'taxAmount', header: 'Tax Amount', width: '140px', align: 'right', render: (row: any) => `₹${fmt(row.tdsAmount || row.tcsAmount || 0)}` },
    { key: 'averageRate', header: 'Avg Rate %', width: '100px', align: 'right', render: (row: any) => `${row.averageRate}%` },
  ];

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  if (!isReady || !activeCompany) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Please select a company and financial year to view TDS & TCS reports.
        </p>
      </div>
    );
  }

  // ─── Print Preview Mode ──────────────────────────────────
  if (showPrintPreview && activeCompany) {
    return (
      <div id="print-preview-root" style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 landscape; margin: 15mm; }
            body { background: #ffffff !important; padding: 0 !important; margin: 0 !important; }
            .no-print { display: none !important; }
            #print-preview-root {
              background: transparent !important;
              padding: 0 !important;
              margin: 0 !important;
              min-height: auto !important;
            }
            .print-page {
              padding: 5mm 0 !important;
              border: none !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              box-shadow: none !important;
              min-height: auto !important;
              height: auto !important;
              background: transparent !important;
              border-radius: 0 !important;
            }
          }
        `}} />

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
            <ArrowLeft size={16} /> Back to Dashboard
          </Button>
          <Button variant="primary" onClick={() => setTimeout(() => window.print(), 100)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print / Save PDF
          </Button>
        </div>

        <div id="print-area" className="print-page" style={{
          background: '#ffffff',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          padding: '20mm',
          width: '277mm', // A4 Landscape width
          margin: '0 auto',
          boxSizing: 'border-box',
          color: '#1e293b'
        }}>
          {/* Branded Print Header */}
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
              {activeCompany.companyName}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '12px' }}>
              {activeCompany.addressLine1} {activeCompany.addressLine2 && `, ${activeCompany.addressLine2}`} | {activeCompany.city} - {activeCompany.pincode}
            </p>
            {activeCompany.panNumber && (
              <p style={{ margin: '2px 0 0', color: '#0f172a', fontSize: '12px', fontWeight: 600 }}>
                PAN: {activeCompany.panNumber} {activeCompany.gstinNumber && `| GSTIN: ${activeCompany.gstinNumber}`}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '13px', fontWeight: 600 }}>
              <span style={{ color: 'var(--color-primary)' }}>
                {activeTab.replace('_', ' ')} REPORT
              </span>
              <span>PERIOD: {startDate} TO {endDate}</span>
            </div>
          </div>

          {/* KPI summaries in Print */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>TDS Deducted</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#e74c3c' }}>₹{fmt(summary.totalTdsDeducted)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>TCS Collected</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#27ae60' }}>₹{fmt(summary.totalTcsCollected)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>TDS Taxable Value</div>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>₹{fmt(summary.totalTdsTaxableValue)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' }}>TCS Taxable Value</div>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>₹{fmt(summary.totalTcsTaxableValue)}</div>
            </div>
          </div>

          {/* Clean HTML Table depending on activeTab */}
          {activeTab === 'DASHBOARD' || activeTab === 'SECTION' ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>TDS Section Breakdown</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Section</th>
                      <th style={{ textAlign: 'right', padding: '6px' }}>Bills</th>
                      <th style={{ textAlign: 'right', padding: '6px' }}>Taxable Value</th>
                      <th style={{ textAlign: 'right', padding: '6px' }}>TDS Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData?.tdsSections || []).map((row: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px' }}>{row.sectionCode}</td>
                        <td style={{ textAlign: 'right', padding: '6px' }}>{row.transactionCount}</td>
                        <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.totalTaxableValue)}</td>
                        <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>₹{fmt(row.tdsAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>TCS Section Breakdown</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                      <th style={{ textAlign: 'left', padding: '6px' }}>Section</th>
                      <th style={{ textAlign: 'right', padding: '6px' }}>Bills</th>
                      <th style={{ textAlign: 'right', padding: '6px' }}>Taxable Value</th>
                      <th style={{ textAlign: 'right', padding: '6px' }}>TCS Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData?.tcsSections || []).map((row: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px' }}>{row.sectionCode}</td>
                        <td style={{ textAlign: 'right', padding: '6px' }}>{row.transactionCount}</td>
                        <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.totalTaxableValue)}</td>
                        <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>₹{fmt(row.tcsAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTab === 'TDS_REGISTER' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Voucher No</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Party Name</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>PAN</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Sec</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Taxable</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Rate</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>TDS Amount</th>
                </tr>
              </thead>
              <tbody>
                {(tdsRegister || []).map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px' }}>{fmtDate(row.date)}</td>
                    <td style={{ padding: '6px' }}>{row.voucherNumber}</td>
                    <td style={{ padding: '6px' }}>{row.partyName}</td>
                    <td style={{ padding: '6px' }}>{row.panNumber}</td>
                    <td style={{ padding: '6px' }}>{row.tdsSection}</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.deductibleValue)}</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>{row.tdsRate}%</td>
                    <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>₹{fmt(row.tdsAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'TCS_REGISTER' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Voucher No</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Party Name</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>PAN</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Sec</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Taxable</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Rate</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>TCS Amount</th>
                </tr>
              </thead>
              <tbody>
                {(tcsRegister || []).map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px' }}>{fmtDate(row.date)}</td>
                    <td style={{ padding: '6px' }}>{row.voucherNumber}</td>
                    <td style={{ padding: '6px' }}>{row.partyName}</td>
                    <td style={{ padding: '6px' }}>{row.panNumber}</td>
                    <td style={{ padding: '6px' }}>{row.tcsSection}</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.taxableValue)}</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>{row.tcsRate}%</td>
                    <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>₹{fmt(row.tcsAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'TDS_PARTY' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Party Name</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>PAN</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Sections</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Bills</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Taxable Value</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>TDS Deducted</th>
                </tr>
              </thead>
              <tbody>
                {(tdsPartyData || []).map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px' }}>{row.partyName}</td>
                    <td style={{ padding: '6px' }}>{row.pan}</td>
                    <td style={{ padding: '6px' }}>{row.tdsSection}</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>{row.billCount}</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.totalTaxableValue)}</td>
                    <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>₹{fmt(row.tdsDeducted)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'TCS_PARTY' && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Party Name</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>PAN</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Sections</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Bills</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Taxable Value</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>TCS Collected</th>
                </tr>
              </thead>
              <tbody>
                {(tcsPartyData || []).map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px' }}>{row.partyName}</td>
                    <td style={{ padding: '6px' }}>{row.pan}</td>
                    <td style={{ padding: '6px' }}>{row.tcsSection}</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>{row.billCount}</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.totalTaxableValue)}</td>
                    <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>₹{fmt(row.tcsCollected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={showPrintPreview ? 'print-preview-active' : ''}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', height: '100%' }}
    >
      {/* ─── Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>
            TDS & TCS Reports
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {activeCompany.companyName} — Direct Tax Deductions & Collections
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {activeTab !== 'DASHBOARD' && activeTab !== 'SECTION' && (
            <Button variant="ghost" onClick={handleExportCSV} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} /> CSV
            </Button>
          )}
          <Button variant="ghost" onClick={() => setIsPrintModalOpen(true)} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print
          </Button>
          <Button variant="primary" onClick={refreshAll} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
          </Button>
        </div>
      </div>

      {/* ─── Date Filters ────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        gap: '16px',
        padding: '16px 20px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>Period Select:</span>
        </div>
        <div style={{ width: '160px' }}>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} label="" />
        </div>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>to</span>
        <div style={{ width: '160px' }}>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} label="" />
        </div>
      </div>

      {/* ─── KPI Summary Cards ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-md)' }}>
        <div style={kpiCardStyle}>
          <div style={kpiLabel}>Total TDS Deducted</div>
          <div style={{ ...kpiValue, color: '#e74c3c' }}>₹{fmt(summary.totalTdsDeducted)}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {summary.tdsTransactionCount} transactions
          </div>
        </div>
        <div style={kpiCardStyle}>
          <div style={kpiLabel}>Total TCS Collected</div>
          <div style={{ ...kpiValue, color: '#27ae60' }}>₹{fmt(summary.totalTcsCollected)}</div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            {summary.tcsTransactionCount} transactions
          </div>
        </div>
        <div style={kpiCardStyle}>
          <div style={kpiLabel}>TDS Taxable Value</div>
          <div style={kpiValue}>₹{fmt(summary.totalTdsTaxableValue)}</div>
        </div>
        <div style={kpiCardStyle}>
          <div style={kpiLabel}>TCS Taxable Value</div>
          <div style={kpiValue}>₹{fmt(summary.totalTcsTaxableValue)}</div>
        </div>
      </div>

      {/* ─── Tab Bar ──────────────────────────────────────────── */}
      <div style={tabBarStyle}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            style={tabBtnStyle(activeTab === tab.key)}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Tab Content ──────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0 }}>

        {/* Dashboard Tab */}
        {activeTab === 'DASHBOARD' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {/* If no transactions at all, render only one clean empty state */}
            {summary.tdsTransactionCount === 0 && summary.tcsTransactionCount === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '40px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                  No TDS/TCS data available
                </p>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                  TDS/TCS amounts will appear here once invoices with TDS or TCS deductions are recorded in this period.
                </p>
              </div>
            ) : (
              <>
                {/* Monthly Trend */}
                {dashboardData?.monthlyTrend && dashboardData.monthlyTrend.length > 0 && (
                  <div style={cardStyle}>
                    <h3 style={sectionHeaderStyle}>Monthly TDS/TCS Trend</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--spacing-sm)' }}>
                      {dashboardData.monthlyTrend.map((m: any) => (
                        <div key={m.month} style={{ textAlign: 'center', padding: 'var(--spacing-sm)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>{m.month}</div>
                          <div style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: '#e74c3c' }}>TDS: ₹{fmt(m.tdsAmount)}</div>
                          <div style={{ fontSize: 'var(--text-label)', fontWeight: 600, color: '#27ae60' }}>TCS: ₹{fmt(m.tcsAmount)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section Breakdowns side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
                  <div style={cardStyle}>
                    <h3 style={sectionHeaderStyle}>TDS by Section</h3>
                    {dashboardData?.tdsSections?.length ? (
                      <DataGrid
                        data={dashboardData.tdsSections}
                        columns={sectionColumns}
                        keyField="sectionCode"
                        loading={isLoading}
                        emptyTitle="No TDS data"
                        emptyDescription="No TDS data in selected period."
                      />
                    ) : (
                      <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--spacing-lg)' }}>
                        No TDS deductions in this period
                      </p>
                    )}
                  </div>
                  <div style={cardStyle}>
                    <h3 style={sectionHeaderStyle}>TCS by Section</h3>
                    {dashboardData?.tcsSections?.length ? (
                      <DataGrid
                        data={dashboardData.tcsSections}
                        columns={sectionColumns}
                        keyField="sectionCode"
                        loading={isLoading}
                        emptyTitle="No TCS data"
                        emptyDescription="No TCS data in selected period."
                      />
                    ) : (
                      <p style={{ color: 'var(--color-text-secondary)', textAlign: 'center', padding: 'var(--spacing-lg)' }}>
                        No TCS collections in this period
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}


        {/* TDS Register Tab */}
        {activeTab === 'TDS_REGISTER' && (
          <div style={cardStyle}>
            <h3 style={sectionHeaderStyle}>TDS Register — Tax Deducted at Source</h3>
            <DataGrid
              data={tdsRegister || []}
              columns={tdsRegisterColumns}
              keyField="id"
              loading={isLoading}
              emptyTitle="No TDS Deductions"
              emptyDescription="No TDS deductions found in the selected period."
            />
          </div>
        )}

        {/* TCS Register Tab */}
        {activeTab === 'TCS_REGISTER' && (
          <div style={cardStyle}>
            <h3 style={sectionHeaderStyle}>TCS Register — Tax Collected at Source</h3>
            <DataGrid
              data={tcsRegister || []}
              columns={tcsRegisterColumns}
              keyField="id"
              loading={isLoading}
              emptyTitle="No TCS Collections"
              emptyDescription="No TCS collections found in the selected period."
            />
          </div>
        )}

        {/* Party-wise TDS Tab */}
        {activeTab === 'TDS_PARTY' && (
          <div style={cardStyle}>
            <h3 style={sectionHeaderStyle}>Party-wise TDS Report</h3>
            <DataGrid
              data={tdsPartyData || []}
              columns={tdsPartyColumns}
              keyField="pan"
              loading={isLoading}
              emptyTitle="No Party-wise TDS Data"
              emptyDescription="No party-wise TDS deductions found in this period."
            />
          </div>
        )}

        {/* Party-wise TCS Tab */}
        {activeTab === 'TCS_PARTY' && (
          <div style={cardStyle}>
            <h3 style={sectionHeaderStyle}>Party-wise TCS Report</h3>
            <DataGrid
              data={tcsPartyData || []}
              columns={tcsPartyColumns}
              keyField="pan"
              loading={isLoading}
              emptyTitle="No Party-wise TCS Data"
              emptyDescription="No party-wise TCS collections found in this period."
            />
          </div>
        )}

        {/* Section-wise Tab */}
        {activeTab === 'SECTION' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div style={cardStyle}>
              <h3 style={sectionHeaderStyle}>Section-wise TDS Breakdown</h3>
              <DataGrid
                data={dashboardData?.tdsSections || []}
                columns={sectionColumns}
                keyField="sectionCode"
                loading={isLoading}
                emptyTitle="No Section TDS Data"
                emptyDescription="No section-wise TDS data available."
              />
            </div>
            <div style={cardStyle}>
              <h3 style={sectionHeaderStyle}>Section-wise TCS Breakdown</h3>
              <DataGrid
                data={dashboardData?.tcsSections || []}
                columns={sectionColumns}
                keyField="sectionCode"
                loading={isLoading}
                emptyTitle="No Section TCS Data"
                emptyDescription="No section-wise TCS data available."
              />
            </div>
          </div>
        )}
      </div>

      {/* ─── Print CSS ────────────────────────────────────────── */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media print {
          .print-preview-active * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* ─── Print Option Dialog ─────────────────────────────── */}
      <Modal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        title="Print Option"
        size="sm"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Choose how you would like to print or preview the report:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Button
              variant="primary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                setIsPrintModalOpen(false);
                setShowPrintPreview(true);
              }}
            >
              Preview on Screen
            </Button>
            <Button
              variant="secondary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                setIsPrintModalOpen(false);
                handleExportPDF();
              }}
            >
              Direct Print / Save PDF
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
