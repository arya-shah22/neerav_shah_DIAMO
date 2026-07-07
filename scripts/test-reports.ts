// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Phase 11 Reports E2E Test Suite
// ═══════════════════════════════════════════════════════════════

import { PrismaClient, DebitCreditType } from '@prisma/client';
import { ReportService } from '../src/backend/modules/report/report.service';
import { PrismaService } from '../src/backend/database/prisma.service';

const prisma = new PrismaClient();
const prismaService = prisma as unknown as PrismaService;
const reportService = new ReportService();
(reportService as any).prisma = prismaService;

async function runTests() {
  console.log('🚀 Starting Phase 11 Reports Integration & E2E Testing...');
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log('⚠️ No company found in database. Skipping test.');
    return;
  }
  const companyId = company.id;

  // Clean up any stale test data
  await prisma.generalLedgerEntry.deleteMany({ where: { accountId: 9911 } });
  await prisma.account.deleteMany({ where: { id: 9911 } });
  await prisma.accountGroup.deleteMany({ where: { id: 9901 } });

  // 1. Create a parent asset group and party account
  console.log('\n--- Setup Sample Chart of Accounts ---');
  const assetGroup = await prisma.accountGroup.create({
    data: {
      id: 9901,
      companyId,
      groupName: 'Current Assets (Debtors)',
      parentGroupId: null,
      nature: 'Assets',
    },
  });

  const debtorAccount = await prisma.account.create({
    data: {
      id: 9911,
      companyId,
      accountGroupId: assetGroup.id,
      accountName: 'Ajay Shah (Debtor)',
      printName: 'Ajay Shah',
      openingBalanceAmount: 50000,
      openingBalanceType: DebitCreditType.DEBIT,
      status: 'ACTIVE',
    },
  });

  // 2. Post ledger entries
  console.log('\n--- Posting Sample Double-Entry Ledger Postings ---');
  await prisma.generalLedgerEntry.createMany({
    data: [
      {
        companyId,
        accountId: debtorAccount.id,
        voucherDate: new Date('2026-07-01'),
        debitCreditType: DebitCreditType.DEBIT,
        amount: 25000,
        sourceVoucherType: 'SALE_INVOICE',
        sourceVoucherId: 1,
        sourceBillNumber: 'INV-001',
        narration: 'Sold diamond qualities',
      },
      {
        companyId,
        accountId: debtorAccount.id,
        voucherDate: new Date('2026-07-05'),
        debitCreditType: DebitCreditType.CREDIT,
        amount: 15000,
        sourceVoucherType: 'CASH_RECEIPT',
        sourceVoucherId: 2,
        sourceBillNumber: 'REC-001',
        narration: 'Partial payment received',
      },
    ],
  });

  // 3. Test General Ledger Report
  console.log('\n--- Test Case 1: General Ledger Statement ---');
  const ledger = await reportService.getLedger(companyId, debtorAccount.id);
  console.log(`Account Name: ${ledger.accountName}`);
  console.log(`Opening Balance: ₹${ledger.openingBalance} (Expected: 50000)`);
  console.log(`Statement Row 1 Running: ₹${ledger.statements[0].runningBalance} (Expected: 75000)`);
  console.log(`Statement Row 2 Running: ₹${ledger.statements[1].runningBalance} (Expected: 60000)`);
  console.log(`Closing Balance: ₹${ledger.closingBalance} (Expected: 60000)`);

  if (
    ledger.openingBalance === 50000 &&
    ledger.statements[0].runningBalance === 75000 &&
    ledger.statements[1].runningBalance === 60000 &&
    ledger.closingBalance === 60000
  ) {
    console.log('✅ General Ledger report validated successfully.');
  } else {
    throw new Error('❌ General Ledger calculation mismatch!');
  }

  // 4. Test Trial Balance Report
  console.log('\n--- Test Case 2: Trial Balance Summary ---');
  const trial = await reportService.getTrialBalance(companyId);
  console.log(`Total Debits: ₹${trial.totalDebit} (Expected: 60000)`);
  console.log(`Total Credits: ₹${trial.totalCredit} (Expected: 0)`);
  console.log(`Variance: ₹${trial.variance} (Expected: 60000)`); // Debits only debtor, hence variance 60000 until counter-postings

  if (trial.totalDebit === 60000 && trial.totalCredit === 0) {
    console.log('✅ Trial Balance balances validated successfully.');
  } else {
    throw new Error('❌ Trial Balance calculation mismatch!');
  }

  // 5. Test Profit & Loss Statement
  console.log('\n--- Test Case 3: Profit & Loss Statement ---');
  const pl = await reportService.getProfitLoss(companyId);
  console.log(`Net Profit: ₹${pl.netProfit} (Expected: 0)`); // Ledger entries do not have direct P&L revenue groups mapped in this test
  console.log('✅ Profit & Loss report generated successfully.');

  // Clean up
  console.log('\n🧹 Cleaning up test database records...');
  await prisma.generalLedgerEntry.deleteMany({ where: { accountId: 9911 } });
  await prisma.account.deleteMany({ where: { id: 9911 } });
  await prisma.accountGroup.deleteMany({ where: { id: 9901 } });

  console.log('\n🎉 ALL INTEGRATION REPORTS TESTS COMPLETED SUCCESSFULLY WITH ZERO ERRORS!');
}

runTests()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
