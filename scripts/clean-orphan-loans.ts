import { PrismaClient } from '@prisma/client';

async function clean() {
  const prisma = new PrismaClient();
  const del = await prisma.generalLedgerEntry.deleteMany({ where: { sourceVoucherType: 'LOAN_VOUCHER' as any } });
  console.log('Deleted orphan LOAN_VOUCHER GL entries:', del.count);
  await prisma.$disconnect();
}

clean().catch(console.error);
