// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Phase 7 Job Book FSD Test Suite
// ═══════════════════════════════════════════════════════════════

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { PrismaService } from '../src/backend/database/prisma.service';
import { JobService } from '../src/backend/modules/job/job.service';
import { StockStatus, JobType } from '@prisma/client';

async function runJobBookTests() {
  console.log('🧪 Starting Phase 7 (Job Book) Comprehensive Business Rule Tests...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  await app.init();

  const prisma = app.get(PrismaService);
  const jobService = app.get(JobService);

  try {
    // 1. Setup Test Environment
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

    let worker = await prisma.account.findFirst({ where: { companyId: company.id, accountName: 'Master Polisher' } });
    if (!worker) {
      worker = await prisma.account.create({
        data: {
          companyId: company.id,
          accountGroupId: group.id,
          accountName: 'Master Polisher',
          city: 'Surat',
        }
      });
    }

    let quality = await prisma.quality.findFirst({ where: { companyId: company.id, qualityName: 'DIAMO-EX-VVS1' } });
    if (!quality) {
      quality = await prisma.quality.create({
        data: {
          companyId: company.id,
          qualityName: 'DIAMO-EX-VVS1',
          itemCode: 'DIAMO-EX-VVS1',
          hsnNumber: '7113',
          uqc: 'CTS',
        }
      });
    }

    // Clean previous records
    console.log('🧹 Cleaning old test data...');
    await prisma.jobCostEntry.deleteMany({});
    await prisma.jobVoucherItem.deleteMany({});
    await prisma.jobVoucher.deleteMany({ where: { companyId: company.id } });
    await prisma.stockMovement.deleteMany({});
    await prisma.stockPacket.deleteMany({ where: { companyId: company.id } });
    await prisma.generalLedgerEntry.deleteMany({ where: { companyId: company.id } });

    // Create Test Packets
    const pkt1 = await prisma.stockPacket.create({
      data: {
        companyId: company.id,
        qualityId: quality.id,
        stockIdNumber: 'PKT-JOB-001',
        caratWeight: 5.000,
        pieceCount: 1,
        costPerCarat: 10000,
        totalCost: 50000,
        currentStatus: StockStatus.JOB_WORK,
        registrationDate: new Date(),
      }
    });

    const pkt2 = await prisma.stockPacket.create({
      data: {
        companyId: company.id,
        qualityId: quality.id,
        stockIdNumber: 'PKT-JOB-002',
        caratWeight: 2.500,
        pieceCount: 1,
        costPerCarat: 12000,
        totalCost: 30000,
        currentStatus: StockStatus.JOB_WORK,
        registrationDate: new Date(),
      }
    });

    console.log('✅ Setup completed.');

    // ─── TEST CASE 1: Job Expense (Billed Services) Cost Capitalization ───
    console.log('⭐ TEST 1: Creating Job Expense & Verifying Cost Capitalization...');
    const expensePayload = {
      financialYearId: fy.id,
      jobType: JobType.JOB_EXPENSE,
      partyId: worker.id,
      billNumber: 'BILL-EXP-001',
      voucherDate: new Date().toISOString(),
      items: [
        {
          qualityId: quality.id,
          carats: 5.000,
          pieces: 1,
          rate: 3000, // 5.000 * 3000 = 15,000 labor charges
          stockPacketId: pkt1.id,
        }
      ]
    };

    const expVoucher = await jobService.create(company.id, expensePayload);
    console.log(`   ➔ Created Job Expense: ${expVoucher.voucherNumber}`);

    // Verify Cost Entries exist
    const costEntry = await prisma.jobCostEntry.findFirst({ where: { jobVoucherId: expVoucher.id } });
    if (!costEntry || Number(costEntry.amount) !== 15000) {
      throw new Error(`FAIL: Job Cost Entry should be 15,000, got ${costEntry?.amount}`);
    }
    console.log('   ➔ Checked Job Cost Entry creation: SUCCESS');

    // Verify Stock Packet total cost is updated (Raw 50,000 + Labor 15,000 = 65,000)
    const updatedPkt1 = await prisma.stockPacket.findUnique({ where: { id: pkt1.id } });
    if (Number(updatedPkt1?.totalCost) !== 65000) {
      throw new Error(`FAIL: Stock Packet 1 cost should be 65,000, got ${updatedPkt1?.totalCost}`);
    }
    // Verify status changed back to AVAILABLE
    if (updatedPkt1?.currentStatus !== StockStatus.AVAILABLE) {
      throw new Error(`FAIL: Expected status AVAILABLE, got ${updatedPkt1?.currentStatus}`);
    }
    console.log('   ➔ Verified Cost Capitalization & Status Reversion on Packet 1: SUCCESS');

    // ─── TEST CASE 2: Double-Entry Ledger Posting for Job Expense ───
    console.log('⭐ TEST 2: Verifying Double Entry Postings for Job Expense...');
    const glEntries = await prisma.generalLedgerEntry.findMany({
      where: { companyId: company.id, sourceVoucherId: expVoucher.id }
    });

    if (glEntries.length !== 2) {
      throw new Error(`FAIL: Expected 2 General Ledger postings, got ${glEntries.length}`);
    }

    const debitRow = glEntries.find(row => row.debitCreditType === 'DEBIT');
    const creditRow = glEntries.find(row => row.debitCreditType === 'CREDIT');

    if (!debitRow || !creditRow || Number(debitRow.amount) !== 15000 || Number(creditRow.amount) !== 15000) {
      throw new Error('FAIL: GL Debit/Credit entries do not balance or match expected amounts.');
    }
    console.log('   ➔ Checked Balanced GL Postings (Debit/Credit match): SUCCESS');

    // ─── TEST CASE 3: Job Income (Outward Services) Cost Capitalization Check ───
    console.log('⭐ TEST 3: Creating Job Income & Verifying Outward Cost Rules...');
    const incomePayload = {
      financialYearId: fy.id,
      jobType: JobType.JOB_INCOME,
      partyId: worker.id,
      billNumber: 'BILL-INC-001',
      voucherDate: new Date().toISOString(),
      items: [
        {
          qualityId: quality.id,
          carats: 2.500,
          pieces: 1,
          rate: 4000, // 2.500 * 4000 = 10,000 labor income
          stockPacketId: pkt2.id,
        }
      ]
    };

    const incVoucher = await jobService.create(company.id, incomePayload);
    console.log(`   ➔ Created Job Income: ${incVoucher.voucherNumber}`);

    // Verify Stock Packet 2 total cost is NOT updated (Outward jobs do not capitalize onto raw stock assets)
    const updatedPkt2 = await prisma.stockPacket.findUnique({ where: { id: pkt2.id } });
    if (Number(updatedPkt2?.totalCost) !== 30000) {
      throw new Error(`FAIL: Stock Packet 2 cost should remain 30,000, got ${updatedPkt2?.totalCost}`);
    }
    console.log('   ➔ Verified Job Income Outward rules (Total cost unchanged at 30,000): SUCCESS');

    // ─── TEST CASE 4: Revert Cost Capitalization on Deletion ───
    console.log('⭐ TEST 4: Deleting Job Expense Voucher & Verifying Cost Reversion...');
    await jobService.delete(expVoucher.id, company.id);

    // Verify Packet 1 cost is reverted back to raw cost (50,000)
    const deletedPkt1 = await prisma.stockPacket.findUnique({ where: { id: pkt1.id } });
    if (Number(deletedPkt1?.totalCost) !== 50000) {
      throw new Error(`FAIL: Reverted Stock Packet 1 cost should be 50,000, got ${deletedPkt1?.totalCost}`);
    }
    console.log('   ➔ Verified Packet Cost Reverted to 50,000: SUCCESS');

    // Verify GL entries for deleted voucher are gone
    const deletedGl = await prisma.generalLedgerEntry.findMany({
      where: { companyId: company.id, sourceVoucherId: expVoucher.id }
    });
    if (deletedGl.length !== 0) {
      throw new Error(`FAIL: Expected GL entries to be deleted, found ${deletedGl.length}`);
    }
    console.log('   ➔ Verified GL Postings Reversal: SUCCESS');

    console.log('\n🎉 PHASE 7 (JOB BOOK) TEST RUN COMPLETED SUCCESSFULLY WITH ZERO ERRORS!');
  } catch (err: any) {
    console.error('❌ Phase 7 Test Suite Failed:', err.message || err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runJobBookTests();
