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
}
