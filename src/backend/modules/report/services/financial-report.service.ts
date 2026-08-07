// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Financial Report Sub-Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { DebitCreditType, VoucherStatus } from '@prisma/client';
import { getOrCreateDefaultAccount } from '../../../utils/default-account-helper';

@Injectable()
export class FinancialReportService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  private async safeCreateGlEntry(data: any) {
    if (!data.accountId || !data.companyId) return;
    const account = await this.prisma.account.findFirst({
      where: { id: data.accountId, isDeleted: false },
    });
    if (!account) return;
    try {
      await this.prisma.generalLedgerEntry.create({ data });
    } catch (err) {
      console.warn('Skipped invalid GL entry sync:', err);
    }
  }

  async reconcileLegacyEntries(companyId: number) {
    try {
      // Reconcile sale invoices
      const saleInvoices = await (this.prisma as any).saleInvoice.findMany({
        where: { companyId, isDeleted: false },
      });
      // Reconcile purchase invoices
      const purchaseInvoicesForReconcile = await (this.prisma as any).purchaseInvoice.findMany({
        where: { companyId, isDeleted: false },
      });
      // Normalize purchase invoices to have customerId for the reconciliation loop
      const invoices = [
        ...saleInvoices,
        ...purchaseInvoicesForReconcile.map((p: any) => ({ ...p, customerId: p.supplierId })),
      ];

      const salesLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'Sales A/c', 'Sales Accounts');
      const purchaseLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'Purchase A/c', 'Purchase Accounts');
      const cgstLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'CGST Input/Output', 'Duties & Taxes');
      const sgstLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'SGST Input/Output', 'Duties & Taxes');
      const igstLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'IGST Input/Output', 'Duties & Taxes');

      for (const inv of invoices) {
        if (!inv.customerId) continue;

        const glCount = await this.prisma.generalLedgerEntry.count({
          where: { sourceVoucherType: inv.invoiceType as any, sourceVoucherId: inv.id },
        });

        if (glCount === 0) {
          const isSales = inv.invoiceType === 'SALE_INVOICE' || inv.invoiceType === 'SALE_DEBIT_NOTE';
          const isSalesReturn = inv.invoiceType === 'SALE_RETURN';
          const isPurchaseReturn = inv.invoiceType === 'PURCHASE_RETURN';

          const partyDc: DebitCreditType = (isSales || isPurchaseReturn) ? 'DEBIT' : 'CREDIT';
          const mainDc: DebitCreditType = (isSales || isPurchaseReturn) ? 'CREDIT' : 'DEBIT';

          const mainLedgerId = (isSales || isSalesReturn) ? salesLedgerId : purchaseLedgerId;

          // Party Entry
          await this.safeCreateGlEntry({
            companyId,
            financialYearId: inv.financialYearId,
            accountId: inv.customerId,
            voucherDate: inv.invoiceDate,
            debitCredit: partyDc,
            amount: inv.netAmount,
            sourceVoucherType: inv.invoiceType as any,
            sourceVoucherId: inv.id,
            narration: inv.narration || `Auto-reconciled ${inv.invoiceType} #${inv.voucherNumber || inv.billNumber}`,
          });

          // Main Sales/Purchase Entry
          await this.safeCreateGlEntry({
            companyId,
            financialYearId: inv.financialYearId,
            accountId: mainLedgerId,
            voucherDate: inv.invoiceDate,
            debitCredit: mainDc,
            amount: inv.totalGrossAmount,
            sourceVoucherType: inv.invoiceType as any,
            sourceVoucherId: inv.id,
            narration: inv.narration || `Auto-reconciled ${inv.invoiceType} #${inv.voucherNumber || inv.billNumber}`,
          });

          // Tax Entries
          if (Number(inv.totalCgst) > 0) {
            await this.safeCreateGlEntry({
              companyId,
              financialYearId: inv.financialYearId,
              accountId: cgstLedgerId,
              voucherDate: inv.invoiceDate,
              debitCredit: mainDc,
              amount: inv.totalCgst,
              sourceVoucherType: inv.invoiceType as any,
              sourceVoucherId: inv.id,
              narration: `CGST for ${inv.voucherNumber || inv.billNumber}`,
            });
          }
          if (Number(inv.totalSgst) > 0) {
            await this.safeCreateGlEntry({
              companyId,
              financialYearId: inv.financialYearId,
              accountId: sgstLedgerId,
              voucherDate: inv.invoiceDate,
              debitCredit: mainDc,
              amount: inv.totalSgst,
              sourceVoucherType: inv.invoiceType as any,
              sourceVoucherId: inv.id,
              narration: `SGST for ${inv.voucherNumber || inv.billNumber}`,
            });
          }
          if (Number(inv.totalIgst) > 0) {
            await this.safeCreateGlEntry({
              companyId,
              financialYearId: inv.financialYearId,
              accountId: igstLedgerId,
              voucherDate: inv.invoiceDate,
              debitCredit: mainDc,
              amount: inv.totalIgst,
              sourceVoucherType: inv.invoiceType as any,
              sourceVoucherId: inv.id,
              narration: `IGST for ${inv.voucherNumber || inv.billNumber}`,
            });
          }

          if (Math.abs(Number(inv.roundOff || 0)) > 0.001) {
            const roundOffVal = Number(inv.roundOff);
            const roundOffLedgerId = await getOrCreateDefaultAccount(
              this.prisma,
              companyId,
              'Round-off A/c',
              'Indirect Expenses',
              'Expense',
            );
            const roundOffDc: DebitCreditType = roundOffVal > 0 ? 'CREDIT' : 'DEBIT';
            await this.safeCreateGlEntry({
              companyId,
              financialYearId: inv.financialYearId,
              accountId: roundOffLedgerId,
              voucherDate: inv.invoiceDate,
              debitCredit: roundOffDc,
              amount: Math.abs(roundOffVal),
              sourceVoucherType: inv.invoiceType as any,
              sourceVoucherId: inv.id,
              narration: `Round off for ${inv.voucherNumber || inv.billNumber}`,
            });
          }
        }
      }

      // Reconcile Cash & Bank Vouchers
      const cashBankVouchers = await (this.prisma as any).cashBankVoucher.findMany({
        where: { companyId, isDeleted: false, status: VoucherStatus.POSTED },
      });

      for (const cb of cashBankVouchers) {
        const glCount = await this.prisma.generalLedgerEntry.count({
          where: { sourceVoucherType: cb.voucherType as any, sourceVoucherId: cb.id },
        });

        if (glCount === 0) {
          const isReceipt = cb.voucherType === 'CASH_RECEIPT' || cb.voucherType === 'BANK_RECEIPT';
          const isPayment = cb.voucherType === 'CASH_PAYMENT' || cb.voucherType === 'BANK_PAYMENT';
          const isContra = cb.voucherType === 'CONTRA';

          const mainDc: DebitCreditType = isReceipt ? 'DEBIT' : (isPayment ? 'CREDIT' : 'DEBIT');

          // Main Bank/Cash Account Entry
          await this.safeCreateGlEntry({
            companyId,
            financialYearId: cb.financialYearId,
            accountId: cb.accountId,
            voucherDate: cb.voucherDate,
            debitCredit: mainDc,
            amount: cb.totalAmount,
            sourceVoucherType: cb.voucherType as any,
            sourceVoucherId: cb.id,
            narration: cb.narration || `Auto-reconciled ${cb.voucherType} #${cb.voucherNumber}`,
          });

          // Offset Items Entries
          for (const item of cb.items || []) {
            let itemDc: DebitCreditType;
            if (isContra) {
              itemDc = 'CREDIT';
            } else if (item.debitCredit) {
              itemDc = item.debitCredit;
            } else {
              itemDc = isReceipt ? 'CREDIT' : 'DEBIT';
            }

            await this.safeCreateGlEntry({
              companyId,
              financialYearId: cb.financialYearId,
              accountId: item.accountId,
              voucherDate: cb.voucherDate,
              debitCredit: itemDc,
              amount: item.amount,
              sourceVoucherType: cb.voucherType as any,
              sourceVoucherId: cb.id,
              narration: item.narration || cb.narration || `Auto-reconciled item for ${cb.voucherNumber}`,
            });
          }
        }
      }

      // Reconcile Journal Vouchers
      const journalVouchers = await (this.prisma as any).journalVoucher.findMany({
        where: { companyId, isDeleted: false, status: VoucherStatus.POSTED },
        include: { lines: true },
      });

      for (const jv of journalVouchers) {
        const glCount = await this.prisma.generalLedgerEntry.count({
          where: { sourceVoucherType: 'JOURNAL_VOUCHER' as any, sourceVoucherId: jv.id },
        });

        if (glCount === 0) {
          const jvItems = jv.lines || jv.items || [];
          for (const item of jvItems) {
            await this.safeCreateGlEntry({
              companyId,
              financialYearId: jv.financialYearId,
              accountId: item.accountId,
              voucherDate: jv.voucherDate,
              debitCredit: item.debitCredit,
              amount: item.amount,
              sourceVoucherType: 'JOURNAL_VOUCHER' as any,
              sourceVoucherId: jv.id,
              narration: item.narration || jv.narration || `Auto-reconciled JV #${jv.voucherNumber}`,
            });
          }
        }
      }
    } catch (err) {
      console.error('Legacy entry reconciliation failed:', err);
    }
  }

  async getLedger(companyId: number, accountId: number | number[], startDateStr?: string, endDateStr?: string) {
    await this.reconcileLegacyEntries(companyId);
    const start = startDateStr ? new Date(startDateStr) : null;
    const end = endDateStr ? new Date(endDateStr) : null;

    const ids = Array.isArray(accountId) ? accountId : [accountId];
    const results = [];

    for (const id of ids) {
      const account = await this.prisma.account.findFirst({
        where: { id, companyId, isDeleted: false },
        include: { accountGroup: true },
      });

      if (!account) continue;

      const whereClause: any = { accountId: id, companyId };
      if (start || end) {
        whereClause.voucherDate = {};
        if (start) whereClause.voucherDate.gte = start;
        if (end) whereClause.voucherDate.lte = end;
      }

      const entries = await (this.prisma as any).generalLedgerEntry.findMany({
        where: whereClause,
        orderBy: [{ voucherDate: 'asc' }, { id: 'asc' }],
      });

      let runningBalance = Number(account.openingBalanceAmount || 0);

      const mappedStatements = entries.map((e: any) => {
        const amt = Number(e.amount);
        if (e.debitCredit === 'DEBIT') {
          runningBalance += amt;
        } else {
          runningBalance -= amt;
        }

        return {
          id: e.id,
          voucherDate: e.voucherDate,
          sourceVoucherType: e.sourceVoucherType,
          sourceVoucherId: e.sourceVoucherId,
          debitCredit: e.debitCredit,
          amount: amt,
          narration: e.narration,
          runningBalance,
        };
      });

      results.push({
        accountId: account.id,
        accountName: account.accountName,
        phone: account.phone || '',
        address: (account as any).address || '',
        groupName: account.accountGroup?.groupName || 'Unassigned',
        openingBalance: Number(account.openingBalanceAmount || 0),
        statements: mappedStatements,
        closingBalance: runningBalance,
      });
    }

    return Array.isArray(accountId) ? results : (results[0] || null);
  }

  async getTrialBalance(companyId: number, dateStr?: string) {
    await this.reconcileLegacyEntries(companyId);
    const asOfDate = dateStr ? new Date(dateStr) : new Date();

    const accounts = await this.prisma.account.findMany({
      where: { companyId, isDeleted: false },
      include: { accountGroup: true },
    });

    const allGlAgg = await (this.prisma as any).generalLedgerEntry.groupBy({
      by: ['accountId', 'debitCreditType'],
      where: {
        companyId,
        voucherDate: { lte: asOfDate },
      },
      _sum: { amount: true },
    });

    const glMap = new Map<number, { debit: number; credit: number }>();
    for (const row of allGlAgg) {
      if (!row.accountId) continue;
      if (!glMap.has(row.accountId)) glMap.set(row.accountId, { debit: 0, credit: 0 });
      const rec = glMap.get(row.accountId)!;
      const type = row.debitCreditType || row.debitCredit;
      if (type === 'DEBIT') rec.debit += Number(row._sum?.amount || 0);
      if (type === 'CREDIT') rec.credit += Number(row._sum?.amount || 0);
    }

    const trialBalanceRows = accounts.map((acc) => {
      const gl = glMap.get(acc.id) || { debit: 0, credit: 0 };
      const totalDebit = gl.debit;
      const totalCredit = gl.credit;

      const rawOpBal = Number(acc.openingBalanceAmount || 0);
      const opBal = acc.openingBalanceType === 'CREDIT' ? -rawOpBal : rawOpBal;
      const netMovement = totalDebit - totalCredit;
      const closing = opBal + netMovement;

      const debit = closing > 0 ? closing : (totalDebit > totalCredit ? totalDebit - totalCredit : 0);
      const credit = closing < 0 ? Math.abs(closing) : (totalCredit > totalDebit ? totalCredit - totalDebit : 0);

      return {
        id: acc.id,
        accountId: acc.id,
        accountName: acc.accountName,
        groupName: acc.accountGroup?.groupName || 'Primary',
        nature: acc.accountGroup?.nature || 'Assets',
        openingBalance: opBal,
        debitAmount: totalDebit,
        creditAmount: totalCredit,
        debit,
        credit,
        closingBalance: closing,
      };
    });

    const grandTotals = trialBalanceRows.reduce(
      (acc, r) => ({
        totalDebit: acc.totalDebit + (r.closingBalance > 0 ? r.closingBalance : 0),
        totalCredit: acc.totalCredit + (r.closingBalance < 0 ? Math.abs(r.closingBalance) : 0),
      }),
      { totalDebit: 0, totalCredit: 0 }
    );

    const variance = grandTotals.totalDebit - grandTotals.totalCredit;

    return {
      asOfDate,
      rows: trialBalanceRows,
      groups: trialBalanceRows,
      grandTotals,
      totalDebit: grandTotals.totalDebit,
      totalCredit: grandTotals.totalCredit,
      variance,
    };
  }

  async getProfitLoss(companyId: number, startDateStr?: string, endDateStr?: string) {
    await this.reconcileLegacyEntries(companyId);

    let start: Date;
    if (startDateStr) {
      start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
    } else {
      const now = new Date();
      start = now.getMonth() >= 3
        ? new Date(now.getFullYear(), 3, 1, 0, 0, 0, 0)
        : new Date(now.getFullYear() - 1, 3, 1, 0, 0, 0, 0);
    }

    let end: Date;
    if (endDateStr) {
      end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
    } else {
      end = new Date();
    }

    // Single bulk SQL query for all GL movements in date range for this company
    const allGlAgg = await (this.prisma as any).generalLedgerEntry.groupBy({
      by: ['accountId', 'debitCreditType'],
      where: {
        companyId,
        voucherDate: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });

    const accountIds = Array.from(new Set(allGlAgg.map((r: any) => r.accountId).filter(Boolean))) as number[];

    const accounts = await this.prisma.account.findMany({
      where: {
        id: { in: accountIds },
        companyId,
        isDeleted: false,
      },
      include: { accountGroup: true },
    });

    const glMap = new Map<number, { debit: number; credit: number }>();
    for (const row of allGlAgg) {
      if (!row.accountId) continue;
      if (!glMap.has(row.accountId)) glMap.set(row.accountId, { debit: 0, credit: 0 });
      const rec = glMap.get(row.accountId)!;
      const type = row.debitCredit || row.debitCreditType;
      if (type === 'DEBIT') rec.debit += Number(row._sum?.amount || 0);
      if (type === 'CREDIT') rec.credit += Number(row._sum?.amount || 0);
    }

    const plRows: any[] = [];

    for (const acc of accounts) {
      const nat = (acc.accountGroup?.nature || '').toUpperCase();
      const grp = (acc.accountGroup?.groupName || '').toUpperCase();
      const accName = (acc.accountName || '').toUpperCase();

      // Exclude Balance Sheet party groups (Sundry Debtors, Sundry Creditors, Job Workers, Brokers, Bank Accounts)
      if (
        grp.includes('JOB WORKERS') ||
        grp.includes('DEBTORS') ||
        grp.includes('CREDITORS') ||
        grp.includes('BROKERS') ||
        grp.includes('BANK')
      ) {
        continue;
      }

      const isIncomeGroup = nat.includes('INCOME') || nat.includes('REVENUE') || grp.includes('INCOME') || grp.includes('SALES') || accName.includes('SALES');
      const isExpenseGroup = nat.includes('EXPENSE') || nat.includes('COST') || grp.includes('EXPENSE') || grp.includes('PURCHASE') || grp.includes('DIRECT') || grp.includes('INDIRECT') || accName.includes('PURCHASE');

      if (!isIncomeGroup && !isExpenseGroup) {
        // Skip balance sheet asset/liability ledgers
        continue;
      }

      const gl = glMap.get(acc.id) || { debit: 0, credit: 0 };
      const debits = gl.debit;
      const credits = gl.credit;

      if (debits === 0 && credits === 0) continue;

      const isIncome = isIncomeGroup;
      const netVal = isIncome ? (credits - debits) : (debits - credits);

      plRows.push({
        accountId: acc.id,
        accountName: acc.accountName,
        groupName: acc.accountGroup?.groupName || 'PL Account',
        nature: acc.accountGroup?.nature || (isIncome ? 'Income' : 'Expense'),
        isIncome,
        debits,
        credits,
        netAmount: netVal,
      });
    }

    const incomeRows = plRows.filter((r) => r.isIncome);
    const expenseRows = plRows.filter((r) => !r.isIncome);

    const totalIncome = incomeRows.reduce((sum, r) => sum + r.netAmount, 0);
    const totalExpenses = expenseRows.reduce((sum, r) => sum + r.netAmount, 0);

    // Categorized breakdown for frontend Profit & Loss view
    const salesIncome = incomeRows
      .filter((r) => r.groupName.toLowerCase().includes('sales') || r.accountName.toLowerCase().includes('sales'))
      .reduce((sum, r) => sum + r.netAmount, 0);

    const jobWorkIncome = incomeRows
      .filter((r) => (r.groupName.toLowerCase().includes('job') && !r.groupName.toLowerCase().includes('worker')) || (r.accountName.toLowerCase().includes('job') && !r.accountName.toLowerCase().includes('worker')))
      .reduce((sum, r) => sum + r.netAmount, 0);

    const otherIncome = incomeRows
      .filter((r) => !r.groupName.toLowerCase().includes('sales') && !r.groupName.toLowerCase().includes('job') && !r.accountName.toLowerCase().includes('sales') && !r.accountName.toLowerCase().includes('job'))
      .reduce((sum, r) => sum + r.netAmount, 0);

    const purchases = expenseRows
      .filter((r) => r.groupName.toLowerCase().includes('purchase') || r.accountName.toLowerCase().includes('purchase'))
      .reduce((sum, r) => sum + r.netAmount, 0);

    const jobWorkExpense = expenseRows
      .filter((r) => (r.groupName.toLowerCase().includes('job') && !r.groupName.toLowerCase().includes('worker')) || (r.accountName.toLowerCase().includes('job') && !r.accountName.toLowerCase().includes('worker')))
      .reduce((sum, r) => sum + r.netAmount, 0);

    const directExpense = expenseRows
      .filter((r) => (r.nature.toLowerCase().includes('cost of goods') || r.groupName.toLowerCase().includes('direct')) && !r.groupName.toLowerCase().includes('purchase') && !r.groupName.toLowerCase().includes('job'))
      .reduce((sum, r) => sum + r.netAmount, 0);

    const operatingExpense = expenseRows
      .filter((r) => !r.groupName.toLowerCase().includes('purchase') && !r.groupName.toLowerCase().includes('job') && !r.groupName.toLowerCase().includes('direct'))
      .reduce((sum, r) => sum + r.netAmount, 0);

    const totalRevenue = salesIncome + jobWorkIncome;
    const totalCostOfGoods = purchases + jobWorkExpense + directExpense;
    const grossProfit = totalRevenue - totalCostOfGoods;
    const totalOperatingExpense = operatingExpense;
    const netProfit = grossProfit - totalOperatingExpense + otherIncome;

    return {
      period: { start, end },
      incomeRows,
      expenseRows,
      totalIncome,
      totalExpenses,
      netProfitOrLoss: netProfit,
      // Structured object model consumed by ProfitLossPage component
      revenue: {
        sales: salesIncome,
        jobWorkIncome,
        total: totalRevenue,
      },
      costOfGoods: {
        purchases,
        jobWorkExpense,
        directExpense,
        total: totalCostOfGoods,
      },
      grossProfit,
      expenses: {
        operatingExpense,
        total: totalOperatingExpense,
      },
      otherIncome,
      netProfit,
    };
  }

  async getBalanceSheet(companyId: number, dateStr?: string) {
    const tb = await this.getTrialBalance(companyId, dateStr);
    const pl = await this.getProfitLoss(companyId, undefined, dateStr);

    const isAssetNature = (n: string) => n.toUpperCase() === 'ASSET' || n.toUpperCase() === 'ASSETS';
    const isLiabilityNature = (n: string) => n.toUpperCase() === 'LIABILITY' || n.toUpperCase() === 'LIABILITIES';

    const assetRows = tb.rows.filter((r) => isAssetNature(r.nature) && Math.abs(r.closingBalance) > 0.001);
    const liabilityRows = tb.rows.filter((r) => isLiabilityNature(r.nature) && !r.groupName.toLowerCase().includes('capital') && !r.groupName.toLowerCase().includes('reserve') && Math.abs(r.closingBalance) > 0.001);
    const equityRows = tb.rows.filter((r) => r.nature?.toUpperCase() === 'EQUITY' || r.groupName.toLowerCase().includes('capital') || r.groupName.toLowerCase().includes('reserve'));

    const capital = equityRows.map((r) => ({
      groupName: `${r.accountName} (${r.groupName})`,
      amount: Math.abs(r.closingBalance),
    }));

    const netProfit = pl.netProfit || pl.netProfitOrLoss || 0;
    if (Math.abs(netProfit) > 0.001) {
      capital.push({
        groupName: netProfit >= 0 ? 'Current Profit & Loss (Net Profit)' : 'Current Profit & Loss (Net Loss)',
        amount: netProfit,
      });
    }

    // Include Opening Balance Difference in Equity if unallocated opening balances exist
    let openingBalDiff = 0;
    for (const r of tb.rows) {
      openingBalDiff += r.openingBalance;
    }

    if (Math.abs(openingBalDiff) > 0.001) {
      capital.push({
        groupName: 'Opening Balance Difference / Unallocated Capital',
        amount: openingBalDiff,
      });
    }

    const liabilities = liabilityRows.map((r) => {
      // Liabilities have normal Credit balances (credits - debits = -closingBalance)
      const normalLiabilityAmount = -r.closingBalance;
      return {
        groupName: `${r.accountName} (${r.groupName})`,
        amount: normalLiabilityAmount,
      };
    });

    const assets = assetRows.map((r) => ({
      groupName: `${r.accountName} (${r.groupName})`,
      amount: r.closingBalance,
    }));

    const totalCapital = capital.reduce((sum, item) => sum + item.amount, 0);
    const totalLiabilities = liabilities.reduce((sum, item) => sum + item.amount, 0);
    const totalAssets = assets.reduce((sum, item) => sum + item.amount, 0);

    const totalLiabilitiesAndCapital = totalCapital + totalLiabilities;
    const variance = Math.abs(totalAssets - totalLiabilitiesAndCapital);
    const isBalanced = variance < 0.01;

    return {
      asOfDate: tb.asOfDate,
      assets,
      liabilities,
      capital,
      totalAssets,
      totalLiabilities,
      totalCapital,
      variance,
      isBalanced,
      profitLossDetails: {
        revenue: {
          sales: pl.revenue?.sales || 0,
          jobWorkIncome: pl.revenue?.jobWorkIncome || 0,
          total: pl.revenue?.total || 0,
        },
        costOfGoods: {
          purchases: pl.costOfGoods?.purchases || 0,
          jobWorkExpense: pl.costOfGoods?.jobWorkExpense || 0,
          directExpense: pl.costOfGoods?.directExpense || 0,
          total: pl.costOfGoods?.total || 0,
        },
        expenses: {
          operatingExpense: pl.expenses?.operatingExpense || 0,
          total: pl.expenses?.total || 0,
        },
        otherIncome: pl.otherIncome || 0,
        netProfit,
      },
    };
  }

  async getOutstanding(companyId: number, type: 'RECEIVABLE' | 'PAYABLE') {
    await this.reconcileLegacyEntries(companyId);
    const isReceivable = type === 'RECEIVABLE';

    // Find all Customer or Supplier accounts
    const targetGroupLower = isReceivable ? 'sundry debtors' : 'sundry creditors';

    const accounts = await this.prisma.account.findMany({
      where: {
        companyId,
        isDeleted: false,
        accountGroup: {
          groupName: { contains: targetGroupLower },
        },
      },
      include: {
        accountGroup: true,
      },
    });

    const accountIds = accounts.map(a => a.id);

    // Fetch all sale / purchase invoices for these accounts
    const invoices = isReceivable
      ? await (this.prisma as any).saleInvoice.findMany({
        where: { companyId, customerId: { in: accountIds }, isDeleted: false },
      })
      : await (this.prisma as any).purchaseInvoice.findMany({
        where: { companyId, supplierId: { in: accountIds }, isDeleted: false },
      });

    const now = new Date();

    const outstandingList = accounts.map((acc) => {
      const partyInvoices = invoices.filter((i: any) => (isReceivable ? i.customerId === acc.id : i.supplierId === acc.id));

      let totalOutstanding = 0;
      const aging = {
        bucket_0_30: 0,
        bucket_31_60: 0,
        bucket_61_90: 0,
        bucket_91_180: 0,
        bucket_181_365: 0,
        bucket_above_365: 0,
      };

      for (const inv of partyInvoices) {
        const amt = Number(inv.outstandingAmount ?? inv.netAmount ?? 0);
        if (amt <= 0) continue;

        totalOutstanding += amt;
        const invDate = new Date(inv.invoiceDate);
        const diffDays = Math.floor((now.getTime() - invDate.getTime()) / (1000 * 3600 * 24));

        if (diffDays <= 30) aging.bucket_0_30 += amt;
        else if (diffDays <= 60) aging.bucket_31_60 += amt;
        else if (diffDays <= 90) aging.bucket_61_90 += amt;
        else if (diffDays <= 180) aging.bucket_91_180 += amt;
        else if (diffDays <= 365) aging.bucket_181_365 += amt;
        else aging.bucket_above_365 += amt;
      }

      return {
        id: acc.id,
        accountName: acc.accountName,
        creditDays: acc.creditDays,
        creditLimit: Number(acc.creditLimit || 0),
        totalOutstanding,
        aging,
      };
    }).filter(a => a.totalOutstanding > 0);

    return outstandingList;
  }

  async getDayBookSummary(companyId: number, dateStr: string) {
    const start = new Date(dateStr + 'T00:00:00');
    const end = new Date(dateStr + 'T23:59:59.999');

    // Fetch all cash and bank accounts
    const accounts = await this.prisma.account.findMany({
      where: {
        companyId,
        isDeleted: false,
        accountGroup: {
          groupName: { in: ['Cash-in-Hand', 'Bank Accounts', 'Cash & Bank Accounts', 'Cash', 'Bank'] },
        },
      },
    });

    const accountIds = accounts.map((a) => a.id);

    // Fetch all GL entries on this date for cash & bank accounts
    const entries = await (this.prisma as any).generalLedgerEntry.findMany({
      where: {
        companyId,
        accountId: { in: accountIds },
        voucherDate: { gte: start, lte: end },
      },
      include: {
        account: true,
      },
      orderBy: { id: 'asc' },
    });

    // Opening balances: sum of all prior GL entries up to start of day
    let openingCashInr = 0;
    let openingCashUsd = 0;
    let openingBankInr = 0;
    let openingBankUsd = 0;

    for (const acc of accounts) {
      const isCash = acc.accountName.toLowerCase().includes('cash');
      const priorEntries = await (this.prisma as any).generalLedgerEntry.findMany({
        where: {
          companyId,
          accountId: acc.id,
          voucherDate: { lt: start },
        },
      });

      let netPrior = Number(acc.openingBalanceAmount || 0);
      for (const pe of priorEntries) {
        const amt = Number(pe.amount);
        if (pe.debitCredit === 'DEBIT') netPrior += amt;
        else netPrior -= amt;
      }

      if (isCash) {
        openingCashInr += netPrior;
      } else {
        openingBankInr += netPrior;
      }
    }

    let dayTotalReceiptsInr = 0;
    let dayTotalPaymentsInr = 0;

    const mappedEntries = entries.map((e: any) => {
      const amt = Number(e.amount);
      const isReceipt = e.debitCredit === 'DEBIT';
      if (isReceipt) dayTotalReceiptsInr += amt;
      else dayTotalPaymentsInr += amt;

      return {
        id: e.id,
        voucherDate: e.voucherDate,
        voucherType: e.sourceVoucherType,
        voucherId: e.sourceVoucherId,
        accountName: e.account?.accountName || 'Unknown',
        debitCredit: e.debitCredit,
        amount: amt,
        narration: e.narration,
      };
    });

    const closingCashInr = openingCashInr + (entries.filter((e: any) => e.account?.accountName.toLowerCase().includes('cash') && e.debitCredit === 'DEBIT').reduce((s: any, e: any) => s + Number(e.amount), 0) - entries.filter((e: any) => e.account?.accountName.toLowerCase().includes('cash') && e.debitCredit === 'CREDIT').reduce((s: any, e: any) => s + Number(e.amount), 0));
    const closingBankInr = openingBankInr + (entries.filter((e: any) => !e.account?.accountName.toLowerCase().includes('cash') && e.debitCredit === 'DEBIT').reduce((s: any, e: any) => s + Number(e.amount), 0) - entries.filter((e: any) => !e.account?.accountName.toLowerCase().includes('cash') && e.debitCredit === 'CREDIT').reduce((s: any, e: any) => s + Number(e.amount), 0));

    const closingCashUsd = 0;
    const closingBankUsd = 0;

    return {
      dateStr,
      openingCash: Math.round(openingCashInr * 100) / 100,
      openingCashInr: Math.round(openingCashInr * 100) / 100,
      openingCashUsd: Math.round(openingCashUsd * 100) / 100,
      openingBank: Math.round(openingBankInr * 100) / 100,
      openingBankInr: Math.round(openingBankInr * 100) / 100,
      openingBankUsd: Math.round(openingBankUsd * 100) / 100,
      totalReceipts: Math.round(dayTotalReceiptsInr * 100) / 100,
      totalPayments: Math.round(dayTotalPaymentsInr * 100) / 100,
      closingCash: Math.round(closingCashInr * 100) / 100,
      closingCashInr: Math.round(closingCashInr * 100) / 100,
      closingCashUsd: Math.round(closingCashUsd * 100) / 100,
      closingBank: Math.round(closingBankInr * 100) / 100,
      closingBankInr: Math.round(closingBankInr * 100) / 100,
      closingBankUsd: Math.round(closingBankUsd * 100) / 100,
      entries: mappedEntries,
    };
  }

  async getDayBookDatesList(companyId: number, startDateStr?: string, endDateStr?: string) {
    const end = endDateStr ? new Date(endDateStr) : new Date();
    const start = startDateStr ? new Date(startDateStr) : new Date(end.getTime() - 30 * 24 * 3600 * 1000);

    // Group GL entries by voucherDate to find dates with activity
    const datesGroup = await (this.prisma as any).generalLedgerEntry.groupBy({
      by: ['voucherDate'],
      where: {
        companyId,
        voucherDate: { gte: start, lte: end },
      },
      _count: { id: true },
      orderBy: { voucherDate: 'desc' },
    });

    const dateMap: Record<string, number> = {};
    for (const dg of datesGroup) {
      const dStr = new Date(dg.voucherDate).toISOString().split('T')[0];
      dateMap[dStr] = (dateMap[dStr] || 0) + dg._count.id;
    }

    const results = [];
    const dates = Object.keys(dateMap).sort().reverse();

    for (const dStr of dates) {
      const dayStart = new Date(dStr + 'T00:00:00');
      const accounts = await this.prisma.account.findMany({
        where: {
          companyId,
          isDeleted: false,
          accountGroup: {
            groupName: { in: ['Cash-in-Hand', 'Bank Accounts', 'Cash & Bank Accounts', 'Cash', 'Bank'] },
          },
        },
      });

      let openingCashInr = 0;
      let openingCashUsd = 0;
      let openingBankInr = 0;
      let openingBankUsd = 0;

      for (const acc of accounts) {
        const isCash = acc.accountName.toLowerCase().includes('cash');
        const priorEntries = await (this.prisma as any).generalLedgerEntry.findMany({
          where: {
            companyId,
            accountId: acc.id,
            voucherDate: { lt: dayStart },
          },
        });

        let netPrior = Number(acc.openingBalanceAmount || 0);
        for (const pe of priorEntries) {
          const amt = Number(pe.amount);
          if (pe.debitCredit === 'DEBIT') netPrior += amt;
          else netPrior -= amt;
        }

        if (isCash) openingCashInr += netPrior;
        else openingBankInr += netPrior;
      }

      const dayEnd = new Date(dStr + 'T23:59:59.999');
      const dayEntries = await (this.prisma as any).generalLedgerEntry.findMany({
        where: {
          companyId,
          accountId: { in: accounts.map((a) => a.id) },
          voucherDate: { gte: dayStart, lte: dayEnd },
        },
        include: { account: true },
      });

      let closingCashInr = openingCashInr;
      let closingBankInr = openingBankInr;
      let closingCashUsd = openingCashUsd;
      let closingBankUsd = openingBankUsd;

      for (const de of dayEntries) {
        const isCash = de.account?.accountName.toLowerCase().includes('cash');
        const amt = Number(de.amount);
        if (isCash) {
          if (de.debitCredit === 'DEBIT') closingCashInr += amt;
          else closingCashInr -= amt;
        } else {
          if (de.debitCredit === 'DEBIT') closingBankInr += amt;
          else closingBankInr -= amt;
        }
      }

      results.push({
        dateStr: dStr,
        transactionCount: dateMap[dStr] || 0,
        openingCash: Math.round(openingCashInr * 100) / 100,
        openingCashInr: Math.round(openingCashInr * 100) / 100,
        openingCashUsd: Math.round(openingCashUsd * 100) / 100,
        openingBank: Math.round(openingBankInr * 100) / 100,
        openingBankInr: Math.round(openingBankInr * 100) / 100,
        openingBankUsd: Math.round(openingBankUsd * 100) / 100,
        closingCash: Math.round(closingCashInr * 100) / 100,
        closingCashInr: Math.round(closingCashInr * 100) / 100,
        closingCashUsd: Math.round(closingCashUsd * 100) / 100,
        closingBank: Math.round(closingBankInr * 100) / 100,
        closingBankInr: Math.round(closingBankInr * 100) / 100,
        closingBankUsd: Math.round(closingBankUsd * 100) / 100,
      });
    }

    return results;
  }

  async getCashFlow(companyId: number, startDateStr?: string, endDateStr?: string) {
    await this.reconcileLegacyEntries(companyId);

    const end = endDateStr ? new Date(endDateStr + 'T23:59:59.999Z') : new Date();
    const start = startDateStr ? new Date(startDateStr + 'T00:00:00.000Z') : new Date(new Date().getFullYear(), 3, 1);

    // Fetch cash & bank accounts
    const cashAccounts = await this.prisma.account.findMany({
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
      include: {
        accountGroup: true,
      },
    });

    const cashAccountIds = cashAccounts.map((a) => a.id);

    // 1. Compute Opening Cash & Bank Balance prior to start date
    let openingCashBalance = 0;
    for (const acc of cashAccounts) {
      const rawOp = Number(acc.openingBalanceAmount || 0);
      const op = acc.openingBalanceType === 'CREDIT' ? -rawOp : rawOp;

      const priorAgg = await (this.prisma as any).generalLedgerEntry.groupBy({
        by: ['debitCreditType'],
        where: {
          companyId,
          accountId: acc.id,
          voucherDate: { lt: start },
        },
        _sum: { amount: true },
      });

      let priorDebit = 0;
      let priorCredit = 0;
      for (const r of priorAgg) {
        const dc = r.debitCreditType || r.debitCredit;
        if (dc === 'DEBIT') priorDebit += Number(r._sum?.amount || 0);
        if (dc === 'CREDIT') priorCredit += Number(r._sum?.amount || 0);
      }
      openingCashBalance += op + priorDebit - priorCredit;
    }

    // 2. Fetch all cash & bank GL movements within the specified period
    const glEntries = await (this.prisma as any).generalLedgerEntry.findMany({
      where: {
        companyId,
        accountId: { in: cashAccountIds },
        voucherDate: { gte: start, lte: end },
      },
      include: {
        account: { select: { id: true, accountName: true } },
      },
      orderBy: { voucherDate: 'asc' },
    });

    let operatingInflow = 0;
    let operatingOutflow = 0;
    let investingInflow = 0;
    let investingOutflow = 0;
    let financingInflow = 0;
    let financingOutflow = 0;

    const details: Array<{
      date: string;
      category: 'OPERATING' | 'INVESTING' | 'FINANCING';
      description: string;
      amount: number;
      voucherType: string;
    }> = [];

    for (const entry of glEntries) {
      const amt = Number(entry.amount || 0);
      const dc = entry.debitCreditType || entry.debitCredit;
      const isDebit = dc === 'DEBIT'; // Inflow to Cash/Bank is DEBIT
      const signedAmt = isDebit ? amt : -amt;
      const vType = (entry.sourceVoucherType || '').toString();

      let category: 'OPERATING' | 'INVESTING' | 'FINANCING' = 'OPERATING';

      if (vType === 'LOAN_VOUCHER' || vType.includes('CAPITAL')) {
        category = 'FINANCING';
        if (isDebit) financingInflow += amt;
        else financingOutflow += amt;
      } else if (vType.includes('ASSET') || vType.includes('INVEST')) {
        category = 'INVESTING';
        if (isDebit) investingInflow += amt;
        else investingOutflow += amt;
      } else {
        category = 'OPERATING';
        if (isDebit) operatingInflow += amt;
        else operatingOutflow += amt;
      }

      details.push({
        date: new Date(entry.voucherDate).toISOString().split('T')[0],
        category,
        description: entry.narration || `${vType} #${entry.sourceBillNumber || entry.sourceVoucherId}`,
        amount: signedAmt,
        voucherType: vType,
      });
    }

    const netOperating = operatingInflow - operatingOutflow;
    const netInvesting = investingInflow - investingOutflow;
    const netFinancing = financingInflow - financingOutflow;
    const netChange = netOperating + netInvesting + netFinancing;

    const openingCash = Math.round(openingCashBalance * 100) / 100;
    const netCashChange = Math.round(netChange * 100) / 100;
    const closingCash = Math.round((openingCash + netChange) * 100) / 100;

    return {
      period: { start, end },
      openingCash,
      openingCashBalance: openingCash,
      operating: {
        inflow: Math.round(operatingInflow * 100) / 100,
        outflow: Math.round(operatingOutflow * 100) / 100,
        net: Math.round(netOperating * 100) / 100,
      },
      investing: {
        inflow: Math.round(investingInflow * 100) / 100,
        outflow: Math.round(investingOutflow * 100) / 100,
        net: Math.round(netInvesting * 100) / 100,
      },
      financing: {
        inflow: Math.round(financingInflow * 100) / 100,
        outflow: Math.round(financingOutflow * 100) / 100,
        net: Math.round(netFinancing * 100) / 100,
      },
      netChange: netCashChange,
      netCashChange,
      closingCash,
      closingCashBalance: closingCash,
      details,
    };
  }

  async getFundFlow(companyId: number, startDateStr?: string, endDateStr?: string) {
    await this.reconcileLegacyEntries(companyId);

    const start = startDateStr ? new Date(startDateStr + 'T00:00:00.000Z') : new Date(new Date().getFullYear(), 3, 1);
    const end = endDateStr ? new Date(endDateStr + 'T23:59:59.999Z') : new Date();

    const pl = await this.getProfitLoss(companyId, startDateStr, endDateStr);
    const netProfit = pl.netProfit || pl.netProfitOrLoss || 0;

    // Working Capital Accounts (Current Assets & Current Liabilities)
    const accounts = await this.prisma.account.findMany({
      where: { companyId, isDeleted: false },
      include: { accountGroup: true },
    });

    let openingWorkingCapital = 0;
    let closingWorkingCapital = 0;

    const wcDetails: Array<{
      accountName: string;
      groupName: string;
      opening: number;
      closing: number;
      type: 'ASSET' | 'LIABILITY';
    }> = [];

    // Batch fetch prior and period aggregations for all accounts in one go
    const allPriorAgg = await (this.prisma as any).generalLedgerEntry.groupBy({
      by: ['accountId', 'debitCreditType'],
      where: { companyId, voucherDate: { lt: start } },
      _sum: { amount: true },
    });

    const allPeriodAgg = await (this.prisma as any).generalLedgerEntry.groupBy({
      by: ['accountId', 'debitCreditType'],
      where: { companyId, voucherDate: { gte: start, lte: end } },
      _sum: { amount: true },
    });

    const priorMap = new Map<number, { dr: number; cr: number }>();
    for (const r of allPriorAgg) {
      if (!r.accountId) continue;
      if (!priorMap.has(r.accountId)) priorMap.set(r.accountId, { dr: 0, cr: 0 });
      const rec = priorMap.get(r.accountId)!;
      const dc = r.debitCreditType || r.debitCredit;
      if (dc === 'DEBIT') rec.dr += Number(r._sum?.amount || 0);
      if (dc === 'CREDIT') rec.cr += Number(r._sum?.amount || 0);
    }

    const periodMap = new Map<number, { dr: number; cr: number }>();
    for (const r of allPeriodAgg) {
      if (!r.accountId) continue;
      if (!periodMap.has(r.accountId)) periodMap.set(r.accountId, { dr: 0, cr: 0 });
      const rec = periodMap.get(r.accountId)!;
      const dc = r.debitCreditType || r.debitCredit;
      if (dc === 'DEBIT') rec.dr += Number(r._sum?.amount || 0);
      if (dc === 'CREDIT') rec.cr += Number(r._sum?.amount || 0);
    }

    for (const acc of accounts) {
      const gName = (acc.accountGroup?.groupName || '').toLowerCase();
      const nature = (acc.accountGroup?.nature || '').toUpperCase();

      const isCA = (nature === 'ASSETS' || nature === 'ASSET') && (gName.includes('current') || gName.includes('debtors') || gName.includes('stock') || gName.includes('cash') || gName.includes('bank'));
      const isCL = (nature === 'LIABILITIES' || nature === 'LIABILITY') && (gName.includes('current') || gName.includes('creditors') || gName.includes('duties') || gName.includes('suspense') || gName.includes('job worker'));

      if (!isCA && !isCL) continue;

      const rawOp = Number(acc.openingBalanceAmount || 0);
      const opBal = acc.openingBalanceType === 'CREDIT' ? -rawOp : rawOp;

      const pRec = priorMap.get(acc.id) || { dr: 0, cr: 0 };
      const prRec = periodMap.get(acc.id) || { dr: 0, cr: 0 };

      const openingBal = opBal + pRec.dr - pRec.cr;
      const closingBal = openingBal + prRec.dr - prRec.cr;

      // Normal sign representation
      const opening = isCA ? openingBal : -openingBal;
      const closing = isCA ? closingBal : -closingBal;

      if (Math.abs(opening) > 0.001 || Math.abs(closing) > 0.001) {
        wcDetails.push({
          accountName: acc.accountName,
          groupName: acc.accountGroup?.groupName || 'Primary',
          opening: Math.round(opening * 100) / 100,
          closing: Math.round(closing * 100) / 100,
          type: isCA ? 'ASSET' : 'LIABILITY',
        });
      }

      if (isCA) {
        openingWorkingCapital += opening;
        closingWorkingCapital += closing;
      } else {
        openingWorkingCapital -= opening;
        closingWorkingCapital -= closing;
      }
    }

    const wcChange = Math.round((closingWorkingCapital - openingWorkingCapital) * 100) / 100;

    const sources: Array<{ description: string; amount: number }> = [];
    const applications: Array<{ description: string; amount: number }> = [];

    if (netProfit > 0) {
      sources.push({ description: 'Funds from Operations (Net Profit)', amount: Math.round(netProfit * 100) / 100 });
    } else if (netProfit < 0) {
      applications.push({ description: 'Operating Loss from Operations', amount: Math.round(Math.abs(netProfit) * 100) / 100 });
    }

    if (wcChange < 0) {
      sources.push({ description: 'Decrease in Working Capital', amount: Math.round(Math.abs(wcChange) * 100) / 100 });
    } else if (wcChange > 0) {
      applications.push({ description: 'Increase in Working Capital', amount: Math.round(wcChange * 100) / 100 });
    }

    const sourcesTotal = sources.reduce((sum, item) => sum + item.amount, 0);
    const applicationsTotal = applications.reduce((sum, item) => sum + item.amount, 0);

    return {
      period: { start, end },
      workingCapital: {
        openingWorkingCapital: Math.round(openingWorkingCapital * 100) / 100,
        closingWorkingCapital: Math.round(closingWorkingCapital * 100) / 100,
        start: Math.round(openingWorkingCapital * 100) / 100,
        end: Math.round(closingWorkingCapital * 100) / 100,
        change: wcChange,
        details: wcDetails,
      },
      sources,
      applications,
      uses: applications,
      sourcesTotal: Math.round(sourcesTotal * 100) / 100,
      applicationsTotal: Math.round(applicationsTotal * 100) / 100,
      totalSources: Math.round(sourcesTotal * 100) / 100,
      totalUses: Math.round(applicationsTotal * 100) / 100,
    };
  }
}
