// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Root Application Component
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ErrorBoundary } from './components/feedback/ErrorBoundary';
import { LoadingOverlay } from './components/feedback/LoadingOverlay';
import { ToastProvider } from './components/ui/Toast';
import { LoginPage } from './features/auth';
import { CompanyListPage, CompanyFormPage } from './features/company';
import { FinancialYearPage } from './features/financial-year';
import { AccountGroupPage } from './features/account-group';
import { AccountListPage, AccountFormPage } from './features/account';
import { BrokerListPage, BrokerFormPage } from './features/broker';
import { QualityListPage, QualityFormPage } from './features/quality';
import { StockListPage, StockFormPage, StockDetailPage } from './features/stock';
import { InvoiceListPage, InvoiceFormPage, InvoiceViewPage } from './features/invoice';
import { ChallanListPage, ChallanFormPage } from './features/challan';
import { JobListPage, JobFormPage } from './features/job';
import { JVBookPage } from './features/journal';
import { CashBankPage } from './features/cashbook';
import { LoanPage } from './features/loan/LoanPage';
import { LedgerBookPage } from './features/reports/LedgerBookPage';
import { TrialBalancePage } from './features/reports/TrialBalancePage';
import { ProfitLossPage } from './features/reports/ProfitLossPage';
import { BalanceSheetPage } from './features/reports/BalanceSheetPage';
import { OutstandingReportPage } from './features/reports/OutstandingReportPage';
import { StockReportPage } from './features/reports/StockReportPage';
import { GstDashboardPage } from './features/reports/GstDashboardPage';
import { Gstr1ReportPage } from './features/reports/Gstr1ReportPage';
import { useAuthStore } from './state/auth-store';
import { useCompanyStore, formatFinancialYearLabel } from './state/company-store';
import { Building2, Calendar, CheckCircle2, FolderTree, Users, Handshake, Gem, Package } from 'lucide-react';

// ─── Route Guards ─────────────────────────────────────────────
const ProtectedRoutes = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  if (!hasHydrated) {
    return <LoadingOverlay visible message="Loading..." />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const GuestRoutes = () => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  if (!hasHydrated) {
    return <LoadingOverlay visible message="Loading..." />;
  }

  return !isAuthenticated ? <Outlet /> : <Navigate to="/dashboard" replace />;
};

