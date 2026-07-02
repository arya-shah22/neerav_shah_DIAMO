// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Active Company Hook
// ═══════════════════════════════════════════════════════════════

import { useCompanyStore } from '../state/company-store';

export function useActiveCompany() {
  const activeCompany = useCompanyStore((s) => s.activeCompany);
  return {
    activeCompany,
    companyId: activeCompany?.id ?? null,
    isReady: !!activeCompany,
  };
}
