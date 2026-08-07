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
    // 1. Fetch ALL stock packets for the company to calculate global summary & quality aggregates
    const allPackets = await this.prisma.stockPacket.findMany({
      where: { companyId },
      include: {
        quality: true,
        sourcePacket: true,
      },
      orderBy: { id: 'desc' },
    });

    const allPacketIds = allPackets.map((p) => p.id);

    // 2. Batch fetch sale items for accurate sold carats & sale info
    const saleItems = await (this.prisma as any).saleInvoiceItem.findMany({
      where: {
        stockPacketId: { in: allPacketIds },
        saleInvoice: { isDeleted: false },
      },
      include: {
        saleInvoice: {
          include: { customer: true },
        },
      },
    });

    const saleInfoMap = new Map<number, { actualSaleRate: number; actualSaleAmount: number; invoiceNumber: string; customerName: string; saleDate: Date; carats: number }>();
    for (const item of saleItems) {
      if (item.stockPacketId && item.saleInvoice) {
        saleInfoMap.set(item.stockPacketId, {
          actualSaleRate: Number(item.rate || 0),
          actualSaleAmount: Number(item.netAmount || item.grossAmount || 0),
          invoiceNumber: item.saleInvoice.voucherNumber,
          customerName: item.saleInvoice.customer?.accountName || 'Unknown Customer',
          saleDate: item.saleInvoice.invoiceDate,
          carats: Number(item.carats || 0),
        });
      }
    }

    // 3. Batch fetch purchase items for fallback cost rates & carats
    const purchaseItems = await (this.prisma as any).purchaseInvoiceItem.findMany({
      where: {
        stockPacketId: { in: allPacketIds },
        purchaseInvoice: { isDeleted: false },
      },
    });

    const purchaseInfoMap = new Map<number, { costRate: number; purchaseCarats: number }>();
    for (const item of purchaseItems) {
      if (item.stockPacketId) {
        purchaseInfoMap.set(item.stockPacketId, {
          costRate: Number(item.rate || 0),
          purchaseCarats: Number(item.carats || 0),
        });
      }
    }

    const transformLogs = await (this.prisma as any).stockMovement.findMany({
      where: {
        stockPacketId: { in: allPacketIds },
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

    // 4. Global Aggregations across ALL packets
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

    const now = new Date();
    const ageing = {
      days_0_30: { count: 0, carats: 0, value: 0 },
      days_31_90: { count: 0, carats: 0, value: 0 },
      days_91_180: { count: 0, carats: 0, value: 0 },
      days_181_365: { count: 0, carats: 0, value: 0 },
      above_365: { count: 0, carats: 0, value: 0 },
    };

    const qualityAggregatesMap = new Map<string, { qualityName: string; count: number; carats: number; totalValue: number }>();

    for (const p of allPackets) {
      const saleInfo = saleInfoMap.get(p.id);
      const purchaseInfo = purchaseInfoMap.get(p.id);

      const rawCarats = Number(p.caratWeight || 0);
      const carats = rawCarats > 0 ? rawCarats : (saleInfo?.carats || purchaseInfo?.purchaseCarats || 0);

      const rawCost = Number(p.costPerCarat || 0);
      const costRate = rawCost > 0 ? rawCost : (purchaseInfo?.costRate || (saleInfo?.actualSaleRate || 0));

      let val = carats * costRate;
      if (val === 0 && saleInfo?.actualSaleAmount) {
        val = saleInfo.actualSaleAmount;
      }

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

      const regDate = p.registrationDate ? new Date(p.registrationDate) : new Date(p.createdAt);
      const ageDays = Math.max(0, Math.floor((now.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24)));
      const ageKey = (ageDays <= 30 ? 'days_0_30'
                   : ageDays <= 90 ? 'days_31_90'
                   : ageDays <= 180 ? 'days_91_180'
                   : ageDays <= 365 ? 'days_181_365'
                   : 'above_365') as keyof typeof ageing;
      if (ageing[ageKey]) {
        ageing[ageKey].count++;
        ageing[ageKey].carats += carats;
        ageing[ageKey].value += val;
      }

      // Quality aggregates
      const qName = p.quality?.qualityName || 'Unknown';
      if (!qualityAggregatesMap.has(qName)) {
        qualityAggregatesMap.set(qName, { qualityName: qName, count: 0, carats: 0, totalValue: 0 });
      }
      const qRec = qualityAggregatesMap.get(qName)!;
      qRec.count += 1;
      qRec.carats += carats;
      qRec.totalValue += val;
    }

    const qualityAggregates = Array.from(qualityAggregatesMap.values()).map((q) => ({
      qualityName: q.qualityName,
      count: q.count,
      carats: Math.round(q.carats * 1000) / 1000,
      averageRate: q.carats > 0 ? Math.round((q.totalValue / q.carats) * 100) / 100 : 0,
      totalValue: Math.round(q.totalValue * 100) / 100,
    }));

    // 5. Apply filters for packet list view
    const filteredPackets = allPackets.filter((p) => {
      if (filters?.status && filters.status !== 'ALL' && p.currentStatus !== filters.status) return false;
      if (filters?.qualityId && p.qualityId !== filters.qualityId) return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        const match = p.stockIdNumber?.toLowerCase().includes(q) ||
                      p.color?.toLowerCase().includes(q) ||
                      p.clarity?.toLowerCase().includes(q) ||
                      p.shape?.toLowerCase().includes(q) ||
                      p.quality?.qualityName?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    return {
      summary: {
        totalPackets: allPackets.length,
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
        ageing,
      },
      qualityAggregates,
      packets: filteredPackets.map((p) => {
        const saleInfo = saleInfoMap.get(p.id);
        const purchaseInfo = purchaseInfoMap.get(p.id);
        const convInfo = convInfoMap.get(p.id);

        const rawCarats = Number(p.caratWeight || 0);
        const carats = rawCarats > 0 ? rawCarats : (saleInfo?.carats || purchaseInfo?.purchaseCarats || 0);

        const rawCost = Number(p.costPerCarat || 0);
        const costRate = rawCost > 0 ? rawCost : (purchaseInfo?.costRate || (saleInfo?.actualSaleRate || 0));

        let totVal = carats * costRate;
        if (totVal === 0 && saleInfo?.actualSaleAmount) {
          totVal = saleInfo.actualSaleAmount;
        }

        return {
          id: p.id,
          stockIdNumber: p.stockIdNumber,
          qualityId: p.qualityId,
          qualityName: p.quality?.qualityName || 'Unknown',
          shape: p.shape,
          color: p.color,
          clarity: p.clarity,
          caratWeight: carats,
          costRate,
          totalValue: totVal,
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
