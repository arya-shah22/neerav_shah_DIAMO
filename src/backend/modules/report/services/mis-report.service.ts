// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — MIS Analytics & Stock Report Sub-Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class MisReportService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async getStockReport(companyId: number, filters?: { status?: string; qualityId?: number; search?: string }) {
    const whereClause: any = { companyId };

    if (filters?.status && filters.status !== 'ALL') {
      whereClause.currentStatus = filters.status;
    }
    if (filters?.qualityId) {
      whereClause.qualityId = filters.qualityId;
    }
    if (filters?.search) {
      whereClause.OR = [
        { stockIdNumber: { contains: filters.search } },
        { color: { contains: filters.search } },
        { clarity: { contains: filters.search } },
        { shape: { contains: filters.search } },
      ];
    }

    const packets = await this.prisma.stockPacket.findMany({
      where: whereClause,
      include: {
        quality: true,
        sourcePacket: true,
      },
      orderBy: { id: 'desc' },
    });

    const packetIds = packets.map((p) => p.id);

    // Batch fetch sale info for sold packets to eliminate N+1 queries
    const saleItems = await (this.prisma as any).saleInvoiceItem.findMany({
      where: {
        stockPacketId: { in: packetIds },
        saleInvoice: { isDeleted: false },
      },
      include: {
        saleInvoice: {
          include: { customer: true },
        },
      },
    });

    const saleInfoMap = new Map<number, { actualSaleRate: number; actualSaleAmount: number; invoiceNumber: string; customerName: string; saleDate: Date }>();
    for (const item of saleItems) {
      if (item.stockPacketId && item.saleInvoice) {
        saleInfoMap.set(item.stockPacketId, {
          actualSaleRate: Number(item.rate || 0),
          actualSaleAmount: Number(item.netAmount || 0),
          invoiceNumber: item.saleInvoice.voucherNumber,
          customerName: item.saleInvoice.customer?.accountName || 'Unknown Customer',
          saleDate: item.saleInvoice.invoiceDate,
        });
      }
    }

    const transformLogs = await (this.prisma as any).stockMovement.findMany({
      where: {
        stockPacketId: { in: packetIds },
        movementType: { in: ['QUALITY_TRANSFORMATION', 'MANUAL_ADJUSTMENT'] as any[] },
      },
    });

    const convInfoMap = new Map<number, { sourceCost: number; processingCost: number }>();
    for (const log of transformLogs) {
      if (log.stockPacketId) {
        convInfoMap.set(log.stockPacketId, {
          sourceCost: Number((log as any).unitCost || 0),
          processingCost: 0,
        });
      }
    }

    // Aggregations
    let totalCarats = 0;
    let totalPieces = 0;
    let totalValue = 0;

    const statusCounts: Record<string, number> = {};
    const statusBreakdown = {
      available: { count: 0, carats: 0, value: 0 },
      reserved: { count: 0, carats: 0, value: 0 },
      jobWork: { count: 0, carats: 0, value: 0 },
      transit: { count: 0, carats: 0, value: 0 },
      sold: { count: 0, carats: 0, value: 0 },
      returned: { count: 0, carats: 0, value: 0 },
      damaged: { count: 0, carats: 0, value: 0 },
      archived: { count: 0, carats: 0, value: 0 },
    };

    for (const p of packets) {
      const carats = Number(p.caratWeight || 0);
      const val = carats * Number(p.costPerCarat || 0);
      totalCarats += carats;
      totalPieces += p.pieceCount || 0;
      totalValue += val;
      statusCounts[p.currentStatus] = (statusCounts[p.currentStatus] || 0) + 1;

      const key = (p.currentStatus === 'HOLD' ? 'reserved'
                : p.currentStatus === 'JOB_WORK' ? 'jobWork'
                : p.currentStatus === 'SOLD' ? 'sold'
                : p.currentStatus === 'RETURNED' ? 'returned'
                : p.currentStatus === 'DAMAGED' ? 'damaged'
                : p.currentStatus === 'ARCHIVED' ? 'archived'
                : 'available') as keyof typeof statusBreakdown;
      if (statusBreakdown[key]) {
        statusBreakdown[key].count++;
        statusBreakdown[key].carats += carats;
        statusBreakdown[key].value += val;
      }
    }

    return {
      summary: {
        totalPackets: packets.length,
        totalCarats: Math.round(totalCarats * 1000) / 1000,
        totalPieces,
        totalValue: Math.round(totalValue * 100) / 100,
        totalValuation: Math.round(totalValue * 100) / 100,
        activeValuation: Math.round((statusBreakdown.available.value + statusBreakdown.reserved.value + statusBreakdown.jobWork.value) * 100) / 100,
        activePacketsCount: statusBreakdown.available.count + statusBreakdown.reserved.count + statusBreakdown.jobWork.count,
        activeCarats: Math.round((statusBreakdown.available.carats + statusBreakdown.reserved.carats + statusBreakdown.jobWork.carats) * 1000) / 1000,
        avgRatePerCarat: totalCarats > 0 ? Math.round((totalValue / totalCarats) * 100) / 100 : 0,
        statusCounts,
        statusBreakdown,
      },
      packets: packets.map((p) => {
        const carats = Number(p.caratWeight || 0);
        const saleInfo = saleInfoMap.get(p.id);
        const convInfo = convInfoMap.get(p.id);
        return {
          id: p.id,
          stockIdNumber: p.stockIdNumber,
          qualityId: p.qualityId,
          qualityName: p.quality?.qualityName || 'Unknown',
          shape: p.shape,
          color: p.color,
          clarity: p.clarity,
          caratWeight: carats,
          costRate: Number(p.costPerCarat || 0),
          totalValue: carats * Number(p.costPerCarat || 0),
          targetSaleRate: p.targetSaleRate != null ? Number(p.targetSaleRate) : null,
          actualSaleRate: saleInfo ? saleInfo.actualSaleRate : null,
          actualSaleAmount: saleInfo ? saleInfo.actualSaleAmount : null,
          saleInvoiceNumber: saleInfo ? saleInfo.invoiceNumber : null,
          customerName: saleInfo ? saleInfo.customerName : null,
          saleDate: saleInfo ? saleInfo.saleDate : null,
          sourcePacketId: p.sourcePacketId,
          sourceTransformId: p.sourceTransformId,
          sourcePacketStockId: p.sourcePacket?.stockIdNumber || null,
          sourceRoughCost: convInfo ? convInfo.sourceCost : null,
          sourceProcessingCost: convInfo ? convInfo.processingCost : null,
          currentStatus: p.currentStatus,
          location: p.currentLocation || (p.currentStatus === 'JOB_WORK' ? 'Worker Vault' : 'Central Vault'),
          registrationDate: p.registrationDate,
        };
      }),
    };
  }

  async getMisDashboard(companyId: number, startDateStr?: string, endDateStr?: string) {
    const end = endDateStr ? new Date(endDateStr + 'T23:59:59.999Z') : new Date();
    const start = startDateStr ? new Date(startDateStr + 'T00:00:00.000Z') : new Date(new Date().getFullYear(), 3, 1);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Today's Performance
    const salesTodayAgg = await (this.prisma as any).saleInvoice.aggregate({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: todayStart, lte: todayEnd },
      },
      _sum: { netAmount: true },
    });

    const purchaseTodayAgg = await (this.prisma as any).purchaseInvoice.aggregate({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: todayStart, lte: todayEnd },
      },
      _sum: { netAmount: true },
    });

    // In-period Performance
    const salesPeriod = await (this.prisma as any).saleInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: start, lte: end },
      },
      include: { customer: true },
    });

    const purchasePeriod = await (this.prisma as any).purchaseInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: start, lte: end },
      },
      include: { supplier: true },
    });

    // Monthly Trend Grouping
    const monthTrendMap = new Map<string, { month: string; sales: number; purchases: number }>();
    for (const inv of salesPeriod) {
      const mKey = new Date(inv.invoiceDate).toISOString().slice(0, 7); // YYYY-MM
      if (!monthTrendMap.has(mKey)) monthTrendMap.set(mKey, { month: mKey, sales: 0, purchases: 0 });
      monthTrendMap.get(mKey)!.sales += Number(inv.netAmount || 0);
    }
    for (const inv of purchasePeriod) {
      const mKey = new Date(inv.invoiceDate).toISOString().slice(0, 7); // YYYY-MM
      if (!monthTrendMap.has(mKey)) monthTrendMap.set(mKey, { month: mKey, sales: 0, purchases: 0 });
      monthTrendMap.get(mKey)!.purchases += Number(inv.netAmount || 0);
    }

    const monthlyTrend = Array.from(monthTrendMap.values()).sort((a, b) => a.month.localeCompare(b.month));

    // Top 5 Customers
    const customerMap = new Map<string, { partyName: string; billCount: number; netAmount: number }>();
    for (const inv of salesPeriod) {
      const name = inv.customer?.accountName || 'Unknown Customer';
      if (!customerMap.has(name)) customerMap.set(name, { partyName: name, billCount: 0, netAmount: 0 });
      const rec = customerMap.get(name)!;
      rec.billCount += 1;
      rec.netAmount += Number(inv.netAmount || 0);
    }
    const topCustomers = Array.from(customerMap.values())
      .sort((a, b) => b.netAmount - a.netAmount)
      .slice(0, 5);

    // Top 5 Suppliers
    const supplierMap = new Map<string, { partyName: string; billCount: number; netAmount: number }>();
    for (const inv of purchasePeriod) {
      const name = inv.supplier?.accountName || 'Unknown Supplier';
      if (!supplierMap.has(name)) supplierMap.set(name, { partyName: name, billCount: 0, netAmount: 0 });
      const rec = supplierMap.get(name)!;
      rec.billCount += 1;
      rec.netAmount += Number(inv.netAmount || 0);
    }
    const topSuppliers = Array.from(supplierMap.values())
      .sort((a, b) => b.netAmount - a.netAmount)
      .slice(0, 5);

    // Inventory Valuation
    const stockReport = await this.getStockReport(companyId, { status: 'AVAILABLE' });
    const availableValuation = stockReport.summary.totalValue;

    // Receivables & Payables
    const openInvoicesReceivable = await (this.prisma as any).saleInvoice.aggregate({
      where: { companyId, isDeleted: false, outstandingAmount: { gt: 0 } },
      _sum: { outstandingAmount: true },
    });

    const openInvoicesPayable = await (this.prisma as any).purchaseInvoice.aggregate({
      where: { companyId, isDeleted: false, outstandingAmount: { gt: 0 } },
      _sum: { outstandingAmount: true },
    });

    const totalReceivable = Number(openInvoicesReceivable?._sum?.outstandingAmount || 0);
    const totalPayable = Number(openInvoicesPayable?._sum?.outstandingAmount || 0);

    const todaySales = Number(salesTodayAgg?._sum?.netAmount || 0);
    const todayPurchases = Number(purchaseTodayAgg?._sum?.netAmount || 0);

    return {
      today: {
        sales: todaySales,
        purchases: todayPurchases,
      },
      monthlyTrend,
      topCustomers,
      topSuppliers,
      kpis: {
        salesTodayAmount: todaySales,
        purchaseTodayAmount: todayPurchases,
        inventoryValuation: availableValuation,
        availableCarats: stockReport.summary.totalCarats,
        availablePieces: stockReport.summary.totalPieces,
        totalReceivable,
        totalPayable,
        netWorkingCapital: (availableValuation + totalReceivable) - totalPayable,
      },
    };
  }

  async getMisStockJobAnalytics(companyId: number) {
    const packets = await this.prisma.stockPacket.findMany({
      where: { companyId },
      include: { quality: true },
    });

    const now = new Date();
    let totalAvailableValue = 0;
    let slowMovingValue = 0;
    let slowMovingCount = 0;
    let availableCount = 0;

    // Quality-wise breakdown
    const qualityMap: Record<string, { qualityName: string; count: number; carats: number; value: number }> = {};
    for (const p of packets) {
      const qName = p.quality?.qualityName || 'Unknown';
      if (!qualityMap[qName]) qualityMap[qName] = { qualityName: qName, count: 0, carats: 0, value: 0 };
      const carats = Number(p.caratWeight || 0);
      const val = carats * Number(p.costPerCarat || 0);
      qualityMap[qName].count++;
      qualityMap[qName].carats += carats;
      qualityMap[qName].value += val;

      if (p.currentStatus === 'AVAILABLE') {
        availableCount++;
        totalAvailableValue += val;
        const regDate = new Date(p.registrationDate || p.createdAt);
        const diffDays = Math.floor((now.getTime() - regDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays > 90) {
          slowMovingCount++;
          slowMovingValue += val;
        }
      }
    }

    // Status-wise breakdown
    const statusMap: Record<string, { status: string; count: number; carats: number; value: number }> = {};
    for (const p of packets) {
      const st = p.currentStatus;
      if (!statusMap[st]) statusMap[st] = { status: st, count: 0, carats: 0, value: 0 };
      const carats = Number(p.caratWeight || 0);
      statusMap[st].count++;
      statusMap[st].carats += carats;
      statusMap[st].value += carats * Number(p.costPerCarat || 0);
    }

    // Job Work analytics
    const jobVouchers = await this.prisma.jobVoucher.findMany({
      where: { companyId, isDeleted: false },
      include: { party: true },
    });

    let totalJobIncome = 0;
    let totalJobExpense = 0;
    let activeOrders = 0;

    for (const jv of jobVouchers) {
      const amt = Number(jv.totalAmount || 0);
      if (jv.jobType === 'JOB_INCOME') totalJobIncome += amt;
      else totalJobExpense += amt;

      const st = (jv.status || '').toString();
      if (st === 'ISSUED' || st === 'IN_PROCESS' || st === 'DRAFT' || st === 'POSTED') {
        activeOrders++;
      }
    }

    const slowMovingRatio = totalAvailableValue > 0 
      ? Math.round((slowMovingValue / totalAvailableValue) * 10000) / 100 
      : 0;

    return {
      stock: {
        totalValue: Math.round(totalAvailableValue * 100) / 100,
        slowMovingRatio,
        slowMovingValue: Math.round(slowMovingValue * 100) / 100,
        slowMovingCount,
        availableCount,
      },
      jobs: {
        activeOrders,
        totalJobIncome: Math.round(totalJobIncome * 100) / 100,
        totalJobExpense: Math.round(totalJobExpense * 100) / 100,
        netJobMargin: Math.round((totalJobIncome - totalJobExpense) * 100) / 100,
      },
      qualityBreakdown: Object.values(qualityMap).map((q) => ({
        ...q,
        carats: Math.round(q.carats * 1000) / 1000,
        value: Math.round(q.value * 100) / 100,
      })),
      statusBreakdown: Object.values(statusMap).map((s) => ({
        ...s,
        carats: Math.round(s.carats * 1000) / 1000,
        value: Math.round(s.value * 100) / 100,
      })),
      jobWorkSummary: {
        totalVouchers: jobVouchers.length,
        totalJobIncome: Math.round(totalJobIncome * 100) / 100,
        totalJobExpense: Math.round(totalJobExpense * 100) / 100,
        netJobMargin: Math.round((totalJobIncome - totalJobExpense) * 100) / 100,
      },
    };
  }

  async getMisFinancialRatios(companyId: number, dateStr?: string) {
    const asOfDate = dateStr ? new Date(dateStr) : new Date();
    const stockReport = await this.getStockReport(companyId, { status: 'AVAILABLE' });
    const inventoryVal = stockReport.summary.totalValue;

    // Receivables & Payables
    const openReceivable = await (this.prisma as any).saleInvoice.aggregate({
      where: { companyId, isDeleted: false, outstandingAmount: { gt: 0 } },
      _sum: { outstandingAmount: true },
    });

    const openPayable = await (this.prisma as any).purchaseInvoice.aggregate({
      where: { companyId, isDeleted: false, outstandingAmount: { gt: 0 } },
      _sum: { outstandingAmount: true },
    });

    const receivables = Number(openReceivable?._sum?.outstandingAmount || 0);
    const payables = Number(openPayable?._sum?.outstandingAmount || 0);

    // Cash & Bank balances
    const cashBankAcc = await this.prisma.account.findMany({
      where: {
        companyId,
        isDeleted: false,
        accountGroup: {
          nature: { in: ['ASSET', 'Assets'] },
          OR: [
            { groupName: { contains: 'Cash' } },
            { groupName: { contains: 'Bank' } },
            { groupName: { contains: 'cash' } },
            { groupName: { contains: 'bank' } },
          ],
        },
      },
    });

    let cashBankBalance = 0;
    for (const acc of cashBankAcc) {
      const glAgg = await (this.prisma as any).generalLedgerEntry.groupBy({
        by: ['debitCreditType'],
        where: { companyId, accountId: acc.id, voucherDate: { lte: asOfDate } },
        _sum: { amount: true },
      });
      const rawOp = Number(acc.openingBalanceAmount || 0);
      let bal = acc.openingBalanceType === 'CREDIT' ? -rawOp : rawOp;
      for (const r of glAgg) {
        const type = r.debitCreditType || r.debitCredit;
        if (type === 'DEBIT') bal += Number(r._sum?.amount || 0);
        else bal -= Number(r._sum?.amount || 0);
      }
      cashBankBalance += bal;
    }

    const currentAssets = inventoryVal + receivables + cashBankBalance;
    const currentLiabilities = payables;

    const currentRatio = currentLiabilities > 0 ? Math.round((currentAssets / currentLiabilities) * 100) / 100 : currentAssets > 0 ? 999.99 : 0;
    const quickAssets = receivables + cashBankBalance;
    const quickRatio = currentLiabilities > 0 ? Math.round((quickAssets / currentLiabilities) * 100) / 100 : quickAssets > 0 ? 999.99 : 0;

    return {
      asOfDate,
      currentRatio,
      quickRatio,
      receivables,
      payables,
      workingCapital: currentAssets - currentLiabilities,
      ratios: {
        currentRatio,
        quickRatio,
        workingCapital: currentAssets - currentLiabilities,
        inventoryToCurrentAssetsRatio: currentAssets > 0 ? Math.round((inventoryVal / currentAssets) * 10000) / 100 : 0,
        receivablesToPayablesRatio: payables > 0 ? Math.round((receivables / payables) * 100) / 100 : receivables > 0 ? 999.99 : 0,
      },
      components: {
        inventoryValuation: inventoryVal,
        receivables,
        payables,
        cashBankBalance: Math.round(cashBankBalance * 100) / 100,
        currentAssets,
        currentLiabilities,
      },
    };
  }
}
