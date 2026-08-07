import { PrismaClient } from '@prisma/client';

async function auditOutstanding() {
  const prisma = new PrismaClient();
  const companyId = 1;

  // 1. Audit Receivables (Sale Invoices with outstandingAmount > 0)
  const sales = await prisma.saleInvoice.findMany({
    where: { companyId, isDeleted: false, outstandingAmount: { gt: 0 } },
    include: { customer: true },
  });

  let totalReceivableInvoices = 0;
  console.log('--- UNPAID/PARTIAL SALE INVOICES ---');
  for (const s of sales) {
    const net = Number(s.netAmount);
    const jama = Number(s.jamaAmount);
    const out = Number(s.outstandingAmount);
    totalReceivableInvoices += out;
    console.log(`Invoice #${s.voucherNumber} (${s.customer?.accountName}): Net=₹${net}, Jama=₹${jama}, Outstanding=₹${out}`);
  }
  console.log(`\nTOTAL RECEIVABLE FROM INVOICES: ₹${totalReceivableInvoices.toLocaleString('en-IN')}`);

  // 2. Audit Payables (Purchase Invoices with outstandingAmount > 0)
  const purchases = await prisma.purchaseInvoice.findMany({
    where: { companyId, isDeleted: false, outstandingAmount: { gt: 0 } },
    include: { supplier: true },
  });

  let totalPayableInvoices = 0;
  console.log('\n--- UNPAID/PARTIAL PURCHASE INVOICES ---');
  for (const p of purchases) {
    const net = Number(p.netAmount);
    const jama = Number(p.jamaAmount);
    const out = Number(p.outstandingAmount);
    totalPayableInvoices += out;
    console.log(`Invoice #${p.voucherNumber} (${p.supplier?.accountName}): Net=₹${net}, Jama=₹${jama}, Outstanding=₹${out}`);
  }
  console.log(`\nTOTAL PAYABLE FROM INVOICES: ₹${totalPayableInvoices.toLocaleString('en-IN')}`);

  await prisma.$disconnect();
}

auditOutstanding().catch(console.error);
