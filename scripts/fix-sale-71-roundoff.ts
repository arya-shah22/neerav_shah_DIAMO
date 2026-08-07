import { PrismaClient } from '@prisma/client';
import { getOrCreateDefaultAccount } from '../src/backend/utils/default-account-helper';

async function fixSale71() {
  const prisma = new PrismaClient();
  const roundOffLedgerId = await getOrCreateDefaultAccount(
    prisma,
    1,
    'Round-off A/c',
    'Indirect Expenses',
    'Expense',
  );

  await prisma.generalLedgerEntry.create({
    data: {
      companyId: 1,
      accountId: roundOffLedgerId,
      voucherDate: new Date('2026-07-26'),
      debitCreditType: 'CREDIT',
      amount: 0.5,
      sourceVoucherType: 'SALE_INVOICE',
      sourceVoucherId: 71,
      sourceBillNumber: 'SALE-2627-000011',
      narration: 'Round off adjustment',
    },
  });

  console.log('Created Round-off GL entry for Sale #71');
  await prisma.$disconnect();
}

fixSale71().catch(console.error);
