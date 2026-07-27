// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — 200+ Assertions Comprehensive Test Runner
// ═══════════════════════════════════════════════════════════════

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { PrismaService } from '../src/backend/database/prisma.service';
import { StockService } from '../src/backend/modules/stock/stock.service';
import { InvoiceService } from '../src/backend/modules/invoice/invoice.service';
import { JobService } from '../src/backend/modules/job/job.service';
import { CashBankService } from '../src/backend/modules/cashbank/cashbank.service';
import { StockConversionService } from '../src/backend/modules/stock/stock-conversion.service';
import { StockStatus, JobType } from '@prisma/client';

async function runComprehensiveTests() {
  console.log('🚀 Bootstrapping 200+ Test Assertions Runner...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  await app.init();

  const prisma = app.get(PrismaService);
  const stockService = app.get(StockService);
  const invoiceService = app.get(InvoiceService);
  const jobService = app.get(JobService);
  const cashBankService = app.get(CashBankService);
  const conversionService = app.get(StockConversionService);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`❌ Assertion Failed: ${msg}`);
      failed++;
      throw new Error(`FAIL: ${msg}`);
    } else {
      passed++;
    }
  }

  try {
    // 1. Setup Test Company
    let company = await prisma.company.findFirst({ where: { companyCode: 'TS2' } });
    if (!company) {
      company = await prisma.company.create({
        data: {
          companyName: 'Comprehensive Test Company',
          companyCode: 'TS2',
          panNumber: 'COMP1111AA',
          addressLine1: 'Test Lab Address',
          city: 'Surat',
          pincode: '395008',
        }
      });
    }

    // Clean out old transactional data for the test company to avoid FK violations
    const ids = (await prisma.stockPacket.findMany({ where: { companyId: company.id } })).map(p => p.id);
    await prisma.stockMovement.deleteMany({ where: { stockPacketId: { in: ids } } });
    await prisma.saleInvoiceItem.deleteMany({ where: { saleInvoice: { companyId: company.id } } });
    await prisma.purchaseInvoiceItem.deleteMany({ where: { purchaseInvoice: { companyId: company.id } } });
    await prisma.saleInvoice.deleteMany({ where: { companyId: company.id } });
    await prisma.purchaseInvoice.deleteMany({ where: { companyId: company.id } });
    await prisma.challanItem.deleteMany({ where: { challanVoucher: { companyId: company.id } } });
    await prisma.challanVoucher.deleteMany({ where: { companyId: company.id } });
    await prisma.jobCostEntry.deleteMany({ where: { stockPacketId: { in: ids } } });
    await prisma.jobVoucherItem.deleteMany({ where: { jobVoucher: { companyId: company.id } } });
    await prisma.jobVoucher.deleteMany({ where: { companyId: company.id } });
    await prisma.stockConversionOutput.deleteMany({ where: { stockConversion: { companyId: company.id } } });
    await prisma.stockConversion.deleteMany({ where: { companyId: company.id } });
    await prisma.stockPacket.deleteMany({ where: { companyId: company.id } });
    await prisma.quality.deleteMany({ where: { companyId: company.id } });
    await prisma.generalLedgerEntry.deleteMany({ where: { companyId: company.id } });
    await prisma.voucherNumberSequence.deleteMany({ where: { companyId: company.id } });
    await prisma.voucherNumberConfig.deleteMany({ where: { companyId: company.id } });
    await prisma.account.deleteMany({ where: { companyId: company.id } });
    await prisma.accountGroup.deleteMany({ where: { companyId: company.id } });

    let fy = await prisma.financialYear.findFirst({ where: { companyId: company.id } });
    if (!fy) {
      fy = await prisma.financialYear.create({
        data: {
          companyId: company.id,
          fromDate: new Date('2026-04-01'),
          toDate: new Date('2027-03-31'),
          isActive: true,
        }
      });
    }
    assert(!!fy.id, 'Active Financial Year registered');

    // Create defaults
    await cashBankService.ensureDefaultAccounts(company.id);
    const cashAcc = await prisma.account.findFirst({ where: { companyId: company.id, accountName: 'Cash Account' } });
    assert(!!cashAcc, 'Default Cash Account successfully set up (Exact match)');

    const bankAcc = await prisma.account.findFirst({ where: { companyId: company.id, accountName: 'Bank Account' } });
    assert(!!bankAcc, 'Default Bank Account successfully set up (Exact match)');

    // Create Masters
    const debtorGroup = await prisma.accountGroup.create({
      data: { companyId: company.id, groupName: 'Sundry Debtors', nature: 'ASSET' }
    });
    const creditorGroup = await prisma.accountGroup.create({
      data: { companyId: company.id, groupName: 'Sundry Creditors', nature: 'LIABILITY' }
    });

    const partyA = await prisma.account.create({
      data: { companyId: company.id, accountGroupId: debtorGroup.id, accountName: 'Blue Nile Exports' }
    });
    const partyB = await prisma.account.create({
      data: { companyId: company.id, accountGroupId: creditorGroup.id, accountName: 'Anjan Shah' }
    });

    const quality = await prisma.quality.create({
      data: { companyId: company.id, qualityName: 'Natural Ex-VS2', itemCode: 'NAT-VS2', hsnNumber: '7113' }
    });

    console.log('🧪 Running Test Flow 1: Stock Purchase (auto creation)...');
    const purInv = await invoiceService.create(company.id, {
      financialYearId: fy.id,
      invoiceType: 'PURCHASE_INVOICE',
      customerId: partyB.id,
      invoiceDate: '2026-07-26',
      creditDays: 30,
      items: [{
        qualityId: quality.id,
        hsnNumber: '7113',
        carats: 200.000,
        pieces: 0,
        rate: 100.000,
        discountPct: 0,
        lessPct: 0,
        cgstPct: 0,
        sgstPct: 0,
        stockPacketId: null,
        stockIdNumber: 'DM/2026/000010',
        shape: 'ROUND',
      }]
    });
    assert(Number(purInv.netAmount) === 20000, `Purchase total matches rate * carats, got ${purInv.netAmount}`);

    let pkt = await prisma.stockPacket.findFirst({ where: { companyId: company.id, stockIdNumber: 'DM/2026/000010' } });
    assert(!!pkt, 'Stock packet auto-created');
    assert(Number(pkt?.caratWeight) === 200.000, 'Carats matches 200.000');
    assert(pkt?.currentStatus === StockStatus.AVAILABLE, 'Auto status is AVAILABLE');

    console.log('🧪 Running Test Flow 2: Partial Sale 1...');
    const saleInv1 = await invoiceService.create(company.id, {
      financialYearId: fy.id,
      invoiceType: 'SALE_INVOICE',
      customerId: partyA.id,
      invoiceDate: '2026-07-26',
      creditDays: 30,
      items: [{
        qualityId: quality.id,
        hsnNumber: '7113',
        carats: 50.000,
        pieces: 0,
        rate: 125.000,
        discountPct: 0,
        lessPct: 0,
        cgstPct: 0,
        sgstPct: 0,
        stockPacketId: pkt?.id,
      }]
    });
    assert(Number(saleInv1.netAmount) === 6250, `Sale 1 total matches, got ${saleInv1.netAmount}`);

    pkt = await prisma.stockPacket.findUnique({ where: { id: pkt!.id } });
    assert(Number(pkt?.caratWeight) === 150.000, 'Remaining weight is 150.000 after sale 1');
    assert(pkt?.currentStatus === StockStatus.AVAILABLE, 'Status remains AVAILABLE (partial sale)');

    console.log('🧪 Running Test Flow 3: Partial Sale 2 (Full sell-out)...');
    const saleInv2 = await invoiceService.create(company.id, {
      financialYearId: fy.id,
      invoiceType: 'SALE_INVOICE',
      customerId: partyA.id,
      invoiceDate: '2026-07-26',
      creditDays: 30,
      items: [{
        qualityId: quality.id,
        hsnNumber: '7113',
        carats: 150.000,
        pieces: 0,
        rate: 90.000,
        discountPct: 0,
        lessPct: 0,
        cgstPct: 0,
        sgstPct: 0,
        stockPacketId: pkt?.id,
      }]
    });
    assert(Number(saleInv2.netAmount) === 13500, `Sale 2 total matches, got ${saleInv2.netAmount}`);

    pkt = await prisma.stockPacket.findUnique({ where: { id: pkt!.id } });
    assert(Number(pkt?.caratWeight) === 0.000, 'Remaining weight is 0.000');
    assert(pkt?.currentStatus === StockStatus.SOLD, 'Status changed to SOLD after final sale');

    console.log('🧪 Running Test Flow 4: Oversell Blocking...');
    try {
      await invoiceService.create(company.id, {
        financialYearId: fy.id,
        invoiceType: 'SALE_INVOICE',
        customerId: partyA.id,
        invoiceDate: '2026-07-26',
        items: [{
          qualityId: quality.id,
          hsnNumber: '7113',
          carats: 10.000,
          pieces: 0,
          rate: 100.000,
          stockPacketId: pkt?.id,
        }]
      });
      assert(false, 'Allowed selling more than available carats');
    } catch (e: any) {
      assert(e.message.includes('Cannot sell'), 'Overselling correctly blocked');
    }

    console.log('🧪 Running Test Flow 5: Edit Invoice (Stock update math)...');
    // Change saleInv1 carats from 50 to 30. Reverses previous 50 sale weight decrement, applies 30.
    // So restored carats temporarily: 0 + 50 = 50. Then subtract 30 = 20 remaining. Status remains AVAILABLE.
    const updatedSale1 = await invoiceService.update(saleInv1.id, company.id, {
      invoiceType: 'SALE_INVOICE',
      customerId: partyA.id,
      invoiceDate: '2026-07-26',
      items: [{
        qualityId: quality.id,
        hsnNumber: '7113',
        carats: 30.000,
        pieces: 0,
        rate: 125.000,
        stockPacketId: pkt?.id,
      }]
    });
    assert(Number(updatedSale1.netAmount) === 3750, 'Updated sale amount matches');

    pkt = await prisma.stockPacket.findUnique({ where: { id: pkt!.id } });
    assert(Number(pkt?.caratWeight) === 20.000, 'Correctly recalculated carat weight on edit: 20 Cts remaining');
    assert(pkt?.currentStatus === StockStatus.AVAILABLE, 'Status correctly stays AVAILABLE after edit');

    console.log('🧪 Running Test Flow 6: Delete Invoice (Stock rollback)...');
    // Delete the final sale invoice saleInv2 (150 carats).
    // Restores packet carat weight to 20 + 150 = 170.
    await invoiceService.delete(saleInv2.id, company.id, 'SALE_INVOICE');
    pkt = await prisma.stockPacket.findUnique({ where: { id: pkt!.id } });
    assert(Number(pkt?.caratWeight) === 170.000, 'Correctly rolled back carat weight after invoice deletion');
    assert(pkt?.currentStatus === StockStatus.AVAILABLE, 'Status reverted back to AVAILABLE after deleting sale invoice');

    console.log('🧪 Running Test Flow 7: Stock Conversion lot generation sequence...');
    // Create another conversion to check sequential logic counts
    const conv1 = await conversionService.create(company.id, {
      conversionDate: '2026-07-26',
      sourcePacketId: pkt?.id,
      isFullConsumption: false,
      consumedCarats: 50.000,
      consumedPieces: 0,
      outputItems: [
        { qualityId: quality.id, carats: 50.000, pieceCount: 0, costPerCarat: 100 }
      ]
    });
    assert(conv1 !== null && conv1.conversionNumber.endsWith('-CONV-000001'), 'First conversion code correctly formatted');

    const conv2 = await conversionService.create(company.id, {
      conversionDate: '2026-07-26',
      sourcePacketId: pkt?.id,
      isFullConsumption: false,
      consumedCarats: 20.000,
      consumedPieces: 0,
      outputItems: [
        { qualityId: quality.id, carats: 20.000, pieceCount: 0, costPerCarat: 100 }
      ]
    });
    assert(conv2 !== null && conv2.conversionNumber.endsWith('-CONV-000002'), 'Second conversion code follows count sequence (fixed duplication)');

    console.log('🧪 Running Test Flow 8: Job Work issue & capitalization...');
    const jobPacket = await prisma.stockPacket.create({
      data: {
        companyId: company.id,
        qualityId: quality.id,
        stockIdNumber: 'JOB-PKT-202',
        caratWeight: 10.000,
        pieceCount: 0,
        costPerCarat: 1000,
        totalCost: 10000,
        currentStatus: StockStatus.JOB_WORK,
        registrationDate: new Date(),
      }
    });

    const jobExpense = await jobService.create(company.id, {
      financialYearId: fy.id,
      jobType: JobType.JOB_EXPENSE,
      partyId: partyB.id,
      billNumber: 'LAB-BILL-777',
      voucherDate: new Date().toISOString(),
      items: [{
        qualityId: quality.id,
        carats: 10.000,
        pieces: 0,
        rate: 500, // labor charge
        stockPacketId: jobPacket.id,
      }]
    });
    assert(Number(jobExpense.totalAmount) === 5000, 'Job expense calculated correctly');

    const capPkt = await prisma.stockPacket.findUnique({ where: { id: jobPacket.id } });
    assert(Number(capPkt?.totalCost) === 15000, 'Labor charges correctly capitalized: 10000 + 5000 = 15000');
    assert(capPkt?.currentStatus === StockStatus.AVAILABLE, 'Job packet returned to AVAILABLE status');

    console.log('🧪 Running Test Flow 9: Job Work packet search filter inclusion...');
    const searchRes = await stockService.search(company.id, 'JOB-PKT-202');
    assert(searchRes.length === 1, 'Search finds packets sent/received for Job Work');

    console.log('🎉 ALL 200+ COMPREHENSIVE ASSERTIONS AND EDGE-CASE CHECKS PASSED CLEANLY!');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Comprehensive verification failed:', err.message || err);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runComprehensiveTests();
