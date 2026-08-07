// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Loan Management E2E Test Suite
// ═══════════════════════════════════════════════════════════════

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { PrismaService } from '../src/backend/database/prisma.service';
import { LoanService } from '../src/backend/modules/loan/loan.service';
import { InterestType, CompoundingFrequency, LoanStatus, DebitCreditType } from '@prisma/client';

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(`❌ ASSERTION FAILED: ${msg}`);
  console.log(`   ✅ ${msg}`);
}

async function runLoanTests() {
  console.log('🧪 Starting Loan Management Comprehensive Test Suite...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  await app.init();

  const prisma = app.get(PrismaService);
  const loanService = app.get(LoanService);

  try {
    // ─── 1. Setup Test Environment ──────────────────────────
    let company = await prisma.company.findFirst({ where: { companyCode: 'TST' } });
    if (!company) {
      company = await prisma.company.create({
        data: {
          companyName: 'DIAMO Test Laboratory',
          companyCode: 'TST',
          panNumber: 'TEST9999AA',
          addressLine1: 'Silicon Valley Surat',
          city: 'Surat',
          pincode: '395007',
        },
      });
    }

    let fy = await prisma.financialYear.findFirst({ where: { companyId: company.id } });
    if (!fy) {
      fy = await prisma.financialYear.create({
        data: {
          companyId: company.id,
          fromDate: new Date('2026-04-01'),
          toDate: new Date('2027-03-31'),
          isActive: true,
        },
      });
    }

    // Create test party
    let partyAccount = await prisma.account.findFirst({
      where: { companyId: company.id, accountName: 'Loan Test Party' },
    });
    if (!partyAccount) {
      const sundryGroup = await prisma.accountGroup.findFirst({
        where: { companyId: company.id, groupName: { contains: 'Sundry Debtors' } },
      });
      partyAccount = await prisma.account.create({
        data: {
          companyId: company.id,
          accountGroupId: sundryGroup?.id || 1,
          accountName: 'Loan Test Party',
          openingBalanceAmount: 0,
          openingBalanceType: DebitCreditType.DEBIT,
        },
      });
    }

    // Create test cash account
    let cashAccount = await prisma.account.findFirst({
      where: { companyId: company.id, accountName: 'Loan Test Cash' },
    });
    if (!cashAccount) {
      const cashGroup = await prisma.accountGroup.findFirst({
        where: { companyId: company.id, groupName: { contains: 'Cash' } },
      });
      cashAccount = await prisma.account.create({
        data: {
          companyId: company.id,
          accountGroupId: cashGroup?.id || 1,
          accountName: 'Loan Test Cash',
          openingBalanceAmount: 100000,
          openingBalanceType: DebitCreditType.DEBIT,
        },
      });
    }

    console.log('\n───────────────────────────────────────────');
    console.log('Test 1: Simple Interest Calculations');
    console.log('───────────────────────────────────────────');

    const simple = loanService.calculateInterest(100000, 12, InterestType.SIMPLE, null, 12);
    assert(simple.totalInterest === 12000, `Simple Interest for 1L@12%/1yr = ₹12,000 (got: ₹${simple.totalInterest})`);
    assert(simple.totalRepayable === 112000, `Total Repayable = ₹1,12,000 (got: ₹${simple.totalRepayable})`);

    const simple6mo = loanService.calculateInterest(50000, 10, InterestType.SIMPLE, null, 6);
    assert(simple6mo.totalInterest === 2500, `Simple Interest for 50K@10%/6mo = ₹2,500 (got: ₹${simple6mo.totalInterest})`);

    console.log('\n───────────────────────────────────────────');
    console.log('Test 2: Compound Interest Calculations');
    console.log('───────────────────────────────────────────');

    const compYearly = loanService.calculateInterest(100000, 10, InterestType.COMPOUND, CompoundingFrequency.YEARLY, 24);
    assert(compYearly.totalInterest === 21000, `Compound Yearly for 1L@10%/2yr = ₹21,000 (got: ₹${compYearly.totalInterest})`);

    const compMonthly = loanService.calculateInterest(100000, 12, InterestType.COMPOUND, CompoundingFrequency.MONTHLY, 12);
    const expectedMonthlyCI = Math.round((100000 * Math.pow(1 + 0.12 / 12, 12 * 1) - 100000) * 100) / 100;
    assert(compMonthly.totalInterest === expectedMonthlyCI, `Compound Monthly for 1L@12%/1yr = ₹${expectedMonthlyCI} (got: ₹${compMonthly.totalInterest})`);

    const compQuarterly = loanService.calculateInterest(200000, 8, InterestType.COMPOUND, CompoundingFrequency.QUARTERLY, 12);
    const expectedQuarterlyCI = Math.round((200000 * Math.pow(1 + 0.08 / 4, 4 * 1) - 200000) * 100) / 100;
    assert(compQuarterly.totalInterest === expectedQuarterlyCI, `Compound Quarterly for 2L@8%/1yr = ₹${expectedQuarterlyCI} (got: ₹${compQuarterly.totalInterest})`);

    console.log('\n───────────────────────────────────────────');
    console.log('Test 3: Loan Given Lifecycle (Active → Partial → Closed)');
    console.log('───────────────────────────────────────────');

    const loanGiven = await loanService.create(company.id, {
      financialYearId: fy.id,
      partyId: partyAccount.id,
      cashBankAccountId: cashAccount.id,
      loanType: 'GIVEN',
      principalAmount: 50000,
      interestRate: 10,
      interestType: 'SIMPLE',
      compoundingFrequency: null,
      durationMonths: 12,
      loanDate: new Date().toISOString(),
      narration: 'E2E Test Loan Given',
    });
    assert(!!loanGiven.id, `Loan Given created: ${loanGiven.voucherNumber}`);

    // Verify GL entries for inception
    const inceptionGl = await prisma.generalLedgerEntry.findMany({
      where: { sourceVoucherId: loanGiven.id, sourceVoucherType: 'LOAN_VOUCHER' },
    });
    assert(inceptionGl.length === 2, 'Two GL entries created for loan inception');

    const cashEntry = inceptionGl.find((e) => e.accountId === cashAccount!.id);
    const partyEntry = inceptionGl.find((e) => e.accountId === partyAccount!.id);
    assert(cashEntry?.debitCreditType === 'CREDIT', 'Cash is CREDITED for Loan Given (money going out)');
    assert(partyEntry?.debitCreditType === 'DEBIT', 'Party is DEBITED for Loan Given (receivable goes up)');

    // Verify Cash & Bank Book synchronization for Loan Inception
    const cbInception = await prisma.cashBankVoucher.findFirst({
      where: { companyId: company.id, referenceBillNo: loanGiven.voucherNumber }
    });
    assert(!!cbInception, `Cash & Bank Book synchronised: Inception Voucher generated (${cbInception?.voucherNumber})`);
    assert(Number(cbInception?.amount) === 50000, `Inception cash amount matches principal amount`);

    // Repayment 1: Partial
    const repay1 = await loanService.repay(company.id, {
      loanId: loanGiven.id,
      amount: 20000,
      cashBankAccountId: cashAccount.id,
      paymentDate: new Date().toISOString(),
      narration: 'Partial repayment',
    });
    assert(!!repay1.id, 'Repayment 1 (₹20,000) recorded');

    // Verify Cash & Bank Book synchronization for Repayment
    const cbRepayment = await prisma.cashBankVoucher.findFirst({
      where: { companyId: company.id, referenceBillNo: loanGiven.voucherNumber, NOT: { id: cbInception?.id } }
    });
    assert(!!cbRepayment, `Cash & Bank Book synchronised: Repayment Voucher generated (${cbRepayment?.voucherNumber})`);
    assert(Number(cbRepayment?.amount) === 20000, `Repayment cash amount matches paid amount`);

    let freshLoan = await prisma.loan.findUnique({ where: { id: loanGiven.id } });
    assert(Number(freshLoan?.amountRepaid) === 20000, `Amount Repaid updated to ₹20,000`);
    assert(freshLoan?.status === LoanStatus.PARTIAL, `Loan status changed to PARTIAL`);

    // Repayment 2: Close out the loan
    const remainingBalance = Number(freshLoan?.balanceRemaining) || 0;
    const repay2 = await loanService.repay(company.id, {
      loanId: loanGiven.id,
      amount: remainingBalance,
      cashBankAccountId: cashAccount.id,
      paymentDate: new Date().toISOString(),
      narration: 'Final settlement',
    });
    assert(!!repay2.id, `Repayment 2 (₹${remainingBalance}) recorded`);

    freshLoan = await prisma.loan.findUnique({ where: { id: loanGiven.id } });
    assert(freshLoan?.status === LoanStatus.CLOSED, `Loan status changed to CLOSED`);
    assert(Number(freshLoan?.balanceRemaining) <= 0.01, `Balance remaining is effectively ₹0`);

    // Verify all GL entries (inception + 2 repayments = 6 entries)
    const allGl = await prisma.generalLedgerEntry.findMany({
      where: { sourceVoucherId: loanGiven.id, sourceVoucherType: 'LOAN_VOUCHER' },
    });
    assert(allGl.length === 6, `6 GL entries total for full lifecycle (got: ${allGl.length})`);

    console.log('\n───────────────────────────────────────────');
    console.log('Test 4: Loan Taken Ledger Direction');
    console.log('───────────────────────────────────────────');

    const loanTaken = await loanService.create(company.id, {
      financialYearId: fy.id,
      partyId: partyAccount.id,
      cashBankAccountId: cashAccount.id,
      loanType: 'TAKEN',
      principalAmount: 30000,
      interestRate: 8,
      interestType: 'COMPOUND',
      compoundingFrequency: 'QUARTERLY',
      durationMonths: 12,
      loanDate: new Date().toISOString(),
      narration: 'E2E Test Loan Taken',
    });
    assert(!!loanTaken.id, `Loan Taken created: ${loanTaken.voucherNumber}`);

    const takenGl = await prisma.generalLedgerEntry.findMany({
      where: { sourceVoucherId: loanTaken.id, sourceVoucherType: 'LOAN_VOUCHER' },
    });
    const takenCashEntry = takenGl.find((e) => e.accountId === cashAccount!.id);
    const takenPartyEntry = takenGl.find((e) => e.accountId === partyAccount!.id);
    assert(takenCashEntry?.debitCreditType === 'DEBIT', 'Cash is DEBITED for Loan Taken (money coming in)');
    assert(takenPartyEntry?.debitCreditType === 'CREDIT', 'Party is CREDITED for Loan Taken (payable goes up)');

    console.log('\n───────────────────────────────────────────');
    console.log('Test 5: Delete Loan & Reverse GL');
    console.log('───────────────────────────────────────────');

    await loanService.delete(loanTaken.id, company.id);
    const deletedLoan = await prisma.loan.findUnique({ where: { id: loanTaken.id } });
    assert(deletedLoan?.isDeleted === true, 'Loan Taken soft deleted');

    const deletedGl = await prisma.generalLedgerEntry.findMany({
      where: { sourceVoucherId: loanTaken.id, sourceVoucherType: 'LOAN_VOUCHER' },
    });
    assert(deletedGl.length === 0, 'GL entries purged for deleted loan');

    console.log('\n───────────────────────────────────────────');
    console.log('Test 6: PDF Statement Generation');
    console.log('───────────────────────────────────────────');

    const pdfBuffer = await loanService.generateStatementPdf(company.id);
    assert(pdfBuffer.length > 100, `PDF generated successfully (${pdfBuffer.length} bytes)`);

    // ─── CLEANUP ─────────────────────────────────────────────
    console.log('\n🧹 Cleaning up test data...');
    await prisma.loanRepayment.deleteMany({ where: { loan: { companyId: company.id } } });
    await prisma.generalLedgerEntry.deleteMany({
      where: { companyId: company.id, sourceVoucherType: 'LOAN_VOUCHER' },
    });
    await prisma.loan.deleteMany({ where: { companyId: company.id } });

    console.log('\n🎉 ALL LOAN MANAGEMENT TESTS COMPLETED SUCCESSFULLY WITH ZERO ERRORS!\n');
  } catch (error) {
    console.error('\n💥 TEST FAILED:', (error as Error).message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runLoanTests();
