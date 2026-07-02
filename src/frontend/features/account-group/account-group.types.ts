// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Account Group Types
// ═══════════════════════════════════════════════════════════════

export type AccountNature = 'Assets' | 'Liabilities' | 'Income' | 'Expense';

export interface IAccountGroup {
  id: number;
  companyId: number;
  groupName: string;
  parentGroupId: number | null;
  nature: string;
  isGlobal: boolean;
  sortOrder: number;
  parentGroup?: { id: number; groupName: string } | null;
  _count?: { accounts: number; childGroups: number };
}

export interface IAccountGroupTreeNode {
  id: number;
  groupName: string;
  nature: string;
  parentGroupId: number | null;
  isGlobal: boolean;
  sortOrder: number;
  children: IAccountGroupTreeNode[];
}
