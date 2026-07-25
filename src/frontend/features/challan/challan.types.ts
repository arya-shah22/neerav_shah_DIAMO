// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Challan Types (Stage 6)
// ═══════════════════════════════════════════════════════════════

export type ChallanPurpose =
  | 'TRADING_JHANGHAD'
  | 'JOB_WORK'
  | 'INTERNAL_TRANSFER'
  | 'CERTIFICATION'
  | 'SALE_ORDER'
  | 'PURCHASE_ORDER';

export type ChallanStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'DISPATCHED'
  | 'RECEIVED'
  | 'RETURNED'
  | 'PARTIALLY_RETURNED'
  | 'CONVERTED'
  | 'CLOSED'
  | 'CANCELLED';

export interface IChallanItem {
  id?: number;
  challanVoucherId?: number;
  rowNumber: number;
  qualityId: number;
  carats: number;
  pieces: number;
  rate: number;
  amount: number;
  returnedCarats?: number;
  returnedPieces?: number;
  stockPacketId?: number | null;
  remarks?: string | null;
  quality?: {
    id: number;
    qualityName: string;
  };
}

export interface IChallan {
  id: number;
  companyId: number;
  financialYearId: number;
  purpose: ChallanPurpose;
  voucherNumber: string;
  challanNumber: string;
  challanDate: string;
  status: ChallanStatus;
  partyId: number;
  partyName?: string | null;
  expectedReturnDate?: string | null;
  actualReturnDate?: string | null;
  totalCarats: number;
  totalPieces: number;
  totalAmount: number;
  returnedCarats: number;
  returnedPieces: number;
  narration?: string | null;
  party?: {
    id: number;
    accountName: string;
    mobile?: string | null;
    city?: string | null;
    gstinNumber?: string | null;
  };
  items: IChallanItem[];
}

export const CHALLAN_PURPOSE_LABELS: Record<ChallanPurpose, string> = {
  TRADING_JHANGHAD: 'Jhanghad (Trading)',
  JOB_WORK: 'Job Work Issue',
  SALE_ORDER: 'Sales Order',
  PURCHASE_ORDER: 'Purchase Order',
  INTERNAL_TRANSFER: 'Internal Transfer',
  CERTIFICATION: 'Certification Issue',
};

export const CHALLAN_STATUS_LABELS: Record<ChallanStatus, string> = {
  DRAFT: 'Draft',
  ISSUED: 'Issued',
  DISPATCHED: 'Dispatched',
  RECEIVED: 'Received',
  RETURNED: 'Returned',
  PARTIALLY_RETURNED: 'Partially Returned',
  CONVERTED: 'Converted',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

export const CHALLAN_STATUS_BADGE_VARIANT: Record<
  ChallanStatus,
  'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'
> = {
  DRAFT: 'default',
  ISSUED: 'primary',
  DISPATCHED: 'info',
  RECEIVED: 'success',
  RETURNED: 'success',
  PARTIALLY_RETURNED: 'warning',
  CONVERTED: 'info',
  CLOSED: 'default',
  CANCELLED: 'danger',
};
