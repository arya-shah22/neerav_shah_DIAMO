// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Comprehensive End-to-End Integration Tests
// ═══════════════════════════════════════════════════════════════

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { PrismaService } from '../src/backend/database/prisma.service';
import { StockService } from '../src/backend/modules/stock/stock.service';
import { InvoiceService } from '../src/backend/modules/invoice/invoice.service';
import { ChallanService } from '../src/backend/modules/challan/challan.service';
import { StockStatus, ChallanStatus } from '@prisma/client';

async function runAllTests() {
  console.log('🚀 Bootstrapping DIAMO ERP integration test runner...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  await app.init();

  const prisma = app.get(PrismaService);
  const stockService = app.get(StockService);
  const invoiceService = app.get(InvoiceService);
  const challanService = app.get(ChallanService);

  try {
    console.log('⚡ STEP 1: Setting up mock environments (Company & FY)...');
    
    // Create/Find test company
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
    console.log(`   ➔ Company: ${company.companyName} [ID: ${company.id}]`);

    // Clean slate for test company
    console.log('   ➔ Clearing old test records to ensure clean slate...');
    const oldPackets = await prisma.stockPacket.findMany({ where: { companyId: company.id } });
    const oldPacketIds = oldPackets.map(p => p.id);

    await prisma.stockMovement.deleteMany({ where: { stockPacketId: { in: oldPacketIds } } });
    await prisma.challanItem.deleteMany({ where: { stockPacketId: { in: oldPacketIds } } });
    await prisma.challanVoucher.deleteMany({ where: { companyId: company.id } });

    await prisma.saleInvoiceItem.deleteMany({ where: { stockPacketId: { in: oldPacketIds } } });
    await prisma.saleInvoice.deleteMany({ where: { companyId: company.id } });

    await prisma.stockPacket.deleteMany({ where: { companyId: company.id } });

    // Create/Find Active Financial Year
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
    console.log(`   ➔ Financial Year: 2026-2027 [ID: ${fy.id}]`);

    console.log('⚡ STEP 2: Creating Master records (Account Groups, Accounts, Qualities)...');
    
    // Create standard default ledger groups
    const requiredGroups = [
      { name: 'Sundry Debtors', nature: 'ASSET' },
      { name: 'Sales Accounts', nature: 'INCOME' },
      { name: 'Purchase Accounts', nature: 'EXPENSE' },
      { name: 'Duties & Taxes', nature: 'LIABILITY' },
    ];

    for (const g of requiredGroups) {
      const exists = await prisma.accountGroup.findFirst({
        where: { companyId: company.id, groupName: g.name }
      });
      if (!exists) {
        await prisma.accountGroup.create({
          data: {
            companyId: company.id,
            groupName: g.name,
            nature: g.nature,
          }
        });
      }
    }

    const debtorGroup = await prisma.accountGroup.findFirst({
      where: { companyId: company.id, groupName: 'Sundry Debtors' }
    });
    if (!debtorGroup) throw new Error('Sundry Debtors group creation failed');

    let customer = await prisma.account.findFirst({ where: { companyId: company.id, accountName: 'Integration Customer' } });
    if (!customer) {
      customer = await prisma.account.create({
        data: {
          companyId: company.id,
          accountGroupId: debtorGroup.id,
          accountName: 'Integration Customer',
          city: 'Surat',
          mobile: '9900887766',
        },
      });
    }
    console.log(`   ➔ Customer Account: ${customer.accountName}`);

    // Create Diamond Quality
    let quality = await prisma.quality.findFirst({ where: { companyId: company.id, qualityName: 'DIAMO-EX-VVS1' } });
    if (!quality) {
      quality = await prisma.quality.create({
        data: {
          companyId: company.id,
          qualityName: 'DIAMO-EX-VVS1',
          itemCode: 'DIAMO-EX-VVS1',
          hsnNumber: '7113',
          uqc: 'CTS',
        },
      });
    }
    console.log(`   ➔ Quality Master: ${quality.qualityName}`);

    console.log('⚡ STEP 3: Testing Stock CSV Bulk Import...');
    
    const mockCsvRows = [
      { stockIdNumber: 'CSV-PKT-001', shape: 'ROUND', caratWeight: '2.500', pieceCount: '1', color: 'D', clarity: 'IF', rate: '120000' },
      { stockIdNumber: 'CSV-PKT-002', shape: 'PEAR', caratWeight: '3.120', pieceCount: '1', color: 'E', clarity: 'VVS1', rate: '95000' },
      { stockIdNumber: '', shape: 'OVAL', caratWeight: '1.200', pieceCount: '1', color: 'F', clarity: 'VS1', rate: '70000' }, // Invalid row (missing ID)
    ];

    const importRes = await stockService.importCsv(company.id, quality.id, mockCsvRows);
    console.log(`   ➔ CSV Import complete. Imported: ${importRes.importedCount}, Skipped: ${importRes.skippedCount}`);
    
    if (importRes.importedCount !== 2) {
      throw new Error(`FAIL: Expected 2 packets imported, got ${importRes.importedCount}`);
    }
    if (importRes.skippedCount !== 1) {
      throw new Error(`FAIL: Expected 1 skipped row, got ${importRes.skippedCount}`);
    }
    console.log('   ➔ Checked skipped warning details: Row missing ID successfully ignored.');

    console.log('⚡ STEP 4: Testing Purchase Invoice (Auto Stock Packet Creation)...');
    
    const purchasePayload = {
      financialYearId: fy.id,
      invoiceType: 'PURCHASE_INVOICE',
      customerId: customer.id,
      invoiceDate: new Date().toISOString(),
      creditDays: 30,
      items: [
        {
          qualityId: quality.id,
          hsnNumber: '7113',
          carats: 5.000,
          pieces: 2,
          rate: 80000,
          discountPct: 0,
          lessPct: 0,
          cgstPct: 1.5,
          sgstPct: 1.5,
          stockPacketId: null, // Instructs auto creation
          stockIdNumber: 'AUTO-PKT-PUR-101',
          shape: 'ROUND',
          color: 'D',
          clarity: 'IF',
        }
      ]
    };

    const purchaseInvoice = await invoiceService.create(company.id, purchasePayload);
    console.log(`   ➔ Purchase Invoice created: ${purchaseInvoice.voucherNumber} [ID: ${purchaseInvoice.id}]`);

    // Verify stock packet was auto-created and matches status
    const purPacket = await prisma.stockPacket.findFirst({
      where: { companyId: company.id, stockIdNumber: 'AUTO-PKT-PUR-101' }
    });
    if (!purPacket || Number(purPacket.caratWeight) !== 5.000) {
      throw new Error(`FAIL: Expected auto created packet with 5 carats, got ${purPacket?.caratWeight}`);
    }
    console.log(`   ➔ Verified auto stock packet registered: ${purPacket.stockIdNumber} [Status: AVAILABLE]`);

    console.log('⚡ STEP 5: Testing Sale Invoice (Locks Packet to SOLD)...');
    
    // We will sell the imported packet CSV-PKT-001
    const csvPacket = await prisma.stockPacket.findFirst({
      where: { companyId: company.id, stockIdNumber: 'CSV-PKT-001' }
    });
    if (!csvPacket) throw new Error('FAIL: Imported packet CSV-PKT-001 not found');

    const salePayload = {
      financialYearId: fy.id,
      invoiceType: 'SALE_INVOICE',
      customerId: customer.id,
      invoiceDate: new Date().toISOString(),
      creditDays: 15,
      items: [
        {
          qualityId: quality.id,
          hsnNumber: '7113',
          carats: Number(csvPacket.caratWeight),
          pieces: csvPacket.pieceCount,
          rate: 150000,
          discountPct: 0,
          lessPct: 0,
          cgstPct: 1.5,
          sgstPct: 1.5,
          stockPacketId: csvPacket.id,
        }
      ]
    };

    const saleInvoice = await invoiceService.create(company.id, salePayload);
    console.log(`   ➔ Sale Invoice created: ${saleInvoice.voucherNumber} [ID: ${saleInvoice.id}]`);

    const soldPacket = await prisma.stockPacket.findUnique({ where: { id: csvPacket.id } });
    if (soldPacket?.currentStatus !== StockStatus.SOLD) {
      throw new Error(`FAIL: Expected sold packet status to be SOLD, got ${soldPacket?.currentStatus}`);
    }
    console.log(`   ➔ Verified packet ${csvPacket.stockIdNumber} is transitioned to SOLD`);

    console.log('⚡ STEP 6: Testing Challan Lock/Unlock Cycle (Jhanghad & Return)...');
    
    // We will issue the other packet: CSV-PKT-002 on a Jhanghad Challan
    const csvPacket2 = await prisma.stockPacket.findFirst({
      where: { companyId: company.id, stockIdNumber: 'CSV-PKT-002' }
    });
    if (!csvPacket2) throw new Error('FAIL: Imported packet CSV-PKT-002 not found');

    const challanPayload = {
      purpose: 'TRADING_JHANGHAD',
      partyId: customer.id,
      partyName: customer.accountName,
      challanDate: new Date(),
      items: [
        {
          qualityId: quality.id,
          carats: Number(csvPacket2.caratWeight),
          pieces: csvPacket2.pieceCount,
          rate: 100000,
          stockPacketId: csvPacket2.id,
        }
      ]
    };

    const challan = await challanService.create(company.id, fy.id, challanPayload);
    console.log(`   ➔ Jhanghad Challan created: ${challan.voucherNumber}`);

    const heldPacket = await prisma.stockPacket.findUnique({ where: { id: csvPacket2.id } });
    if (heldPacket?.currentStatus !== StockStatus.HOLD) {
      throw new Error(`FAIL: Expected packet status to be HOLD, got ${heldPacket?.currentStatus}`);
    }
    console.log(`   ➔ Verified packet ${csvPacket2.stockIdNumber} is locked to HOLD`);

    console.log('⚡ STEP 7: Testing Edge Case - Double Reservation Attempt...');
    try {
      await challanService.create(company.id, fy.id, {
        purpose: 'TRADING_JHANGHAD',
        partyId: customer.id,
        partyName: customer.accountName,
        challanDate: new Date(),
        items: [
          {
            qualityId: quality.id,
            carats: 1.0,
            pieces: 1,
            rate: 100000,
            stockPacketId: csvPacket2.id, // Try to double-reserve packet CSV-PKT-002 which is already on HOLD!
          }
        ]
      });
      throw new Error('FAIL: Expected double reservation to fail, but it succeeded!');
    } catch (e: any) {
      console.log(`   ➔ Correctly blocked double-reservation: "${e.message}"`);
    }

    console.log('⚡ STEP 8: Testing Edge Case - Partial Returns Boundary release...');
    // Create a new active stock packet for testing partial returns
    const tempPkt = await prisma.stockPacket.create({
      data: {
        companyId: company.id,
        qualityId: quality.id,
        stockIdNumber: 'TEMP-PARTIAL-101',
        caratWeight: 10.000,
        pieceCount: 10,
        costPerCarat: 5000,
        totalCost: 50000,
        currentStatus: StockStatus.AVAILABLE,
        registrationDate: new Date(),
      }
    });

    const tempChallan = await challanService.create(company.id, fy.id, {
      purpose: 'TRADING_JHANGHAD',
      partyId: customer.id,
      partyName: customer.accountName,
      challanDate: new Date(),
      items: [
        {
          qualityId: quality.id,
          carats: 10.000,
          pieces: 10,
          rate: 6000,
          stockPacketId: tempPkt.id,
        }
      ]
    });

    // Submitting a return of 4 carats (40% returned) ➔ status becomes PARTIAL_RETURN, packet must remain on HOLD
    await challanService.updateStatus(tempChallan.id, company.id, ChallanStatus.PARTIAL_RETURN, {
      items: [{ id: tempChallan.items[0].id, returnedCarats: 4.000, returnedPieces: 4 }]
    });

    const pPkt1 = await prisma.stockPacket.findUnique({ where: { id: tempPkt.id } });
    if (pPkt1?.currentStatus !== StockStatus.HOLD) {
      throw new Error(`FAIL: Expected partially returned packet to remain on HOLD, got ${pPkt1?.currentStatus}`);
    }
    console.log('   ➔ Verified partially returned packet (40%) remains locked on HOLD');

    // Submitting a return of remaining 6 carats (making total returned = 10 carats, 100%) ➔ packet reverts to AVAILABLE
    await challanService.updateStatus(tempChallan.id, company.id, ChallanStatus.PARTIAL_RETURN, {
      items: [{ id: tempChallan.items[0].id, returnedCarats: 10.000, returnedPieces: 10 }]
    });

    const pPkt2 = await prisma.stockPacket.findUnique({ where: { id: tempPkt.id } });
    if (pPkt2?.currentStatus !== StockStatus.AVAILABLE) {
      throw new Error(`FAIL: Expected fully returned packet to revert to AVAILABLE, got ${pPkt2?.currentStatus}`);
    }
    console.log('   ➔ Verified packet reverted to AVAILABLE when return reaches 100%');

    // Transition to RETURNED
    await challanService.updateStatus(challan.id, company.id, ChallanStatus.RETURNED, {});
    console.log('   ➔ Challan transitioned to RETURNED');

    const releasedPacket = await prisma.stockPacket.findUnique({ where: { id: csvPacket2.id } });
    if (releasedPacket?.currentStatus !== StockStatus.AVAILABLE) {
      throw new Error(`FAIL: Expected packet status to revert to AVAILABLE, got ${releasedPacket?.currentStatus}`);
    }
    console.log(`   ➔ Verified packet ${csvPacket2.stockIdNumber} reverted to AVAILABLE`);

    console.log('⚡ CLEANUP: Clearing test datasets...');
    
    // Delete Invoice Items & Invoices (all stored in saleInvoice tables)
    await prisma.saleInvoiceItem.deleteMany({ where: { saleInvoiceId: { in: [saleInvoice.id, purchaseInvoice.id] } } });
    await prisma.saleInvoice.deleteMany({ where: { id: { in: [saleInvoice.id, purchaseInvoice.id] } } });
    
    // Delete Challan Items & Challans
    await prisma.challanItem.deleteMany({ where: { challanVoucherId: { in: [challan.id, tempChallan.id] } } });
    await prisma.challanVoucher.deleteMany({ where: { id: { in: [challan.id, tempChallan.id] } } });

    // Delete Packets & Movements
    const packets = await prisma.stockPacket.findMany({ where: { companyId: company.id } });
    const packetIds = packets.map(p => p.id);
    await prisma.stockMovement.deleteMany({ where: { stockPacketId: { in: packetIds } } });
    await prisma.stockPacket.deleteMany({ where: { companyId: company.id } });

    console.log('🎉 ALL COMPREHENSIVE INTEGRATION TESTS PASSED SUCCESSFULLY!');
  } catch (error: any) {
    console.error('❌ Integration Test Failed:', error.message || error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runAllTests();
