// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Company Context Service
// Loads companies and active financial year after login
// ═══════════════════════════════════════════════════════════════

import { invokeIpc } from '../../shared/utils/ipc';
import { useCompanyStore } from '../state/company-store';
import type { ICompany } from '../features/company/company.types';
import type { IFinancialYear } from '../features/financial-year/fy.types';

/**
 * Fetch companies from the backend and resolve the active company + FY.
 */
export async function loadCompanyContext(
  preferredCompanyId?: number,
): Promise<{ company: ICompany | null; financialYear: IFinancialYear | null }> {
  const { setCompanies, setActiveCompany, setActiveFinancialYear } = useCompanyStore.getState();

  const companiesRes = await invokeIpc<ICompany[]>('company:list');
  if (!companiesRes.success || !companiesRes.data?.length) {
    setCompanies([]);
    return { company: null, financialYear: null };
  }

  const companies = companiesRes.data;
  setCompanies(companies);

  const company =
    companies.find((c) => c.id === preferredCompanyId) ||
    companies.find((c) => c.isDefault) ||
    companies[0];

  setActiveCompany(company);

  const fyRes = await invokeIpc<IFinancialYear[]>('fy:list', company.id);
  if (!fyRes.success || !fyRes.data?.length) {
    return { company, financialYear: null };
  }

  const financialYear = fyRes.data.find((fy) => fy.isActive) || fyRes.data[0];
  setActiveFinancialYear(financialYear);
  return { company, financialYear };
}

/**
 * Switch active company and reload its financial years.
 */
export async function switchCompany(company: ICompany): Promise<IFinancialYear | null> {
  const { setActiveCompany, setActiveFinancialYear } = useCompanyStore.getState();
  setActiveCompany(company);

  const fyRes = await invokeIpc<IFinancialYear[]>('fy:list', company.id);
  if (!fyRes.success || !fyRes.data?.length) {
    useCompanyStore.setState({ activeFinancialYear: null });
    return null;
  }

  const financialYear = fyRes.data.find((fy) => fy.isActive) || fyRes.data[0];
  setActiveFinancialYear(financialYear);
  return financialYear;
}
