// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Shared Dashboard & Telemetry Types
// Phase 15.1: Dashboard Foundation & Real-Time KPI Cards
// ═══════════════════════════════════════════════════════════════

export interface IDashboardKpiSummary {
  header: {
    companyName: string;
    companyLogo?: string;
    userName: string;
    userRole: string;
    financialYearLabel: string;
    lastLoginAt?: string | Date;
  };
  receivables: {
    total: number;
    pendingCount: number;
    receivedToday: number;
    overdueAmount: number;
  };
  payables: {
    total: number;
    pendingCount: number;
    paidToday: number;
    overdueAmount: number;
  };
  stock: {
    totalCarats: number;
    totalPackets: number;
    availablePackets: number;
    heldPackets: number;
    certifiedCount: number;
    nonCertifiedCount: number;
    totalValuation: number;
  };
  todaySales: {
    totalValue: number;
    invoiceCount: number;
  };
  todayPurchases: {
    totalValue: number;
    billCount: number;
  };
  todayCash: {
    receipts: number;
    payments: number;
    netBalance: number;
  };
  todayBank: {
    receipts: number;
    payments: number;
    netBalance: number;
  };
  businessSummary: {
    customerCount: number;
    supplierCount: number;
    activeAccountCount: number;
    totalStockItems: number;
    activeSessionsCount: number;
  };
}
