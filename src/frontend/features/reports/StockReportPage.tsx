// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Report Page
// Phase 11.4: Real-time packets ledger, valuation, and aggregates
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Printer, Download, ArrowLeft, FileText, Filter } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button } from '../../components/ui';
import { DataGrid, Column } from '../../components/ui/DataGrid';
import { getStockReportCSV } from '../../utils/reportExports';

interface IQuality {
  id: number;
  qualityName: string;
  hsnCode: string;
}

export const StockReportPage: React.FC = () => {
  const { activeCompany, companyId, isReady } = useActiveCompany();
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'REGISTER' | 'QUALITY' | 'PROFITABILITY'>('DASHBOARD');

  // Filters State
  const [statusFilter, setStatusFilter] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupByConversionLot, setGroupByConversionLot] = useState(false);
  const [agingThreshold, setAgingThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('diamo:aging-threshold');
    return saved ? Number(saved) : 180;
  });

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Modal State for watching stock details
  const [activeDetailId, setActiveDetailId] = useState<number | null>(null);
  const [modalPacket, setModalPacket] = useState<any>(null);
  const [modalTimeline, setModalTimeline] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState<boolean>(false);

  const { invoke: getStockDetail } = useIpc<any>('stock:get');
  const { invoke: getStockTimeline } = useIpc<any[]>('stock:timeline');

  useEffect(() => {
    const fetchModalDetails = async () => {
      if (!activeDetailId || !companyId) {
        setModalPacket(null);
        setModalTimeline([]);
        return;
      }
      setModalLoading(true);
      try {
        const [pRes, tRes] = await Promise.all([
          getStockDetail({ id: activeDetailId, companyId }),
          getStockTimeline({ id: activeDetailId, companyId }),
        ]);
        if (pRes.success) setModalPacket(pRes.data);
        if (tRes.success && tRes.data) setModalTimeline(tRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setModalLoading(false);
      }
    };
    fetchModalDetails();
  }, [activeDetailId, companyId, getStockDetail, getStockTimeline]);

  // IPC Hooks
  const { data: reportData, loading, invoke: fetchStockReport } = useIpc<any>('report:stock');
  const { invoke: fetchQualities } = useIpc<IQuality[]>('quality:list');
  const [qualities, setQualities] = useState<IQuality[]>([]);

  const loadData = useCallback(async () => {
    if (!companyId) return;
    
    // Fetch report data
    await fetchStockReport({
      companyId,
      filters: {
        status: statusFilter || undefined,
        qualityId: qualityFilter ? Number(qualityFilter) : undefined,
        search: searchQuery || undefined,
      }
    });

    // Fetch qualities list for filter dropdown
    const qList = await fetchQualities({ companyId });
    if (qList.success && qList.data) {
      setQualities(qList.data);
    }
  }, [companyId, statusFilter, qualityFilter, searchQuery, fetchStockReport, fetchQualities]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const triggerDirectPrint = () => {
    setShowPrintModal(false);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleExportPDF = async () => {
    setShowPrintPreview(true);
    setTimeout(async () => {
      try {
        const res = await window.api.invoke('system:print-to-pdf', {
          filename: `Stock_Report_${new Date().toISOString().split('T')[0]}.pdf`
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
    if (!reportData) return;
    const targetTab = activeTab === 'DASHBOARD' ? 'REGISTER' : activeTab;
    const csvContent = getStockReportCSV(reportData, targetTab);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Stock_Report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: Column<any>[] = useMemo(() => [
    { key: 'stockIdNumber', header: 'PACKET NO', sortable: true },
    { key: 'qualityName', header: 'QUALITY', sortable: true },
    { key: 'shape', header: 'SHAPE', sortable: true, render: (row) => row.shape || '—' },
    { key: 'color', header: 'COLOR', sortable: true, render: (row) => row.color || '—' },
    { key: 'clarity', header: 'CLARITY', sortable: true, render: (row) => row.clarity || '—' },
    { 
      key: 'caratWeight', 
      header: 'CARATS', 
      align: 'right',
      render: (row) => `${Number(row.caratWeight).toFixed(3)} Cts`
    },
    { 
      key: 'costRate', 
      header: 'COST RATE', 
      align: 'right',
      render: (row) => `₹${Number(row.costRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    },
    { 
      key: 'totalValue', 
      header: 'VALUATION', 
      align: 'right',
      render: (row) => (
        <span style={{ fontWeight: 600 }}>
          ₹{Number(row.totalValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      )
    },
    { 
      key: 'currentStatus', 
      header: 'STATUS', 
      render: (row) => (
        <span style={{
          fontSize: '11px',
          fontWeight: 700,
          padding: '4px 8px',
          borderRadius: '4px',
          background: row.currentStatus === 'AVAILABLE' ? 'var(--color-success-light)' : 'var(--color-warning-light)',
          color: row.currentStatus === 'AVAILABLE' ? 'var(--color-success)' : 'var(--color-warning)',
        }}>
          {row.currentStatus}
        </span>
      )
    },
    { key: 'location', header: 'LOCATION' },
  ], []);

  const qualityColumns: Column<any>[] = useMemo(() => [
    { key: 'qualityName', header: 'QUALITY GRADE', sortable: true },
    { key: 'count', header: 'PACKET COUNT', align: 'center' },
    { 
      key: 'carats', 
      header: 'TOTAL CARATS', 
      align: 'right',
      render: (row) => `${Number(row.carats).toFixed(3)} Cts`
    },
    { 
      key: 'averageRate', 
      header: 'AVERAGE RATE', 
      align: 'right',
      render: (row) => `₹${Number(row.averageRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    },
    { 
      key: 'totalValue', 
      header: 'TOTAL VALUATION', 
      align: 'right',
      render: (row) => (
        <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
          ₹{Number(row.totalValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
      )
    },
  ], []);

  const profitabilityColumns: Column<any>[] = useMemo(() => [
    { key: 'stockIdNumber', header: 'PACKET NO', sortable: true },
    { key: 'qualityName', header: 'QUALITY', sortable: true },
    { 
      key: 'sourcePacketStockId', 
      header: 'ORIGIN / ROUGH LOT', 
      render: (row: any) => row.sourcePacketStockId ? (
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-accent)', padding: '2px 6px', background: 'rgba(2, 132, 199, 0.1)', borderRadius: '4px' }}>
          From {row.sourcePacketStockId}
        </span>
      ) : (
        <span style={{ fontSize: '11px', opacity: 0.5 }}>Direct Purchase</span>
      )
    },
    { 
      key: 'caratWeight', 
      header: 'CARATS', 
      align: 'right',
      render: (row) => `${Number(row.caratWeight).toFixed(3)} Cts`
    },
    { 
      key: 'costRate', 
      header: 'COST RATE (₹/CT)', 
      align: 'right',
      render: (row) => `₹${Number(row.costRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    },
    { 
      key: 'totalValue', 
      header: 'TOTAL COST (₹)', 
      align: 'right',
      render: (row) => `₹${Number(row.totalValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
    },
    { 
      key: 'sellingRate', 
      header: 'SALE / TARGET RATE (₹/CT)', 
      align: 'right',
      render: (row) => {
        if (row.actualSaleRate != null) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ color: '#16a34a', fontWeight: 700 }}>
                ₹{Number(row.actualSaleRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })} (SOLD)
              </span>
              {row.targetSaleRate != null && (
                <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                  Target: ₹{Number(row.targetSaleRate).toLocaleString('en-IN')}
                </span>
              )}
            </div>
          );
        }
        if (row.targetSaleRate != null) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ color: '#0284c7', fontWeight: 600 }}>
                ₹{Number(row.targetSaleRate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                Target Asking
              </span>
            </div>
          );
        }
        return <span style={{ opacity: 0.5 }}>—</span>;
      }
    },
    { 
      key: 'revenue', 
      header: 'REVENUE / VALUATION (₹)', 
      align: 'right',
      render: (row) => {
        const rate = row.actualSaleRate != null ? Number(row.actualSaleRate) : (row.targetSaleRate != null ? Number(row.targetSaleRate) : null);
        if (rate == null) return <span style={{ opacity: 0.5 }}>—</span>;
        const val = Number(row.caratWeight) * rate;
        return <span style={{ fontWeight: 600 }}>₹{val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>;
      }
    },
    { 
      key: 'stockProfit', 
      header: 'PROFIT / LOSS (₹)', 
      align: 'right',
      render: (row) => {
        const rate = row.actualSaleRate != null ? Number(row.actualSaleRate) : (row.targetSaleRate != null ? Number(row.targetSaleRate) : null);
        if (rate == null) return <span style={{ opacity: 0.5 }}>—</span>;
        const totalRev = Number(row.caratWeight) * rate;
        const profit = totalRev - Number(row.totalValue);
        const isPos = profit >= 0;
        const isRealized = row.actualSaleRate != null;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ color: isPos ? (isRealized ? '#16a34a' : '#0284c7') : '#dc2626', fontWeight: 700 }}>
              {isPos ? '+' : ''}₹{profit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '10px', fontWeight: 600, color: isRealized ? '#16a34a' : 'var(--color-text-secondary)' }}>
              {isRealized ? 'Realized Net Profit' : 'Estimated Target Profit'}
            </span>
          </div>
        );
      }
    },
    { 
      key: 'marginPct', 
      header: 'MARGIN %', 
      align: 'right',
      render: (row) => {
        const rate = row.actualSaleRate != null ? Number(row.actualSaleRate) : (row.targetSaleRate != null ? Number(row.targetSaleRate) : null);
        if (rate == null) return <span style={{ opacity: 0.5 }}>—</span>;
        const totalRev = Number(row.caratWeight) * rate;
        const profit = totalRev - Number(row.totalValue);
        const margin = totalRev > 0 ? (profit / totalRev) * 100 : 0;
        const isPos = margin >= 0;
        const isRealized = row.actualSaleRate != null;
        return (
          <span style={{ 
            padding: '4px 8px', 
            borderRadius: '4px', 
            background: isPos ? (isRealized ? 'rgba(22, 163, 74, 0.15)' : 'rgba(2, 132, 199, 0.15)') : 'rgba(220, 38, 38, 0.15)',
            color: isPos ? (isRealized ? '#16a34a' : '#0284c7') : '#dc2626', 
            fontWeight: 700 
          }}>
            {margin.toFixed(2)}%
          </span>
        );
      }
    },
    { 
      key: 'currentStatus', 
      header: 'STATUS', 
      render: (row) => {
        const isSold = row.currentStatus === 'SOLD';
        const isAvailable = row.currentStatus === 'AVAILABLE';
        return (
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 8px',
            borderRadius: '4px',
            background: isSold ? '#dcfce7' : (isAvailable ? '#e0f2fe' : 'var(--color-warning-light)'),
            color: isSold ? '#15803d' : (isAvailable ? '#0369a1' : 'var(--color-warning)'),
          }}>
            {isSold ? '✓ Realized (SOLD)' : (isAvailable ? '⏳ Vault (Unsold)' : row.currentStatus)}
          </span>
        );
      }
    },
  ], []);

  if (!isReady) {
    return <p style={{ color: 'var(--color-text-secondary)' }}>Select a company first.</p>;
  }

  // Render Print Preview Mode
  if (showPrintPreview && activeCompany && reportData) {
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
              <span style={{ color: 'var(--color-primary)' }}>STOCK REPORT — {activeTab}</span>
              <span>DATE: {new Date().toLocaleDateString('en-IN')}</span>
            </div>
          </div>

          {/* Printable Summary Block */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr 1fr', 
            gap: '12px', 
            marginBottom: '24px', 
            padding: '16px', 
            background: '#f8fafc', 
            border: '1px solid #cbd5e1', 
            borderRadius: '6px',
            fontSize: '11px',
            lineHeight: '1.4'
          }}>
            <div>
              <strong>Total Packets:</strong> {reportData.summary.totalPackets} ({reportData.summary.totalCarats.toFixed(3)} Cts)
            </div>
            <div>
              <strong>Total Valuation:</strong> ₹{reportData.summary.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div>
              <strong>Available Stock:</strong> {reportData.summary.statusBreakdown.available.count} Pkts ({reportData.summary.statusBreakdown.available.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.available.value.toLocaleString('en-IN')})
            </div>
            <div>
              <strong>Reserved / Hold:</strong> {reportData.summary.statusBreakdown.reserved.count} Pkts ({reportData.summary.statusBreakdown.reserved.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.reserved.value.toLocaleString('en-IN')})
            </div>
            <div>
              <strong>In Job Work:</strong> {reportData.summary.statusBreakdown.jobWork.count} Pkts ({reportData.summary.statusBreakdown.jobWork.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.jobWork.value.toLocaleString('en-IN')})
            </div>
            <div>
              <strong>Transit / Created:</strong> {reportData.summary.statusBreakdown.transit.count} Pkts ({reportData.summary.statusBreakdown.transit.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.transit.value.toLocaleString('en-IN')})
            </div>
            <div>
              <strong>Sold:</strong> {reportData.summary.statusBreakdown.sold.count} Pkts ({reportData.summary.statusBreakdown.sold.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.sold.value.toLocaleString('en-IN')})
            </div>
            <div>
              <strong>Returned:</strong> {reportData.summary.statusBreakdown.returned.count} Pkts ({reportData.summary.statusBreakdown.returned.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.returned.value.toLocaleString('en-IN')})
            </div>
            <div>
              <strong>Damaged:</strong> {reportData.summary.statusBreakdown.damaged.count} Pkts ({reportData.summary.statusBreakdown.damaged.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.damaged.value.toLocaleString('en-IN')})
            </div>
          </div>

          {activeTab === 'REGISTER' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Packet No</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Quality</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Size/Shape</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Carats</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Cost Rate</th>
                  <th style={{ textAlign: 'right', padding: '6px' }}>Valuation</th>
                  <th style={{ textAlign: 'left', padding: '6px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.packets.map((p: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px', fontWeight: 600 }}>{p.stockIdNumber}</td>
                    <td style={{ padding: '6px' }}>{p.qualityName}</td>
                    <td style={{ padding: '6px' }}>{p.shape || '—'} {p.color} {p.clarity}</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>{p.caratWeight.toFixed(3)} Cts</td>
                    <td style={{ textAlign: 'right', padding: '6px' }}>₹{p.costRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', padding: '6px', fontWeight: 600 }}>₹{p.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: '6px' }}>{p.currentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a', fontWeight: 700 }}>
                  <th style={{ textAlign: 'left', padding: '8px' }}>Quality Grade</th>
                  <th style={{ textAlign: 'center', padding: '8px' }}>Packet Count</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Total Carats</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Average Rate</th>
                  <th style={{ textAlign: 'right', padding: '8px' }}>Total Valuation</th>
                </tr>
              </thead>
              <tbody>
                {reportData.qualityAggregates.map((q: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{q.qualityName}</td>
                    <td style={{ textAlign: 'center', padding: '8px' }}>{q.count}</td>
                    <td style={{ textAlign: 'right', padding: '8px' }}>{q.carats.toFixed(3)} Cts</td>
                    <td style={{ textAlign: 'right', padding: '8px' }}>₹{q.averageRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>₹{q.totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>Stock & Valuation Report</h1>
          <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Packet-level ledger, locations, and valuations for {activeCompany?.companyName}
          </p>
        </div>
        {reportData && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="secondary" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Download size={16} /> Export CSV
            </Button>
            <Button variant="secondary" onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FileText size={16} /> Export PDF
            </Button>
            <Button variant="primary" onClick={() => setShowPrintModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Printer size={16} /> Print
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {reportData && (
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
          {/* Card 0: Total Packets */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Total Packets</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>
              {reportData.summary.totalPackets}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {reportData.summary.totalCarats.toFixed(3)} Carats Total
            </span>
          </div>

          {/* Card 1: Current Active Vault Valuation */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '4px solid #16a34a', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>1. Current Active Valuation</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>
              ₹{(reportData.summary.activeValuation ?? (reportData.summary.statusBreakdown.available.value + reportData.summary.statusBreakdown.reserved.value + reportData.summary.statusBreakdown.jobWork.value)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-primary)', fontWeight: 600, marginTop: '2px' }}>
              {(reportData.summary.activePacketsCount ?? (reportData.summary.statusBreakdown.available.count + reportData.summary.statusBreakdown.reserved.count + reportData.summary.statusBreakdown.jobWork.count))} Packets ({(reportData.summary.activeCarats ?? (reportData.summary.statusBreakdown.available.carats + reportData.summary.statusBreakdown.reserved.carats + reportData.summary.statusBreakdown.jobWork.carats)).toFixed(3)} Cts)
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              (Active vault stock in Available + Hold + Job Work)
            </div>
          </div>

          {/* Card 2: Valuation Based on Available Stock */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '4px solid #0284c7', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>2. Available Stock Valuation</span>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0284c7', marginTop: '4px' }}>
              ₹{reportData.summary.statusBreakdown.available.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-primary)', fontWeight: 600, marginTop: '2px' }}>
              {reportData.summary.statusBreakdown.available.count} Packets ({reportData.summary.statusBreakdown.available.carats.toFixed(3)} Cts)
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              (Stock strictly ready for immediate sale)
            </div>
          </div>

          {/* Card 3: Total Cumulative Valuation (All Stock) */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Cumulative Valuation</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '4px' }}>
              ₹{reportData.summary.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-primary)', fontWeight: 600, marginTop: '2px' }}>
              {reportData.summary.totalPackets} Total Packets ({reportData.summary.totalCarats.toFixed(3)} Cts)
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              (All historical stock including Sold & Returned)
            </div>
          </div>

          {/* Card 4: Reserved / Hold */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Reserved / Hold</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#6366f1', marginTop: '4px' }}>
              {reportData.summary.statusBreakdown.reserved.count} Packets
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {reportData.summary.statusBreakdown.reserved.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.reserved.value.toLocaleString()}
            </span>
          </div>

          {/* Card 5: In Job Work */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>In Job Work</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-warning)', marginTop: '4px' }}>
              {reportData.summary.statusBreakdown.jobWork.count} Packets
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {reportData.summary.statusBreakdown.jobWork.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.jobWork.value.toLocaleString()}
            </span>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Transit / Created</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#06b6d4', marginTop: '4px' }}>
              {reportData.summary.statusBreakdown.transit.count} Packets
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {reportData.summary.statusBreakdown.transit.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.transit.value.toLocaleString()}
            </span>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Sold</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', marginTop: '4px' }}>
              {reportData.summary.statusBreakdown.sold.count} Packets
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {reportData.summary.statusBreakdown.sold.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.sold.value.toLocaleString()}
            </span>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Returned</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b', marginTop: '4px' }}>
              {reportData.summary.statusBreakdown.returned.count} Packets
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {reportData.summary.statusBreakdown.returned.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.returned.value.toLocaleString()}
            </span>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Damaged</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>
              {reportData.summary.statusBreakdown.damaged.count} Packets
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {reportData.summary.statusBreakdown.damaged.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.damaged.value.toLocaleString()}
            </span>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Archived</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#6b7280', marginTop: '4px' }}>
              {reportData.summary.statusBreakdown.archived.count} Packets
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {reportData.summary.statusBreakdown.archived.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.archived.value.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Filter panel */}
      <div className="no-print" style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-secondary)' }}>
          <Filter size={16} /> <span style={{ fontSize: '13px', fontWeight: 600 }}>Filters:</span>
        </div>

        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            height: '32px',
            borderRadius: '4px',
            border: '1px solid var(--color-border)',
            background: 'transparent',
            padding: '0 8px',
            fontSize: '13px',
            color: 'var(--color-text-primary)'
          }}
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="HOLD">Reserved</option>
          <option value="JOB_WORK">Job Work</option>
          <option value="CREATED">Transit/Created</option>
          <option value="SOLD">Sold</option>
          <option value="RETURNED">Returned</option>
          <option value="DAMAGED">Damaged</option>
          <option value="ARCHIVED">Archived</option>
        </select>

        <select 
          value={qualityFilter} 
          onChange={(e) => setQualityFilter(e.target.value)}
          style={{
            height: '32px',
            borderRadius: '4px',
            border: '1px solid var(--color-border)',
            background: 'transparent',
            padding: '0 8px',
            fontSize: '13px',
            color: 'var(--color-text-primary)'
          }}
        >
          <option value="">All Qualities</option>
          {qualities.map((q) => (
            <option key={q.id} value={q.id}>{q.qualityName}</option>
          ))}
        </select>

        <Input
          placeholder="Search Packet No, Shape..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ width: '240px', height: '32px' }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
            Aging Threshold:
          </span>
          <input
            type="number"
            min="1"
            value={agingThreshold}
            onChange={(e) => {
              const val = Math.max(1, Number(e.target.value) || 1);
              setAgingThreshold(val);
              localStorage.setItem('diamo:aging-threshold', String(val));
            }}
            style={{
              width: '80px',
              height: '32px',
              borderRadius: '4px',
              border: '1px solid var(--color-border)',
              background: 'transparent',
              padding: '0 8px',
              fontSize: '13px',
              color: 'var(--color-text-primary)',
              textAlign: 'center',
            }}
          />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Days</span>
        </div>
      </div>

      {/* Tab Selectors */}
      <div className="no-print" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('DASHBOARD')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'DASHBOARD' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'DASHBOARD' ? '#ffffff' : 'var(--color-text-secondary)',
            fontWeight: 600,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Valuation Dashboard
        </button>
        <button
          onClick={() => setActiveTab('REGISTER')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'REGISTER' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'REGISTER' ? '#ffffff' : 'var(--color-text-secondary)',
            fontWeight: 600,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Detailed Stock Register
        </button>
        <button
          onClick={() => setActiveTab('QUALITY')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'QUALITY' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'QUALITY' ? '#ffffff' : 'var(--color-text-secondary)',
            fontWeight: 600,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Quality-wise Valuation
        </button>
        <button
          onClick={() => setActiveTab('PROFITABILITY')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'PROFITABILITY' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'PROFITABILITY' ? '#ffffff' : 'var(--color-text-secondary)',
            fontWeight: 600,
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          💎 Stock-wise Profitability
        </button>
      </div>

      {/* Grid/Dashboard view */}
      <div className="no-print">
        {activeTab === 'DASHBOARD' && reportData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Top Row: Business Intelligence Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Inventory Turnover Ratio</span>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-success)', marginTop: '8px' }}>
                  {reportData.summary.turnoverRatio ? reportData.summary.turnoverRatio.toFixed(2) : '0.00'}x
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
                  Measures how fast stock is sold and replaced during the period. Higher means faster sales velocity.
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Average Holding Period</span>
                <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '8px' }}>
                  {reportData.summary.avgHoldingPeriod ? Math.round(reportData.summary.avgHoldingPeriod) : '0'} Days
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
                  Average duration in days a diamond packet stays in the vault before being successfully sold.
                </div>
              </div>

              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Active Stock in Vault</span>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#06b6d4', marginTop: '8px' }}>
                  {((reportData.summary.statusBreakdown.available.value / (reportData.summary.totalValuation || 1)) * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
                  Percentage of total diamond asset value that is currently available in-vault for immediate sales.
                </div>
              </div>
            </div>

            {/* Middle Row: Status Donut Chart & Ageing Bar Graph */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
              {/* SVG Donut Chart */}
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '20px' }}>Inventory Status Breakdown</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0 }}>
                    <svg width="160" height="160" viewBox="0 0 160 160">
                      <circle cx="80" cy="80" r="60" fill="transparent" stroke="var(--color-border)" strokeWidth="16" />
                      {(() => {
                        const total = reportData.summary.totalValuation || 1;
                        const availablePct = (reportData.summary.statusBreakdown.available.value / total) * 100;
                        const reservedPct = (reportData.summary.statusBreakdown.reserved.value / total) * 100;
                        const jobWorkPct = (reportData.summary.statusBreakdown.jobWork.value / total) * 100;
                        const soldPct = (reportData.summary.statusBreakdown.sold.value / total) * 100;
                        
                        const circumference = 2 * Math.PI * 60;
                        
                        let accumulatedOffset = 0;

                        const items = [
                          { pct: availablePct, color: 'var(--color-primary)' },
                          { pct: reservedPct, color: '#6366f1' },
                          { pct: jobWorkPct, color: 'var(--color-warning)' },
                          { pct: soldPct, color: 'var(--color-success)' },
                        ];

                        return items.map((item, i) => {
                          if (item.pct <= 0) return null;
                          const strokeLength = (item.pct / 100) * circumference;
                          const strokeOffset = circumference - strokeLength + accumulatedOffset;
                          accumulatedOffset -= strokeLength;

                          return (
                            <circle
                              key={i}
                              cx="80"
                              cy="80"
                              r="60"
                              fill="transparent"
                              stroke={item.color}
                              strokeWidth="16"
                              strokeDasharray={`${strokeLength} ${circumference}`}
                              strokeDashoffset={strokeOffset}
                              transform="rotate(-90 80 80)"
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>TOTAL VALUE</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                        ₹{Math.round(reportData.summary.totalValuation / 100000)}L
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                    {[
                      { name: 'Available', color: 'var(--color-primary)', value: reportData.summary.statusBreakdown.available.value, count: reportData.summary.statusBreakdown.available.count },
                      { name: 'Reserved', color: '#6366f1', value: reportData.summary.statusBreakdown.reserved.value, count: reportData.summary.statusBreakdown.reserved.count },
                      { name: 'Job Work', color: 'var(--color-warning)', value: reportData.summary.statusBreakdown.jobWork.value, count: reportData.summary.statusBreakdown.jobWork.count },
                      { name: 'Sold', color: 'var(--color-success)', value: reportData.summary.statusBreakdown.sold.value, count: reportData.summary.statusBreakdown.sold.count },
                    ].map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: item.color }} />
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.name} ({item.count})</span>
                        </div>
                        <span style={{ color: 'var(--color-text-secondary)', fontWeight: 700 }}>
                          ₹{item.value.toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ageing Bar Graph */}
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '20px' }}>Inventory Ageing Analysis</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '140px', paddingBottom: '10px' }}>
                  {[
                    { label: '0-30 Days', key: 'days_0_30', color: 'var(--color-primary-light)', barColor: 'var(--color-primary)' },
                    { label: '31-90 Days', key: 'days_31_90', color: '#e0e7ff', barColor: '#6366f1' },
                    { label: '91-180 Days', key: 'days_91_180', color: '#ffedd5', barColor: 'var(--color-warning)' },
                    { label: '181-365 Days', key: 'days_181_365', color: '#fee2e2', barColor: '#ef4444' },
                    { label: '365+ Days', key: 'above_365', color: '#f3f4f6', barColor: '#6b7280' },
                  ].map((bracket, idx) => {
                    const data = reportData.summary.ageing[bracket.key];
                    const val = data?.value || 0;
                    
                    const maxVal = Math.max(
                      reportData.summary.ageing.days_0_30?.value || 1,
                      reportData.summary.ageing.days_31_90?.value || 1,
                      reportData.summary.ageing.days_91_180?.value || 1,
                      reportData.summary.ageing.days_181_365?.value || 1,
                      reportData.summary.ageing.above_365?.value || 1
                    );
                    const pctHeight = maxVal > 0 ? (val / maxVal) * 100 : 0;

                    return (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '18%', gap: '8px' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          ₹{Math.round(val / 1000)}K
                        </div>
                        <div style={{
                          width: '100%',
                          height: '90px',
                          background: bracket.color,
                          borderRadius: '4px 4px 0 0',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'flex-end',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: '100%',
                            height: `${pctHeight}%`,
                            background: bracket.barColor,
                            transition: 'height 0.4s ease-out',
                          }} />
                        </div>
                        <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--color-text-secondary)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {bracket.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Row: Shape & Quality Value Concentrations */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
              {/* Shape Concentration */}
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '20px' }}>Valuation by Diamond Shape</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(reportData.summary.shapeConcentration || []).slice(0, 5).map((shape: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                        <span style={{ color: 'var(--color-text-primary)' }}>{shape.name}</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          ₹{shape.value.toLocaleString('en-IN')} ({shape.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${shape.percentage}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '4px' }} />
                      </div>
                    </div>
                  ))}
                  {(!reportData.summary.shapeConcentration || reportData.summary.shapeConcentration.length === 0) && (
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                      No shape concentration statistics available.
                    </div>
                  )}
                </div>
              </div>

              {/* Clarity Concentration */}
              <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '24px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '20px' }}>Valuation by Clarity Grade</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(reportData.summary.clarityConcentration || []).slice(0, 5).map((clarity: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                        <span style={{ color: 'var(--color-text-primary)' }}>{clarity.name}</span>
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          ₹{clarity.value.toLocaleString('en-IN')} ({clarity.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '8px', background: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${clarity.percentage}%`, height: '100%', background: '#6366f1', borderRadius: '4px' }} />
                      </div>
                    </div>
                  ))}
                  {(!reportData.summary.clarityConcentration || reportData.summary.clarityConcentration.length === 0) && (
                    <div style={{ color: 'var(--color-text-secondary)', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                      No clarity concentration statistics available.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Third Row: Aging Alerts & Dead Stock Recommendations */}
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '24px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '16px' }}>
                Aging Alerts & Recommendations
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(() => {
                  const today = new Date();
                  const agingPackets = (reportData.packets || [])
                    .filter((p: any) => ['AVAILABLE', 'HOLD', 'JOB_WORK'].includes(p.currentStatus))
                    .map((p: any) => {
                      const regDate = p.registrationDate ? new Date(p.registrationDate) : today;
                      const ageInDays = Math.ceil(Math.abs(today.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24));
                      return { ...p, ageInDays };
                    })
                    .filter((p: any) => p.ageInDays >= agingThreshold)
                    .sort((a: any, b: any) => b.ageInDays - a.ageInDays);

                  if (agingPackets.length === 0) {
                    return (
                      <div style={{
                        padding: '16px',
                        background: 'var(--color-success-light)',
                        border: '1px solid var(--color-success)',
                        borderRadius: '6px',
                        color: 'var(--color-success)',
                        fontSize: '13px',
                        fontWeight: 600,
                        textAlign: 'center',
                      }}>
                        All active vault inventory is fresh! No packets exceed the {agingThreshold}-day aging threshold.
                      </div>
                    );
                  }

                  return agingPackets.map((pkt: any, idx: number) => {
                    const cycle = Math.floor(pkt.ageInDays / agingThreshold);

                    
                    const badgeBg = cycle >= 2 ? 'var(--color-danger-light)' : 'var(--color-warning-light)';
                    const badgeColor = cycle >= 2 ? 'var(--color-danger)' : 'var(--color-warning)';
                    const recommendation = cycle >= 2
                      ? `Critical Dead Stock (Reminder Cycle ${cycle}). No sales movement for over ${cycle * agingThreshold} days. Recommended Action: Mount this packet into finished jewelry, or offer an additional 5% brokerage commission incentive to liquidating brokers.`
                      : `Aging Stock (Reminder Cycle ${cycle}). Held for over ${agingThreshold} days. Recommended Action: Check recent Rapaport price lists to adjust base rates, or request a fresh lab grading report to increase marketability.`;

                    return (
                      <div key={idx} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '16px',
                        background: '#f8fafc',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        fontSize: '13px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{pkt.stockIdNumber}</span>
                            <span style={{ color: 'var(--color-text-secondary)' }}>
                              ({pkt.shape} • {pkt.caratWeight.toFixed(3)} Cts • {pkt.color || '—'} {pkt.clarity || '—'})
                            </span>
                            <button
                              onClick={() => setActiveDetailId(pkt.id)}
                              style={{
                                padding: '2px 8px',
                                background: 'transparent',
                                border: '1px solid var(--color-primary)',
                                color: 'var(--color-primary)',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--color-primary)';
                                e.currentTarget.style.color = '#ffffff';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = 'var(--color-primary)';
                              }}
                            >
                              Watch Stock
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: '#e0f2fe',
                              color: '#0369a1',
                            }}>
                              Cycle {cycle} Alert
                            </span>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '4px 8px',
                              borderRadius: '4px',
                              background: badgeBg,
                              color: badgeColor,
                            }}>
                              {pkt.ageInDays} Days Old
                            </span>
                          </div>
                        </div>
                        <div style={{ color: 'var(--color-text-secondary)', fontSize: '12px', marginTop: '4px', lineHeight: 1.4 }}>
                          {recommendation}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>
        ) : activeTab === 'REGISTER' ? (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
            <DataGrid
              columns={columns}
              data={reportData?.packets || []}
              keyField="id"
              loading={loading}
              emptyTitle="No Packets Found"
              emptyDescription="No packets match your search and filter criteria."
            />
          </div>
        ) : activeTab === 'PROFITABILITY' ? (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
            <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-primary)' }}>Stock-wise Profitability & Target Margin Analysis</h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Realized profits for sold inventory vs. target asking margins for active vault stock
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setStatusFilter('')}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    background: statusFilter === '' ? 'var(--color-primary)' : 'transparent',
                    color: statusFilter === '' ? '#ffffff' : 'var(--color-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  All Packets
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('SOLD')}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    background: statusFilter === 'SOLD' ? '#16a34a' : 'transparent',
                    color: statusFilter === 'SOLD' ? '#ffffff' : 'var(--color-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Realized Sold Profits (SOLD)
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('AVAILABLE')}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    background: statusFilter === 'AVAILABLE' ? '#0284c7' : 'transparent',
                    color: statusFilter === 'AVAILABLE' ? '#ffffff' : 'var(--color-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  Target Vault Profits (AVAILABLE)
                </button>
                <button
                  type="button"
                  onClick={() => setGroupByConversionLot(!groupByConversionLot)}
                  style={{
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                    background: groupByConversionLot ? '#8b5cf6' : 'transparent',
                    color: groupByConversionLot ? '#ffffff' : 'var(--color-text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {groupByConversionLot ? '📦 Grouped by Rough Lot ✓' : '📦 Group by Rough Lot'}
                </button>
              </div>
            </div>
            {groupByConversionLot ? (() => {
              const packetsList = reportData?.packets || [];
              const groupedMap = new Map<string, any[]>();
              for (const p of packetsList) {
                const groupKey = p.sourcePacketStockId ? `Rough Lot: ${p.sourcePacketStockId}` : 'Direct Purchased Stock';
                if (!groupedMap.has(groupKey)) groupedMap.set(groupKey, []);
                groupedMap.get(groupKey)!.push(p);
              }

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {Array.from(groupedMap.entries()).map(([groupName, groupPackets]) => {
                    const totalCarats = groupPackets.reduce((sum, p) => sum + Number(p.caratWeight), 0);
                    const isConversionGroup = groupName.startsWith('Rough Lot:');
                    
                    // Input Investment (Option 2)
                    const samplePkt = groupPackets[0];
                    const roughCost = isConversionGroup && samplePkt?.sourceRoughCost != null ? Number(samplePkt.sourceRoughCost) : null;
                    const jobWorkCost = isConversionGroup && samplePkt?.sourceProcessingCost != null ? Number(samplePkt.sourceProcessingCost) : null;
                    const totalInputInvestment = (roughCost != null && jobWorkCost != null)
                      ? (roughCost + jobWorkCost)
                      : groupPackets.reduce((sum, p) => sum + Number(p.totalValue), 0);

                    // Output Revenue / Valuation
                    const packetValuations = groupPackets.map((p) => {
                      const rate = p.actualSaleRate != null ? Number(p.actualSaleRate) : (p.targetSaleRate != null ? Number(p.targetSaleRate) : Number(p.costRate));
                      return Number(p.caratWeight) * rate;
                    });
                    const totalOutputValuation = packetValuations.reduce((sum, v) => sum + v, 0);

                    // Lot Profit Math
                    const groupProfit = totalOutputValuation - totalInputInvestment;
                    const groupMargin = totalOutputValuation > 0 ? (groupProfit / totalOutputValuation) * 100 : 0;
                    const isProfit = groupProfit >= 0;

                    // Option 1: Proportionate Cost Allocation for Table Rows
                    const displayPackets = groupPackets.map((p, idx) => {
                      if (!isConversionGroup) return p;
                      const val = packetValuations[idx];
                      const allocatedCost = totalOutputValuation > 0
                        ? totalInputInvestment * (val / totalOutputValuation)
                        : (totalCarats > 0 ? totalInputInvestment * (Number(p.caratWeight) / totalCarats) : Number(p.totalValue));
                      const allocatedCostRate = Number(p.caratWeight) > 0 ? allocatedCost / Number(p.caratWeight) : Number(p.costRate);

                      return {
                        ...p,
                        costRate: allocatedCostRate,
                        totalValue: allocatedCost,
                      };
                    });

                    return (
                      <div key={groupName} style={{ border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', background: 'var(--color-row-alt)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
                          <div>
                            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)' }}>{groupName}</span>
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginLeft: '12px' }}>
                              ({groupPackets.length} {groupPackets.length === 1 ? 'Packet' : 'Packets'} — {totalCarats.toFixed(3)} Cts)
                            </span>
                            {(() => {
                              const soldInGroup = groupPackets.filter((p) => p.currentStatus === 'SOLD').length;
                              const unsoldInGroup = groupPackets.filter((p) => p.currentStatus === 'AVAILABLE').length;
                              return (
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  marginLeft: '10px',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  background: soldInGroup > 0 ? '#dcfce7' : '#e0f2fe',
                                  color: soldInGroup > 0 ? '#15803d' : '#0369a1',
                                }}>
                                  {soldInGroup}/{groupPackets.length} Sold {unsoldInGroup > 0 ? `(${unsoldInGroup} Unsold in Vault)` : ''}
                                </span>
                              );
                            })()}
                          </div>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '12px' }}>
                            {isConversionGroup && roughCost != null && (
                              <span>Rough Purchase: <strong>₹{roughCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                            )}
                            {isConversionGroup && jobWorkCost != null && (
                              <span>Job Work Charges: <strong>₹{jobWorkCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                            )}
                            <span>Total Input Cost: <strong>₹{totalInputInvestment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                            <span>Output Valuation: <strong>₹{totalOutputValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              background: isProfit ? '#dcfce7' : '#fee2e2',
                              color: isProfit ? '#15803d' : '#b91c1c',
                              fontWeight: 700,
                              fontSize: '13px'
                            }}>
                              Lot Profit: {isProfit ? '+' : ''}₹{groupProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({groupMargin.toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                        <DataGrid
                          columns={profitabilityColumns}
                          data={displayPackets}
                          keyField="id"
                          loading={loading}
                          emptyTitle="No Stock Packets Found"
                          emptyDescription="No packets match your search and filter criteria."
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })() : (
              <DataGrid
                columns={profitabilityColumns}
                data={reportData?.packets || []}
                keyField="id"
                loading={loading}
                emptyTitle="No Stock Packets Found"
                emptyDescription="No packets match your search and filter criteria."
              />
            )}
          </div>
        ) : (
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '20px' }}>
            <DataGrid
              columns={qualityColumns}
              data={reportData?.qualityAggregates || []}
              keyField="qualityName"
              loading={loading}
              emptyTitle="No Qualities Aggregated"
              emptyDescription="Register stock packets to compute quality aggregates."
            />
          </div>
        )}
      </div>

      {/* Choose Print Destination Modal */}
      {/* Watch Stock Details Popup Modal */}
      {activeDetailId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1001,
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '850px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                  {modalPacket ? modalPacket.stockIdNumber : 'Loading...'}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  {modalPacket?.quality?.qualityName || 'Packet'} Details
                </p>
              </div>
              <button 
                onClick={() => setActiveDetailId(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  fontSize: '18px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {modalLoading ? (
              <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '40px' }}>Loading packet specs...</p>
            ) : modalPacket ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                {/* Left Side: Specs Grid */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Diamond Specifications</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    {[
                      { label: 'Status', value: modalPacket.currentStatus },
                      { label: 'Category', value: modalPacket.category },
                      { label: 'Registration Date', value: new Date(modalPacket.registrationDate).toLocaleDateString('en-IN') },
                      { label: 'Carats', value: `${Number(modalPacket.caratWeight).toFixed(3)} Cts` },
                      { label: 'Pieces', value: modalPacket.pieceCount === 0 ? 'Not Counted' : modalPacket.pieceCount },
                      { label: 'Shape', value: modalPacket.shape || '—' },
                      { label: 'Color', value: modalPacket.color || '—' },
                      { label: 'Clarity', value: modalPacket.clarity || '—' },
                      { label: 'Cut Grade', value: modalPacket.cut || '—' },
                      { label: 'Polish Grade', value: modalPacket.polish || '—' },
                      { label: 'Symmetry', value: modalPacket.symmetry || '—' },
                      {label: 'Remarks', value: modalPacket.currentLocation || '—'},
                      { label: 'Lab Cert Number', value: modalPacket.certificateNumber || '—' },
                    ].map((row, idx) => (
                      <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>{row.label}</span>
                        <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', fontWeight: 600 }}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Cost / Carat</span>
                      <span style={{ fontSize: '15px', color: 'var(--color-success)', fontWeight: 700 }}>
                        ₹{Number(modalPacket.costPerCarat || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Total Cost</span>
                      <span style={{ fontSize: '15px', color: 'var(--color-success)', fontWeight: 700 }}>
                        ₹{Number(modalPacket.totalCost || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Timeline movements */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>Packet History & Logs</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
                    {(modalTimeline || []).map((mov, i) => (
                      <div key={i} style={{ padding: '12px', background: '#f8fafc', borderLeft: '4px solid var(--color-primary)', borderRadius: '0 6px 6px 0', fontSize: '12px', border: '1px solid var(--color-border)', borderLeftWidth: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                          <span>{mov.movementType}</span>
                          <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                            {new Date(mov.movementDate).toLocaleDateString('en-IN')}
                          </span>
                        </div>
                        <div style={{ marginTop: '6px', color: 'var(--color-text-secondary)', fontSize: '11px' }}>
                          Status changed: {mov.previousStatus} ➜ {mov.newStatus}
                        </div>
                        {mov.remarks && (
                          <div style={{ marginTop: '4px', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>
                            "{mov.remarks}"
                          </div>
                        )}
                      </div>
                    ))}
                    {(!modalTimeline || modalTimeline.length === 0) && (
                      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px' }}>No transaction history logged.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Failed to load packet info.</p>
            )}

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
              <button 
                onClick={() => setActiveDetailId(null)}
                style={{
                  padding: '8px 20px',
                  background: 'var(--color-primary)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '13px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showPrintModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.3)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '28px',
            maxWidth: '420px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            textAlign: 'center',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Choose Print Destination</h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
              Select "Preview on Screen" to see the copy first, or "System Print Dialog" to print directly.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                onClick={() => { setShowPrintModal(false); setShowPrintPreview(true); }}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Preview on Screen
              </button>
              <button 
                onClick={triggerDirectPrint}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                System Print Dialog
              </button>
              <button 
                onClick={() => setShowPrintModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-secondary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '12px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
