// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — GSTR-2 & ITC Reconciliation Page
// Phase 11.5: GSTR-2 & Supplier Invoice ITC reconciliation
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Calendar, RefreshCw, AlertTriangle, CheckCircle, HelpCircle, XCircle, Printer, Download, ArrowLeft, FileText } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';

type Gstr2Tab = 'RECONCILE' | 'INPUT_REG' | 'OUTPUT_REG';

export const Gstr2ReconciliationPage: React.FC = () => {
  const { companyId, activeCompany } = useActiveCompany();
  const navigate = useNavigate();

  // Get current financial year dates
  const now = new Date();
  const fyStart = now.getMonth() >= 3
    ? `${now.getFullYear()}-04-01`
    : `${now.getFullYear() - 1}-04-01`;
  const todayStr = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(todayStr);
  const [activeTab, setActiveTab] = useState<Gstr2Tab>('RECONCILE');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  
  // GSTR-2B Data state
  const [gstr2bList, setGstr2bList] = useState<any[]>(() => {
    const saved = localStorage.getItem('diamo_gstr2b_list');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [uploadFileName, setUploadFileName] = useState<string>(() => {
    return localStorage.getItem('diamo_gstr2b_filename') || '';
  });

  // Sync uploaded file state with localStorage
  useEffect(() => {
    localStorage.setItem('diamo_gstr2b_list', JSON.stringify(gstr2bList));
    localStorage.setItem('diamo_gstr2b_filename', uploadFileName);
  }, [gstr2bList, uploadFileName]);

  // IPC Hooks
  const { data: registersData, loading: regLoading, invoke: getGstRegisters } = useIpc<any>('report:gst-registers');
  const { data: recData, loading: recLoading, invoke: reconcileItc } = useIpc<any>('report:reconcile-itc');

  const refreshRegisters = useCallback(async () => {
    if (!companyId) return;
    await getGstRegisters({ companyId, startDate, endDate });
  }, [companyId, startDate, endDate, getGstRegisters]);

  useEffect(() => {
    refreshRegisters();
  }, [refreshRegisters]);

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
          filename: `GSTR2B_Reconciliation_${startDate}_to_${endDate}.pdf`
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

  // Run reconciliation whenever date filters, company, or uploaded list changes
  useEffect(() => {
    if (companyId) {
      reconcileItc({ companyId, gstr2bList: gstr2bList || [], startDate, endDate });
    }
  }, [companyId, gstr2bList, startDate, endDate, reconcileItc]);

  const handleDownloadSample = () => {
    const sampleData = {
      b2b: [
        {
          ctin: "24SUPPLIER1234A",
          inv: [
            {
              inum: "PUR-001",
              idt: "05-07-2026",
              val: 100250,
              itms: [
                {
                  itm_det: {
                    rt: 0.25,
                    txval: 100000,
                    iamt: 0,
                    camt: 125,
                    samt: 125,
                    csamt: 0
                  }
                }
              ]
            }
          ]
        }
      ]
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sampleData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "sample_gstr2b.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = "Supplier GSTIN,Invoice Number,Invoice Date,Total Value,Taxable Value,CGST,SGST,IGST\n24SUPPLIER1234A,PUR-001,05-07-2026,100250,100000,125,125,0\n";
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "sample_gstr2b.csv");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleClearFile = () => {
    setGstr2bList([]);
    setUploadFileName('');
    localStorage.removeItem('diamo_gstr2b_list');
    localStorage.removeItem('diamo_gstr2b_filename');
  };

  // Robust CSV line parser handling quotes and commas
  const parseCsvLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(cur.trim().replace(/^"|"$/g, ''));
        cur = '';
      } else {
        cur += char;
      }
    }
    cells.push(cur.trim().replace(/^"|"$/g, ''));
    return cells;
  };

  // Handle portal GSTR-2B JSON or CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        
        if (file.name.toLowerCase().endsWith('.csv')) {
          const rawLines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
          if (rawLines.length < 2) throw new Error('Empty CSV file');
          
          const headers = parseCsvLine(rawLines[0]).map(h => h.toLowerCase());
          const ctinIdx = headers.findIndex(h => h.includes('gstin') || h.includes('supplier') || h.includes('party'));
          const inumIdx = headers.findIndex(h => h.includes('invoice') || h.includes('bill') || h.includes('inum') || h.includes('number') || h.includes('no'));
          const idtIdx = headers.findIndex(h => h.includes('date') || h.includes('idt'));
          const valIdx = headers.findIndex(h => h.includes('total') || h.includes('val') || h.includes('amount'));
          const txvalIdx = headers.findIndex(h => h.includes('taxable') || h.includes('txval'));
          const iamtIdx = headers.findIndex(h => h.includes('igst') || h.includes('integrated'));
          const camtIdx = headers.findIndex(h => h.includes('cgst') || h.includes('central'));
          const samtIdx = headers.findIndex(h => h.includes('sgst') || h.includes('state'));

          const invoices: any[] = [];
          for (let i = 1; i < rawLines.length; i++) {
            const row = parseCsvLine(rawLines[i]);
            if (row.length < 2) continue;

            const ctin = ctinIdx !== -1 ? row[ctinIdx] : '';
            const inum = inumIdx !== -1 ? row[inumIdx] : (row[1] || '');
            const idt = idtIdx !== -1 ? row[idtIdx] : '';
            const valStr = valIdx !== -1 ? row[valIdx] : '0';
            const val = Number(valStr.replace(/[^0-9.]/g, '')) || 0;
            const txvalStr = txvalIdx !== -1 ? row[txvalIdx] : valStr;
            const txval = Number(txvalStr.replace(/[^0-9.]/g, '')) || val;
            const iamt = iamtIdx !== -1 ? (Number(row[iamtIdx].replace(/[^0-9.]/g, '')) || 0) : 0;
            const camt = camtIdx !== -1 ? (Number(row[camtIdx].replace(/[^0-9.]/g, '')) || 0) : 0;
            const samt = samtIdx !== -1 ? (Number(row[samtIdx].replace(/[^0-9.]/g, '')) || 0) : 0;

            if (!inum && !ctin && txval === 0) continue;

            invoices.push({
              partyGstin: ctin,
              gstin: ctin,
              ctin,
              billNo: inum,
              invoiceNumber: inum,
              inum,
              idt,
              val,
              portalTaxable: txval,
              taxableValue: txval,
              txval,
              portalTax: iamt + camt + samt,
              igst: iamt,
              cgst: camt,
              sgst: samt,
              iamt,
              camt,
              samt,
              csamt: 0
            });
          }
          setGstr2bList(invoices);
          return;
        }

        const json = JSON.parse(text);
        const b2bInvoices = json.b2b || json.data?.b2b || json.docdata?.b2b || json.b2ba || [];
        
        const invoices: any[] = [];
        if (Array.isArray(b2bInvoices) && b2bInvoices.length > 0) {
          b2bInvoices.forEach((b2bItem: any) => {
            const ctin = b2bItem.ctin || b2bItem.gstin || '';
            const invList = b2bItem.inv || b2bItem.invoices || [];
            invList.forEach((inv: any) => {
              const txval = inv.itms?.[0]?.itm_det?.txval ?? inv.txval ?? inv.val;
              const iamt = inv.itms?.[0]?.itm_det?.iamt ?? inv.iamt ?? 0;
              const camt = inv.itms?.[0]?.itm_det?.camt ?? inv.camt ?? 0;
              const samt = inv.itms?.[0]?.itm_det?.samt ?? inv.samt ?? 0;
              const csamt = inv.itms?.[0]?.itm_det?.csamt ?? inv.csamt ?? 0;

              invoices.push({
                partyGstin: ctin,
                gstin: ctin,
                ctin,
                billNo: inv.inum,
                invoiceNumber: inv.inum,
                inum: inv.inum,
                idt: inv.idt,
                val: inv.val,
                portalTaxable: txval,
                taxableValue: txval,
                txval,
                portalTax: iamt + camt + samt,
                igst: iamt,
                cgst: camt,
                sgst: samt,
                iamt,
                camt,
                samt,
                csamt
              });
            });
          });
        }

        if (invoices.length === 0 && Array.isArray(json)) {
          setGstr2bList(json);
        } else {
          setGstr2bList(invoices);
        }
      } catch (err) {
        alert('Invalid GSTR-2B JSON/CSV file structure. Ensure you are uploading a valid GST return payload.');
        setUploadFileName('');
      }
    };
    reader.readAsText(file);
  };

  // Registers columns
  const registerColumns = useMemo<Column<any>[]>(() => [
    { key: 'date', header: 'DATE', sortable: true },
    { key: 'invoiceNo', header: 'BILL / INV NO', sortable: true, render: (row) => row.invoiceNo || row.billNo || row.voucherNumber || '—' },
    { key: 'partyName', header: 'PARTY NAME', sortable: true, render: (row) => row.partyName || '—' },
    { key: 'partyGstin', header: 'GSTIN', align: 'center', render: (row) => row.partyGstin || row.gstin || 'URP' },
    { 
      key: 'taxableValue', 
      header: 'TAXABLE VALUE', 
      align: 'right',
      render: (row) => `₹${(Number(row.taxableValue) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    },
    { 
      key: 'cgst', 
      header: 'CGST', 
      align: 'right',
      render: (row) => row.cgst > 0 ? `₹${(Number(row.cgst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'sgst', 
      header: 'SGST', 
      align: 'right',
      render: (row) => row.sgst > 0 ? `₹${(Number(row.sgst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'igst', 
      header: 'IGST', 
      align: 'right',
      render: (row) => row.igst > 0 ? `₹${(Number(row.igst) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'netAmount', 
      header: 'NET AMOUNT', 
      align: 'right',
      render: (row) => <span style={{ fontWeight: 600 }}>₹{(Number(row.netAmount || row.grossAmount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
    },
  ], []);

  // Reconciliation columns
  const reconcileColumns = useMemo<Column<any>[]>(() => [
    { key: 'partyGstin', header: 'SUPPLIER GSTIN', sortable: true, render: (row) => row.partyGstin || row.gstin || '—' },
    { key: 'billNo', header: 'BILL NO', sortable: true, render: (row) => row.billNo || row.invoiceNumber || '—' },
    { key: 'partyName', header: 'PARTY NAME', render: (row) => row.partyName || '—' },
    { 
      key: 'localTaxable', 
      header: 'TAXABLE (BOOKS)', 
      align: 'right',
      render: (row) => row.localTaxable != null ? `₹${(Number(row.localTaxable) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'localTax', 
      header: 'TAX (BOOKS)', 
      align: 'right',
      render: (row) => row.localTax != null ? `₹${(Number(row.localTax) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'portalTaxable', 
      header: 'TAXABLE (GSTR-2B)', 
      align: 'right',
      render: (row) => row.portalTaxable != null ? `₹${(Number(row.portalTaxable) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'portalTax', 
      header: 'TAX (GSTR-2B)', 
      align: 'right',
      render: (row) => row.portalTax != null ? `₹${(Number(row.portalTax) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'status', 
      header: 'STATUS', 
      align: 'center',
      render: (row) => {
        const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
          MATCHED: { bg: 'var(--color-success-light)', text: 'var(--color-success)', icon: <CheckCircle size={14} /> },
          MISMATCH: { bg: 'var(--color-warning-light)', text: 'var(--color-warning)', icon: <AlertTriangle size={14} /> },
          MISSING_IN_PORTAL: { bg: 'var(--color-bg-card)', text: 'var(--color-text-secondary)', icon: <HelpCircle size={14} /> },
          NOT_IN_BOOKS: { bg: 'var(--color-error-light)', text: 'var(--color-error)', icon: <XCircle size={14} /> },
        };
        const cfg = statusColors[row.status] || { bg: '#f1f5f9', text: '#64748b', icon: null };
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: cfg.bg,
            color: cfg.text,
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700
          }}>
            {cfg.icon}
            {row.status ? row.status.replace(/_/g, ' ') : '—'}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'ACTION',
      align: 'center',
      render: (row) => {
        if (row.status === 'NOT_IN_BOOKS') {
          return (
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/transactions/purchases/new', {
                state: {
                  prefill: {
                    supplierGstin: row.partyGstin,
                    billNumber: row.billNo,
                    totalGrossAmount: row.portalTaxable,
                    totalTax: row.portalTax
                  }
                }
              })}
            >
              Record Purchase
            </Button>
          );
        }
        if (row.purchaseId) {
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/transactions/purchases/${row.purchaseId}`)}
            >
              View Bill
            </Button>
          );
        }
        return '—';
      }
    },
  ], [navigate]);

  const gridData = useMemo(() => {
    if (activeTab === 'INPUT_REG') return registersData?.inputRegister || registersData?.purchaseRegister || [];
    if (activeTab === 'OUTPUT_REG') return registersData?.outputRegister || registersData?.salesRegister || [];
    return recData?.reconciledList || [];
  }, [activeTab, registersData, recData]);

  const gridColumns = useMemo(() => {
    if (activeTab === 'RECONCILE') return reconcileColumns;
    return registerColumns;
  }, [activeTab, reconcileColumns, registerColumns]);

  const fmt0 = (v?: number) => (Number(v) || 0).toLocaleString('en-IN');
  const fmt = (v?: number) => (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const s = recData?.summary ?? { matchedItc: 0, mismatchItc: 0, supplierPendingItc: 0, notInBooksItc: 0, totalLocalItc: 0 };

  // ── Print Preview Mode ──
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
              <span style={{ color: 'var(--color-primary)' }}>
                {activeTab === 'RECONCILE' && 'GSTR-2B & ITC RECONCILIATION STATEMENT'}
                {activeTab === 'INPUT_REG' && 'INPUT GST REGISTER (PURCHASES)'}
                {activeTab === 'OUTPUT_REG' && 'OUTPUT GST REGISTER (SALES)'}
              </span>
              <span>PERIOD: {startDate} TO {endDate}</span>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              {activeTab === 'RECONCILE' && (
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Supplier GSTIN</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Bill No</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Party Name</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Taxable (Books)</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Tax (Books)</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Taxable (Portal)</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Tax (Portal)</th>
                  <th style={{ textAlign: 'center', padding: '6px' }}>Status</th>
                </tr>
              )}
              {(activeTab === 'INPUT_REG' || activeTab === 'OUTPUT_REG') && (
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Date</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Voucher No</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Party Name</th>
                  <th style={{ textAlign: 'center', padding: '6px' }}>GSTIN</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Taxable Value</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>CGST</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>SGST</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>IGST</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Net Amount</th>
                </tr>
              )}
            </thead>
            <tbody>
              {activeTab === 'RECONCILE' && gridData.map((row: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px' }}>{row.partyGstin || '—'}</td>
                  <td style={{ padding: '6px' }}>{row.billNo || '—'}</td>
                  <td style={{ padding: '6px' }}>{row.partyName || '—'}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>{row.localTaxable != null ? `₹${fmt(row.localTaxable)}` : '—'}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>{row.localTax != null ? `₹${fmt(row.localTax)}` : '—'}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>{row.portalTaxable != null ? `₹${fmt(row.portalTaxable)}` : '—'}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>{row.portalTax != null ? `₹${fmt(row.portalTax)}` : '—'}</td>
                  <td style={{ textAlign: 'center', padding: '6px', fontWeight: 700 }}>{row.status ? row.status.replace(/_/g, ' ') : '—'}</td>
                </tr>
              ))}
              {(activeTab === 'INPUT_REG' || activeTab === 'OUTPUT_REG') && gridData.map((row: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '6px' }}>{row.date || '—'}</td>
                  <td style={{ padding: '6px' }}>{row.invoiceNo || row.billNo || row.voucherNumber || '—'}</td>
                  <td style={{ padding: '6px' }}>{row.partyName || '—'}</td>
                  <td style={{ textAlign: 'center', padding: '6px' }}>{row.partyGstin || row.gstin || 'URP'}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>₹{fmt(row.taxableValue)}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>{row.cgst > 0 ? `₹${fmt(row.cgst)}` : '—'}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>{row.sgst > 0 ? `₹${fmt(row.sgst)}` : '—'}</td>
                  <td style={{ textAlign: 'right', padding: '6px' }}>{row.igst > 0 ? `₹${fmt(row.igst)}` : '—'}</td>
                  <td style={{ textAlign: 'right', padding: '6px', fontWeight: 700 }}>₹{fmt(row.netAmount || row.grossAmount)}</td>
                </tr>
              ))}
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
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>GSTR-2 & ITC Reconciliation</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Reconcile recorded input tax credit (ITC) books against supplier filings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={handleDownloadSample} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} /> Sample JSON
          </Button>
          <Button variant="ghost" onClick={handleDownloadSampleCsv} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={16} /> Sample CSV
          </Button>
          <Button variant="ghost" onClick={() => setShowPrintPreview(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print / Preview
          </Button>
          <Button variant="primary" onClick={refreshRegisters} disabled={regLoading || recLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={16} className={regLoading || recLoading ? 'animate-spin' : ''} /> Refresh Registers
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
        <button
          onClick={() => setActiveTab('RECONCILE')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'RECONCILE' ? 700 : 500,
            color: activeTab === 'RECONCILE' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'RECONCILE' ? '2px solid var(--color-primary)' : 'none',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          ITC Reconciliation
        </button>
        <button
          onClick={() => setActiveTab('INPUT_REG')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'INPUT_REG' ? 700 : 500,
            color: activeTab === 'INPUT_REG' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'INPUT_REG' ? '2px solid var(--color-primary)' : 'none',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          Input GST Register (Purchases)
        </button>
        <button
          onClick={() => setActiveTab('OUTPUT_REG')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'OUTPUT_REG' ? 700 : 500,
            color: activeTab === 'OUTPUT_REG' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'OUTPUT_REG' ? '2px solid var(--color-primary)' : 'none',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          Output GST Register (Sales)
        </button>
      </div>

      {/* Tab Context Block */}
      {activeTab === 'RECONCILE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* File Upload Zone */}
          {!uploadFileName ? (
            <div style={{
              background: 'var(--color-surface)',
              border: '2px dashed var(--color-border)',
              borderRadius: '8px',
              padding: '24px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <input
                type="file"
                accept=".json,.csv"
                onChange={handleFileUpload}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              <UploadCloud size={32} style={{ color: 'var(--color-primary)' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 700 }}>
                Upload GSTR-2B JSON / CSV file
              </h4>
              <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                Drag and drop the official portal offline utility JSON or CSV return file here to reconcile.
              </p>
            </div>
          ) : (
            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderLeft: '4px solid var(--color-primary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle size={20} style={{ color: 'var(--color-primary)' }} />
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)' }}>
                    Active File: {uploadFileName}
                  </h4>
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                    {gstr2bList.length} records successfully loaded and matched.
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <Button variant="ghost" size="sm" style={{ color: 'var(--color-primary)' }}>
                    Upload Different File
                  </Button>
                  <input
                    type="file"
                    accept=".json,.csv"
                    onChange={handleFileUpload}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={handleClearFile} style={{ color: 'var(--color-error)' }}>
                  Remove File
                </Button>
              </div>
            </div>
          )}



          {/* Reconciliation Summary Cards */}
          {gstr2bList.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', borderLeft: '4px solid var(--color-success)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Matched ITC</span>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-success)', marginTop: '4px' }}>₹{fmt0(s.matchedItc)}</p>
              </div>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', borderLeft: '4px solid var(--color-warning)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Mismatch ITC</span>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-warning)', marginTop: '4px' }}>₹{fmt0(s.mismatchItc)}</p>
              </div>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', borderLeft: '4px solid #64748b' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Supplier Pending</span>
                <p style={{ fontSize: '20px', fontWeight: 800, color: '#64748b', marginTop: '4px' }}>₹{fmt0(s.supplierPendingItc)}</p>
              </div>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', borderLeft: '4px solid var(--color-error)' }}>
                <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Not in Books</span>
                <p style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-error)', marginTop: '4px' }}>₹{fmt0(s.notInBooksItc)}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grid Table */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
        <DataGrid
          columns={gridColumns}
          data={gridData}
          keyField="id"
          loading={activeTab === 'RECONCILE' ? recLoading : regLoading}
          emptyTitle="No Records Found"
          emptyDescription={
            activeTab === 'RECONCILE' && gstr2bList.length === 0
              ? 'Please upload a GSTR-2B JSON file to start the ITC reconciliation.'
              : 'No transactions found in selected period.'
          }
        />
      </div>
    </div>
  );
};
