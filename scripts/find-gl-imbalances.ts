import { PrismaClient } from '@prisma/client';

async function findImbalances() {
  const prisma = new PrismaClient();
  
  // Find all distinct voucher Numbers / Types
  const sales = await prisma.saleInvoice.findMany({ where: { companyId: 1, isDeleted: false } });
  const purchases = await prisma.purchaseInvoice.findMany({ where: { companyId: 1, isDeleted: false } });
  const cashbanks = await prisma.cashBankVoucher.findMany({ where: { companyId: 1, isDeleted: false } });
  const journals = await prisma.journalVoucher.findMany({ where: { companyId: 1, isDeleted: false } });

  console.log(`Sales: ${sales.length}, Purchases: ${purchases.length}, CashBank: ${cashbanks.length}, Journals: ${journals.length}`);

  const gls = await prisma.generalLedgerEntry.findMany({ where: { companyId: 1 } });
  
  // Check GL entry totals per voucher
  const voucherMap = new Map<string, { debits: number; credits: number }>();

  for (const gl of gls) {
    const key = `${gl.sourceVoucherType}:${gl.sourceVoucherId}`;
    if (!voucherMap.has(key)) {
      voucherMap.set(key, { debits: 0, credits: 0 });
    }
    const rec = voucherMap.get(key)!;
    if (gl.debitCreditType === 'DEBIT') rec.debits += Number(gl.amount);
    if (gl.debitCreditType === 'CREDIT') rec.credits += Number(gl.amount);
  }

  let totalVoucherDiff = 0;
  console.log('\n--- UNBALANCED VOUCHERS IN GL ---');
  for (const [key, val] of voucherMap.entries()) {
    const diff = val.debits - val.credits;
    if (Math.abs(diff) > 0.01) {
      console.log(`Voucher ${key}: Debits=₹${val.debits}, Credits=₹${val.credits}, Diff=₹${diff}`);
      totalVoucherDiff += diff;
    }
  }
  console.log(`Total Unbalanced Voucher Difference: ₹${totalVoucherDiff}`);

  await prisma.$disconnect();
}

findImbalances().catch(console.error);
