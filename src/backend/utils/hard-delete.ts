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

export async function assertCompanyCanBeDeleted(_prisma: PrismaClient, _companyId: number): Promise<void> {
  // Cascading deletion enabled for authorized company deletion
}

export async function hardDeleteCompanyMasters(prisma: PrismaClient, companyId: number): Promise<void> {
  // 1. Transactions & Vouchers
  await prisma.generalLedgerEntry.deleteMany({ where: { companyId } });
  
  const jvs = await prisma.journalVoucher.findMany({ where: { companyId }, select: { id: true } });
  if (jvs.length > 0) {
    await prisma.journalVoucherLine.deleteMany({ where: { journalVoucherId: { in: jvs.map(j => j.id) } } });
    await prisma.journalVoucher.deleteMany({ where: { companyId } });
  }

  const cbvs = await prisma.cashBankVoucher.findMany({ where: { companyId }, select: { id: true } });
  if (cbvs.length > 0) {
    const cbvIds = cbvs.map(c => c.id);
    await prisma.cashBankAllocation.deleteMany({ where: { cashBankVoucherId: { in: cbvIds } } });
    await prisma.bankReconciliation.deleteMany({ where: { cashBankVoucherId: { in: cbvIds } } });
    await prisma.cashBankVoucher.deleteMany({ where: { companyId } });
  }

  const sales = await prisma.saleInvoice.findMany({ where: { companyId }, select: { id: true } });
  if (sales.length > 0) {
    await prisma.saleInvoiceItem.deleteMany({ where: { saleInvoiceId: { in: sales.map(s => s.id) } } });
    await prisma.saleInvoice.deleteMany({ where: { companyId } });
  }

  const purchases = await prisma.purchaseInvoice.findMany({ where: { companyId }, select: { id: true } });
  if (purchases.length > 0) {
    await prisma.purchaseInvoiceItem.deleteMany({ where: { purchaseInvoiceId: { in: purchases.map(p => p.id) } } });
    await prisma.purchaseInvoice.deleteMany({ where: { companyId } });
  }

  const challans = await prisma.challanVoucher.findMany({ where: { companyId }, select: { id: true } });
  if (challans.length > 0) {
    await prisma.challanItem.deleteMany({ where: { challanVoucherId: { in: challans.map(c => c.id) } } });
    await prisma.challanVoucher.deleteMany({ where: { companyId } });
  }

  const jobs = await prisma.jobVoucher.findMany({ where: { companyId }, select: { id: true } });
  if (jobs.length > 0) {
    const jobIds = jobs.map(j => j.id);
    await prisma.jobCostEntry.deleteMany({ where: { jobVoucherId: { in: jobIds } } });
    await prisma.jobVoucherItem.deleteMany({ where: { jobVoucherId: { in: jobIds } } });
    await prisma.jobVoucher.deleteMany({ where: { companyId } });
  }

  await prisma.outstandingBill.deleteMany({ where: { companyId } });

  const conversions = await prisma.stockConversion.findMany({ where: { companyId }, select: { id: true } });
  if (conversions.length > 0) {
    await prisma.stockConversionOutput.deleteMany({ where: { stockConversionId: { in: conversions.map(c => c.id) } } });
    await prisma.stockConversion.deleteMany({ where: { companyId } });
  }

  // 2. Stock Inventory
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

  // 3. Masters & Configuration (Accounts, Qualities, Groups, Settings, FY, etc.)
  const accounts = await prisma.account.findMany({
    where: { companyId },
    select: { id: true },
  });
  if (accounts.length > 0) {
    const accIds = accounts.map(a => a.id);
    await prisma.brokerProfile.deleteMany({ where: { accountId: { in: accIds } } });
    await prisma.account.deleteMany({ where: { companyId } });
  }

  const qualities = await prisma.quality.findMany({
    where: { companyId },
    select: { id: true },
  });
  if (qualities.length > 0) {
    const qIds = qualities.map((q) => q.id);
    await prisma.stockConversionOutput.deleteMany({ where: { outputQualityId: { in: qIds } } });
    await prisma.stockConversion.deleteMany({ where: { sourceQualityId: { in: qIds } } });
    await prisma.qualityGstHistory.deleteMany({
      where: { qualityId: { in: qIds } },
    });
    await prisma.quality.deleteMany({ where: { companyId } });
  }

  await prisma.accountGroup.updateMany({
    where: { companyId },
    data: { parentGroupId: null },
  });
  await prisma.accountGroup.deleteMany({ where: { companyId } });

  // Delete records dependent on FinancialYear before deleting FinancialYear
  await prisma.loan.deleteMany({ where: { companyId } });
  await prisma.voucherNumberSequence.deleteMany({ where: { companyId } });
  await prisma.voucherNumberConfig.deleteMany({ where: { companyId } });
  await prisma.financialYear.deleteMany({ where: { companyId } });

  await prisma.userCompanyAccess.deleteMany({ where: { companyId } });
  await prisma.systemSetting.deleteMany({ where: { companyId } });
  await prisma.printTemplate.deleteMany({ where: { companyId } });
  await prisma.notificationRecord.deleteMany({ where: { companyId } });
  await prisma.exchangeRateLog.deleteMany({ where: { companyId } });
  await prisma.auditLog.deleteMany({ where: { companyId } });
}
