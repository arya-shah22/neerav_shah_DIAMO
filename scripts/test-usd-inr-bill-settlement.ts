import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { PrismaService } from '../src/backend/database/prisma.service';
import { CashBankService } from '../src/backend/modules/cashbank/cashbank.service';
import { InvoiceService } from '../src/backend/modules/invoice/invoice.service';
import { CashBankType, InvoiceType, PaymentStatus } from '@prisma/client';

async function verifyUsdInrBillSettlements() {
  console.log('🧪 Running USD & INR Bill Adjustment Knock-Off Verification...\n');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  await app.init();

  const prisma = app.get(PrismaService);
  const cashBankService = app.get(CashBankService);
  const invoiceService = app.get(InvoiceService);

  let company = await prisma.company.findFirst({ where: { companyCode: 'V5A' } });
  if (!company) {
    company = await prisma.company.create({
      data: {
        companyName: 'Voucher Audit Co',
        companyCode: 'V5A',
        panNumber: 'AUDITCO5A1',
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

  let party = await prisma.account.findFirst({ where: { companyId: company.id, accountName: 'Settlement Audit Customer' } });
  if (!party) {
    let group = await prisma.accountGroup.findFirst({ where: { companyId: company.id, groupName: 'Sundry Debtors' } });
    if (!group) {
      group = await prisma.accountGroup.create({ data: { companyId: company.id, groupName: 'Sundry Debtors', nature: 'ASSET' } });
    }
    party = await prisma.account.create({
      data: { companyId: company.id, accountGroupId: group.id, accountName: 'Settlement Audit Customer', city: 'Surat' }
    });
  }

  const bankAccountINR = await prisma.account.findFirst({ where: { companyId: company.id, accountName: 'Bank Account' } });
  const bankAccountUSD = await prisma.account.findFirst({ where: { companyId: company.id, accountName: 'Bank Account (USD)' } });

  // 1. Create USD Sales Invoice ($12,000.00 @ ₹90/$)
  const saleUSD = await invoiceService.create(company.id, {
    financialYearId: fy.id,
    invoiceType: InvoiceType.SALE_INVOICE,
    customerId: party.id,
    customerName: party.accountName,
    placeOfSupply: 'Surat',
    transactionCurrency: 'USD',
    exchangeRate: 90.00,
    invoiceDate: new Date().toISOString(),
    items: [
      {
        rowNumber: 1,
        qualityId: 1,
        shape: 'Round',
        carats: 100.0,
        pieces: 1,
        rate: 120,
        amount: 12000,
        cgstPercent: 0,
        cgstAmount: 0,
        sgstPercent: 0,
        sgstAmount: 0,
        igstPercent: 0,
        igstAmount: 0,
        netAmount: 12000,
      },
    ],
  });

  console.log(`📌 Created USD Sale Invoice: ${saleUSD.voucherNumber} (Amount: $${saleUSD.netAmount})`);

  // 2. Full Settlement of USD Sales Invoice ($12,000.00)
  await cashBankService.create(company.id, {
    financialYearId: fy.id,
    transactionType: CashBankType.BANK_RECEIPT,
    partyId: party.id,
    cashBankAccountId: bankAccountUSD!.id,
    amount: 12000,
    transactionCurrency: 'USD',
    exchangeRate: 90.00,
    amountAlt: 1080000,
    referenceBillNo: saleUSD.voucherNumber,
    voucherDate: new Date().toISOString(),
    narration: 'Settlement verification test USD',
  });

  const updatedUSD = await prisma.saleInvoice.findUnique({ where: { id: saleUSD.id } });
  const usdPass = updatedUSD?.paymentStatus === PaymentStatus.PAID && Number(updatedUSD?.outstandingAmount) === 0;
  console.log(`  ${usdPass ? '✅ PASS' : '❌ FAIL'}: USD Bill Knock-Off -> Status: ${updatedUSD?.paymentStatus}, Outstanding: $${updatedUSD?.outstandingAmount}`);

  // 3. Create INR Sales Invoice (₹50,000.00)
  const saleINR = await invoiceService.create(company.id, {
    financialYearId: fy.id,
    invoiceType: InvoiceType.SALE_INVOICE,
    customerId: party.id,
    customerName: party.accountName,
    placeOfSupply: 'Surat',
    transactionCurrency: 'INR',
    exchangeRate: 1.00,
    invoiceDate: new Date().toISOString(),
    items: [
      {
        rowNumber: 1,
        qualityId: 1,
        shape: 'Round',
        carats: 10.0,
        pieces: 1,
        rate: 5000,
        amount: 50000,
        cgstPercent: 0,
        cgstAmount: 0,
        sgstPercent: 0,
        sgstAmount: 0,
        igstPercent: 0,
        igstAmount: 0,
        netAmount: 50000,
      },
    ],
  });

  console.log(`📌 Created INR Sale Invoice: ${saleINR.voucherNumber} (Amount: ₹${saleINR.netAmount})`);

  // 4. Full Settlement of INR Sales Invoice (₹50,000.00)
  await cashBankService.create(company.id, {
    financialYearId: fy.id,
    transactionType: CashBankType.BANK_RECEIPT,
    partyId: party.id,
    cashBankAccountId: bankAccountINR!.id,
    amount: 50000,
    transactionCurrency: 'INR',
    exchangeRate: 1.00,
    amountAlt: 50000,
    referenceBillNo: saleINR.voucherNumber,
    voucherDate: new Date().toISOString(),
    narration: 'Settlement verification test INR',
  });

  const updatedINR = await prisma.saleInvoice.findUnique({ where: { id: saleINR.id } });
  const inrPass = updatedINR?.paymentStatus === PaymentStatus.PAID && Number(updatedINR?.outstandingAmount) === 0;
  console.log(`  ${inrPass ? '✅ PASS' : '❌ FAIL'}: INR Bill Knock-Off -> Status: ${updatedINR?.paymentStatus}, Outstanding: ₹${updatedINR?.outstandingAmount}\n`);

  await app.close();
}

verifyUsdInrBillSettlements();
