// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — TDS & TCS Dashboard & Reports Page
// Phase 11.6: Enterprise TDS & TCS Reports
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, RefreshCw, ArrowLeft } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button, Modal } from '../../components/ui';
import { DataGrid } from '../../components/ui/DataGrid';
import type { Column } from '../../components/ui/DataGrid';

type TdsTcsTab = 'DASHBOARD' | 'TDS_REGISTER' | 'TCS_REGISTER' | 'TDS_PARTY' | 'TCS_PARTY' | 'SECTION';

const fmt = (v?: number) => (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (d?: string | Date) => {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

  const refreshAll = useCallback(async () => {
    if (!companyId) return;
    const payload = { companyId, startDate, endDate };
    await Promise.all([
      getDashboard(payload),
      getTdsRegister(payload),
      getTcsRegister(payload),
    ]);
  }, [companyId, startDate, endDate]);

  useEffect(() => {
    refreshAll();
  }, [companyId, startDate, endDate]);

  const isLoading = dashLoading || tdsRegLoading || tcsRegLoading;

  // Derive Party-wise TDS & TCS datasets locally in <1ms without extra network calls
  const tdsPartyData = useMemo(() => {
    if (!tdsRegister) return [];
    const map: Record<string, { partyName: string; pan: string; tdsSection: string; billCount: number; totalTaxableValue: number; tdsDeducted: number }> = {};
    for (const inv of tdsRegister) {
      const pname = inv.partyName || inv.supplierName || 'Vendor';
      if (!map[pname]) {
        map[pname] = { partyName: pname, pan: inv.pan || inv.panNumber || '—', tdsSection: inv.tdsSection || '194Q', billCount: 0, totalTaxableValue: 0, tdsDeducted: 0 };
      }
      map[pname].billCount++;
      map[pname].totalTaxableValue += Number(inv.taxableValue || inv.deductibleValue || 0);
      map[pname].tdsDeducted += Number(inv.tdsAmount || inv.tdsDeducted || 0);
    }
    return Object.values(map);
  }, [tdsRegister]);

  const tcsPartyData = useMemo(() => {
    if (!tcsRegister) return [];
    const map: Record<string, { partyName: string; pan: string; tcsSection: string; billCount: number; totalTaxableValue: number; tcsCollected: number }> = {};
    for (const inv of tcsRegister) {
      const pname = inv.partyName || inv.customerName || 'Customer';
      if (!map[pname]) {
        map[pname] = { partyName: pname, pan: inv.pan || inv.panNumber || '—', tcsSection: inv.tcsSection || '206C(1H)', billCount: 0, totalTaxableValue: 0, tcsCollected: 0 };
      }
      map[pname].billCount++;
      map[pname].totalTaxableValue += Number(inv.taxableValue || 0);
      map[pname].tcsCollected += Number(inv.tcsAmount || inv.tcsCollected || 0);
    }
    return Object.values(map);
  }, [tcsRegister]);

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
  const summary = useMemo(() => {
    if (dashboardData?.summary && (dashboardData.summary.totalTdsDeducted > 0 || dashboardData.summary.totalTcsCollected > 0 || dashboardData.summary.tdsTransactionCount > 0)) {
      return dashboardData.summary;
    }

    // Dynamic aggregation from live registers if dashboard API payload is pending or unmapped
    const tdsDeducted = (tdsRegister || []).reduce((acc: number, r: any) => acc + Number(r.tdsAmount || r.tdsDeducted || 0), 0);
    const tdsTaxable = (tdsRegister || []).reduce((acc: number, r: any) => acc + Number(r.taxableValue || r.deductibleValue || 0), 0);
    const tcsCollected = (tcsRegister || []).reduce((acc: number, r: any) => acc + Number(r.tcsAmount || r.tcsCollected || 0), 0);
    const tcsTaxable = (tcsRegister || []).reduce((acc: number, r: any) => acc + Number(r.taxableValue || 0), 0);

    return {
      totalTdsDeducted: Math.round(tdsDeducted * 100) / 100,
      totalTdsTaxableValue: Math.round(tdsTaxable * 100) / 100,
      tdsTransactionCount: (tdsRegister || []).length,
      totalTcsCollected: Math.round(tcsCollected * 100) / 100,
      totalTcsTaxableValue: Math.round(tcsTaxable * 100) / 100,
      tcsTransactionCount: (tcsRegister || []).length,
    };
  }, [dashboardData, tdsRegister, tcsRegister]);

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
  const tdsRegisterColumns = useMemo<Column<any>[]>(() => [
    { key: 'invoiceDate', header: 'Date', width: '100px', render: (row: any) => fmtDate(row.invoiceDate || row.date) },
    { key: 'voucherNumber', header: 'Voucher No', width: '120px', render: (row: any) => row.voucherNumber || '—' },
    { key: 'billNumber', header: 'Bill No', width: '120px', render: (row: any) => row.billNumber || row.voucherNumber || '—' },
    { key: 'supplierName', header: 'Party Name', width: '200px', render: (row: any) => row.supplierName || row.partyName || '—' },
    { key: 'pan', header: 'PAN', width: '120px', render: (row: any) => row.pan || row.panNumber || '—' },
    { key: 'tdsSection', header: 'TDS Section', width: '100px', render: (row: any) => row.tdsSection || '194Q' },
    { key: 'taxableValue', header: 'Deductible Value', width: '140px', align: 'right', render: (row: any) => `₹${fmt(row.taxableValue ?? row.deductibleValue)}` },
    { key: 'tdsPct', header: 'Rate %', width: '80px', align: 'right', render: (row: any) => `${row.tdsPct ?? row.tdsRate ?? 0}%` },
    { key: 'tdsDeducted', header: 'TDS Amount', width: '130px', align: 'right', render: (row: any) => `₹${fmt(row.tdsDeducted ?? row.tdsAmount)}` },
    { key: 'netAmount', header: 'Net Payment', width: '140px', align: 'right', render: (row: any) => `₹${fmt(row.netAmount ?? row.netPayment)}` },
  ], []);

  // ─── TCS Register Columns ─────────────────────────────────
  const tcsRegisterColumns = useMemo<Column<any>[]>(() => [
    { key: 'invoiceDate', header: 'Date', width: '100px', render: (row: any) => fmtDate(row.invoiceDate || row.date) },
    { key: 'voucherNumber', header: 'Voucher No', width: '120px', render: (row: any) => row.voucherNumber || '—' },
    { key: 'billNumber', header: 'Bill No', width: '120px', render: (row: any) => row.billNumber || row.voucherNumber || '—' },
    { key: 'customerName', header: 'Party Name', width: '200px', render: (row: any) => row.customerName || row.partyName || '—' },
    { key: 'pan', header: 'PAN', width: '120px', render: (row: any) => row.pan || row.panNumber || '—' },
    { key: 'tcsSection', header: 'TCS Section', width: '100px', render: (row: any) => row.tcsSection || '206C(1H)' },
    { key: 'taxableValue', header: 'Taxable Value', width: '140px', align: 'right', render: (row: any) => `₹${fmt(row.taxableValue)}` },
    { key: 'tcsPct', header: 'Rate %', width: '80px', align: 'right', render: (row: any) => `${row.tcsPct ?? row.tcsRate ?? 0}%` },
    { key: 'tcsCollected', header: 'TCS Amount', width: '130px', align: 'right', render: (row: any) => `₹${fmt(row.tcsCollected ?? row.tcsAmount)}` },
    { key: 'netAmount', header: 'Invoice Total', width: '140px', align: 'right', render: (row: any) => `₹${fmt(row.netAmount ?? row.invoiceTotal)}` },
  ], []);

  // ─── Party-wise TDS Columns ────────────────────────────────
  const tdsPartyColumns = useMemo<Column<any>[]>(() => [
    { key: 'partyName', header: 'Party Name', width: '200px', render: (row: any) => row.partyName || row.supplierName || '—' },
    { key: 'pan', header: 'PAN', width: '120px', render: (row: any) => row.pan || '—' },
    { key: 'tdsSection', header: 'TDS Section', width: '120px', render: (row: any) => row.tdsSection || '194Q' },
    { key: 'billCount', header: 'Bills', width: '70px', align: 'right', render: (row: any) => row.billCount || 0 },
    { key: 'totalTaxableValue', header: 'Taxable Value', width: '150px', align: 'right', render: (row: any) => `₹${fmt(row.totalTaxableValue)}` },
    { key: 'tdsDeducted', header: 'TDS Deducted', width: '140px', align: 'right', render: (row: any) => `₹${fmt(row.tdsDeducted)}` },
    { key: 'netPayments', header: 'Net Payments', width: '150px', align: 'right', render: (row: any) => `₹${fmt(row.netPayments)}` },
  ], []);

  // ─── Party-wise TCS Columns ────────────────────────────────
  const tcsPartyColumns = useMemo<Column<any>[]>(() => [
    { key: 'partyName', header: 'Party Name', width: '200px', render: (row: any) => row.partyName || row.customerName || '—' },
    { key: 'pan', header: 'PAN', width: '120px', render: (row: any) => row.pan || '—' },
    { key: 'tcsSection', header: 'TCS Section', width: '120px', render: (row: any) => row.tcsSection || '206C(1H)' },
    { key: 'billCount', header: 'Bills', width: '70px', align: 'right', render: (row: any) => row.billCount || 0 },
    { key: 'totalTaxableValue', header: 'Taxable Value', width: '150px', align: 'right', render: (row: any) => `₹${fmt(row.totalTaxableValue)}` },
    { key: 'tcsCollected', header: 'TCS Collected', width: '140px', align: 'right', render: (row: any) => `₹${fmt(row.tcsCollected)}` },
  ], []);

  // ─── Section-wise Columns ──────────────────────────────────
  const sectionColumns = useMemo<Column<any>[]>(() => [
    { key: 'sectionCode', header: 'Section Code', width: '130px', render: (row: any) => row.sectionCode || '—' },
    { key: 'transactionCount', header: 'Transactions', width: '110px', align: 'right', render: (row: any) => row.transactionCount || 0 },
    { key: 'totalTaxableValue', header: 'Taxable Value', width: '160px', align: 'right', render: (row: any) => `₹${fmt(row.totalTaxableValue)}` },
    { key: 'taxAmount', header: 'Tax Amount', width: '140px', align: 'right', render: (row: any) => `₹${fmt(row.tdsAmount || row.tcsAmount || row.taxAmount || 0)}` },
    { key: 'averageRate', header: 'Avg Rate %', width: '100px', align: 'right', render: (row: any) => `${row.averageRate ?? 0}%` },
  ], []);

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
    return createPortal(
      <div id="print-preview-root" style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: '#f1f5f9',
        zIndex: 99999,
        overflowY: 'auto',
        padding: '32px 24px 64px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box'
      }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 landscape; margin: 15mm; }
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
              height: auto !important;
              background: transparent !important;
              border-radius: 0 !important;
            }
          }
        `}} />

        <div className="no-print" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          width: '100%',
          maxWidth: '960px',
          marginBottom: '20px', 
          padding: '12px 24px', 
          background: 'var(--color-surface)', 
          border: '1px solid var(--color-border)', 
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          boxSizing: 'border-box'
        }}>
          <Button variant="ghost" onClick={() => setShowPrintPreview(false)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </Button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} /> Export PDF
            </Button>
            <Button variant="primary" onClick={() => setTimeout(() => window.print(), 100)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} /> Print
            </Button>
          </div>
        </div>

        <div id="print-area" className="print-page" style={{
          background: '#ffffff',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          padding: '20mm',
          width: '100%',
          maxWidth: '960px',
          boxSizing: 'border-box',
          color: '#1e293b'
        }}>
          {/* Branded Print Header */}
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a', textAlign: 'center' }}>
              {activeCompany.companyName}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '12px', textAlign: 'center' }}>
              {activeCompany.addressLine1} {activeCompany.addressLine2 && `, ${activeCompany.addressLine2}`} | {activeCompany.city} - {activeCompany.pincode}
            </p>
            {activeCompany.panNumber && (
              <p style={{ margin: '2px 0 0', color: '#0f172a', fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>
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
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>TDS Section Breakdown</h4>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#ffffff', borderBottom: '1.5px solid #0f172a', fontWeight: 700 }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Section</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>Bills</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>Taxable Value</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>TDS Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData?.tdsSections || []).length > 0 ? (
                      (dashboardData?.tdsSections || []).map((row: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 12px' }}>{row.sectionCode}</td>
                          <td style={{ textAlign: 'right', padding: '8px 12px' }}>{row.transactionCount}</td>
                          <td style={{ textAlign: 'right', padding: '8px 12px' }}>₹{fmt(row.totalTaxableValue)}</td>
                          <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>₹{fmt(row.tdsAmount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                          No TDS section deductions found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: '10px 14px', borderBottom: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '12px', fontWeight: 700, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>TCS Section Breakdown</h4>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ background: '#ffffff', borderBottom: '1.5px solid #0f172a', fontWeight: 700 }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Section</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>Bills</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>Taxable Value</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px' }}>TCS Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(dashboardData?.tcsSections || []).length > 0 ? (
                      (dashboardData?.tcsSections || []).map((row: any, i: number) => (
                        <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '8px 12px' }}>{row.sectionCode}</td>
                          <td style={{ textAlign: 'right', padding: '8px 12px' }}>{row.transactionCount}</td>
                          <td style={{ textAlign: 'right', padding: '8px 12px' }}>₹{fmt(row.totalTaxableValue)}</td>
                          <td style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>₹{fmt(row.tcsAmount)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                          No TCS section collections found.
                        </td>
                      </tr>
                    )}
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
                {(tdsRegister || []).length > 0 ? (
                  (tdsRegister || []).map((row: any, i: number) => (
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                      No TDS deductions recorded in the selected period.
                    </td>
                  </tr>
                )}
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
                {(tcsRegister || []).length > 0 ? (
                  (tcsRegister || []).map((row: any, i: number) => (
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                      No TCS collections recorded in the selected period.
                    </td>
                  </tr>
                )}
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
                {(tdsPartyData || []).length > 0 ? (
                  (tdsPartyData || []).map((row: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px' }}>{row.partyName}</td>
                      <td style={{ padding: '6px' }}>{row.pan}</td>
                      <td style={{ padding: '6px' }}>{row.tdsSection}</td>
                      <td style={{ textAlign: 'right', padding: '6px' }}>{row.billCount}</td>
                      <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.totalTaxableValue)}</td>
                      <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>₹{fmt(row.tdsDeducted)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                      No party-wise TDS deductions found in this period.
                    </td>
                  </tr>
                )}
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
                {(tcsPartyData || []).length > 0 ? (
                  (tcsPartyData || []).map((row: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '6px' }}>{row.partyName}</td>
                      <td style={{ padding: '6px' }}>{row.pan}</td>
                      <td style={{ padding: '6px' }}>{row.tcsSection}</td>
                      <td style={{ textAlign: 'right', padding: '6px' }}>{row.billCount}</td>
                      <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.totalTaxableValue)}</td>
                      <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>₹{fmt(row.tcsCollected)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                      No party-wise TCS collections found in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>,
      document.body
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
              keyField="partyName"
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
              keyField="partyName"
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
