// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — GST Analytics Page (Party, HSN, & Rate Summaries)
// Phase 11.6: HSN, Party & Rate grouped analysis dashboard
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, RefreshCw, Printer, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { useCompanyStore, formatFinancialYearLabel } from '../../state/company-store';

type AnalyticsTab = 'HSN' | 'PARTY' | 'RATE';
type GstFlow = 'OUTWARD' | 'INWARD';

export const GstAnalyticsPage: React.FC = () => {
  const { activeCompany, companyId } = useActiveCompany();
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);

  // Get current financial year dates
  const now = new Date();
  const fyStart = now.getMonth() >= 3
    ? `${now.getFullYear()}-04-01`
    : `${now.getFullYear() - 1}-04-01`;
  const todayStr = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(todayStr);
  const [flow, setFlow] = useState<GstFlow>('OUTWARD');
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('HSN');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  const { data, loading, invoke } = useIpc<any>('report:gst-analytics');

  const fetchAnalytics = useCallback(async () => {
    if (!companyId) return;
    await invoke({ companyId, startDate, endDate });
  }, [companyId, startDate, endDate, invoke]);

  useEffect(() => {
    fetchAnalytics();
  }, [companyId, startDate, endDate]);

  const triggerDirectPrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handlePrint = () => {
    setShowPrintDialog(true);
  };

  const activeData = flow === 'OUTWARD' ? data?.outward : data?.inward;

  // HSN Table Columns
  const hsnColumns: Column<any>[] = [
    { key: 'hsnCode', header: 'HSN CODE', sortable: true },
    { key: 'uqc', header: 'UQC', align: 'center' },
    { 
      key: 'carats', 
      header: 'TOTAL CARATS', 
      align: 'right',
      render: (row) => row.carats > 0 ? row.carats.toLocaleString('en-IN', { minimumFractionDigits: 3 }) : '—'
    },
    { 
      key: 'pieces', 
      header: 'TOTAL PIECES', 
      align: 'right',
      render: (row) => row.pieces > 0 ? row.pieces.toLocaleString('en-IN') : '—'
    },
    { 
      key: 'taxable', 
      header: 'TAXABLE VALUE', 
      align: 'right',
      render: (row) => `₹${row.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
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
  ];

  // Party Columns
  const partyColumns: Column<any>[] = [
    { key: 'partyName', header: flow === 'OUTWARD' ? 'CUSTOMER NAME' : 'SUPPLIER NAME', sortable: true },
    { key: 'gstin', header: 'GSTIN', align: 'center' },
    { 
      key: 'taxable', 
      header: 'TAXABLE VALUE', 
      align: 'right',
      render: (row) => `₹${row.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
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
  ];

  // Rate Columns
  const rateColumns: Column<any>[] = [
    { 
      key: 'ratePct', 
      header: 'GST RATE', 
      sortable: true,
      render: (row) => `${row.ratePct}%`
    },
    { 
      key: 'taxable', 
      header: 'TAXABLE VALUE', 
      align: 'right',
      render: (row) => `₹${row.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
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
  ];

  const getGridData = () => {
    if (activeTab === 'HSN') return activeData?.hsn || [];
    if (activeTab === 'PARTY') return activeData?.party || [];
    return activeData?.rate || [];
  };

  const getGridColumns = () => {
    if (activeTab === 'HSN') return hsnColumns;
    if (activeTab === 'PARTY') return partyColumns;
    return rateColumns;
  };

  const getKeyField = () => {
    if (activeTab === 'HSN') return 'hsnCode';
    if (activeTab === 'PARTY') return 'partyName';
    return 'ratePct';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>GST Analytics</h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Interactive GST analytics showing summaries grouped by HSN code, Party, or Tax rates.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print Report
          </Button>
          <Button variant="primary" onClick={fetchAnalytics} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh Analytics
          </Button>
        </div>
      </div>

      {/* Date Filters & Flow Toggle */}
      <div className="no-print" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
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

        {/* Flow Switcher */}
        <div style={{ display: 'flex', background: 'var(--color-bg-card)', padding: '4px', borderRadius: '8px', gap: '4px' }}>
          <button
            onClick={() => setFlow('OUTWARD')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              background: flow === 'OUTWARD' ? 'var(--color-primary)' : 'transparent',
              color: flow === 'OUTWARD' ? '#FFFFFF' : 'var(--color-text-secondary)'
            }}
          >
            <TrendingUp size={14} /> Outward Supplies (Sales)
          </button>
          <button
            onClick={() => setFlow('INWARD')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              background: flow === 'INWARD' ? 'var(--color-primary)' : 'transparent',
              color: flow === 'INWARD' ? '#FFFFFF' : 'var(--color-text-secondary)'
            }}
          >
            <TrendingDown size={14} /> Inward Supplies (Purchases)
          </button>
        </div>
      </div>

      {/* Visual Analytics Insight Charts */}
      {getGridData().length > 0 && (
        <div className="no-print" style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} /> Visual Insights ({activeTab} Distribution)
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {getGridData().slice(0, 5).map((row: any, idx: number) => {
              const maxVal = Math.max(...getGridData().map((r: any) => r.taxable || 1));
              const percentage = Math.max(5, Math.min(100, (row.taxable / maxVal) * 100));
              
              let label = '';
              if (activeTab === 'HSN') label = `HSN: ${row.hsnCode}`;
              else if (activeTab === 'PARTY') label = row.partyName;
              else label = `GST Slab: ${row.ratePct}%`;

              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                    <span style={{ color: 'var(--color-text)' }}>{label}</span>
                    <span style={{ color: 'var(--color-text-secondary)' }}>
                      ₹{row.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '8px',
                    background: 'var(--color-bg-card)',
                    borderRadius: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${percentage}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-accent) 100%)',
                      borderRadius: '4px',
                      transition: 'width 0.4s ease-in-out'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="no-print" style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '4px' }}>
        <button
          onClick={() => setActiveTab('HSN')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'HSN' ? 700 : 500,
            color: activeTab === 'HSN' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'HSN' ? '2px solid var(--color-primary)' : 'none',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          HSN Summary
        </button>
        <button
          onClick={() => setActiveTab('PARTY')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'PARTY' ? 700 : 500,
            color: activeTab === 'PARTY' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'PARTY' ? '2px solid var(--color-primary)' : 'none',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          Party-wise Summary
        </button>
        <button
          onClick={() => setActiveTab('RATE')}
          style={{
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: activeTab === 'RATE' ? 700 : 500,
            color: activeTab === 'RATE' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            borderBottom: activeTab === 'RATE' ? '2px solid var(--color-primary)' : 'none',
            background: 'none',
            cursor: 'pointer',
          }}
        >
          Rate-wise Summary
        </button>
      </div>

      {/* Main Grid */}
      <div className="no-print">
        <DataGrid
          columns={getGridColumns()}
          data={getGridData()}
          keyField={getKeyField() as any}
          loading={loading}
          emptyTitle="No Records Found"
          emptyDescription="No transaction analytics recorded for this flow in selected period."
        />
      </div>

      {/* Print Preview Overlay */}
      {showPrintPreview && activeCompany && data && (
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
            <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, textTransform: 'uppercase', color: '#0f172a' }}>
                {activeCompany.companyName}
              </h2>
              <p style={{ fontSize: '12px', color: '#475569', margin: '4px 0 0 0' }}>
                GSTIN: {activeCompany.gstinNumber || 'Unregistered'} | Financial Year: {activeFinancialYear ? formatFinancialYearLabel(activeFinancialYear) : ''}
              </p>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '12px 0 0 0', color: 'var(--color-primary)' }}>
                GST Analytics — {flow === 'OUTWARD' ? 'Outward Supplies (Sales)' : 'Inward Supplies (Purchases)'} ({activeTab} Summary)
              </h3>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                Period: {startDate} to {endDate}
              </p>
            </div>

            {/* Print data table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #0f172a', fontWeight: 600, color: '#334155' }}>
                  {getGridColumns().map((col, idx) => (
                    <th key={idx} style={{ textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left', padding: '8px' }}>
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {getGridData().map((row: any, rowIdx: number) => (
                  <tr key={rowIdx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    {getGridColumns().map((col, colIdx) => (
                      <td key={colIdx} style={{ textAlign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left', padding: '8px' }}>
                        {col.render ? col.render(row, rowIdx) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

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
