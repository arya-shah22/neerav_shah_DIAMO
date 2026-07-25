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

  console.log('--- Challan Vouchers ---');
  const challans = await prisma.challanVoucher.findMany({
    include: { party: true, items: true }
  });
  console.log(JSON.stringify(challans, null, 2));

  console.log('--- Job Vouchers ---');
  const jobs = await prisma.jobVoucher.findMany({
    include: { party: true, items: true }
  });
  console.log(JSON.stringify(jobs, null, 2));

  console.log('--- Stock Conversions ---');
  const conversions = await prisma.stockConversion.findMany({
    include: { outputItems: true }
  });
  console.log(JSON.stringify(conversions, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
