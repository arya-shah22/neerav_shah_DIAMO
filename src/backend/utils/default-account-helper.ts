// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Shared Default Account Helper
// Ensures standard ledger accounts exist for a company.
// Used by: InvoiceService, JobService, ReportService
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import { DEFAULT_ACCOUNT_GROUPS } from '../modules/account-group/default-groups';

/**
 * Ensures a default ledger account exists (by name) for the given company.
 * If it doesn't exist, creates the group (if missing) and the account.
 *
 * @param prisma - Prisma client instance
 * @param companyId - The company ID
 * @param accountName - The ledger account name (e.g. 'Sales A/c')
 * @param groupName - The account group name (e.g. 'Sales Accounts')
 * @param natureOverride - Optional explicit nature (used by job service). If not provided, looks up from DEFAULT_ACCOUNT_GROUPS.
 * @returns The account ID
 */
export async function getOrCreateDefaultAccount(
  prisma: PrismaClient,
  companyId: number,
  accountName: string,
  groupName: string,
  natureOverride?: string,
): Promise<number> {
  const existing = await prisma.account.findFirst({
    where: { companyId, accountName, isDeleted: false },
  });
  if (existing) return existing.id;

  let group = await prisma.accountGroup.findFirst({
    where: { companyId, groupName, isDeleted: false },
  });

  if (!group) {
    const defGroup = DEFAULT_ACCOUNT_GROUPS.find(
      (g) => g.groupName.toLowerCase() === groupName.toLowerCase(),
    );
    group = await prisma.accountGroup.create({
      data: {
        companyId,
        groupName,
        nature: natureOverride || defGroup?.nature || 'Liabilities',
        isGlobal: defGroup ? true : false,
        sortOrder: defGroup?.sortOrder || 30,
      },
    });
  }

  const created = await prisma.account.create({
    data: {
      companyId,
      accountGroupId: group.id,
      accountName,
      status: 'ACTIVE',
      openingBalanceAmount: 0,
    },
  });
  return created.id;
}
