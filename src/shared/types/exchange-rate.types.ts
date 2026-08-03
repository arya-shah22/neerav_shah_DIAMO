// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Exchange Rate Types (Multi-Currency Support)
// ═══════════════════════════════════════════════════════════════

export type CurrencyCode = 'USD' | 'INR';

export interface IExchangeRateLog {
  id: number;
  companyId: number;
  rateDate: string;
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  exchangeRate: number;
  source: string;
  sourceVoucherType?: string;
  sourceVoucherId?: number;
  remarks?: string;
  createdBy?: number;
  createdAt: string;
}

export interface IExchangeRateInput {
  companyId: number;
  rateDate: string;
  exchangeRate: number;
  fromCurrency?: CurrencyCode;
  toCurrency?: CurrencyCode;
  source?: string;
  sourceVoucherType?: string;
  sourceVoucherId?: number;
  remarks?: string;
}
