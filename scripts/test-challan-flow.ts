// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Programmatic Challan Integration Tests
// ═══════════════════════════════════════════════════════════════

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { ChallanService } from '../src/backend/modules/challan/challan.service';
import { PrismaService } from '../src/backend/database/prisma.service';
import { StockStatus, ChallanStatus } from '@prisma/client';

async function runTests() {
  console.log('🚀 Starting DIAMO ERP Challan Integration Tests...');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  await app.init();

  const prisma = app.get(PrismaService);
  const challanService = app.get(ChallanService);

  try {
    // 1. Prepare Mock Data (Company, FY, Account, Quality)
    let company = await prisma.company.findFirst({ where: { companyCode: 'TST' } });
    if (!company) {
      company = await prisma.company.create({
        data: {
          companyName: 'Test Integration Ltd',
          companyCode: 'TST',
          panNumber: 'ABCDE1234F',
          addressLine1: 'Test Lab Block 2',
          city: 'Surat',
          pincode: '395003',
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

    let party = await prisma.account.findFirst({ where: { companyId: company.id } });
    if (!party) {
      // Find or create account group
      let group = await prisma.accountGroup.findFirst({ where: { companyId: company.id } });
      if (!group) {
        group = await prisma.accountGroup.create({
          data: {
            companyId: company.id,
            groupName: 'Sundry Debtors',
            nature: 'ASSET',
          },
        });
      }
      party = await prisma.account.create({
        data: {
          companyId: company.id,
          accountGroupId: group.id,
          accountName: 'Ajay Integration Customer',
          city: 'Surat',
          mobile: '9876543210',
          gstinNumber: '24AAAAA1111A1Z1',
        },
      });
    }

    let quality = await prisma.quality.findFirst({ where: { companyId: company.id } });
    if (!quality) {
      quality = await prisma.quality.create({
        data: {
          companyId: company.id,
          qualityName: 'INT-VVS1',
          itemCode: 'INT-VVS1',
          hsnNumber: '7113',
          uqc: 'CTS',
        },
      });
    }

    // 2. Create Stock Packet
    const packet = await prisma.stockPacket.create({
      data: {
        companyId: company.id,
        qualityId: quality.id,
        stockIdNumber: `PKT-TEST-${Date.now()}`,
        caratWeight: 10.000,
        pieceCount: 5,
        costPerCarat: 5000,
        totalCost: 50000,
        currentStatus: StockStatus.AVAILABLE,
        registrationDate: new Date(),
      },
    });

    console.log(`✅ Created test packet: ${packet.stockIdNumber} [Status: AVAILABLE]`);

    // 3. Test Challan Creation & Stock status transition to HOLD
    const challanData = {
      purpose: 'TRADING_JHANGHAD',
      partyId: party.id,
      partyName: party.accountName,
      challanDate: new Date(),
      items: [
        {
          qualityId: quality.id,
          carats: 10.000,
          pieces: 5,
          rate: 6000,
          stockPacketId: packet.id,
        },
      ],
    };

    const challan = await challanService.create(company.id, fy.id, challanData);
    console.log(`✅ Jhanghad Challan created successfully: ${challan.voucherNumber}`);

    // Verify Stock Packet is locked to HOLD
    const updatedPacket = await prisma.stockPacket.findUnique({ where: { id: packet.id } });
    if (updatedPacket?.currentStatus !== StockStatus.HOLD) {
      throw new Error(`FAIL: Expected packet status to be HOLD, got ${updatedPacket?.currentStatus}`);
    }
    console.log(`✅ Verified packet ${packet.stockIdNumber} status is successfully locked to HOLD`);

    // Verify Stock Movement
    const movement = await prisma.stockMovement.findFirst({
      where: { stockPacketId: packet.id, movementType: 'TRADING_CHALLAN' },
    });
    if (!movement) {
      throw new Error(`FAIL: Expected stock movement trace record not found`);
    }
    console.log(`✅ Verified stock movement ledger entry registered: ${movement.movementType}`);

    // 4. Test status transition to PARTIAL_RETURN
    const partialReturnPayload = {
      status: 'PARTIAL_RETURN',
      items: [
        {
          id: challan.items[0].id,
          returnedCarats: 4.000,
          returnedPieces: 2,
        },
      ],
    };

    await challanService.updateStatus(challan.id, company.id, ChallanStatus.PARTIAL_RETURN, partialReturnPayload);
    console.log('✅ Transitioned Challan to PARTIAL_RETURN');

    // Verify returned carat totals are saved
    const partiallyReturnedChallan = await prisma.challanVoucher.findUnique({
      where: { id: challan.id },
    });
    if (Number(partiallyReturnedChallan?.returnedCarats) !== 4.000) {
      throw new Error(`FAIL: Expected returned carats to be 4.000, got ${partiallyReturnedChallan?.returnedCarats}`);
    }
    console.log('✅ Verified partial return carats saved successfully');

    // 5. Test complete RETURNED transition (reverts stock status back to AVAILABLE)
    await challanService.updateStatus(challan.id, company.id, ChallanStatus.RETURNED, {});
    console.log('✅ Transitioned Challan to RETURNED');

    const revertedPacket = await prisma.stockPacket.findUnique({ where: { id: packet.id } });
    if (revertedPacket?.currentStatus !== StockStatus.AVAILABLE) {
      throw new Error(`FAIL: Expected packet status to revert to AVAILABLE, got ${revertedPacket?.currentStatus}`);
    }
    console.log(`✅ Verified packet ${packet.stockIdNumber} status successfully reverted to AVAILABLE`);

    // 6. Cleanup mock test data
    await prisma.stockMovement.deleteMany({ where: { stockPacketId: packet.id } });
    await prisma.stockPacket.delete({ where: { id: packet.id } });
    await prisma.challanItem.deleteMany({ where: { challanVoucherId: challan.id } });
    await prisma.challanVoucher.delete({ where: { id: challan.id } });

    console.log('🎉 ALL INTEGRATION TEST CASES PASSED SUCCESSFULLY!');
  } catch (error: any) {
    console.error('❌ Integration Test Failed:', error.message || error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runTests();
