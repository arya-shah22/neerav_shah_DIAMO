import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DebitCreditType } from '@prisma/client';

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

  async reconcileLegacyEntries(companyId: number) {
    const invoices = await this.prisma.saleInvoice.findMany({
      where: { companyId, isDeleted: false },
    });

    const salesLedgerId = await this.getOrCreateDefaultAccount(companyId, 'Sales A/c', 'Sales Accounts');
    const purchaseLedgerId = await this.getOrCreateDefaultAccount(companyId, 'Purchase A/c', 'Purchase Accounts');
    const cgstLedgerId = await this.getOrCreateDefaultAccount(companyId, 'CGST Input/Output', 'Duties & Taxes');
    const sgstLedgerId = await this.getOrCreateDefaultAccount(companyId, 'SGST Input/Output', 'Duties & Taxes');
    const igstLedgerId = await this.getOrCreateDefaultAccount(companyId, 'IGST Input/Output', 'Duties & Taxes');

    for (const inv of invoices) {
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

        await this.prisma.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: inv.customerId,
            voucherDate: inv.invoiceDate,
            debitCreditType: partyDebitCredit,
            amount: inv.netAmount,
            sourceVoucherType: inv.invoiceType as any,
            sourceVoucherId: inv.id,
            sourceBillNumber: inv.billNumber || inv.voucherNumber,
            narration: `Sync: ${inv.voucherNumber}`,
          }
        });

        let revenueDebitCredit: DebitCreditType = DebitCreditType.CREDIT;
        if (isSales) revenueDebitCredit = DebitCreditType.CREDIT;
        else if (isSalesReturn) revenueDebitCredit = DebitCreditType.DEBIT;
        else if (isPurchase) revenueDebitCredit = DebitCreditType.DEBIT;
        else if (isPurchaseReturn) revenueDebitCredit = DebitCreditType.CREDIT;

        const ledgerId = (isSales || isSalesReturn) ? salesLedgerId : purchaseLedgerId;
        const totalTax = Number(inv.totalCgst || 0) + Number(inv.totalSgst || 0) + Number(inv.totalIgst || 0);
        const taxableTotal = Number(inv.netAmount) - totalTax;

        await this.prisma.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: ledgerId,
            voucherDate: inv.invoiceDate,
            debitCreditType: revenueDebitCredit,
            amount: taxableTotal,
            sourceVoucherType: inv.invoiceType as any,
            sourceVoucherId: inv.id,
            sourceBillNumber: inv.billNumber || inv.voucherNumber,
            narration: `Sync Revenue: ${inv.voucherNumber}`,
          }
        });

        let taxDebitCredit: DebitCreditType = DebitCreditType.CREDIT;
        if (isSales) taxDebitCredit = DebitCreditType.CREDIT;
        else if (isSalesReturn) taxDebitCredit = DebitCreditType.DEBIT;
        else if (isPurchase) taxDebitCredit = DebitCreditType.DEBIT;
        else if (isPurchaseReturn) taxDebitCredit = DebitCreditType.CREDIT;

        if (Number(inv.totalCgst) > 0) {
          await this.prisma.generalLedgerEntry.create({
            data: {
              companyId,
              accountId: cgstLedgerId,
              voucherDate: inv.invoiceDate,
              debitCreditType: taxDebitCredit,
              amount: inv.totalCgst,
              sourceVoucherType: inv.invoiceType as any,
              sourceVoucherId: inv.id,
              sourceBillNumber: inv.billNumber || inv.voucherNumber,
              narration: 'Sync CGST',
            }
          });
        }
        if (Number(inv.totalSgst) > 0) {
          await this.prisma.generalLedgerEntry.create({
            data: {
              companyId,
              accountId: sgstLedgerId,
              voucherDate: inv.invoiceDate,
              debitCreditType: taxDebitCredit,
              amount: inv.totalSgst,
              sourceVoucherType: inv.invoiceType as any,
              sourceVoucherId: inv.id,
              sourceBillNumber: inv.billNumber || inv.voucherNumber,
              narration: 'Sync SGST',
            }
          });
        }
        if (Number(inv.totalIgst) > 0) {
          await this.prisma.generalLedgerEntry.create({
            data: {
              companyId,
              accountId: igstLedgerId,
              voucherDate: inv.invoiceDate,
              debitCreditType: taxDebitCredit,
              amount: inv.totalIgst,
              sourceVoucherType: inv.invoiceType as any,
              sourceVoucherId: inv.id,
              sourceBillNumber: inv.billNumber || inv.voucherNumber,
              narration: 'Sync IGST',
            }
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
        await this.prisma.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: cb.cashBankAccountId,
            voucherDate: cb.voucherDate,
            debitCreditType: isReceipt ? DebitCreditType.DEBIT : DebitCreditType.CREDIT,
            amount: cb.amount,
            sourceVoucherType: cb.transactionType as any,
            sourceVoucherId: cb.id,
            sourceBillNumber: cb.voucherNumber,
            narration: `Sync Cash/Bank: ${cb.voucherNumber}`,
          }
        });

        await this.prisma.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: cb.partyId,
            voucherDate: cb.voucherDate,
            debitCreditType: isReceipt ? DebitCreditType.CREDIT : DebitCreditType.DEBIT,
            amount: cb.amount,
            sourceVoucherType: cb.transactionType as any,
            sourceVoucherId: cb.id,
            sourceBillNumber: cb.voucherNumber,
            narration: `Sync Party: ${cb.voucherNumber}`,
          }
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
          await this.prisma.generalLedgerEntry.create({
            data: {
              companyId,
              accountId: line.accountId,
              voucherDate: jv.voucherDate,
              debitCreditType: line.debitCreditType,
              amount: line.amount,
              sourceVoucherType: 'JOURNAL_VOUCHER',
              sourceVoucherId: jv.id,
              sourceBillNumber: jv.voucherNumber,
              narration: line.narration || jv.narration || 'Sync Journal',
            }
          });
        }
      }
    }

    const loans = await this.prisma.loan.findMany({
      where: { companyId, isDeleted: false },
      include: { repayments: true },
    });

    const cashAccountId = await this.getOrCreateDefaultAccount(companyId, 'Cash Account', 'Cash-in-hand');

    for (const loan of loans) {
      const glCount = await this.prisma.generalLedgerEntry.count({
        where: { sourceVoucherType: 'LOAN_VOUCHER', sourceVoucherId: loan.id },
      });

      if (glCount === 0) {
        const isGiven = loan.loanType === 'GIVEN';
        await this.prisma.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: loan.partyId,
            voucherDate: loan.loanDate,
            debitCreditType: isGiven ? DebitCreditType.DEBIT : DebitCreditType.CREDIT,
            amount: loan.principalAmount,
            sourceVoucherType: 'LOAN_VOUCHER',
            sourceVoucherId: loan.id,
            sourceBillNumber: loan.voucherNumber,
            narration: `Sync Loan Principal: ${loan.voucherNumber}`,
          }
        });

        await this.prisma.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: cashAccountId,
            voucherDate: loan.loanDate,
            debitCreditType: isGiven ? DebitCreditType.CREDIT : DebitCreditType.DEBIT,
            amount: loan.principalAmount,
            sourceVoucherType: 'LOAN_VOUCHER',
            sourceVoucherId: loan.id,
            sourceBillNumber: loan.voucherNumber,
            narration: `Sync Loan Cash: ${loan.voucherNumber}`,
          }
        });
      }

      for (const rep of loan.repayments) {
        const repGlCount = await this.prisma.generalLedgerEntry.count({
          where: { sourceVoucherType: 'LOAN_VOUCHER', sourceVoucherId: rep.id },
        });

        if (repGlCount === 0) {
          const isGiven = loan.loanType === 'GIVEN';
          await this.prisma.generalLedgerEntry.create({
            data: {
              companyId,
              accountId: loan.partyId,
              voucherDate: rep.paymentDate,
              debitCreditType: isGiven ? DebitCreditType.CREDIT : DebitCreditType.DEBIT,
              amount: rep.amount,
              sourceVoucherType: 'LOAN_VOUCHER',
              sourceVoucherId: rep.id,
              sourceBillNumber: loan.voucherNumber,
              narration: `Sync Repayment: ${loan.voucherNumber}`,
            }
          });

          await this.prisma.generalLedgerEntry.create({
            data: {
              companyId,
              accountId: cashAccountId,
              voucherDate: rep.paymentDate,
              debitCreditType: isGiven ? DebitCreditType.DEBIT : DebitCreditType.CREDIT,
              amount: rep.amount,
              sourceVoucherType: 'LOAN_VOUCHER',
              sourceVoucherId: rep.id,
              sourceBillNumber: loan.voucherNumber,
              narration: `Sync Repayment Cash: ${loan.voucherNumber}`,
            }
          });
        }
      }
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
      if (results.length === 0) throw new BadRequestException('Account not found');
      return results[0];
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

    // Query open invoices
    const invoices = await this.prisma.saleInvoice.findMany({
      where: {
        companyId,
        isDeleted: false,
        customerId: { in: accountIds },
        status: { in: ['SAVED', 'APPROVED'] },
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
      },
      orderBy: { invoiceDate: 'asc' },
    });

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
    const packets = await this.prisma.stockPacket.findMany({
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
      },
      orderBy: { stockIdNumber: 'asc' },
    });

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

    return {
      summary: {
        totalPackets,
        totalCarats,
        totalValuation,
        statusBreakdown: {
          available: { count: availableCount, carats: availableCarats, value: availableValuation },
          reserved: { count: reservedCount, carats: reservedCarats, value: reservedValuation },
          jobWork: { count: jobWorkCount, carats: jobWorkCarats, value: jobWorkValuation },
          transit: { count: transitCount, carats: transitCarats, value: transitValuation },
          sold: { count: soldCount, carats: soldCarats, value: soldValuation },
          returned: { count: returnedCount, carats: returnedCarats, value: returnedValuation },
          damaged: { count: damagedCount, carats: damagedCarats, value: damagedValuation },
          archived: { count: archivedCount, carats: archivedCarats, value: archivedValuation },
        }
      },
      qualityAggregates,
      packets: packets.map(p => {
        let carats = Number(p.caratWeight || 0);
        if (carats === 0 && (p.currentStatus === 'SOLD' || p.currentStatus === 'RETURNED' || p.currentStatus === 'DAMAGED')) {
          const outMov = p.movements?.find(m => m.movementType === 'SALES' || m.movementType === 'PURCHASE_RETURN');
          if (outMov) {
            carats = Number(outMov.carats || 0);
          }
        }

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
          currentStatus: p.currentStatus,
          location: p.currentLocation || (p.currentStatus === 'JOB_WORK' ? 'Worker Vault' : 'Central Vault'),
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
}

