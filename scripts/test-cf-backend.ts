import { PrismaClient } from '@prisma/client';

async function testCFBackend() {
  const prisma = new PrismaClient();
  
  const companyId = 1;
  const startDateStr = undefined;
  const endDateStr = '2026-08-06';

  const end = endDateStr ? new Date(endDateStr + 'T23:59:59.999Z') : new Date();
  const start = startDateStr ? new Date(startDateStr + 'T00:00:00.000Z') : new Date(new Date().getFullYear(), 3, 1);

  // 1. Fetch cash & bank accounts
  const cashAccounts = await prisma.account.findMany({
    where: {
      companyId,
      isDeleted: false,
      accountGroup: {
        nature: { in: ['ASSET', 'Assets'] },
        OR: [
          { groupName: { contains: 'Cash' } },
          { groupName: { contains: 'Bank' } },
          { groupName: { contains: 'cash' } },
          { groupName: { contains: 'bank' } },
        ]
      },
    },
  });

  const cashAccountIds = cashAccounts.map((a) => a.id);

  // Opening Balance calculation as of start date
  let totalOpeningInr = 0;
  for (const acc of cashAccounts) {
    const rawOp = Number(acc.openingBalanceAmount || 0);
    const op = acc.openingBalanceType === 'CREDIT' ? -rawOp : rawOp;
    
    // Aggregate prior GL movements before start date
    const priorAgg = await (prisma as any).generalLedgerEntry.groupBy({
      by: ['debitCreditType'],
      where: {
        companyId,
        accountId: acc.id,
        voucherDate: { lt: start },
      },
      _sum: { amount: true },
    });

    let priorDebit = 0;
    let priorCredit = 0;
    for (const r of priorAgg) {
      if (r.debitCreditType === 'DEBIT') priorDebit += Number(r._sum?.amount || 0);
      if (r.debitCreditType === 'CREDIT') priorCredit += Number(r._sum?.amount || 0);
    }
    totalOpeningInr += (op + priorDebit - priorCredit);
  }

  // Cash GL movements in period
  const glMovements = await (prisma as any).generalLedgerEntry.findMany({
    where: {
      companyId,
      accountId: { in: cashAccountIds },
      voucherDate: { gte: start, lte: end },
    },
    include: {
      account: { select: { id: true, accountName: true } },
    },
    orderBy: { voucherDate: 'asc' },
  });

  console.log(`Found ${glMovements.length} cash/bank GL movements in period.`);
  console.log('Total Opening Cash & Bank Balance:', totalOpeningInr);

  await prisma.$disconnect();
}

testCFBackend().catch(console.error);