// ─── Dashboard ────────────────────────────────────────────────
const DashboardPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const activeCompany = useCompanyStore((s) => s.activeCompany);
  const activeFinancialYear = useCompanyStore((s) => s.activeFinancialYear);

  const setupItems = [
  {
    label: 'Authentication',
    done: true,
    detail: `Logged in as ${user?.fullName || '—'}`,
  },
  {
    label: 'Company Master',
    done: !!activeCompany,
    detail: activeCompany ? activeCompany.companyName : 'Create a company to continue',
  },
  {
    label: 'Financial Year',
    done: !!activeFinancialYear,
    detail: activeFinancialYear
      ? `FY ${formatFinancialYearLabel(activeFinancialYear)}`
      : 'Configure a financial year for the active company',
  },
  {
    label: 'Quality Master',
    done: true,
    detail: 'Diamond qualities configured',
  },
  {
    label: 'Inventory',
    done: false,
    detail: 'Register stock packets under Inventory',
  },
];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-title)', fontWeight: 700, color: 'var(--color-primary)' }}>
          Welcome to DIAMO ERP
        </h1>
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-sm)' }}>
          Stage 3 — Inventory module is ready. Register stock packets and track lifecycle.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--spacing-md)',
      }}>
        {setupItems.map((item) => (
          <div
            key={item.label}
            style={{
              padding: 'var(--spacing-lg)',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              {item.done ? (
                <CheckCircle2 size={18} color="var(--color-success)" />
              ) : (
                <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--color-border)' }} />
              )}
              <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.label}</span>
            </div>
            <p style={{ fontSize: 'var(--text-label)', color: 'var(--color-text-secondary)' }}>
              {item.detail}
            </p>
          </div>
        ))}
      </div>

      <div style={{
        padding: 'var(--spacing-lg)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <h2 style={{ fontSize: 'var(--text-heading)', fontWeight: 600, marginBottom: 'var(--spacing-md)' }}>
          Quick Setup
        </h2>
        <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
          <Link
            to="/masters/business/companies"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'var(--color-accent-light)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-accent)',
              fontWeight: 600,
              fontSize: 'var(--text-label)',
              textDecoration: 'none',
            }}
          >
            <Building2 size={16} /> Manage Companies
          </Link>
          <Link
            to="/masters/business/financial-years"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'var(--color-accent-light)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-accent)',
              fontWeight: 600,
              fontSize: 'var(--text-label)',
              textDecoration: 'none',
            }}
          >
            <Calendar size={16} /> Financial Years
          </Link>
          <Link
            to="/masters/accounting/account-groups"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'var(--color-accent-light)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-accent)',
              fontWeight: 600,
              fontSize: 'var(--text-label)',
              textDecoration: 'none',
            }}
          >
            <FolderTree size={16} /> Account Groups
          </Link>
          <Link
            to="/masters/accounting/accounts"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'var(--color-accent-light)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-accent)',
              fontWeight: 600,
              fontSize: 'var(--text-label)',
              textDecoration: 'none',
            }}
          >
            <Users size={16} /> Accounts
          </Link>
          <Link
            to="/masters/business/brokers"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'var(--color-accent-light)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-accent)',
              fontWeight: 600,
              fontSize: 'var(--text-label)',
              textDecoration: 'none',
            }}
          >
            <Handshake size={16} /> Brokers
          </Link>
          <Link
            to="/masters/diamond/qualities"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'var(--color-accent-light)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-accent)',
              fontWeight: 600,
              fontSize: 'var(--text-label)',
              textDecoration: 'none',
            }}
          >
            <Gem size={16} /> Qualities
          </Link>
          <Link
            to="/inventory/stock"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 16px',
              background: 'var(--color-accent-light)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-accent)',
              fontWeight: 600,
              fontSize: 'var(--text-label)',
              textDecoration: 'none',
            }}
          >
            <Package size={16} /> Inventory
          </Link>
        </div>
      </div>
    </div>
  );
};

