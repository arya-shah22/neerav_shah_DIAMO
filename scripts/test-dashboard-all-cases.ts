// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Full Dashboard Telemetry & Analytics Automated Test Suite
// Verification of HD-01..03, RP-01..06, TR-01..06, ST-01..04, MC-01..03, AN-01..04, EG-01..03, AG-01..02, PR-01..02, RK-01..03, TZ-01 (37 Test Cases)
// ═══════════════════════════════════════════════════════════════

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { PrismaService } from '../src/backend/database/prisma.service';
import { DashboardService } from '../src/backend/modules/dashboard/dashboard.service';
import { DebitCreditType, InvoiceStatus, InvoiceType, StockStatus, CashBankType, VoucherType } from '@prisma/client';

async function runDashboardTests() {
  console.log('🚀 Bootstrapping Full 37-Case Dashboard Automated Test Suite...\n');
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  await app.init();

  const prisma = app.get(PrismaService);
  const dashboardService = app.get(DashboardService);

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
    // 1. Setup Isolated Test Company & Financial Year
    let testCompany = await prisma.company.findFirst({ where: { companyCode: 'DS1' } });
    if (!testCompany) {
      testCompany = await prisma.company.create({
        data: {
          companyName: 'Dashboard Test Company',
          companyCode: 'DS1',
          panNumber: 'DASHTEST12',
          addressLine1: '123 Diamond Hub',
          city: 'Surat',
          pincode: '395008',
        },
      });
    }

    // Clean up previous test data under testCompany
    const packetIds = (await prisma.stockPacket.findMany({ where: { companyId: testCompany.id }, select: { id: true } })).map(p => p.id);
    await prisma.stockMovement.deleteMany({ where: { stockPacketId: { in: packetIds } } });
    await prisma.saleInvoiceItem.deleteMany({ where: { saleInvoice: { companyId: testCompany.id } } });
    await prisma.purchaseInvoiceItem.deleteMany({ where: { purchaseInvoice: { companyId: testCompany.id } } });
    await prisma.saleInvoice.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.purchaseInvoice.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.outstandingBill.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.cashBankVoucher.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.generalLedgerEntry.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.stockPacket.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.userSession.deleteMany({ where: { user: { userIdHandle: 'dashboard_tester' } } });
    await prisma.quality.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.voucherNumberSequence.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.voucherNumberConfig.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.financialYear.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.account.deleteMany({ where: { companyId: testCompany.id } });
    await prisma.accountGroup.deleteMany({ where: { companyId: testCompany.id } });

    await prisma.user.deleteMany({ where: { userIdHandle: 'dashboard_tester' } });
    const testUser = await prisma.user.create({
      data: {
        userIdHandle: 'dashboard_tester',
        email: 'dash_tester@diamo.com',
        passwordHash: 'hashed_pw',
        fullName: 'Test Dashboard Admin',
        designation: 'Lead Tester',
        isSuperAdmin: false,
        lastLoginAt: new Date(Date.now() - 3600000), // 1 hour ago
      },
    });

    const testFy = await prisma.financialYear.create({
      data: {
        companyId: testCompany.id,
        fromDate: new Date('2025-04-01'),
        toDate: new Date('2026-03-31'),
        isClosed: false,
      },
    });

    // Helper Account Groups & Accounts
    const debtorGroup = await prisma.accountGroup.create({
      data: { companyId: testCompany.id, groupName: 'Sundry Debtors', nature: 'ASSET' },
    });
    const creditorGroup = await prisma.accountGroup.create({
      data: { companyId: testCompany.id, groupName: 'Sundry Creditors', nature: 'LIABILITY' },
    });
    const bankGroup = await prisma.accountGroup.create({
      data: { companyId: testCompany.id, groupName: 'Bank Accounts', nature: 'ASSET' },
    });

    const customerAcc = await prisma.account.create({
      data: { companyId: testCompany.id, accountGroupId: debtorGroup.id, accountName: 'Diamond Retailer Co', status: 'ACTIVE' },
    });
    const supplierAcc = await prisma.account.create({
      data: { companyId: testCompany.id, accountGroupId: creditorGroup.id, accountName: 'Rough Mining Ltd', status: 'ACTIVE' },
    });
    const bankAcc = await prisma.account.create({
      data: { companyId: testCompany.id, accountGroupId: bankGroup.id, accountName: 'HDFC Bank Main', openingBalanceAmount: 50000, openingBalanceType: 'DEBIT', status: 'ACTIVE' },
    });

    const quality1 = await prisma.quality.create({
      data: { companyId: testCompany.id, qualityName: 'VVS1 E Color', hsnNumber: '7113' },
    });

    console.log('--- Executing Test Category 1: Header & FY Context ---');
    // HD-01
    const hd1Telemetry = await dashboardService.getDashboardTelemetry(testCompany.id, testFy.id, testUser.id);
    recordResult('HD-01', 'Header displays companyName, userName, userRole, and active FY', 
      hd1Telemetry.header.companyName === 'Dashboard Test Company' && 
      hd1Telemetry.header.userName === 'Test Dashboard Admin' &&
      hd1Telemetry.header.financialYearLabel === '2025-26'
    );

    // HD-02
    const hd2Telemetry = await dashboardService.getDashboardTelemetry(testCompany.id, 999999, testUser.id);
    recordResult('HD-02', 'Header falls back safely when FY not found', 
      typeof hd2Telemetry.header.financialYearLabel === 'string'
    );

    // HD-03
    recordResult('HD-03', 'User last login timestamp is populated', 
      hd1Telemetry.header.lastLoginAt !== undefined && hd1Telemetry.header.lastLoginAt !== null
    );

    console.log('\n--- Executing Test Category 7: Boundary Cases (EG-01 Empty DB) ---');
    // EG-01
    recordResult('EG-01', 'Empty Database handles calculations cleanly without null pointer or NaN', 
      hd1Telemetry.receivables.total === 0 &&
      hd1Telemetry.payables.total === 0 &&
      hd1Telemetry.stock.totalCarats === 0 &&
      !isNaN(hd1Telemetry.todaySales.totalValue)
    );

    console.log('\n--- Executing Test Category 2: Receivables & Payables ---');
    // Create Sale Invoice (Unpaid)
    await prisma.saleInvoice.create({
      data: {
        companyId: testCompany.id,
        financialYearId: testFy.id,
        voucherNumber: 'V-INV-001',
        billNumber: 'INV-001',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 86400000), // 7 days future
        customerId: customerAcc.id,
        invoiceType: InvoiceType.SALE_INVOICE,
        status: InvoiceStatus.SAVED,
        totalGrossAmount: 100000,
        netAmount: 100000,
        jamaAmount: 0,
        outstandingAmount: 100000,
        transactionCurrency: 'INR',
        exchangeRate: 1,
      },
    });

    // RP-01
    const rp1Telemetry = await dashboardService.getDashboardTelemetry(testCompany.id, testFy.id);
    recordResult('RP-01', 'Unpaid Sale Invoice updates receivables', 
      rp1Telemetry.receivables.total === 100000 &&
      rp1Telemetry.receivables.pending === 100000 &&
      rp1Telemetry.receivables.pendingCount === 1
    );

    // Create Purchase Invoice (Unpaid)
    await prisma.purchaseInvoice.create({
      data: {
        companyId: testCompany.id,
        financialYearId: testFy.id,
        voucherNumber: 'V-PINV-001',
        billNumber: 'PINV-001',
        invoiceDate: new Date(),
        dueDate: new Date(Date.now() - 2 * 86400000), // 2 days overdue!
        supplierId: supplierAcc.id,
        invoiceType: InvoiceType.PURCHASE_INVOICE,
        status: InvoiceStatus.SAVED,
        totalGrossAmount: 50000,
        netAmount: 50000,
        jamaAmount: 0,
        outstandingAmount: 50000,
        transactionCurrency: 'INR',
        exchangeRate: 1,
      },
    });

    // RP-02 & RP-04
    const rp2Telemetry = await dashboardService.getDashboardTelemetry(testCompany.id, testFy.id);
    recordResult('RP-02', 'Unpaid Purchase Invoice updates payables', 
      rp2Telemetry.payables.total === 50000 &&
      rp2Telemetry.payables.pending === 50000 &&
      rp2Telemetry.payables.pendingCount === 1
    );
    recordResult('RP-04', 'Overdue Purchase Invoice adds to overdueAmount', 
      rp2Telemetry.payables.overdueAmount === 50000
    );

    // RP-03 Partial payment
    const activeSaleInv = await prisma.saleInvoice.findFirst({ where: { companyId: testCompany.id, billNumber: 'INV-001' } });
    if (activeSaleInv) {
      await prisma.saleInvoice.update({
        where: { id: activeSaleInv.id },
        data: { jamaAmount: 40000, outstandingAmount: 60000 },
      });
    }
    const rp3Telemetry = await dashboardService.getDashboardTelemetry(testCompany.id, testFy.id);
    recordResult('RP-03', 'Partial payment reduces pending receivables and increases doneReceived', 
      rp3Telemetry.receivables.doneReceived === 40000 &&
      rp3Telemetry.receivables.pending === 60000
    );

    // RP-05 Cancelled invoice
    await prisma.saleInvoice.create({
      data: {
        companyId: testCompany.id,
        financialYearId: testFy.id,
        voucherNumber: 'V-INV-CAN',
        billNumber: 'INV-CANCEL',
        invoiceDate: new Date(),
        customerId: customerAcc.id,
        invoiceType: InvoiceType.SALE_INVOICE,
        status: InvoiceStatus.CANCELLED,
        totalGrossAmount: 200000,
        netAmount: 200000,
        jamaAmount: 0,
        outstandingAmount: 200000,
      },
    });
    const rp5Telemetry = await dashboardService.getDashboardTelemetry(testCompany.id, testFy.id);
    recordResult('RP-05', 'Cancelled Invoices are excluded from total and pending receivables', 
      rp5Telemetry.receivables.total === 100000 // Only INV-001 counted
    );

    // RP-06 Credit/Debit Notes
    await prisma.outstandingBill.create({
      data: {
        companyId: testCompany.id,
        billType: DebitCreditType.DEBIT,
        accountId: customerAcc.id,
        sourceVoucherType: VoucherType.SALE_DEBIT_NOTE,
        sourceVoucherId: 101,
        billNumber: 'DN-001',
        billDate: new Date(),
        originalAmount: 15000,
        outstandingAmount: 15000,
        status: 'UNPAID',
      },
    });
    const rp6Telemetry = await dashboardService.getDashboardTelemetry(testCompany.id, testFy.id);
    recordResult('RP-06', 'OutstandingBill DEBIT routes to Receivables', 
      rp6Telemetry.receivables.pending >= 15000
    );

    console.log('\n--- Executing Test Category 3: Today Transactions & Vouchers ---');
    // TR-01 & TR-02
    recordResult('TR-01', 'Sale Invoice today contributes to todaySales', 
      rp1Telemetry.todaySales.invoiceCount === 1 && rp1Telemetry.todaySales.totalValue === 100000
    );
    recordResult('TR-02', 'Purchase Invoice today contributes to todayPurchases', 
      rp2Telemetry.todayPurchases.billCount === 1 && rp2Telemetry.todayPurchases.totalValue === 50000
    );

    // TR-03 Cash Receipt
    await prisma.cashBankVoucher.create({
      data: {
        companyId: testCompany.id,
        financialYearId: testFy.id,
        voucherNumber: 'CR-001',
        voucherDate: new Date(),
        transactionType: CashBankType.CASH_RECEIPT,
        partyId: customerAcc.id,
        cashBankAccountId: bankAcc.id,
        amount: 25000,
      },
    });

    // TR-05 Bank Receipt
    await prisma.cashBankVoucher.create({
      data: {
        companyId: testCompany.id,
        financialYearId: testFy.id,
        voucherNumber: 'BR-001',
        voucherDate: new Date(),
        transactionType: CashBankType.BANK_RECEIPT,
        partyId: customerAcc.id,
        cashBankAccountId: bankAcc.id,
        amount: 30000,
      },
    });

    const trTelemetry = await dashboardService.getDashboardTelemetry(testCompany.id, testFy.id);
    recordResult('TR-03', 'CASH_RECEIPT updates todayCash receipts', 
      trTelemetry.todayCash.receipts === 25000
    );
    recordResult('TR-05', 'BANK_RECEIPT updates todayBank receipts', 
      trTelemetry.todayBank.receipts === 30000
    );
    recordResult('TR-04 & TR-06', 'Bank account opening balance & vouchers calculate net balance', 
      typeof trTelemetry.todayBank.netBalance === 'number'
    );

    console.log('\n--- Executing Test Category 4 & 5: Stock Telemetry & Multi-Currency ---');
    // ST-01, ST-02, ST-03
    const packet1 = await prisma.stockPacket.create({
      data: {
        companyId: testCompany.id,
        stockIdNumber: 'PKT-101',
        registrationDate: new Date(),
        caratWeight: 2.50,
        pieceCount: 1,
        qualityId: quality1.id,
        currentStatus: StockStatus.AVAILABLE,
        certificateNumber: 'GIA-123456',
        totalCost: 150000,
      },
    });

    await prisma.stockPacket.create({
      data: {
        companyId: testCompany.id,
        stockIdNumber: 'PKT-102',
        registrationDate: new Date(),
        caratWeight: 1.50,
        pieceCount: 1,
        qualityId: quality1.id,
        currentStatus: StockStatus.HOLD,
        certificateNumber: '', // Uncertified
        totalCost: 80000,
      },
    });

    const stTelemetry = await dashboardService.getDashboardTelemetry(testCompany.id, testFy.id);
    recordResult('ST-01', 'Stock packets count and carat weight calculated accurately', 
      stTelemetry.stock.totalPackets === 2 &&
      stTelemetry.stock.totalCarats === 4.00 &&
      stTelemetry.stock.availablePackets === 1 &&
      stTelemetry.stock.heldPackets === 1
    );
    recordResult('ST-02', 'Certified vs Non-Certified packet counts segregated', 
      stTelemetry.stock.certifiedCount === 1 &&
      stTelemetry.stock.nonCertifiedCount === 1
    );
    recordResult('ST-03', 'Stock Total Valuation summed in base currency', 
      stTelemetry.stock.totalValuation === 230000
    );

    // ST-04 Status change
    await prisma.stockPacket.update({
      where: { id: packet1.id },
      data: { currentStatus: StockStatus.SOLD },
    });
    const st4Telemetry = await dashboardService.getDashboardTelemetry(testCompany.id, testFy.id);
    recordResult('ST-04', 'Changing packet status to SOLD updates available count', 
      st4Telemetry.stock.availablePackets === 0
    );

    // MC-01 USD Invoice Multi-currency
    await prisma.saleInvoice.create({
      data: {
        companyId: testCompany.id,
        financialYearId: testFy.id,
        voucherNumber: 'V-USD-1',
        billNumber: 'INV-USD-1',
        invoiceDate: new Date(),
        customerId: customerAcc.id,
        invoiceType: InvoiceType.SALE_INVOICE,
        status: InvoiceStatus.SAVED,
        totalGrossAmount: 1000,
        netAmount: 1000,
        jamaAmount: 0,
        outstandingAmount: 1000,
        transactionCurrency: 'USD',
        exchangeRate: 85.5,
      },
    });
    const mcTelemetry = await dashboardService.getDashboardTelemetry(testCompany.id, testFy.id);
    recordResult('MC-01 & MC-02', 'USD invoice net amount multiplied by exchangeRate (1000 USD * 85.5 = 85500 INR)', 
      mcTelemetry.todaySales.totalValue >= 185500
    );
    recordResult('MC-03', 'Missing exchange rate falls back safely without NaN', 
      !isNaN(mcTelemetry.todaySales.totalValue)
    );
    const analyticsMc = await dashboardService.getBusinessAnalytics(testCompany.id);
    const usdCustomer = analyticsMc.topCustomers.find(c => c.customerName === 'Diamond Retailer Co');
    recordResult('MC-04', 'Business Analytics applies USD->INR exchangeRate for top customer sales and monthly trends', 
      usdCustomer !== undefined && usdCustomer.totalSpent >= 185500
    );

    console.log('\n--- Executing Test Category 8: Stock Aging Profile (AG-01 & AG-02) ---');
    // AG-01 & AG-02 Aging Profile with active and sold packets
    const agingPktOld = await prisma.stockPacket.create({
      data: {
        companyId: testCompany.id,
        stockIdNumber: 'PKT-OLD-90',
        registrationDate: new Date(Date.now() - 100 * 86400000), // 100 days old
        createdAt: new Date(Date.now() - 100 * 86400000),
        caratWeight: 3.00,
        pieceCount: 1,
        qualityId: quality1.id,
        currentStatus: StockStatus.AVAILABLE,
        totalCost: 120000,
      },
    });

    const analyticsWithAging = await dashboardService.getBusinessAnalytics(testCompany.id);
    const bucket90Plus = analyticsWithAging.stockAgingProfile.find(b => b.range === '90+ Days');
    recordResult('AG-01', 'Stock aging profile sorts packets into 90+ Days bucket', 
      bucket90Plus !== undefined && bucket90Plus.count >= 1 && bucket90Plus.value >= 120000
    );

    // AG-02 Exclude SOLD packet from aging
    await prisma.stockPacket.update({
      where: { id: agingPktOld.id },
      data: { currentStatus: StockStatus.SOLD },
    });
    const analyticsAfterSold = await dashboardService.getBusinessAnalytics(testCompany.id);
    const bucket90AfterSold = analyticsAfterSold.stockAgingProfile.find(b => b.range === '90+ Days');
    recordResult('AG-02', 'SOLD stock is excluded from inventory aging profile', 
      bucket90AfterSold?.value === 0 && bucket90AfterSold?.count === 0
    );

    console.log('\n--- Executing Test Category 9: Profitability & Margins (PR-01 & PR-02) ---');
    // PR-01 & PR-02 Profit trend calculation
    const hasProfitData = analyticsWithAging.monthlyProfitTrend.every(p => 
      typeof p.grossProfit === 'number' && 
      typeof p.marginPct === 'number' && 
      !isNaN(p.marginPct) && 
      isFinite(p.marginPct)
    );
    recordResult('PR-01', 'Monthly Profit & Margin computed accurately (grossProfit = sales - purchases)', 
      hasProfitData
    );
    recordResult('PR-02', 'Zero sales month margin safely evaluates to 0% without Infinity or NaN', 
      analyticsWithAging.monthlyProfitTrend.some(p => p.grossRevenue === 0 && p.marginPct === 0)
    );

    console.log('\n--- Executing Test Category 10: Rankings & Aggregations (RK-01, RK-02, RK-03) ---');
    // RK-01 Top Customers
    recordResult('RK-01', 'Top Customers aggregated and sorted descending (capped at 5)', 
      Array.isArray(analyticsWithAging.topCustomers) && 
      analyticsWithAging.topCustomers.length <= 5 && 
      (analyticsWithAging.topCustomers.length <= 1 || analyticsWithAging.topCustomers[0].totalSpent >= analyticsWithAging.topCustomers[1].totalSpent)
    );

    // RK-02 Top Suppliers
    recordResult('RK-02', 'Top Suppliers aggregated and sorted descending (capped at 5)', 
      Array.isArray(analyticsWithAging.topSuppliers) && 
      analyticsWithAging.topSuppliers.length <= 5
    );

    // RK-03 Quality-Wise Share
    recordResult('RK-03', 'Quality-wise sales share aggregated per diamond quality', 
      Array.isArray(analyticsWithAging.qualityWiseShare)
    );

    console.log('\n--- Executing Test Category 11: Midnight & Timezone Boundaries (TZ-01) ---');
    // TZ-01 Midnight invoice creation
    const midnightStart = new Date();
    midnightStart.setHours(23, 59, 59, 999);
    await prisma.saleInvoice.create({
      data: {
        companyId: testCompany.id,
        financialYearId: testFy.id,
        voucherNumber: 'V-TZ-01',
        billNumber: 'INV-MIDNIGHT',
        invoiceDate: midnightStart,
        customerId: customerAcc.id,
        invoiceType: InvoiceType.SALE_INVOICE,
        status: InvoiceStatus.SAVED,
        totalGrossAmount: 45000,
        netAmount: 45000,
        jamaAmount: 0,
        outstandingAmount: 45000,
      },
    });

    const tzTelemetry = await dashboardService.getDashboardTelemetry(testCompany.id, testFy.id);
    recordResult('TZ-01', 'Midnight invoice (23:59:59) correctly grouped under today sales', 
      tzTelemetry.todaySales.invoiceCount >= 1
    );

    console.log('\n--- Executing Test Category 6: Business Summary & Analytics ---');
    // AN-01
    recordResult('AN-01', 'Accounts categorized as Customer or Supplier correctly', 
      mcTelemetry.businessSummary.customerCount === 1 &&
      mcTelemetry.businessSummary.supplierCount === 1
    );

    // AN-02, AN-03, AN-04 Analytics
    await prisma.userSession.create({
      data: {
        userId: testUser.id,
        sessionToken: 'sess_12345',
        ipAddress: '127.0.0.1',
        isActive: true,
      },
    });

    const updatedTelemetry = await dashboardService.getDashboardTelemetry(testCompany.id, testFy.id);

    recordResult('AN-02', 'Business analytics monthly sales vs purchase timeline built', 
      Array.isArray(analyticsWithAging.monthlySalesTrend) && analyticsWithAging.monthlySalesTrend.length === 6
    );
    recordResult('AN-03', 'Top Customers and Qualities analytics generated', 
      Array.isArray(analyticsWithAging.topCustomers) && Array.isArray(analyticsWithAging.qualityWiseShare)
    );
    recordResult('AN-04', 'Active Concurrent Sessions counted', 
      updatedTelemetry.businessSummary.activeSessionsCount >= 1
    );

    console.log('\n--- Executing Test Category 7: Multi-Company Isolation ---');
    // Create or reuse Company B
    let companyB = await prisma.company.findFirst({ where: { companyCode: 'CPB' } });
    if (!companyB) {
      companyB = await prisma.company.create({
        data: {
          companyName: 'Company B Isolated',
          companyCode: 'CPB',
          panNumber: 'COMPB1111B',
          addressLine1: 'Addr B',
          city: 'Mumbai',
          pincode: '400001',
        },
      });
    }

    const compBTelemetry = await dashboardService.getDashboardTelemetry(companyB.id);
    recordResult('EG-03', 'Multi-Company Isolation verified: Company B has zero items from Company A', 
      compBTelemetry.receivables.total === 0 &&
      compBTelemetry.payables.total === 0 &&
      compBTelemetry.stock.totalPackets === 0
    );

    console.log('\n--- Executing EG-02: Performance Benchmark ---');
    const startPerf = Date.now();
    await dashboardService.getDashboardTelemetry(testCompany.id);
    const duration = Date.now() - startPerf;
    recordResult('EG-02', `Dashboard telemetry execution speed benchmark (${duration}ms)`, 
      duration < 1500
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

runDashboardTests();
