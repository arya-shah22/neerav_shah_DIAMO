// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Fund Flow Statement Page
// Phase 11.2: Working Capital Changes & Sources / Uses of Funds
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Printer, Download, ArrowLeft, RefreshCw } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button } from '../../components/ui';
import { getFundFlowCSV } from '../../utils/reportExports';

export const FundFlowPage: React.FC = () => {
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // IPC Hook
  const { data: ffData, loading, invoke: getFundFlow } = useIpc<any>('report:fund-flow');

  const refreshReport = useCallback(async () => {
    if (!companyId) return;
    await getFundFlow({
      companyId,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  }, [companyId, startDate, endDate, getFundFlow]);

  useEffect(() => {
    refreshReport();
  }, [refreshReport]);

  const triggerDirectPrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportCSV = () => {
    if (!ffData) return;
    const csvContent = getFundFlowCSV(ffData);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Fund_Flow_${endDate || 'Latest'}.csv`);
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
          filename: `Fund_Flow_${startDate || 'Inception'}_to_${endDate || 'Today'}.pdf`
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
  if (showPrintPreview && activeCompany && ffData) {
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
              <span style={{ color: 'var(--color-primary)' }}>FUND FLOW STATEMENT</span>
              <span>PERIOD: {startDate || 'Inception'} TO {endDate || 'TODAY'}</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Working Capital summary */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1.5px solid #0f172a', paddingBottom: '6px', textTransform: 'uppercase', margin: '0 0 10px' }}>1. Working Capital Changes</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Current Assets (Opening):</span>
                  <span>{fmt(ffData.workingCapital.openingCurrentAssets)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Current Assets (Closing):</span>
                  <span>{fmt(ffData.workingCapital.closingCurrentAssets)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                  <span>Current Liabilities (Opening):</span>
                  <span>{fmt(ffData.workingCapital.openingCurrentLiabilities)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Current Liabilities (Closing):</span>
                  <span>{fmt(ffData.workingCapital.closingCurrentLiabilities)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '6px', fontWeight: 700, fontSize: '13px' }}>
                  <span>Net Change in Working Capital:</span>
                  <span style={{ color: ffData.workingCapital.change >= 0 ? '#10b981' : '#ef4444' }}>{fmt(ffData.workingCapital.change)}</span>
                </div>
              </div>
            </div>

            {/* Sources & Applications */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Sources */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, borderBottom: '1px solid #0f172a', paddingBottom: '4px', margin: '0 0 8px' }}>Sources of Funds</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  {ffData.sources.map((s: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{s.description}</span>
                      <span>{fmt(s.amount)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontWeight: 700 }}>
                    <span>Total Sources:</span>
                    <span>{fmt(ffData.sourcesTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Applications */}
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, borderBottom: '1px solid #0f172a', paddingBottom: '4px', margin: '0 0 8px' }}>Applications of Funds</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  {ffData.applications.map((a: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{a.description}</span>
                      <span>{fmt(a.amount)}</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', fontWeight: 700 }}>
                    <span>Total Applications:</span>
                    <span>{fmt(ffData.applicationsTotal)}</span>
                  </div>
                </div>
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
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Fund Flow Statement</h2>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
            Flow of working capital and source/application movements of non-current accounts.
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

      {/* Main Grid */}
      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>Loading statement data...</p>
      ) : ffData ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)', flex: 1, minHeight: 0 }}>
          {/* Section 1: Working Capital Changes */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, borderBottom: '2px solid var(--color-border)', paddingBottom: '10px' }}>
              Working Capital Statement
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600 }}>
                <span>Opening Working Capital</span>
                <span>{fmt(ffData.workingCapital.openingWorkingCapital)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 600 }}>
                <span>Closing Working Capital</span>
                <span>{fmt(ffData.workingCapital.closingWorkingCapital)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 800, color: 'var(--color-primary)', borderTop: '1px solid var(--color-border)', paddingTop: '8px' }}>
                <span>Net Increase/(Decrease) in WC</span>
                <span style={{ color: ffData.workingCapital.change >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {fmt(ffData.workingCapital.change)}
                </span>
              </div>
            </div>

            <h4 style={{ fontSize: '13px', fontWeight: 700, marginTop: '20px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Current Assets & Liabilities Breakdown</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ffData.workingCapital.details.map((d: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px 0', borderBottom: '1px dashed var(--color-border)' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{d.accountName}</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginLeft: '6px' }}>({d.groupName})</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>O: {fmt(d.opening)}</span>
                    <span style={{ fontWeight: 600 }}>C: {fmt(d.closing)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Sources and Applications */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {/* Sources */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-success)' }}>Sources of Funds</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ffData.sources?.length ? (
                  ffData.sources.map((s: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>{s.description}</span>
                      <span style={{ fontWeight: 600 }}>{fmt(s.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>No sources of funds in this period.</p>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--color-border)', paddingTop: '10px', fontWeight: 700, fontSize: '14px', marginTop: '4px' }}>
                <span>Total Sources</span>
                <span>{fmt(ffData.sourcesTotal)}</span>
              </div>
            </div>

            {/* Applications */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', color: 'var(--color-error)' }}>Applications of Funds</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {ffData.applications?.length ? (
                  ffData.applications.map((a: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>{a.description}</span>
                      <span style={{ fontWeight: 600 }}>{fmt(a.amount)}</span>
                    </div>
                  ))
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>No application of funds in this period.</p>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--color-border)', paddingTop: '10px', fontWeight: 700, fontSize: '14px', marginTop: '4px' }}>
                <span>Total Applications</span>
                <span>{fmt(ffData.applicationsTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '40px' }}>Failed to load statement.</p>
      )}
    </div>
  );
};
