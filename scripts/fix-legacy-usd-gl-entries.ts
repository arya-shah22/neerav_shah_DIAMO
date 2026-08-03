import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { PrismaService } from '../src/backend/database/prisma.service';

async function fixLegacyUsdGlEntries() {
  console.log('🔧 Backfilling originalCurrency and originalAmount on legacy USD GL entries...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);

  const usdAccounts = await prisma.account.findMany({
    where: { accountName: { contains: 'USD' } }
  });

  const usdAccountIds = usdAccounts.map(a => a.id);
  console.log(`Found ${usdAccounts.length} USD Accounts:`, usdAccounts.map(a => a.accountName));

  const updatedEntries = await prisma.generalLedgerEntry.updateMany({
    where: {
      accountId: { in: usdAccountIds },
      originalCurrency: null
    },
    data: {
      originalCurrency: 'USD',
      exchangeRate: 90.0,
    }
  });

  console.log(`Updated ${updatedEntries.count} General Ledger entries for USD accounts.`);

  // Also backfill originalAmount where null for USD accounts
  const usdGlEntries = await prisma.generalLedgerEntry.findMany({
    where: {
      accountId: { in: usdAccountIds },
      originalAmount: null
    }
  });

  for (const ent of usdGlEntries) {
    await prisma.generalLedgerEntry.update({
      where: { id: ent.id },
      data: {
        originalAmount: ent.amount, // if amount was stored as USD principal
      }
    });
  }

  console.log(`Backfilled originalAmount on ${usdGlEntries.length} entries.`);
  await app.close();
}

fixLegacyUsdGlEntries();
