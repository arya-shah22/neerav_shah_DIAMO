// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Hard Delete Helpers
// Permanent delete with referential integrity checks
// ═══════════════════════════════════════════════════════════════

import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

type PrismaClient = PrismaService | Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

export async function assertAccountCanBeDeleted(
  prisma: PrismaClient,
  accountId: number,
  companyId: number,
): Promise<void> {
  const glCount = await prisma.generalLedgerEntry.count({
    where: { accountId, companyId },
  });
  if (glCount > 0) {
    throw new BadRequestException('Cannot delete an account that has ledger transactions');
  }

  const jvCount = await prisma.journalVoucherLine.count({
    where: { accountId },
  });
  if (jvCount > 0) {
    throw new BadRequestException('Cannot delete an account used in journal vouchers');
  }

  const billCount = await prisma.outstandingBill.count({
    where: { accountId },
  });
  if (billCount > 0) {
    throw new BadRequestException('Cannot delete an account with outstanding bills');
  }

  const saleCount = await prisma.saleInvoice.count({
    where: { OR: [{ customerId: accountId }, { brokerId: accountId }] },
  });
  if (saleCount > 0) {
    throw new BadRequestException('Cannot delete an account referenced by sale invoices');
  }

  const purchaseCount = await prisma.purchaseInvoice.count({
    where: { OR: [{ supplierId: accountId }, { brokerId: accountId }] },
  });
  if (purchaseCount > 0) {
    throw new BadRequestException('Cannot delete an account referenced by purchase invoices');
  }

  const challanCount = await prisma.challanVoucher.count({
    where: { partyId: accountId },
  });
  if (challanCount > 0) {
    throw new BadRequestException('Cannot delete an account referenced by challan vouchers');
  }
}

export async function hardDeleteAccount(
  prisma: PrismaClient,
  accountId: number,
  companyId: number,
): Promise<void> {
  await assertAccountCanBeDeleted(prisma, accountId, companyId);
  await prisma.brokerProfile.deleteMany({ where: { accountId } });
  await prisma.account.delete({ where: { id: accountId } });
}

export async function assertCompanyCanBeDeleted(prisma: PrismaClient, companyId: number): Promise<void> {
  const checks: Array<[string, number]> = await Promise.all([
    ['ledger transactions', await prisma.generalLedgerEntry.count({ where: { companyId } })],
    ['sale invoices', await prisma.saleInvoice.count({ where: { companyId } })],
    ['purchase invoices', await prisma.purchaseInvoice.count({ where: { companyId } })],
    ['challan vouchers', await prisma.challanVoucher.count({ where: { companyId } })],
    ['journal vouchers', await prisma.journalVoucher.count({ where: { companyId } })],
    ['cash/bank vouchers', await prisma.cashBankVoucher.count({ where: { companyId } })],
  ]);

  const blocked = checks.find(([, count]) => count > 0);
  if (blocked) {
    throw new BadRequestException(
      `Cannot delete this company — it has ${blocked[0]}. Remove transactional data first.`,
    );
  }
}

export async function hardDeleteCompanyMasters(prisma: PrismaClient, companyId: number): Promise<void> {
  const stockPackets = await prisma.stockPacket.findMany({
    where: { companyId },
    select: { id: true },
  });
  if (stockPackets.length > 0) {
    const ids = stockPackets.map((s) => s.id);
    await prisma.stockMovement.deleteMany({ where: { stockPacketId: { in: ids } } });
    await prisma.stockReservation.deleteMany({ where: { stockPacketId: { in: ids } } });
    await prisma.stockMedia.deleteMany({ where: { stockPacketId: { in: ids } } });
    await prisma.stockPacket.deleteMany({ where: { companyId } });
  }

  const accounts = await prisma.account.findMany({
    where: { companyId },
    select: { id: true },
  });
  for (const account of accounts) {
    await hardDeleteAccount(prisma, account.id, companyId);
  }

  const qualities = await prisma.quality.findMany({
    where: { companyId },
    select: { id: true },
  });
  if (qualities.length > 0) {
    await prisma.qualityGstHistory.deleteMany({
      where: { qualityId: { in: qualities.map((q) => q.id) } },
    });
    await prisma.quality.deleteMany({ where: { companyId } });
  }

  await prisma.accountGroup.updateMany({
    where: { companyId },
    data: { parentGroupId: null },
  });
  await prisma.accountGroup.deleteMany({ where: { companyId } });

  await prisma.financialYear.deleteMany({ where: { companyId } });

  await prisma.userCompanyAccess.deleteMany({ where: { companyId } });
  await prisma.systemSetting.deleteMany({ where: { companyId } });
  await prisma.printTemplate.deleteMany({ where: { companyId } });
  await prisma.voucherNumberConfig.deleteMany({ where: { companyId } });
  await prisma.voucherNumberSequence.deleteMany({ where: { companyId } });
  await prisma.notificationRecord.deleteMany({ where: { companyId } });
  await prisma.loan.deleteMany({ where: { companyId } });
  await prisma.stockConversion.deleteMany({ where: { companyId } });
}