// ─── App Root ────────────────────────────────────────────────

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<GuestRoutes />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>

            <Route element={<ProtectedRoutes />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />

                {/* Stage 1: Company Master */}
                <Route path="/masters/business/companies" element={<CompanyListPage />} />
                <Route path="/masters/business/companies/new" element={<CompanyFormPage />} />
                <Route path="/masters/business/companies/edit/:id" element={<CompanyFormPage />} />

                {/* Legacy redirects */}
                <Route path="/companies" element={<Navigate to="/masters/business/companies" replace />} />
                <Route path="/companies/new" element={<Navigate to="/masters/business/companies/new" replace />} />
                <Route path="/companies/edit/:id" element={<Navigate to="/masters/business/companies/edit/:id" replace />} />

                {/* Stage 1: Financial Year Master */}
                <Route path="/masters/business/financial-years" element={<FinancialYearPage />} />

                {/* Stage 2: Account Group Master */}
                <Route path="/masters/accounting/account-groups" element={<AccountGroupPage />} />

                {/* Stage 2: Account Master */}
                <Route path="/masters/accounting/accounts" element={<AccountListPage />} />
                <Route path="/masters/accounting/accounts/new" element={<AccountFormPage />} />
                <Route path="/masters/accounting/accounts/edit/:id" element={<AccountFormPage />} />

                {/* Stage 2: Broker Master */}
                <Route path="/masters/business/brokers" element={<BrokerListPage />} />
                <Route path="/masters/business/brokers/new" element={<BrokerFormPage />} />
                <Route path="/masters/business/brokers/edit/:id" element={<BrokerFormPage />} />

                {/* Stage 2: Quality Master */}
                <Route path="/masters/diamond/qualities" element={<QualityListPage />} />
                <Route path="/masters/diamond/qualities/new" element={<QualityFormPage />} />
                <Route path="/masters/diamond/qualities/edit/:id" element={<QualityFormPage />} />

                {/* Stage 3: Inventory / Stock */}
                <Route path="/inventory/stock" element={<StockListPage />} />
                <Route path="/inventory/stock/new" element={<StockFormPage />} />
                <Route path="/inventory/stock/edit/:id" element={<StockFormPage />} />
                <Route path="/inventory/stock/:id" element={<StockDetailPage />} />

                {/* Stage 4: Invoices (Sale & Purchase Books) */}
                <Route path="/transactions/sales" element={<InvoiceListPage type="SALE_INVOICE" />} />
                <Route path="/transactions/sales/new" element={<InvoiceFormPage type="SALE_INVOICE" />} />
                <Route path="/transactions/sales/:id" element={<InvoiceViewPage type="SALE_INVOICE" />} />
                <Route path="/transactions/sales/:id/edit" element={<InvoiceFormPage type="SALE_INVOICE" />} />

                <Route path="/transactions/sale-returns" element={<InvoiceListPage type="SALE_RETURN" />} />
                <Route path="/transactions/sale-returns/new" element={<InvoiceFormPage type="SALE_RETURN" />} />
                <Route path="/transactions/sale-returns/:id" element={<InvoiceViewPage type="SALE_RETURN" />} />
                <Route path="/transactions/sale-returns/:id/edit" element={<InvoiceFormPage type="SALE_RETURN" />} />

                <Route path="/transactions/sale-debit-notes" element={<InvoiceListPage type="SALE_DEBIT_NOTE" />} />
                <Route path="/transactions/sale-debit-notes/new" element={<InvoiceFormPage type="SALE_DEBIT_NOTE" />} />
                <Route path="/transactions/sale-debit-notes/:id" element={<InvoiceViewPage type="SALE_DEBIT_NOTE" />} />
                <Route path="/transactions/sale-debit-notes/:id/edit" element={<InvoiceFormPage type="SALE_DEBIT_NOTE" />} />

                <Route path="/transactions/purchases" element={<InvoiceListPage type="PURCHASE_INVOICE" />} />
                <Route path="/transactions/purchases/new" element={<InvoiceFormPage type="PURCHASE_INVOICE" />} />
                <Route path="/transactions/purchases/:id" element={<InvoiceViewPage type="PURCHASE_INVOICE" />} />
                <Route path="/transactions/purchases/:id/edit" element={<InvoiceFormPage type="PURCHASE_INVOICE" />} />

                <Route path="/transactions/purchase-returns" element={<InvoiceListPage type="PURCHASE_RETURN" />} />
                <Route path="/transactions/purchase-returns/new" element={<InvoiceFormPage type="PURCHASE_RETURN" />} />
                <Route path="/transactions/purchase-returns/:id" element={<InvoiceViewPage type="PURCHASE_RETURN" />} />
                <Route path="/transactions/purchase-returns/:id/edit" element={<InvoiceFormPage type="PURCHASE_RETURN" />} />

                <Route path="/transactions/purchase-credit-notes" element={<InvoiceListPage type="PURCHASE_DEBIT_NOTE" />} />
                <Route path="/transactions/purchase-credit-notes/new" element={<InvoiceFormPage type="PURCHASE_DEBIT_NOTE" />} />
                <Route path="/transactions/purchase-credit-notes/:id" element={<InvoiceViewPage type="PURCHASE_DEBIT_NOTE" />} />
                <Route path="/transactions/purchase-credit-notes/:id/edit" element={<InvoiceFormPage type="PURCHASE_DEBIT_NOTE" />} />

                {/* Stage 6: Challan and Order Books */}
                <Route path="/transactions/challans/trading" element={<ChallanListPage purpose="TRADING_JHANGHAD" />} />
                <Route path="/transactions/challans/trading/new" element={<ChallanFormPage purpose="TRADING_JHANGHAD" />} />
                <Route path="/transactions/challans/trading/:id" element={<ChallanFormPage purpose="TRADING_JHANGHAD" viewMode />} />
                <Route path="/transactions/challans/trading/:id/edit" element={<ChallanFormPage purpose="TRADING_JHANGHAD" />} />

                <Route path="/transactions/challans/job-work" element={<ChallanListPage purpose="JOB_WORK" />} />
                <Route path="/transactions/challans/job-work/new" element={<ChallanFormPage purpose="JOB_WORK" />} />
                <Route path="/transactions/challans/job-work/:id" element={<ChallanFormPage purpose="JOB_WORK" viewMode />} />
                <Route path="/transactions/challans/job-work/:id/edit" element={<ChallanFormPage purpose="JOB_WORK" />} />

                <Route path="/transactions/orders/sales" element={<ChallanListPage purpose="SALE_ORDER" />} />
                <Route path="/transactions/orders/sales/new" element={<ChallanFormPage purpose="SALE_ORDER" />} />
                <Route path="/transactions/orders/sales/:id" element={<ChallanFormPage purpose="SALE_ORDER" viewMode />} />
                <Route path="/transactions/orders/sales/:id/edit" element={<ChallanFormPage purpose="SALE_ORDER" />} />

                <Route path="/transactions/orders/purchases" element={<ChallanListPage purpose="PURCHASE_ORDER" />} />
                <Route path="/transactions/orders/purchases/new" element={<ChallanFormPage purpose="PURCHASE_ORDER" />} />
                <Route path="/transactions/orders/purchases/:id" element={<ChallanFormPage purpose="PURCHASE_ORDER" viewMode />} />
                <Route path="/transactions/orders/purchases/:id/edit" element={<ChallanFormPage purpose="PURCHASE_ORDER" />} />

                {/* Stage 8: Job Book (Income & Expenses) */}
                <Route path="/transactions/jobs/income" element={<JobListPage jobType="JOB_INCOME" />} />
                <Route path="/transactions/jobs/income/new" element={<JobFormPage jobType="JOB_INCOME" />} />
                <Route path="/transactions/jobs/income/view/:id" element={<JobFormPage jobType="JOB_INCOME" viewMode />} />

                <Route path="/transactions/jobs/expense" element={<JobListPage jobType="JOB_EXPENSE" />} />
                <Route path="/transactions/jobs/expense/new" element={<JobFormPage jobType="JOB_EXPENSE" />} />
                <Route path="/transactions/jobs/expense/view/:id" element={<JobFormPage jobType="JOB_EXPENSE" viewMode />} />

                {/* Phase 8: Accounting (JV Book) */}
                <Route path="/vouchers/journal" element={<JVBookPage />} />

                {/* Phase 9: Cash & Bank Book */}
                <Route path="/vouchers/cash-bank" element={<CashBankPage />} />

                {/* Loan Book */}
                <Route path="/vouchers/loan" element={<LoanPage />} />

                {/* Phase 11: Enterprise Financial Reports */}
                <Route path="/reports/ledger" element={<LedgerBookPage />} />
                <Route path="/reports/trial-balance" element={<TrialBalancePage />} />
                <Route path="/reports/profit-loss" element={<ProfitLossPage />} />
                <Route path="/reports/balance-sheet" element={<BalanceSheetPage />} />
                <Route path="/reports/outstanding" element={<OutstandingReportPage />} />
                <Route path="/reports/stock" element={<StockReportPage />} />
                <Route path="/reports/gst" element={<GstDashboardPage />} />
                <Route path="/reports/gstr1" element={<Gstr1ReportPage />} />

                {/* Legacy redirects */}
                <Route path="/masters/accounts" element={<Navigate to="/masters/accounting/accounts" replace />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
