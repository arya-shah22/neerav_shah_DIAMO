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
  const { setCompanies } = useCompanyStore.getState();

  const companiesRes = await invokeIpc<ICompany[]>('company:list');
  if (!companiesRes.success || !companiesRes.data?.length) {
    setCompanies([]);
    return { company: null, financialYear: null };
  }

  const companies = companiesRes.data;
  setCompanies(companies);

  const defaultCompany = companies.find((c) => c.isDefault);
  const preferredCompany = companies.find((c) => c.id === preferredCompanyId);
  const company =
    (preferredCompany && !preferredCompany.companyName.toLowerCase().includes('test company') && !preferredCompany.companyName.toLowerCase().includes('isolated'))
      ? preferredCompany
      : (defaultCompany || companies[0]);

  const fyRes = await invokeIpc<IFinancialYear[]>('fy:list', company.id);
  const financialYear = (fyRes.success && fyRes.data?.length)
    ? (fyRes.data.find((fy) => fy.isActive) || fyRes.data[0])
    : null;

  useCompanyStore.setState({
    companies,
    activeCompany: company,
    activeFinancialYear: financialYear,
  });

  return { company, financialYear };
}

/**
 * Switch active company and reload its financial years.
 */
export async function switchCompany(company: ICompany): Promise<IFinancialYear | null> {
  const fyRes = await invokeIpc<IFinancialYear[]>('fy:list', company.id);
  const financialYear = (fyRes.success && fyRes.data?.length)
    ? (fyRes.data.find((fy) => fy.isActive) || fyRes.data[0])
    : null;

  useCompanyStore.setState({
    activeCompany: company,
    activeFinancialYear: financialYear,
  });

  return financialYear;
}
