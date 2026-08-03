import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { PrismaService } from '../src/backend/database/prisma.service';

async function inspectVoucher() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const gl = await prisma.generalLedgerEntry.findMany({
    where: { sourceBillNumber: 'CP-AUG2627-000015' }
  });
  console.log('GL ENTRIES for CP-AUG2627-000015:', gl);
  const cb = await prisma.cashBankVoucher.findMany({
    where: { voucherNumber: 'CP-AUG2627-000015' }
  });
  console.log('CASH BANK VOUCHERS for CP-AUG2627-000015:', cb);

  const usdAccount = await prisma.account.findFirst({
    where: { accountName: { contains: 'USD' } }
  });
  console.log('USD ACCOUNT:', usdAccount);
  
  if (usdAccount) {
    const allGlForUsd = await prisma.generalLedgerEntry.findMany({
      where: { accountId: usdAccount.id }
    });
    console.log('ALL GL ENTRIES FOR USD ACCOUNT:', allGlForUsd);
  }

  await app.close();
}
inspectVoucher();
