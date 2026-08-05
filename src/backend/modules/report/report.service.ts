import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DebitCreditType, VoucherStatus } from '@prisma/client';

@Injectable()
export class ReportService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  private async getOrCreateDefaultAccount(companyId: number, accountName: string, groupName: string): Promise<number> {
    const existing = await this.prisma.account.findFirst({
      where: { companyId, accountName, isDeleted: false },
    });
    if (existing) return existing.id;

    const group = await this.prisma.accountGroup.findFirst({
      where: { companyId, groupName, isDeleted: false },
    });
    if (!group) {
      const newGroup = await this.prisma.accountGroup.create({
        data: {
          companyId,
          groupName,
          nature: groupName.includes('Sales') ? 'Income' : (groupName.includes('Purchase') ? 'Expense' : 'Assets'),
        }
      });
      const created = await this.prisma.account.create({
        data: {
          companyId,
          accountGroupId: newGroup.id,
          accountName,
          status: 'ACTIVE',
          openingBalanceAmount: 0,
        }
      });
      return created.id;
    }

    const created = await this.prisma.account.create({
      data: {
        companyId,
        accountGroupId: group.id,
        accountName,
        status: 'ACTIVE',
        openingBalanceAmount: 0,
      },
    });
    return created.id;
  }

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
      const saleInvoices = await this.prisma.saleInvoice.findMany({
        where: { companyId, isDeleted: false },
      });
      // Reconcile purchase invoices
      const purchaseInvoicesForReconcile = await this.prisma.purchaseInvoice.findMany({
        where: { companyId, isDeleted: false },
      });
      // Normalize purchase invoices to have customerId for the reconciliation loop
      const invoices = [
        ...saleInvoices,
        ...purchaseInvoicesForReconcile.map((p: any) => ({ ...p, customerId: p.supplierId })),
      ];

      const salesLedgerId = await this.getOrCreateDefaultAccount(companyId, 'Sales A/c', 'Sales Accounts');
      const purchaseLedgerId = await this.getOrCreateDefaultAccount(companyId, 'Purchase A/c', 'Purchase Accounts');
      const cgstLedgerId = await this.getOrCreateDefaultAccount(companyId, 'CGST Input/Output', 'Duties & Taxes');
      const sgstLedgerId = await this.getOrCreateDefaultAccount(companyId, 'SGST Input/Output', 'Duties & Taxes');
      const igstLedgerId = await this.getOrCreateDefaultAccount(companyId, 'IGST Input/Output', 'Duties & Taxes');

      for (const inv of invoices) {
        if (!inv.customerId) continue;

        const glCount = await this.prisma.generalLedgerEntry.count({
          where: { sourceVoucherType: inv.invoiceType as any, sourceVoucherId: inv.id },
        });

        if (glCount === 0) {
          const isSales = inv.invoiceType === 'SALE_INVOICE' || inv.invoiceType === 'SALE_DEBIT_NOTE';
          const isSalesReturn = inv.invoiceType === 'SALE_RETURN';
          const isPurchase = inv.invoiceType === 'PURCHASE_INVOICE' || inv.invoiceType === 'PURCHASE_DEBIT_NOTE';
          const isPurchaseReturn = inv.invoiceType === 'PURCHASE_RETURN';

          let partyDebitCredit: DebitCreditType = DebitCreditType.DEBIT;
          if (isSales) partyDebitCredit = DebitCreditType.DEBIT;
          else if (isSalesReturn) partyDebitCredit = DebitCreditType.CREDIT;
          else if (isPurchase) partyDebitCredit = DebitCreditType.CREDIT;
          else if (isPurchaseReturn) partyDebitCredit = DebitCreditType.DEBIT;

          await this.safeCreateGlEntry({
            companyId,
            accountId: inv.customerId,
            voucherDate: inv.invoiceDate,
            debitCreditType: partyDebitCredit,
            amount: inv.netAmount,
            sourceVoucherType: inv.invoiceType as any,
            sourceVoucherId: inv.id,
            sourceBillNumber: inv.billNumber || inv.voucherNumber,
            narration: `Sync: ${inv.voucherNumber}`,
          });

          let revenueDebitCredit: DebitCreditType = DebitCreditType.CREDIT;
          if (isSales) revenueDebitCredit = DebitCreditType.CREDIT;
          else if (isSalesReturn) revenueDebitCredit = DebitCreditType.DEBIT;
          else if (isPurchase) revenueDebitCredit = DebitCreditType.DEBIT;
          else if (isPurchaseReturn) revenueDebitCredit = DebitCreditType.CREDIT;

          const ledgerId = (isSales || isSalesReturn) ? salesLedgerId : purchaseLedgerId;
          const totalTax = Number(inv.totalCgst || 0) + Number(inv.totalSgst || 0) + Number(inv.totalIgst || 0);
          const taxableTotal = Number(inv.netAmount) - totalTax;

          await this.safeCreateGlEntry({
            companyId,
            accountId: ledgerId,
            voucherDate: inv.invoiceDate,
            debitCreditType: revenueDebitCredit,
            amount: taxableTotal,
            sourceVoucherType: inv.invoiceType as any,
            sourceVoucherId: inv.id,
            sourceBillNumber: inv.billNumber || inv.voucherNumber,
            narration: `Sync Revenue: ${inv.voucherNumber}`,
          });

          let taxDebitCredit: DebitCreditType = DebitCreditType.CREDIT;
          if (isSales) taxDebitCredit = DebitCreditType.CREDIT;
          else if (isSalesReturn) taxDebitCredit = DebitCreditType.DEBIT;
          else if (isPurchase) taxDebitCredit = DebitCreditType.DEBIT;
          else if (isPurchaseReturn) taxDebitCredit = DebitCreditType.CREDIT;

          if (Number(inv.totalCgst) > 0) {
            await this.safeCreateGlEntry({
              companyId,
              accountId: cgstLedgerId,
              voucherDate: inv.invoiceDate,
              debitCreditType: taxDebitCredit,
              amount: inv.totalCgst,
              sourceVoucherType: inv.invoiceType as any,
              sourceVoucherId: inv.id,
              sourceBillNumber: inv.billNumber || inv.voucherNumber,
              narration: 'Sync CGST',
            });
          }
          if (Number(inv.totalSgst) > 0) {
            await this.safeCreateGlEntry({
              companyId,
              accountId: sgstLedgerId,
              voucherDate: inv.invoiceDate,
              debitCreditType: taxDebitCredit,
              amount: inv.totalSgst,
              sourceVoucherType: inv.invoiceType as any,
              sourceVoucherId: inv.id,
              sourceBillNumber: inv.billNumber || inv.voucherNumber,
              narration: 'Sync SGST',
            });
          }
          if (Number(inv.totalIgst) > 0) {
            await this.safeCreateGlEntry({
              companyId,
              accountId: igstLedgerId,
              voucherDate: inv.invoiceDate,
              debitCreditType: taxDebitCredit,
              amount: inv.totalIgst,
              sourceVoucherType: inv.invoiceType as any,
              sourceVoucherId: inv.id,
              sourceBillNumber: inv.billNumber || inv.voucherNumber,
              narration: 'Sync IGST',
            });
          }
        }
      }

      const cbVouchers = await this.prisma.cashBankVoucher.findMany({
        where: { companyId, isDeleted: false },
      });

      for (const cb of cbVouchers) {
        const glCount = await this.prisma.generalLedgerEntry.count({
          where: { sourceVoucherType: cb.transactionType as any, sourceVoucherId: cb.id },
        });

        if (glCount === 0) {
          const isReceipt = cb.transactionType === 'CASH_RECEIPT' || cb.transactionType === 'BANK_RECEIPT';
          await this.safeCreateGlEntry({
            companyId,
            accountId: cb.cashBankAccountId,
            voucherDate: cb.voucherDate,
            debitCreditType: isReceipt ? DebitCreditType.DEBIT : DebitCreditType.CREDIT,
            amount: cb.amount,
            sourceVoucherType: cb.transactionType as any,
            sourceVoucherId: cb.id,
            sourceBillNumber: cb.voucherNumber,
            narration: `Sync Cash/Bank: ${cb.voucherNumber}`,
          });

          await this.safeCreateGlEntry({
            companyId,
            accountId: cb.partyId,
            voucherDate: cb.voucherDate,
            debitCreditType: isReceipt ? DebitCreditType.CREDIT : DebitCreditType.DEBIT,
            amount: cb.amount,
            sourceVoucherType: cb.transactionType as any,
            sourceVoucherId: cb.id,
            sourceBillNumber: cb.voucherNumber,
            narration: `Sync Cash/Bank Party: ${cb.voucherNumber}`,
          });
        }
      }

      const jvs = await this.prisma.journalVoucher.findMany({
        where: { companyId, isDeleted: false },
        include: { lines: true },
      });

      for (const jv of jvs) {
        const glCount = await this.prisma.generalLedgerEntry.count({
          where: { sourceVoucherType: 'JOURNAL_VOUCHER', sourceVoucherId: jv.id },
        });

        if (glCount === 0) {
          for (const line of jv.lines) {
            await this.safeCreateGlEntry({
              companyId,
              accountId: line.accountId,
              voucherDate: jv.voucherDate,
              debitCreditType: line.debitCreditType,
              amount: line.amount,
              sourceVoucherType: 'JOURNAL_VOUCHER',
              sourceVoucherId: jv.id,
              sourceBillNumber: jv.voucherNumber,
              narration: line.narration || jv.narration || 'Sync Journal',
            });
          }
        }
      }
    } catch (err) {
      console.error('Non-blocking error during reconcileLegacyEntries:', err);
    }
  }

  /**
   * Generates General Ledger for an account
   */
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

      let prevEntries: any[] = [];
      if (start) {
        prevEntries = await this.prisma.generalLedgerEntry.findMany({
          where: {
            companyId,
            accountId: id,
            voucherDate: { lt: start },
          },
        });
      }

      let openingAmt = Number(account.openingBalanceAmount || 0);
      const openingType = account.openingBalanceType;
      let balance = openingType === DebitCreditType.DEBIT ? openingAmt : -openingAmt;

      for (const ent of prevEntries) {
        const amt = Number(ent.amount);
        if (ent.debitCreditType === DebitCreditType.DEBIT) {
          balance += amt;
        } else {
          balance -= amt;
        }
      }

      const rangeFilter: any = {
        companyId,
        accountId: id,
      };
      if (start || end) {
        rangeFilter.voucherDate = {};
        if (start) rangeFilter.voucherDate.gte = start;
        if (end) rangeFilter.voucherDate.lte = end;
      }

      const entries = await this.prisma.generalLedgerEntry.findMany({
        where: rangeFilter,
        orderBy: [{ voucherDate: 'asc' }, { createdAt: 'asc' }],
      });

      let runningBalance = balance;
      const statements = entries.map((ent) => {
        const amt = Number(ent.amount);
        if (ent.debitCreditType === DebitCreditType.DEBIT) {
          runningBalance += amt;
        } else {
          runningBalance -= amt;
        }

        return {
          id: ent.id,
          voucherDate: ent.voucherDate,
          sourceVoucherType: ent.sourceVoucherType,
          sourceVoucherId: ent.sourceVoucherId,
          sourceBillNumber: ent.sourceBillNumber,
          debitCreditType: ent.debitCreditType,
          amount: amt,
          narration: ent.narration,
          runningBalance: runningBalance,
        };
      });

      results.push({
        accountId: account.id,
        accountName: account.accountName,
        phone: account.phone || account.mobile || '',
        address: [account.addressLine1, account.addressLine2, account.city, account.stateCode, account.pincode].filter(Boolean).join(', '),
        groupName: account.accountGroup?.groupName || '',
        openingBalance: balance,
        statements,
        closingBalance: runningBalance,
      });
    }

    if (Array.isArray(accountId)) {
      return results;
    } else {
      return results[0] || null;
    }
  }

  /**
   * Generates Trial Balance
   */
  async getTrialBalance(companyId: number, dateStr?: string) {
    await this.reconcileLegacyEntries(companyId);
    const end = dateStr ? new Date(dateStr) : new Date();

    const groups = await this.prisma.accountGroup.findMany({
      where: { companyId, isDeleted: false },
      include: {
        accounts: {
          where: { isDeleted: false },
          include: {
            generalLedgerEntries: {
              where: { voucherDate: { lte: end } },
            },
          },
        },
      },
    });

    const report = groups.map((grp) => {
      let totalDebit = 0;
      let totalCredit = 0;

      for (const acc of grp.accounts) {
        // Calculate account net balance
        let balance = 0;
        const opAmt = Number(acc.openingBalanceAmount || 0);
        if (acc.openingBalanceType === DebitCreditType.DEBIT) {
          balance += opAmt;
        } else {
          balance -= opAmt;
        }

        for (const ent of acc.generalLedgerEntries) {
          const amt = Number(ent.amount);
          if (ent.debitCreditType === DebitCreditType.DEBIT) {
            balance += amt;
          } else {
            balance -= amt;
          }
        }

        if (balance > 0) {
          totalDebit += balance;
        } else if (balance < 0) {
          totalCredit += Math.abs(balance);
        }
      }

      return {
        id: grp.id,
        groupName: grp.groupName,
        parentGroupId: grp.parentGroupId,
        debit: totalDebit,
        credit: totalCredit,
        balance: totalDebit - totalCredit,
      };
    }).filter(r => r.debit > 0 || r.credit > 0);

    const totalDr = report.reduce((sum, r) => sum + r.debit, 0);
    const totalCr = report.reduce((sum, r) => sum + r.credit, 0);

    return {
      groups: report,
      totalDebit: totalDr,
      totalCredit: totalCr,
      variance: Math.abs(totalDr - totalCr),
    };
  }

  /**
   * Generates Profit & Loss Statement
   */
  async getProfitLoss(companyId: number, startDateStr?: string, endDateStr?: string) {
    await this.reconcileLegacyEntries(companyId);
    const start = startDateStr ? new Date(startDateStr) : null;
    const end = endDateStr ? new Date(endDateStr) : null;

    const rangeFilter: any = { companyId };
    if (start || end) {
      rangeFilter.voucherDate = {};
      if (start) rangeFilter.voucherDate.gte = start;
      if (end) rangeFilter.voucherDate.lte = end;
    }

    const entries = await this.prisma.generalLedgerEntry.findMany({
      where: rangeFilter,
      include: {
        account: {
          include: { accountGroup: true },
        },
      },
    });

    let sales = 0;
    let purchases = 0;
    let jobWorkIncome = 0;
    let jobWorkExpense = 0;
    let directExpense = 0;
    let operatingExpense = 0;
    let otherIncome = 0;

    for (const ent of entries) {
      const grp = ent.account?.accountGroup?.groupName?.toLowerCase() || '';
      const amt = Number(ent.amount);
      const isDebit = ent.debitCreditType === DebitCreditType.DEBIT;

      if (grp.includes('sales')) {
        sales += isDebit ? -amt : amt;
      } else if (grp.includes('purchase')) {
        purchases += isDebit ? amt : -amt;
      } else if (grp.includes('job work income') || grp.includes('job income')) {
        jobWorkIncome += isDebit ? -amt : amt;
      } else if (grp.includes('job work expense') || grp.includes('job expense')) {
        jobWorkExpense += isDebit ? amt : -amt;
      } else if (grp.includes('direct expense')) {
        directExpense += isDebit ? amt : -amt;
      } else if (grp.includes('indirect expense') || grp.includes('operating expense') || grp.includes('office') || grp.includes('administrative')) {
        operatingExpense += isDebit ? amt : -amt;
      } else if (grp.includes('indirect income') || grp.includes('other income')) {
        otherIncome += isDebit ? -amt : amt;
      }
    }

    const grossProfit = sales + jobWorkIncome - (purchases + jobWorkExpense + directExpense);
    const netProfit = grossProfit + otherIncome - operatingExpense;

    return {
      revenue: { sales, jobWorkIncome, total: sales + jobWorkIncome },
      costOfGoods: { purchases, jobWorkExpense, directExpense, total: purchases + jobWorkExpense + directExpense },
      grossProfit,
      expenses: { operatingExpense, total: operatingExpense },
      otherIncome,
      netProfit,
    };
  }

  /**
   * Generates Balance Sheet
   */
  async getBalanceSheet(companyId: number, dateStr?: string) {
    await this.reconcileLegacyEntries(companyId);
    const end = dateStr ? new Date(dateStr) : new Date();

    const groups = await this.prisma.accountGroup.findMany({
      where: { companyId, isDeleted: false },
      include: {
        accounts: {
          where: { isDeleted: false },
          include: {
            generalLedgerEntries: {
              where: { voucherDate: { lte: end } },
            },
          },
        },
      },
    });

    let assets: any[] = [];
    let liabilities: any[] = [];
    let capital: any[] = [];

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalCapital = 0;

    for (const grp of groups) {
      let balance = 0;
      for (const acc of grp.accounts) {
        const opAmt = Number(acc.openingBalanceAmount || 0);
        if (acc.openingBalanceType === DebitCreditType.DEBIT) {
          balance += opAmt;
        } else {
          balance -= opAmt;
        }

        for (const ent of acc.generalLedgerEntries) {
          const amt = Number(ent.amount);
          if (ent.debitCreditType === DebitCreditType.DEBIT) {
            balance += amt;
          } else {
            balance -= amt;
          }
        }
      }

      if (balance === 0) continue;

      const groupNameLower = grp.groupName.toLowerCase();
      const item = { id: grp.id, groupName: grp.groupName, amount: Math.abs(balance) };

      if (groupNameLower.includes('asset') || balance > 0) {
        assets.push(item);
        totalAssets += item.amount;
      } else if (groupNameLower.includes('capital') || groupNameLower.includes('equity') || groupNameLower.includes('reserve')) {
        capital.push(item);
        totalCapital += item.amount;
      } else {
        liabilities.push(item);
        totalLiabilities += item.amount;
      }
    }

    // Append Current Year Net Profit/Loss to Capital
    const pl = await this.getProfitLoss(companyId, undefined, end.toISOString());
    if (pl.netProfit !== 0) {
      capital.push({ id: 0, groupName: 'Current Year Profit & Loss A/c', amount: Math.abs(pl.netProfit), isProfit: pl.netProfit > 0 });
      totalCapital += pl.netProfit;
    }

    return {
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      capital,
      totalCapital,
      variance: Math.abs(totalAssets - (totalLiabilities + totalCapital)),
      profitLossDetails: pl,
    };
  }

  /**
   * Generates Outstanding Receivables & Payables with aging distribution
   */
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
    if (accountIds.length === 0) return [];

    // Query open invoices - from the correct table based on group type
    const isSundryCreditor = targetGroupLower.includes('creditor') || targetGroupLower.includes('supplier') || targetGroupLower.includes('purchase');

    let invoices: any[];
    if (isSundryCreditor) {
      invoices = await this.prisma.purchaseInvoice.findMany({
        where: {
          companyId,
          isDeleted: false,
          supplierId: { in: accountIds },
          status: { in: ['SAVED', 'APPROVED'] },
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        },
        orderBy: { invoiceDate: 'asc' },
      });
      // Normalize supplierId -> customerId for consistent processing
      invoices = invoices.map((inv: any) => ({ ...inv, customerId: inv.supplierId }));

      // Include unpaid Job Work Subcontractor Payables
      const jobVouchers = await this.prisma.jobVoucher.findMany({
        where: {
          companyId,
          isDeleted: false,
          subcontractorPartyId: { in: accountIds },
          status: { in: [VoucherStatus.POSTED] },
        },
        orderBy: { voucherDate: 'asc' },
      });

      for (const jv of jobVouchers) {
        const voucherNum = jv.voucherNumber || jv.billNumber;
        const settlements = await this.prisma.cashBankVoucher.findMany({
          where: { companyId, partyId: jv.subcontractorPartyId!, referenceBillNo: voucherNum, isDeleted: false },
        });
        const totalPaid = settlements.reduce((s, c) => s + Number(c.amount), 0);
        const originalAmount = Number(jv.contractorExpenseTotal);
        const outstandingAmount = Math.max(0, originalAmount - totalPaid);
        if (outstandingAmount > 0) {
          invoices.push({
            id: jv.id,
            customerId: jv.subcontractorPartyId,
            netAmount: originalAmount,
            outstandingAmount,
            invoiceDate: jv.voucherDate,
            dueDate: jv.voucherDate,
          });
        }
      }
    } else {
      invoices = await this.prisma.saleInvoice.findMany({
        where: {
          companyId,
          isDeleted: false,
          customerId: { in: accountIds },
          status: { in: ['SAVED', 'APPROVED'] },
          paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        },
        orderBy: { invoiceDate: 'asc' },
      });

      // Include unpaid Job Work Client Receivables
      const jobVouchers = await this.prisma.jobVoucher.findMany({
        where: {
          companyId,
          isDeleted: false,
          partyId: { in: accountIds },
          status: { in: [VoucherStatus.POSTED] },
        },
        orderBy: { voucherDate: 'asc' },
      });

      for (const jv of jobVouchers) {
        const voucherNum = jv.voucherNumber || jv.billNumber;
        const settlements = await this.prisma.cashBankVoucher.findMany({
          where: { companyId, partyId: jv.partyId, referenceBillNo: voucherNum, isDeleted: false },
        });
        const totalPaid = settlements.reduce((s, c) => s + Number(c.amount), 0);
        const originalAmount = Number(jv.netAmount || jv.totalAmount);
        const outstandingAmount = Math.max(0, originalAmount - totalPaid);
        if (outstandingAmount > 0) {
          invoices.push({
            id: jv.id,
            customerId: jv.partyId,
            netAmount: originalAmount,
            outstandingAmount,
            invoiceDate: jv.voucherDate,
            dueDate: jv.voucherDate,
          });
        }
      }
    }

    const today = new Date();

    const outstandingList = accounts.map((acc) => {
      const accInvoices = invoices.filter(i => i.customerId === acc.id);
      let totalOutstanding = 0;

      const aging = {
        bucket_0_30: 0,
        bucket_31_60: 0,
        bucket_61_90: 0,
        bucket_91_180: 0,
        bucket_181_365: 0,
        bucket_above_365: 0,
      };

      for (const inv of accInvoices) {
        const amt = Number(inv.outstandingAmount || inv.netAmount);
        totalOutstanding += amt;

        const baseDate = inv.dueDate ? new Date(inv.dueDate) : new Date(inv.invoiceDate);
        const diffTime = Math.max(0, today.getTime() - baseDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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

  async getStockReport(companyId: number, filters?: { status?: string; qualityId?: number; search?: string }) {
    // 1. Fetch filtered stock packets
    let packets = await this.prisma.stockPacket.findMany({
      where: {
        companyId,
        isDeleted: false,
        ...(filters?.status ? { currentStatus: filters.status as any } : {}),
        ...(filters?.qualityId ? { qualityId: Number(filters.qualityId) } : {}),
        ...(filters?.search ? {
          OR: [
            { stockIdNumber: { contains: filters.search } },
            { shape: { contains: filters.search } },
            { color: { contains: filters.search } },
            { clarity: { contains: filters.search } },
          ]
        } : {}),
      },
      include: {
        quality: true,
        movements: true,
        sourcePacket: true,
      },
      orderBy: { id: 'desc' },
    });

    // If status filter is applied, include sister conversion output packets so grouped conversion lot view is complete
    if (filters?.status) {
      const transformIds = packets.map(p => p.sourceTransformId).filter((id): id is number => id != null);
      if (transformIds.length > 0) {
        const sisterPackets = await this.prisma.stockPacket.findMany({
          where: {
            companyId,
            isDeleted: false,
            sourceTransformId: { in: transformIds },
          },
          include: {
            quality: true,
            movements: true,
            sourcePacket: true,
          },
          orderBy: { id: 'desc' },
        });

        const existingIds = new Set(packets.map(p => p.id));
        for (const sister of sisterPackets) {
          if (!existingIds.has(sister.id)) {
            packets.push(sister);
            existingIds.add(sister.id);
          }
        }
      }
    }

    // 2. Fetch all non-deleted packets for summary calculations
    const allPackets = await this.prisma.stockPacket.findMany({
      where: { companyId, isDeleted: false },
      include: {
        quality: true,
        movements: true,
      },
    });

    let totalPackets = allPackets.length;
    let totalCarats = 0;
    let totalValuation = 0;

    let availableCount = 0;
    let availableCarats = 0;
    let availableValuation = 0;

    let reservedCount = 0;
    let reservedCarats = 0;
    let reservedValuation = 0;

    let jobWorkCount = 0;
    let jobWorkCarats = 0;
    let jobWorkValuation = 0;

    let transitCount = 0;
    let transitCarats = 0;
    let transitValuation = 0;

    let soldCount = 0;
    let soldCarats = 0;
    let soldValuation = 0;

    let returnedCount = 0;
    let returnedCarats = 0;
    let returnedValuation = 0;

    let damagedCount = 0;
    let damagedCarats = 0;
    let damagedValuation = 0;

    let archivedCount = 0;
    let archivedCarats = 0;
    let archivedValuation = 0;

    for (const p of allPackets) {
      let carats = Number(p.caratWeight || 0);
      if (carats === 0 && (p.currentStatus === 'SOLD' || p.currentStatus === 'RETURNED' || p.currentStatus === 'DAMAGED')) {
        const outMov = p.movements?.find(m => m.movementType === 'SALES' || m.movementType === 'PURCHASE_RETURN');
        if (outMov) {
          carats = Number(outMov.carats || 0);
        }
      }

      const rate = Number(p.costPerCarat || 0);
      const value = carats * rate;

      totalCarats += carats;
      totalValuation += value;

      if (p.currentStatus === 'AVAILABLE') {
        availableCount++;
        availableCarats += carats;
        availableValuation += value;
      } else if (p.currentStatus === 'HOLD') {
        reservedCount++;
        reservedCarats += carats;
        reservedValuation += value;
      } else if (p.currentStatus === 'JOB_WORK') {
        jobWorkCount++;
        jobWorkCarats += carats;
        jobWorkValuation += value;
      } else if (p.currentStatus === 'CREATED' || p.currentStatus === 'PURCHASED') {
        transitCount++;
        transitCarats += carats;
        transitValuation += value;
      } else if (p.currentStatus === 'SOLD') {
        soldCount++;
        soldCarats += carats;
        soldValuation += value;
      } else if (p.currentStatus === 'RETURNED') {
        returnedCount++;
        returnedCarats += carats;
        returnedValuation += value;
      } else if (p.currentStatus === 'DAMAGED') {
        damagedCount++;
        damagedCarats += carats;
        damagedValuation += value;
      } else if (p.currentStatus === 'ARCHIVED') {
        archivedCount++;
        archivedCarats += carats;
        archivedValuation += value;
      }
    }

    // 3. Compute quality-wise aggregates from the filtered dataset
    const qualityMap = new Map<number, { qualityName: string; count: number; carats: number; value: number }>();
    for (const p of packets) {
      if (!p.quality) continue;
      const qId = p.qualityId;
      
      let carats = Number(p.caratWeight || 0);
      if (carats === 0 && (p.currentStatus === 'SOLD' || p.currentStatus === 'RETURNED' || p.currentStatus === 'DAMAGED')) {
        const outMov = p.movements?.find(m => m.movementType === 'SALES' || m.movementType === 'PURCHASE_RETURN');
        if (outMov) {
          carats = Number(outMov.carats || 0);
        }
      }

      const rate = Number(p.costPerCarat || 0);
      const value = carats * rate;

      if (!qualityMap.has(qId)) {
        qualityMap.set(qId, {
          qualityName: p.quality.qualityName,
          count: 0,
          carats: 0,
          value: 0,
        });
      }

      const qStat = qualityMap.get(qId)!;
      qStat.count++;
      qStat.carats += carats;
      qStat.value += value;
    }

    const qualityAggregates = Array.from(qualityMap.values()).map(q => ({
      qualityName: q.qualityName,
      count: q.count,
      carats: q.carats,
      averageRate: q.carats > 0 ? q.value / q.carats : 0,
      totalValue: q.value,
    }));

    // 4. Advanced Analytics (Ageing, Concentrations, Turnover)
    const today = new Date();
    const ageing = {
      days_0_30: { count: 0, carats: 0, value: 0 },
      days_31_90: { count: 0, carats: 0, value: 0 },
      days_91_180: { count: 0, carats: 0, value: 0 },
      days_181_365: { count: 0, carats: 0, value: 0 },
      above_365: { count: 0, carats: 0, value: 0 },
    };

    const shapeMap = new Map<string, { count: number; carats: number; value: number }>();
    const clarityMap = new Map<string, { count: number; carats: number; value: number }>();

    let totalCogs = 0;
    let soldPacketsCountForAge = 0;
    let totalDaysToSell = 0;

    for (const p of allPackets) {
      let carats = Number(p.caratWeight || 0);
      if (carats === 0 && (p.currentStatus === 'SOLD' || p.currentStatus === 'RETURNED' || p.currentStatus === 'DAMAGED')) {
        const outMov = p.movements?.find(m => m.movementType === 'SALES' || m.movementType === 'PURCHASE_RETURN');
        if (outMov) {
          carats = Number(outMov.carats || 0);
        }
      }

      const rate = Number(p.costPerCarat || 0);
      const value = carats * rate;

      const shape = (p.shape || 'OTHER').toUpperCase();
      const clarity = (p.clarity || 'UNKNOWN').toUpperCase();

      if (['AVAILABLE', 'HOLD', 'JOB_WORK', 'CREATED', 'PURCHASED'].includes(p.currentStatus)) {
        if (!shapeMap.has(shape)) shapeMap.set(shape, { count: 0, carats: 0, value: 0 });
        const sh = shapeMap.get(shape)!;
        sh.count++;
        sh.carats += carats;
        sh.value += value;

        if (!clarityMap.has(clarity)) clarityMap.set(clarity, { count: 0, carats: 0, value: 0 });
        const cl = clarityMap.get(clarity)!;
        cl.count++;
        cl.carats += carats;
        cl.value += value;

        const regDate = p.registrationDate ? new Date(p.registrationDate) : today;
        const diffTime = Math.abs(today.getTime() - regDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 30) {
          ageing.days_0_30.count++;
          ageing.days_0_30.carats += carats;
          ageing.days_0_30.value += value;
        } else if (diffDays <= 90) {
          ageing.days_31_90.count++;
          ageing.days_31_90.carats += carats;
          ageing.days_31_90.value += value;
        } else if (diffDays <= 180) {
          ageing.days_91_180.count++;
          ageing.days_91_180.carats += carats;
          ageing.days_91_180.value += value;
        } else if (diffDays <= 365) {
          ageing.days_181_365.count++;
          ageing.days_181_365.carats += carats;
          ageing.days_181_365.value += value;
        } else {
          ageing.above_365.count++;
          ageing.above_365.carats += carats;
          ageing.above_365.value += value;
        }
      }

      if (p.currentStatus === 'SOLD') {
        totalCogs += value;
        const salesMov = p.movements?.find(m => m.movementType === 'SALES');
        if (salesMov) {
          const regDate = p.registrationDate ? new Date(p.registrationDate) : today;
          const sellDate = new Date(salesMov.movementDate);
          const days = Math.ceil(Math.abs(sellDate.getTime() - regDate.getTime()) / (1000 * 60 * 60 * 24));
          totalDaysToSell += days;
          soldPacketsCountForAge++;
        }
      }
    }

    const shapeConcentration = Array.from(shapeMap.entries()).map(([name, val]) => ({
      name,
      ...val,
      percentage: totalValuation > 0 ? (val.value / totalValuation) * 100 : 0
    })).sort((a, b) => b.value - a.value);

    const clarityConcentration = Array.from(clarityMap.entries()).map(([name, val]) => ({
      name,
      ...val,
      percentage: totalValuation > 0 ? (val.value / totalValuation) * 100 : 0
    })).sort((a, b) => b.value - a.value);

    const avgInventoryVal = totalValuation / 2 || 1;
    const turnoverRatio = avgInventoryVal > 0 ? totalCogs / avgInventoryVal : 0;
    const avgHoldingPeriod = soldPacketsCountForAge > 0 ? totalDaysToSell / soldPacketsCountForAge : 0;

    const activeValuation = availableValuation + reservedValuation + jobWorkValuation + transitValuation;
    const activeCarats = availableCarats + reservedCarats + jobWorkCarats + transitCarats;
    const activePacketsCount = availableCount + reservedCount + jobWorkCount + transitCount;

    const packetIds = packets.map(p => p.id);
    const saleItems = packetIds.length > 0 ? await this.prisma.saleInvoiceItem.findMany({
      where: {
        stockPacketId: { in: packetIds },
        saleInvoice: { companyId, isDeleted: false, status: { in: ['SAVED', 'APPROVED'] as any[] } }
      },
      select: {
        stockPacketId: true,
        carats: true,
        rate: true,
        grossAmount: true,
        saleInvoice: {
          select: {
            billNumber: true,
            invoiceDate: true,
            customer: { select: { accountName: true } }
          }
        }
      }
    }) : [];

    const saleMap = new Map<number, { actualSaleRate: number; actualSaleAmount: number; totalCaratsSold: number; invoiceNumber: string; customerName: string; saleDate: string }>();
    for (const item of saleItems) {
      if (item.stockPacketId) {
        const existing = saleMap.get(item.stockPacketId);
        const itemCarats = Number(item.carats || 0);
        const itemAmount = Number(item.grossAmount || 0);
        const billNo = item.saleInvoice.billNumber;
        const custName = item.saleInvoice.customer?.accountName || 'Customer';
        const sDate = item.saleInvoice.invoiceDate ? item.saleInvoice.invoiceDate.toISOString().slice(0, 10) : '';

        if (existing) {
          existing.actualSaleAmount += itemAmount;
          existing.totalCaratsSold += itemCarats;
          existing.actualSaleRate = existing.totalCaratsSold > 0 ? existing.actualSaleAmount / existing.totalCaratsSold : Number(item.rate || 0);
          if (!existing.invoiceNumber.includes(billNo)) {
            existing.invoiceNumber += `, ${billNo}`;
          }
        } else {
          saleMap.set(item.stockPacketId, {
            actualSaleRate: Number(item.rate || 0),
            actualSaleAmount: itemAmount,
            totalCaratsSold: itemCarats,
            invoiceNumber: billNo,
            customerName: custName,
            saleDate: sDate,
          });
        }
      }
    }

    const convIds = packets.map(p => p.sourceTransformId).filter((id): id is number => id != null);
    const conversions = convIds.length > 0 ? await this.prisma.stockConversion.findMany({
      where: { id: { in: convIds } },
      select: { id: true, sourceCost: true, processingCost: true },
    }) : [];

    const convMap = new Map<number, { sourceCost: number; processingCost: number }>();
    for (const c of conversions) {
      convMap.set(c.id, { sourceCost: Number(c.sourceCost), processingCost: Number(c.processingCost) });
    }

    return {
      summary: {
        totalPackets,
        totalCarats,
        totalValuation,
        activeValuation,
        activeCarats,
        activePacketsCount,
        availableValuation,
        availableCarats,
        availableCount,
        statusBreakdown: {
          available: { count: availableCount, carats: availableCarats, value: availableValuation },
          reserved: { count: reservedCount, carats: reservedCarats, value: reservedValuation },
          jobWork: { count: jobWorkCount, carats: jobWorkCarats, value: jobWorkValuation },
          transit: { count: transitCount, carats: transitCarats, value: transitValuation },
          sold: { count: soldCount, carats: soldCarats, value: soldValuation },
          returned: { count: returnedCount, carats: returnedCarats, value: returnedValuation },
          damaged: { count: damagedCount, carats: damagedCarats, value: damagedValuation },
          archived: { count: archivedCount, carats: archivedCarats, value: archivedValuation },
        },
        ageing,
        shapeConcentration,
        clarityConcentration,
        turnoverRatio,
        avgHoldingPeriod,
      },
      qualityAggregates,
      packets: packets.map(p => {
        let carats = Number(p.caratWeight || 0);

        // Sum total sold carats across all sales movements
        const totalSalesMovCarats = p.movements?.filter(m => m.movementType === 'SALES').reduce((sum, m) => sum + Number(m.carats || 0), 0) || 0;

        if (p.currentStatus === 'SOLD' || (carats === 0 && totalSalesMovCarats > 0)) {
          carats = totalSalesMovCarats > 0 ? totalSalesMovCarats : Number(p.caratWeight || 0);
        }

        const saleInfo = saleMap.get(p.id) || null;
        const convInfo = p.sourceTransformId ? convMap.get(p.sourceTransformId) : null;

        return {
          id: p.id,
          stockIdNumber: p.stockIdNumber,
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

  // ═══════════════════════════════════════════════════════════════
  // GST Dashboard & Summary
  // ═══════════════════════════════════════════════════════════════

  async getGstDashboard(companyId: number, startDateStr?: string, endDateStr?: string) {
    // Default to current financial year if no dates provided
    const now = new Date();
    const fyStart = now.getMonth() >= 3
      ? new Date(now.getFullYear(), 3, 1)
      : new Date(now.getFullYear() - 1, 3, 1);
    const startDate = startDateStr ? new Date(startDateStr) : fyStart;
    const endDate = endDateStr ? new Date(endDateStr) : now;

    // ── 1. Sales Aggregation (Output Tax) ──────────────────────
    const salesInvoices = await this.prisma.saleInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      select: {
        invoiceType: true,
        invoiceDate: true,
        totalGrossAmount: true,
        totalCgst: true,
        totalSgst: true,
        totalIgst: true,
        totalCess: true,
        netAmount: true,
        customerGstin: true,
      },
    });

    let outwardTaxableValue = 0;
    let outputCgst = 0;
    let outputSgst = 0;
    let outputIgst = 0;
    let outputCess = 0;
    let totalSaleInvoices = 0;
    let totalCreditNotes = 0; // Sale returns
    let totalSaleDebitNotes = 0;

    for (const inv of salesInvoices) {
      const gross = Number(inv.totalGrossAmount || 0);
      const cgst = Number(inv.totalCgst || 0);
      const sgst = Number(inv.totalSgst || 0);
      const igst = Number(inv.totalIgst || 0);
      const cess = Number(inv.totalCess || 0);

      if (inv.invoiceType === 'SALE_RETURN') {
        // Sale return reduces output tax
        outwardTaxableValue -= gross;
        outputCgst -= cgst;
        outputSgst -= sgst;
        outputIgst -= igst;
        outputCess -= cess;
        totalCreditNotes++;
      } else {
        outwardTaxableValue += gross;
        outputCgst += cgst;
        outputSgst += sgst;
        outputIgst += igst;
        outputCess += cess;
        if (inv.invoiceType === 'SALE_DEBIT_NOTE') {
          totalSaleDebitNotes++;
        } else {
          totalSaleInvoices++;
        }
      }
    }

    const totalOutputTax = outputCgst + outputSgst + outputIgst + outputCess;

    // ── 2. Purchase Aggregation (Input Tax) ────────────────────
    const purchaseInvoices = await this.prisma.purchaseInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      select: {
        invoiceType: true,
        invoiceDate: true,
        totalGrossAmount: true,
        totalCgst: true,
        totalSgst: true,
        totalIgst: true,
        totalCess: true,
        netAmount: true,
        supplierGstin: true,
      },
    });

    let inwardTaxableValue = 0;
    let inputCgst = 0;
    let inputSgst = 0;
    let inputIgst = 0;
    let inputCess = 0;
    let totalPurchaseInvoices = 0;
    let totalPurchaseDebitNotes = 0;
    let totalPurchaseReturns = 0;

    for (const inv of purchaseInvoices) {
      const gross = Number(inv.totalGrossAmount || 0);
      const cgst = Number(inv.totalCgst || 0);
      const sgst = Number(inv.totalSgst || 0);
      const igst = Number(inv.totalIgst || 0);
      const cess = Number(inv.totalCess || 0);

      if (inv.invoiceType === 'PURCHASE_RETURN') {
        inwardTaxableValue -= gross;
        inputCgst -= cgst;
        inputSgst -= sgst;
        inputIgst -= igst;
        inputCess -= cess;
        totalPurchaseReturns++;
      } else {
        inwardTaxableValue += gross;
        inputCgst += cgst;
        inputSgst += sgst;
        inputIgst += igst;
        inputCess += cess;
        if (inv.invoiceType === 'PURCHASE_DEBIT_NOTE') {
          totalPurchaseDebitNotes++;
        } else {
          totalPurchaseInvoices++;
        }
      }
    }

    const totalInputTax = inputCgst + inputSgst + inputIgst + inputCess;

    // ── 3. Net Tax Liability ───────────────────────────────────
    const netCgstLiability = outputCgst - inputCgst;
    const netSgstLiability = outputSgst - inputSgst;
    const netIgstLiability = outputIgst - inputIgst;
    const netCessLiability = outputCess - inputCess;
    const netTaxLiability = netCgstLiability + netSgstLiability + netIgstLiability + netCessLiability;

    // ── 4. Monthly Trend (12 months rolling) ───────────────────
    const monthlyMap: Record<string, { outputTax: number; inputTax: number }> = {};

    // Generate last 12 month keys
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = { outputTax: 0, inputTax: 0 };
    }

    // Aggregate sales into monthly buckets
    for (const inv of salesInvoices) {
      const d = new Date(inv.invoiceDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key] !== undefined) {
        const tax = Number(inv.totalCgst || 0) + Number(inv.totalSgst || 0) + Number(inv.totalIgst || 0) + Number(inv.totalCess || 0);
        if (inv.invoiceType === 'SALE_RETURN') {
          monthlyMap[key].outputTax -= tax;
        } else {
          monthlyMap[key].outputTax += tax;
        }
      }
    }

    // Aggregate purchases into monthly buckets
    for (const inv of purchaseInvoices) {
      const d = new Date(inv.invoiceDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyMap[key] !== undefined) {
        const tax = Number(inv.totalCgst || 0) + Number(inv.totalSgst || 0) + Number(inv.totalIgst || 0) + Number(inv.totalCess || 0);
        if (inv.invoiceType === 'PURCHASE_RETURN') {
          monthlyMap[key].inputTax -= tax;
        } else {
          monthlyMap[key].inputTax += tax;
        }
      }
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend = Object.entries(monthlyMap).map(([key, val]) => {
      const [y, m] = key.split('-');
      return {
        month: `${monthNames[parseInt(m) - 1]} ${y}`,
        outputTax: Math.round(val.outputTax * 100) / 100,
        inputTax: Math.round(val.inputTax * 100) / 100,
        netLiability: Math.round((val.outputTax - val.inputTax) * 100) / 100,
      };
    });

    // ── 5. GST Rate Breakdown ──────────────────────────────────
    const saleItems = await this.prisma.saleInvoiceItem.findMany({
      where: {
        saleInvoice: {
          companyId,
          isDeleted: false,
          status: { in: ['SAVED', 'APPROVED'] as any[] },
          invoiceDate: { gte: startDate, lte: endDate },
        },
      },
      select: {
        gstPct: true,
        grossAmount: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
        saleInvoice: { select: { invoiceType: true } },
      },
    });

    const purchaseItems = await this.prisma.purchaseInvoiceItem.findMany({
      where: {
        purchaseInvoice: {
          companyId,
          isDeleted: false,
          status: { in: ['SAVED', 'APPROVED'] as any[] },
          invoiceDate: { gte: startDate, lte: endDate },
        },
      },
      select: {
        gstPct: true,
        grossAmount: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
        purchaseInvoice: { select: { invoiceType: true } },
      },
    });

    const rateMap: Record<string, { taxableValue: number; cgst: number; sgst: number; igst: number }> = {};

    for (const item of saleItems) {
      const rate = Number(item.gstPct || 0);
      const rKey = rate.toFixed(2);
      if (!rateMap[rKey]) rateMap[rKey] = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 };
      const mult = item.saleInvoice.invoiceType === 'SALE_RETURN' ? -1 : 1;
      rateMap[rKey].taxableValue += mult * Number(item.grossAmount || 0);
      rateMap[rKey].cgst += mult * Number(item.cgstAmount || 0);
      rateMap[rKey].sgst += mult * Number(item.sgstAmount || 0);
      rateMap[rKey].igst += mult * Number(item.igstAmount || 0);
    }

    for (const item of purchaseItems) {
      const rate = Number(item.gstPct || 0);
      const rKey = rate.toFixed(2);
      if (!rateMap[rKey]) rateMap[rKey] = { taxableValue: 0, cgst: 0, sgst: 0, igst: 0 };
      const mult = item.purchaseInvoice.invoiceType === 'PURCHASE_RETURN' ? -1 : 1;
      rateMap[rKey].taxableValue += mult * Number(item.grossAmount || 0);
      rateMap[rKey].cgst += mult * Number(item.cgstAmount || 0);
      rateMap[rKey].sgst += mult * Number(item.sgstAmount || 0);
      rateMap[rKey].igst += mult * Number(item.igstAmount || 0);
    }

    const rateBreakdown = Object.entries(rateMap)
      .map(([rate, v]) => ({
        gstRate: parseFloat(rate),
        taxableValue: Math.round(v.taxableValue * 100) / 100,
        cgst: Math.round(v.cgst * 100) / 100,
        sgst: Math.round(v.sgst * 100) / 100,
        igst: Math.round(v.igst * 100) / 100,
        totalTax: Math.round((v.cgst + v.sgst + v.igst) * 100) / 100,
      }))
      .sort((a, b) => a.gstRate - b.gstRate);

    // ── 6. Compliance Status ───────────────────────────────────
    const currentMonth = now.getMonth(); // 0-indexed
    const currentYear = now.getFullYear();
    const periodMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const currentPeriod = `${periodMonthNames[currentMonth]} ${currentYear}`;

    // GSTR-1 due on 11th of next month, GSTR-3B due on 20th of next month
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    const gstr1DueDate = new Date(nextYear, nextMonth, 11);
    const gstr3bDueDate = new Date(nextYear, nextMonth, 20);

    const formatDate = (d: Date) => {
      const day = d.getDate();
      const mon = monthNames[d.getMonth()];
      const yr = d.getFullYear();
      return `${day}-${mon}-${yr}`;
    };

    const daysUntilGstr1 = Math.max(0, Math.ceil((gstr1DueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const daysUntilGstr3b = Math.max(0, Math.ceil((gstr3bDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    return {
      summary: {
        outwardTaxableValue: Math.round(outwardTaxableValue * 100) / 100,
        outputCgst: Math.round(outputCgst * 100) / 100,
        outputSgst: Math.round(outputSgst * 100) / 100,
        outputIgst: Math.round(outputIgst * 100) / 100,
        outputCess: Math.round(outputCess * 100) / 100,
        totalOutputTax: Math.round(totalOutputTax * 100) / 100,
        inwardTaxableValue: Math.round(inwardTaxableValue * 100) / 100,
        inputCgst: Math.round(inputCgst * 100) / 100,
        inputSgst: Math.round(inputSgst * 100) / 100,
        inputIgst: Math.round(inputIgst * 100) / 100,
        inputCess: Math.round(inputCess * 100) / 100,
        totalInputTax: Math.round(totalInputTax * 100) / 100,
        netCgstLiability: Math.round(netCgstLiability * 100) / 100,
        netSgstLiability: Math.round(netSgstLiability * 100) / 100,
        netIgstLiability: Math.round(netIgstLiability * 100) / 100,
        netCessLiability: Math.round(netCessLiability * 100) / 100,
        netTaxLiability: Math.round(netTaxLiability * 100) / 100,
        totalSaleInvoices,
        totalPurchaseInvoices,
        totalCreditNotes,
        totalDebitNotes: totalSaleDebitNotes + totalPurchaseDebitNotes,
      },
      monthlyTrend,
      rateBreakdown,
      compliance: {
        currentPeriod,
        gstr1DueDate: formatDate(gstr1DueDate),
        gstr3bDueDate: formatDate(gstr3bDueDate),
        daysUntilGstr1,
        daysUntilGstr3b,
        filingStatus: 'PENDING' as const,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // GSTR-1 OUTWARD SUPPLIES REPORT & JSON
  // ═══════════════════════════════════════════════════════════════

  async getGstr1Report(companyId: number, startDateStr?: string, endDateStr?: string) {
    const now = new Date();
    const fyStart = now.getMonth() >= 3
      ? new Date(now.getFullYear(), 3, 1)
      : new Date(now.getFullYear() - 1, 3, 1);
    const startDate = startDateStr ? new Date(startDateStr) : fyStart;
    const endDate = endDateStr ? new Date(endDateStr) : now;

    // Get company details for POS state checks
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { stateCode: true, gstinNumber: true }
    });
    const companyStateCode = company?.stateCode || '24'; // default to Gujarat

    // Get active sales invoices
    const sales = await this.prisma.saleInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: {
        customer: { select: { accountName: true, stateCode: true, gstinNumber: true } },
        items: { include: { quality: true } }
      }
    });

    const b2b: any[] = [];
    const b2cl: any[] = [];
    const b2cs: any[] = [];
    const cdnr: any[] = [];
    const cdnur: any[] = [];
    const hsnMap: Record<string, any> = {};

    let minInvNum = '';
    let maxInvNum = '';
    let totalInvCount = 0;
    let cancelledInvCount = 0;

    for (const inv of sales) {
      const isReturn = inv.invoiceType === 'SALE_RETURN';
      const isDebitNote = inv.invoiceType === 'SALE_DEBIT_NOTE';
      const isRegular = inv.invoiceType === 'SALE_INVOICE';

      const customer = inv.customer;
      const gstin = inv.customerGstin || customer?.gstinNumber;
      const hasGstin = gstin && gstin.trim().length === 15;
      const posState = inv.placeOfSupply || customer?.stateCode || companyStateCode;
      const isInterState = posState !== companyStateCode;
      const invVal = Number(inv.netAmount || 0);
      const taxableVal = Number(inv.totalGrossAmount || 0);

      // Document tracker
      if (isRegular) {
        totalInvCount++;
        if (inv.status === 'CANCELLED' as any) {
          cancelledInvCount++;
        }
        if (!minInvNum || inv.billNumber < minInvNum) minInvNum = inv.billNumber;
        if (!maxInvNum || inv.billNumber > maxInvNum) maxInvNum = inv.billNumber;
      }

      // Group tax rate items
      const itms = inv.items.map(item => {
        const rate = Number(item.gstPct || 0);
        const txval = Number(item.grossAmount || 0);
        const cgst = Number(item.cgstAmount || 0);
        const sgst = Number(item.sgstAmount || 0);
        const igst = Number(item.igstAmount || 0);
        const cess = Number(item.cessAmount || 0);

        return {
          num: item.rowNumber,
          itm_det: {
            rt: rate,
            txval: Math.round(txval * 100) / 100,
            iamt: Math.round(igst * 100) / 100,
            camt: Math.round(cgst * 100) / 100,
            samt: Math.round(sgst * 100) / 100,
            csamt: Math.round(cess * 100) / 100
          }
        };
      });

      // ── HSN Aggregation ──
      for (const item of inv.items) {
        const hsn = item.hsnNumber || '7102'; // default diamond HSN
        const rate = Number(item.gstPct || 0);
        const txval = Number(item.grossAmount || 0) * (isReturn ? -1 : 1);
        const cgst = Number(item.cgstAmount || 0) * (isReturn ? -1 : 1);
        const sgst = Number(item.sgstAmount || 0) * (isReturn ? -1 : 1);
        const igst = Number(item.igstAmount || 0) * (isReturn ? -1 : 1);
        const cess = Number(item.cessAmount || 0) * (isReturn ? -1 : 1);
        const carats = Number(item.carats || 0) * (isReturn ? -1 : 1);

        const key = `${hsn}_${rate}`;
        const currentName = item.quality?.qualityName || 'Diamond Quality';
        if (!hsnMap[key]) {
          hsnMap[key] = {
            hsn_sc: hsn,
            desc: currentName,
            uqc: 'CTS',
            qty: 0,
            val: 0,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0
          };
        } else {
          // If the quality name is different, append it
          if (currentName && !hsnMap[key].desc.includes(currentName)) {
            hsnMap[key].desc += ` / ${currentName}`;
          }
        }

        hsnMap[key].qty += carats;
        hsnMap[key].val += txval + cgst + sgst + igst + cess;
        hsnMap[key].txval += txval;
        hsnMap[key].iamt += igst;
        hsnMap[key].camt += cgst;
        hsnMap[key].samt += sgst;
        hsnMap[key].csamt += cess;
      }

      // Categorization
      if (hasGstin) {
        if (isReturn || isDebitNote) {
          cdnr.push({
            ctin: gstin,
            nt: [{
              ntty: isReturn ? 'C' : 'D',
              nt_num: inv.billNumber,
              nt_dt: inv.invoiceDate.toISOString().split('T')[0].split('-').reverse().join('-'), // DD-MM-YYYY
              inum: inv.referenceBillNumber || 'INV-000',
              idt: inv.invoiceDate.toISOString().split('T')[0].split('-').reverse().join('-'),
              val: Math.round(invVal * 100) / 100,
              pos: posState,
              rchrg: 'N',
              itms
            }]
          });
        } else {
          // B2B
          b2b.push({
            ctin: gstin,
            inv: [{
              inum: inv.billNumber,
              idt: inv.invoiceDate.toISOString().split('T')[0].split('-').reverse().join('-'),
              val: Math.round(invVal * 100) / 100,
              pos: posState,
              rchrg: 'N',
              inv_ty: 'R',
              itms
            }]
          });
        }
      } else {
        // B2C Unregistered
        if (isReturn || isDebitNote) {
          cdnur.push({
            typ: isInterState && invVal > 250000 ? 'B2CL' : 'B2CS',
            ntty: isReturn ? 'C' : 'D',
            nt_num: inv.billNumber,
            nt_dt: inv.invoiceDate.toISOString().split('T')[0].split('-').reverse().join('-'),
            inum: inv.referenceBillNumber || 'INV-000',
            idt: inv.invoiceDate.toISOString().split('T')[0].split('-').reverse().join('-'),
            val: Math.round(invVal * 100) / 100,
            pos: posState,
            itms
          });
        } else if (isInterState && invVal > 250000) {
          // B2C Large
          b2cl.push({
            pos: posState,
            inv: [{
              inum: inv.billNumber,
              idt: inv.invoiceDate.toISOString().split('T')[0].split('-').reverse().join('-'),
              val: Math.round(invVal * 100) / 100,
              itms: itms.map(i => i.itm_det)
            }]
          });
        } else {
          // B2C Small (Aggregated)
          b2cs.push({
            inum: inv.billNumber,
            idt: inv.invoiceDate.toISOString().split('T')[0],
            pos: posState,
            val: Math.round(invVal * 100) / 100,
            txval: Math.round(taxableVal * 100) / 100,
            cgst: Math.round(Number(inv.totalCgst || 0) * 100) / 100,
            sgst: Math.round(Number(inv.totalSgst || 0) * 100) / 100,
            igst: Math.round(Number(inv.totalIgst || 0) * 100) / 100,
          });
        }
      }
    }

    const hsnList = Object.values(hsnMap).map((h: any) => ({
      ...h,
      qty: Math.round(h.qty * 1000) / 1000,
      val: Math.round(h.val * 100) / 100,
      txval: Math.round(h.txval * 100) / 100,
      iamt: Math.round(h.iamt * 100) / 100,
      camt: Math.round(h.camt * 100) / 100,
      samt: Math.round(h.samt * 100) / 100,
      csamt: Math.round(h.csamt * 100) / 100
    }));

    const docSummary = {
      from: minInvNum || '—',
      to: maxInvNum || '—',
      totnum: totalInvCount,
      cancel: cancelledInvCount,
      net_issue: totalInvCount - cancelledInvCount
    };

    return {
      b2b: b2b.map((item, idx) => ({ ...item, id: `b2b_${idx}` })),
      b2cl: b2cl.map((item, idx) => ({ ...item, id: `b2cl_${idx}` })),
      b2cs: b2cs.map((item, idx) => ({ ...item, id: `b2cs_${idx}` })),
      cdnr: cdnr.map((item, idx) => ({ ...item, id: `cdnr_${idx}` })),
      cdnur: cdnur.map((item, idx) => ({ ...item, id: `cdnur_${idx}` })),
      hsn: hsnList.map((item, idx) => ({ ...item, id: `hsn_${idx}` })),
      docSummary: { ...docSummary, id: 'docSummary' }
    };
  }

  async generateGstr1Json(companyId: number, startDateStr?: string, endDateStr?: string) {
    const report = await this.getGstr1Report(companyId, startDateStr, endDateStr);
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { gstinNumber: true }
    });

    const now = new Date();
    const periodMonth = String(now.getMonth() + 1).padStart(2, '0');
    const periodYear = now.getFullYear();

    return {
      gstin: company?.gstinNumber || '24AAAAA0000A1Z0',
      fp: `${periodMonth}${periodYear}`,
      cur_gt: 0.00,
      gt: 0.00,
      b2b: report.b2b,
      b2cl: report.b2cl,
      b2cs: report.b2cs.map((b: any) => ({
        pos: b.pos,
        rt: 0.25, // default diamond rate, or rate from items
        txval: b.txval,
        iamt: b.igst,
        camt: b.cgst,
        samt: b.sgst,
        csamt: 0
      })),
      cdnr: report.cdnr,
      cdnur: report.cdnur,
      hsn: {
        data: report.hsn.map((h: any, idx: number) => ({
          num: idx + 1,
          hsn_sc: h.hsn_sc,
          desc: h.desc,
          uqc: h.uqc,
          qty: h.qty,
          val: h.val,
          txval: h.txval,
          iamt: h.iamt,
          camt: h.camt,
          samt: h.samt,
          csamt: h.csamt
        }))
      },
        doc_issue: {
          doc_det: [{
            doc_num: 1,
            doc_typ: "Invoices for outward supply",
            from: report.docSummary.from,
            to: report.docSummary.to,
            totnum: report.docSummary.totnum,
            cancel: report.docSummary.cancel,
            net_issue: report.docSummary.net_issue
          }]
        }
      };
    }

  // ═══════════════════════════════════════════════════════════════
  // GSTR-2 & ITC RECONCILIATION & REGISTERS
  // ═══════════════════════════════════════════════════════════════

  async getGstRegisters(companyId: number, startDateStr?: string, endDateStr?: string) {
    const now = new Date();
    const fyStart = now.getMonth() >= 3
      ? new Date(now.getFullYear(), 3, 1)
      : new Date(now.getFullYear() - 1, 3, 1);
    const startDate = startDateStr ? new Date(startDateStr) : fyStart;
    const endDate = endDateStr ? new Date(endDateStr) : now;

    // 1. Output Register (Sales)
    const sales = await this.prisma.saleInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: {
        customer: { select: { accountName: true, gstinNumber: true } }
      },
      orderBy: { invoiceDate: 'asc' }
    });

    const outputRegister = sales.map((inv, idx) => ({
      id: `out_${idx}`,
      date: inv.invoiceDate.toISOString().split('T')[0],
      invoiceNo: inv.billNumber,
      invoiceType: inv.invoiceType,
      partyName: inv.customer?.accountName || 'Cash Sale',
      partyGstin: inv.customerGstin || inv.customer?.gstinNumber || 'Unregistered',
      taxableValue: Math.round(Number(inv.totalGrossAmount || 0) * 100) / 100,
      cgst: Math.round(Number(inv.totalCgst || 0) * 100) / 100,
      sgst: Math.round(Number(inv.totalSgst || 0) * 100) / 100,
      igst: Math.round(Number(inv.totalIgst || 0) * 100) / 100,
      cess: Math.round(Number(inv.totalCess || 0) * 100) / 100,
      netAmount: Math.round(Number(inv.netAmount || 0) * 100) / 100,
    }));

    // 2. Input Register (Purchases)
    const purchases = await this.prisma.purchaseInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: {
        supplier: { select: { accountName: true, gstinNumber: true } }
      },
      orderBy: { invoiceDate: 'asc' }
    });

    const inputRegister = purchases.map((inv, idx) => ({
      id: `in_${idx}`,
      purchaseId: inv.id,
      date: inv.invoiceDate.toISOString().split('T')[0],
      billNo: inv.billNumber,
      invoiceType: inv.invoiceType,
      partyName: inv.supplier?.accountName || 'Cash Purchase',
      partyGstin: inv.supplierGstin || inv.supplier?.gstinNumber || 'Unregistered',
      taxableValue: Math.round(Number(inv.totalGrossAmount || 0) * 100) / 100,
      cgst: Math.round(Number(inv.totalCgst || 0) * 100) / 100,
      sgst: Math.round(Number(inv.totalSgst || 0) * 100) / 100,
      igst: Math.round(Number(inv.totalIgst || 0) * 100) / 100,
      cess: Math.round(Number(inv.totalCess || 0) * 100) / 100,
      netAmount: Math.round(Number(inv.netAmount || 0) * 100) / 100,
    }));

    return {
      outputRegister,
      inputRegister
    };
  }

  async reconcileItc(companyId: number, gstr2bList: any[], startDateStr?: string, endDateStr?: string) {
    const registers = await this.getGstRegisters(companyId, startDateStr, endDateStr);
    const localPurchases = registers.inputRegister;

    const reconciled: any[] = [];
    let matchedItc = 0;
    let mismatchItc = 0;
    let supplierPendingItc = 0;
    let notInBooksItc = 0;

    // Track GSTR-2B items that are matched
    const matchedPortalIndices = new Set<number>();

    // ── Reconcile Books against Portal ──
    for (const local of localPurchases) {
      const billNo = local.billNo;
      const gstin = local.partyGstin;
      const localTaxable = local.taxableValue;
      const localTax = local.cgst + local.sgst + local.igst + local.cess;

      // Find matching record in GSTR-2B
      let matchIdx = -1;
      let matchStatus: 'MATCHED' | 'MISMATCH' | 'MISSING_IN_PORTAL' = 'MISSING_IN_PORTAL';
      let portalRecord: any = null;

      for (let i = 0; i < gstr2bList.length; i++) {
        if (matchedPortalIndices.has(i)) continue;
        const portal = gstr2bList[i];

        // Match criteria: GSTIN and Bill/Invoice Number (case insensitive)
        if (portal.ctin?.toUpperCase() === gstin?.toUpperCase() && portal.inum?.toUpperCase() === billNo?.toUpperCase()) {
          matchIdx = i;
          portalRecord = portal;
          break;
        }
      }

      if (portalRecord) {
        matchedPortalIndices.add(matchIdx);
        const portalTaxable = Number(portalRecord.txval || 0);
        const portalTax = Number(portalRecord.iamt || 0) + Number(portalRecord.camt || 0) + Number(portalRecord.samt || 0) + Number(portalRecord.csamt || 0);

        const diffTaxable = Math.abs(localTaxable - portalTaxable);
        const diffTax = Math.abs(localTax - portalTax);

        // Tolerance: ±₹10.00
        if (diffTaxable <= 10 && diffTax <= 10) {
          matchStatus = 'MATCHED';
          matchedItc += localTax;
        } else {
          matchStatus = 'MISMATCH';
          mismatchItc += localTax;
        }
      } else {
        supplierPendingItc += localTax;
      }

      reconciled.push({
        id: `rec_${local.id}`,
        purchaseId: local.purchaseId,
        billNo,
        partyName: local.partyName,
        partyGstin: gstin,
        localTaxable,
        localTax,
        portalTaxable: portalRecord ? Number(portalRecord.txval || 0) : null,
        portalTax: portalRecord ? (Number(portalRecord.iamt || 0) + Number(portalRecord.camt || 0) + Number(portalRecord.samt || 0)) : null,
        status: matchStatus
      });
    }

    // ── Find Portal Records not in Books ──
    for (let i = 0; i < gstr2bList.length; i++) {
      if (matchedPortalIndices.has(i)) continue;
      const portal = gstr2bList[i];
      const portalTax = Number(portal.iamt || 0) + Number(portal.camt || 0) + Number(portal.samt || 0) + Number(portal.csamt || 0);

      notInBooksItc += portalTax;

      reconciled.push({
        id: `portal_${i}`,
        billNo: portal.inum,
        partyName: 'Unknown (Not in Books)',
        partyGstin: portal.ctin,
        localTaxable: null,
        localTax: null,
        portalTaxable: Number(portal.txval || 0),
        portalTax,
        status: 'NOT_IN_BOOKS'
      });
    }

    return {
      reconciledList: reconciled,
      summary: {
        matchedItc: Math.round(matchedItc * 100) / 100,
        mismatchItc: Math.round(mismatchItc * 100) / 100,
        supplierPendingItc: Math.round(supplierPendingItc * 100) / 100,
        notInBooksItc: Math.round(notInBooksItc * 100) / 100,
        totalLocalItc: Math.round((matchedItc + mismatchItc + supplierPendingItc) * 100) / 100,
      }
    };
  }

  async getGstr3bSummary(companyId: number, startDateStr?: string, endDateStr?: string) {
    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    // Query sales invoices
    const sales = await this.prisma.saleInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: startDate, lte: endDate }
      },
      include: {
        customer: { select: { isBroker: true, stateCode: true } }
      }
    });

    // Query purchase invoices
    const purchases = await this.prisma.purchaseInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: startDate, lte: endDate }
      },
      include: {
        supplier: { select: { isBroker: true, stateCode: true, gstinNumber: true } }
      }
    });

    // ─── Table 3.1 Outward & Inward RCM Supplies ───
    let t31a_taxable = 0, t31a_cgst = 0, t31a_sgst = 0, t31a_igst = 0, t31a_cess = 0;
    let t31b_taxable = 0, t31b_cgst = 0, t31b_sgst = 0, t31b_igst = 0, t31b_cess = 0;
    let t31c_taxable = 0;
    let t31d_taxable = 0, t31d_cgst = 0, t31d_sgst = 0, t31d_igst = 0, t31d_cess = 0;
    let t31e_taxable = 0;

    for (const sale of sales) {
      const taxable = Number(sale.totalGrossAmount || 0);
      const cgst = Number(sale.totalCgst || 0);
      const sgst = Number(sale.totalSgst || 0);
      const igst = Number(sale.totalIgst || 0);
      const cess = Number(sale.totalCess || 0);
      const totalTax = cgst + sgst + igst;

      const isExport = sale.placeOfSupply?.toUpperCase() === 'OUTSIDE INDIA' || sale.placeOfSupply?.toUpperCase() === 'EXPORT';

      if (isExport) {
        t31b_taxable += taxable;
        t31b_cgst += cgst;
        t31b_sgst += sgst;
        t31b_igst += igst;
        t31b_cess += cess;
      } else if (totalTax === 0 && taxable > 0) {
        t31c_taxable += taxable;
      } else {
        t31a_taxable += taxable;
        t31a_cgst += cgst;
        t31a_sgst += sgst;
        t31a_igst += igst;
        t31a_cess += cess;
      }
    }

    // ─── Table 4 Eligible ITC & Reverse Charge purchases ───
    let t4a1_igst = 0;
    let t4a3_cgst = 0, t4a3_sgst = 0, t4a3_igst = 0;
    let t4a5_cgst = 0, t4a5_sgst = 0, t4a5_igst = 0;
    let t4b_cgst = 0, t4b_sgst = 0, t4b_igst = 0; // reversals (e.g. from returns)

    for (const pur of purchases) {
      const taxable = Number(pur.totalGrossAmount || 0);
      const cgst = Number(pur.totalCgst || 0);
      const sgst = Number(pur.totalSgst || 0);
      const igst = Number(pur.totalIgst || 0);
      const cess = Number(pur.totalCess || 0);

      const isImport = pur.placeOfSupply?.toUpperCase() === 'OUTSIDE INDIA' || pur.placeOfSupply?.toUpperCase() === 'IMPORT';
      const isRcm = !pur.supplierGstin && !pur.supplier?.gstinNumber; // Purchase from unregistered dealer trigger RCM

      if (isImport) {
        t4a1_igst += igst;
      } else if (isRcm) {
        t31d_taxable += taxable;
        t31d_cgst += cgst;
        t31d_sgst += sgst;
        t31d_igst += igst;
        t31d_cess += cess;

        t4a3_cgst += cgst;
        t4a3_sgst += sgst;
        t4a3_igst += igst;
      } else {
        if (pur.invoiceType === 'PURCHASE_RETURN') {
          t4b_cgst += cgst;
          t4b_sgst += sgst;
          t4b_igst += igst;
        } else {
          t4a5_cgst += cgst;
          t4a5_sgst += sgst;
          t4a5_igst += igst;
        }
      }
    }

    return {
      table31: {
        a: { label: '(a) Outward taxable supplies (other than zero rated, nil rated and exempted)', taxable: t31a_taxable, igst: t31a_igst, cgst: t31a_cgst, sgst: t31a_sgst, cess: t31a_cess },
        b: { label: '(b) Outward taxable supplies (zero rated)', taxable: t31b_taxable, igst: t31b_igst, cgst: t31b_cgst, sgst: t31b_sgst, cess: t31b_cess },
        c: { label: '(c) Other outward supplies (nil rated, exempted)', taxable: t31c_taxable, igst: 0, cgst: 0, sgst: 0, cess: 0 },
        d: { label: '(d) Inward supplies liable to reverse charge', taxable: t31d_taxable, igst: t31d_igst, cgst: t31d_cgst, sgst: t31d_sgst, cess: t31d_cess },
        e: { label: '(e) Non-GST outward supplies', taxable: t31e_taxable, igst: 0, cgst: 0, sgst: 0, cess: 0 }
      },
      table4: {
        a1: { label: '(1) Import of goods', igst: t4a1_igst, cgst: 0, sgst: 0, cess: 0 },
        a3: { label: '(3) Inward supplies liable to reverse charge', igst: t4a3_igst, cgst: t4a3_cgst, sgst: t4a3_sgst, cess: 0 },
        a5: { label: '(5) All other ITC', igst: t4a5_igst, cgst: t4a5_cgst, sgst: t4a5_sgst, cess: 0 },
        b: { label: '(B) ITC Reversed', igst: t4b_igst, cgst: t4b_cgst, sgst: t4b_sgst, cess: 0 }
      },
      interestLateFee: {
        interest: 0,
        lateFee: 0
      }
    };
  }

  async getGstAnalytics(companyId: number, startDateStr?: string, endDateStr?: string) {
    const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();

    // Query sales and items
    const sales = await this.prisma.saleInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: startDate, lte: endDate }
      },
      include: {
        customer: { select: { accountName: true, gstinNumber: true } },
        items: true
      }
    });

    // Query purchases and items
    const purchases = await this.prisma.purchaseInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: { in: ['SAVED', 'APPROVED'] as any[] },
        invoiceDate: { gte: startDate, lte: endDate }
      },
      include: {
        supplier: { select: { accountName: true, gstinNumber: true } },
        items: true
      }
    });

    // Helper functions to group data
    const compileHsnSummary = (items: any[]) => {
      const groups: Record<string, any> = {};
      for (const item of items) {
        const hsn = item.hsnNumber || 'Unknown';
        if (!groups[hsn]) {
          groups[hsn] = { hsnCode: hsn, uqc: 'CTS', carats: 0, pieces: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        }
        groups[hsn].carats += Number(item.carats || 0);
        groups[hsn].pieces += Number(item.pieces || 0);
        groups[hsn].taxable += Number(item.grossAmount || 0);
        groups[hsn].cgst += Number(item.cgstAmount || 0);
        groups[hsn].sgst += Number(item.sgstAmount || 0);
        groups[hsn].igst += Number(item.igstAmount || 0);
      }
      return Object.values(groups).map((g: any) => ({
        ...g,
        carats: Math.round(g.carats * 1000) / 1000,
        taxable: Math.round(g.taxable * 100) / 100,
        cgst: Math.round(g.cgst * 100) / 100,
        sgst: Math.round(g.sgst * 100) / 100,
        igst: Math.round(g.igst * 100) / 100,
      }));
    };

    const compilePartySummary = (invoices: any[], isCustomer: boolean) => {
      const groups: Record<string, any> = {};
      for (const inv of invoices) {
        const party = isCustomer ? inv.customer : inv.supplier;
        const name = party?.accountName || (isCustomer ? 'Cash Customer' : 'Cash Supplier');
        const gstin = inv.customerGstin || inv.supplierGstin || party?.gstinNumber || 'Unregistered';
        const key = `${name}_${gstin}`;

        if (!groups[key]) {
          groups[key] = { partyName: name, gstin, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        }
        groups[key].taxable += Number(inv.totalGrossAmount || 0);
        groups[key].cgst += Number(inv.totalCgst || 0);
        groups[key].sgst += Number(inv.totalSgst || 0);
        groups[key].igst += Number(inv.totalIgst || 0);
      }
      return Object.values(groups).map((g: any) => ({
        ...g,
        taxable: Math.round(g.taxable * 100) / 100,
        cgst: Math.round(g.cgst * 100) / 100,
        sgst: Math.round(g.sgst * 100) / 100,
        igst: Math.round(g.igst * 100) / 100,
      }));
    };

    const compileRateSummary = (items: any[]) => {
      const groups: Record<number, any> = {};
      for (const item of items) {
        const rate = Number(item.gstPct || 0);
        if (!groups[rate]) {
          groups[rate] = { ratePct: rate, taxable: 0, cgst: 0, sgst: 0, igst: 0 };
        }
        groups[rate].taxable += Number(item.grossAmount || 0);
        groups[rate].cgst += Number(item.cgstAmount || 0);
        groups[rate].sgst += Number(item.sgstAmount || 0);
        groups[rate].igst += Number(item.igstAmount || 0);
      }
      return Object.values(groups).map((g: any) => ({
        ...g,
        taxable: Math.round(g.taxable * 100) / 100,
        cgst: Math.round(g.cgst * 100) / 100,
        sgst: Math.round(g.sgst * 100) / 100,
        igst: Math.round(g.igst * 100) / 100,
      }));
    };

    // Flatten all line items
    const saleItems = sales.flatMap(s => s.items);
    const purchaseItems = purchases.flatMap(p => p.items);

    return {
      outward: {
        hsn: compileHsnSummary(saleItems),
        party: compilePartySummary(sales, true),
        rate: compileRateSummary(saleItems)
      },
      inward: {
        hsn: compileHsnSummary(purchaseItems),
        party: compilePartySummary(purchases, false),
        rate: compileRateSummary(purchaseItems)
      }
    };
  }

  async getDayBookSummary(companyId: number, dateStr: string) {
    const start = new Date(dateStr + 'T00:00:00');
    const end = new Date(dateStr + 'T23:59:59.999');

    // Fetch all cash and bank accounts
    const accounts = await this.prisma.account.findMany({
      where: { companyId, isDeleted: false },
      include: { accountGroup: true }
    });

    const cashAccounts = accounts.filter(a => 
      a.accountGroup?.groupName.toLowerCase().includes('cash') || 
      a.accountName.toLowerCase().includes('cash') ||
      a.accountGroup?.nature?.toLowerCase() === 'asset' && a.accountGroup?.groupName.toLowerCase().includes('hand')
    );
    const bankAccounts = accounts.filter(a => 
      a.accountGroup?.groupName.toLowerCase().includes('bank') ||
      a.accountName.toLowerCase().includes('bank')
    );

    const computeBalance = async (accountId: number, limitDate: Date) => {
      const account = accounts.find(a => a.id === accountId);
      if (!account) return 0;
      const isUsdAcc = account.accountName.toLowerCase().includes('usd');

      const prevEntries = await this.prisma.generalLedgerEntry.findMany({
        where: {
          companyId,
          accountId,
          voucherDate: { lt: limitDate }
        }
      });

      let balance = account.openingBalanceType === 'DEBIT' 
        ? Number(account.openingBalanceAmount || 0) 
        : -Number(account.openingBalanceAmount || 0);

      for (const ent of prevEntries) {
        const amt = isUsdAcc
          ? Number(ent.originalAmount || ent.amount || 0)
          : Number(ent.amount || 0);

        if (ent.debitCreditType === 'DEBIT') {
          balance += amt;
        } else {
          balance -= amt;
        }
      }
      return balance;
    };

    // Calculate opening balances split by INR and USD
    let openingCashInr = 0;
    let openingCashUsd = 0;
    for (const a of cashAccounts) {
      const isUsd = a.accountName.toLowerCase().includes('usd');
      const bal = await computeBalance(a.id, start);
      if (isUsd) openingCashUsd += bal;
      else openingCashInr += bal;
    }

    let openingBankInr = 0;
    let openingBankUsd = 0;
    for (const a of bankAccounts) {
      const isUsd = a.accountName.toLowerCase().includes('usd');
      const bal = await computeBalance(a.id, start);
      if (isUsd) openingBankUsd += bal;
      else openingBankInr += bal;
    }

    // Calculate closing balances split by INR and USD
    let closingCashInr = 0;
    let closingCashUsd = 0;
    const dayEndLimit = new Date(end.getTime() + 1); // lt next day
    for (const a of cashAccounts) {
      const isUsd = a.accountName.toLowerCase().includes('usd');
      const bal = await computeBalance(a.id, dayEndLimit);
      if (isUsd) closingCashUsd += bal;
      else closingCashInr += bal;
    }

    let closingBankInr = 0;
    let closingBankUsd = 0;
    for (const a of bankAccounts) {
      const isUsd = a.accountName.toLowerCase().includes('usd');
      const bal = await computeBalance(a.id, dayEndLimit);
      if (isUsd) closingBankUsd += bal;
      else closingBankInr += bal;
    }

    // Query all ledger entries on the selected date
    const dayEntries = await this.prisma.generalLedgerEntry.findMany({
      where: {
        companyId,
        voucherDate: { gte: start, lte: end }
      },
      include: {
        account: true
      },
      orderBy: { id: 'asc' }
    });

    const transactions = dayEntries.map(e => {
      const isUsdAcc = e.account?.accountName?.toLowerCase().includes('usd');
      const currency = e.originalCurrency || (isUsdAcc ? 'USD' : 'INR');
      const origAmt = e.originalAmount !== null && e.originalAmount !== undefined
        ? Number(e.originalAmount)
        : Number(e.amount || 0);

      return {
        id: e.id,
        voucherNumber: e.sourceBillNumber || '—',
        voucherType: e.sourceVoucherType || 'JV',
        voucherDate: e.voucherDate.toISOString().split('T')[0],
        accountName: e.account?.accountName || 'Unknown Account',
        debitCreditType: e.debitCreditType,
        amount: Number(e.amount || 0),
        originalCurrency: currency,
        originalAmount: origAmt,
        exchangeRate: e.exchangeRate ? Number(e.exchangeRate) : (currency === 'USD' ? 90.0 : 1.0),
        narration: e.narration || ''
      };
    });

    return {
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
      transactions
    };
  }

  async getDayBookDatesList(companyId: number, startDateStr?: string, endDateStr?: string) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const fyStartStr = currentMonth >= 3 ? `${currentYear}-04-01` : `${currentYear - 1}-04-01`;
    const todayStr = now.toISOString().split('T')[0];

    const startLimitStr = startDateStr || fyStartStr;
    const endLimitStr = endDateStr || todayStr;

    const startLimit = new Date(startLimitStr + 'T12:00:00');
    const endLimit = new Date(endLimitStr + 'T12:00:00');

    // Query entries on these dates to build transaction count map
    const filter: any = {
      companyId,
      voucherDate: {
        gte: new Date(startLimitStr + 'T00:00:00'),
        lte: new Date(endLimitStr + 'T23:59:59.999')
      }
    };

    const rawEntries = await this.prisma.generalLedgerEntry.findMany({
      where: filter,
      select: { voucherDate: true }
    });

    const dateMap: Record<string, number> = {};
    for (const ent of rawEntries) {
      const dStr = ent.voucherDate.toISOString().split('T')[0];
      dateMap[dStr] = (dateMap[dStr] || 0) + 1;
    }

    // Generate every calendar date in sequence
    const datesArray: string[] = [];
    let current = new Date(startLimit);
    while (current <= endLimit) {
      datesArray.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }

    const sortedDates = datesArray.sort((a, b) => b.localeCompare(a));
    const results = [];

    // Fetch cash/bank accounts
    const accounts = await this.prisma.account.findMany({
      where: { companyId, isDeleted: false },
      include: { accountGroup: true }
    });
    const cashAccounts = accounts.filter(a => 
      a.accountGroup?.groupName.toLowerCase().includes('cash') || 
      a.accountName.toLowerCase().includes('cash') ||
      a.accountGroup?.nature?.toLowerCase() === 'asset' && a.accountGroup?.groupName.toLowerCase().includes('hand')
    );
    const bankAccounts = accounts.filter(a => 
      a.accountGroup?.groupName.toLowerCase().includes('bank') ||
      a.accountName.toLowerCase().includes('bank')
    );

    const computeBalance = async (accountId: number, limitDate: Date) => {
      const account = accounts.find(a => a.id === accountId);
      if (!account) return 0;
      const isUsdAcc = account.accountName.toLowerCase().includes('usd');

      const prevEntries = await this.prisma.generalLedgerEntry.findMany({
        where: { companyId, accountId, voucherDate: { lt: limitDate } }
      });
      let balance = account.openingBalanceType === 'DEBIT' 
        ? Number(account.openingBalanceAmount || 0) 
        : -Number(account.openingBalanceAmount || 0);
      for (const ent of prevEntries) {
        const amt = isUsdAcc
          ? Number(ent.originalAmount || ent.amount || 0)
          : Number(ent.amount || 0);
        if (ent.debitCreditType === 'DEBIT') balance += amt;
        else balance -= amt;
      }
      return balance;
    };

    for (const dStr of sortedDates) {
      const dayStart = new Date(dStr + 'T00:00:00');
      const dayEndNext = new Date(dStr + 'T23:59:59.999');
      dayEndNext.setMilliseconds(dayEndNext.getMilliseconds() + 1);

      let openingCashInr = 0;
      let openingCashUsd = 0;
      let openingBankInr = 0;
      let openingBankUsd = 0;

      let closingCashInr = 0;
      let closingCashUsd = 0;
      let closingBankInr = 0;
      let closingBankUsd = 0;

      for (const a of cashAccounts) {
        const isUsd = a.accountName.toLowerCase().includes('usd');
        const openBal = await computeBalance(a.id, dayStart);
        const closeBal = await computeBalance(a.id, dayEndNext);
        if (isUsd) {
          openingCashUsd += openBal;
          closingCashUsd += closeBal;
        } else {
          openingCashInr += openBal;
          closingCashInr += closeBal;
        }
      }

      for (const a of bankAccounts) {
        const isUsd = a.accountName.toLowerCase().includes('usd');
        const openBal = await computeBalance(a.id, dayStart);
        const closeBal = await computeBalance(a.id, dayEndNext);
        if (isUsd) {
          openingBankUsd += openBal;
          closingBankUsd += closeBal;
        } else {
          openingBankInr += openBal;
          closingBankInr += closeBal;
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

  // ═══════════════════════════════════════════════════════════════
  // PHASE 11.6: TDS & TCS REPORTS
  // ═══════════════════════════════════════════════════════════════

  /**
   * TDS Register – all purchase invoices where TDS was deducted.
   */
  async getTdsRegister(companyId: number, startDate?: string, endDate?: string) {
    const where: any = {
      companyId,
      isDeleted: false,
      totalTds: { gt: 0 },
    };
    if (startDate) where.invoiceDate = { ...(where.invoiceDate || {}), gte: new Date(startDate) };
    if (endDate) where.invoiceDate = { ...(where.invoiceDate || {}), lte: new Date(endDate) };

    const invoices = await this.prisma.purchaseInvoice.findMany({
      where,
      include: {
        supplier: { select: { id: true, accountName: true, panNumber: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    return invoices.map((inv) => ({
      id: inv.id,
      date: inv.invoiceDate,
      voucherNumber: inv.voucherNumber,
      billNumber: inv.billNumber,
      partyName: inv.supplier.accountName,
      panNumber: inv.supplier.panNumber || '—',
      tdsSection: inv.tdsSection || '—',
      deductibleValue: Number(inv.totalGrossAmount),
      tdsRate: Number(inv.tdsRate),
      tdsAmount: Number(inv.totalTds),
      netPayment: Number(inv.netAmount),
      deductionDate: inv.invoiceDate,
    }));
  }

  /**
   * TCS Register – all sale invoices where TCS was collected.
   */
  async getTcsRegister(companyId: number, startDate?: string, endDate?: string) {
    const where: any = {
      companyId,
      isDeleted: false,
      totalTcs: { gt: 0 },
    };
    if (startDate) where.invoiceDate = { ...(where.invoiceDate || {}), gte: new Date(startDate) };
    if (endDate) where.invoiceDate = { ...(where.invoiceDate || {}), lte: new Date(endDate) };

    const invoices = await this.prisma.saleInvoice.findMany({
      where,
      include: {
        customer: { select: { id: true, accountName: true, panNumber: true } },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    return invoices.map((inv) => ({
      id: inv.id,
      date: inv.invoiceDate,
      voucherNumber: inv.voucherNumber,
      billNumber: inv.billNumber,
      partyName: inv.customer.accountName,
      panNumber: inv.customer.panNumber || '—',
      tcsSection: inv.tcsSection || '—',
      taxableValue: Number(inv.totalGrossAmount),
      tcsRate: Number(inv.tcsRate),
      tcsAmount: Number(inv.totalTcs),
      invoiceTotal: Number(inv.netAmount),
      collectionDate: inv.invoiceDate,
    }));
  }

  /**
   * TDS/TCS Dashboard – summary KPIs + monthly trend data.
   */
  async getTdsTcsDashboard(companyId: number, startDate?: string, endDate?: string) {
    const purchaseWhere: any = {
      companyId,
      isDeleted: false,
      totalTds: { gt: 0 },
    };
    const saleWhere: any = {
      companyId,
      isDeleted: false,
      totalTcs: { gt: 0 },
    };
    if (startDate) {
      purchaseWhere.invoiceDate = { ...(purchaseWhere.invoiceDate || {}), gte: new Date(startDate) };
      saleWhere.invoiceDate = { ...(saleWhere.invoiceDate || {}), gte: new Date(startDate) };
    }
    if (endDate) {
      purchaseWhere.invoiceDate = { ...(purchaseWhere.invoiceDate || {}), lte: new Date(endDate) };
      saleWhere.invoiceDate = { ...(saleWhere.invoiceDate || {}), lte: new Date(endDate) };
    }

    // Aggregate TDS
    const tdsAgg = await this.prisma.purchaseInvoice.aggregate({
      where: purchaseWhere,
      _sum: { totalTds: true, totalGrossAmount: true },
      _count: { id: true },
    });

    // Aggregate TCS
    const tcsAgg = await this.prisma.saleInvoice.aggregate({
      where: saleWhere,
      _sum: { totalTcs: true, totalGrossAmount: true },
      _count: { id: true },
    });

    // TDS section breakdown
    const tdsInvoices = await this.prisma.purchaseInvoice.findMany({
      where: purchaseWhere,
      select: { tdsSection: true, totalTds: true, totalGrossAmount: true, tdsRate: true, invoiceDate: true },
    });

    const tdsSectionMap: Record<string, { count: number; taxableValue: number; tdsAmount: number; rates: number[] }> = {};
    const tdsMonthlyMap: Record<string, number> = {};

    for (const inv of tdsInvoices) {
      const section = inv.tdsSection || 'Unspecified';
      if (!tdsSectionMap[section]) tdsSectionMap[section] = { count: 0, taxableValue: 0, tdsAmount: 0, rates: [] };
      tdsSectionMap[section].count += 1;
      tdsSectionMap[section].taxableValue += Number(inv.totalGrossAmount);
      tdsSectionMap[section].tdsAmount += Number(inv.totalTds);
      tdsSectionMap[section].rates.push(Number(inv.tdsRate));

      const monthKey = inv.invoiceDate.toISOString().slice(0, 7);
      tdsMonthlyMap[monthKey] = (tdsMonthlyMap[monthKey] || 0) + Number(inv.totalTds);
    }

    // TCS section breakdown
    const tcsInvoices = await this.prisma.saleInvoice.findMany({
      where: saleWhere,
      select: { tcsSection: true, totalTcs: true, totalGrossAmount: true, tcsRate: true, invoiceDate: true },
    });

    const tcsSectionMap: Record<string, { count: number; taxableValue: number; tcsAmount: number; rates: number[] }> = {};
    const tcsMonthlyMap: Record<string, number> = {};

    for (const inv of tcsInvoices) {
      const section = inv.tcsSection || 'Unspecified';
      if (!tcsSectionMap[section]) tcsSectionMap[section] = { count: 0, taxableValue: 0, tcsAmount: 0, rates: [] };
      tcsSectionMap[section].count += 1;
      tcsSectionMap[section].taxableValue += Number(inv.totalGrossAmount);
      tcsSectionMap[section].tcsAmount += Number(inv.totalTcs);
      tcsSectionMap[section].rates.push(Number(inv.tcsRate));

      const monthKey = inv.invoiceDate.toISOString().slice(0, 7);
      tcsMonthlyMap[monthKey] = (tcsMonthlyMap[monthKey] || 0) + Number(inv.totalTcs);
    }

    // Format section breakdowns
    const tdsSections = Object.entries(tdsSectionMap).map(([code, d]) => ({
      sectionCode: code,
      transactionCount: d.count,
      totalTaxableValue: Math.round(d.taxableValue * 100) / 100,
      tdsAmount: Math.round(d.tdsAmount * 100) / 100,
      averageRate: d.rates.length ? Math.round((d.rates.reduce((a, b) => a + b, 0) / d.rates.length) * 100) / 100 : 0,
    }));

    const tcsSections = Object.entries(tcsSectionMap).map(([code, d]) => ({
      sectionCode: code,
      transactionCount: d.count,
      totalTaxableValue: Math.round(d.taxableValue * 100) / 100,
      tcsAmount: Math.round(d.tcsAmount * 100) / 100,
      averageRate: d.rates.length ? Math.round((d.rates.reduce((a, b) => a + b, 0) / d.rates.length) * 100) / 100 : 0,
    }));

    // Monthly trend (merge both)
    const allMonths = new Set([...Object.keys(tdsMonthlyMap), ...Object.keys(tcsMonthlyMap)]);
    const monthlyTrend = Array.from(allMonths).sort().map((month) => ({
      month,
      tdsAmount: Math.round((tdsMonthlyMap[month] || 0) * 100) / 100,
      tcsAmount: Math.round((tcsMonthlyMap[month] || 0) * 100) / 100,
    }));

    return {
      summary: {
        totalTdsDeducted: Math.round(Number(tdsAgg._sum.totalTds || 0) * 100) / 100,
        totalTdsTaxableValue: Math.round(Number(tdsAgg._sum.totalGrossAmount || 0) * 100) / 100,
        tdsTransactionCount: tdsAgg._count.id,
        totalTcsCollected: Math.round(Number(tcsAgg._sum.totalTcs || 0) * 100) / 100,
        totalTcsTaxableValue: Math.round(Number(tcsAgg._sum.totalGrossAmount || 0) * 100) / 100,
        tcsTransactionCount: tcsAgg._count.id,
      },
      tdsSections,
      tcsSections,
      monthlyTrend,
    };
  }

  /**
   * Party-wise TDS Report.
   */
  async getTdsPartywise(companyId: number, startDate?: string, endDate?: string) {
    const where: any = {
      companyId,
      isDeleted: false,
      totalTds: { gt: 0 },
    };
    if (startDate) where.invoiceDate = { ...(where.invoiceDate || {}), gte: new Date(startDate) };
    if (endDate) where.invoiceDate = { ...(where.invoiceDate || {}), lte: new Date(endDate) };

    const invoices = await this.prisma.purchaseInvoice.findMany({
      where,
      include: {
        supplier: { select: { id: true, accountName: true, panNumber: true } },
      },
    });

    const partyMap: Record<number, {
      partyName: string;
      pan: string;
      sections: Set<string>;
      billCount: number;
      totalTaxableValue: number;
      tdsDeducted: number;
      netPayments: number;
    }> = {};

    for (const inv of invoices) {
      const pid = inv.supplierId;
      if (!partyMap[pid]) {
        partyMap[pid] = {
          partyName: inv.supplier.accountName,
          pan: inv.supplier.panNumber || '—',
          sections: new Set(),
          billCount: 0,
          totalTaxableValue: 0,
          tdsDeducted: 0,
          netPayments: 0,
        };
      }
      partyMap[pid].billCount += 1;
      partyMap[pid].totalTaxableValue += Number(inv.totalGrossAmount);
      partyMap[pid].tdsDeducted += Number(inv.totalTds);
      partyMap[pid].netPayments += Number(inv.netAmount);
      if (inv.tdsSection) partyMap[pid].sections.add(inv.tdsSection);
    }

    return Object.values(partyMap).map((p) => ({
      partyName: p.partyName,
      pan: p.pan,
      tdsSection: Array.from(p.sections).join(', ') || '—',
      billCount: p.billCount,
      totalTaxableValue: Math.round(p.totalTaxableValue * 100) / 100,
      tdsDeducted: Math.round(p.tdsDeducted * 100) / 100,
      netPayments: Math.round(p.netPayments * 100) / 100,
    })).sort((a, b) => b.tdsDeducted - a.tdsDeducted);
  }

  /**
   * Party-wise TCS Report.
   */
  async getTcsPartywise(companyId: number, startDate?: string, endDate?: string) {
    const where: any = {
      companyId,
      isDeleted: false,
      totalTcs: { gt: 0 },
    };
    if (startDate) where.invoiceDate = { ...(where.invoiceDate || {}), gte: new Date(startDate) };
    if (endDate) where.invoiceDate = { ...(where.invoiceDate || {}), lte: new Date(endDate) };

    const invoices = await this.prisma.saleInvoice.findMany({
      where,
      include: {
        customer: { select: { id: true, accountName: true, panNumber: true } },
      },
    });

    const partyMap: Record<number, {
      partyName: string;
      pan: string;
      sections: Set<string>;
      billCount: number;
      totalTaxableValue: number;
      tcsCollected: number;
    }> = {};

    for (const inv of invoices) {
      const pid = inv.customerId;
      if (!partyMap[pid]) {
        partyMap[pid] = {
          partyName: inv.customer.accountName,
          pan: inv.customer.panNumber || '—',
          sections: new Set(),
          billCount: 0,
          totalTaxableValue: 0,
          tcsCollected: 0,
        };
      }
      partyMap[pid].billCount += 1;
      partyMap[pid].totalTaxableValue += Number(inv.totalGrossAmount);
      partyMap[pid].tcsCollected += Number(inv.totalTcs);
      if (inv.tcsSection) partyMap[pid].sections.add(inv.tcsSection);
    }

    return Object.values(partyMap).map((p) => ({
      partyName: p.partyName,
      pan: p.pan,
      tcsSection: Array.from(p.sections).join(', ') || '—',
      billCount: p.billCount,
      totalTaxableValue: Math.round(p.totalTaxableValue * 100) / 100,
      tcsCollected: Math.round(p.tcsCollected * 100) / 100,
    })).sort((a, b) => b.tcsCollected - a.tcsCollected);
  }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 11.8: ENTERPRISE MIS & BUSINESS ANALYTICS
  // ═══════════════════════════════════════════════════════════════

  async getMisDashboard(companyId: number, startDate?: string, endDate?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Date range filters
    // Date range filters
    const saleWhere: any = { companyId, isDeleted: false, invoiceType: 'SALE_INVOICE' };
    const purchaseWhere: any = { companyId, isDeleted: false, invoiceType: 'PURCHASE_INVOICE' };
    const cbWhere: any = { companyId, isDeleted: false };

    if (startDate) {
      const start = new Date(startDate);
      saleWhere.invoiceDate = { ...(saleWhere.invoiceDate || {}), gte: start };
      purchaseWhere.invoiceDate = { ...(purchaseWhere.invoiceDate || {}), gte: start };
      cbWhere.voucherDate = { ...(cbWhere.voucherDate || {}), gte: start };
    }
    if (endDate) {
      const end = new Date(endDate);
      saleWhere.invoiceDate = { ...(saleWhere.invoiceDate || {}), lte: end };
      purchaseWhere.invoiceDate = { ...(purchaseWhere.invoiceDate || {}), lte: end };
      cbWhere.voucherDate = { ...(cbWhere.voucherDate || {}), lte: end };
    }

    // 1. Today's KPIs
    const todaySales = await this.prisma.saleInvoice.aggregate({
      where: { companyId, isDeleted: false, invoiceType: 'SALE_INVOICE', invoiceDate: { gte: today, lt: tomorrow } },
      _sum: { netAmount: true },
    });
    const todayPurchases = await this.prisma.purchaseInvoice.aggregate({
      where: { companyId, isDeleted: false, invoiceType: 'PURCHASE_INVOICE', invoiceDate: { gte: today, lt: tomorrow } },
      _sum: { netAmount: true },
    });

    // 2. Period aggregates
    const salesTotal = await this.prisma.saleInvoice.aggregate({
      where: saleWhere,
      _sum: { netAmount: true, totalGrossAmount: true, totalDiscount: true },
      _count: { id: true },
    });

    const purchasesTotal = await this.prisma.purchaseInvoice.aggregate({
      where: purchaseWhere,
      _sum: { netAmount: true, totalGrossAmount: true },
      _count: { id: true },
    });

    // 3. Monthly trend for CSS graph
    const monthlySales = await this.prisma.saleInvoice.findMany({
      where: saleWhere,
      select: { invoiceDate: true, netAmount: true },
    });
    const monthlyPurchases = await this.prisma.purchaseInvoice.findMany({
      where: purchaseWhere,
      select: { invoiceDate: true, netAmount: true },
    });

    const monthlyMap: Record<string, { sales: number; purchases: number }> = {};
    for (const s of monthlySales) {
      const month = s.invoiceDate.toISOString().slice(0, 7);
      if (!monthlyMap[month]) monthlyMap[month] = { sales: 0, purchases: 0 };
      monthlyMap[month].sales += Number(s.netAmount);
    }
    for (const p of monthlyPurchases) {
      const month = p.invoiceDate.toISOString().slice(0, 7);
      if (!monthlyMap[month]) monthlyMap[month] = { sales: 0, purchases: 0 };
      monthlyMap[month].purchases += Number(p.netAmount);
    }

    const monthlyTrend = Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      sales: Math.round(data.sales * 100) / 100,
      purchases: Math.round(data.purchases * 100) / 100,
    })).sort((a, b) => a.month.localeCompare(b.month));

    // 4. Top Customers & Suppliers
    const topCustomersRaw = await this.prisma.saleInvoice.groupBy({
      by: ['customerId'],
      where: saleWhere,
      _sum: { netAmount: true },
      _count: { id: true },
      orderBy: { _sum: { netAmount: 'desc' } },
      take: 5,
    });
    const topCustomers = await Promise.all(topCustomersRaw.map(async (tc) => {
      const acc = await this.prisma.account.findUnique({ where: { id: tc.customerId }, select: { accountName: true } });
      return {
        partyName: acc?.accountName || '—',
        billCount: tc._count.id,
        netAmount: Math.round(Number(tc._sum.netAmount || 0) * 100) / 100,
      };
    }));

    const topSuppliersRaw = await this.prisma.purchaseInvoice.groupBy({
      by: ['supplierId'],
      where: purchaseWhere,
      _sum: { netAmount: true },
      _count: { id: true },
      orderBy: { _sum: { netAmount: 'desc' } },
      take: 5,
    });
    const topSuppliers = await Promise.all(topSuppliersRaw.map(async (ts) => {
      const acc = await this.prisma.account.findUnique({ where: { id: ts.supplierId }, select: { accountName: true } });
      return {
        partyName: acc?.accountName || '—',
        billCount: ts._count.id,
        netAmount: Math.round(Number(ts._sum.netAmount || 0) * 100) / 100,
      };
    }));

    return {
      today: {
        sales: Math.round(Number(todaySales._sum.netAmount || 0) * 100) / 100,
        purchases: Math.round(Number(todayPurchases._sum.netAmount || 0) * 100) / 100,
      },
      summary: {
        salesVolume: Math.round(Number(salesTotal._sum.netAmount || 0) * 100) / 100,
        salesCount: salesTotal._count.id,
        purchaseVolume: Math.round(Number(purchasesTotal._sum.netAmount || 0) * 100) / 100,
        purchaseCount: purchasesTotal._count.id,
      },
      monthlyTrend,
      topCustomers,
      topSuppliers,
    };
  }

  async getMisStockJobAnalytics(companyId: number) {
    // 1. Stock Valuation (AVAILABLE + HOLD)
    const packets = await this.prisma.stockPacket.findMany({
      where: { companyId, isDeleted: false, currentStatus: { in: ['AVAILABLE', 'HOLD'] } },
      select: { costPerCarat: true, caratWeight: true, createdAt: true },
    });

    let totalStockValue = 0;
    let slowMovingValue = 0;
    let totalCarats = 0;
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    for (const p of packets) {
      const value = Number(p.costPerCarat || 0) * Number(p.caratWeight || 0);
      totalStockValue += value;
      totalCarats += Number(p.caratWeight || 0);
      if (p.createdAt < ninetyDaysAgo) {
        slowMovingValue += value;
      }
    }

    // 2. Active Job Work Vouchers
    const activeJobsCount = await this.prisma.jobVoucher.count({
      where: { companyId, isDeleted: false, status: 'PENDING_APPROVAL' },
    });

    return {
      stock: {
        totalValue: Math.round(totalStockValue * 100) / 100,
        totalCarats: Math.round(totalCarats * 1000) / 1000,
        slowMovingValue: Math.round(slowMovingValue * 100) / 100,
        slowMovingRatio: totalStockValue > 0 ? Math.round((slowMovingValue / totalStockValue) * 10000) / 100 : 0,
      },
      jobs: {
        activeOrders: activeJobsCount,
      },
    };
  }

  async getMisFinancialRatios(companyId: number, dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : new Date();

    // 1. Receivables & Payables totals (Outstanding)
    const activeReceivables = await this.prisma.outstandingBill.aggregate({
      where: { companyId, billType: 'DEBIT', status: { in: ['UNPAID', 'PARTIAL'] }, billDate: { lte: targetDate } },
      _sum: { outstandingAmount: true },
    });
    const activePayables = await this.prisma.outstandingBill.aggregate({
      where: { companyId, billType: 'CREDIT', status: { in: ['UNPAID', 'PARTIAL'] }, billDate: { lte: targetDate } },
      _sum: { outstandingAmount: true },
    });

    // 2. Cash and Bank Balances
    const cashBankAccounts = await this.prisma.account.findMany({
      where: { companyId, isDeleted: false, accountGroup: { groupName: { in: ['Cash Accounts', 'Bank Accounts'] } } },
      select: { id: true },
    });

    let cashBankBalance = 0;
    for (const acc of cashBankAccounts) {
      const debitSum = await this.prisma.generalLedgerEntry.aggregate({
        where: { companyId, accountId: acc.id, debitCreditType: 'DEBIT', voucherDate: { lte: targetDate } },
        _sum: { amount: true },
      });
      const creditSum = await this.prisma.generalLedgerEntry.aggregate({
        where: { companyId, accountId: acc.id, debitCreditType: 'CREDIT', voucherDate: { lte: targetDate } },
        _sum: { amount: true },
      });
      cashBankBalance += (Number(debitSum._sum.amount || 0) - Number(creditSum._sum.amount || 0));
    }

    // 3. Stock value
    const packets = await this.prisma.stockPacket.findMany({
      where: { companyId, isDeleted: false, currentStatus: { in: ['AVAILABLE', 'HOLD'] }, createdAt: { lte: targetDate } },
      select: { costPerCarat: true, caratWeight: true },
    });
    const stockValue = packets.reduce((sum, p) => sum + (Number(p.costPerCarat || 0) * Number(p.caratWeight || 0)), 0);

    // Current Assets & Liabilities
    const receivables = Number(activeReceivables._sum.outstandingAmount || 0);
    const payables = Number(activePayables._sum.outstandingAmount || 0);

    const currentAssets = cashBankBalance + receivables + stockValue;
    const currentLiabilities = payables || 1; // Prevent div by zero

    const currentRatio = currentAssets / currentLiabilities;
    const quickRatio = (cashBankBalance + receivables) / currentLiabilities;

    return {
      currentRatio: Math.round(currentRatio * 100) / 100,
      quickRatio: Math.round(quickRatio * 100) / 100,
      cashBankBalance: Math.round(cashBankBalance * 100) / 100,
      receivables: Math.round(receivables * 100) / 100,
      payables: Math.round(payables * 100) / 100,
      stockValue: Math.round(stockValue * 100) / 100,
    };
  }

  // ── CASH FLOW STATEMENT ──────────────────────────────────────────
  async getCashFlow(companyId: number, startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : new Date();

    // 1. Identify Cash & Bank Accounts
    const cbAccounts = await this.prisma.account.findMany({
      where: { companyId, isDeleted: false, accountGroup: { groupName: { in: ['Cash Accounts', 'Bank Accounts'] } } },
      select: { id: true, accountName: true },
    });
    const cbAccountIds = cbAccounts.map(a => a.id);
    const cbAccountIdSet = new Set(cbAccountIds);

    // 2. Fetch all GL entries for the company up to end date
    const rangeFilter: any = { companyId, voucherDate: { lte: end } };
    if (start) {
      rangeFilter.voucherDate.gte = start;
    }

    const allEntries = await this.prisma.generalLedgerEntry.findMany({
      where: rangeFilter,
      include: {
        account: {
          include: { accountGroup: true },
        },
      },
    });

    // 3. Group entries by voucher
    const voucherMap = new Map<string, typeof allEntries>();
    for (const ent of allEntries) {
      const key = `${ent.sourceVoucherType}:${ent.sourceVoucherId}`;
      if (!voucherMap.has(key)) voucherMap.set(key, []);
      voucherMap.get(key)!.push(ent);
    }

    let operatingInflow = 0;
    let operatingOutflow = 0;
    let investingInflow = 0;
    let investingOutflow = 0;
    let financingInflow = 0;
    let financingOutflow = 0;

    const details: any[] = [];

    for (const [vKey, vEntries] of voucherMap.entries()) {
      // Find cash entries in this voucher
      const cashEnts = vEntries.filter(e => cbAccountIdSet.has(e.accountId));
      if (cashEnts.length === 0) continue;

      // Find non-cash entries in this voucher
      const nonCashEnts = vEntries.filter(e => !cbAccountIdSet.has(e.accountId));

      // Calculate net cash movement in this voucher
      // Debit to Cash = Inflow (+)
      // Credit to Cash = Outflow (-)
      let netMovement = 0;
      for (const ce of cashEnts) {
        const amt = Number(ce.amount);
        if (ce.debitCreditType === 'DEBIT') {
          netMovement += amt;
        } else {
          netMovement -= amt;
        }
      }

      if (netMovement === 0) continue;

      // Classify based on the counterparties (nonCashEnts)
      let category: 'OPERATING' | 'INVESTING' | 'FINANCING' = 'OPERATING';
      let description = 'Operating Transaction';

      if (nonCashEnts.length > 0) {
        // Look at the first primary counterparty account group
        const primaryAcc = nonCashEnts[0].account;
        const grpName = primaryAcc?.accountGroup?.groupName || '';
        const grpLower = grpName.toLowerCase();
        description = `${primaryAcc?.accountName || 'Counterparty'} (${grpName})`;

        if (grpLower.includes('fixed asset') || grpLower.includes('investment') || grpLower.includes('asset')) {
          if (!grpLower.includes('current asset')) {
            category = 'INVESTING';
          }
        } else if (grpLower.includes('capital') || grpLower.includes('equity') || grpLower.includes('reserve') || grpLower.includes('loan') || grpLower.includes('borrowing')) {
          if (!grpLower.includes('current')) {
            category = 'FINANCING';
          }
        }
      }

      if (category === 'OPERATING') {
        if (netMovement > 0) operatingInflow += netMovement;
        else operatingOutflow += Math.abs(netMovement);
      } else if (category === 'INVESTING') {
        if (netMovement > 0) investingInflow += netMovement;
        else investingOutflow += Math.abs(netMovement);
      } else {
        if (netMovement > 0) financingInflow += netMovement;
        else financingOutflow += Math.abs(netMovement);
      }

      details.push({
        voucherKey: vKey,
        date: cashEnts[0].voucherDate,
        description,
        category,
        amount: netMovement,
      });
    }

    // Sort details by date desc
    details.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate opening cash balances
    const openingBalances = await this.prisma.account.findMany({
      where: { companyId, isDeleted: false, accountGroup: { groupName: { in: ['Cash Accounts', 'Bank Accounts'] } } },
      include: {
        generalLedgerEntries: {
          where: start ? { voucherDate: { lt: start } } : { id: 0 },
        }
      }
    });

    let openingCash = 0;
    for (const acc of openingBalances) {
      const opVal = Number(acc.openingBalanceAmount || 0);
      if (acc.openingBalanceType === 'DEBIT') openingCash += opVal;
      else openingCash -= opVal;

      for (const ent of acc.generalLedgerEntries) {
        const amt = Number(ent.amount);
        if (ent.debitCreditType === 'DEBIT') openingCash += amt;
        else openingCash -= amt;
      }
    }

    const netChange = (operatingInflow - operatingOutflow) + (investingInflow - investingOutflow) + (financingInflow - financingOutflow);
    const closingCash = openingCash + netChange;

    return {
      openingCash: Math.round(openingCash * 100) / 100,
      operating: {
        inflow: Math.round(operatingInflow * 100) / 100,
        outflow: Math.round(operatingOutflow * 100) / 100,
        net: Math.round((operatingInflow - operatingOutflow) * 100) / 100,
      },
      investing: {
        inflow: Math.round(investingInflow * 100) / 100,
        outflow: Math.round(investingOutflow * 100) / 100,
        net: Math.round((investingInflow - investingOutflow) * 100) / 100,
      },
      financing: {
        inflow: Math.round(financingInflow * 100) / 100,
        outflow: Math.round(financingOutflow * 100) / 100,
        net: Math.round((financingInflow - financingOutflow) * 100) / 100,
      },
      netChange: Math.round(netChange * 100) / 100,
      closingCash: Math.round(closingCash * 100) / 100,
      details: details.map(d => ({
        ...d,
        amount: Math.round(d.amount * 100) / 100,
      })),
    };
  }

  // ── FUND FLOW STATEMENT ──────────────────────────────────────────
  async getFundFlow(companyId: number, startDateStr?: string, endDateStr?: string) {
    const end = endDateStr ? new Date(endDateStr) : new Date();
    const start = startDateStr ? new Date(startDateStr) : new Date(end.getFullYear(), 3, 1);

    const accounts = await this.prisma.account.findMany({
      where: { companyId, isDeleted: false },
      include: {
        accountGroup: true,
        generalLedgerEntries: {
          where: { voucherDate: { lte: end } }
        }
      }
    });

    const getAccountBalances = (targetDate: Date) => {
      const balanceMap = new Map<number, number>();
      for (const acc of accounts) {
        let bal = 0;
        const opVal = Number(acc.openingBalanceAmount || 0);
        if (acc.openingBalanceType === 'DEBIT') bal += opVal;
        else bal -= opVal;

        for (const ent of acc.generalLedgerEntries) {
          if (ent.voucherDate > targetDate) continue;
          const amt = Number(ent.amount);
          if (ent.debitCreditType === 'DEBIT') bal += amt;
          else bal -= amt;
        }
        balanceMap.set(acc.id, bal);
      }
      return balanceMap;
    };

    const startBalances = getAccountBalances(new Date(start.getTime() - 24 * 60 * 60 * 1000));
    const endBalances = getAccountBalances(end);

    let openingCurrentAssets = 0;
    let closingCurrentAssets = 0;
    let openingCurrentLiabilities = 0;
    let closingCurrentLiabilities = 0;

    const workingCapitalDetails: any[] = [];

    for (const acc of accounts) {
      const grpName = acc.accountGroup?.groupName || '';
      const grpLower = grpName.toLowerCase();
      
      const isCurrentAsset = grpLower.includes('cash') || grpLower.includes('bank') || grpLower.includes('sundry debtors') || grpLower.includes('receivable') || grpLower.includes('stock');
      const isCurrentLiability = grpLower.includes('sundry creditors') || grpLower.includes('payable') || grpLower.includes('tax') || grpLower.includes('provision') || grpLower.includes('short term');

      if (!isCurrentAsset && !isCurrentLiability) continue;

      const opBal = startBalances.get(acc.id) || 0;
      const clBal = endBalances.get(acc.id) || 0;

      const opening = Math.abs(opBal);
      const closing = Math.abs(clBal);
      const change = closing - opening;

      workingCapitalDetails.push({
        accountId: acc.id,
        accountName: acc.accountName,
        groupName: grpName,
        type: isCurrentAsset ? 'ASSET' : 'LIABILITY',
        opening: Math.round(opening * 100) / 100,
        closing: Math.round(closing * 100) / 100,
        change: Math.round(change * 100) / 100,
      });

      if (isCurrentAsset) {
        openingCurrentAssets += opening;
        closingCurrentAssets += closing;
      } else {
        openingCurrentLiabilities += opening;
        closingCurrentLiabilities += closing;
      }
    }

    const openingWorkingCapital = openingCurrentAssets - openingCurrentLiabilities;
    const closingWorkingCapital = closingCurrentAssets - closingCurrentLiabilities;
    const changeInWorkingCapital = closingWorkingCapital - openingWorkingCapital;

    let sourcesTotal = 0;
    let applicationsTotal = 0;

    const sourcesDetails: any[] = [];
    const applicationsDetails: any[] = [];

    const pl = await this.getProfitLoss(companyId, start.toISOString(), end.toISOString());
    if (pl.netProfit > 0) {
      sourcesDetails.push({ description: 'Funds from Operations (Net Profit)', amount: pl.netProfit });
      sourcesTotal += pl.netProfit;
    } else if (pl.netProfit < 0) {
      applicationsDetails.push({ description: 'Funds Lost in Operations (Net Loss)', amount: Math.abs(pl.netProfit) });
      applicationsTotal += Math.abs(pl.netProfit);
    }

    for (const acc of accounts) {
      const grpName = acc.accountGroup?.groupName || '';
      const grpLower = grpName.toLowerCase();
      
      const isNonCurrentAsset = grpLower.includes('fixed asset') || grpLower.includes('investment');
      const isNonCurrentLiability = grpLower.includes('capital') || grpLower.includes('equity') || grpLower.includes('secured') || grpLower.includes('unsecured') || grpLower.includes('long term');

      if (!isNonCurrentAsset && !isNonCurrentLiability) continue;

      const opBal = startBalances.get(acc.id) || 0;
      const clBal = endBalances.get(acc.id) || 0;
      const diff = clBal - opBal;

      if (Math.abs(diff) < 0.01) continue;

      if (isNonCurrentAsset) {
        if (diff > 0) {
          applicationsDetails.push({ description: `Purchase of ${acc.accountName}`, amount: diff });
          applicationsTotal += diff;
        } else {
          sourcesDetails.push({ description: `Sale of ${acc.accountName}`, amount: Math.abs(diff) });
          sourcesTotal += Math.abs(diff);
        }
      } else {
        if (diff < 0) {
          sourcesDetails.push({ description: `Capital/Loan inflow from ${acc.accountName}`, amount: Math.abs(diff) });
          sourcesTotal += Math.abs(diff);
        } else {
          applicationsDetails.push({ description: `Repayment/Withdrawal of ${acc.accountName}`, amount: diff });
          applicationsTotal += diff;
        }
      }
    }

    return {
      workingCapital: {
        openingCurrentAssets: Math.round(openingCurrentAssets * 100) / 100,
        closingCurrentAssets: Math.round(closingCurrentAssets * 100) / 100,
        openingCurrentLiabilities: Math.round(openingCurrentLiabilities * 100) / 100,
        closingCurrentLiabilities: Math.round(closingCurrentLiabilities * 100) / 100,
        openingWorkingCapital: Math.round(openingWorkingCapital * 100) / 100,
        closingWorkingCapital: Math.round(closingWorkingCapital * 100) / 100,
        change: Math.round(changeInWorkingCapital * 100) / 100,
        details: workingCapitalDetails,
      },
      sources: sourcesDetails.map(s => ({ ...s, amount: Math.round(s.amount * 100) / 100 })),
      applications: applicationsDetails.map(a => ({ ...a, amount: Math.round(a.amount * 100) / 100 })),
      sourcesTotal: Math.round(sourcesTotal * 100) / 100,
      applicationsTotal: Math.round(applicationsTotal * 100) / 100,
    };
  }
}


