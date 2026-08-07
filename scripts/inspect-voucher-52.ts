import { PrismaClient } from '@prisma/client';

async function inspectVoucher52() {
  const prisma = new PrismaClient();
  const cb = await prisma.cashBankVoucher.findUnique({
    where: { id: 52 },
    include: { party: true, cashBankAccount: true },
  });
  console.log('CASH_RECEIPT #52:', JSON.stringify(cb, null, 2));

  const gls = await prisma.generalLedgerEntry.findMany({
    where: { sourceVoucherType: 'CASH_RECEIPT', sourceVoucherId: 52 },
    include: { account: true },
  });
  console.log('\nGL ENTRIES FOR #52:');
  console.table(gls.map(g => ({
    id: g.id,
    account: g.account.accountName,
    type: g.debitCreditType,
    amount: Number(g.amount),
  })));

  await prisma.$disconnect();
}

inspectVoucher52().catch(console.error);
