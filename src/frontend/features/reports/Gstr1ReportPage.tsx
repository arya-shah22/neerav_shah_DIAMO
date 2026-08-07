// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — GSTR-1 Outward Supplies Page
// Phase 11.5: GSTR-1 Return Filing (B2B, B2CL, B2CS, CDN, HSN, Doc Summary)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, ArrowLeft, Calendar, RefreshCw } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';

type Gstr1Tab = 'B2B' | 'B2CL' | 'B2CS' | 'CDN' | 'HSN' | 'DOC';

export const Gstr1ReportPage: React.FC = () => {
  const { activeCompany, companyId, isReady } = useActiveCompany();

  // Get current financial year dates
  const now = new Date();
  const fyStart = now.getMonth() >= 3
    ? `${now.getFullYear()}-04-01`
    : `${now.getFullYear() - 1}-04-01`;
  const todayStr = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(todayStr);
  const [activeTab, setActiveTab] = useState<Gstr1Tab>('B2B');
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // IPC Hooks
  const { data: gstr1Data, loading, invoke: getGstr1Report } = useIpc<any>('report:gstr1');

  const refreshReport = useCallback(async () => {
    if (!companyId) return;
    await getGstr1Report({ companyId, startDate, endDate });
  }, [companyId, startDate, endDate, getGstr1Report]);

  useEffect(() => {
    refreshReport();
  }, [refreshReport]);

  const triggerDirectPrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportPDF = async () => {
    setShowPrintPreview(true);
    setTimeout(async () => {
      try {
        const res = await window.api.invoke('system:print-to-pdf', {
          filename: `GSTR1_Report_${startDate}_to_${endDate}.pdf`
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

  const handleExportJSON = async () => {
    if (!companyId) return;
    try {
      const res = await window.api.invoke('report:gstr1-json', { companyId, startDate, endDate }) as any;
      const data = res?.data || res;
      if (data) {
        const payload = data.payload || data;
        const filename = data.filename || `GSTR1_Offline_Payload_${startDate}_to_${endDate}.json`;
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to generate GSTR-1 JSON offline utility file');
    }
  };

  const fmt = (v?: number) => (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const b2bColumns = useMemo<Column<any>[]>(() => [
    { key: 'gstin', header: 'CUSTOMER GSTIN', sortable: true, render: (row) => row.gstin || '—' },
    { key: 'partyName', header: 'PARTY NAME', sortable: true, render: (row) => row.partyName || '—' },
    { key: 'invoiceNumber', header: 'INVOICE NO', sortable: true, render: (row) => row.invoiceNumber || '—' },
    { key: 'formattedDate', header: 'DATE', render: (row) => row.formattedDate || row.invoiceDate || '—' },
    { key: 'placeOfSupply', header: 'POS STATE', align: 'center', render: (row) => row.placeOfSupply || '—' },
    { 
      key: 'invoiceValue', 
      header: 'INVOICE VALUE', 
      align: 'right',
      render: (row) => `₹${fmt(row.invoiceValue)}`
    },
    { 
      key: 'taxableValue', 
      header: 'TAXABLE AMT', 
      align: 'right',
      render: (row) => `₹${fmt(row.taxableValue)}`
    },
    { 
      key: 'totalTax', 
      header: 'GST AMT', 
      align: 'right',
      render: (row) => `₹${fmt(row.totalTax)}`
    },
  ], []);

  const b2clColumns = useMemo<Column<any>[]>(() => [
    { key: 'invoiceNumber', header: 'INVOICE NO', sortable: true, render: (row) => row.invoiceNumber || '—' },
    { key: 'formattedDate', header: 'DATE', render: (row) => row.formattedDate || row.invoiceDate || '—' },
    { key: 'placeOfSupply', header: 'POS STATE', align: 'center', sortable: true, render: (row) => row.placeOfSupply || '—' },
    { 
      key: 'invoiceValue', 
      header: 'INVOICE VALUE', 
      align: 'right',
      render: (row) => `₹${fmt(row.invoiceValue)}`
    },
    { 
      key: 'taxableValue', 
      header: 'TAXABLE AMT', 
      align: 'right',
      render: (row) => `₹${fmt(row.taxableValue)}`
    },
    { 
      key: 'igst', 
      header: 'IGST AMT', 
      align: 'right',
      render: (row) => `₹${fmt(row.igst)}`
    },
  ], []);

  const b2csColumns = useMemo<Column<any>[]>(() => [
    { key: 'invoiceNumber', header: 'BILL NO', sortable: true, render: (row) => row.invoiceNumber || '—' },
    { key: 'formattedDate', header: 'DATE', render: (row) => row.formattedDate || row.invoiceDate || '—' },
    { key: 'type', header: 'TYPE', align: 'center', render: (row) => row.type || 'Intrastate' },
    { key: 'placeOfSupply', header: 'POS STATE', align: 'center', sortable: true, render: (row) => row.placeOfSupply || '—' },
    { 
      key: 'invoiceValue', 
      header: 'BILL VALUE', 
      align: 'right',
      render: (row) => `₹${fmt(row.invoiceValue)}`
    },
    { 
      key: 'taxableValue', 
      header: 'TAXABLE VALUE', 
      align: 'right',
      render: (row) => `₹${fmt(row.taxableValue)}`
    },
    { 
      key: 'igst', 
      header: 'IGST', 
      align: 'right',
      render: (row) => (row.igst || 0) > 0 ? `₹${fmt(row.igst)}` : '—'
    },
    { 
      key: 'cgst_sgst', 
      header: 'CGST / SGST', 
      align: 'right',
      render: (row) => ((row.cgst || 0) + (row.sgst || 0)) > 0 ? `₹${fmt((row.cgst || 0) + (row.sgst || 0))}` : '—'
    },
  ], []);

  const cdnColumns = useMemo<Column<any>[]>(() => [
    { key: 'gstin', header: 'GSTIN', render: (row) => row.gstin || 'URP' },
    { key: 'partyName', header: 'PARTY NAME', render: (row) => row.partyName || '—' },
    { key: 'noteNumber', header: 'NOTE NO', render: (row) => row.noteNumber || '—' },
    { key: 'formattedDate', header: 'DATE', render: (row) => row.formattedDate || row.noteDate || '—' },
    { key: 'noteTypeName', header: 'TYPE', align: 'center', render: (row) => row.noteTypeName || (row.noteType === 'C' ? 'Credit Note' : 'Debit Note') },
    { 
      key: 'noteValue', 
      header: 'NOTE VALUE', 
      align: 'right',
      render: (row) => `₹${fmt(row.noteValue)}`
    },
    { 
      key: 'taxableValue', 
      header: 'TAXABLE VALUE', 
      align: 'right',
      render: (row) => `₹${fmt(row.taxableValue)}`
    },
    { 
      key: 'totalTax', 
      header: 'TAX AMT', 
      align: 'right',
      render: (row) => `₹${fmt(row.totalTax)}`
    },
  ], []);

  const hsnColumns = useMemo<Column<any>[]>(() => [
    { key: 'hsnCode', header: 'HSN CODE', sortable: true },
    { key: 'description', header: 'DESCRIPTION' },
    { key: 'uqc', header: 'UQC', align: 'center' },
    { key: 'totalCarats', header: 'TOTAL CARATS', align: 'right', render: (row) => `${(row.totalCarats || 0).toFixed(3)} Cts` },
    { 
      key: 'totalValue', 
      header: 'TOTAL VALUE', 
      align: 'right',
      render: (row) => `₹${fmt(row.totalValue)}`
    },
    { 
      key: 'taxableValue', 
      header: 'TAXABLE VALUE', 
      align: 'right',
      render: (row) => `₹${fmt(row.taxableValue)}`
    },
    { 
      key: 'totalTax', 
      header: 'TOTAL TAX', 
      align: 'right',
      render: (row) => `₹${fmt(row.totalTax)}`
    },
  ], []);

  const docColumns = useMemo<Column<any>[]>(() => [
    { key: 'docType', header: 'DOCUMENT TYPE', render: (row) => row.docType || 'Invoices for Outward Supply' },
    { key: 'from', header: 'FROM SERIAL', render: (row) => row.from || '—' },
    { key: 'to', header: 'TO SERIAL', render: (row) => row.to || '—' },
    { key: 'totalCount', header: 'TOTAL COUNT', align: 'center', render: (row) => row.totalCount || 0 },
    { key: 'cancelledCount', header: 'CANCELLED COUNT', align: 'center', render: (row) => row.cancelledCount || 0 },
    { key: 'netIssued', header: 'NET ISSUED', align: 'center', render: (row) => row.netIssued || 0 },
  ], []);

  const gridData = useMemo(() => {
    if (!gstr1Data) return [];
    switch (activeTab) {
      case 'B2B': return gstr1Data.b2b || [];
      case 'B2CL': return gstr1Data.b2cl || [];
      case 'B2CS': return gstr1Data.b2cs || [];
      case 'CDN': return gstr1Data.cdnr || [];
      case 'HSN': return gstr1Data.hsnSummary || [];
      case 'DOC': return gstr1Data.docSummary ? [gstr1Data.docSummary] : [];
    }
  }, [activeTab, gstr1Data]);

  const gridColumns = useMemo(() => {
    switch (activeTab) {
      case 'B2B': return b2bColumns;
      case 'B2CL': return b2clColumns;
      case 'B2CS': return b2csColumns;
      case 'CDN': return cdnColumns;
      case 'HSN': return hsnColumns;
      case 'DOC': return docColumns;
    }
  }, [activeTab, b2bColumns, b2clColumns, b2csColumns, cdnColumns, hsnColumns, docColumns]);

  const getTabCount = (tab: Gstr1Tab): number => {
    if (!gstr1Data) return 0;
    switch (tab) {
      case 'B2B': return gstr1Data.b2b?.length || 0;
      case 'B2CL': return gstr1Data.b2cl?.length || 0;
      case 'B2CS': return gstr1Data.b2cs?.length || 0;
      case 'CDN': return gstr1Data.cdnr?.length || 0;
      case 'HSN': return gstr1Data.hsnSummary?.length || 0;
      case 'DOC': return gstr1Data.docSummary?.totalCount ? 1 : 0;
    }
  };

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)', padding: '24px' }}>Select a company first.</p>;
  }

  // ── Print Preview Mode ──
  if (showPrintPreview && activeCompany && gstr1Data) {
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
            <ArrowLeft size={16} /> Back to Page
          </Button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="ghost" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} /> Export PDF
            </Button>
            <Button variant="primary" onClick={triggerDirectPrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          {/* Header */}
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
              {activeCompany.companyName}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '12px' }}>
              {activeCompany.addressLine1} {activeCompany.addressLine2 && `, ${activeCompany.addressLine2}`} | {activeCompany.city} - {activeCompany.pincode}
            </p>
            {activeCompany.gstinNumber && (
              <p style={{ margin: '2px 0 0', color: '#0f172a', fontSize: '12px', fontWeight: 600 }}>
                GSTIN: {activeCompany.gstinNumber}
              </p>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '13px', fontWeight: 600 }}>
              <span style={{ color: 'var(--color-primary)' }}>GSTR-1 OUTWARD SUPPLIES REPORT</span>
              <span>PERIOD: {startDate} TO {endDate}</span>
            </div>
          </div>

          {/* Active Tab Data Table */}
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0', textTransform: 'uppercase', color: 'var(--color-primary)' }}>
            {activeTab === 'B2B' && 'B2B Registered Invoices'}
            {activeTab === 'B2CL' && 'B2C Large Invoices'}
            {activeTab === 'B2CS' && 'B2C Small Bills'}
            {activeTab === 'CDN' && 'Credit & Debit Notes'}
            {activeTab === 'HSN' && 'HSN Summary'}
            {activeTab === 'DOC' && 'Documents Issued Summary'}
          </h3>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              {activeTab === 'B2B' && (
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Customer GSTIN</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Party Name</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Invoice No</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Date</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Value</th>
                  <th style={{ textAlign: 'center', padding: '6px' }}>POS</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Taxable Amt</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>GST Amt</th>
                </tr>
              )}
              {activeTab === 'B2CL' && (
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Invoice No</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Date</th>
                  <th style={{ textAlign: 'center', padding: '6px' }}>POS State</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Invoice Value</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Taxable Amt</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>IGST Amt</th>
                </tr>
              )}
              {activeTab === 'B2CS' && (
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Bill No</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Date</th>
                  <th style={{ textAlign: 'center', padding: '6px' }}>Type</th>
                  <th style={{ textAlign: 'center', padding: '6px' }}>POS State</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Bill Value</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Taxable Amt</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>IGST</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>CGST/SGST</th>
                </tr>
              )}
              {activeTab === 'CDN' && (
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>GSTIN</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Party Name</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Note No</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Date</th>
                  <th style={{ textAlign: 'center', padding: '6px' }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Note Value</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Taxable Value</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Tax Amt</th>
                </tr>
              )}
              {activeTab === 'HSN' && (
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>HSN</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Description</th>
                  <th style={{ textAlign: 'center', padding: '6px' }}>UQC</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Carats</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Total Value</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Taxable Value</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Total Tax</th>
                </tr>
              )}
              {activeTab === 'DOC' && (
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Document Type</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>From Serial</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>To Serial</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Total Count</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Cancelled</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Net Issued</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeTab === 'B2B' && (gstr1Data.b2b || []).map((row: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px' }}>{row.gstin || '—'}</td>
                  <td style={{ padding: '6px' }}>{row.partyName || '—'}</td>
                  <td style={{ padding: '6px' }}>{row.invoiceNumber}</td>
                  <td style={{ padding: '6px' }}>{row.formattedDate || row.invoiceDate}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.invoiceValue)}</td>
                  <td style={{ textAlign: 'center', padding: '6px' }}>{row.placeOfSupply}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.taxableValue)}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.totalTax)}</td>
                </tr>
              ))}
              {activeTab === 'B2CL' && (gstr1Data.b2cl || []).map((row: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px' }}>{row.invoiceNumber}</td>
                  <td style={{ padding: '6px' }}>{row.formattedDate || row.invoiceDate}</td>
                  <td style={{ textAlign: 'center', padding: '6px' }}>{row.placeOfSupply}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.invoiceValue)}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.taxableValue)}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.igst)}</td>
                </tr>
              ))}
              {activeTab === 'B2CS' && (gstr1Data.b2cs || []).map((row: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px' }}>{row.invoiceNumber}</td>
                  <td style={{ padding: '6px' }}>{row.formattedDate || row.invoiceDate}</td>
                  <td style={{ textAlign: 'center', padding: '6px' }}>{row.type}</td>
                  <td style={{ textAlign: 'center', padding: '6px' }}>{row.placeOfSupply}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.invoiceValue)}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.taxableValue)}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>{row.igst > 0 ? `₹${fmt(row.igst)}` : '—'}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>{((row.cgst || 0) + (row.sgst || 0)) > 0 ? `₹${fmt((row.cgst || 0) + (row.sgst || 0))}` : '—'}</td>
                </tr>
              ))}
              {activeTab === 'CDN' && (gstr1Data.cdnr || []).map((row: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px' }}>{row.gstin || 'URP'}</td>
                  <td style={{ padding: '6px' }}>{row.partyName || '—'}</td>
                  <td style={{ padding: '6px' }}>{row.noteNumber}</td>
                  <td style={{ padding: '6px' }}>{row.formattedDate || row.noteDate}</td>
                  <td style={{ textAlign: 'center', padding: '6px' }}>{row.noteTypeName}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.noteValue)}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.taxableValue)}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.totalTax)}</td>
                </tr>
              ))}
              {activeTab === 'HSN' && (gstr1Data.hsnSummary || []).map((row: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px', fontWeight: 600 }}>{row.hsnCode}</td>
                  <td style={{ padding: '6px' }}>{row.description}</td>
                  <td style={{ textAlign: 'center', padding: '6px' }}>{row.uqc}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>{(row.totalCarats || 0).toFixed(3)} Cts</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.totalValue)}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.taxableValue)}</td>
                  <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>₹{fmt(row.totalTax)}</td>
                </tr>
              ))}
              {activeTab === 'DOC' && gstr1Data.docSummary && (
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px' }}>{gstr1Data.docSummary.docType || 'Invoices for Outward Supply'}</td>
                  <td style={{ padding: '6px' }}>{gstr1Data.docSummary.from}</td>
                  <td style={{ padding: '6px' }}>{gstr1Data.docSummary.to}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>{gstr1Data.docSummary.totalCount}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>{gstr1Data.docSummary.cancelledCount}</td>
                  <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>{gstr1Data.docSummary.netIssued}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>,
      document.body
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>GSTR-1 Outward Supplies</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Outward supply returns categorized for GSTR-1 portal upload.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={handleExportJSON} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} /> Portal JSON
          </Button>
          <Button variant="ghost" onClick={() => setShowPrintPreview(true)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print / Preview
          </Button>
          <Button variant="primary" onClick={refreshReport} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
          </Button>
        </div>
      </div>

      {/* Date Filters */}
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
          <Calendar size={16} style={{ color: 'var(--color-text-secondary)' }} />
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

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '4px' }}>
        {(['B2B', 'B2CL', 'B2CS', 'CDN', 'HSN', 'DOC'] as Gstr1Tab[]).map((tab) => {
          const isActive = activeTab === tab;
          const labels: Record<Gstr1Tab, string> = {
            B2B: 'B2B Invoices',
            B2CL: 'B2C Large',
            B2CS: 'B2C Small',
            CDN: 'Credit/Debit Notes',
            HSN: 'HSN Summary',
            DOC: 'Doc Issued Summary'
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 16px',
                fontSize: '13px',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                borderBottom: isActive ? '2px solid var(--color-primary)' : 'none',
                background: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {labels[tab]}
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                background: isActive ? 'var(--color-primary)' : 'var(--color-bg-card)',
                color: isActive ? '#ffffff' : 'var(--color-text-secondary)',
                padding: '2px 8px',
                borderRadius: '10px',
                border: isActive ? 'none' : '1px solid var(--color-border)'
              }}>
                {getTabCount(tab)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
        <DataGrid
          columns={gridColumns}
          data={gridData}
          keyField="id"
          loading={loading}
          emptyTitle="No Records Found"
          emptyDescription={`No GSTR-1 ${activeTab} data found in the selected period.`}
        />
      </div>
    </div>
  );
};
