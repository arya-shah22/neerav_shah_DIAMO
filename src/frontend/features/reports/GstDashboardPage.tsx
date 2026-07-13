// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — GST Dashboard & Summary Page
// Phase 11.5: GST Output tax on sales, Input Tax Credit, Net Liability
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Printer, Download, ArrowLeft, Calendar, RefreshCw } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';

export const GstDashboardPage: React.FC = () => {
  const { activeCompany, companyId, isReady } = useActiveCompany();

  // Get current financial year dates
  const now = new Date();
  const fyStart = now.getMonth() >= 3
    ? `${now.getFullYear()}-04-01`
    : `${now.getFullYear() - 1}-04-01`;
  const todayStr = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(todayStr);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // IPC Hooks
  const { data: gstData, loading, invoke: getGstDashboard } = useIpc<any>('report:gst-dashboard');

  const refreshReport = useCallback(async () => {
    if (!companyId) return;
    await getGstDashboard({ companyId, startDate, endDate });
  }, [companyId, startDate, endDate, getGstDashboard]);

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
          filename: `GST_Dashboard_${startDate}_to_${endDate}.pdf`
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
    if (!gstData || !gstData.summary) return;
    const s = gstData.summary;
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Summary
    csvContent += `GST Report: ${startDate} to ${endDate}\n\n`;
    csvContent += `OUTWARD SUPPLIES (SALES)\n`;
    csvContent += `Taxable Sales Value,₹${s.outwardTaxableValue}\n`;
    csvContent += `CGST Output,₹${s.outputCgst}\n`;
    csvContent += `SGST Output,₹${s.outputSgst}\n`;
    csvContent += `IGST Output,₹${s.outputIgst}\n`;
    csvContent += `Cess Output,₹${s.outputCess}\n`;
    csvContent += `Total Output Tax,₹${s.totalOutputTax}\n\n`;

    csvContent += `INWARD SUPPLIES (PURCHASES)\n`;
    csvContent += `Taxable Purchase Value,₹${s.inwardTaxableValue}\n`;
    csvContent += `CGST Input,₹${s.inputCgst}\n`;
    csvContent += `SGST Input,₹${s.inputSgst}\n`;
    csvContent += `IGST Input,₹${s.inputIgst}\n`;
    csvContent += `Cess Input,₹${s.inputCess}\n`;
    csvContent += `Total Input ITC,₹${s.totalInputTax}\n\n`;

    csvContent += `NET TAX LIABILITY\n`;
    csvContent += `Net CGST Payable,₹${s.netCgstLiability}\n`;
    csvContent += `Net SGST Payable,₹${s.netSgstLiability}\n`;
    csvContent += `Net IGST Payable,₹${s.netIgstLiability}\n`;
    csvContent += `Net Cess Payable,₹${s.netCessLiability}\n`;
    csvContent += `Net Tax Liability,₹${s.netTaxLiability}\n\n`;

    // Rate breakdown
    csvContent += `RATE BREAKDOWN\n`;
    csvContent += `Rate %,Taxable Value,CGST,SGST,IGST,Total Tax\n`;
    gstData.rateBreakdown.forEach((r: any) => {
      csvContent += `${r.gstRate}%,${r.taxableValue},${r.cgst},${r.sgst},${r.igst},${r.totalTax}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `GST_Summary_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const rateColumns: Column<any>[] = [
    { 
      key: 'gstRate', 
      header: 'GST RATE %', 
      render: (row) => <span style={{ fontWeight: 600 }}>{row.gstRate}%</span>
    },
    { 
      key: 'taxableValue', 
      header: 'TAXABLE VALUE', 
      align: 'right',
      render: (row) => `₹${row.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    },
    { 
      key: 'cgst', 
      header: 'CGST', 
      align: 'right',
      render: (row) => row.cgst > 0 ? `₹${row.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'sgst', 
      header: 'SGST', 
      align: 'right',
      render: (row) => row.sgst > 0 ? `₹${row.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'igst', 
      header: 'IGST', 
      align: 'right',
      render: (row) => row.igst > 0 ? `₹${row.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'
    },
    { 
      key: 'totalTax', 
      header: 'TOTAL TAX', 
      align: 'right',
      render: (row) => <span style={{ fontWeight: 600 }}>₹{row.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
    },
  ];

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)', padding: '24px' }}>Select a company first.</p>;
  }

  // ── Print Preview Mode ──
  if (showPrintPreview && activeCompany && gstData) {
    const s = gstData.summary;
    return (
      <div id="print-preview-root" style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 portrait; margin: 15mm; }
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
              <span style={{ color: 'var(--color-primary)' }}>GST SUMMARY REPORT</span>
              <span>PERIOD: {startDate} TO {endDate}</span>
            </div>
          </div>

          {/* Tables for Outward/Inward Summary */}
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase' }}>1. Tax Summary</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '24px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Category</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Taxable Value</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>CGST</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>SGST</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>IGST</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Total Tax</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', fontWeight: 600 }}>Outward Supplies (Sales)</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{s.outwardTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{s.outputCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{s.outputSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{s.outputIgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>₹{s.totalOutputTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', fontWeight: 600 }}>Inward Supplies (Purchases)</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{s.inwardTaxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{s.inputCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{s.inputSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{s.inputIgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>₹{s.totalInputTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
              <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #0f172a' }}>
                <td style={{ padding: '8px' }}>Net Tax Liability / Payable</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>—</td>
                <td style={{ textAlign: 'right', padding: '8px', color: s.netCgstLiability >= 0 ? '#b91c1c' : '#15803d' }}>
                  ₹{s.netCgstLiability.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'right', padding: '8px', color: s.netSgstLiability >= 0 ? '#b91c1c' : '#15803d' }}>
                  ₹{s.netSgstLiability.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'right', padding: '8px', color: s.netIgstLiability >= 0 ? '#b91c1c' : '#15803d' }}>
                  ₹{s.netIgstLiability.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 800, color: s.netTaxLiability >= 0 ? '#b91c1c' : '#15803d' }}>
                  ₹{s.netTaxLiability.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Rate breakdown */}
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px 0', textTransform: 'uppercase' }}>2. GST Rate-Wise Breakdown</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Rate %</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Taxable Value</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>CGST</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>SGST</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>IGST</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Total Tax</th>
              </tr>
            </thead>
            <tbody>
              {gstData.rateBreakdown.map((row: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{row.gstRate}%</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>₹{row.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>₹{row.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>₹{row.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>₹{row.igst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>₹{row.totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const s = gstData?.summary ?? {
    outwardTaxableValue: 0, outputCgst: 0, outputSgst: 0, outputIgst: 0, outputCess: 0, totalOutputTax: 0,
    inwardTaxableValue: 0, inputCgst: 0, inputSgst: 0, inputIgst: 0, inputCess: 0, totalInputTax: 0,
    netCgstLiability: 0, netSgstLiability: 0, netIgstLiability: 0, netCessLiability: 0, netTaxLiability: 0,
    totalSaleInvoices: 0, totalPurchaseInvoices: 0, totalCreditNotes: 0, totalDebitNotes: 0
  };

  const comp = gstData?.compliance ?? {
    currentPeriod: '—', gstr1DueDate: '—', gstr3bDueDate: '—', daysUntilGstr1: 0, daysUntilGstr3b: 0, filingStatus: 'PENDING'
  };

  // Find max monthly trend value to scale the CSS graph
  const trendValues = gstData?.monthlyTrend?.flatMap((v: any) => [v.outputTax, v.inputTax]) ?? [];
  const maxTrendVal = trendValues.length > 0 ? Math.max(...trendValues.filter((val: unknown) => typeof val === 'number'), 1000) : 1000;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>GST Dashboard & Summary</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Tax liability, Input Tax Credit (ITC) reconciliation and return summary.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={handleExportCSV} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} /> CSV
          </Button>
          <Button variant="ghost" onClick={handleExportPDF} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> PDF
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

        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
          <Button variant="ghost" size="sm" onClick={() => {
            const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            setStartDate(first);
            setEndDate(todayStr);
          }}>This Month</Button>
          <Button variant="ghost" size="sm" onClick={() => {
            setStartDate(fyStart);
            setEndDate(todayStr);
          }}>This FY</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {/* Output card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '20px',
          borderLeft: '4px solid var(--color-success)'
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Outward (Sales Output)</h3>
          <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text)', marginTop: '8px' }}>
            ₹{s.totalOutputTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div style={{ marginTop: '12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Taxable Sales:</span>
              <span style={{ fontWeight: 600 }}>₹{s.outwardTaxableValue.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>CGST / SGST:</span>
              <span>₹{s.outputCgst.toLocaleString('en-IN')} / ₹{s.outputSgst.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>IGST:</span>
              <span>₹{s.outputIgst.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Input card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '20px',
          borderLeft: '4px solid var(--color-primary)'
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Inward (Purchase ITC)</h3>
          <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--color-text)', marginTop: '8px' }}>
            ₹{s.totalInputTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div style={{ marginTop: '12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Taxable Purchases:</span>
              <span style={{ fontWeight: 600 }}>₹{s.inwardTaxableValue.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>CGST / SGST:</span>
              <span>₹{s.inputCgst.toLocaleString('en-IN')} / ₹{s.inputSgst.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>IGST:</span>
              <span>₹{s.inputIgst.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Net card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '20px',
          borderLeft: `4px solid ${s.netTaxLiability >= 0 ? 'var(--color-error)' : 'var(--color-success)'}`
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Net Liability / Payable</h3>
          <p style={{ fontSize: '22px', fontWeight: 800, color: s.netTaxLiability >= 0 ? 'var(--color-error)' : 'var(--color-success)', marginTop: '8px' }}>
            ₹{s.netTaxLiability.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <div style={{ marginTop: '12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Net CGST / SGST:</span>
              <span style={{ fontWeight: 600 }}>₹{s.netCgstLiability.toLocaleString('en-IN')} / ₹{s.netSgstLiability.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Net IGST:</span>
              <span style={{ fontWeight: 600 }}>₹{s.netIgstLiability.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>Vouchers Total:</span>
              <span>{s.totalSaleInvoices + s.totalPurchaseInvoices} Bills</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Graph + Compliance Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'stretch' }}>
        {/* Monthly Trend Chart */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '16px' }}>Monthly Tax Trends (Output vs Input)</h3>
          
          {/* Chart visual */}
          <div style={{ display: 'flex', height: '180px', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', gap: '8px' }}>
            {gstData?.monthlyTrend?.map((m: any, idx: number) => {
              const outHeight = (m.outputTax / maxTrendVal) * 100;
              const inHeight = (m.inputTax / maxTrendVal) * 100;

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', width: '100%', justifyContent: 'center' }}>
                    {/* Output bar (Green) */}
                    <div style={{
                      height: `${Math.max(outHeight, 3)}%`,
                      width: '12px',
                      background: 'var(--color-success)',
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.3s ease'
                    }} title={`Output: ₹${m.outputTax}`} />
                    {/* Input bar (Blue) */}
                    <div style={{
                      height: `${Math.max(inHeight, 3)}%`,
                      width: '12px',
                      background: 'var(--color-primary)',
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.3s ease'
                    }} title={`Input ITC: ₹${m.inputTax}`} />
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '8px', whiteSpace: 'nowrap' }}>{m.month}</span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '12px', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', background: 'var(--color-success)', borderRadius: '2px' }} />
              <span style={{ color: 'var(--color-text-secondary)' }}>Output Liability</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '12px', height: '12px', background: 'var(--color-primary)', borderRadius: '2px' }} />
              <span style={{ color: 'var(--color-text-secondary)' }}>Input Tax Credit (ITC)</span>
            </div>
          </div>
        </div>

        {/* Compliance Panel */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)' }}>GST Returns & Compliance</h3>
          
          <div style={{ padding: '12px 16px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Return Period</span>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text)', marginTop: '4px' }}>{comp.currentPeriod}</p>
          </div>

          {/* GSTR-1 */}
          <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>GSTR-1 (Outward Return)</span>
              <span style={{ fontSize: '10px', fontWeight: 700, background: 'var(--color-warning-light)', color: 'var(--color-warning)', padding: '2px 6px', borderRadius: '4px' }}>
                {comp.daysUntilGstr1} Days Left
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
              <span>Due Date:</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{comp.gstr1DueDate}</span>
            </div>
          </div>

          {/* GSTR-3B */}
          <div style={{ border: '1px solid var(--color-border)', borderRadius: '6px', padding: '12px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>GSTR-3B (Payment Return)</span>
              <span style={{ fontSize: '10px', fontWeight: 700, background: 'var(--color-warning-light)', color: 'var(--color-warning)', padding: '2px 6px', borderRadius: '4px' }}>
                {comp.daysUntilGstr3b} Days Left
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
              <span>Due Date:</span>
              <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{comp.gstr3bDueDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Breakdown Grid */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text)', marginBottom: '16px' }}>GST Rate-Wise Breakdown</h3>
        <DataGrid
          columns={rateColumns}
          data={gstData?.rateBreakdown || []}
          keyField="gstRate"
          loading={loading}
          emptyTitle="No GST Transactions"
          emptyDescription="No GST transactions found in selected period."
        />
      </div>
    </div>
  );
};
