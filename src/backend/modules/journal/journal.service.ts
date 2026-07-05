// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Journal Voucher Service (Stage 7 / Phase 8)
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JournalType, VoucherStatus, DebitCreditType, VoucherType } from '@prisma/client';

@Injectable()
export class JournalService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  /**
   * List recent journal vouchers
   */
  async list(companyId: number) {
    return this.prisma.journalVoucher.findMany({
      where: { companyId, isDeleted: false },
      orderBy: { voucherDate: 'desc' },
      take: 20, // Keep it focused on recent entries
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
  private async generateVoucherNumber(companyId: number, financialYearId: number): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });

    if (!company || !fy) {
      throw new BadRequestException('Company or Financial Year not found');
    }

    let config = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, financialYearId, voucherType: VoucherType.JOURNAL_VOUCHER },
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
          resetAnnually: true,
        },
      });
    }

    let sequence = await this.prisma.voucherNumberSequence.findFirst({
      where: { companyId, financialYearId, voucherType: VoucherType.JOURNAL_VOUCHER },
    });
    if (!sequence) {
      sequence = await this.prisma.voucherNumberSequence.create({
        data: {
          companyId,
          financialYearId,
          voucherType: VoucherType.JOURNAL_VOUCHER,
          currentNumber: 0,
          lastGeneratedAt: new Date(),
        },
      });
    }

    const nextNum = sequence.currentNumber + 1;
    await this.prisma.voucherNumberSequence.update({
      where: { id: sequence.id },
      data: {
        currentNumber: nextNum,
        lastGeneratedAt: new Date(),
      },
    });

    const startYear = fy.fromDate.getFullYear();
    const endYear = fy.toDate.getFullYear();
    const yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
    const seqStr = String(nextNum).padStart(config.digitLength, '0');

    return `${company.companyCode}-${yearSuffix}-JV-${seqStr}`;
  }

  /**
   * Create a Journal Voucher entry and post balanced entries to GL
   */
  async create(companyId: number, data: Record<string, any>) {
    const financialYearId = Number(data.financialYearId);
    const voucherDate = new Date(data.voucherDate);
    const drAccountId = Number(data.drAccountId);
    const crAccountId = Number(data.crAccountId);
    const amount = Number(data.amount) || 0;

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
    });

    const voucherNumber = await this.generateVoucherNumber(companyId, financialYearId);

    return this.prisma.$transaction(async (tx) => {
      // Create Voucher Header
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

      return voucher;
    });
  }

  /**
   * Delete a Journal Voucher and reverse GL postings
   */
  async delete(id: number, companyId: number) {
    const voucher = await this.prisma.journalVoucher.findFirst({
      where: { id, companyId, isDeleted: false }
    });
    if (!voucher) throw new BadRequestException('Journal Voucher not found');

    return this.prisma.$transaction(async (tx) => {
      // Delete GL entries
      await tx.generalLedgerEntry.deleteMany({
        where: {
          companyId,
          sourceVoucherType: 'JOURNAL_VOUCHER',
          sourceVoucherId: id
        }
      });

      // Soft delete voucher
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
