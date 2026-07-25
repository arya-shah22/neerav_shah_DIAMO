// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Root Application Component
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
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
import { StockConversionListPage } from './features/stock/StockConversionListPage';
import { StockConversionFormPage } from './features/stock/StockConversionFormPage';
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
import { Gstr2ReconciliationPage } from './features/reports/Gstr2ReconciliationPage';
import { Gstr3bReportPage } from './features/reports/Gstr3bReportPage';
import { GstAnalyticsPage } from './features/reports/GstAnalyticsPage';
import { DayBookPage } from './features/reports/DayBookPage';
import { TdsTcsDashboardPage } from './features/reports/TdsTcsDashboardPage';
import { MisDashboardPage } from './features/reports/MisDashboardPage';
import { CashFlowPage } from './features/reports/CashFlowPage';
import { FundFlowPage } from './features/reports/FundFlowPage';
import { ReportIntelligencePage } from './features/reports/ReportIntelligencePage';
import { SettingsPage } from './features/settings';
import { AdminConsolePage } from './features/admin/AdminConsolePage';
import { AccessDeniedPage } from './components/feedback/AccessDeniedPage';
import { useAuthStore } from './state/auth-store';
import { usePagePermissions } from './hooks/usePagePermissions';

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

// ─── Permission Guard ─────────────────────────────────────────
// Route-level guard that checks page access and shows Access Denied
const PermissionGuardOutlet: React.FC = () => {
  const canAccess = usePagePermissions((s) => s.canAccess);
  const { pathname } = useLocation();

  // Extract base page path from current URL (remove /new, /edit/:id, /:id suffixes)
  const basePath = pathname
    .replace(/\/(new|edit)(\/\d+)?$/, '')
    .replace(/\/\d+(\/edit)?$/, '')
    .replace(/\/view\/\d+$/, '');

  if (!canAccess(basePath)) {
    return <AccessDeniedPage />;
  }

  return <Outlet />;
};

import { DashboardPage } from './features/dashboard/DashboardPage';
import { AnalyticsDashboardPage } from './features/dashboard/AnalyticsDashboardPage';

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
               <Route element={<PermissionGuardOutlet />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/dashboard/analytics" element={<AnalyticsDashboardPage />} />

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
                <Route path="/inventory/stock-conversion" element={<StockConversionListPage />} />
                <Route path="/inventory/stock-conversion/new" element={<StockConversionFormPage />} />
                <Route path="/inventory/stock-conversion/:id" element={<StockConversionFormPage viewMode />} />

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
                <Route path="/reports/cash-flow" element={<CashFlowPage />} />
                <Route path="/reports/fund-flow" element={<FundFlowPage />} />
                <Route path="/reports/outstanding" element={<OutstandingReportPage />} />
                <Route path="/reports/stock" element={<StockReportPage />} />
                <Route path="/reports/gst" element={<GstDashboardPage />} />
                <Route path="/reports/gstr1" element={<Gstr1ReportPage />} />
                <Route path="/reports/gstr2" element={<Gstr2ReconciliationPage />} />
                <Route path="/reports/gstr3b" element={<Gstr3bReportPage />} />
                <Route path="/reports/gst-analytics" element={<GstAnalyticsPage />} />
                <Route path="/reports/tds-tcs" element={<TdsTcsDashboardPage />} />
                <Route path="/reports/mis" element={<MisDashboardPage />} />
                <Route path="/reports/intelligence" element={<ReportIntelligencePage />} />
                <Route path="/reports/day-book" element={<DayBookPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/admin" element={<AdminConsolePage />} />

                {/* Legacy redirects */}
                <Route path="/masters/accounts" element={<Navigate to="/masters/accounting/accounts" replace />} />
               </Route>
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
