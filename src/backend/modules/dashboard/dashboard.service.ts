// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Dashboard Service
// Phase 15.1: Real-time telemetry calculations
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { VoucherStatus } from '@prisma/client';
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
    let fy = financialYearId
      ? await this.prisma.financialYear.findUnique({ where: { id: financialYearId } })
      : null;

    if (!fy || fy.companyId !== companyId) {
      fy = (await this.prisma.financialYear.findFirst({ where: { companyId, isActive: true, isClosed: false } }))
        || (await this.prisma.financialYear.findFirst({ where: { companyId, isClosed: false }, orderBy: { fromDate: 'asc' } }));
    }

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
      select: { voucherNumber: true, billNumber: true, invoiceType: true, outstandingAmount: true, netAmount: true, jamaAmount: true, dueDate: true, transactionCurrency: true, exchangeRate: true },
    });

    // Query outstanding purchase invoices from purchase_invoices table
    const purchaseInvoices = await this.prisma.purchaseInvoice.findMany({
      where: { companyId, isDeleted: false, status: { not: 'CANCELLED' } },
      select: { voucherNumber: true, billNumber: true, invoiceType: true, outstandingAmount: true, netAmount: true, jamaAmount: true, dueDate: true, transactionCurrency: true, exchangeRate: true },
    });

    // Query posted Job Vouchers for Job Work Receivables & Payables
    const jobVouchers = await this.prisma.jobVoucher.findMany({
      where: { companyId, isDeleted: false, status: VoucherStatus.POSTED },
      select: {
        id: true,
        voucherNumber: true,
        billNumber: true,
        partyId: true,
        subcontractorPartyId: true,
        netAmount: true,
        totalAmount: true,
        contractorExpenseTotal: true,
        transactionCurrency: true,
        exchangeRate: true,
        voucherDate: true,
      },
    });

    const jobSettlements = await this.prisma.cashBankVoucher.findMany({
      where: { companyId, isDeleted: false },
      select: { partyId: true, referenceBillNo: true, amount: true },
    });

    const allJvAdjustments = await this.prisma.journalVoucher.findMany({
      where: { companyId, isDeleted: false, status: VoucherStatus.POSTED },
      select: { referenceId: true, totalDebit: true, transactionCurrency: true, exchangeRate: true }
    });

    // Pre-build a Map of JV settlements indexed by referenceId for O(1) lookups
    // instead of O(n*m) loop for every invoice
    const jvSettlementMap = new Map<string, { totalDebitBase: number; isUsd: boolean; exRate: number }[]>();
    for (const j of allJvAdjustments) {
      if (!j.referenceId) continue;
      const key = j.referenceId;
      if (!jvSettlementMap.has(key)) {
        jvSettlementMap.set(key, []);
      }
      jvSettlementMap.get(key)!.push({
        totalDebitBase: Number(j.totalDebit),
        isUsd: j.transactionCurrency === 'USD',
        exRate: Number(j.exchangeRate) || 1.0,
      });
    }

    const getJvSettlement = (billNumber: string | undefined, isUsd: boolean, exRate: number) => {
      if (!billNumber) return 0;
      const entries = jvSettlementMap.get(billNumber);
      if (!entries) return 0;
      let total = 0;
      for (const e of entries) {
        if (isUsd) {
          const valUsd = e.isUsd ? (e.totalDebitBase / (e.exRate || 1.0)) : (e.totalDebitBase / (exRate || 1.0));
          total += valUsd;
        } else {
          total += e.totalDebitBase;
        }
      }
      return total;
    };

    let totalBilledReceivablesInr = 0;
    let pendingReceivablesInr = 0;
    let pendingReceivableCountInr = 0;
    let doneReceivedReceivablesInr = 0;
    let overdueReceivablesInr = 0;

    let totalBilledReceivablesUsd = 0;
    let pendingReceivablesUsd = 0;
    let pendingReceivableCountUsd = 0;
    let doneReceivedReceivablesUsd = 0;
    let overdueReceivablesUsd = 0;

    let totalBilledPayablesInr = 0;
    let pendingPayablesInr = 0;
    let pendingPayableCountInr = 0;
    let donePaidPayablesInr = 0;
    let overduePayablesInr = 0;

    let totalBilledPayablesUsd = 0;
    let pendingPayablesUsd = 0;
    let pendingPayableCountUsd = 0;
    let donePaidPayablesUsd = 0;
    let overduePayablesUsd = 0;

    // Process sale invoices for receivables
    saleInvoices.forEach((inv: any) => {
      const isUsd = inv.transactionCurrency === 'USD';
      const exRate = isUsd ? (Number(inv.exchangeRate) || 1) : 1;
      const netBase = Number(inv.netAmount || 0) * exRate;
      const jamaBase = Number(inv.jamaAmount || 0) * exRate;
      const netRaw = Number(inv.netAmount || 0);
      const jamaRaw = Number(inv.jamaAmount || 0);
      const jvPaid = getJvSettlement(inv.voucherNumber || inv.billNumber, isUsd, exRate);

      const baseOutstanding = inv.outstandingAmount !== null && inv.outstandingAmount !== undefined
        ? Number(inv.outstandingAmount)
        : Math.max(0, netRaw - jamaRaw);
      const outstandingRaw = Math.max(0, baseOutstanding - jvPaid);
      const outstandingBase = outstandingRaw * exRate;
      
      const isOverdue = inv.dueDate && new Date(inv.dueDate).getTime() < nowTime;

      if (inv.invoiceType === 'SALE_INVOICE' || inv.invoiceType === 'SALE_DEBIT_NOTE') {
        totalBilledReceivables += netBase;
        doneReceivedReceivables += jamaBase;

        if (isUsd) {
          totalBilledReceivablesUsd += netRaw;
          doneReceivedReceivablesUsd += jamaRaw + jvPaid;
          if (outstandingRaw > 0) {
            pendingReceivablesUsd += outstandingRaw;
            pendingReceivableCountUsd++;
            if (isOverdue) overdueReceivablesUsd += outstandingRaw;
          }
        } else {
          totalBilledReceivablesInr += netRaw;
          doneReceivedReceivablesInr += jamaRaw + jvPaid;
          if (outstandingRaw > 0) {
            pendingReceivablesInr += outstandingRaw;
            pendingReceivableCountInr++;
            if (isOverdue) overdueReceivablesInr += outstandingRaw;
          }
        }

        if (outstandingBase > 0 && outstandingBills.length === 0) {
          pendingReceivables += outstandingBase;
          pendingReceivableCount++;
          if (isOverdue) overdueReceivables += outstandingBase;
        }
      }
    });

    // Process purchase invoices for payables
    purchaseInvoices.forEach((inv: any) => {
      const isUsd = inv.transactionCurrency === 'USD';
      const exRate = isUsd ? (Number(inv.exchangeRate) || 1) : 1;
      const netBase = Number(inv.netAmount || 0) * exRate;
      const jamaBase = Number(inv.jamaAmount || 0) * exRate;
      const netRaw = Number(inv.netAmount || 0);
      const jamaRaw = Number(inv.jamaAmount || 0);
      const jvPaid = getJvSettlement(inv.voucherNumber || inv.billNumber, isUsd, exRate);

      const baseOutstanding = inv.outstandingAmount !== null && inv.outstandingAmount !== undefined
        ? Number(inv.outstandingAmount)
        : Math.max(0, netRaw - jamaRaw);
      const outstandingRaw = Math.max(0, baseOutstanding - jvPaid);
      const outstandingBase = outstandingRaw * exRate;
      
      const isOverdue = inv.dueDate && new Date(inv.dueDate).getTime() < nowTime;

      if (inv.invoiceType === 'PURCHASE_INVOICE' || inv.invoiceType === 'PURCHASE_DEBIT_NOTE') {
        totalBilledPayables += netBase;
        donePaidPayables += jamaBase;

        if (isUsd) {
          totalBilledPayablesUsd += netRaw;
          donePaidPayablesUsd += jamaRaw + jvPaid;
          if (outstandingRaw > 0) {
            pendingPayablesUsd += outstandingRaw;
            pendingPayableCountUsd++;
            if (isOverdue) overduePayablesUsd += outstandingRaw;
          }
        } else {
          totalBilledPayablesInr += netRaw;
          donePaidPayablesInr += jamaRaw + jvPaid;
          if (outstandingRaw > 0) {
            pendingPayablesInr += outstandingRaw;
            pendingPayableCountInr++;
            if (isOverdue) overduePayablesInr += outstandingRaw;
          }
        }

        if (outstandingBase > 0) {
          pendingPayables += outstandingBase;
          pendingPayableCount++;
          if (isOverdue) overduePayables += outstandingBase;
        }
      }
    });

    // Process posted Job Vouchers for Receivables & Payables (both USD and INR)
    jobVouchers.forEach((jv: any) => {
      const isUsd = jv.transactionCurrency === 'USD';
      const exRate = isUsd ? (Number(jv.exchangeRate) || 1) : 1;
      const billNum = jv.voucherNumber || jv.billNumber;

      // 1. Client Receivable (Party)
      const clientTotalRaw = Number(jv.netAmount || jv.totalAmount || 0);
      if (clientTotalRaw > 0) {
        const clientSettled = jobSettlements
          .filter((s: any) => s.partyId === jv.partyId && s.referenceBillNo === billNum)
          .reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0) + getJvSettlement(billNum, isUsd, exRate);
        const outstandingRaw = Math.max(0, clientTotalRaw - clientSettled);
        const outstandingBase = outstandingRaw * exRate;

        if (isUsd) {
          totalBilledReceivablesUsd += clientTotalRaw;
          doneReceivedReceivablesUsd += clientSettled;
          if (outstandingRaw > 0) {
            pendingReceivablesUsd += outstandingRaw;
            pendingReceivableCountUsd++;
          }
        } else {
          totalBilledReceivablesInr += clientTotalRaw;
          doneReceivedReceivablesInr += clientSettled;
          if (outstandingRaw > 0) {
            pendingReceivablesInr += outstandingRaw;
            pendingReceivableCountInr++;
          }
        }

        if (outstandingBase > 0) {
          totalBilledReceivables += clientTotalRaw * exRate;
          doneReceivedReceivables += clientSettled * exRate;
          pendingReceivables += outstandingBase;
          pendingReceivableCount++;
        }
      }

      // 2. Subcontractor Payable (Factory Vendor)
      const contractorTotalRaw = Number(jv.contractorExpenseTotal || 0);
      if (contractorTotalRaw > 0 && jv.subcontractorPartyId) {
        const contractorSettled = jobSettlements
          .filter((s: any) => s.partyId === jv.subcontractorPartyId && s.referenceBillNo === billNum)
          .reduce((sum: number, s: any) => sum + Number(s.amount || 0), 0) + getJvSettlement(billNum, isUsd, exRate);
        const outstandingRaw = Math.max(0, contractorTotalRaw - contractorSettled);
        const outstandingBase = outstandingRaw * exRate;

        if (isUsd) {
          totalBilledPayablesUsd += contractorTotalRaw;
          donePaidPayablesUsd += contractorSettled;
          if (outstandingRaw > 0) {
            pendingPayablesUsd += outstandingRaw;
            pendingPayableCountUsd++;
          }
        } else {
          totalBilledPayablesInr += contractorTotalRaw;
          donePaidPayablesInr += contractorSettled;
          if (outstandingRaw > 0) {
            pendingPayablesInr += outstandingRaw;
            pendingPayableCountInr++;
          }
        }

        if (outstandingBase > 0) {
          totalBilledPayables += contractorTotalRaw * exRate;
          donePaidPayables += contractorSettled * exRate;
          pendingPayables += outstandingBase;
          pendingPayableCount++;
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
      if (groupText.includes('DEBTOR') || groupText.includes('CUSTOMER')) {
        customerCount++;
      } else if (groupText.includes('CREDITOR') || groupText.includes('SUPPLIER')) {
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
      select: { netAmount: true, transactionCurrency: true, exchangeRate: true },
    });

    let salesTodayValue = 0;
    salesToday.forEach((s: any) => {
      const exRate = s.transactionCurrency === 'USD' ? (Number(s.exchangeRate) || 1) : 1;
      salesTodayValue += Number(s.netAmount || 0) * exRate;
    });

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
      select: { netAmount: true, transactionCurrency: true, exchangeRate: true },
    });

    let purchaseTodayValue = 0;
    purchasesToday.forEach((p: any) => {
      const exRate = p.transactionCurrency === 'USD' ? (Number(p.exchangeRate) || 1) : 1;
      purchaseTodayValue += Number(p.netAmount || 0) * exRate;
    });

    // Cash & Bank Vouchers and Account Balances
    const allCashBankVouchers = await this.prisma.cashBankVoucher.findMany({
      where: { companyId, isDeleted: false },
      select: { transactionType: true, amount: true, voucherDate: true, createdAt: true },
    });

    const cashBankAccounts = await this.prisma.account.findMany({
      where: {
        companyId,
        isDeleted: false,
      },
      select: {
        id: true,
        accountName: true,
        openingBalanceAmount: true,
        openingBalanceType: true,
        accountGroup: { select: { groupName: true } },
      },
    });

    const glSums = await this.prisma.generalLedgerEntry.groupBy({
      by: ['accountId', 'debitCreditType'],
      where: { companyId },
      _sum: { amount: true }
    });

    const usdGlEntries = await this.prisma.generalLedgerEntry.findMany({
      where: {
        companyId,
        account: {
          OR: [
            { accountName: { contains: 'USD' } },
            { accountName: { contains: 'usd' } },
          ]
        }
      },
      select: {
        accountId: true,
        debitCreditType: true,
        amount: true,
        originalAmount: true,
      }
    });

    let finalCashNetBalance = 0;
    let finalCashUsdBalance = 0;
    let finalBankNetBalance = 0;
    let finalBankUsdBalance = 0;

    cashBankAccounts.forEach((acc: any) => {
      const opening = Number(acc.openingBalanceAmount || 0);
      const isOpeningDebit = acc.openingBalanceType === 'DEBIT';

      const groupName = (acc.accountGroup?.groupName || '').toLowerCase();
      const accName = (acc.accountName || '').toLowerCase();
      const isUsd = accName.includes('usd') || (acc as any).currency === 'USD';

      let debitSum = 0;
      let creditSum = 0;

      if (isUsd) {
        const accUsdGles = usdGlEntries.filter((e: any) => e.accountId === acc.id);
        for (const e of accUsdGles) {
          const val = e.originalAmount !== null && e.originalAmount !== undefined ? Number(e.originalAmount) : Number(e.amount);
          if (e.debitCreditType === 'DEBIT') debitSum += val;
          else creditSum += val;
        }
      } else {
        const accountGL = glSums.filter((e: any) => e.accountId === acc.id);
        debitSum = Number(accountGL.find((e: any) => e.debitCreditType === 'DEBIT')?._sum?.amount || 0);
        creditSum = Number(accountGL.find((e: any) => e.debitCreditType === 'CREDIT')?._sum?.amount || 0);
      }

      const balance = isOpeningDebit ? (opening + debitSum - creditSum) : (-opening + debitSum - creditSum);

      if (groupName.includes('cash') || accName.includes('cash')) {
        if (isUsd) {
          finalCashUsdBalance += balance;
        } else {
          finalCashNetBalance += balance;
        }
      } else if (groupName.includes('bank') || accName.includes('bank') || accName.includes('hdfc') || accName.includes('icici') || accName.includes('sbi') || accName.includes('axis') || accName.includes('kotak')) {
        if (isUsd) {
          finalBankUsdBalance += balance;
        } else {
          finalBankNetBalance += balance;
        }
      }
    });

    let cashReceiptsToday = 0;
    let cashPaymentsToday = 0;
    let bankReceiptsToday = 0;
    let bankPaymentsToday = 0;

    let totalCashReceipts = 0;
    let totalCashPayments = 0;
    let totalBankReceipts = 0;
    let totalBankPayments = 0;

    allCashBankVouchers.forEach((v: any) => {
      const amt = Number(v.amount || 0);
      const vDate = new Date(v.voucherDate || v.createdAt);
      const isToday = vDate >= todayStart && vDate <= todayEnd;

      if (v.transactionType === 'CASH_RECEIPT') {
        totalCashReceipts += amt;
        if (isToday) cashReceiptsToday += amt;
      }
      if (v.transactionType === 'CASH_PAYMENT') {
        totalCashPayments += amt;
        if (isToday) cashPaymentsToday += amt;
      }
      if (v.transactionType === 'BANK_RECEIPT') {
        totalBankReceipts += amt;
        if (isToday) bankReceiptsToday += amt;
      }
      if (v.transactionType === 'BANK_PAYMENT') {
        totalBankPayments += amt;
        if (isToday) bankPaymentsToday += amt;
      }
    });

    const displayCashReceipts = cashReceiptsToday > 0 || cashPaymentsToday > 0 ? cashReceiptsToday : totalCashReceipts;
    const displayCashPayments = cashReceiptsToday > 0 || cashPaymentsToday > 0 ? cashPaymentsToday : totalCashPayments;
    const displayBankReceipts = bankReceiptsToday > 0 || bankPaymentsToday > 0 ? bankReceiptsToday : totalBankReceipts;
    const displayBankPayments = bankReceiptsToday > 0 || bankPaymentsToday > 0 ? bankPaymentsToday : totalBankPayments;

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

    // Fetch origin purchase invoice currencies for packets
    const packetIds = packets.map((p) => p.id);
    const purchasePacketItems = await this.prisma.purchaseInvoiceItem.findMany({
      where: { stockPacketId: { in: packetIds } },
      select: {
        stockPacketId: true,
        purchaseInvoice: { select: { transactionCurrency: true, exchangeRate: true } },
      },
    });

    const packetCurrencyMap = new Map<number, { currency: string; rate: number }>();
    purchasePacketItems.forEach((pi) => {
      if (pi.stockPacketId && pi.purchaseInvoice) {
        packetCurrencyMap.set(pi.stockPacketId, {
          currency: pi.purchaseInvoice.transactionCurrency || 'USD',
          rate: Number(pi.purchaseInvoice.exchangeRate) || 1,
        });
      }
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
      const rawPrice = Number(p.totalCost || 0);
      
      const currInfo = packetCurrencyMap.get(p.id);
      const exRate = currInfo?.currency === 'USD' ? (currInfo.rate || 1) : (p.targetSaleRateCurrency === 'USD' ? 89 : 1);
      const priceInr = rawPrice * exRate;

      totalCarats += wt;
      totalValuation += priceInr;

      if (p.currentStatus === 'AVAILABLE') availablePackets++;
      if (p.currentStatus === 'HOLD' || p.currentStatus === 'ON_HOLD' || p.currentStatus === 'RESERVED') heldPackets++;

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
      receivablesInr: {
        total: totalBilledReceivablesInr,
        pending: pendingReceivablesInr,
        pendingCount: pendingReceivableCountInr,
        doneReceived: doneReceivedReceivablesInr,
        overdueAmount: overdueReceivablesInr,
      },
      receivablesUsd: {
        total: totalBilledReceivablesUsd,
        pending: pendingReceivablesUsd,
        pendingCount: pendingReceivableCountUsd,
        doneReceived: doneReceivedReceivablesUsd,
        overdueAmount: overdueReceivablesUsd,
      },
      payables: {
        total: totalBilledPayables,
        pending: pendingPayables,
        pendingCount: pendingPayableCount,
        donePaid: donePaidPayables,
        paidToday: cashPaymentsToday + bankPaymentsToday,
        overdueAmount: overduePayables,
      },
      payablesInr: {
        total: totalBilledPayablesInr,
        pending: pendingPayablesInr,
        pendingCount: pendingPayableCountInr,
        donePaid: donePaidPayablesInr,
        overdueAmount: overduePayablesInr,
      },
      payablesUsd: {
        total: totalBilledPayablesUsd,
        pending: pendingPayablesUsd,
        pendingCount: pendingPayableCountUsd,
        donePaid: donePaidPayablesUsd,
        overdueAmount: overduePayablesUsd,
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
        receipts: displayCashReceipts,
        payments: displayCashPayments,
        netBalance: finalCashNetBalance,
        usdBalance: finalCashUsdBalance,
      },
      todayBank: {
        receipts: displayBankReceipts,
        payments: displayBankPayments,
        netBalance: finalBankNetBalance,
        usdBalance: finalBankUsdBalance,
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

  async getBusinessAnalytics(companyId: number, monthsCount: number = 6): Promise<IBusinessAnalyticsData> {
    const now = new Date();
    const count = Number(monthsCount) === 12 ? 12 : 6;

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

    // Monthly aggregates map for past rolling months (6 or 12)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySalesMap = new Map<string, { sales: number; count: number }>();
    const monthlyPurchaseMap = new Map<string, { purchases: number; count: number }>();

    for (let i = count - 1; i >= 0; i--) {
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
      const exRate = inv.transactionCurrency === 'USD' ? (Number(inv.exchangeRate) || 1) : 1;
      const net = Number(inv.netAmount || 0) * exRate;

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
        const itemValInr = Number(it.netAmount || it.amount || it.grossAmount || 0) * exRate;
        qObj.carats += Number(it.carats || 0);
        qObj.salesValue += itemValInr;
        qualityMap.set(qName, qObj);
      });
    });

    const supplierMap = new Map<string, { name: string; purchased: number; count: number }>();

    purchaseInvoices.forEach((inv: any) => {
      const d = new Date(inv.invoiceDate || inv.createdAt);
      const mKey = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      const exRate = inv.transactionCurrency === 'USD' ? (Number(inv.exchangeRate) || 1) : 1;
      const net = Number(inv.netAmount || 0) * exRate;

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
