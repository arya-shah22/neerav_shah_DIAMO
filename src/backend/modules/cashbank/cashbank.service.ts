// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Cash & Bank Voucher Service (Phase 9)
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CashBankType, VoucherStatus, DebitCreditType, VoucherType, PaymentStatus, InvoiceStatus, InvoiceType } from '@prisma/client';
import { formatVoucherNumber } from '../../utils/voucher-number-formatter';

@Injectable()
export class CashBankService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  /**
   * Ensure default Cash Account and Bank Account exist for a company
   */
  async ensureDefaultAccounts(companyId: number): Promise<void> {
    // Bug #9/#16 fix: Use exact accountName match instead of contains
    const cashExist = await this.prisma.account.findFirst({
      where: {
        companyId,
        isDeleted: false,
        accountName: 'Cash Account'
      }
    });

    if (!cashExist) {
      let group = await this.prisma.accountGroup.findFirst({
        where: { companyId, groupName: { contains: 'cash' } }
      });
      if (!group) {
        group = await this.prisma.accountGroup.create({
          data: { companyId, groupName: 'Cash Accounts', nature: 'ASSET' }
        });
      }
      await this.prisma.account.create({
        data: {
          companyId,
          accountGroupId: group.id,
          accountName: 'Cash Account',
          openingBalanceAmount: 0,
          openingBalanceType: DebitCreditType.DEBIT
        }
      });
    }

    const cashUsdExist = await this.prisma.account.findFirst({
      where: {
        companyId,
        isDeleted: false,
        accountName: 'Cash Account (USD)'
      }
    });

    if (!cashUsdExist) {
      let group = await this.prisma.accountGroup.findFirst({
        where: { companyId, groupName: { contains: 'cash' } }
      });
      if (!group) {
        group = await this.prisma.accountGroup.create({
          data: { companyId, groupName: 'Cash Accounts', nature: 'ASSET' }
        });
      }
      await this.prisma.account.create({
        data: {
          companyId,
          accountGroupId: group.id,
          accountName: 'Cash Account (USD)',
          openingBalanceAmount: 0,
          openingBalanceType: DebitCreditType.DEBIT
        }
      });
    }

    // Bug #9/#16 fix: Use exact accountName match instead of contains
    const bankExist = await this.prisma.account.findFirst({
      where: {
        companyId,
        isDeleted: false,
        accountName: 'Bank Account'
      }
    });

    if (!bankExist) {
      let group = await this.prisma.accountGroup.findFirst({
        where: { companyId, groupName: { contains: 'bank' } }
      });
      if (!group) {
        group = await this.prisma.accountGroup.create({
          data: { companyId, groupName: 'Bank Accounts', nature: 'ASSET' }
        });
      }
      await this.prisma.account.create({
        data: {
          companyId,
          accountGroupId: group.id,
          accountName: 'Bank Account',
          openingBalanceAmount: 0,
          openingBalanceType: DebitCreditType.DEBIT
        }
      });
    }

    const bankUsdExist = await this.prisma.account.findFirst({
      where: {
        companyId,
        isDeleted: false,
        accountName: 'Bank Account (USD)'
      }
    });

    if (!bankUsdExist) {
      let group = await this.prisma.accountGroup.findFirst({
        where: { companyId, groupName: { contains: 'bank' } }
      });
      if (!group) {
        group = await this.prisma.accountGroup.create({
          data: { companyId, groupName: 'Bank Accounts', nature: 'ASSET' }
        });
      }
      await this.prisma.account.create({
        data: {
          companyId,
          accountGroupId: group.id,
          accountName: 'Bank Account (USD)',
          openingBalanceAmount: 0,
          openingBalanceType: DebitCreditType.DEBIT
        }
      });
    }

    // 3. Ensure Voucher Adjustment Clearing Account exists
    const clearingExist = await this.prisma.account.findFirst({
      where: {
        companyId,
        isDeleted: false,
        accountName: 'Voucher Adjustment Clearing'
      }
    });

    if (!clearingExist) {
      let group = await this.prisma.accountGroup.findFirst({
        where: { companyId, groupName: { contains: 'suspense' } }
      });
      if (!group) {
        group = await this.prisma.accountGroup.create({
          data: { companyId, groupName: 'Suspense Accounts', nature: 'LIABILITY' }
        });
      }
      await this.prisma.account.create({
        data: {
          companyId,
          accountGroupId: group.id,
          accountName: 'Voucher Adjustment Clearing',
          openingBalanceAmount: 0,
          openingBalanceType: DebitCreditType.CREDIT
        }
      });
    }
  }

  /**
   * List recent Cash & Bank vouchers
   */
  async list(companyId: number) {
    await this.ensureDefaultAccounts(companyId);
    return this.prisma.cashBankVoucher.findMany({
      where: { companyId, isDeleted: false },
      orderBy: [
        { voucherDate: 'desc' },
        { id: 'desc' }
      ],
      include: {
        party: true,
        cashBankAccount: true
      }
    });
  }

  /**
   * Helper to fetch outstanding JVs for a customer/supplier
   */
  async listUnpaidJVs(companyId: number, partyId: number, isReceipt: boolean) {
    const targetType = isReceipt ? DebitCreditType.DEBIT : DebitCreditType.CREDIT;

    // Find APPROVED/SAVED JV lines matching party and type
    const jvLines = await this.prisma.journalVoucherLine.findMany({
      where: {
        accountId: partyId,
        debitCreditType: targetType,
        journalVoucher: {
          companyId,
          isDeleted: false,
          status: { in: [VoucherStatus.POSTED] }
        }
      },
      include: {
        journalVoucher: true
      }
    });

    const list = [];
    for (const line of jvLines) {
      const jv = line.journalVoucher;

      // Calculate how much has been settled in active CashBankVouchers referencing this JV's voucher number
      const settlements = await this.prisma.cashBankVoucher.findMany({
        where: {
          companyId,
          partyId,
          referenceBillNo: jv.voucherNumber,
          isDeleted: false
        }
      });

      const totalPaid = settlements.reduce((sum, s) => sum + Number(s.amount), 0);
      const originalAmount = Number(line.amount);
      const outstandingAmount = Math.max(0, originalAmount - totalPaid);

      if (outstandingAmount > 0) {
        list.push({
          id: jv.id,
          companyId: jv.companyId,
          financialYearId: jv.financialYearId,
          invoiceType: 'JOURNAL_VOUCHER' as any,
          voucherNumber: jv.voucherNumber,
          billNumber: jv.voucherNumber,
          invoiceDate: jv.voucherDate,
          status: jv.status,
          netAmount: originalAmount,
          outstandingAmount,
          jamaAmount: totalPaid
        });
      }
    }
    return list;
  }

  /**
   * Fetch outstanding purchase invoices for a supplier
   */
  async listUnpaidPurchases(companyId: number, supplierId: number) {
    const purchases = await this.prisma.purchaseInvoice.findMany({
      where: {
        companyId,
        supplierId: supplierId,
        invoiceType: InvoiceType.PURCHASE_INVOICE,
        isDeleted: false,
        status: { in: [InvoiceStatus.SAVED, InvoiceStatus.APPROVED] },
        outstandingAmount: { gt: 0 }
      },
      orderBy: { invoiceDate: 'asc' }
    });

    // Normalize for frontend: map supplierId -> customerId
    const normalizedPurchases = purchases.map((p: any) => ({ ...p, customerId: p.supplierId }));

    const jvs = await this.listUnpaidJVs(companyId, supplierId, false);
    return [...normalizedPurchases, ...jvs];
  }

  /**
   * Fetch outstanding sale invoices for a customer
   */
  async listUnpaidSales(companyId: number, customerId: number) {
    const sales = await this.prisma.saleInvoice.findMany({
      where: {
        companyId,
        customerId,
        invoiceType: InvoiceType.SALE_INVOICE,
        isDeleted: false,
        status: { in: [InvoiceStatus.SAVED, InvoiceStatus.APPROVED] },
        outstandingAmount: { gt: 0 }
      },
      orderBy: { invoiceDate: 'asc' }
    });

    const jvs = await this.listUnpaidJVs(companyId, customerId, true);
    return [...sales, ...jvs];
  }

  /**
   * Fetch outstanding credit notes & debit notes for a party
   */
  async listPartyNotes(companyId: number, partyId: number) {
    // Sale-type notes from sale_invoices table
    const saleNotes = await this.prisma.saleInvoice.findMany({
      where: {
        companyId,
        customerId: partyId,
        isDeleted: false,
        invoiceType: { in: [InvoiceType.SALE_RETURN, InvoiceType.SALE_DEBIT_NOTE] },
        status: { in: [InvoiceStatus.SAVED, InvoiceStatus.APPROVED] },
        outstandingAmount: { gt: 0 }
      },
      orderBy: { invoiceDate: 'asc' }
    });

    // Purchase-type notes from purchase_invoices table
    const purchaseNotes = await this.prisma.purchaseInvoice.findMany({
      where: {
        companyId,
        supplierId: partyId,
        isDeleted: false,
        invoiceType: { in: [InvoiceType.PURCHASE_RETURN, InvoiceType.PURCHASE_DEBIT_NOTE] },
        status: { in: [InvoiceStatus.SAVED, InvoiceStatus.APPROVED] },
        outstandingAmount: { gt: 0 }
      },
      orderBy: { invoiceDate: 'asc' }
    });

    // Normalize purchase notes for frontend
    const normalizedPurchaseNotes = purchaseNotes.map((n: any) => ({ ...n, customerId: n.supplierId }));

    return [...saleNotes, ...normalizedPurchaseNotes];
  }

  /**
   * Fetch historical payment entries against a specific invoice
   */
  async getPaymentsForInvoice(companyId: number, invoiceNo: string) {
    return this.prisma.cashBankVoucher.findMany({
      where: {
        companyId,
        referenceBillNo: invoiceNo,
        isDeleted: false
      },
      orderBy: { voucherDate: 'asc' },
      include: {
        cashBankAccount: true
      }
    });
  }

  /**
   * Fetch current running balance of a Cash/Bank account
   */
  async getRunningBalance(companyId: number, cashBankAccountId: number): Promise<number> {
    await this.ensureDefaultAccounts(companyId);
    const account = await this.prisma.account.findFirst({
      where: { id: cashBankAccountId, companyId }
    });
    if (!account) return 0;

    const opening = Number(account.openingBalanceAmount) || 0;
    const isOpeningDebit = account.openingBalanceType === DebitCreditType.DEBIT;

    const debits = await this.prisma.generalLedgerEntry.aggregate({
      where: { companyId, accountId: cashBankAccountId, debitCreditType: DebitCreditType.DEBIT },
      _sum: { amount: true }
    });

    const credits = await this.prisma.generalLedgerEntry.aggregate({
      where: { companyId, accountId: cashBankAccountId, debitCreditType: DebitCreditType.CREDIT },
      _sum: { amount: true }
    });

    const totalDebits = Number(debits._sum.amount) || 0;
    const totalCredits = Number(credits._sum.amount) || 0;

    let balance = isOpeningDebit ? (opening + totalDebits - totalCredits) : (-opening + totalDebits - totalCredits);
    return balance;
  }

  /**
   * Helper to generate sequential voucher numbers
   */
  private async generateVoucherNumber(companyId: number, financialYearId: number, type: CashBankType, date: Date = new Date()): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });

    if (!company || !fy) {
      throw new BadRequestException('Company or Financial Year not found');
    }

    const isCash = type === CashBankType.CASH_PAYMENT || type === CashBankType.CASH_RECEIPT;
    const vType = isCash ? VoucherType.CASH_PAYMENT : VoucherType.BANK_PAYMENT;

    let config = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, voucherType: vType },
    });
    if (!config) {
      config = await this.prisma.voucherNumberConfig.create({
        data: {
          companyId,
          financialYearId,
          voucherType: vType,
          method: 'AUTOMATIC',
          separator: '-',
          digitLength: 6,
          includeYear: true,
          includeMonth: false,
          resetAnnually: true,
        },
      });
    }

    const sequence = await this.prisma.voucherNumberSequence.upsert({
      where: {
        companyId_financialYearId_voucherType: {
          companyId,
          financialYearId,
          voucherType: vType,
        },
      },
      create: {
        companyId,
        financialYearId,
        voucherType: vType,
        currentNumber: 1,
        lastGeneratedAt: new Date(),
      },
      update: {
        currentNumber: { increment: 1 },
        lastGeneratedAt: new Date(),
      },
    });

    const startYear = fy.fromDate.getFullYear();
    const endYear = fy.toDate.getFullYear();
    const yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
    const typeCode = type === CashBankType.CASH_PAYMENT ? 'CP' : type === CashBankType.CASH_RECEIPT ? 'CR' : type === CashBankType.BANK_PAYMENT ? 'BP' : 'BR';

    return formatVoucherNumber(sequence.currentNumber, config, yearSuffix, typeCode, company.companyCode, date);
  }

  async previewVoucherNumber(companyId: number, financialYearId: number, transactionType: CashBankType, date: Date = new Date()): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });

    if (!company || !fy) {
      throw new BadRequestException('Company or Financial Year not found');
    }

    const isCash = transactionType === CashBankType.CASH_PAYMENT || transactionType === CashBankType.CASH_RECEIPT;
    const vType = isCash ? VoucherType.CASH_PAYMENT : VoucherType.BANK_PAYMENT;

    let config = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, voucherType: vType },
    });
    if (!config) {
      config = await this.prisma.voucherNumberConfig.create({
        data: {
          companyId,
          financialYearId,
          voucherType: vType,
          method: 'AUTOMATIC',
          separator: '-',
          digitLength: 6,
          includeYear: true,
          includeMonth: false,
          resetAnnually: true,
        },
      });
    }

    const sequence = await this.prisma.voucherNumberSequence.findFirst({
      where: { companyId, financialYearId, voucherType: vType },
    });

    const nextNum = (sequence?.currentNumber || 0) + 1;

    const startYear = fy.fromDate.getFullYear();
    const endYear = fy.toDate.getFullYear();
    const yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
    const typeCode = transactionType === 'CASH_PAYMENT' ? 'CP' : transactionType === 'CASH_RECEIPT' ? 'CR' : transactionType === 'BANK_PAYMENT' ? 'BP' : 'BR';

    return formatVoucherNumber(nextNum, config, yearSuffix, typeCode, company.companyCode, date);
  }

  /**
   * Create a Cash/Bank Voucher entry and post balanced GL records
   */
  async create(companyId: number, data: Record<string, any>) {
    const financialYearId = Number(data.financialYearId);
    const voucherDate = new Date(data.voucherDate);
    const transactionType = data.transactionType as CashBankType;
    const partyId = Number(data.partyId);
    const cashBankAccountId = Number(data.cashBankAccountId);
    const amount = Number(data.amount) || 0;
    const manualVoucherNo = data.manualVoucherNo || '';
    const narration = data.narration || '';
    const referenceBillNo = data.referenceBillNo || '';

    // Combined note adjustment parameters
    const adjustedNoteAmount = data.adjustedNoteAmount ? Number(data.adjustedNoteAmount) : 0;
    const isCreditAdjustment = data.isCreditAdjustment === true;

    if (!partyId || !cashBankAccountId) {
      throw new BadRequestException('Party account and Cash/Bank account must be selected');
    }
    if (amount <= 0) {
      throw new BadRequestException('Voucher amount must be greater than zero');
    }

    const transactionCurrency = (data.transactionCurrency as any) || 'INR';
    const exchangeRate = Number(data.exchangeRate) || 1.0;
    const amountAlt = data.amountAlt ? Number(data.amountAlt) : Math.round(amount * exchangeRate * 100) / 100;
    const paymentMode = data.paymentMode || null;
    const chequeNumber = data.chequeNumber || null;
    const chequeDate = data.chequeDate ? new Date(data.chequeDate) : null;
    const utrNumber = data.utrNumber || null;
    const transactionRef = data.transactionRef || null;

    const isManual = data.isManualBillNumber === true;
    const voucherNumber = isManual && data.billNumber
      ? String(data.billNumber)
      : await this.generateVoucherNumber(companyId, financialYearId, transactionType, voucherDate);

    // Map CashBankType to corresponding VoucherType for GL Entries
    let vType: VoucherType;
    if (transactionType === CashBankType.CASH_PAYMENT) vType = VoucherType.CASH_PAYMENT;
    else if (transactionType === CashBankType.CASH_RECEIPT) vType = VoucherType.CASH_RECEIPT;
    else if (transactionType === CashBankType.BANK_PAYMENT) vType = VoucherType.BANK_PAYMENT;
    else vType = VoucherType.BANK_RECEIPT;

    const isPurchase = transactionType === CashBankType.CASH_PAYMENT || transactionType === CashBankType.BANK_PAYMENT;

    return this.prisma.$transaction(async (tx) => {
      let parsedNarration: string[] = [];
      if (narration) {
        try {
          const parsed = JSON.parse(narration);
          if (Array.isArray(parsed)) {
            parsedNarration = parsed;
          } else {
            parsedNarration = [String(parsed)];
          }
        } catch {
          parsedNarration = [narration];
        }
      }
      if (adjustedNoteAmount > 0) {
        parsedNarration.push(`Applied Notes adjustment: ₹${adjustedNoteAmount} (${isCreditAdjustment ? 'Credit' : 'Debit'} Note Offset)`);
      }

      const voucher = await tx.cashBankVoucher.create({
        data: {
          companyId,
          financialYearId,
          transactionType,
          voucherNumber,
          manualVoucherNo,
          voucherDate,
          status: VoucherStatus.POSTED,
          partyId,
          cashBankAccountId,
          amount, // This is the net cash physically paid / collected
          narration: JSON.stringify(parsedNarration),
          referenceBillNo,
          transactionCurrency,
          exchangeRate,
          amountAlt,
          paymentMode,
          chequeNumber,
          chequeDate,
          utrNumber,
          transactionRef,
        }
      });

      // Update source invoice outstanding amount (if linked)
      if (referenceBillNo) {
        const invType = isPurchase ? InvoiceType.PURCHASE_INVOICE : InvoiceType.SALE_INVOICE;

        // Branch: query the correct table based on invoice type
        const totalSettlementApplied = isCreditAdjustment 
          ? amount + adjustedNoteAmount 
          : amount - adjustedNoteAmount;

        if (isPurchase) {
          const inv = await tx.purchaseInvoice.findFirst({
            where: { companyId, voucherNumber: referenceBillNo, invoiceType: invType, isDeleted: false }
          });
          if (inv) {
            const nextJama = Number(inv.jamaAmount) + totalSettlementApplied;
            const nextOutstanding = Math.max(0, Number(inv.netAmount) - nextJama);
            let nextStatus: PaymentStatus = PaymentStatus.PARTIAL;
            if (nextOutstanding <= 0) nextStatus = PaymentStatus.PAID;
            else if (nextJama === 0) nextStatus = PaymentStatus.UNPAID;

            await tx.purchaseInvoice.update({
              where: { id: inv.id },
              data: { jamaAmount: nextJama, outstandingAmount: nextOutstanding, paymentStatus: nextStatus }
            });
          }
        } else {
          const inv = await tx.saleInvoice.findFirst({
            where: { companyId, voucherNumber: referenceBillNo, invoiceType: invType, isDeleted: false }
          });
          if (inv) {
            const nextJama = Number(inv.jamaAmount) + totalSettlementApplied;
            const nextOutstanding = Math.max(0, Number(inv.netAmount) - nextJama);
            let nextStatus: PaymentStatus = PaymentStatus.PARTIAL;
            if (nextOutstanding <= 0) nextStatus = PaymentStatus.PAID;
            else if (nextJama === 0) nextStatus = PaymentStatus.UNPAID;

            await tx.saleInvoice.update({
              where: { id: inv.id },
              data: { jamaAmount: nextJama, outstandingAmount: nextOutstanding, paymentStatus: nextStatus }
            });
          }
        }
      }

      // Distribute note adjustment amount across active returns/notes using FIFO (First In First Out)
      if (adjustedNoteAmount > 0) {
        const allowedTypes = isPurchase 
          ? (isCreditAdjustment ? [InvoiceType.PURCHASE_DEBIT_NOTE] : [InvoiceType.PURCHASE_RETURN])
          : (isCreditAdjustment ? [InvoiceType.SALE_RETURN] : [InvoiceType.SALE_DEBIT_NOTE]);

        // Query and update notes in the correct table
        let activeNotes: any[];
        if (isPurchase) {
          activeNotes = await tx.purchaseInvoice.findMany({
            where: {
              companyId, supplierId: partyId, isDeleted: false,
              invoiceType: { in: allowedTypes },
              status: { in: [InvoiceStatus.SAVED, InvoiceStatus.APPROVED] },
              outstandingAmount: { gt: 0 }
            },
            orderBy: { invoiceDate: 'asc' }
          });
        } else {
          activeNotes = await tx.saleInvoice.findMany({
            where: {
              companyId, customerId: partyId, isDeleted: false,
              invoiceType: { in: allowedTypes },
              status: { in: [InvoiceStatus.SAVED, InvoiceStatus.APPROVED] },
              outstandingAmount: { gt: 0 }
            },
            orderBy: { invoiceDate: 'asc' }
          });
        }

        let remainingAllocation = adjustedNoteAmount;
        for (const note of activeNotes) {
          if (remainingAllocation <= 0) break;
          const noteOutstanding = Number(note.outstandingAmount);
          const applyToThisNote = Math.min(noteOutstanding, remainingAllocation);

          const nextNoteJama = Number(note.jamaAmount) + applyToThisNote;
          const nextNoteOutstanding = Math.max(0, Number(note.netAmount) - nextNoteJama);
          let nextNoteStatus: PaymentStatus = PaymentStatus.PARTIAL;
          if (nextNoteOutstanding <= 0) nextNoteStatus = PaymentStatus.PAID;

          if (isPurchase) {
            await tx.purchaseInvoice.update({
              where: { id: note.id },
              data: { jamaAmount: nextNoteJama, outstandingAmount: nextNoteOutstanding, paymentStatus: nextNoteStatus }
            });
          } else {
            await tx.saleInvoice.update({
              where: { id: note.id },
              data: { jamaAmount: nextNoteJama, outstandingAmount: nextNoteOutstanding, paymentStatus: nextNoteStatus }
            });
          }

          remainingAllocation -= applyToThisNote;
        }
      }

      // Post General Ledger Entries
      const isReceipt = transactionType === CashBankType.CASH_RECEIPT || transactionType === CashBankType.BANK_RECEIPT;

      // 1. Post to Cash/Bank Account (net cash flow)
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: cashBankAccountId,
          voucherDate,
          debitCreditType: isReceipt ? DebitCreditType.DEBIT : DebitCreditType.CREDIT,
          amount: amountAlt || amount,
          originalCurrency: transactionCurrency || 'INR',
          originalAmount: amount,
          exchangeRate: exchangeRate || 1.0,
          sourceVoucherType: vType,
          sourceVoucherId: voucher.id,
          sourceBillNumber: voucherNumber,
          narration: `${transactionType} posting ${voucherNumber}`,
        }
      });

      // 2. Post to Party Account (adjust full settlement amount: Cash + Note Adjustment offset)
      const totalSettlementAmount = isCreditAdjustment 
        ? amount + adjustedNoteAmount 
        : amount - adjustedNoteAmount;
      const totalSettlementAlt = (amountAlt || amount) + (adjustedNoteAmount * (exchangeRate || 1.0));

      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: partyId,
          voucherDate,
          debitCreditType: isReceipt ? DebitCreditType.CREDIT : DebitCreditType.DEBIT,
          amount: totalSettlementAlt,
          originalCurrency: transactionCurrency || 'INR',
          originalAmount: totalSettlementAmount,
          exchangeRate: exchangeRate || 1.0,
          sourceVoucherType: vType,
          sourceVoucherId: voucher.id,
          sourceBillNumber: voucherNumber,
          narration: `${transactionType} party posting ${voucherNumber} (Includes note adjustment of ₹${adjustedNoteAmount})`,
        }
      });

      // 3. Post note offset to the Party Account (on opposite side of receipt/payment to clear the note)
      if (adjustedNoteAmount > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: partyId,
            voucherDate,
            debitCreditType: isReceipt ? DebitCreditType.DEBIT : DebitCreditType.CREDIT,
            amount: adjustedNoteAmount,
            sourceVoucherType: vType,
            sourceVoucherId: voucher.id,
            sourceBillNumber: voucherNumber,
            narration: `${transactionType} note adjustment offset for ${voucherNumber}`,
          }
        });
      }

      return voucher;
    });
  }

  /**
   * Delete Cash/Bank Voucher and reverse GL entries
   */
  async delete(id: number, companyId: number) {
    const voucher = await this.prisma.cashBankVoucher.findFirst({
      where: { id, companyId, isDeleted: false }
    });
    if (!voucher) throw new BadRequestException('Voucher not found');

    const transactionType = voucher.transactionType;
    let vType: VoucherType;
    if (transactionType === CashBankType.CASH_PAYMENT) vType = VoucherType.CASH_PAYMENT;
    else if (transactionType === CashBankType.CASH_RECEIPT) vType = VoucherType.CASH_RECEIPT;
    else if (transactionType === CashBankType.BANK_PAYMENT) vType = VoucherType.BANK_PAYMENT;
    else vType = VoucherType.BANK_RECEIPT;

    const referenceBillNo = voucher.referenceBillNo;
    const amount = Number(voucher.amount);

    // Extract note adjustment from narration notes if saved
    let adjustedNoteAmount = 0;
    let isCreditAdjustment = false;
    if (voucher.narration) {
      try {
        const parsed = JSON.parse(voucher.narration);
        if (Array.isArray(parsed)) {
          const adjustmentLog = parsed.find((s: string) => s.includes('Applied Notes adjustment'));
          if (adjustmentLog) {
            const amtMatch = adjustmentLog.match(/₹([\d.]+)/);
            if (amtMatch) adjustedNoteAmount = Number(amtMatch[1]);
            isCreditAdjustment = adjustmentLog.includes('Credit');
          }
        }
      } catch {
        // Narration is a plain text, no adjustment log was saved
      }
    }

    const isPurchase = transactionType === CashBankType.CASH_PAYMENT || transactionType === CashBankType.BANK_PAYMENT;

    return this.prisma.$transaction(async (tx) => {
      // Revert source invoice outstanding amount (if linked)
      if (referenceBillNo) {
        const invType = isPurchase ? InvoiceType.PURCHASE_INVOICE : InvoiceType.SALE_INVOICE;

        const totalSettlementApplied = isCreditAdjustment 
          ? amount + adjustedNoteAmount 
          : amount - adjustedNoteAmount;

        if (isPurchase) {
          const inv = await tx.purchaseInvoice.findFirst({
            where: { companyId, voucherNumber: referenceBillNo, invoiceType: invType, isDeleted: false }
          });
          if (inv) {
            const nextJama = Math.max(0, Number(inv.jamaAmount) - totalSettlementApplied);
            const nextOutstanding = Math.max(0, Number(inv.netAmount) - nextJama);
            let nextStatus: PaymentStatus = PaymentStatus.PARTIAL;
            if (nextOutstanding <= 0) nextStatus = PaymentStatus.PAID;
            else if (nextJama === 0) nextStatus = PaymentStatus.UNPAID;

            await tx.purchaseInvoice.update({
              where: { id: inv.id },
              data: { jamaAmount: nextJama, outstandingAmount: nextOutstanding, paymentStatus: nextStatus }
            });
          }
        } else {
          const inv = await tx.saleInvoice.findFirst({
            where: { companyId, voucherNumber: referenceBillNo, invoiceType: invType, isDeleted: false }
          });
          if (inv) {
            const nextJama = Math.max(0, Number(inv.jamaAmount) - totalSettlementApplied);
            const nextOutstanding = Math.max(0, Number(inv.netAmount) - nextJama);
            let nextStatus: PaymentStatus = PaymentStatus.PARTIAL;
            if (nextOutstanding <= 0) nextStatus = PaymentStatus.PAID;
            else if (nextJama === 0) nextStatus = PaymentStatus.UNPAID;

            await tx.saleInvoice.update({
              where: { id: inv.id },
              data: { jamaAmount: nextJama, outstandingAmount: nextOutstanding, paymentStatus: nextStatus }
            });
          }
        }
      }

      // Revert distributed note adjustments
      if (adjustedNoteAmount > 0) {
        const allowedTypes = isPurchase 
          ? (isCreditAdjustment ? [InvoiceType.PURCHASE_DEBIT_NOTE] : [InvoiceType.PURCHASE_RETURN])
          : (isCreditAdjustment ? [InvoiceType.SALE_RETURN] : [InvoiceType.SALE_DEBIT_NOTE]);

        // Query notes in DESCENDING order to reverse FIFO updates
        let activeNotes: any[];
        if (isPurchase) {
          activeNotes = await tx.purchaseInvoice.findMany({
            where: {
              companyId, supplierId: voucher.partyId, isDeleted: false,
              invoiceType: { in: allowedTypes },
              status: { in: [InvoiceStatus.SAVED, InvoiceStatus.APPROVED] }
            },
            orderBy: { invoiceDate: 'desc' }
          });
        } else {
          activeNotes = await tx.saleInvoice.findMany({
            where: {
              companyId, customerId: voucher.partyId, isDeleted: false,
              invoiceType: { in: allowedTypes },
              status: { in: [InvoiceStatus.SAVED, InvoiceStatus.APPROVED] }
            },
            orderBy: { invoiceDate: 'desc' }
          });
        }

        let remainingRevert = adjustedNoteAmount;
        for (const note of activeNotes) {
          if (remainingRevert <= 0) break;
          const noteJama = Number(note.jamaAmount);
          if (noteJama <= 0) continue;

          const revertFromThisNote = Math.min(noteJama, remainingRevert);

          const nextNoteJama = Math.max(0, noteJama - revertFromThisNote);
          const nextNoteOutstanding = Math.max(0, Number(note.netAmount) - nextNoteJama);
          let nextNoteStatus: PaymentStatus = PaymentStatus.PARTIAL;
          if (nextNoteOutstanding <= 0) nextNoteStatus = PaymentStatus.PAID;
          else if (nextNoteJama === 0) nextNoteStatus = PaymentStatus.UNPAID;

          if (isPurchase) {
            await tx.purchaseInvoice.update({
              where: { id: note.id },
              data: { jamaAmount: nextNoteJama, outstandingAmount: nextNoteOutstanding, paymentStatus: nextNoteStatus }
            });
          } else {
            await tx.saleInvoice.update({
              where: { id: note.id },
              data: { jamaAmount: nextNoteJama, outstandingAmount: nextNoteOutstanding, paymentStatus: nextNoteStatus }
            });
          }

          remainingRevert -= revertFromThisNote;
        }
      }

      // Delete GL entries
      await tx.generalLedgerEntry.deleteMany({
        where: {
          companyId,
          sourceVoucherType: vType,
          sourceVoucherId: id
        }
      });

      // Soft delete voucher
      await tx.cashBankVoucher.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date()
        }
      });

      return { success: true };
    });
  }
}
