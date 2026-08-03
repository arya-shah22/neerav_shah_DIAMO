import type { CurrencyCode } from '../../../shared/types/exchange-rate.types';

export type InvoiceType = 'SALE_INVOICE' | 'SALE_RETURN' | 'SALE_DEBIT_NOTE' | 'PURCHASE_INVOICE' | 'PURCHASE_RETURN' | 'PURCHASE_DEBIT_NOTE';
export type InvoiceStatus = 'DRAFT' | 'SAVED' | 'APPROVED' | 'CANCELLED' | 'DELETED';
export type PaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';

export interface IInvoiceItem {
  id?: number;
  qualityId: number;
  hsnNumber?: string;
  carats: number;
  pieces?: number;
  rate: number;
  rateAlt?: number;
  discountPct?: number;
  stockPacketId?: number;
  grossAmount?: number;
  gstPct?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  netAmount?: number;
  netAmountAlt?: number;
  quality?: {
    id: number;
    qualityName: string;
  };
}

export interface IInvoice {
  id: number;
  companyId: number;
  financialYearId: number;
  invoiceType: InvoiceType;
  voucherNumber: string;
  billNumber: string;
  invoiceDate: string;
  dueDate?: string;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  customerId: number;
  customerGstin?: string | null;
  customerStateCode?: string | null;
  supplierId?: number;
  supplierGstin?: string | null;
  supplierStateCode?: string | null;
  brokerId?: number | null;
  brokeragePct?: number;
  brokerageAmount?: number;
  totalCarats: number;
  totalPieces: number;
  totalGrossAmount: number;
  totalDiscount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  roundOff: number;
  netAmount: number;
  jamaAmount?: number;
  outstandingAmount?: number;
  // Currency fields
  transactionCurrency: CurrencyCode;
  exchangeRate: number;
  netAmountAlt: number;
  referenceInvoiceId?: number | null;
  referenceBillNumber?: string | null;
  narration?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    accountName: string;
  };
  supplier?: {
    id: number;
    accountName: string;
  };
  broker?: {
    id: number;
    accountName: string;
  } | null;
  items?: IInvoiceItem[];
}
