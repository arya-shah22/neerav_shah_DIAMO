// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Cash Flow Statement Page
// Phase 11.2: Direct Method Cash Inflows/Outflows
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Printer, Download, ArrowLeft, RefreshCw } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button } from '../../components/ui';
import { getCashFlowCSV } from '../../utils/reportExports';

export const CashFlowPage: React.FC = () => {
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // IPC Hook
  const { data: cfData, loading, invoke: getCashFlow } = useIpc<any>('report:cash-flow');

  const refreshReport = useCallback(async () => {
    if (!companyId) return;
    await getCashFlow({
      companyId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [companyId, startDate, endDate, getCashFlow]);

  useEffect(() => {
    refreshReport();
  }, [refreshReport]);

  const triggerDirectPrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportCSV = () => {
    if (!cfData) return;
    const csvContent = getCashFlowCSV(cfData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Cash_Flow_${endDate || 'Latest'}.csv`);
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
          filename: `Cash_Flow_${startDate || 'Inception'}_to_${endDate || 'Today'}.pdf`
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

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
  }

  const fmt = (v: number) => {
    const absVal = Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return v < 0 ? `₹(${absVal})` : `₹${absVal}`;
  };

  // Render Print Preview Mode
  if (showPrintPreview && activeCompany && cfData) {
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

        {/* Printable Portrait Sheet */}
        <div id="print-area" className="print-page" style={{
          background: '#ffffff',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          padding: '20mm',
          width: '210mm',
          minHeight: '297mm',
          margin: '0 auto',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          color: '#1e293b',
          fontSize: '13px',
          boxSizing: 'border-box',
        }}>
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
              {activeCompany.companyName}
            </h2>
            <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '12px' }}>
              {activeCompany.addressLine1} {activeCompany.addressLine2 && `, ${activeCompany.addressLine2}`} | {activeCompany.city} - {activeCompany.pincode}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '13px', fontWeight: 600 }}>
              <span style={{ color: 'var(--color-primary)' }}>CASH FLOW STATEMENT (DIRECT METHOD)</span>
              <span>PERIOD: {startDate || 'Inception'} TO {endDate || 'TODAY'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
              <span>Opening Cash & Bank Balance</span>
              <span>{fmt(cfData.openingCash)}</span>
            </div>

            {/* Operating */}
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>1. OPERATING ACTIVITIES</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cash Inflows from Operations:</span>
                  <span>{fmt(cfData.operating.inflow)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Cash Outflows from Operations:</span>
                  <span>{fmt(-cfData.operating.outflow)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontWeight: 700 }}>
                  <span>Net Cash from Operating Activities (A):</span>
                  <span>{fmt(cfData.operating.net)}</span>
                </div>
              </div>
            </div>

            {/* Investing */}
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>2. INVESTING ACTIVITIES</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Fixed Asset Disposals / Investments:</span>
                  <span>{fmt(cfData.investing.inflow)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Fixed Asset Additions / Acquisitions:</span>
                  <span>{fmt(-cfData.investing.outflow)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontWeight: 700 }}>
                  <span>Net Cash from Investing Activities (B):</span>
                  <span>{fmt(cfData.investing.net)}</span>
                </div>
              </div>
            </div>

            {/* Financing */}
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '0 0 8px', color: '#0f172a' }}>3. FINANCING ACTIVITIES</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Share Capital Issued / New Loans:</span>
                  <span>{fmt(cfData.financing.inflow)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Capital Repayments / Dividends:</span>
                  <span>{fmt(-cfData.financing.outflow)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontWeight: 700 }}>
                  <span>Net Cash from Financing Activities (C):</span>
                  <span>{fmt(cfData.financing.net)}</span>
                </div>
              </div>
            </div>

            {/* Reconciliation */}
            <div style={{ borderTop: '2px solid #0f172a', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span>Net Cash Flow (A + B + C)</span>
                <span>{fmt(cfData.netChange)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                <span>Closing Cash & Bank Balance</span>
                <span>{fmt(cfData.closingCash)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Cash Flow Statement</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Direct Method cash movement across operating, investing, and financing registries.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <Button variant="ghost" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={16} /> Export CSV
          </Button>
          <Button variant="ghost" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Export PDF
          </Button>
          <Button variant="ghost" onClick={() => setShowPrintPreview(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print Preview
          </Button>
          <Button variant="primary" onClick={refreshReport} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={16} /> Refresh
          </Button>
        </div>
      </div>

      {/* Date Filters */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>From:</span>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={{ width: '160px' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>To:</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={{ width: '160px' }} />
        </div>
        <Button variant="ghost" onClick={() => { setStartDate(''); setEndDate(new Date().toISOString().split('T')[0]); }} style={{ fontSize: '13px' }}>
          Clear
        </Button>
      </div>

      {/* Summary grid */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>Loading statement data...</p>
      ) : cfData ? (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-lg)', flex: 1, minHeight: 0 }}>
          {/* Main Statement */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, borderBottom: '2px solid var(--color-border)', paddingBottom: '12px' }}>
              <span>Opening Cash & Bank Balance</span>
              <span style={{ color: 'var(--color-primary)' }}>{fmt(cfData.openingCash)}</span>
            </div>

            {/* Operating */}
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>1. OPERATING ACTIVITIES</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Cash Inflows from Operations</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>{fmt(cfData.operating.inflow)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Cash Outflows from Operations</span>
                  <span style={{ color: 'var(--color-error)', fontWeight: 500 }}>{fmt(-cfData.operating.outflow)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border)', paddingTop: '8px', fontWeight: 700, fontSize: '13px' }}>
                  <span>Net Cash from Operating Activities (A)</span>
                  <span>{fmt(cfData.operating.net)}</span>
                </div>
              </div>
            </div>

            {/* Investing */}
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>2. INVESTING ACTIVITIES</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Fixed Asset Disposals / Investments</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>{fmt(cfData.investing.inflow)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Fixed Asset Additions / Acquisitions</span>
                  <span style={{ color: 'var(--color-error)', fontWeight: 500 }}>{fmt(-cfData.investing.outflow)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border)', paddingTop: '8px', fontWeight: 700, fontSize: '13px' }}>
                  <span>Net Cash from Investing Activities (B)</span>
                  <span>{fmt(cfData.investing.net)}</span>
                </div>
              </div>
            </div>

            {/* Financing */}
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px' }}>3. FINANCING ACTIVITIES</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Share Capital Issued / New Loans</span>
                  <span style={{ color: 'var(--color-success)', fontWeight: 500 }}>{fmt(cfData.financing.inflow)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span>Capital Repayments / Dividends</span>
                  <span style={{ color: 'var(--color-error)', fontWeight: 500 }}>{fmt(-cfData.financing.outflow)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border)', paddingTop: '8px', fontWeight: 700, fontSize: '13px' }}>
                  <span>Net Cash from Financing Activities (C)</span>
                  <span>{fmt(cfData.financing.net)}</span>
                </div>
              </div>
            </div>

            {/* Reconciliation */}
            <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '14px' }}>
                <span>Net Cash Flow (A + B + C)</span>
                <span>{fmt(cfData.netChange)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, color: 'var(--color-primary)' }}>
                <span>Closing Cash & Bank Balance</span>
                <span>{fmt(cfData.closingCash)}</span>
              </div>
            </div>
          </div>

          {/* Side Details / Transactions list */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '10px' }}>Transaction Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {cfData.details?.length ? (
                cfData.details.map((d: any, idx: number) => (
                  <div key={idx} style={{ padding: '10px', border: '1px solid var(--color-border)', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      <span>{new Date(d.date).toLocaleDateString('en-IN')}</span>
                      <span style={{ fontWeight: 600, color: d.category === 'OPERATING' ? '#2980b9' : d.category === 'INVESTING' ? '#27ae60' : '#8e44ad' }}>{d.category}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text)' }}>{d.description}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, textAlign: 'right', color: d.amount > 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                      {d.amount > 0 ? '+' : ''}{fmt(d.amount)}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '20px', fontSize: '13px' }}>No cash/bank movement details in this period.</p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '40px' }}>Failed to load statement.</p>
      )}
    </div>
  );
};
