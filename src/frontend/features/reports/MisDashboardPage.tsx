// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — MIS & Business Analytics Page
// Phase 11.8: Enterprise MIS & Business Analytics
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { Printer, RefreshCw, ArrowLeft } from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { Input, Button, Modal } from '../../components/ui';
import { DataGrid } from '../../components/ui/DataGrid';
import type { Column } from '../../components/ui/DataGrid';

type MisTab = 'DASHBOARD' | 'SALES_PURCHASE' | 'STOCK_JOB' | 'RATIOS';

const fmt = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatMonthLabel = (mStr: string) => {
  const [year, month] = mStr.split('-');
  if (!year || !month) return mStr;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export const MisDashboardPage: React.FC = () => {
  const { activeCompany, companyId, isReady } = useActiveCompany();

  // Date Range Defaults (Financial Year)
  const now = new Date();
  const fyStart = now.getMonth() >= 3 ? `${now.getFullYear()}-04-01` : `${now.getFullYear() - 1}-04-01`;
  const todayStr = now.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(fyStart);
  const [endDate, setEndDate] = useState(todayStr);
  const [activeTab, setActiveTab] = useState<MisTab>('DASHBOARD');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // IPC Hooks
  const { data: dashboardData, loading: dashLoading, invoke: getDashboard } = useIpc<any>('report:mis-dashboard');
  const { data: stockJobData, loading: stockJobLoading, invoke: getStockJob } = useIpc<any>('report:mis-stock-job');
  const { data: ratioData, loading: ratioLoading, invoke: getRatios } = useIpc<any>('report:mis-ratios');

  const refreshAll = useCallback(async () => {
    if (!companyId) return;
    const payload = { companyId, startDate, endDate };
    await Promise.all([
      getDashboard(payload),
      getStockJob({ companyId }),
      getRatios({ companyId, dateStr: endDate }),
    ]);
  }, [companyId, startDate, endDate, getDashboard, getStockJob, getRatios]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const isLoading = dashLoading || stockJobLoading || ratioLoading;

  // Print PDF Trigger
  const handleExportPDF = async () => {
    setShowPrintPreview(true);
    setTimeout(async () => {
      try {
        const res = await window.api.invoke('system:print-to-pdf', {
          filename: `MIS_Analytics_Report_${startDate}_to_${endDate}.pdf`
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

  // Styles
  const cardStyle: React.CSSProperties = {
    padding: 'var(--spacing-lg)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
  };

  const kpiCardStyle = (borderLeftColor?: string): React.CSSProperties => ({
    ...cardStyle,
    borderLeft: borderLeftColor ? `4px solid ${borderLeftColor}` : '1px solid var(--color-border)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '100px',
  });

  const kpiLabel: React.CSSProperties = {
    fontSize: '11px',
    textTransform: 'uppercase',
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
  };

  const kpiValue: React.CSSProperties = {
    fontSize: '22px',
    fontWeight: 800,
    color: 'var(--color-text)',
    marginTop: '8px',
  };

  const tabBarStyle: React.CSSProperties = {
    display: 'flex',
    gap: '2px',
    background: 'var(--color-bg)',
    borderRadius: 'var(--radius-lg)',
    padding: '4px',
    border: '1px solid var(--color-border)',
    marginBottom: 'var(--spacing-md)',
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

  // Table Columns
  const customerColumns: Column<any>[] = [
    { key: 'partyName', header: 'Customer Name', width: '250px' },
    { key: 'billCount', header: 'Invoices', width: '100px', align: 'right' },
    { key: 'netAmount', header: 'Revenue Volume', width: '180px', align: 'right', render: (row) => `₹${fmt(row.netAmount)}` },
  ];

  const supplierColumns: Column<any>[] = [
    { key: 'partyName', header: 'Supplier Name', width: '250px' },
    { key: 'billCount', header: 'Purchase Bills', width: '120px', align: 'right' },
    { key: 'netAmount', header: 'Purchase Volume', width: '180px', align: 'right', render: (row) => `₹${fmt(row.netAmount)}` },
  ];

  // Max value to scale monthly trend graph
  const trendMax = Math.max(
    ...(dashboardData?.monthlyTrend || []).flatMap((t: any) => [t.sales, t.purchases]),
    100000
  );

  // ─── Print Preview Layout ─────────────────────────────────
  if (showPrintPreview && activeCompany) {
    return (
      <div id="print-preview-root" style={{ background: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page { size: A4 landscape; margin: 15mm; }
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
          <Button variant="primary" onClick={() => setTimeout(() => window.print(), 100)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print / Save PDF
          </Button>
        </div>

        <div className="print-page" style={{
          background: '#ffffff',
          border: '1px solid var(--color-border)',
          padding: '20mm',
          width: '277mm',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}>
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '16px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{activeCompany.companyName}</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#475569' }}>
              {activeCompany.addressLine1} | {activeCompany.city} - {activeCompany.pincode}
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '13px', fontWeight: 600 }}>
              <span style={{ color: 'var(--color-primary)' }}>ENTERPRISE MIS & BUSINESS ANALYTICS REPORT</span>
              <span>PERIOD: {startDate} TO {endDate}</span>
            </div>
          </div>

          {/* Ratios & Highlights Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '24px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #0f172a' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Financial Metric</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Value</th>
                <th style={{ textAlign: 'left', padding: '8px', paddingLeft: '24px' }}>Operational Metric</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px' }}>Current Ratio</td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>{ratioData?.currentRatio || '0.00'}</td>
                <td style={{ padding: '8px', paddingLeft: '24px' }}>Vault Stock Valuation</td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>₹{fmt(stockJobData?.stock?.totalValue || 0)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px' }}>Quick Ratio</td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>{ratioData?.quickRatio || '0.00'}</td>
                <td style={{ padding: '8px', paddingLeft: '24px' }}>Slow Moving Stock Value</td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>₹{fmt(stockJobData?.stock?.slowMovingValue || 0)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px' }}>Outstanding Receivables (AR)</td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>₹{fmt(ratioData?.receivables || 0)}</td>
                <td style={{ padding: '8px', paddingLeft: '24px' }}>Active Outsource Orders</td>
                <td style={{ textAlign: 'right', padding: '8px', fontWeight: 600 }}>{stockJobData?.jobs?.activeOrders || 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (!isReady || !activeCompany) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Please select a company to view the analytics dashboard.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text)' }}>
            MIS & Business Analytics
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Executive oversight, financial ratios, stock velocity, and operational efficiency dashboards.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="ghost" onClick={() => setIsPrintModalOpen(true)} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Printer size={16} /> Print
          </Button>
          <Button variant="primary" onClick={refreshAll} disabled={isLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> Refresh
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
        <span style={{ fontSize: '13px', fontWeight: 600 }}>Period Select:</span>
        <div style={{ width: '160px' }}>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} label="" />
        </div>
        <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>to</span>
        <div style={{ width: '160px' }}>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} label="" />
        </div>
      </div>

      {/* Tab bar */}
      <div style={tabBarStyle}>
        {([
          { key: 'DASHBOARD', label: 'Executive Summary' },
          { key: 'SALES_PURCHASE', label: 'Sales & Purchases' },
          { key: 'STOCK_JOB', label: 'Stock & Outsourcing' },
          { key: 'RATIOS', label: 'Financial Ratios' }
        ] as { key: MisTab; label: string }[]).map((t) => (
          <button key={t.key} style={tabBtnStyle(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTab === 'DASHBOARD' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)' }}>
              <div style={kpiCardStyle('var(--color-success)')}>
                <div style={kpiLabel}>Today's Sales Revenue</div>
                <div style={kpiValue}>₹{fmt(dashboardData?.today?.sales || 0)}</div>
              </div>
              <div style={kpiCardStyle('var(--color-primary)')}>
                <div style={kpiLabel}>Today's Purchase Volume</div>
                <div style={kpiValue}>₹{fmt(dashboardData?.today?.purchases || 0)}</div>
              </div>
              <div style={kpiCardStyle('var(--color-warning)')}>
                <div style={kpiLabel}>Vault Stock Valuation</div>
                <div style={kpiValue}>₹{fmt(stockJobData?.stock?.totalValue || 0)}</div>
              </div>
              <div style={kpiCardStyle('#8e44ad')}>
                <div style={kpiLabel}>Accounts Receivable (AR)</div>
                <div style={kpiValue}>₹{fmt(ratioData?.receivables || 0)}</div>
              </div>
            </div>

            {/* Sales vs Purchase Monthly Bar Graph (CSS Based) */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Monthly Transaction Trends</h3>
              {dashboardData?.monthlyTrend?.length ? (
                <>
                  <div style={{ display: 'flex', height: '180px', alignItems: 'flex-end', justifyContent: 'space-around', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px', gap: '8px' }}>
                    {dashboardData.monthlyTrend.map((m: any) => {
                      const saleH = (m.sales / trendMax) * 100;
                      const purH = (m.purchases / trendMax) * 100;
                      return (
                        <div key={m.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', width: '100%', justifyContent: 'center', height: '100%' }}>
                            <div style={{ height: `${Math.max(saleH, 4)}%`, width: '14px', background: 'var(--color-success)', borderRadius: '2px 2px 0 0' }} title={`Sales: ₹${m.sales}`} />
                            <div style={{ height: `${Math.max(purH, 4)}%`, width: '14px', background: 'var(--color-primary)', borderRadius: '2px 2px 0 0' }} title={`Purchases: ₹${m.purchases}`} />
                          </div>
                          <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', marginTop: '8px', fontWeight: 600 }}>{formatMonthLabel(m.month)}</span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Chart Legend */}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '16px', fontSize: '12px', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '12px', height: '12px', background: 'var(--color-success)', borderRadius: '2px' }} />
                      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Sales Revenue</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '12px', height: '12px', background: 'var(--color-primary)', borderRadius: '2px' }} />
                      <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>Purchase Volume</span>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', padding: '24px' }}>No transaction history in this period.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'SALES_PURCHASE' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Top 5 Customers (Revenue)</h3>
              <DataGrid
                data={dashboardData?.topCustomers || []}
                columns={customerColumns}
                keyField="partyName"
                loading={isLoading}
                emptyTitle="No Customer Transactions"
                emptyDescription="Record sales invoices to view top customer listings."
              />
            </div>
            <div style={cardStyle}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>Top 5 Suppliers (Volume)</h3>
              <DataGrid
                data={dashboardData?.topSuppliers || []}
                columns={supplierColumns}
                keyField="partyName"
                loading={isLoading}
                emptyTitle="No Supplier Transactions"
                emptyDescription="Record purchase bills to view supplier listings."
              />
            </div>
          </div>
        )}

        {activeTab === 'STOCK_JOB' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-lg)' }}>
            <div style={kpiCardStyle('var(--color-warning)')}>
              <div style={kpiLabel}>Slow Moving Stock Ratio (&gt;90 Days)</div>
              <div style={kpiValue}>{stockJobData?.stock?.slowMovingRatio || '0.00'}%</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                Value: ₹{fmt(stockJobData?.stock?.slowMovingValue || 0)}
              </div>
            </div>
            <div style={kpiCardStyle('#16a085')}>
              <div style={kpiLabel}>Active Outsource Job Orders</div>
              <div style={kpiValue}>{stockJobData?.jobs?.activeOrders || 0}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                Pending worker approval or delivery
              </div>
            </div>
          </div>
        )}

        {activeTab === 'RATIOS' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--spacing-md)' }}>
            <div style={kpiCardStyle('var(--color-success)')}>
              <div style={kpiLabel}>Current Ratio</div>
              <div style={kpiValue}>{ratioData?.currentRatio || '0.00'}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Target: &gt; 1.5</div>
            </div>
            <div style={kpiCardStyle('var(--color-primary)')}>
              <div style={kpiLabel}>Quick Ratio</div>
              <div style={kpiValue}>{ratioData?.quickRatio || '0.00'}</div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Target: &gt; 1.0</div>
            </div>
            <div style={kpiCardStyle('var(--color-warning)')}>
              <div style={kpiLabel}>Outstanding Receivables</div>
              <div style={kpiValue}>₹{fmt(ratioData?.receivables || 0)}</div>
            </div>
            <div style={kpiCardStyle('var(--color-error)')}>
              <div style={kpiLabel}>Outstanding Payables</div>
              <div style={kpiValue}>₹{fmt(ratioData?.payables || 0)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Print Option Dialog */}
      <Modal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} title="Print Options" size="sm">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '8px 0' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            Choose how you would like to print or preview the analytics report:
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
