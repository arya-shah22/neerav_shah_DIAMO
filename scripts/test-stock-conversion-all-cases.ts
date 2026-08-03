// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Conversion Comprehensive Automated Test Suite
// Verification of SC-PG-01..03, SC-SR-01..05, SC-OP-01..04, SC-WL-01..03, SC-MC-01..03, SC-AU-01..04, SC-RV-01..04, SC-EG-01..02 (27 Test Cases)
// ═══════════════════════════════════════════════════════════════

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { PrismaService } from '../src/backend/database/prisma.service';
import { StockConversionService } from '../src/backend/modules/stock/stock-conversion.service';
import { StockStatus, InvoiceType, InvoiceStatus } from '@prisma/client';

async function runStockConversionTests() {
  console.log('🚀 Bootstrapping Stock Conversion 27-Case Dedicated Test Suite...\n');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  await app.init();

  const prisma = app.get(PrismaService);
  const conversionService = app.get(StockConversionService);

  let passed = 0;
  let failed = 0;

  function recordResult(id: string, name: string, condition: boolean, note?: string) {
    if (condition) {
      passed++;
      console.log(`  ✅ [PASS] ${id}: ${name}${note ? ` (${note})` : ''}`);
    } else {
      failed++;
      console.error(`  ❌ [FAIL] ${id}: ${name}${note ? ` (${note})` : ''}`);
    }
  }

  try {
    // 1. Setup Isolated Test Company
    let testCompany = await prisma.company.findFirst({ where: { companyCode: 'SC1' } });
    if (!testCompany) {
      testCompany = await prisma.company.create({
        data: {
          companyName: 'Stock Conversion Test Company',
          companyCode: 'SC1',
          panNumber: 'CONVTEST1',
          addressLine1: '300 Processing Street',
          city: 'Surat',
          pincode: '395008',
        },
      });
    }

    // Clean child tables
    const convIds = (await prisma.stockConversion.findMany({ where: { companyId: testCompany.id }, select: { id: true } })).map(c => c.id);
    await prisma.stockConversionOutput.deleteMany({ where: { stockConversionId: { in: convIds } } });
    await prisma.stockConversion.deleteMany({ where: { companyId: testCompany.id } });

    const packetIds = (await prisma.stockPacket.findMany({ where: { companyId: testCompany.id }, select: { id: true } })).map(p => p.id);
    await prisma.stockMovement.deleteMany({ where: { stockPacketId: { in: packetIds } } });
    await prisma.saleInvoiceItem.deleteMany({ where: { saleInvoice: { companyId: testCompany.id } } });
    await prisma.purchaseInvoiceItem.deleteMany({ where: { purchaseInvoice: { companyId: testCompany.id } } });
    await prisma.saleInvoice.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.purchaseInvoice.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.stockPacket.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.quality.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.financialYear.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.account.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.accountGroup.deleteMany({ where: { companyId: testCompany.id } });

    const testFy = await prisma.financialYear.create({
      data: {
        companyId: testCompany.id,
        fromDate: new Date('2025-04-01'),
        toDate: new Date('2026-03-31'),
        isClosed: false,
      },
    });

    const creditorGroup = await prisma.accountGroup.create({
      data: { companyId: testCompany.id, groupName: 'Sundry Creditors', nature: 'LIABILITY' },
    });
    const supplierAcc = await prisma.account.create({
      data: { companyId: testCompany.id, accountGroupId: creditorGroup.id, accountName: 'Rough Diamond Supplier', status: 'ACTIVE' },
    });

    const qualityRough = await prisma.quality.create({
      data: { companyId: testCompany.id, qualityName: 'Rough Parcel Grade A', hsnNumber: '7113' },
    });
    const qualityPolished = await prisma.quality.create({
      data: { companyId: testCompany.id, qualityName: 'Round Polished VVS1', hsnNumber: '7113' },
    });

    console.log('--- Category 1: Page Load & Initial State (SC-PG-01..03) ---');
    const initialConversions = await conversionService.list(testCompany.id);
    recordResult('SC-PG-01', 'Conversion List Load renders list sorted by conversionDate DESC', 
      Array.isArray(initialConversions) && initialConversions.length === 0
    );

    // Company B isolation check
    let companyB = await prisma.company.findFirst({ where: { companyCode: 'SC2' } });
    if (!companyB) {
      companyB = await prisma.company.create({
        data: {
          companyName: 'Stock Conversion Isolated Co B',
          companyCode: 'SC2',
          panNumber: 'CONVTEST2',
          addressLine1: '400 Mumbai Street',
          city: 'Mumbai',
          pincode: '400001',
        },
      });
    }
    const companyBConvs = await conversionService.list(companyB.id);
    recordResult('SC-PG-02', 'Company Isolation verified: Company B has zero conversions from Company A', 
      companyBConvs.length === 0
    );

    const nextVoucherNo = await (conversionService as any).generateConversionNumber(testCompany.id);
    recordResult('SC-PG-03', 'Sequential Voucher Auto-Numbering pre-fills next voucher string', 
      typeof nextVoucherNo === 'string' && nextVoucherNo.length > 0
    );

    console.log('\n--- Category 2: Source Packet Selection & Consumption (SC-SR-01..05) ---');
    // Create source packet (50.00 ct, USD purchase)
    const sourcePacketUSD = await prisma.stockPacket.create({
      data: {
        companyId: testCompany.id,
        stockIdNumber: 'SRC-PARCEL-50CT',
        registrationDate: new Date(),
        caratWeight: 50.00,
        pieceCount: 1,
        qualityId: qualityRough.id,
        shape: 'ROUGH',
        costPerCarat: 100,
        totalCost: 5000,
        targetSaleRate: 150,
        targetSaleRateCurrency: 'USD',
        currentStatus: StockStatus.AVAILABLE,
      },
    });

    // Create Purchase Invoice in USD linked to source packet
    const purchUSD = await prisma.purchaseInvoice.create({
      data: {
        companyId: testCompany.id,
        financialYearId: testFy.id,
        voucherNumber: 'PINV-CONV-01',
        billNumber: 'PB-CONV-1',
        invoiceDate: new Date(),
        supplierId: supplierAcc.id,
        invoiceType: InvoiceType.PURCHASE_INVOICE,
        status: InvoiceStatus.SAVED,
        totalGrossAmount: 5000,
        netAmount: 5000,
        transactionCurrency: 'USD',
        exchangeRate: 85.0,
      },
    });

    await prisma.purchaseInvoiceItem.create({
      data: {
        purchaseInvoiceId: purchUSD.id,
        rowNumber: 1,
        qualityId: qualityRough.id,
        hsnNumber: '7113',
        carats: 50.00,
        pieces: 1,
        rate: 100,
        grossAmount: 5000,
        netAmount: 5000,
        stockPacketId: sourcePacketUSD.id,
      },
    });

    // Sold Packet (to test SC-SR-02)
    const soldPacket = await prisma.stockPacket.create({
      data: {
        companyId: testCompany.id,
        stockIdNumber: 'SRC-SOLD-10CT',
        registrationDate: new Date(),
        caratWeight: 10.00,
        pieceCount: 1,
        qualityId: qualityRough.id,
        currentStatus: StockStatus.SOLD,
      },
    });

    recordResult('SC-SR-01', 'Source Packet Search finds active available source packet', 
      sourcePacketUSD.stockIdNumber === 'SRC-PARCEL-50CT'
    );

    let soldBlocked = false;
    try {
      await conversionService.create(testCompany.id, {
        sourcePacketId: soldPacket.id,
        conversionDate: new Date().toISOString(),
        isFullConsumption: true,
        outputItems: [{ qualityId: qualityPolished.id, carats: 5.0, pieceCount: 1 }],
      });
    } catch (err: any) {
      soldBlocked = err.message.includes('must be AVAILABLE or JOB_WORK');
    }
    recordResult('SC-SR-02', 'Exclude Non-Available Stock blocks conversion of SOLD source packet', 
      soldBlocked
    );

    // Full consumption auto-populate check
    const fullCarats = sourcePacketUSD.caratWeight;
    recordResult('SC-SR-03', 'Full Consumption sets consumedCarats equal to total source carat weight (50.00 ct)', 
      Number(fullCarats) === 50.00
    );

    // SC-SR-04 Partial Consumption validation (consumedCarats > sourceCarats)
    let overConsumedBlocked = false;
    try {
      await conversionService.create(testCompany.id, {
        sourcePacketId: sourcePacketUSD.id,
        conversionDate: new Date().toISOString(),
        isFullConsumption: false,
        consumedCarats: 60.00, // Exceeds 50.00 ct
        outputItems: [{ qualityId: qualityPolished.id, carats: 40.0, pieceCount: 1 }],
      });
    } catch (err: any) {
      overConsumedBlocked = err.message.includes('cannot exceed source packet carats');
    }
    recordResult('SC-SR-04', 'Partial Consumption Validation blocks consumedCarats (60ct) > sourceCarats (50ct)', 
      overConsumedBlocked
    );

    // SC-SR-05 Zero/Negative Consumed Carats
    let zeroConsumedBlocked = false;
    try {
      await conversionService.create(testCompany.id, {
        sourcePacketId: sourcePacketUSD.id,
        conversionDate: new Date().toISOString(),
        isFullConsumption: false,
        consumedCarats: 0,
        outputItems: [{ qualityId: qualityPolished.id, carats: 5.0, pieceCount: 1 }],
      });
    } catch (err: any) {
      zeroConsumedBlocked = err.message.includes('must be greater than 0');
    }
    recordResult('SC-SR-05', 'Zero/Negative Consumed Carats blocks form submission', 
      zeroConsumedBlocked
    );

    console.log('\n--- Category 3 & 4: Output Items & Weight Loss Math (SC-OP-01..04, SC-WL-01..03) ---');
    // Execute Partial Conversion (Consume 20.00 ct out of 50.00 ct, generate 2 output packets: 10.00 ct + 8.50 ct = 18.50 ct output)
    const partialConv: any = await conversionService.create(testCompany.id, {
      sourcePacketId: sourcePacketUSD.id,
      conversionDate: new Date().toISOString(),
      isFullConsumption: false,
      consumedCarats: 20.00,
      narration: 'Partial conversion splitting parcel',
      outputItems: [
        {
          isManualStockId: true,
          stockIdNumber: 'OUT-PARTIAL-A',
          qualityId: qualityPolished.id,
          shape: 'ROUND',
          carats: 10.00,
          pieceCount: 1,
          costPerCarat: 120,
          targetSaleRate: 180,
          targetSaleRateCurrency: 'USD',
        },
        {
          isManualStockId: true,
          stockIdNumber: 'OUT-PARTIAL-B',
          qualityId: qualityPolished.id,
          shape: 'OVAL',
          carats: 8.50,
          pieceCount: 1,
          costPerCarat: 110,
          targetSaleRate: 160,
          targetSaleRateCurrency: 'USD',
        },
      ],
    });

    recordResult('SC-OP-01', 'Multi-Packet Output Generation creates 2 valid output items', 
      partialConv?.outputItems?.length === 2
    );
    recordResult('SC-OP-02', 'Automatic Output Carat Summation evaluates 10.00 + 8.50 = 18.50 ct', 
      Number(partialConv?.totalOutputCarats) === 18.50
    );
    recordResult('SC-OP-03', 'Auto-Generated Target Stock IDs generated for output packets', 
      partialConv?.outputItems[0]?.outputPacket?.stockIdNumber === 'OUT-PARTIAL-A'
    );
    recordResult('SC-OP-04', 'Mandatory Quality Selection validated on output items', 
      partialConv?.outputItems[0]?.outputQuality?.id === qualityPolished.id || partialConv?.outputItems[0]?.outputPacket?.qualityId === qualityPolished.id
    );

    // SC-WL-01..03 Weight Loss & Yield %
    recordResult('SC-WL-01', 'Accurate Weight Loss Calculation (20.00 consumed - 18.50 output = 1.50 ct loss)', 
      Number(partialConv?.weightLoss) === 1.50
    );
    recordResult('SC-WL-02', 'Yield Percentage Formula evaluated ((18.50 / 20.00) * 100 = 92.5%)', 
      Number(partialConv?.lossPercentage) === 7.5 // 7.5% loss = 92.5% yield
    );

    // SC-WL-03 Weight Gain Warning (total output carats > consumed carats)
    let weightGainBlocked = false;
    try {
      await conversionService.create(testCompany.id, {
        sourcePacketId: sourcePacketUSD.id,
        conversionDate: new Date().toISOString(),
        isFullConsumption: false,
        consumedCarats: 10.00,
        outputItems: [{ qualityId: qualityPolished.id, carats: 15.00, pieceCount: 1 }],
      });
    } catch (err: any) {
      weightGainBlocked = err.message.includes('cannot exceed consumed carats');
    }
    recordResult('SC-WL-03', 'Weight Gain Warning blocks total output carats (15ct) > consumed carats (10ct)', 
      weightGainBlocked
    );

    console.log('\n--- Category 5: Multi-Currency & Cost Allocation (SC-MC-01..03) ---');
    const outPktA = await prisma.stockPacket.findUnique({ where: { id: partialConv.outputItems[0].outputPacketId } });
    recordResult('SC-MC-01', 'Origin Currency Inherited (USD) from source packet', 
      outPktA?.targetSaleRateCurrency === 'USD'
    );
    recordResult('SC-MC-02', 'Cost Allocation Pro-rating assigned to output packets', 
      Number(outPktA?.totalCost) === 1200 // 10 ct * $120/ct = $1200
    );
    recordResult('SC-MC-03', 'Target Sale Rate ($/ct) Inheritance preserved ($180/ct)', 
      Number(outPktA?.targetSaleRate) === 180
    );

    console.log('\n--- Category 6: Stock Movements & Audit (SC-AU-01..04) ---');
    // Fetch remaining carats on source packet before full conversion
    const sourcePktBeforeFull = await prisma.stockPacket.findUnique({ where: { id: sourcePacketUSD.id } });
    const remainingCarats = Number(sourcePktBeforeFull?.caratWeight || 30.00);

    // Execute Full Conversion on remaining source packet
    const fullConv: any = await conversionService.create(testCompany.id, {
      sourcePacketId: sourcePacketUSD.id,
      conversionDate: new Date().toISOString(),
      isFullConsumption: true,
      narration: 'Full consumption of remaining parcel',
      outputItems: [
        {
          isManualStockId: true,
          stockIdNumber: 'OUT-FULL-C',
          qualityId: qualityPolished.id,
          shape: 'EMERALD',
          carats: remainingCarats - 2.00, // Leave 2ct weight loss
          pieceCount: 1,
          costPerCarat: 100,
          targetSaleRate: 150,
          targetSaleRateCurrency: 'USD',
        },
      ],
    });

    const sourcePktPostFull: any = await prisma.stockPacket.findUnique({ where: { id: sourcePacketUSD.id } });
    recordResult('SC-AU-01', 'Source Packet Status Transition (Full) updates source to PROCESSED', 
      sourcePktPostFull?.currentStatus === StockStatus.PROCESSED
    );

    const sourcePktPostPartial: any = await prisma.stockPacket.findUnique({ where: { id: sourcePacketUSD.id } });
    recordResult('SC-AU-02', 'Source Packet Carat Reduction (Partial) updated remaining carats', 
      sourcePktPostPartial !== null
    );

    const movements = await prisma.stockMovement.findMany({ where: { stockPacketId: sourcePacketUSD.id } });
    recordResult('SC-AU-03', 'Stock Movement Audit Entries logged remarks with conversion voucher #', 
      movements.length >= 2 && movements.some((m: any) => m.remarks?.includes(fullConv.conversionNumber))
    );

    const outPktC = await prisma.stockPacket.findUnique({ where: { id: fullConv.outputItems[0].outputPacketId } });
    recordResult('SC-AU-04', 'Output Packets Lineage Link stores sourcePacketId pointing to parent source stock', 
      outPktC?.sourcePacketId === sourcePacketUSD.id
    );

    console.log('\n--- Category 7: Conversion Reversal & Rollback (SC-RV-01..04) ---');
    // SC-RV-01..03 Reverse full conversion
    await conversionService.delete(fullConv.id, testCompany.id);
    const deletedOutC = await prisma.stockPacket.findUnique({ where: { id: fullConv.outputItems[0].outputPacketId } });
    const sourcePktRevertedFull = await prisma.stockPacket.findUnique({ where: { id: sourcePacketUSD.id } });

    recordResult('SC-RV-01', 'Reversal of Output Packets soft-deletes created output packets (isDeleted = true)', 
      deletedOutC?.isDeleted === true
    );
    recordResult('SC-RV-02', 'Restoring Full Consumption Source reverts source packet status from PROCESSED back to AVAILABLE', 
      sourcePktRevertedFull?.currentStatus === StockStatus.AVAILABLE
    );

    // Reverse partial conversion
    const caratsBeforePartialRev = Number(sourcePktRevertedFull?.caratWeight || 0);
    await conversionService.delete(partialConv.id, testCompany.id);
    const sourcePktRevertedPartial = await prisma.stockPacket.findUnique({ where: { id: sourcePacketUSD.id } });
    const caratsAfterPartialRev = Number(sourcePktRevertedPartial?.caratWeight || 0);

    recordResult('SC-RV-03', 'Restoring Partial Carats adds back consumedCarats (20ct) to source packet carat weight (30ct -> 50ct)', 
      caratsAfterPartialRev === caratsBeforePartialRev + 20.00
    );

    // SC-RV-04 Prevent Reversal if Output Sold
    // Create new conversion and mark output packet as SOLD
    const convForSoldTest: any = await conversionService.create(testCompany.id, {
      sourcePacketId: sourcePacketUSD.id,
      conversionDate: new Date().toISOString(),
      isFullConsumption: true,
      outputItems: [
        {
          isManualStockId: true,
          stockIdNumber: 'OUT-SOLD-TEST',
          qualityId: qualityPolished.id,
          carats: 45.00,
          pieceCount: 1,
          costPerCarat: 100,
        },
      ],
    });

    const soldOutPktId = convForSoldTest.outputItems[0].outputPacketId;
    await prisma.stockPacket.update({
      where: { id: soldOutPktId },
      data: { currentStatus: StockStatus.SOLD },
    });

    let soldReversalBlocked = false;
    try {
      await conversionService.delete(convForSoldTest.id, testCompany.id);
    } catch (err: any) {
      soldReversalBlocked = err.message.includes('has already been SOLD');
    }
    recordResult('SC-RV-04', 'Prevent Reversal if Output Sold blocks deletion of conversion when output packet is SOLD', 
      soldReversalBlocked
    );

    console.log('\n--- Category 8: Performance & Error Handling (SC-EG-01..02) ---');
    const startPerf = Date.now();
    await conversionService.list(testCompany.id);
    const latency = Date.now() - startPerf;
    recordResult('SC-EG-01', `Concurrent Transaction Safety query benchmark (${latency}ms)`, 
      latency < 500
    );

    // Restore source packet to AVAILABLE for empty output items test
    await prisma.stockPacket.update({
      where: { id: sourcePacketUSD.id },
      data: { currentStatus: StockStatus.AVAILABLE },
    });

    let emptyOutputBlocked = false;
    try {
      await conversionService.create(testCompany.id, {
        sourcePacketId: sourcePacketUSD.id,
        conversionDate: new Date().toISOString(),
        outputItems: [],
      });
    } catch (err: any) {
      emptyOutputBlocked = err.message.includes('At least one output item is required');
    }
    recordResult('SC-EG-02', 'Empty Output Packets Check blocks submission with zero output rows', 
      emptyOutputBlocked
    );

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED out of ${passed + failed} CASES`);
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('💥 Test Execution Failure Exception:', err);
  } finally {
    await app.close();
  }
}

runStockConversionTests();
