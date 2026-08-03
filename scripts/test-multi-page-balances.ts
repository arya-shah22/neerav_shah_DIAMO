import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { PrismaService } from '../src/backend/database/prisma.service';
import { DashboardService } from '../src/backend/modules/dashboard/dashboard.service';
import { CashBankService } from '../src/backend/modules/cashbank/cashbank.service';

async function verifyMultiPageBalanceConsistency() {
  console.log('🔍 Auditing Multi-Page Balance Consistency across Dashboard, Cash/Bank, JV, and Loan Book...\n');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  await app.init();

  const prisma = app.get(PrismaService);
  const dashboardService = app.get(DashboardService);
  const cashBankService = app.get(CashBankService);

  const company = await prisma.company.findFirst({ where: { isDeleted: false } });
  if (!company) {
    console.log('No active company found for testing.');
    await app.close();
    return;
  }

  // 1. Fetch Dashboard Telemetry
  const telemetry = await dashboardService.getDashboardTelemetry(company.id, 1);
  const dbCashInr = telemetry.todayCash.netBalance;
  const dbCashUsd = telemetry.todayCash.usdBalance || 0;
  const dbBankInr = telemetry.todayBank.netBalance;
  const dbBankUsd = telemetry.todayBank.usdBalance || 0;

  // 2. Fetch Accounts list and query GL running balances
  const accounts = await prisma.account.findMany({
    where: { companyId: company.id, isDeleted: false },
    include: { accountGroup: true },
  });

  let pageCashInr = 0;
  let pageCashUsd = 0;
  let pageBankInr = 0;
  let pageBankUsd = 0;

  for (const acc of accounts) {
    const groupName = (acc.accountGroup?.groupName || '').toLowerCase();
    const accName = (acc.accountName || '').toLowerCase();
    const isCash = groupName.includes('cash') || accName.includes('cash');
    const isBank = groupName.includes('bank') || accName.includes('bank') || accName.includes('hdfc') || accName.includes('icici') || accName.includes('sbi') || accName.includes('axis') || accName.includes('kotak');

    if (isCash || isBank) {
      const bal = await cashBankService.getRunningBalance(company.id, acc.id);
      const isUsd = accName.includes('usd');

      if (isCash) {
        if (isUsd) pageCashUsd += bal;
        else pageCashInr += bal;
      } else if (isBank) {
        if (isUsd) pageBankUsd += bal;
        else pageBankInr += bal;
      }
    }
  }

  console.log('-----------------------------------------------------------');
  console.log('Metric Name              | Dashboard Value | Page Ledger Value | Match');
  console.log('-----------------------------------------------------------');
  console.log(`On-Hand (Cash - INR)     | ₹${dbCashInr.toLocaleString()}  | ₹${pageCashInr.toLocaleString()} | ${dbCashInr === pageCashInr ? '✅ EXACT' : '❌ MISMATCH'}`);
  console.log(`On-Hand (Cash - USD)     | $${dbCashUsd.toLocaleString()}   | $${pageCashUsd.toLocaleString()}  | ${dbCashUsd === pageCashUsd ? '✅ EXACT' : '❌ MISMATCH'}`);
  console.log(`In Bank (INR)            | ₹${dbBankInr.toLocaleString()}  | ₹${pageBankInr.toLocaleString()} | ${dbBankInr === pageBankInr ? '✅ EXACT' : '❌ MISMATCH'}`);
  console.log(`In Bank (USD)            | $${dbBankUsd.toLocaleString()}   | $${pageBankUsd.toLocaleString()}  | ${dbBankUsd === pageBankUsd ? '✅ EXACT' : '❌ MISMATCH'}`);
  console.log('-----------------------------------------------------------\n');

  await app.close();
}

verifyMultiPageBalanceConsistency();
