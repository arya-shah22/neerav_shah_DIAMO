// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Financial Year Types
// ═══════════════════════════════════════════════════════════════

export interface IFinancialYear {
  id: number;
  companyId: number;
  fromDate: string;
  toDate: string;
  isActive: boolean;
  isClosed: boolean;
  lockTransactionUptoDate?: string | null;
  gstActive: boolean;
  tcsActive: boolean;
  accountEffect: boolean;
}

export interface IFinancialYearFormData {
  fromDate: string;
  toDate: string;
  isActive: boolean;
  gstActive: boolean;
  tcsActive: boolean;
  accountEffect: boolean;
  lockTransactionUptoDate?: string;
}
