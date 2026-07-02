// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Company Store (Zustand)
// Active company + financial year selection with persistence
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ICompany } from '../features/company/company.types';
import type { IFinancialYear } from '../features/financial-year/fy.types';

interface CompanyState {
  activeCompany: ICompany | null;
  activeFinancialYear: IFinancialYear | null;
  companies: ICompany[];

  setActiveCompany: (company: ICompany) => void;
  setActiveFinancialYear: (fy: IFinancialYear) => void;
  setCompanies: (companies: ICompany[]) => void;
  reset: () => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'diamo-company',
      partialize: (state) => ({
        activeCompany: state.activeCompany,
        activeFinancialYear: state.activeFinancialYear,
      }),
    },
  ),
);

/**
 * Format a financial year record into a display label (e.g. "2025-26").
 */
export function formatFinancialYearLabel(fy: IFinancialYear): string {
  const from = new Date(fy.fromDate);
  const to = new Date(fy.toDate);
  return `${from.getFullYear()}-${String(to.getFullYear()).slice(-2)}`;
}
