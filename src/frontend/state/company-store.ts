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

// Debounced localStorage writer — batches writes every 500ms instead of on every setState
const debouncedStorage = (() => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pending: string | null = null;

  return {
    getItem: (name: string): string | null => {
      return localStorage.getItem(name);
    },
    setItem: (name: string, value: string): void => {
      pending = value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (pending !== null) {
          localStorage.setItem(name, pending);
          pending = null;
        }
      }, 500);
    },
    removeItem: (name: string): void => {
      localStorage.removeItem(name);
    },
  };
})();

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
      storage: debouncedStorage as any,
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
