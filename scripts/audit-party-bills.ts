import { PrismaClient } from '@prisma/client';

async function checkPartyLedgerVSOutstanding() {
  const prisma = new PrismaClient();
  const sales = await (prisma as any).saleInvoice.findMany({ where: { companyId: 1, isDeleted: false } });
  const purchases = await (prisma as any).purchaseInvoice.findMany({ where: { companyId: 1, isDeleted: false } });

  console.log('Total Sale Invoices:', sales.length);
  console.log('Total Purchase Invoices:', purchases.length);

  const parties = await prisma.account.findMany({
    where: {
      companyId: 1,
      isDeleted: false,
      accountGroup: {
        OR: [
          { groupName: { contains: 'debtors' } },
          { groupName: { contains: 'creditors' } }
        ]
      }
    }
  });

  for (const p of parties) {
    const pSales = sales.filter((s: any) => s.customerId === p.id);
    const pPurchases = purchases.filter((s: any) => s.supplierId === p.id);
    const salesUnpaid = pSales.reduce((sum: number, s: any) => sum + Number(s.outstandingAmount || 0), 0);
    const purUnpaid = pPurchases.reduce((sum: number, s: any) => sum + Number(s.outstandingAmount || 0), 0);

    const glAgg = await (prisma as any).generalLedgerEntry.groupBy({
      by: ['debitCreditType'],
      where: { companyId: 1, accountId: p.id },
      _sum: { amount: true }
    });

    let debits = 0, credits = 0;
    for (const g of glAgg) {
      if (g.debitCreditType === 'DEBIT') debits += Number(g._sum.amount || 0);
      if (g.debitCreditType === 'CREDIT') credits += Number(g._sum.amount || 0);
    }
    const rawOp = Number(p.openingBalanceAmount || 0);
    const op = p.openingBalanceType === 'CREDIT' ? -rawOp : rawOp;
    const ledgerClosing = op + debits - credits;

    console.log(`Party [${p.accountName}]: LedgerBal = ₹${ledgerClosing}, UnpaidSales = ₹${salesUnpaid}, UnpaidPurchases = ₹${purUnpaid}`);
  }

  await prisma.$disconnect();
}

checkPartyLedgerVSOutstanding().catch(console.error);
