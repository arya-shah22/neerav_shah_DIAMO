// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Company Types
// ═══════════════════════════════════════════════════════════════

export interface ICompany {
  id: number;
  companyName: string;
  companyCode: string;
  panNumber: string;
  gstinNumber?: string | null;
  tanNumber?: string | null;
  udyamMsme?: string | null;
  iecCode?: string | null;
  gstEnabled: boolean;
  gstRegistrationDate?: string | Date | null;
  businessType?: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  isDefault: boolean;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateCode?: string | null;
  pincode?: string | null;
  country?: string | null;
  mobile?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
  bankBranch?: string | null;
  bankIfsc?: string | null;
  bankSwift?: string | null;
}
