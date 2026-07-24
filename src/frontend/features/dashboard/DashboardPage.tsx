// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Home Screen Dashboard & Real-Time KPI Cards View
// Phase 15.1: Real-time telemetry dashboard foundation
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIpc } from '../../hooks/useIpc';
import { useActiveCompany } from '../../hooks/useActiveCompany';
import { useAuthStore } from '../../state/auth-store';
import { useCompanyStore, formatFinancialYearLabel } from '../../state/company-store';
import { Button } from '../../components/ui';
import { IDashboardKpiSummary } from '../../../shared/types/dashboard.types';
import { IUserWorkspaceData } from '../../../shared/types/workspace.types';
import { PAGE_REGISTRY, PAGE_CATEGORIES } from '../../config/page-registry';
import {
  ArrowUpRight, RefreshCw, 
  Wallet, DollarSign, Building, Gem, PackageCheck, 
  Users, UserCheck, ShieldCheck, ArrowRight,
  Sparkles, Activity, FileText, Zap, Plus, Settings, Check, X
} from 'lucide-react';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeCompany, companyId } = useActiveCompany();
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);
  const user = useAuthStore((s) => s.user);

  const [telemetry, setTelemetry] = useState<IDashboardKpiSummary | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [workspace, setWorkspace] = useState<IUserWorkspaceData | null>(null);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('Transactions');

  const { invoke: getTelemetry, loading } = useIpc<IDashboardKpiSummary>('dashboard:get-telemetry');
  const { invoke: getWorkspace } = useIpc<IUserWorkspaceData>('workspace:get');
  const { invoke: updateWorkspace } = useIpc<IUserWorkspaceData>('workspace:update');

  const fetchWorkspace = useCallback(async () => {
    if (!user?.id) return;
    const res = await getWorkspace({ userId: user.id });
    if (res.success && res.data) {
      setWorkspace(res.data);
    }
  }, [user?.id, getWorkspace]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live telemetry
  const fetchTelemetry = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await getTelemetry({
        companyId,
        financialYearId: activeFinancialYear?.id,
        userId: user?.id,
      });
      if (res.success && res.data) {
        setTelemetry(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard telemetry:', err);
    }
  }, [companyId, activeFinancialYear?.id, user?.id, getTelemetry]);

  // Initial load and 5-minute background auto-refresh
  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 300000); // 5 mins
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px', width: '100%' }}>
      
      {/* ─── 1. Header Banner Metadata Panel ───────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '16px',
        padding: '24px 28px',
        color: '#ffffff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}>
            <Sparkles size={28} color="#38bdf8" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>
                {getGreeting()}, {user?.fullName || 'Arya Shah'}
              </h1>
              <span style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38bdf8',
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 10px',
                borderRadius: '12px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}>
                {user?.isSuperAdmin ? 'Super Admin' : (user as any)?.designation || 'Chief Operator'}
              </span>
            </div>
            
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span>🏢 <strong>{activeCompany?.companyName || 'DIAMO ERP'}</strong></span>
              <span>📅 FY {activeFinancialYear ? formatFinancialYearLabel(activeFinancialYear) : '2026-27'}</span>
              <span>🕒 Last Login: {telemetry?.header.lastLoginAt ? new Date(telemetry.header.lastLoginAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}</span>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', color: '#f8fafc' }}>
              {currentTime.toLocaleTimeString()}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {currentTime.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={fetchTelemetry}
            loading={loading}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      {/* ─── 1.5. Personal Workspace & Quick Actions ───────────────────── */}
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '16px',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={18} color="var(--color-accent)" />
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
              My Quick Workspace & Entry Actions
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              Personalized for {user?.fullName || 'User'}
            </span>
            <button
              onClick={() => setShowCustomizeModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--color-accent)',
                cursor: 'pointer',
              }}
            >
              <Settings size={13} /> Customize Shortcuts
            </button>
          </div>
        </div>

        {/* Action Buttons Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {(workspace?.quickActions || [
            { id: 'new_sale', label: 'New Sale Invoice', path: '/transactions/sales/new', iconName: 'Plus', color: '#1e40af' },
            { id: 'new_purchase', label: 'New Purchase Bill', path: '/transactions/purchases/new', iconName: 'Plus', color: '#166534' },
            { id: 'cash_bank', label: 'Cash / Bank Voucher', path: '/vouchers/cash-bank', iconName: 'Wallet', color: '#6b21a8' },
            { id: 'add_stock', label: 'Add Stock Packet', path: '/inventory/stock/new', iconName: 'Gem', color: '#155e75' },
            { id: 'add_account', label: 'New Party Account', path: '/masters/accounting/accounts/new', iconName: 'Users', color: '#92400e' },
          ]).map((act, idx) => {
            const bgColors = ['#eff6ff', '#f0fdf4', '#f3e8ff', '#ecfeff', '#fffbeb', '#fef2f2'];
            const borderColors = ['#bfdbfe', '#bbf7d0', '#e9d5ff', '#a5f3fc', '#fde68a', '#fecaca'];
            const bg = bgColors[idx % bgColors.length];
            const border = borderColors[idx % borderColors.length];

            return (
              <button
                key={act.id || act.path}
                onClick={() => navigate(act.path)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: '10px',
                  cursor: 'pointer',
                  color: act.color || '#1e40af',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                <Plus size={16} /> {act.label.startsWith('+') ? act.label : `+ ${act.label}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Customize Workspace Modal ───────────────────────────────── */}
      {showCustomizeModal && workspace && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
          }}
        >
          <div
            style={{
              width: '640px',
              maxHeight: '85vh',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#f8fafc',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Zap size={18} color="var(--color-accent)" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)' }}>
                  Customize Quick Action Entry Buttons
                </h3>
              </div>
              <button
                onClick={() => setShowCustomizeModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                Select any pages across the ERP to add as direct ⚡ Quick Action Entry Buttons on your personal home workspace.
              </p>

              {/* Category Filter Tabs */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {PAGE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: selectedCategory === cat ? 'var(--color-accent)' : 'var(--color-border)',
                      background: selectedCategory === cat ? 'var(--color-accent)' : 'var(--color-bg)',
                      color: selectedCategory === cat ? '#ffffff' : 'var(--color-text-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Pages Selector Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {PAGE_REGISTRY.filter((p) => p.category === selectedCategory).map((page) => {
                  const isSelected = workspace.quickActions?.some((q) => q.path === page.uri);
                  return (
                    <button
                      key={page.uri}
                      onClick={async () => {
                        let currentActions = workspace.quickActions || [];
                        if (isSelected) {
                          currentActions = currentActions.filter((q) => q.path !== page.uri);
                        } else {
                          currentActions = [
                            ...currentActions,
                            { id: page.uri, label: page.label, path: page.uri, iconName: 'Plus', color: '#1e40af' },
                          ];
                        }
                        const res = await updateWorkspace({
                          userId: user!.id,
                          workspace: { quickActions: currentActions },
                        });
                        if (res.success && res.data) {
                          setWorkspace(res.data);
                        }
                      }}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'var(--color-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        + {page.label}
                      </span>
                      {isSelected ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-accent)', fontWeight: 700 }}>
                          <Check size={14} /> Added
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>+ Add Action</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--color-border)',
                background: '#f8fafc',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Button onClick={() => setShowCustomizeModal(false)} variant="primary" size="sm">
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. Financial KPI Telemetry Cards Grid ────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '16px',
      }}>
        
        {/* Card 1: Receivables */}
        <div
          onClick={() => navigate('/transactions/sales?filter=pending')}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderLeft: '4px solid #0284c7',
            borderRadius: '12px',
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Accounts Receivable
            </span>
            <div style={{ background: '#e0f2fe', padding: '6px', borderRadius: '8px', color: '#0284c7' }}>
              <ArrowUpRight size={16} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Total Receivable: <span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{formatCurrency(telemetry?.receivables.total || 0)}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
              {formatCurrency(telemetry?.receivables.pending || 0)} <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>(Pending)</span>
            </div>
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
              Done Received: {formatCurrency(telemetry?.receivables.doneReceived || 0)}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px solid var(--color-border)', paddingTop: '8px', color: 'var(--color-text-secondary)' }}>
            <span>{telemetry?.receivables.pendingCount || 0} Open Invoices</span>
            <span style={{ color: telemetry?.receivables.overdueAmount ? '#dc2626' : 'inherit' }}>
              Overdue: <strong>{formatCurrency(telemetry?.receivables.overdueAmount || 0)}</strong>
            </span>
          </div>
        </div>

        {/* Card 2: Payables */}
        <div
          onClick={() => navigate('/transactions/purchases?filter=pending')}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderLeft: '4px solid #d97706',
            borderRadius: '12px',
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Accounts Payable
            </span>
            <div style={{ background: '#fef3c7', padding: '6px', borderRadius: '8px', color: '#d97706' }}>
              <Wallet size={16} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>
              Total Payable: <span style={{ color: 'var(--color-text-primary)', fontWeight: 700 }}>{formatCurrency(telemetry?.payables.total || 0)}</span>
            </div>
            <div style={{ fontSize: '22px', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
              {formatCurrency(telemetry?.payables.pending || 0)} <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>(Pending)</span>
            </div>
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
              Done Paid: {formatCurrency(telemetry?.payables.donePaid || 0)}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px solid var(--color-border)', paddingTop: '8px', color: 'var(--color-text-secondary)' }}>
            <span>{telemetry?.payables.pendingCount || 0} Purchase Bills Due</span>
            <span style={{ color: telemetry?.payables.overdueAmount ? '#dc2626' : 'inherit' }}>
              Overdue: <strong>{formatCurrency(telemetry?.payables.overdueAmount || 0)}</strong>
            </span>
          </div>
        </div>

        {/* Card 3: Stock */}
        <div
          onClick={() => navigate('/inventory/stock')}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderLeft: '4px solid #16a34a',
            borderRadius: '12px',
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Current Diamond Stock
            </span>
            <div style={{ background: '#dcfce7', padding: '6px', borderRadius: '8px', color: '#16a34a' }}>
              <Gem size={16} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {telemetry?.stock.totalCarats || 0} <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>cts</span>
            </div>
            <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
              {telemetry?.stock.availablePackets || 0} / {telemetry?.stock.totalPackets || 0} Available Packets
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px solid var(--color-border)', paddingTop: '8px', color: 'var(--color-text-secondary)' }}>
            <span>Certified: <strong>{telemetry?.stock.certifiedCount || 0}</strong></span>
            <span>Valuation: <strong>{formatCurrency(telemetry?.stock.totalValuation || 0)}</strong></span>
          </div>
        </div>

        {/* Card 4: Today's Sales */}
        <div
          onClick={() => navigate('/transactions/sales')}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderLeft: '4px solid #8b5cf6',
            borderRadius: '12px',
            padding: '18px 20px',
            cursor: 'pointer',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0, 0, 0, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Today's Sales Revenue
            </span>
            <div style={{ background: '#f3e8ff', padding: '6px', borderRadius: '8px', color: '#8b5cf6' }}>
              <DollarSign size={16} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)' }}>
              {formatCurrency(telemetry?.todaySales.totalValue || 0)}
            </div>
            <div style={{ fontSize: '11px', color: '#8b5cf6', fontWeight: 600, marginTop: '2px' }}>
              {telemetry?.todaySales.invoiceCount || 0} Sales Invoices Generated Today
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px solid var(--color-border)', paddingTop: '8px', color: 'var(--color-text-secondary)' }}>
            <span>Status: <strong>Active Real-Time</strong></span>
            <span style={{ color: '#8b5cf6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
              View Register <ArrowRight size={10} />
            </span>
          </div>
        </div>

      </div>

      {/* ─── 3. Cash & Bank Treasury Telemetry Grid ───────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        
        {/* Cash Book Telemetry */}
        <div
          onClick={() => navigate('/vouchers/cash-bank')}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '20px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={18} color="#2563eb" /> Cash Book Telemetry Today
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Click to open Cash Book &rarr;</span>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
            <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#16a34a', fontWeight: 600 }}>RECEIPTS TODAY</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#15803d', marginTop: '4px' }}>
                {formatCurrency(telemetry?.todayCash.receipts || 0)}
              </div>
            </div>

            <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>PAYMENTS TODAY</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#b91c1c', marginTop: '4px' }}>
                {formatCurrency(telemetry?.todayCash.payments || 0)}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>NET CASH FLOW</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: (telemetry?.todayCash.netBalance || 0) >= 0 ? '#16a34a' : '#dc2626', marginTop: '4px' }}>
                {formatCurrency(telemetry?.todayCash.netBalance || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Bank Book Telemetry */}
        <div
          onClick={() => navigate('/vouchers/cash-bank')}
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '20px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building size={18} color="#0d9488" /> Bank Treasury Telemetry Today
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Click to open Bank Book &rarr;</span>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', textAlign: 'center' }}>
            <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#0d9488', fontWeight: 600 }}>BANK RECEIPTS</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f766e', marginTop: '4px' }}>
                {formatCurrency(telemetry?.todayBank.receipts || 0)}
              </div>
            </div>

            <div style={{ background: '#fef2f2', padding: '10px', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>BANK PAYMENTS</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#b91c1c', marginTop: '4px' }}>
                {formatCurrency(telemetry?.todayBank.payments || 0)}
              </div>
            </div>

            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>NET BANK FLOW</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: (telemetry?.todayBank.netBalance || 0) >= 0 ? '#0d9488' : '#dc2626', marginTop: '4px' }}>
                {formatCurrency(telemetry?.todayBank.netBalance || 0)}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ─── 4. Quick Business Summary Telemetry Panel ──────────────── */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} /> Enterprise Master Telemetry Overview
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', background: 'var(--color-background)', padding: '4px 10px', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
            System Polling: Every 5 Mins
          </span>
        </div>
        <hr style={{ border: 0, borderTop: '1px solid var(--color-border)', margin: 0 }} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--color-background)', borderRadius: '8px' }}>
            <div style={{ background: '#e0f2fe', padding: '10px', borderRadius: '8px', color: '#0284c7' }}>
              <Users size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>CUSTOMERS</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {telemetry?.businessSummary.customerCount || 0}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--color-background)', borderRadius: '8px' }}>
            <div style={{ background: '#fef3c7', padding: '10px', borderRadius: '8px', color: '#d97706' }}>
              <UserCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>SUPPLIERS</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {telemetry?.businessSummary.supplierCount || 0}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--color-background)', borderRadius: '8px' }}>
            <div style={{ background: '#f0fdf4', padding: '10px', borderRadius: '8px', color: '#16a34a' }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>ACCOUNTS</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {telemetry?.businessSummary.activeAccountCount || 0}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--color-background)', borderRadius: '8px' }}>
            <div style={{ background: '#dcfce7', padding: '10px', borderRadius: '8px', color: '#15803d' }}>
              <PackageCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>STOCK ITEMS</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {telemetry?.businessSummary.totalStockItems || 0}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--color-background)', borderRadius: '8px' }}>
            <div style={{ background: '#f3e8ff', padding: '10px', borderRadius: '8px', color: '#8b5cf6' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>ACTIVE SESSIONS</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {telemetry?.businessSummary.activeSessionsCount || 1}
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
