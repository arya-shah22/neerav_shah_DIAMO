import { PrismaClient } from '@prisma/client';

async function fix52() {
  const prisma = new PrismaClient();
  const del = await prisma.generalLedgerEntry.deleteMany({ where: { sourceVoucherType: 'CASH_RECEIPT', sourceVoucherId: 52 } });
  console.log('Deleted old GL entries for #52:', del.count);

  await prisma.generalLedgerEntry.createMany({
    data: [
      {
        companyId: 1,
        accountId: 25,
        voucherDate: new Date('2026-07-26'),
        debitCreditType: 'DEBIT',
        amount: 598387.97,
        sourceVoucherType: 'CASH_RECEIPT',
        sourceVoucherId: 52,
        sourceBillNumber: 'CR-2627-000011',
        narration: 'Cash receipt #52',
      },
      {
        companyId: 1,
        accountId: 1,
        voucherDate: new Date('2026-07-26'),
        debitCreditType: 'CREDIT',
        amount: 598387.97,
        sourceVoucherType: 'CASH_RECEIPT',
        sourceVoucherId: 52,
        sourceBillNumber: 'CR-2627-000011',
        narration: 'Party posting #52',
      }
    ]
  });
  console.log('Recreated balanced GL entries for #52');
  await prisma.$disconnect();
}

fix52().catch(console.error);
