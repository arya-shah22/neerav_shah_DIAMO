// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Business Analytics Dashboard View
// Phase 15.2: Executive Analytics, Charts & Management Insights
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, BarChart3, PieChart, Users, RefreshCw,
  Award, ShoppingCart, ShoppingBag, Clock, ArrowUpRight,
  ChevronRight, Calendar
} from 'lucide-react';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { useCompanyStore, formatFinancialYearLabel } from '../../state/company-store';
import { Button } from '../../components/ui';
import { IBusinessAnalyticsData } from '../../../shared/types/dashboard.types';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

export const AnalyticsDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeCompany, companyId } = useActiveCompany();
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);

  const [timeframe, setTimeframe] = useState<6 | 12>(6);
  const [analytics, setAnalytics] = useState<IBusinessAnalyticsData | null>(null);
  const { invoke: getAnalytics, loading } = useIpc<IBusinessAnalyticsData>('dashboard:get-analytics');

  const fetchAnalytics = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await getAnalytics({ companyId, months: timeframe });
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Failed to load business analytics:', err);
    }
  }, [companyId, timeframe, getAnalytics]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const maxSales = Math.max(...(analytics?.monthlySalesTrend.map((s) => s.sales) || [1]), 1);
  const maxPurchases = Math.max(...(analytics?.monthlyPurchaseTrend.map((p) => p.purchases) || [1]), 1);
  const maxAgingValue = Math.max(...(analytics?.stockAgingProfile.map((a) => a.value) || [1]), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', width: '100%' }}>
      {/* 1. Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '16px',
          padding: '24px 28px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            <TrendingUp size={28} color="#38bdf8" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
              Business Analytics & Executive Insights
            </h1>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span>🏢 <strong>{activeCompany?.companyName || 'DIAMO ERP'}</strong></span>
              <span>📅 FY {activeFinancialYear ? formatFinancialYearLabel(activeFinancialYear) : '2026-27'}</span>
              <span>📊 Real-Time Financial & Stock Telemetry ({timeframe}-Month Window)</span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Configurable Rolling Window Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '4px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.18)',
            }}
          >
            <span style={{ fontSize: '11px', color: '#94a3b8', padding: '0 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar size={13} /> Timeframe:
            </span>
            <button
              onClick={() => setTimeframe(6)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: timeframe === 6 ? '#38bdf8' : 'transparent',
                color: timeframe === 6 ? '#0f172a' : '#ffffff',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              6 Months
            </button>
            <button
              onClick={() => setTimeframe(12)}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                background: timeframe === 12 ? '#38bdf8' : 'transparent',
                color: timeframe === 12 ? '#0f172a' : '#ffffff',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              12 Months
            </button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={fetchAnalytics}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.12)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              borderRadius: '8px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 2. Top Visual Telemetry Grid: Monthly Revenue & Profit Trends */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Sales Performance Trend Bar Chart */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={18} color="#2563eb" /> Monthly Sales Performance
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {timeframe}-Month Revenue Output (Click to view invoices)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(analytics?.monthlySalesTrend || []).map((st, idx) => {
              const pct = Math.round((st.sales / maxSales) * 100);
              return (
                <div
                  key={idx}
                  onClick={() => navigate(`/transactions/sales?monthYear=${encodeURIComponent(st.month)}`)}
                  title={`Click to open Sales Register for ${st.month}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#1e40af' }}>
                      {st.month} <ArrowUpRight size={12} color="#3b82f6" />
                    </span>
                    <span>{formatCurrency(st.sales)} ({st.invoices} Inv)</span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(pct, 4)}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Purchase Inward Trend Bar Chart */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingBag size={18} color="#16a34a" /> Monthly Purchase Inward
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
              {timeframe}-Month Stock Inward (Click to view bills)
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(analytics?.monthlyPurchaseTrend || []).map((pt, idx) => {
              const pct = Math.round((pt.purchases / maxPurchases) * 100);
              return (
                <div
                  key={idx}
                  onClick={() => navigate(`/transactions/purchases?monthYear=${encodeURIComponent(pt.month)}`)}
                  title={`Click to open Purchase Register for ${pt.month}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    padding: '6px 8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#15803d' }}>
                      {pt.month} <ArrowUpRight size={12} color="#16a34a" />
                    </span>
                    <span>{formatCurrency(pt.purchases)} ({pt.bills} Bills)</span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(pct, 4)}%`, height: '100%', background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)', borderRadius: '4px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Profitability & Inventory Aging Profile */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
        {/* Gross Profit & Margin % Table */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={18} color="#8b5cf6" /> Gross Profit & Margin Analytics
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Revenue vs Purchase Cost</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-secondary)' }}>
                <th style={{ padding: '8px' }}>MONTH</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>REVENUE</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>PURCHASES</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>GROSS PROFIT</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>MARGIN %</th>
              </tr>
            </thead>
            <tbody>
              {(analytics?.monthlyProfitTrend || []).map((pr, idx) => (
                <tr
                  key={idx}
                  onClick={() => navigate(`/transactions/sales?monthYear=${encodeURIComponent(pr.month)}`)}
                  title={`Click to open Sales for ${pr.month}`}
                  style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '10px 8px', fontWeight: 600, color: '#2563eb' }}>
                    {pr.month} <ArrowUpRight size={11} style={{ display: 'inline' }} />
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right' }}>{formatCurrency(pr.grossRevenue)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--color-text-secondary)' }}>{formatCurrency(pr.purchaseCost)}</td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: pr.grossProfit > 0 ? '#16a34a' : 'var(--color-text-primary)' }}>
                    {formatCurrency(pr.grossProfit)}
                  </td>
                  <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, color: '#8b5cf6' }}>
                    {pr.marginPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Stock Aging Telemetry */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#eab308" /> Stock Aging & Holding Telemetry
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>Vault Holding Duration</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(analytics?.stockAgingProfile || []).map((ag, idx) => {
              const pct = Math.round((ag.value / maxAgingValue) * 100);
              return (
                <div
                  key={idx}
                  onClick={() => navigate(`/inventory/stock?age=${encodeURIComponent(ag.range)}`)}
                  title={`Click to filter Diamond Inventory by ${ag.range} holding duration`}
                  style={{
                    background: '#f8fafc',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0f172a' }}>
                      {ag.range} <ChevronRight size={14} color="#64748b" />
                    </span>
                    <span style={{ color: '#0f172a' }}>{formatCurrency(ag.value)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    <span>{ag.count} Active Packets</span>
                    <span>{ag.carats} Carats</span>
                  </div>
                  <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(pct, 3)}%`, height: '100%', background: idx === 3 ? '#ef4444' : idx === 2 ? '#f59e0b' : '#3b82f6', borderRadius: '3px' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Quality Grade Distribution & Top Accounts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
        {/* Quality Wise Share */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PieChart size={16} color="#06b6d4" /> Quality Grade Revenue Share
            </h3>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Click to filter sales</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(analytics?.qualityWiseShare || []).length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px' }}>No sales quality logs found</div>
            ) : (
              (analytics?.qualityWiseShare || []).slice(0, 5).map((q, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/transactions/sales?quality=${encodeURIComponent(q.qualityName)}`)}
                  title={`Click to view sales invoices for quality ${q.qualityName}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdfa')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
                >
                  <div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{q.qualityName}</strong>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{q.carats} Carats</div>
                  </div>
                  <span style={{ fontWeight: 700, color: '#0891b2', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {formatCurrency(q.salesValue)} <ArrowUpRight size={12} />
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top 5 Customers */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} color="#2563eb" /> Top 5 Customer Clients
            </h3>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Click to view client sales</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(analytics?.topCustomers || []).length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px' }}>No customer sales logs found</div>
            ) : (
              (analytics?.topCustomers || []).map((c, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/transactions/sales?party=${encodeURIComponent(c.customerName)}`)}
                  title={`Click to view sales invoices for customer ${c.customerName}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#eff6ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
                >
                  <div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{c.customerName}</strong>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{c.invoiceCount} Invoices</div>
                  </div>
                  <span style={{ fontWeight: 700, color: '#2563eb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {formatCurrency(c.totalSpent)} <ArrowUpRight size={12} />
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top 5 Suppliers */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={16} color="#16a34a" /> Top 5 Diamond Suppliers
            </h3>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Click to view supplier purchases</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(analytics?.topSuppliers || []).length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px' }}>No supplier purchase logs found</div>
            ) : (
              (analytics?.topSuppliers || []).map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`/transactions/purchases?party=${encodeURIComponent(s.supplierName)}`)}
                  title={`Click to view purchase bills for supplier ${s.supplierName}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    background: '#f8fafc',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f0fdf4')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
                >
                  <div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{s.supplierName}</strong>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{s.billCount} Bills</div>
                  </div>
                  <span style={{ fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {formatCurrency(s.totalPurchased)} <ArrowUpRight size={12} />
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
