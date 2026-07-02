// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Account Types
// ═══════════════════════════════════════════════════════════════

export type AccountStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
export type GstRegType = 'REGULAR' | 'COMPOSITION' | 'UNREGISTERED' | 'SEZ' | 'DEEMED_EXPORT';
export type DebitCreditType = 'DEBIT' | 'CREDIT';

export interface IAccountGroupRef {
  id: number;
  groupName: string;
  nature?: string;
}

export interface IAccount {
  id: number;
  companyId: number;
  accountGroupId: number;
  accountName: string;
  printName: string | null;
  status: AccountStatus;
  isBroker: boolean;
  gstinNumber: string | null;
  panNumber: string | null;
  gstRegType: GstRegType | null;
  udyamMsme: string | null;
  tdsLedgerId: number | null;
  tdsPct: number | null;
  creditDays: number;
  creditLimit: number;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateCode: string | null;
  pincode: string | null;
  country: string | null;
  mobile: string | null;
  phone: string | null;
  email: string | null;
  bankAccountNumber: string | null;
  bankName: string | null;
  bankBranch: string | null;
  bankIfsc: string | null;
  openingBalanceAmount: number;
  openingBalanceType: DebitCreditType | null;
  accountGroup?: IAccountGroupRef;
}
