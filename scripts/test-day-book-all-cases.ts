import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { PrismaService } from '../src/backend/database/prisma.service';
import { ReportService } from '../src/backend/modules/report/report.service';
import { CashBankService } from '../src/backend/modules/cashbank/cashbank.service';
import { LoanService } from '../src/backend/modules/loan/loan.service';
import { CashBankType, LoanType, InterestType } from '@prisma/client';

async function testDayBookAllCases() {
  console.log('🧪 RUNNING COMPREHENSIVE DAY BOOK SUITE FOR ALL POSSIBLE TEST CASES...\n');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  await app.init();

  const prisma = app.get(PrismaService);
  const reportService = app.get(ReportService);
  const cashBankService = app.get(CashBankService);
  const loanService = app.get(LoanService);

  let company = await prisma.company.findFirst({ where: { companyCode: 'V5B' } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        companyName: 'DayBook Audit Corp',
        companyCode: 'V5B',
        panNumber: 'DAYBOOK5B1',
        addressLine1: 'Ring Road',
        city: 'Surat',
        stateCode: '24',
        pincode: '395003',
      },
    });
  }

  let fy = await prisma.financialYear.findFirst({ where: { companyId: company.id, isDeleted: false } });
  if (!fy) {
    fy = await prisma.financialYear.create({
      data: {
        companyId: company.id,
        fromDate: new Date('2026-04-01'),
        toDate: new Date('2027-03-31'),
        isClosed: false,
      },
    });
  }

  await prisma.generalLedgerEntry.deleteMany({ where: { companyId: company.id } });
  await prisma.cashBankVoucher.deleteMany({ where: { companyId: company.id } });
  await prisma.loanRepayment.deleteMany({ where: { loan: { companyId: company.id } } });
  await prisma.loan.deleteMany({ where: { companyId: company.id } });

  let party = await prisma.account.findFirst({ where: { companyId: company.id, accountName: 'Day Book Audit Party' } });
  if (!party) {
    let group = await prisma.accountGroup.findFirst({ where: { companyId: company.id, groupName: 'Sundry Debtors' } });
    if (!group) {
      group = await prisma.accountGroup.create({ data: { companyId: company.id, groupName: 'Sundry Debtors', nature: 'ASSET' } });
    }
    party = await prisma.account.create({
      data: { companyId: company.id, accountGroupId: group.id, accountName: 'Day Book Audit Party', city: 'Surat' }
    });
  }

  const cashAccountINR = await prisma.account.findFirst({ where: { companyId: company.id, accountName: 'Cash Account' } });
  const cashAccountUSD = await prisma.account.findFirst({ where: { companyId: company.id, accountName: 'Cash Account (USD)' } });
  const bankAccountUSD = await prisma.account.findFirst({ where: { companyId: company.id, accountName: 'Bank Account (USD)' } });

  let passed = 0;
  let failed = 0;

  function assertTest(name: string, condition: boolean, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${name} ${details ? `(${details})` : ''}`);
      passed++;
    } else {
      console.log(`  ❌ FAIL: ${name} ${details ? `(${details})` : ''}`);
      failed++;
    }
  }

  // Define test dates
  const day1Str = '2026-08-01';
  const day2Str = '2026-08-02';
  const day1Date = new Date(day1Str + 'T12:00:00');
  const day2Date = new Date(day2Str + 'T12:00:00');

  // TEST 1: INR Cash Receipt on Day 1 (₹10,000)
  await cashBankService.create(company.id, {
    financialYearId: fy.id,
    transactionType: CashBankType.CASH_RECEIPT,
    partyId: party.id,
    cashBankAccountId: cashAccountINR!.id,
    amount: 10000,
    transactionCurrency: 'INR',
    exchangeRate: 1.0,
    amountAlt: 10000,
    voucherDate: day1Date.toISOString(),
    narration: 'Day 1 INR Cash Receipt',
  });

  // TEST 2: USD Cash Receipt on Day 1 ($5,000 @ ₹90/$)
  await cashBankService.create(company.id, {
    financialYearId: fy.id,
    transactionType: CashBankType.CASH_RECEIPT,
    partyId: party.id,
    cashBankAccountId: cashAccountUSD!.id,
    amount: 5000,
    transactionCurrency: 'USD',
    exchangeRate: 90.0,
    amountAlt: 450000,
    voucherDate: day1Date.toISOString(),
    narration: 'Day 1 USD Cash Receipt',
  });

  // TEST 3: USD Bank Receipt on Day 1 ($15,000 @ ₹90/$)
  await cashBankService.create(company.id, {
    financialYearId: fy.id,
    transactionType: CashBankType.BANK_RECEIPT,
    partyId: party.id,
    cashBankAccountId: bankAccountUSD!.id,
    amount: 15000,
    transactionCurrency: 'USD',
    exchangeRate: 90.0,
    amountAlt: 1350000,
    voucherDate: day1Date.toISOString(),
    narration: 'Day 1 USD Bank Receipt',
  });

  // Verify Day 1 Summary
  const day1Summary = await reportService.getDayBookSummary(company.id, day1Str);
  assertTest('Day 1 Closing Cash INR', day1Summary.closingCashInr === 10000, `Expected ₹10,000, Got ₹${day1Summary.closingCashInr}`);
  assertTest('Day 1 Closing Cash USD', day1Summary.closingCashUsd === 5000, `Expected $5,000, Got $${day1Summary.closingCashUsd}`);
  assertTest('Day 1 Closing Bank USD', day1Summary.closingBankUsd === 15000, `Expected $15,000, Got $${day1Summary.closingBankUsd}`);
  assertTest('Day 1 Transaction Count', day1Summary.transactions.length === 6, `Expected 6 GL Entries, Got ${day1Summary.transactions.length}`);

  // TEST 4: Day 2 Opening Balance Continuity Check
  const day2Summary = await reportService.getDayBookSummary(company.id, day2Str);
  assertTest('Day 2 Opening Cash INR equals Day 1 Closing Cash INR', day2Summary.openingCashInr === day1Summary.closingCashInr, `Opening: ₹${day2Summary.openingCashInr}`);
  assertTest('Day 2 Opening Cash USD equals Day 1 Closing Cash USD', day2Summary.openingCashUsd === day1Summary.closingCashUsd, `Opening: $${day2Summary.openingCashUsd}`);
  assertTest('Day 2 Opening Bank USD equals Day 1 Closing Bank USD', day2Summary.openingBankUsd === day1Summary.closingBankUsd, `Opening: $${day2Summary.openingBankUsd}`);

  // TEST 5: Day 2 USD Loan Creation ($2,000 Given)
  await loanService.create(company.id, {
    financialYearId: fy.id,
    loanType: LoanType.GIVEN,
    partyId: party.id,
    cashBankAccountId: cashAccountUSD!.id,
    transactionCurrency: 'USD',
    exchangeRate: 90.0,
    principalAmount: 2000,
    principalAmountAlt: 180000,
    interestRate: 10.0,
    interestType: InterestType.SIMPLE,
    compoundingFrequency: null,
    durationMonths: 12,
    loanDate: day2Date.toISOString(),
    narration: 'Day 2 USD Loan Outflow',
  });

  const updatedDay2Summary = await reportService.getDayBookSummary(company.id, day2Str);
  assertTest('Day 2 Closing Cash USD after $2,000 Loan Given', updatedDay2Summary.closingCashUsd === 3000, `Expected $3,000 ($5,000 - $2,000), Got $${updatedDay2Summary.closingCashUsd}`);

  // TEST 6: Multi-Currency Transaction Detail Formatting
  const usdTx = updatedDay2Summary.transactions.find((t: any) => t.originalCurrency === 'USD');
  assertTest('Day Book Transaction Original Currency', usdTx?.originalCurrency === 'USD', `Currency: ${usdTx?.originalCurrency}`);
  assertTest('Day Book Transaction Exchange Rate', Number(usdTx?.exchangeRate) === 90, `Exchange Rate: ${usdTx?.exchangeRate}`);

  // TEST 7: Date List Grid Multi-Currency Aggregation
  const datesList = await reportService.getDayBookDatesList(company.id, day1Str, day2Str);
  const day1Grid = datesList.find((d: any) => d.dateStr === day1Str);
  const day2Grid = datesList.find((d: any) => d.dateStr === day2Str);

  assertTest('Date Grid Day 1 Closing Cash USD', day1Grid?.closingCashUsd === 5000, `Grid USD: $${day1Grid?.closingCashUsd}`);
  assertTest('Date Grid Day 2 Opening Cash USD', day2Grid?.openingCashUsd === 5000, `Grid USD: $${day2Grid?.openingCashUsd}`);
  assertTest('Date Grid Day 2 Closing Cash USD', day2Grid?.closingCashUsd === 3000, `Grid USD: $${day2Grid?.closingCashUsd}`);

  console.log('\n-----------------------------------------------------------');
  console.log(`📊 DAY BOOK SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED out of ${passed + failed} CASES`);
  console.log('-----------------------------------------------------------\n');

  await app.close();
}

testDayBookAllCases();
