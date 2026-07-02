// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Default Account Group Chart of Accounts
// Seeded per company on creation (isGlobal = true, cannot delete)
// ═══════════════════════════════════════════════════════════════

export interface DefaultGroupDef {
  groupName: string;
  nature: 'Assets' | 'Liabilities' | 'Income' | 'Expense';
  parentName?: string;
  sortOrder: number;
}

export const DEFAULT_ACCOUNT_GROUPS: DefaultGroupDef[] = [
  // Root nature groups
  { groupName: 'Assets', nature: 'Assets', sortOrder: 1 },
  { groupName: 'Liabilities', nature: 'Liabilities', sortOrder: 2 },
  { groupName: 'Income', nature: 'Income', sortOrder: 3 },
  { groupName: 'Expenses', nature: 'Expense', sortOrder: 4 },

  // Assets children
  { groupName: 'Current Assets', nature: 'Assets', parentName: 'Assets', sortOrder: 10 },
  { groupName: 'Fixed Assets', nature: 'Assets', parentName: 'Assets', sortOrder: 11 },
  { groupName: 'Sundry Debtors', nature: 'Assets', parentName: 'Current Assets', sortOrder: 20 },
  { groupName: 'Cash Accounts', nature: 'Assets', parentName: 'Current Assets', sortOrder: 21 },
  { groupName: 'Bank Accounts', nature: 'Assets', parentName: 'Current Assets', sortOrder: 22 },
  { groupName: 'Stock-in-Trade', nature: 'Assets', parentName: 'Current Assets', sortOrder: 23 },

  // Liabilities children
  { groupName: 'Current Liabilities', nature: 'Liabilities', parentName: 'Liabilities', sortOrder: 30 },
  { groupName: 'Sundry Creditors', nature: 'Liabilities', parentName: 'Current Liabilities', sortOrder: 31 },
  { groupName: 'Duties & Taxes', nature: 'Liabilities', parentName: 'Current Liabilities', sortOrder: 32 },
  { groupName: 'Brokers', nature: 'Liabilities', parentName: 'Current Liabilities', sortOrder: 33 },

  // Income children
  { groupName: 'Direct Income', nature: 'Income', parentName: 'Income', sortOrder: 40 },
  { groupName: 'Indirect Income', nature: 'Income', parentName: 'Income', sortOrder: 41 },
  { groupName: 'Sales Accounts', nature: 'Income', parentName: 'Direct Income', sortOrder: 42 },

  // Expense children
  { groupName: 'Direct Expenses', nature: 'Expense', parentName: 'Expenses', sortOrder: 50 },
  { groupName: 'Indirect Expenses', nature: 'Expense', parentName: 'Expenses', sortOrder: 51 },
  { groupName: 'Purchase Accounts', nature: 'Expense', parentName: 'Direct Expenses', sortOrder: 52 },
];
