// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Business Analytics Dashboard View
// Phase 15.2: Executive Analytics, Charts & Management Insights
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, BarChart3, PieChart, Users, RefreshCw,
  Award, ShoppingCart, ShoppingBag, Clock
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
  const { activeCompany, companyId } = useActiveCompany();
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);

  const [analytics, setAnalytics] = useState<IBusinessAnalyticsData | null>(null);
  const { invoke: getAnalytics, loading } = useIpc<IBusinessAnalyticsData>('dashboard:get-analytics');

  const fetchAnalytics = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await getAnalytics({ companyId });
      if (res.success && res.data) {
        setAnalytics(res.data);
      }
    } catch (err) {
      console.error('Failed to load business analytics:', err);
    }
  }, [companyId, getAnalytics]);

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
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span>🏢 <strong>{activeCompany?.companyName || 'DIAMO ERP'}</strong></span>
              <span>📅 FY {activeFinancialYear ? formatFinancialYearLabel(activeFinancialYear) : '2026-27'}</span>
              <span>📊 Real-Time Financial & Stock Telemetry</span>
            </p>
          </div>
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
          Refresh Analytics
        </Button>
      </div>

      {/* 2. Top Visual Telemetry Grid: Monthly Revenue & Profit Trends */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Sales Performance Trend Bar Chart */}
        <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={18} color="#2563eb" /> Monthly Sales Performance
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>6-Month Revenue Output</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(analytics?.monthlySalesTrend || []).map((st, idx) => {
              const pct = Math.round((st.sales / maxSales) * 100);
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                    <span>{st.month}</span>
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
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>6-Month Stock Inward</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(analytics?.monthlyPurchaseTrend || []).map((pt, idx) => {
              const pct = Math.round((pt.purchases / maxPurchases) * 100);
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                    <span>{pt.month}</span>
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
                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 600 }}>{pr.month}</td>
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
                <div key={idx} style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>
                    <span>{ag.range}</span>
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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(analytics?.qualityWiseShare || []).length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px' }}>No sales quality logs found</div>
            ) : (
              (analytics?.qualityWiseShare || []).slice(0, 5).map((q, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', fontSize: '12px' }}>
                  <div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{q.qualityName}</strong>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{q.carats} Carats</div>
                  </div>
                  <span style={{ fontWeight: 700, color: '#0891b2' }}>{formatCurrency(q.salesValue)}</span>
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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(analytics?.topCustomers || []).length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px' }}>No customer sales logs found</div>
            ) : (
              (analytics?.topCustomers || []).map((c, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', fontSize: '12px' }}>
                  <div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{c.customerName}</strong>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{c.invoiceCount} Invoices</div>
                  </div>
                  <span style={{ fontWeight: 700, color: '#2563eb' }}>{formatCurrency(c.totalSpent)}</span>
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
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(analytics?.topSuppliers || []).length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center', padding: '20px' }}>No supplier purchase logs found</div>
            ) : (
              (analytics?.topSuppliers || []).map((s, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: '#f8fafc', borderRadius: '6px', fontSize: '12px' }}>
                  <div>
                    <strong style={{ color: 'var(--color-text-primary)' }}>{s.supplierName}</strong>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-secondary)' }}>{s.billCount} Bills</div>
                  </div>
                  <span style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(s.totalPurchased)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
