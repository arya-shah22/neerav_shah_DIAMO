import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { PrismaService } from '../src/backend/database/prisma.service';
import { LoanService } from '../src/backend/modules/loan/loan.service';
import { CashBankService } from '../src/backend/modules/cashbank/cashbank.service';
import { LoanType, InterestType, LoanStatus } from '@prisma/client';

async function testUsdLoanCreation() {
  console.log('🧪 Testing Multi-Currency USD Loan Inception & Repayment...\n');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  await app.init();

  const prisma = app.get(PrismaService);
  const loanService = app.get(LoanService);
  const cashBankService = app.get(CashBankService);

  let company = await prisma.company.findFirst({ where: { companyCode: 'V5A' } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        companyName: 'Loan Test Co',
        companyCode: 'V5A',
        panNumber: 'LOANTEST1A',
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

  await cashBankService.ensureDefaultAccounts(company.id);

  let party = await prisma.account.findFirst({ where: { companyId: company.id, accountName: 'USD Loan Party' } });
  if (!party) {
    let group = await prisma.accountGroup.findFirst({ where: { companyId: company.id, groupName: 'Sundry Debtors' } });
    if (!group) {
      group = await prisma.accountGroup.create({ data: { companyId: company.id, groupName: 'Sundry Debtors', nature: 'ASSET' } });
    }
    party = await prisma.account.create({
      data: { companyId: company.id, accountGroupId: group.id, accountName: 'USD Loan Party', city: 'Surat' }
    });
  }

  const bankAccountUSD = await prisma.account.findFirst({ where: { companyId: company.id, accountName: 'Bank Account (USD)' } });

  // 1. Create USD Loan Given ($10,000.00 @ 10% Simple Interest for 12 Months)
  const usdLoan = await loanService.create(company.id, {
    financialYearId: fy.id,
    loanType: LoanType.GIVEN,
    partyId: party.id,
    cashBankAccountId: bankAccountUSD!.id,
    transactionCurrency: 'USD',
    exchangeRate: 90.00,
    principalAmount: 10000,
    principalAmountAlt: 900000,
    interestRate: 10.0,
    interestType: InterestType.SIMPLE,
    compoundingFrequency: null,
    durationMonths: 12,
    loanDate: new Date().toISOString(),
    narration: 'USD Loan Test Inception',
  });

  console.log(`📌 Created USD Loan: ${usdLoan.voucherNumber}`);
  console.log(`  - Currency: ${usdLoan.transactionCurrency}`);
  console.log(`  - Principal: $${usdLoan.principalAmount}`);
  console.log(`  - Total Repayable: $${usdLoan.totalRepayable}`);

  const loanPass = usdLoan.transactionCurrency === 'USD' && Number(usdLoan.principalAmount) === 10000 && Number(usdLoan.totalRepayable) === 11000;
  console.log(`  ${loanPass ? '✅ PASS' : '❌ FAIL'}: USD Loan Creation`);

  // 2. Repay USD Loan ($5,500.00)
  await loanService.repay(company.id, {
    loanId: usdLoan.id,
    amount: 5500,
    cashBankAccountId: bankAccountUSD!.id,
    paymentDate: new Date().toISOString(),
    narration: 'USD Loan Repayment 50%',
  });

  const updatedLoan = await prisma.loan.findUnique({ where: { id: usdLoan.id } });
  const repayPass = updatedLoan?.status === LoanStatus.PARTIAL && Number(updatedLoan?.amountRepaid) === 5500;
  console.log(`  ${repayPass ? '✅ PASS' : '❌ FAIL'}: USD Loan Partial Repayment -> Status: ${updatedLoan?.status}, Repaid: $${updatedLoan?.amountRepaid}\n`);

  await app.close();
}

testUsdLoanCreation();
