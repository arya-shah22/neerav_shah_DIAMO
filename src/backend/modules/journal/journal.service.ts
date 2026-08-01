// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Journal Voucher Service (Stage 7 / Phase 8)
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JournalType, VoucherStatus, DebitCreditType, VoucherType, PaymentStatus } from '@prisma/client';
import { formatVoucherNumber } from '../../utils/voucher-number-formatter';

@Injectable()
export class JournalService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  /**
   * List all journal vouchers (Bug #12 fix: removed take:20 limit)
   */
  async list(companyId: number) {
    return this.prisma.journalVoucher.findMany({
      where: { companyId, isDeleted: false },
      orderBy: { voucherDate: 'desc' },
      include: {
        lines: {
          include: { account: true }
        }
      }
    });
  }

  /**
   * Helper to generate voucher numbers for JV
   */
  private async generateVoucherNumber(companyId: number, financialYearId: number, date: Date = new Date()): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });

    if (!company || !fy) {
      throw new BadRequestException('Company or Financial Year not found');
    }

    let config = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, voucherType: VoucherType.JOURNAL_VOUCHER },
    });
    if (!config) {
      config = await this.prisma.voucherNumberConfig.create({
        data: {
          companyId,
          financialYearId,
          voucherType: VoucherType.JOURNAL_VOUCHER,
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
          voucherType: VoucherType.JOURNAL_VOUCHER,
        },
      },
      create: {
        companyId,
        financialYearId,
        voucherType: VoucherType.JOURNAL_VOUCHER,
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
    return formatVoucherNumber(sequence.currentNumber, config, yearSuffix, 'JV', company.companyCode, date);
  }

  async previewVoucherNumber(companyId: number, financialYearId: number, date: Date = new Date()): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });

    if (!company || !fy) {
      throw new BadRequestException('Company or Financial Year not found');
    }

    let config = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, voucherType: VoucherType.JOURNAL_VOUCHER },
    });
    if (!config) {
      config = await this.prisma.voucherNumberConfig.create({
        data: {
          companyId,
          financialYearId,
          voucherType: VoucherType.JOURNAL_VOUCHER,
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
      where: { companyId, financialYearId, voucherType: VoucherType.JOURNAL_VOUCHER },
    });

    const nextNum = (sequence?.currentNumber || 0) + 1;

    const startYear = fy.fromDate.getFullYear();
    const endYear = fy.toDate.getFullYear();
    const yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
    return formatVoucherNumber(nextNum, config, yearSuffix, 'JV', company.companyCode, date);
  }

  /**
   * Get pending unpaid/partially-paid bills for a specific party account
   */
  async getPendingBillsByAccount(companyId: number, accountId: number) {
    if (!companyId || !accountId) return [];

    // 1. Try OutstandingBill table
    const bills = await this.prisma.outstandingBill.findMany({
      where: {
        companyId,
        accountId,
        status: { in: [PaymentStatus.UNPAID, PaymentStatus.PARTIAL] },
        outstandingAmount: { gt: 0 }
      },
      orderBy: { billDate: 'asc' }
    });

    if (bills.length > 0) {
      return bills;
    }

    // 2. Direct Fallback — Sale Invoices for Customer
    const sales = await this.prisma.saleInvoice.findMany({
      where: {
        companyId,
        customerId: accountId,
        isDeleted: false,
        status: { not: 'DRAFT' },
        outstandingAmount: { gt: 0 }
      },
      orderBy: { invoiceDate: 'asc' }
    });

    if (sales.length > 0) {
      return sales.map(s => ({
        id: s.id,
        billNumber: s.voucherNumber,
        billDate: s.invoiceDate,
        outstandingAmount: s.outstandingAmount,
        originalAmount: s.netAmount,
        billType: 'DEBIT',
        sourceVoucherType: VoucherType.SALE_INVOICE,
        sourceVoucherId: s.id,
      }));
    }

    // 3. Direct Fallback — Purchase Invoices for Supplier
    const purchases = await this.prisma.purchaseInvoice.findMany({
      where: {
        companyId,
        supplierId: accountId,
        isDeleted: false,
        status: { not: 'DRAFT' },
        outstandingAmount: { gt: 0 }
      },
      orderBy: { invoiceDate: 'asc' }
    });

    return purchases.map(p => ({
      id: p.id,
      billNumber: p.voucherNumber,
      billDate: p.invoiceDate,
      outstandingAmount: p.outstandingAmount,
      originalAmount: p.netAmount,
      billType: 'CREDIT',
      sourceVoucherType: VoucherType.PURCHASE_INVOICE,
      sourceVoucherId: p.id,
    }));
  }

  /**
   * Create a Journal Voucher entry and post balanced entries to GL & bill allocations
   */
  async create(companyId: number, data: Record<string, any>) {
    const financialYearId = Number(data.financialYearId);
    const voucherDate = new Date(data.voucherDate);
    const drAccountId = Number(data.drAccountId);
    const crAccountId = Number(data.crAccountId);
    const amount = Number(data.amount) || 0;
    const outstandingBillId = data.outstandingBillId ? Number(data.outstandingBillId) : null;

    if (!drAccountId || !crAccountId) {
      throw new BadRequestException('Debit and Credit accounts must be selected');
    }
    if (amount <= 0) {
      throw new BadRequestException('Voucher amount must be greater than zero');
    }

    // Serialize tax adjustments and remarks into narration
    const narrationJson = JSON.stringify({
      remark1: data.remark1 || '',
      remark2: data.remark2 || '',
      remark3: data.remark3 || '',
      sgst: Number(data.sgst) || 0,
      cgst: Number(data.cgst) || 0,
      igst: Number(data.igst) || 0,
      tds: Number(data.tds) || 0,
      outstandingBillId
    });

    const isManual = data.isManualBillNumber === true;
    const voucherNumber = isManual && data.billNumber
      ? String(data.billNumber)
      : await this.generateVoucherNumber(companyId, financialYearId, voucherDate);

    return this.prisma.$transaction(async (tx) => {
      let realOutstandingBillId: number | null = null;
      if (outstandingBillId) {
        const billExists = await tx.outstandingBill.findUnique({
          where: { id: outstandingBillId }
        });
        if (billExists) {
          realOutstandingBillId = outstandingBillId;
        }
      }

      // Create Voucher Header & Lines
      const voucher = await tx.journalVoucher.create({
        data: {
          companyId,
          financialYearId,
          journalType: JournalType.GENERAL,
          voucherNumber,
          voucherDate,
          status: VoucherStatus.POSTED,
          totalDebit: amount,
          totalCredit: amount,
          narration: narrationJson,
          lines: {
            create: [
              {
                rowNumber: 1,
                accountId: drAccountId,
                debitCreditType: DebitCreditType.DEBIT,
                amount,
                narration: 'JV Debit Entry',
              },
              {
                rowNumber: 2,
                accountId: crAccountId,
                debitCreditType: DebitCreditType.CREDIT,
                amount,
                narration: 'JV Credit Entry',
                outstandingBillId: realOutstandingBillId || undefined,
              }
            ]
          }
        },
        include: { lines: true }
      });

      // Post General Ledger Entries (Double-Entry Posting)
      // 1. Debit Account Posting
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: drAccountId,
          voucherDate,
          debitCreditType: 'DEBIT',
          amount,
          sourceVoucherType: 'JOURNAL_VOUCHER',
          sourceVoucherId: voucher.id,
          sourceBillNumber: voucherNumber,
          narration: `JV Debit posting ${voucherNumber}`,
        }
      });

      // 2. Credit Account Posting
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: crAccountId,
          voucherDate,
          debitCreditType: 'CREDIT',
          amount,
          sourceVoucherType: 'JOURNAL_VOUCHER',
          sourceVoucherId: voucher.id,
          sourceBillNumber: voucherNumber,
          narration: `JV Credit posting ${voucherNumber}`,
        }
      });

      // 3. Bill Settlement / Kasar Discount Allocation logic
      if (outstandingBillId) {
        const bill = await tx.outstandingBill.findUnique({
          where: { id: outstandingBillId }
        });

        if (bill) {
          const currentOutstanding = Number(bill.outstandingAmount);
          const currentAllocated = Number(bill.allocatedAmount);
          const settleAmt = Math.min(amount, currentOutstanding);
          const nextOutstanding = Math.max(0, currentOutstanding - settleAmt);
          const nextAllocated = currentAllocated + settleAmt;
          const newStatus = nextOutstanding <= 0 ? 'PAID' : 'PARTIAL';

          // Update OutstandingBill table
          await tx.outstandingBill.update({
            where: { id: outstandingBillId },
            data: {
              allocatedAmount: nextAllocated,
              outstandingAmount: nextOutstanding,
              status: newStatus as any
            }
          });

          // Sync underlying Sale or Purchase Invoice table
          if (bill.sourceVoucherType === VoucherType.SALE_INVOICE) {
            await tx.saleInvoice.update({
              where: { id: bill.sourceVoucherId },
              data: {
                outstandingAmount: nextOutstanding,
                paymentStatus: newStatus as any
              }
            });
          } else if (bill.sourceVoucherType === VoucherType.PURCHASE_INVOICE) {
            await tx.purchaseInvoice.update({
              where: { id: bill.sourceVoucherId },
              data: {
                outstandingAmount: nextOutstanding,
                paymentStatus: newStatus as any
              }
            });
          }
        } else {
          // Direct Invoice Fallback Update
          const saleInv = await tx.saleInvoice.findUnique({ where: { id: outstandingBillId } });
          if (saleInv) {
            const currentOutstanding = Number(saleInv.outstandingAmount);
            const settleAmt = Math.min(amount, currentOutstanding);
            const nextOutstanding = Math.max(0, currentOutstanding - settleAmt);
            const newStatus = nextOutstanding <= 0 ? 'PAID' : 'PARTIAL';

            await tx.saleInvoice.update({
              where: { id: outstandingBillId },
              data: {
                outstandingAmount: nextOutstanding,
                paymentStatus: newStatus as any
              }
            });
          } else {
            const purInv = await tx.purchaseInvoice.findUnique({ where: { id: outstandingBillId } });
            if (purInv) {
              const currentOutstanding = Number(purInv.outstandingAmount);
              const settleAmt = Math.min(amount, currentOutstanding);
              const nextOutstanding = Math.max(0, currentOutstanding - settleAmt);
              const newStatus = nextOutstanding <= 0 ? 'PAID' : 'PARTIAL';

              await tx.purchaseInvoice.update({
                where: { id: outstandingBillId },
                data: {
                  outstandingAmount: nextOutstanding,
                  paymentStatus: newStatus as any
                }
              });
            }
          }
        }
      }

      return voucher;
    });
  }

  /**
   * Delete a Journal Voucher and reverse GL & Bill allocations
   */
  async delete(id: number, companyId: number) {
    const voucher = await this.prisma.journalVoucher.findFirst({
      where: { id, companyId, isDeleted: false },
      include: { lines: true }
    });
    if (!voucher) throw new BadRequestException('Journal Voucher not found');

    return this.prisma.$transaction(async (tx) => {
      // 1. Reverse Bill Allocation if present
      for (const line of voucher.lines) {
        if (line.outstandingBillId) {
          const bill = await tx.outstandingBill.findUnique({
            where: { id: line.outstandingBillId }
          });

          if (bill) {
            const lineAmt = Number(line.amount);
            const currentAllocated = Number(bill.allocatedAmount);
            const currentOutstanding = Number(bill.outstandingAmount);
            const nextAllocated = Math.max(0, currentAllocated - lineAmt);
            const nextOutstanding = Math.min(Number(bill.originalAmount), currentOutstanding + lineAmt);
            const newStatus = nextOutstanding >= Number(bill.originalAmount) ? 'UNPAID' : 'PARTIAL';

            await tx.outstandingBill.update({
              where: { id: line.outstandingBillId },
              data: {
                allocatedAmount: nextAllocated,
                outstandingAmount: nextOutstanding,
                status: newStatus as any
              }
            });

            if (bill.sourceVoucherType === VoucherType.SALE_INVOICE) {
              await tx.saleInvoice.update({
                where: { id: bill.sourceVoucherId },
                data: {
                  outstandingAmount: nextOutstanding,
                  status: newStatus as any
                }
              });
            } else if (bill.sourceVoucherType === VoucherType.PURCHASE_INVOICE) {
              await tx.purchaseInvoice.update({
                where: { id: bill.sourceVoucherId },
                data: {
                  outstandingAmount: nextOutstanding,
                  status: newStatus as any
                }
              });
            }
          }
        }
      }

      // 2. Delete GL entries
      await tx.generalLedgerEntry.deleteMany({
        where: {
          companyId,
          sourceVoucherType: 'JOURNAL_VOUCHER',
          sourceVoucherId: id
        }
      });

      // 3. Soft delete voucher
      await tx.journalVoucher.update({
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
