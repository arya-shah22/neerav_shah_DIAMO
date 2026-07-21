// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Job Book Service (Stage 8 / Phase 7)
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JobType, VoucherStatus, StockStatus } from '@prisma/client';
import { formatVoucherNumber } from '../../utils/voucher-number-formatter';

@Injectable()
export class JobService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  /**
   * List all job vouchers by type
   */
  async list(companyId: number, type: JobType) {
    return this.prisma.jobVoucher.findMany({
      where: { companyId, jobType: type, isDeleted: false },
      orderBy: [
        { voucherDate: 'desc' },
        { id: 'desc' }
      ],
      include: {
        party: { select: { id: true, accountName: true, city: true } },
        items: {
          include: { quality: true }
        }
      }
    });
  }

  /**
   * Fetch unique job voucher details
   */
  async get(id: number, companyId: number) {
    const voucher = await this.prisma.jobVoucher.findFirst({
      where: { id, companyId, isDeleted: false },
      include: {
        party: true,
        items: {
          include: {
            quality: true,
            jobVoucher: { select: { voucherNumber: true } }
          }
        },
        costEntries: {
          include: { stockPacket: true }
        }
      }
    });

    if (!voucher) throw new BadRequestException('Job voucher not found');
    return voucher;
  }

  /**
   * Helper to ensure standard default ledger accounts exist for the company
   */
  private async getOrCreateDefaultAccount(companyId: number, accountName: string, groupName: string, nature: string): Promise<number> {
    const existing = await this.prisma.account.findFirst({
      where: { companyId, accountName, isDeleted: false },
    });
    if (existing) return existing.id;

    let group = await this.prisma.accountGroup.findFirst({
      where: { companyId, groupName, isDeleted: false },
    });
    if (!group) {
      group = await this.prisma.accountGroup.create({
        data: {
          companyId,
          groupName,
          nature,
        }
      });
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

  /**
   * Generates a sequential voucher number for job vouchers
   */
  private async generateVoucherNumber(companyId: number, financialYearId: number, type: JobType): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });

    if (!company || !fy) {
      throw new BadRequestException('Company or Financial Year not found');
    }

    const dbVoucherType = type === JobType.JOB_INCOME ? 'JOB_INCOME' : 'JOB_EXPENSE';

    let config = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, voucherType: dbVoucherType as any },
    });
    if (!config) {
      config = await this.prisma.voucherNumberConfig.create({
        data: {
          companyId,
          financialYearId,
          voucherType: dbVoucherType as any,
          method: 'AUTOMATIC',
          separator: '-',
          digitLength: 6,
          includeYear: true,
          resetAnnually: true,
        },
      });
    }

    let sequence = await this.prisma.voucherNumberSequence.findFirst({
      where: { companyId, financialYearId, voucherType: dbVoucherType as any },
    });
    if (!sequence) {
      sequence = await this.prisma.voucherNumberSequence.create({
        data: {
          companyId,
          financialYearId,
          voucherType: dbVoucherType as any,
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


    const typeCode = type === JobType.JOB_INCOME ? 'JI' : 'JE';

    return formatVoucherNumber(nextNum, config, yearSuffix, typeCode, company.companyCode);
  }

  async previewVoucherNumber(companyId: number, financialYearId: number, type: JobType): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });

    if (!company || !fy) {
      throw new BadRequestException('Company or Financial Year not found');
    }

    const dbVoucherType = type === JobType.JOB_INCOME ? 'JOB_INCOME' : 'JOB_EXPENSE';

    let config = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, voucherType: dbVoucherType as any },
    });
    if (!config) {
      config = await this.prisma.voucherNumberConfig.create({
        data: {
          companyId,
          financialYearId,
          voucherType: dbVoucherType as any,
          method: 'AUTOMATIC',
          separator: '-',
          digitLength: 6,
          includeYear: true,
          resetAnnually: true,
        },
      });
    }

    const sequence = await this.prisma.voucherNumberSequence.findFirst({
      where: { companyId, financialYearId, voucherType: dbVoucherType as any },
    });

    const nextNum = (sequence?.currentNumber || 0) + 1;

    const startYear = fy.fromDate.getFullYear();
    const endYear = fy.toDate.getFullYear();
    const yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;

    const typeCode = type === JobType.JOB_INCOME ? 'JI' : 'JE';

    return formatVoucherNumber(nextNum, config, yearSuffix, typeCode, company.companyCode);
  }

  /**
   * Creates a job voucher (Income/Expense), logs cost capitalization, and posts double-entry GL ledgers
   */
  async create(companyId: number, data: Record<string, any>) {
    const financialYearId = Number(data.financialYearId);
    const jobType = data.jobType as JobType;
    const partyId = Number(data.partyId);
    const voucherDate = new Date(data.voucherDate);
    const billNumberInput = data.billNumber?.trim();

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const party = await this.prisma.account.findUnique({ where: { id: partyId } });
    if (!company || !party) throw new BadRequestException('Company or Party not found');

    const isManual = data.isManualBillNumber === true;
    const voucherNumber = isManual && data.billNumber
      ? String(data.billNumber)
      : await this.generateVoucherNumber(companyId, financialYearId, jobType);
    const billNumber = billNumberInput || voucherNumber;

    // Accounts for double entry GL postings
    const baseLedgerId =
      jobType === JobType.JOB_INCOME
        ? await this.getOrCreateDefaultAccount(companyId, 'Job Processing Income', 'Direct Incomes', 'INCOME')
        : await this.getOrCreateDefaultAccount(companyId, 'Job Processing Expense', 'Direct Expenses', 'EXPENSE');

    return this.prisma.$transaction(async (tx) => {
      const itemsList = Array.isArray(data.items) ? data.items : [];
      let totalCarats = 0;
      let totalAmount = 0;

      const parsedItems: any[] = [];

      for (let i = 0; i < itemsList.length; i++) {
        const item = itemsList[i];
        const qualityId = Number(item.qualityId);
        const carats = Number(item.carats) || 0;
        const pieces = Number(item.pieces) || 1;
        const rate = Number(item.rate) || 0;
        const amount = carats * rate;

        totalCarats += carats;
        totalAmount += amount;

        parsedItems.push({
          rowNumber: i + 1,
          qualityId,
          carats,
          pieces,
          rate,
          amount,
          stockPacketId: item.stockPacketId ? Number(item.stockPacketId) : null,
          remarks: item.remarks || null,
        });
      }

      // Create Voucher
      const voucher = await tx.jobVoucher.create({
        data: {
          companyId,
          financialYearId,
          jobType,
          voucherNumber,
          billNumber,
          voucherDate,
          status: VoucherStatus.POSTED,
          partyId,
          totalCarats,
          totalAmount,
          narration: data.narration || null,
          items: {
            create: parsedItems.map(it => ({
              rowNumber: it.rowNumber,
              qualityId: it.qualityId,
              carats: it.carats,
              pieces: it.pieces,
              rate: it.rate,
              amount: it.amount,
              stockPacketId: it.stockPacketId,
              remarks: it.remarks,
            }))
          }
        },
        include: { items: true }
      });

      // Capitalize processing cost and create cost entries
      for (const item of voucher.items) {
        if (item.stockPacketId) {
          const packet = await tx.stockPacket.findUnique({ where: { id: item.stockPacketId } });
          if (packet) {
            // Create cost entry
            await tx.jobCostEntry.create({
              data: {
                jobVoucherId: voucher.id,
                stockPacketId: item.stockPacketId,
                costType: jobType === JobType.JOB_INCOME ? 'OUTWARD_JOB' : 'LABOUR_CHARGES',
                amount: item.amount,
                remarks: `Capitalized on Job ${voucherNumber}`,
              }
            });

            // Adjust Packet Cost Basis
            const currentTotalCost = Number(packet.totalCost) || 0;
            const itemAmount = Number(item.amount) || 0;
            const newTotalCost = jobType === JobType.JOB_EXPENSE 
              ? currentTotalCost + itemAmount 
              : currentTotalCost; // Outward processing does not capitalize onto raw inventory cost basis

            const newCaratRate = Number(packet.caratWeight) > 0 
              ? newTotalCost / Number(packet.caratWeight) 
              : Number(packet.costPerCarat);

            await tx.stockPacket.update({
              where: { id: packet.id },
              data: {
                totalCost: newTotalCost,
                costPerCarat: newCaratRate,
              }
            });

            // Revert packet status back to AVAILABLE if it was on JOB_WORK
            if (packet.currentStatus === StockStatus.JOB_WORK) {
              await tx.stockPacket.update({
                where: { id: packet.id },
                data: { currentStatus: StockStatus.AVAILABLE }
              });

              await tx.stockMovement.create({
                data: {
                  stockPacketId: packet.id,
                  movementDate: new Date(),
                  movementType: 'CORRECTION',
                  previousStatus: StockStatus.JOB_WORK,
                  newStatus: StockStatus.AVAILABLE,
                  carats: Number(packet.caratWeight),
                  pieces: packet.pieceCount,
                  remarks: `Finished and received on Job ${voucherNumber}`,
                }
              });
            }
          }
        }
      }

      // Ledger Postings (Double-Entry GL Posting)
      const debitCreditBase = jobType === JobType.JOB_INCOME ? 'CREDIT' : 'DEBIT';
      const debitCreditParty = jobType === JobType.JOB_INCOME ? 'DEBIT' : 'CREDIT';

      // 1. Post Base Cost
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: baseLedgerId,
          voucherDate,
          debitCreditType: debitCreditBase,
          amount: totalAmount,
          sourceVoucherType: jobType as any,
          sourceVoucherId: voucher.id,
          sourceBillNumber: billNumber,
          narration: `Job processing cost for ${voucherNumber}`,
        }
      });

      // 2. Post Party Outstanding Account
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: partyId,
          voucherDate,
          debitCreditType: debitCreditParty,
          amount: totalAmount,
          sourceVoucherType: jobType as any,
          sourceVoucherId: voucher.id,
          sourceBillNumber: billNumber,
          narration: `Job processing invoice reference: ${billNumber}`,
        }
      });

      return voucher;
    });
  }

  /**
   * Delete a job voucher (removes GL postings, reverts cost capitalization values)
   */
  async delete(id: number, companyId: number) {
    const voucher = await this.prisma.jobVoucher.findFirst({
      where: { id, companyId, isDeleted: false },
      include: { items: true, costEntries: true }
    });

    if (!voucher) throw new BadRequestException('Job voucher not found');

    return this.prisma.$transaction(async (tx) => {
      // 1. Revert Stock Packet Cost values
      for (const entry of voucher.costEntries) {
        const packet = await tx.stockPacket.findUnique({ where: { id: entry.stockPacketId } });
        if (packet) {
          const currentTotalCost = Number(packet.totalCost) || 0;
          const entryAmount = Number(entry.amount) || 0;
          const newTotalCost = voucher.jobType === JobType.JOB_EXPENSE 
            ? Math.max(0, currentTotalCost - entryAmount) 
            : currentTotalCost;

          const newCaratRate = Number(packet.caratWeight) > 0 
            ? newTotalCost / Number(packet.caratWeight) 
            : Number(packet.costPerCarat);

          await tx.stockPacket.update({
            where: { id: packet.id },
            data: {
              totalCost: newTotalCost,
              costPerCarat: newCaratRate,
            }
          });
        }
      }

      // 2. Delete Job Cost Entries
      await tx.jobCostEntry.deleteMany({ where: { jobVoucherId: id } });

      // 3. Delete General Ledger Entries
      await tx.generalLedgerEntry.deleteMany({
        where: {
          companyId,
          sourceVoucherType: voucher.jobType as any,
          sourceVoucherId: id
        }
      });

      // 4. Mark Voucher as deleted
      await tx.jobVoucher.update({
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
