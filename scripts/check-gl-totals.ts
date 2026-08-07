import { PrismaClient } from '@prisma/client';

async function checkTB() {
  const prisma = new PrismaClient();
  const accs = await prisma.account.findMany({ where: { companyId: 1, isDeleted: false }, include: { accountGroup: true } });
  
  let totalDr = 0;
  let totalCr = 0;

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
    const op = Number(acc.openingBalanceAmount || 0) * (acc.openingBalanceType === 'CREDIT' ? -1 : 1);
    totalDr += (op > 0 ? op : 0) + d;
    totalCr += (op < 0 ? Math.abs(op) : 0) + c;
  }

  console.log(`TOTAL GL DEBITS + OP DEBITS: ₹${totalDr.toLocaleString('en-IN')}`);
  console.log(`TOTAL GL CREDITS + OP CREDITS: ₹${totalCr.toLocaleString('en-IN')}`);
  console.log(`DIFFERENCE: ₹${(totalDr - totalCr).toLocaleString('en-IN')}`);
  await prisma.$disconnect();
}

checkTB().catch(console.error);
