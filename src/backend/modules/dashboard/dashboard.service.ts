// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Dashboard Service
// Phase 15.1: Real-time telemetry calculations
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IDashboardKpiSummary } from '../../../shared/types/dashboard.types';

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

    let totalReceivables = 0;
    let pendingReceivableCount = 0;
    let overdueReceivables = 0;

    let totalPayables = 0;
    let pendingPayableCount = 0;
    let overduePayables = 0;

    const nowTime = new Date().getTime();

    outstandingBills.forEach((bill: any) => {
      const amount = Number(bill.outstandingAmount || 0);
      const isOverdue = bill.dueDate && new Date(bill.dueDate).getTime() < nowTime;

      if (bill.billType === 'DEBIT') {
        totalReceivables += amount;
        pendingReceivableCount++;
        if (isOverdue) overdueReceivables += amount;
      } else if (bill.billType === 'CREDIT') {
        totalPayables += amount;
        pendingPayableCount++;
        if (isOverdue) overduePayables += amount;
      }
    });

    // Query all non-deleted invoices from saleInvoice table (which stores both SALE_INVOICE & PURCHASE_INVOICE via invoiceType discriminator)
    const allInvoices = await this.prisma.saleInvoice.findMany({
      where: { companyId, isDeleted: false, status: { not: 'CANCELLED' } },
      select: { invoiceType: true, outstandingAmount: true, netAmount: true, jamaAmount: true, dueDate: true },
    });

    allInvoices.forEach((inv: any) => {
      const outstanding = inv.outstandingAmount !== null && inv.outstandingAmount !== undefined
        ? Number(inv.outstandingAmount)
        : Math.max(0, Number(inv.netAmount || 0) - Number(inv.jamaAmount || 0));
      
      const isOverdue = inv.dueDate && new Date(inv.dueDate).getTime() < nowTime;

      if (inv.invoiceType === 'SALE_INVOICE' || inv.invoiceType === 'SALE_DEBIT_NOTE') {
        if (outstanding > 0 && outstandingBills.length === 0) {
          totalReceivables += outstanding;
          pendingReceivableCount++;
          if (isOverdue) overdueReceivables += outstanding;
        }
      } else if (inv.invoiceType === 'PURCHASE_INVOICE' || inv.invoiceType === 'PURCHASE_DEBIT_NOTE') {
        if (outstanding > 0) {
          totalPayables += outstanding;
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
        total: totalReceivables,
        pendingCount: pendingReceivableCount,
        receivedToday: cashReceiptsToday + bankReceiptsToday,
        overdueAmount: overdueReceivables,
      },
      payables: {
        total: totalPayables,
        pendingCount: pendingPayableCount,
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
}
