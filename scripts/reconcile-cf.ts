import { PrismaClient } from '@prisma/client';

async function testReconcileCF() {
  const prisma = new PrismaClient();
  const accs = await prisma.account.findMany({
    where: {
      companyId: 1,
      isDeleted: false,
      accountGroup: {
        nature: { in: ['ASSET', 'Assets'] },
        OR: [
          { groupName: { contains: 'Cash' } },
          { groupName: { contains: 'Bank' } },
          { groupName: { contains: 'cash' } },
          { groupName: { contains: 'bank' } },
        ]
      }
    }
  });

  console.log('Cash Accounts:', accs.map(a => a.accountName));

  let totalDebit = 0;
  let totalCredit = 0;
  let rawOpSum = 0;

  for (const acc of accs) {
    const rawOp = Number(acc.openingBalanceAmount || 0);
    const op = acc.openingBalanceType === 'CREDIT' ? -rawOp : rawOp;
    rawOpSum += op;

    const gls = await (prisma as any).generalLedgerEntry.findMany({
      where: { companyId: 1, accountId: acc.id }
    });

    for (const g of gls) {
      const dc = g.debitCreditType || g.debitCredit;
      if (dc === 'DEBIT') totalDebit += Number(g.amount);
      if (dc === 'CREDIT') totalCredit += Number(g.amount);
    }
  }

  console.log('Opening Sum:', rawOpSum);
  console.log('Total Debit Cash Movement (Inflows):', totalDebit);
  console.log('Total Credit Cash Movement (Outflows):', totalCredit);
  console.log('Net Cash Movement:', totalDebit - totalCredit);
  console.log('Closing Cash Calculated:', rawOpSum + (totalDebit - totalCredit));
  await prisma.$disconnect();
}

testReconcileCF().catch(console.error);
