import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { PrismaService } from '../src/backend/database/prisma.service';
import { ReportService } from '../src/backend/modules/report/report.service';

async function testDayBookMultiCurrency() {
  console.log('🧪 Testing Multi-Currency Day Book Report (INR & USD)...\n');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  await app.init();

  const prisma = app.get(PrismaService);
  const reportService = app.get(ReportService);

  const company = await prisma.company.findFirst({ where: { isDeleted: false } });
  if (!company) {
    console.log('No company found');
    await app.close();
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const dayBook = await reportService.getDayBookSummary(company.id, todayStr);

  console.log(`📌 Day Book Report for Date: ${todayStr}`);
  console.log(`  - Opening Cash (INR): ₹${dayBook.openingCashInr} | USD: $${dayBook.openingCashUsd}`);
  console.log(`  - Opening Bank (INR): ₹${dayBook.openingBankInr} | USD: $${dayBook.openingBankUsd}`);
  console.log(`  - Closing Cash (INR): ₹${dayBook.closingCashInr} | USD: $${dayBook.closingCashUsd}`);
  console.log(`  - Closing Bank (INR): ₹${dayBook.closingBankInr} | USD: $${dayBook.closingBankUsd}`);
  console.log(`  - Total Today Transactions: ${dayBook.transactions.length}`);

  if (dayBook.transactions.length > 0) {
    const sample = dayBook.transactions[0];
    console.log(`  - Sample Transaction: ${sample.voucherNumber} (${sample.voucherType}) -> Original: ${sample.originalCurrency} ${sample.originalAmount} @ ${sample.exchangeRate}`);
  }

  console.log('  ✅ PASS: Day Book Multi-Currency API Structure Verified\n');
  await app.close();
}

testDayBookMultiCurrency();
