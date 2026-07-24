// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Dashboard Service
// Phase 15.1: Real-time telemetry calculations
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IDashboardKpiSummary, IBusinessAnalyticsData } from '../../../shared/types/dashboard.types';

@Injectable()
export class DashboardService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async getDashboardTelemetry(
    companyId: number,
    financialYearId?: number,
    userId?: number
  ): Promise<IDashboardKpiSummary> {
    // 1. User & Company Info
    const user = userId ? await this.prisma.user.findUnique({ where: { id: userId } }) : null;
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = financialYearId
      ? await this.prisma.financialYear.findUnique({ where: { id: financialYearId } })
      : await this.prisma.financialYear.findFirst({ where: { companyId, isClosed: false }, orderBy: { fromDate: 'desc' } });

    const fyLabel = fy
      ? `${new Date(fy.fromDate).getFullYear()}-${new Date(fy.toDate).getFullYear().toString().slice(-2)}`
      : 'N/A';

    // Dates for "Today" queries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 2. Receivables & Payables Summary (Combines OutstandingBills, SaleInvoices, and PurchaseInvoices)
    const outstandingBills = await this.prisma.outstandingBill.findMany({
      where: { companyId, status: { in: ['UNPAID', 'PARTIAL'] } },
      select: {
        id: true,
        billType: true,
        outstandingAmount: true,
        dueDate: true,
      },
    });

    let pendingReceivables = 0;
    let pendingReceivableCount = 0;
    let overdueReceivables = 0;
    let totalBilledReceivables = 0;
    let doneReceivedReceivables = 0;

    let pendingPayables = 0;
    let pendingPayableCount = 0;
    let overduePayables = 0;
    let totalBilledPayables = 0;
    let donePaidPayables = 0;

    const nowTime = new Date().getTime();

    outstandingBills.forEach((bill: any) => {
      const amount = Number(bill.outstandingAmount || 0);
      const isOverdue = bill.dueDate && new Date(bill.dueDate).getTime() < nowTime;

      if (bill.billType === 'DEBIT') {
        pendingReceivables += amount;
        pendingReceivableCount++;
        if (isOverdue) overdueReceivables += amount;
      } else if (bill.billType === 'CREDIT') {
        pendingPayables += amount;
        pendingPayableCount++;
        if (isOverdue) overduePayables += amount;
      }
    });

    // Query outstanding sale invoices from sale_invoices table
    const saleInvoices = await this.prisma.saleInvoice.findMany({
      where: { companyId, isDeleted: false, status: { not: 'CANCELLED' } },
      select: { invoiceType: true, outstandingAmount: true, netAmount: true, jamaAmount: true, dueDate: true },
    });

    // Query outstanding purchase invoices from purchase_invoices table
    const purchaseInvoices = await this.prisma.purchaseInvoice.findMany({
      where: { companyId, isDeleted: false, status: { not: 'CANCELLED' } },
      select: { invoiceType: true, outstandingAmount: true, netAmount: true, jamaAmount: true, dueDate: true },
    });

    // Process sale invoices for receivables
    saleInvoices.forEach((inv: any) => {
      const net = Number(inv.netAmount || 0);
      const jama = Number(inv.jamaAmount || 0);
      const outstanding = inv.outstandingAmount !== null && inv.outstandingAmount !== undefined
        ? Number(inv.outstandingAmount)
        : Math.max(0, net - jama);
      
      const isOverdue = inv.dueDate && new Date(inv.dueDate).getTime() < nowTime;

      if (inv.invoiceType === 'SALE_INVOICE' || inv.invoiceType === 'SALE_DEBIT_NOTE') {
        totalBilledReceivables += net;
        doneReceivedReceivables += jama;
        if (outstanding > 0 && outstandingBills.length === 0) {
          pendingReceivables += outstanding;
          pendingReceivableCount++;
          if (isOverdue) overdueReceivables += outstanding;
        }
      }
    });

    // Process purchase invoices for payables
    purchaseInvoices.forEach((inv: any) => {
      const net = Number(inv.netAmount || 0);
      const jama = Number(inv.jamaAmount || 0);
      const outstanding = inv.outstandingAmount !== null && inv.outstandingAmount !== undefined
        ? Number(inv.outstandingAmount)
        : Math.max(0, net - jama);
      
      const isOverdue = inv.dueDate && new Date(inv.dueDate).getTime() < nowTime;

      if (inv.invoiceType === 'PURCHASE_INVOICE' || inv.invoiceType === 'PURCHASE_DEBIT_NOTE') {
        totalBilledPayables += net;
        donePaidPayables += jama;
        if (outstanding > 0) {
          pendingPayables += outstanding;
          pendingPayableCount++;
          if (isOverdue) overduePayables += outstanding;
        }
      }
    });

    // Accounts Master Count
    const accounts = await this.prisma.account.findMany({
      where: { companyId, isDeleted: false, status: 'ACTIVE' },
      select: { id: true, accountGroupId: true },
    });

    const accountGroupIds = accounts.map((a: any) => a.accountGroupId);
    const accountGroups = await this.prisma.accountGroup.findMany({
      where: { id: { in: accountGroupIds } },
      select: { id: true, groupName: true, nature: true },
    });

    const groupNatureMap = new Map<number, string>();
    accountGroups.forEach((g: any) => groupNatureMap.set(g.id, `${g.groupName} ${g.nature}`.toUpperCase()));

    let customerCount = 0;
    let supplierCount = 0;

    accounts.forEach((acc: any) => {
      const groupText = groupNatureMap.get(acc.accountGroupId) || '';
      if (groupText.includes('DEBTOR') || groupText.includes('CUSTOMER') || groupText.includes('ASSET')) {
        customerCount++;
      } else if (groupText.includes('CREDITOR') || groupText.includes('SUPPLIER') || groupText.includes('LIABILITY')) {
        supplierCount++;
      }
    });

    // Today's Sales Invoices
    const salesToday = await this.prisma.saleInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        OR: [
          { invoiceDate: { gte: todayStart, lte: todayEnd } },
          { createdAt: { gte: todayStart, lte: todayEnd } },
        ],
      },
      select: { netAmount: true },
    });

    let salesTodayValue = 0;
    salesToday.forEach((s: any) => { salesTodayValue += Number(s.netAmount || 0); });

    // Today's Purchase Invoices
    const purchasesToday = await this.prisma.purchaseInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        OR: [
          { invoiceDate: { gte: todayStart, lte: todayEnd } },
          { createdAt: { gte: todayStart, lte: todayEnd } },
        ],
      },
      select: { netAmount: true },
    });

    let purchaseTodayValue = 0;
    purchasesToday.forEach((p: any) => { purchaseTodayValue += Number(p.netAmount || 0); });

    // Today's Cash & Bank Vouchers
    const cashBankToday = await this.prisma.cashBankVoucher.findMany({
      where: {
        companyId,
        isDeleted: false,
        OR: [
          { voucherDate: { gte: todayStart, lte: todayEnd } },
          { createdAt: { gte: todayStart, lte: todayEnd } },
        ],
      },
      select: { transactionType: true, amount: true },
    });

    let cashReceiptsToday = 0;
    let cashPaymentsToday = 0;
    let bankReceiptsToday = 0;
    let bankPaymentsToday = 0;

    cashBankToday.forEach((v: any) => {
      const amt = Number(v.amount || 0);
      if (v.transactionType === 'CASH_RECEIPT') cashReceiptsToday += amt;
      if (v.transactionType === 'CASH_PAYMENT') cashPaymentsToday += amt;
      if (v.transactionType === 'BANK_RECEIPT') bankReceiptsToday += amt;
      if (v.transactionType === 'BANK_PAYMENT') bankPaymentsToday += amt;
    });

    // 3. Stock Telemetry
    const packets = await this.prisma.stockPacket.findMany({
      where: { companyId, isDeleted: false },
      select: {
        id: true,
        caratWeight: true,
        currentStatus: true,
        certificateNumber: true,
        totalCost: true,
      },
    });

    let totalCarats = 0;
    let totalPackets = packets.length;
    let availablePackets = 0;
    let heldPackets = 0;
    let certifiedCount = 0;
    let nonCertifiedCount = 0;
    let totalValuation = 0;

    packets.forEach((p: any) => {
      const wt = Number(p.caratWeight || 0);
      const price = Number(p.totalCost || 0);
      totalCarats += wt;
      totalValuation += price;

      if (p.currentStatus === 'AVAILABLE') availablePackets++;
      if (p.currentStatus === 'ON_HOLD' || p.currentStatus === 'RESERVED') heldPackets++;

      if (p.certificateNumber && p.certificateNumber.trim() !== '') {
        certifiedCount++;
      } else {
        nonCertifiedCount++;
      }
    });

    // 4. Concurrent Sessions
    const activeSessionsCount = await this.prisma.userSession.count({
      where: { isActive: true },
    });

    return {
      header: {
        companyName: company?.companyName || 'DIAMO ERP Enterprise',
        companyLogo: company?.logoPath || undefined,
        userName: user?.fullName || 'Administrator',
        userRole: user?.isSuperAdmin ? 'Super Administrator' : user?.designation || 'Chief Operator',
        financialYearLabel: fyLabel,
        lastLoginAt: user?.lastLoginAt || undefined,
      },
      receivables: {
        total: totalBilledReceivables,
        pending: pendingReceivables,
        pendingCount: pendingReceivableCount,
        doneReceived: doneReceivedReceivables,
        receivedToday: cashReceiptsToday + bankReceiptsToday,
        overdueAmount: overdueReceivables,
      },
      payables: {
        total: totalBilledPayables,
        pending: pendingPayables,
        pendingCount: pendingPayableCount,
        donePaid: donePaidPayables,
        paidToday: cashPaymentsToday + bankPaymentsToday,
        overdueAmount: overduePayables,
      },
      stock: {
        totalCarats: Number(totalCarats.toFixed(2)),
        totalPackets,
        availablePackets,
        heldPackets,
        certifiedCount,
        nonCertifiedCount,
        totalValuation,
      },
      todaySales: {
        totalValue: salesTodayValue,
        invoiceCount: salesToday.length,
      },
      todayPurchases: {
        totalValue: purchaseTodayValue,
        billCount: purchasesToday.length,
      },
      todayCash: {
        receipts: cashReceiptsToday,
        payments: cashPaymentsToday,
        netBalance: cashReceiptsToday - cashPaymentsToday,
      },
      todayBank: {
        receipts: bankReceiptsToday,
        payments: bankPaymentsToday,
        netBalance: bankReceiptsToday - bankPaymentsToday,
      },
      businessSummary: {
        customerCount,
        supplierCount,
        activeAccountCount: accounts.length,
        totalStockItems: totalPackets,
        activeSessionsCount,
      },
    };
  }

  async getBusinessAnalytics(companyId: number): Promise<IBusinessAnalyticsData> {
    const now = new Date();

    // 1. Fetch Sales Invoices & Items
    const salesInvoices = await this.prisma.saleInvoice.findMany({
      where: { companyId, isDeleted: false, status: { not: 'CANCELLED' } },
      include: { customer: true, items: { include: { quality: true } } },
    });

    // 2. Fetch Purchase Invoices & Items
    const purchaseInvoices = await this.prisma.purchaseInvoice.findMany({
      where: { companyId, isDeleted: false, status: { not: 'CANCELLED' } },
      include: { supplier: true, items: { include: { quality: true } } },
    });

    // 3. Fetch Stock Packets for Aging Profile
    const stockPackets = await this.prisma.stockPacket.findMany({
      where: { companyId, isDeleted: false },
      select: { createdAt: true, caratWeight: true, totalCost: true, currentStatus: true },
    });

    // Monthly aggregates map for past 6 months
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySalesMap = new Map<string, { sales: number; count: number }>();
    const monthlyPurchaseMap = new Map<string, { purchases: number; count: number }>();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mKey = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      monthlySalesMap.set(mKey, { sales: 0, count: 0 });
      monthlyPurchaseMap.set(mKey, { purchases: 0, count: 0 });
    }

    const customerMap = new Map<string, { name: string; spent: number; count: number }>();
    const qualityMap = new Map<string, { carats: number; salesValue: number }>();

    salesInvoices.forEach((inv: any) => {
      const d = new Date(inv.invoiceDate || inv.createdAt);
      const mKey = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      const net = Number(inv.netAmount || 0);

      if (monthlySalesMap.has(mKey)) {
        const curr = monthlySalesMap.get(mKey)!;
        curr.sales += net;
        curr.count += 1;
      }

      // Customer stats
      const custName = inv.customer?.accountName || 'Walk-in Party';
      const custObj = customerMap.get(custName) || { name: custName, spent: 0, count: 0 };
      custObj.spent += net;
      custObj.count += 1;
      customerMap.set(custName, custObj);

      // Quality stats
      (inv.items || []).forEach((it: any) => {
        const qName = it.quality?.qualityName || it.qualityName || 'Standard';
        const qObj = qualityMap.get(qName) || { carats: 0, salesValue: 0 };
        qObj.carats += Number(it.carats || 0);
        qObj.salesValue += Number(it.amount || it.grossAmount || 0);
        qualityMap.set(qName, qObj);
      });
    });

    const supplierMap = new Map<string, { name: string; purchased: number; count: number }>();

    purchaseInvoices.forEach((inv: any) => {
      const d = new Date(inv.invoiceDate || inv.createdAt);
      const mKey = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      const net = Number(inv.netAmount || 0);

      if (monthlyPurchaseMap.has(mKey)) {
        const curr = monthlyPurchaseMap.get(mKey)!;
        curr.purchases += net;
        curr.count += 1;
      }

      // Supplier stats
      const suppName = inv.supplier?.accountName || 'Direct Vendor';
      const suppObj = supplierMap.get(suppName) || { name: suppName, purchased: 0, count: 0 };
      suppObj.purchased += net;
      suppObj.count += 1;
      supplierMap.set(suppName, suppObj);
    });

    // Build array structures
    const monthlySalesTrend = Array.from(monthlySalesMap.entries()).map(([month, val]) => ({
      month,
      sales: val.sales,
      invoices: val.count,
    }));

    const monthlyPurchaseTrend = Array.from(monthlyPurchaseMap.entries()).map(([month, val]) => ({
      month,
      purchases: val.purchases,
      bills: val.count,
    }));

    const monthlyProfitTrend = monthlySalesTrend.map((s, idx) => {
      const p = monthlyPurchaseTrend[idx]?.purchases || 0;
      const profit = Math.max(0, s.sales - p);
      const marginPct = s.sales > 0 ? (profit / s.sales) * 100 : 0;
      return {
        month: s.month,
        grossRevenue: s.sales,
        purchaseCost: p,
        grossProfit: profit,
        marginPct: Number(marginPct.toFixed(1)),
      };
    });

    // Stock Aging breakdown
    const agingBuckets = {
      '0-30 Days': { carats: 0, count: 0, value: 0 },
      '31-60 Days': { carats: 0, count: 0, value: 0 },
      '61-90 Days': { carats: 0, count: 0, value: 0 },
      '90+ Days': { carats: 0, count: 0, value: 0 },
    };

    const nowTs = now.getTime();
    stockPackets.forEach((pkt: any) => {
      if (pkt.currentStatus === 'SOLD') return;
      const ageDays = Math.floor((nowTs - new Date(pkt.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      const c = Number(pkt.caratWeight || 0);
      const v = Number(pkt.totalCost || 0);

      if (ageDays <= 30) {
        agingBuckets['0-30 Days'].carats += c;
        agingBuckets['0-30 Days'].count += 1;
        agingBuckets['0-30 Days'].value += v;
      } else if (ageDays <= 60) {
        agingBuckets['31-60 Days'].carats += c;
        agingBuckets['31-60 Days'].count += 1;
        agingBuckets['31-60 Days'].value += v;
      } else if (ageDays <= 90) {
        agingBuckets['61-90 Days'].carats += c;
        agingBuckets['61-90 Days'].count += 1;
        agingBuckets['61-90 Days'].value += v;
      } else {
        agingBuckets['90+ Days'].carats += c;
        agingBuckets['90+ Days'].count += 1;
        agingBuckets['90+ Days'].value += v;
      }
    });

    const stockAgingProfile = Object.entries(agingBuckets).map(([range, val]) => ({
      range,
      carats: Number(val.carats.toFixed(2)),
      count: val.count,
      value: val.value,
    }));

    const qualityWiseShare = Array.from(qualityMap.entries()).map(([qualityName, val]) => ({
      qualityName,
      carats: Number(val.carats.toFixed(2)),
      salesValue: val.salesValue,
    })).sort((a, b) => b.salesValue - a.salesValue);

    const topCustomers = Array.from(customerMap.values())
      .map((c) => ({ customerName: c.name, totalSpent: c.spent, invoiceCount: c.count }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    const topSuppliers = Array.from(supplierMap.values())
      .map((s) => ({ supplierName: s.name, totalPurchased: s.purchased, billCount: s.count }))
      .sort((a, b) => b.totalPurchased - a.totalPurchased)
      .slice(0, 5);

    return {
      monthlySalesTrend,
      monthlyPurchaseTrend,
      monthlyProfitTrend,
      stockAgingProfile,
      qualityWiseShare,
      topCustomers,
      topSuppliers,
    };
  }
}
