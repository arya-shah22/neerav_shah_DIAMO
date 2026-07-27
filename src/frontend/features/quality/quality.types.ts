// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Quality Types
// ═══════════════════════════════════════════════════════════════

export type UqcType = 'CTS' | 'PCS';
export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface IQualityGstHistory {
  id: number;
  qualityId: number;
  applyDate: string;
  gstPct: number;
  cessPct: number;
}

export interface IHsnCode {
  id: number;
  hsnCode: string;
  description: string;
  gstPct: number;
  cessPct: number;
}

export interface IQuality {
  id: number;
  companyId: number;
  qualityName: string;
  hsnNumber: string;
  uqc: UqcType;
  purchaseRate: number;
  saleRate: number;
  mrp: number;
  minLevel: number;
  maxLevel: number;
  openingBalanceCarats: number;
  openingBalancePcs: number;
  openingBalanceRate: number;
  status: AccountStatus;
  isService?: boolean;
  gstHistory?: IQualityGstHistory[];
}
