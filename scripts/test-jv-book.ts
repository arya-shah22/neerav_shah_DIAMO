// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Phase 8 JV Book FSD Test Suite
// ═══════════════════════════════════════════════════════════════

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { PrismaService } from '../src/backend/database/prisma.service';
import { JournalService } from '../src/backend/modules/journal/journal.service';

async function runJvTests() {
  console.log('🧪 Starting Phase 8 (JV Book) Comprehensive Test Runner...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  await app.init();

  const prisma = app.get(PrismaService);
  const journalService = app.get(JournalService);

  try {
    // Setup test environment
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

    let group = await prisma.accountGroup.findFirst({ where: { companyId: company.id, groupName: 'Sundry Debtors' } });
    if (!group) {
      group = await prisma.accountGroup.create({
        data: { companyId: company.id, groupName: 'Sundry Debtors', nature: 'ASSET' }
      });
    }

    console.log('🧹 Cleaning old JV test data and accounts...');
    await prisma.generalLedgerEntry.deleteMany({ where: { companyId: company.id } });
    await prisma.journalVoucherLine.deleteMany({});
    await prisma.journalVoucher.deleteMany({ where: { companyId: company.id } });
    await prisma.account.deleteMany({ where: { companyId: company.id } });

    let accDr = await prisma.account.create({
      data: { companyId: company.id, accountGroupId: group.id, accountName: 'Dr Account Test', city: 'Surat' }
    });

    let accCr = await prisma.account.create({
      data: { companyId: company.id, accountGroupId: group.id, accountName: 'Cr Account Test', city: 'Surat' }
    });

    // ─── TEST 1: Creation ───
    console.log('⭐ TEST 1: Creating Journal Voucher & Verifying GL Postings...');
    const payload = {
      financialYearId: fy.id,
      voucherDate: new Date().toISOString(),
      drAccountId: accDr.id,
      crAccountId: accCr.id,
      amount: 25000,
      remark1: 'Test Remark 1',
      remark2: 'Test Remark 2',
      remark3: 'Test Remark 3',
      sgst: 2.5,
      cgst: 2.5,
      igst: 0,
      tds: 1.0,
    };

    const jv = await journalService.create(company.id, payload);
    console.log(`   ➔ Created JV: ${jv.voucherNumber}`);

    // Verify Narration stores serialized data correctly
    const parsed = JSON.parse(jv.narration || '{}');
    if (parsed.remark1 !== 'Test Remark 1' || parsed.sgst !== 2.5) {
      throw new Error(`FAIL: Narration does not store custom adjustments correctly, got ${jv.narration}`);
    }
    console.log('   ➔ Checked JSON serialization for custom tax fields & remarks: SUCCESS');

    // Verify double-entry GL postings
    const glEntries = await prisma.generalLedgerEntry.findMany({
      where: { companyId: company.id, sourceVoucherId: jv.id, sourceVoucherType: 'JOURNAL_VOUCHER' }
    });
    if (glEntries.length !== 2) {
      throw new Error(`FAIL: Expected 2 balanced GL lines, got ${glEntries.length}`);
    }
    const drGL = glEntries.find(l => l.debitCreditType === 'DEBIT');
    const crGL = glEntries.find(l => l.debitCreditType === 'CREDIT');
    if (!drGL || !crGL || Number(drGL.amount) !== 25000 || Number(crGL.amount) !== 25000) {
      throw new Error('FAIL: GL debit/credit amount mismatch.');
    }
    console.log('   ➔ Checked Balanced GL entries (debit/credit equal to 25,000): SUCCESS');

    // ─── TEST 2: Deletion Reversal ───
    console.log('⭐ TEST 2: Deleting Journal Voucher & Verifying GL Reversal...');
    await journalService.delete(jv.id, company.id);

    const deletedGL = await prisma.generalLedgerEntry.findMany({
      where: { companyId: company.id, sourceVoucherId: jv.id, sourceVoucherType: 'JOURNAL_VOUCHER' }
    });
    if (deletedGL.length !== 0) {
      throw new Error(`FAIL: GL entries not deleted, found ${deletedGL.length}`);
    }
    console.log('   ➔ Verified GL postings successfully reversed/deleted: SUCCESS');

    // Cleanup accounts and associated lines
    await prisma.journalVoucherLine.deleteMany({});
    await prisma.journalVoucher.deleteMany({ where: { companyId: company.id } });
    await prisma.account.deleteMany({ where: { id: { in: [accDr.id, accCr.id] } } });
    console.log('\n🎉 ALL JOURNAL VOUCHER (JV) TESTS PASSED SUCCESSFULLY!');
  } catch (err: any) {
    console.error('❌ JV Test Suite Failed:', err.message || err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runJvTests();
