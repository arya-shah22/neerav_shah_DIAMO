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
  const [activeTab, setActiveTab] = useState<'REGISTER' | 'QUALITY'>('REGISTER');

  // Filters State
  const [statusFilter, setStatusFilter] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

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
    const csvContent = getStockReportCSV(reportData, activeTab);
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
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Total Packets</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>
              {reportData.summary.totalPackets}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {reportData.summary.totalCarats.toFixed(3)} Carats
            </span>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Total Valuation</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>
              ₹{reportData.summary.totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Based on Landed Cost</span>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Available Stock</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)', marginTop: '4px' }}>
              {reportData.summary.statusBreakdown.available.count} Packets
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {reportData.summary.statusBreakdown.available.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.available.value.toLocaleString()}
            </span>
          </div>

          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Reserved / Hold</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#6366f1', marginTop: '4px' }}>
              {reportData.summary.statusBreakdown.reserved.count} Packets
            </div>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {reportData.summary.statusBreakdown.reserved.carats.toFixed(3)} Cts | ₹{reportData.summary.statusBreakdown.reserved.value.toLocaleString()}
            </span>
          </div>

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
      </div>

      {/* Tab Selectors */}
      <div className="no-print" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
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
      </div>

      {/* Grid view */}
      <div className="no-print" style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '8px',
        padding: '20px',
      }}>
        {activeTab === 'REGISTER' ? (
          <DataGrid
            columns={columns}
            data={reportData?.packets || []}
            keyField="id"
            loading={loading}
            emptyTitle="No Packets Found"
            emptyDescription="No packets match your search and filter criteria."
          />
        ) : (
          <DataGrid
            columns={qualityColumns}
            data={reportData?.qualityAggregates || []}
            keyField="qualityName"
            loading={loading}
            emptyTitle="No Qualities Aggregated"
            emptyDescription="Register stock packets to compute quality aggregates."
          />
        )}
      </div>

      {/* Choose Print Destination Modal */}
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
