import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  console.log('--- Companies ---');
  const companies = await prisma.company.findMany();
  console.log(companies.map(c => ({ id: c.id, name: c.companyName, code: c.companyCode })));

  console.log('--- Purchase Invoices ---');
  const purchases = await prisma.purchaseInvoice.findMany({
    include: { supplier: true }
  });
  console.log(purchases.map(p => ({
    id: p.id,
    voucherNumber: p.voucherNumber,
    billNumber: p.billNumber,
    supplierId: p.supplierId,
    supplierName: p.supplier?.accountName,
    companyId: p.companyId,
    outstandingAmount: p.outstandingAmount.toString(),
    status: p.status,
    isDeleted: p.isDeleted
  })));

  console.log('--- Sale Invoices ---');
  const sales = await prisma.saleInvoice.findMany({
    include: { customer: true }
  });
  console.log(sales.map(s => ({
    id: s.id,
    voucherNumber: s.voucherNumber,
    billNumber: s.billNumber,
    customerId: s.customerId,
    customerName: s.customer?.accountName,
    companyId: s.companyId,
    outstandingAmount: s.outstandingAmount.toString(),
    status: s.status,
    isDeleted: s.isDeleted
  })));
  console.log('--- CashBank Vouchers ---');
  const CBV = await prisma.cashBankVoucher.findMany({
    where: { companyId: 1 }
  });
  console.log(CBV.map(c => ({ id: c.id, type: c.transactionType, num: c.voucherNumber, amt: c.amount.toString(), ref: c.referenceBillNo, isDeleted: c.isDeleted })));

  console.log('--- General Ledger Entries ---');
  console.log('--- Journal Vouchers ---');
  const jvs = await prisma.journalVoucher.findMany({
    where: { companyId: 1 },
    include: { lines: { include: { account: true } } }
  });
  console.log(JSON.stringify(jvs.map(j => ({
    id: j.id,
    num: j.voucherNumber,
    status: j.status,
    lines: j.lines.map(l => ({ id: l.id, accId: l.accountId, name: l.account.accountName, type: l.debitCreditType, amt: l.amount.toString() }))
  })), null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
