import { PrismaClient } from '@prisma/client';

async function inspectSale71() {
  const prisma = new PrismaClient();
  const inv = await prisma.saleInvoice.findUnique({
    where: { id: 71 },
    include: { items: true },
  });
  console.log('SALE INVOICE #71:', JSON.stringify(inv, null, 2));

  const gls = await prisma.generalLedgerEntry.findMany({
    where: { sourceVoucherType: 'SALE_INVOICE', sourceVoucherId: 71 },
  });
  console.log('\nGL ENTRIES FOR SALE #71:');
  console.table(gls.map(g => ({
    id: g.id,
    accountId: g.accountId,
    type: g.debitCreditType,
    amount: Number(g.amount),
    narration: g.narration,
  })));

  await prisma.$disconnect();
}

inspectSale71().catch(console.error);
