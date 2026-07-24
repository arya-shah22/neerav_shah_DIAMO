import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOutstandingAmounts() {
  console.log('Fixing outstanding amounts and payment statuses in database...');

  // 1. Fix Sale Invoices
  const sales = await prisma.saleInvoice.findMany({
    where: { isDeleted: false },
  });

  for (const inv of sales) {
    const net = Number(inv.netAmount) || 0;
    const jama = Number(inv.jamaAmount) || 0;
    const correctOutstanding = Math.max(0, net - jama);
    const correctStatus = (jama === 0 || correctOutstanding === net)
      ? 'UNPAID'
      : (correctOutstanding <= 0 ? 'PAID' : 'PARTIAL');

    if (Number(inv.outstandingAmount) !== correctOutstanding || inv.paymentStatus !== correctStatus) {
      await prisma.saleInvoice.update({
        where: { id: inv.id },
        data: {
          outstandingAmount: correctOutstanding,
          paymentStatus: correctStatus as any,
        },
      });
      console.log(`Updated Sale Invoice ${inv.voucherNumber}: net = ${net}, jama = ${jama}, outstanding = ${correctOutstanding}, status = ${correctStatus}`);
    }
  }

  // 2. Fix Purchase Invoices
  const purchases = await prisma.purchaseInvoice.findMany({
    where: { isDeleted: false },
  });

  for (const inv of purchases) {
    const net = Number(inv.netAmount) || 0;
    const jama = Number(inv.jamaAmount) || 0;
    const correctOutstanding = Math.max(0, net - jama);
    const correctStatus = (jama === 0 || correctOutstanding === net)
      ? 'UNPAID'
      : (correctOutstanding <= 0 ? 'PAID' : 'PARTIAL');

    if (Number(inv.outstandingAmount) !== correctOutstanding || inv.paymentStatus !== correctStatus) {
      await prisma.purchaseInvoice.update({
        where: { id: inv.id },
        data: {
          outstandingAmount: correctOutstanding,
          paymentStatus: correctStatus as any,
        },
      });
      console.log(`Updated Purchase Invoice ${inv.voucherNumber}: net = ${net}, jama = ${jama}, outstanding = ${correctStatus}`);
    }
  }

  console.log('Done fixing outstanding amounts.');
}

fixOutstandingAmounts()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
