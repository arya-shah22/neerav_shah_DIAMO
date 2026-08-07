import { PrismaClient } from '@prisma/client';

async function test() {
  const prisma = new PrismaClient();
  const accs = await prisma.account.findMany({ where: { companyId: 1, isDeleted: false }, include: { accountGroup: true } });
  
  console.log('--- RECONCILING EACH ACCOUNT ---');
  let sumAssets = 0;
  let sumLiab = 0;
  let sumInc = 0;
  let sumExp = 0;

  for (const acc of accs) {
    const gl = await (prisma as any).generalLedgerEntry.groupBy({
      by: ['debitCreditType'],
      where: { accountId: acc.id, companyId: 1 },
      _sum: { amount: true }
    });
    let d = 0, c = 0;
    for (const r of gl) {
      if (r.debitCreditType === 'DEBIT') d += Number(r._sum.amount || 0);
      if (r.debitCreditType === 'CREDIT') c += Number(r._sum.amount || 0);
    }
    const rawOp = Number(acc.openingBalanceAmount || 0);
    const op = acc.openingBalanceType === 'CREDIT' ? -rawOp : rawOp;
    const closing = op + d - c;

    const nat = acc.accountGroup?.nature?.toUpperCase() || '';
    const grp = acc.accountGroup?.groupName?.toLowerCase() || '';

    if (nat.includes('INCOME') || nat.includes('REVENUE') || grp.includes('sales') || grp.includes('income')) {
      sumInc += (c - d);
    } else if (nat.includes('EXPENSE') || nat.includes('COST OF GOODS') || grp.includes('purchase') || grp.includes('expense') || grp.includes('job')) {
      sumExp += (d - c);
    } else if (nat.includes('ASSET')) {
      sumAssets += closing;
    } else {
      sumLiab += (-closing);
    }
  }

  const netP = sumInc - sumExp;
  console.log('SUM ASSETS:', sumAssets);
  console.log('SUM LIAB (normal credit):', sumLiab);
  console.log('NET PROFIT:', netP);
  console.log('SUM LIAB + NET PROFIT:', sumLiab + netP);
  console.log('DIFFERENCE (ASSETS - (LIAB + NP)):', sumAssets - (sumLiab + netP));
  await prisma.$disconnect();
}

test().catch(console.error);
