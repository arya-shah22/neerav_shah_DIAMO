// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — GST Dashboard & Summary Page
// Phase 11.5: GST Output tax on sales, Input Tax Credit, Net Liability
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
    const sales = gstData.summary.sales || {};
    const purchases = gstData.summary.purchases || {};
    const net = gstData.summary.netLiability || {};

    let csv = "GST Dashboard & Tax Liability Summary\n";
    csv += `Company,${activeCompany?.companyName || ''}\n`;
    csv += `Period,${startDate} to ${endDate}\n\n`;

    csv += "1. OUTWARD SUPPLIES (SALES OUTPUT)\n";
    csv += `Gross Amount,${sales.grossAmount || 0}\n`;
    csv += `Taxable Sales Value,${sales.taxableValue || 0}\n`;
    csv += `CGST Output,${sales.cgst || 0}\n`;
    csv += `SGST Output,${sales.sgst || 0}\n`;
    csv += `IGST Output,${sales.igst || 0}\n`;
    csv += `Total Output Tax,${sales.totalOutputTax || 0}\n\n`;

    csv += "2. INWARD SUPPLIES (PURCHASE ITC)\n";
    csv += `Gross Amount,${purchases.grossAmount || 0}\n`;
    csv += `Taxable Purchase Value,${purchases.taxableValue || 0}\n`;
    csv += `CGST Input,${purchases.cgst || 0}\n`;
    csv += `SGST Input,${purchases.sgst || 0}\n`;
    csv += `IGST Input,${purchases.igst || 0}\n`;
    csv += `Total Input ITC,${purchases.totalInputTax || 0}\n\n`;

    csv += "3. NET TAX LIABILITY / PAYABLE\n";
    csv += `Net CGST Payable,${net.cgst || 0}\n`;
    csv += `Net SGST Payable,${net.sgst || 0}\n`;
    csv += `Net IGST Payable,${net.igst || 0}\n`;
    csv += `Net Total Tax Payable,${net.total || 0}\n\n`;

    // Rate breakdown
    if (gstData.rateBreakdown && Array.isArray(gstData.rateBreakdown) && gstData.rateBreakdown.length > 0) {
      csv += "4. GST RATE-WISE BREAKDOWN\n";
      csv += "GST Rate %,Taxable Value,CGST,SGST,IGST,Total Tax\n";
      gstData.rateBreakdown.forEach((r: any) => {
        csv += `${r.gstRate}%,${r.taxableValue || 0},${r.cgst || 0},${r.sgst || 0},${r.igst || 0},${r.totalTax || 0}\n`;
      });
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `GST_Dashboard_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const rateColumns = useMemo<Column<any>[]>(() => [
    { 
      key: 'gstRate', 
      header: 'GST RATE %', 
      render: (row) => <span style={{ fontWeight: 600 }}>{row.gstRate}%</span>
    },
    { 
      key: 'taxableValue', 
      header: 'TAXABLE VALUE', 
      align: 'right',
      render: (row) => `₹${fmt(row.taxableValue)}`
    },
    { 
      key: 'cgst', 
      header: 'CGST', 
      align: 'right',
      render: (row) => row.cgst > 0 ? `₹${fmt(row.cgst)}` : '—'
    },
    { 
      key: 'sgst', 
      header: 'SGST', 
      align: 'right',
      render: (row) => row.sgst > 0 ? `₹${fmt(row.sgst)}` : '—'
    },
    { 
      key: 'igst', 
      header: 'IGST', 
      align: 'right',
      render: (row) => row.igst > 0 ? `₹${fmt(row.igst)}` : '—'
    },
    { 
      key: 'totalTax', 
      header: 'TOTAL TAX', 
      align: 'right',
      render: (row) => <span style={{ fontWeight: 600 }}>₹{fmt(row.totalTax)}</span>
    },
  ], []);

  const fmt = (v?: number) => (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt0 = (v?: number) => (Number(v) || 0).toLocaleString('en-IN');

  const sales = gstData?.summary?.sales ?? {
    taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalOutputTax: 0, invoiceCount: 0, returnCount: 0, grossAmount: 0
  };
  const purchases = gstData?.summary?.purchases ?? {
    taxableValue: 0, cgst: 0, sgst: 0, igst: 0, totalInputTax: 0, invoiceCount: 0, returnCount: 0, grossAmount: 0
  };
  const netLiability = gstData?.summary?.netLiability ?? {
    cgst: 0, sgst: 0, igst: 0, total: 0, isPayable: true
  };

  const s = {
    outwardTaxableValue: sales.taxableValue || sales.grossAmount || 0,
    outputCgst: sales.cgst || 0,
    outputSgst: sales.sgst || 0,
    outputIgst: sales.igst || 0,
    totalOutputTax: sales.totalOutputTax || 0,
    inwardTaxableValue: purchases.taxableValue || purchases.grossAmount || 0,
    inputCgst: purchases.cgst || 0,
    inputSgst: purchases.sgst || 0,
    inputIgst: purchases.igst || 0,
    totalInputTax: purchases.totalInputTax || 0,
    netCgstLiability: netLiability.cgst || 0,
    netSgstLiability: netLiability.sgst || 0,
    netIgstLiability: netLiability.igst || 0,
    netTaxLiability: netLiability.total || 0,
    totalSaleInvoices: sales.invoiceCount || 0,
    totalPurchaseInvoices: purchases.invoiceCount || 0,
  };

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)', padding: '24px' }}>Select a company first.</p>;
  }

  // ── Print Preview Mode ──
  if (showPrintPreview && activeCompany && gstData) {
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
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{fmt(s.outwardTaxableValue)}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{fmt(s.outputCgst)}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{fmt(s.outputSgst)}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{fmt(s.outputIgst)}</td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>₹{fmt(s.totalOutputTax)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', fontWeight: 600 }}>Inward Supplies (Purchases)</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{fmt(s.inwardTaxableValue)}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{fmt(s.inputCgst)}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{fmt(s.inputSgst)}</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>₹{fmt(s.inputIgst)}</td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>₹{fmt(s.totalInputTax)}</td>
              </tr>
              <tr style={{ background: '#f8fafc', fontWeight: 700, borderTop: '2px solid #0f172a' }}>
                <td style={{ padding: '8px' }}>Net Tax Liability / Payable</td>
                <td style={{ textAlign: 'right', padding: '8px' }}>—</td>
                <td style={{ textAlign: 'right', padding: '8px', color: s.netCgstLiability >= 0 ? '#b91c1c' : '#15803d' }}>
                  ₹{fmt(s.netCgstLiability)}
                </td>
                <td style={{ textAlign: 'right', padding: '8px', color: s.netSgstLiability >= 0 ? '#b91c1c' : '#15803d' }}>
                  ₹{fmt(s.netSgstLiability)}
                </td>
                <td style={{ textAlign: 'right', padding: '8px', color: s.netIgstLiability >= 0 ? '#b91c1c' : '#15803d' }}>
                  ₹{fmt(s.netIgstLiability)}
                </td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 800, color: s.netTaxLiability >= 0 ? '#b91c1c' : '#15803d' }}>
                  ₹{fmt(s.netTaxLiability)}
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
              {(gstData?.rateBreakdown || []).map((row: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px', fontWeight: 600 }}>{row.gstRate}%</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>₹{fmt(row.taxableValue)}</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>₹{fmt(row.cgst)}</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>₹{fmt(row.sgst)}</td>
                  <td style={{ textAlign: 'right', padding: '8px' }}>₹{fmt(row.igst)}</td>
                  <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>₹{fmt(row.totalTax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const monthlyTrendsList = gstData?.monthlyTrends || gstData?.monthlyTrend || [];

  const comp = gstData?.compliance ?? {
    currentPeriod: `${new Date(startDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} – ${new Date(endDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`,
    gstr1DueDate: '11th of Next Month',
    gstr3bDueDate: '20th of Next Month',
    daysUntilGstr1: 5,
    daysUntilGstr3b: 14,
    filingStatus: 'PENDING'
  };

  // Find max monthly trend value to scale the CSS graph
  const trendValues = monthlyTrendsList.flatMap((v: any) => [v.outputTax, v.inputTax]);
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
            ₹{fmt(s.totalOutputTax)}
          </p>
          <div style={{ marginTop: '12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Taxable Sales:</span>
              <span style={{ fontWeight: 600 }}>₹{fmt0(s.outwardTaxableValue)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>CGST / SGST:</span>
              <span>₹{fmt0(s.outputCgst)} / ₹{fmt0(s.outputSgst)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>IGST:</span>
              <span>₹{fmt0(s.outputIgst)}</span>
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
            ₹{fmt(s.totalInputTax)}
          </p>
          <div style={{ marginTop: '12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Taxable Purchases:</span>
              <span style={{ fontWeight: 600 }}>₹{fmt0(s.inwardTaxableValue)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>CGST / SGST:</span>
              <span>₹{fmt0(s.inputCgst)} / ₹{fmt0(s.inputSgst)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>IGST:</span>
              <span>₹{fmt0(s.inputIgst)}</span>
            </div>
          </div>
        </div>

        {/* Net card */}
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '20px',
          borderLeft: `4px solid ${(s.netTaxLiability ?? 0) >= 0 ? 'var(--color-error)' : 'var(--color-success)'}`
        }}>
          <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Net Liability / Payable</h3>
          <p style={{ fontSize: '22px', fontWeight: 800, color: (s.netTaxLiability ?? 0) >= 0 ? 'var(--color-error)' : 'var(--color-success)', marginTop: '8px' }}>
            ₹{fmt(s.netTaxLiability)}
          </p>
          <div style={{ marginTop: '12px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Net CGST / SGST:</span>
              <span style={{ fontWeight: 600 }}>₹{fmt0(s.netCgstLiability)} / ₹{fmt0(s.netSgstLiability)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Net IGST:</span>
              <span style={{ fontWeight: 600 }}>₹{fmt0(s.netIgstLiability)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
              <span>Vouchers Total:</span>
              <span>{(s.totalSaleInvoices || 0) + (s.totalPurchaseInvoices || 0)} Bills</span>
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
          <div style={{ display: 'flex', height: '220px', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', gap: '12px' }}>
            {monthlyTrendsList.map((m: any, idx: number) => {
              const outVal = Number(m.outputTax || 0);
              const inVal = Number(m.inputTax || 0);
              const outPct = Math.min(100, Math.max((outVal / maxTrendVal) * 100, outVal > 0 ? 8 : 2));
              const inPct = Math.min(100, Math.max((inVal / maxTrendVal) * 100, inVal > 0 ? 8 : 2));

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', width: '100%', height: '180px', justifyContent: 'center' }}>
                    {/* Output bar (Green) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      {outVal > 0 && (
                        <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-success)', marginBottom: '2px' }}>
                          ₹{fmt0(outVal)}
                        </span>
                      )}
                      <div style={{
                        height: `${outPct}%`,
                        width: '16px',
                        background: 'var(--color-success)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.4s ease-in-out'
                      }} title={`Output: ₹${fmt(outVal)}`} />
                    </div>

                    {/* Input bar (Blue) */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                      {inVal > 0 && (
                        <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--color-primary)', marginBottom: '2px' }}>
                          ₹{fmt0(inVal)}
                        </span>
                      )}
                      <div style={{
                        height: `${inPct}%`,
                        width: '16px',
                        background: 'var(--color-primary)',
                        borderRadius: '3px 3px 0 0',
                        transition: 'height 0.4s ease-in-out'
                      }} title={`Input ITC: ₹${fmt(inVal)}`} />
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: '8px', whiteSpace: 'nowrap' }}>{m.month}</span>
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
