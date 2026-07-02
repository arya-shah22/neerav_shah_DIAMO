// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Company Store (Zustand)
// Active company + financial year selection
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';

interface Company {
  id: number;
  name: string;
  shortName: string;
}

interface FinancialYear {
  id: number;
  label: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface CompanyState {
  activeCompany: Company | null;
  activeFinancialYear: FinancialYear | null;
  companies: Company[];

  setActiveCompany: (company: Company) => void;
  setActiveFinancialYear: (fy: FinancialYear) => void;
  setCompanies: (companies: Company[]) => void;
  reset: () => void;
}

export const useCompanyStore = create<CompanyState>((set) => ({
  activeCompany: null,
  activeFinancialYear: null,
  companies: [],

  setActiveCompany: (company) =>
    set({ activeCompany: company }),

  setActiveFinancialYear: (fy) =>
    set({ activeFinancialYear: fy }),

  setCompanies: (companies) =>
    set({ companies }),

  reset: () =>
    set({ activeCompany: null, activeFinancialYear: null, companies: [] }),
}));
