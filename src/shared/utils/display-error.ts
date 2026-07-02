// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Display Error Formatter (Frontend)
// Safety net for any raw backend / IPC error messages
// ═══════════════════════════════════════════════════════════════

const UNIQUE_PATTERNS: [RegExp, string][] = [
  [/UQ_account_groups_company_name/i, 'An account group with this name already exists for this company.'],
  [/UQ_accounts_company_name/i, 'An account with this name already exists for this company.'],
  [/group_name|groupName/i, 'An account group with this name already exists.'],
  [/account_name|accountName/i, 'An account with this name already exists.'],
];

export function formatDisplayError(message: string | null | undefined, fallback = 'Something went wrong. Please try again.'): string {
  if (!message || !message.trim()) return fallback;

  const trimmed = message.trim();

  if (trimmed.includes('Foreign key constraint violated')) {
    if (/account_group_id/i.test(trimmed)) {
      return 'Cannot delete this group — accounts are still linked to it. Move or remove those accounts first.';
    }
    if (/parent_group_id/i.test(trimmed)) {
      return 'Cannot delete this group — child groups are still linked to it. Delete or move child groups first.';
    }
    return 'This record is linked to other data and cannot be deleted yet.';
  }

  if (trimmed.includes('Unique constraint failed')) {
    for (const [pattern, friendly] of UNIQUE_PATTERNS) {
      if (pattern.test(trimmed)) return friendly;
    }
    return 'This name is already in use. Please choose a different name.';
  }

  if (trimmed.includes('Invalid `') && trimmed.includes('invocation')) {
    return fallback;
  }

  // Hide noisy Prisma / stack fragments (e.g. line numbers like main.js:3044)
  if (/main\.js:\d+/.test(trimmed) && trimmed.length > 120) {
    return fallback;
  }

  return trimmed;
}
