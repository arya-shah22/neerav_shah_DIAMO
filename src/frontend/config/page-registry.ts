// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Centralized Page Registry for Access Control
// ═══════════════════════════════════════════════════════════════

export interface PageEntry {
  uri: string;
  label: string;
  category: string;
}

export const PAGE_REGISTRY: PageEntry[] = [
  // Dashboard
  { uri: '/dashboard', label: 'Overview', category: 'Dashboard' },
  { uri: '/dashboard/analytics', label: 'Business Analytics', category: 'Dashboard' },

  // Masters
  { uri: '/masters/business/companies', label: 'Companies', category: 'Account & Masters' },
  { uri: '/masters/business/financial-years', label: 'Financial Years', category: 'Account & Masters' },
  { uri: '/masters/accounting/account-groups', label: 'Account Groups', category: 'Account & Masters' },
  { uri: '/masters/accounting/accounts', label: 'Accounts', category: 'Account & Masters' },
  { uri: '/masters/business/brokers', label: 'Brokers', category: 'Account & Masters' },
  { uri: '/masters/diamond/qualities', label: 'Qualities', category: 'Account & Masters' },

  // Transactions
  { uri: '/inventory/stock', label: 'Stock Inventory', category: 'Transactions' },
  { uri: '/transactions/sales', label: 'Sale Invoice', category: 'Transactions' },
  { uri: '/transactions/sale-returns', label: 'Sale Return / CN', category: 'Transactions' },
  { uri: '/transactions/sale-debit-notes', label: 'Sale Debit Note', category: 'Transactions' },
  { uri: '/transactions/purchases', label: 'Purchase Invoice', category: 'Transactions' },
  { uri: '/transactions/purchase-returns', label: 'Purchase Return / DN', category: 'Transactions' },
  { uri: '/transactions/purchase-credit-notes', label: 'Purchase Credit Note', category: 'Transactions' },
  { uri: '/transactions/challans/trading', label: 'Jhanghad (Trading)', category: 'Transactions' },
  { uri: '/transactions/challans/job-work', label: 'Job Work Issue', category: 'Transactions' },
  { uri: '/transactions/orders/sales', label: 'Sales Order', category: 'Transactions' },
  { uri: '/transactions/orders/purchases', label: 'Purchase Order', category: 'Transactions' },
  { uri: '/transactions/jobs/income', label: 'Job Income', category: 'Transactions' },
  { uri: '/transactions/jobs/expense', label: 'Job Expense', category: 'Transactions' },

  // Vouchers
  { uri: '/vouchers/journal', label: 'Journal Voucher', category: 'Vouchers' },
  { uri: '/vouchers/cash-bank', label: 'Cash & Bank Book', category: 'Vouchers' },
  { uri: '/vouchers/loan', label: 'Loan Book', category: 'Vouchers' },

  // Reports
  { uri: '/reports/ledger', label: 'General Ledger', category: 'Reports' },
  { uri: '/reports/trial-balance', label: 'Trial Balance', category: 'Reports' },
  { uri: '/reports/profit-loss', label: 'Profit & Loss', category: 'Reports' },
  { uri: '/reports/balance-sheet', label: 'Balance Sheet', category: 'Reports' },
  { uri: '/reports/cash-flow', label: 'Cash Flow', category: 'Reports' },
  { uri: '/reports/fund-flow', label: 'Fund Flow', category: 'Reports' },
  { uri: '/reports/outstanding', label: 'Outstanding Statements', category: 'Reports' },
  { uri: '/reports/stock', label: 'Stock Report', category: 'Reports' },
  { uri: '/reports/gst', label: 'GST Dashboard', category: 'Reports' },
  { uri: '/reports/gstr1', label: 'GSTR-1 Report', category: 'Reports' },
  { uri: '/reports/gstr2', label: 'GSTR-2 & ITC Rec', category: 'Reports' },
  { uri: '/reports/gstr3b', label: 'GSTR-3B Summary', category: 'Reports' },
  { uri: '/reports/gst-analytics', label: 'GST Analytics', category: 'Reports' },
  { uri: '/reports/tds-tcs', label: 'TDS & TCS', category: 'Reports' },
  { uri: '/reports/mis', label: 'MIS & Analytics', category: 'Reports' },
  { uri: '/reports/intelligence', label: 'Report Intelligence', category: 'Reports' },
  { uri: '/reports/day-book', label: 'Day Book', category: 'Reports' },

  // System
  { uri: '/settings', label: 'Settings', category: 'System & Settings' },
  { uri: '/admin', label: 'Admin Access', category: 'System & Settings' },
];

// Utility: get unique categories in order
export const PAGE_CATEGORIES = [...new Set(PAGE_REGISTRY.map((p) => p.category))];

// Utility: get pages by category
export const getPagesByCategory = (category: string) =>
  PAGE_REGISTRY.filter((p) => p.category === category);
