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
    pending: number;
    pendingCount: number;
    doneReceived: number;
    receivedToday: number;
    overdueAmount: number;
  };
  payables: {
    total: number;
    pending: number;
    pendingCount: number;
    donePaid: number;
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
    usdBalance?: number;
  };
  todayBank: {
    receipts: number;
    payments: number;
    netBalance: number;
    usdBalance?: number;
  };
  businessSummary: {
    customerCount: number;
    supplierCount: number;
    activeAccountCount: number;
    totalStockItems: number;
    activeSessionsCount: number;
  };
}

export interface IBusinessAnalyticsData {
  monthlySalesTrend: { month: string; sales: number; invoices: number }[];
  monthlyPurchaseTrend: { month: string; purchases: number; bills: number }[];
  monthlyProfitTrend: { month: string; grossRevenue: number; purchaseCost: number; grossProfit: number; marginPct: number }[];
  stockAgingProfile: { range: string; carats: number; count: number; value: number }[];
  qualityWiseShare: { qualityName: string; carats: number; salesValue: number }[];
  topCustomers: { customerName: string; totalSpent: number; invoiceCount: number }[];
  topSuppliers: { supplierName: string; totalPurchased: number; billCount: number }[];
}
