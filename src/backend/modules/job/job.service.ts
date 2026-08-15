// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Job Book Service (Stage 8 / Phase 7)
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { JobType, VoucherStatus, StockStatus } from '@prisma/client';
import { formatVoucherNumber, nextVoucherSequenceNumber } from '../../utils/voucher-number-formatter';
import { getOrCreateDefaultAccount } from '../../utils/default-account-helper';

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
        subcontractorParty: { select: { id: true, accountName: true, city: true } },
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
        subcontractorParty: true,
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
   * Generates a sequential voucher number for job vouchers
   */
  private async generateVoucherNumber(companyId: number, financialYearId: number, type: JobType, date: Date = new Date()): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });

    if (!company || !fy) {
      throw new BadRequestException('Company or Financial Year not found');
    }

    const dbVoucherType = type === JobType.JOB_INCOME ? 'JOB_INCOME' : 'JOB_EXPENSE';

    const config = await this.prisma.voucherNumberConfig.upsert({
      where: {
        companyId_financialYearId_voucherType: {
          companyId,
          financialYearId,
          voucherType: dbVoucherType as any,
        },
      },
      update: {},
      create: {
        companyId,
        financialYearId,
        voucherType: dbVoucherType as any,
        method: 'AUTOMATIC',
        prefix: dbVoucherType === 'JOB_INCOME' ? 'JW' : 'JWE',
        separator: '-',
        digitLength: 6,
        includeYear: true,
        includeMonth: false,
        resetAnnually: true,
      },
    });

    if (!config) {
      throw new BadRequestException('Voucher configuration not found');
    }

    const nextNum = await nextVoucherSequenceNumber(this.prisma, companyId, financialYearId, dbVoucherType as any);

    const startYear = fy.fromDate.getFullYear();
    const endYear = fy.toDate.getFullYear();
    const yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
    const typeCode = 'JW';

    return formatVoucherNumber(nextNum, config, yearSuffix, typeCode, company.companyCode, date);
  }

  async previewVoucherNumber(companyId: number, financialYearId?: number, type: JobType = JobType.JOB_INCOME, date: Date = new Date()): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    let fy = financialYearId
      ? await this.prisma.financialYear.findUnique({ where: { id: financialYearId } })
      : await this.prisma.financialYear.findFirst({ where: { companyId, isActive: true } });

    if (!fy) {
      fy = await this.prisma.financialYear.findFirst({ where: { companyId }, orderBy: { fromDate: 'desc' } });
    }

    if (!company || !fy) {
      throw new BadRequestException('Company or Financial Year not found');
    }

    const dbVoucherType = type === JobType.JOB_INCOME ? 'JOB_INCOME' : 'JOB_EXPENSE';

    const config = await this.prisma.voucherNumberConfig.upsert({
      where: {
        companyId_financialYearId_voucherType: {
          companyId,
          financialYearId: fy.id,
          voucherType: dbVoucherType as any,
        },
      },
      update: {},
      create: {
        companyId,
        financialYearId: fy.id,
        voucherType: dbVoucherType as any,
        method: 'AUTOMATIC',
        prefix: dbVoucherType === 'JOB_INCOME' ? 'JW' : 'JWE',
        separator: '-',
        digitLength: 6,
        includeYear: true,
        includeMonth: false,
        resetAnnually: true,
      },
    });

    if (!config) {
      throw new BadRequestException('Voucher configuration not found');
    }

    const sequence = await this.prisma.voucherNumberSequence.findFirst({
      where: { companyId, financialYearId, voucherType: dbVoucherType as any },
    });

    const nextNum = (sequence?.currentNumber || 0) + 1;

    const startYear = fy.fromDate.getFullYear();
    const endYear = fy.toDate.getFullYear();
    const yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;

    const typeCode = 'JW';

    return formatVoucherNumber(nextNum, config, yearSuffix, typeCode, company.companyCode, date);
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
      : await this.generateVoucherNumber(companyId, financialYearId, jobType, voucherDate);
    const billNumber = billNumberInput || voucherNumber;

    // Accounts for double entry GL postings
    const baseLedgerId =
      jobType === JobType.JOB_INCOME
        ? await getOrCreateDefaultAccount(this.prisma, companyId, 'Job Processing Income', 'Direct Incomes', 'INCOME')
        : await getOrCreateDefaultAccount(this.prisma, companyId, 'Job Processing Expense', 'Direct Expenses', 'EXPENSE');

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

  /**
   * Create Stage 1 Unified Job Work Ticket (Inward Rough Received & Issued to Subcontractor)
   */
  async createUnifiedJobWork(companyId: number, data: Record<string, any>) {
    const financialYearId = Number(data.financialYearId || 1);
    const partyId = Number(data.partyId || data.customerId);
    const subcontractorPartyId = Number(data.subcontractorPartyId || data.subcontractorId);
    const voucherDate = data.voucherDate ? new Date(data.voucherDate) : new Date();
    const serviceType = data.serviceType || 'DIAMOND_CONVERSION';

    const inwardRoughCarats = Number(data.inwardRoughCarats) || 0;
    const inwardPieceCount = Number(data.inwardPieceCount) || 1;
    const clientBilledRate = Number(data.clientBilledRate) || 0;
    const contractorExpenseRate = Number(data.contractorExpenseRate) || 0;
    const gstRate = Number(data.gstRate) || 0;

    const transactionCurrency = (data.transactionCurrency || 'INR') as 'INR' | 'USD';
    const exchangeRate = Number(data.exchangeRate) || 1.0;

    const clientBilledTotal = inwardRoughCarats * clientBilledRate;
    const contractorExpenseTotal = inwardRoughCarats * contractorExpenseRate;
    const totalAmountAlt = transactionCurrency === 'USD' ? clientBilledTotal * exchangeRate : clientBilledTotal / (exchangeRate || 1);

    const voucherNumber = await this.generateVoucherNumber(companyId, financialYearId, JobType.JOB_INCOME, voucherDate);

    return this.prisma.jobVoucher.create({
      data: {
        companyId,
        financialYearId,
        jobType: JobType.JOB_INCOME,
        voucherNumber,
        billNumber: voucherNumber,
        voucherDate,
        status: VoucherStatus.DRAFT,
        partyId,
        subcontractorPartyId,
        serviceType,
        inwardRoughCarats,
        inwardPieceCount,
        clientBilledRate,
        contractorExpenseRate,
        contractorExpenseTotal,
        gstRate,
        transactionCurrency: transactionCurrency as any,
        exchangeRate,
        totalAmountAlt,
        totalCarats: inwardRoughCarats,
        totalAmount: clientBilledTotal,
        narration: data.narration || `Jobwork Issue: ${serviceType}`,
      },
    });
  }

  /**
   * Update Stage 1 Unified Job Work Ticket
   */
  async updateUnifiedJobWork(companyId: number, voucherId: number, data: Record<string, any>) {
    const voucher = await this.prisma.jobVoucher.findFirst({
      where: { id: voucherId, companyId, isDeleted: false },
    });
    if (!voucher) throw new BadRequestException('Jobwork ticket not found');

    if (voucher.status === VoucherStatus.POSTED) {
      throw new BadRequestException('Cannot edit a completed/posted jobwork ticket. Cancel it first to reverse postings.');
    }

    const partyId = Number(data.partyId || data.customerId || voucher.partyId);
    const subcontractorPartyId = Number(data.subcontractorPartyId || data.subcontractorId || voucher.subcontractorPartyId);
    const inwardRoughCarats = Number(data.inwardRoughCarats || voucher.inwardRoughCarats);
    const inwardPieceCount = Number(data.inwardPieceCount || voucher.inwardPieceCount);
    const clientBilledRate = Number(data.clientBilledRate || voucher.clientBilledRate);
    const contractorExpenseRate = Number(data.contractorExpenseRate || voucher.contractorExpenseRate);
    const gstRate = Number(data.gstRate ?? voucher.gstRate);

    const transactionCurrency = (data.transactionCurrency || voucher.transactionCurrency || 'INR') as 'INR' | 'USD';
    const exchangeRate = Number(data.exchangeRate || voucher.exchangeRate) || 1.0;

    const clientBilledTotal = inwardRoughCarats * clientBilledRate;
    const contractorExpenseTotal = inwardRoughCarats * contractorExpenseRate;
    const totalAmountAlt = transactionCurrency === 'USD' ? clientBilledTotal * exchangeRate : clientBilledTotal / (exchangeRate || 1);

    return this.prisma.jobVoucher.update({
      where: { id: voucherId },
      data: {
        partyId,
        subcontractorPartyId,
        serviceType: data.serviceType || voucher.serviceType,
        inwardRoughCarats,
        inwardPieceCount,
        clientBilledRate,
        contractorExpenseRate,
        contractorExpenseTotal,
        gstRate,
        transactionCurrency: transactionCurrency as any,
        exchangeRate,
        totalAmountAlt,
        totalCarats: inwardRoughCarats,
        totalAmount: clientBilledTotal,
        narration: data.narration || voucher.narration,
      },
    });
  }

  /**
   * Stage 2 Complete & Bill Converted Stock (Posts 4-Way General Ledger Entries, GST & Outstanding Bills)
   */
  async receiveAndBillJobWork(companyId: number, voucherId: number, data: Record<string, any>) {
    const voucher = await this.prisma.jobVoucher.findFirst({
      where: { id: voucherId, companyId, isDeleted: false },
      include: { party: true, subcontractorParty: true },
    });
    if (!voucher) throw new BadRequestException('Jobwork ticket not found');

    // A completed ticket has already posted its GL entries and outstanding bills.
    // Re-billing it would double the revenue, receivable and subcontractor payable.
    if (voucher.status === VoucherStatus.POSTED) {
      throw new BadRequestException('This jobwork ticket is already completed and billed. Cancel it to reverse the postings before re-billing.');
    }

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new BadRequestException('Company not found');

    const outwardPolishedCarats = Number(data.outwardPolishedCarats) || 0;
    const outwardPieceCount = Number(data.outwardPieceCount) || 1;
    const isPartial = data.isPartial === true;

    const cumulativeOutwardCarats = Number(voucher.totalOutwardCarats || 0) + outwardPolishedCarats;
    const cumulativeOutwardPieces = Number(voucher.totalOutwardPieces || 0) + outwardPieceCount;
    const isFullyCompleted = !isPartial || cumulativeOutwardCarats >= Number(voucher.inwardRoughCarats);

    const clientTotal = Number(voucher.totalAmount) || Number(voucher.inwardRoughCarats) * Number(voucher.clientBilledRate);
    const contractorTotal = Number(voucher.contractorExpenseTotal) || Number(voucher.inwardRoughCarats) * Number(voucher.contractorExpenseRate);

    // Multi-currency calculation
    const currency = voucher.transactionCurrency || 'INR';
    const exRate = Number(voucher.exchangeRate) || 1.0;

    // GST Calculation
    const gstPct = Number(voucher.gstRate || data.gstRate || 0);
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const partyState = voucher.party?.stateCode || '01';
    const isSameState = company.stateCode === partyState;

    if (gstPct > 0) {
      if (isSameState) {
        cgst = (clientTotal * (gstPct / 2)) / 100;
        sgst = (clientTotal * (gstPct / 2)) / 100;
      } else {
        igst = (clientTotal * gstPct) / 100;
      }
    }
    const netClientTotal = clientTotal + cgst + sgst + igst;

    // Ledger account lookup
    const incomeLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'Job Processing Income', 'Job Work Income', 'INCOME');
    const expenseLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'Job Processing Expense', 'Job Work Expense', 'EXPENSE');
    const cgstLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'CGST Input/Output', 'Duties & Taxes', 'LIABILITY');
    const sgstLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'SGST Input/Output', 'Duties & Taxes', 'LIABILITY');
    const igstLedgerId = await getOrCreateDefaultAccount(this.prisma, companyId, 'IGST Input/Output', 'Duties & Taxes', 'LIABILITY');

    return this.prisma.$transaction(async (tx) => {
      // 1. Update Voucher
      const updated = await tx.jobVoucher.update({
        where: { id: voucherId },
        data: {
          outwardPolishedCarats,
          outwardPieceCount,
          totalOutwardCarats: cumulativeOutwardCarats,
          totalOutwardPieces: cumulativeOutwardPieces,
          isFullyCompleted,
          status: isFullyCompleted ? VoucherStatus.POSTED : VoucherStatus.DRAFT,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          netAmount: netClientTotal,
        },
      });

      // Bill exactly once, when the ticket becomes fully completed. Earlier partial
      // receipts only record the accumulated outward quantities above; posting the
      // GL entries and outstanding bills on every partial receipt double-counts the
      // revenue, receivable and subcontractor payable (all under one billNumber).
      if (!isFullyCompleted) {
        return updated;
      }

      // 2. Post 4-Way Double-Entry General Ledger Entries (GL is ALWAYS in base company currency INR)
      const isUsd = currency === 'USD';
      const mult = isUsd ? exRate : 1.0;

      const glNetClientTotal = Math.round(netClientTotal * mult * 100) / 100;
      const glClientTotal = Math.round(clientTotal * mult * 100) / 100;
      const glCgst = Math.round(cgst * mult * 100) / 100;
      const glSgst = Math.round(sgst * mult * 100) / 100;
      const glIgst = Math.round(igst * mult * 100) / 100;
      const glContractorTotal = Math.round(contractorTotal * mult * 100) / 100;

      // A. Customer Account (Party): Debit Customer Receivable (Net Total including Tax)
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: voucher.partyId,
          voucherDate: voucher.voucherDate,
          debitCreditType: 'DEBIT',
          amount: glNetClientTotal,
          originalCurrency: currency,
          originalAmount: netClientTotal,
          exchangeRate: exRate,
          sourceVoucherType: 'JOB_INCOME' as any,
          sourceVoucherId: voucher.id,
          sourceBillNumber: voucher.billNumber,
          narration: `Jobwork Customer Invoice ${voucher.billNumber}`,
        },
      });

      // B. Job Work Income Account: Credit Operating Revenue
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: incomeLedgerId,
          voucherDate: voucher.voucherDate,
          debitCreditType: 'CREDIT',
          amount: glClientTotal,
          originalCurrency: currency,
          originalAmount: clientTotal,
          exchangeRate: exRate,
          sourceVoucherType: 'JOB_INCOME' as any,
          sourceVoucherId: voucher.id,
          sourceBillNumber: voucher.billNumber,
          narration: `Jobwork Revenue Billed for ${voucher.billNumber}`,
        },
      });

      // GST Entries
      if (cgst > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: cgstLedgerId,
            voucherDate: voucher.voucherDate,
            debitCreditType: 'CREDIT',
            amount: glCgst,
            originalCurrency: currency,
            originalAmount: cgst,
            exchangeRate: exRate,
            sourceVoucherType: 'JOB_INCOME' as any,
            sourceVoucherId: voucher.id,
            sourceBillNumber: voucher.billNumber,
            narration: `CGST Output for ${voucher.billNumber}`,
          },
        });
      }
      if (sgst > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: sgstLedgerId,
            voucherDate: voucher.voucherDate,
            debitCreditType: 'CREDIT',
            amount: glSgst,
            originalCurrency: currency,
            originalAmount: sgst,
            exchangeRate: exRate,
            sourceVoucherType: 'JOB_INCOME' as any,
            sourceVoucherId: voucher.id,
            sourceBillNumber: voucher.billNumber,
            narration: `SGST Output for ${voucher.billNumber}`,
          },
        });
      }
      if (igst > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: igstLedgerId,
            voucherDate: voucher.voucherDate,
            debitCreditType: 'CREDIT',
            amount: glIgst,
            originalCurrency: currency,
            originalAmount: igst,
            exchangeRate: exRate,
            sourceVoucherType: 'JOB_INCOME' as any,
            sourceVoucherId: voucher.id,
            sourceBillNumber: voucher.billNumber,
            narration: `IGST Output for ${voucher.billNumber}`,
          },
        });
      }

      // C. Job Work Expense Account: Debit Operating Expense
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: expenseLedgerId,
          voucherDate: voucher.voucherDate,
          debitCreditType: 'DEBIT',
          amount: glContractorTotal,
          originalCurrency: currency,
          originalAmount: contractorTotal,
          exchangeRate: exRate,
          sourceVoucherType: 'JOB_EXPENSE' as any,
          sourceVoucherId: voucher.id,
          sourceBillNumber: voucher.billNumber,
          narration: `Jobwork Contractor Cost for ${voucher.billNumber}`,
        },
      });

      // D. Subcontractor Account (Factory Vendor): Credit Subcontractor Payable
      if (voucher.subcontractorPartyId) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: voucher.subcontractorPartyId,
            voucherDate: voucher.voucherDate,
            debitCreditType: 'CREDIT',
            amount: glContractorTotal,
            originalCurrency: currency,
            originalAmount: contractorTotal,
            exchangeRate: exRate,
            sourceVoucherType: 'JOB_EXPENSE' as any,
            sourceVoucherId: voucher.id,
            sourceBillNumber: voucher.billNumber,
            narration: `Jobwork Contractor Payable for ${voucher.billNumber}`,
          },
        });
      }

      // 3. Create Outstanding Bills (Receivable & Payable)
      // Customer Receivable Bill
      await tx.outstandingBill.create({
        data: {
          companyId,
          accountId: voucher.partyId,
          billNumber: voucher.billNumber,
          billDate: voucher.voucherDate,
          dueDate: new Date(voucher.voucherDate.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days due
          billType: 'DEBIT',
          originalAmount: netClientTotal,
          allocatedAmount: 0,
          outstandingAmount: netClientTotal,
          status: 'UNPAID',
          sourceVoucherType: 'JOB_INCOME' as any,
          sourceVoucherId: voucher.id,
          transactionCurrency: currency as any,
          exchangeRate: exRate,
          originalAmountAlt: currency === 'USD' ? netClientTotal * exRate : netClientTotal / (exRate || 1),
        },
      });

      // Subcontractor Payable Bill
      if (voucher.subcontractorPartyId) {
        await tx.outstandingBill.create({
          data: {
            companyId,
            accountId: voucher.subcontractorPartyId,
            billNumber: `JW-EXP-${voucher.billNumber}`,
            billDate: voucher.voucherDate,
            dueDate: new Date(voucher.voucherDate.getTime() + 30 * 24 * 60 * 60 * 1000),
            billType: 'CREDIT',
            originalAmount: contractorTotal,
            allocatedAmount: 0,
            outstandingAmount: contractorTotal,
            status: 'UNPAID',
            sourceVoucherType: 'JOB_EXPENSE' as any,
            sourceVoucherId: voucher.id,
            transactionCurrency: currency as any,
            exchangeRate: exRate,
            originalAmountAlt: currency === 'USD' ? contractorTotal * exRate : contractorTotal / (exRate || 1),
          },
        });
      }

      return updated;
    });
  }

  /**
   * Cancel / Reverse a Job Work Ticket
   */
  async cancelUnifiedJobWork(companyId: number, voucherId: number) {
    const voucher = await this.prisma.jobVoucher.findFirst({
      where: { id: voucherId, companyId, isDeleted: false },
    });
    if (!voucher) throw new BadRequestException('Jobwork ticket not found');

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete associated General Ledger Entries
      await tx.generalLedgerEntry.deleteMany({
        where: {
          companyId,
          sourceVoucherId: voucherId,
          sourceVoucherType: { in: ['JOB_INCOME', 'JOB_EXPENSE'] as any[] },
        },
      });

      // 2. Delete associated Outstanding Bills
      await tx.outstandingBill.deleteMany({
        where: {
          companyId,
          sourceVoucherId: voucherId,
          sourceVoucherType: { in: ['JOB_INCOME', 'JOB_EXPENSE'] as any[] },
        },
      });

      // 3. Mark Voucher as CANCELLED & DRAFT (or Soft Deleted)
      const updated = await tx.jobVoucher.update({
        where: { id: voucherId },
        data: {
          status: VoucherStatus.CANCELLED,
          outwardPolishedCarats: null,
          outwardPieceCount: null,
          totalOutwardCarats: 0,
          totalOutwardPieces: 0,
          isFullyCompleted: false,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          netAmount: 0,
        },
      });

      return updated;
    });
  }

  /**
   * Generate Printable PDF Invoice / Outward Delivery Voucher
   */
  async generateJobWorkPdf(companyId: number, voucherId: number, mode: 'CLIENT' | 'SUBCONTRACTOR' = 'CLIENT'): Promise<Buffer> {
    const voucher = await this.prisma.jobVoucher.findFirst({
      where: { id: voucherId, companyId, isDeleted: false },
      include: { party: true, subcontractorParty: true },
    });
    if (!voucher) throw new BadRequestException('Jobwork ticket not found');

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const companyName = company ? company.companyName : 'DIAMO ERP';
    const city = company ? company.city : 'Surat';

    const PDFDocument = require('pdfkit');

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err: Error) => reject(err));

      const primaryColor = '#0F172A';
      const secondaryColor = '#475569';
      const lightBorder = '#E2E8F0';

      const isClientMode = mode === 'CLIENT';
      const isUsd = voucher.transactionCurrency === 'USD';
      const currSymbol = isUsd ? '$' : '₹';

      // Header
      doc.fillColor(primaryColor).fontSize(18).font('Helvetica-Bold').text(companyName.toUpperCase(), 40, 40);
      doc.fillColor(secondaryColor).fontSize(9).font('Helvetica').text(`Address: ${city}, India | GSTIN: ${(company as any)?.gstIn || '24AAACJ0000A1Z5'}`, 40, 62);

      const docTitle = isClientMode ? 'JOB WORK INVOICE' : 'SUBCONTRACTOR WORK ORDER';
      doc.fillColor(primaryColor).fontSize(13).font('Helvetica-Bold').text(docTitle, 350, 40, { align: 'right', width: 205 });
      doc.fillColor(secondaryColor).fontSize(9).font('Helvetica').text(`Voucher #: ${voucher.voucherNumber || voucher.billNumber}`, 350, 58, { align: 'right', width: 205 });
      doc.fillColor(secondaryColor).fontSize(9).font('Helvetica').text(`Date: ${new Date(voucher.voucherDate).toLocaleDateString('en-IN')}`, 350, 70, { align: 'right', width: 205 });

      doc.strokeColor(lightBorder).lineWidth(1).moveTo(40, 88).lineTo(555, 88).stroke();

      // Privacy-guarded Party Box
      if (isClientMode) {
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('BILLED TO (CLIENT):', 40, 100);
        doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold').text(voucher.party?.accountName || 'Customer Party', 40, 114);
        if (voucher.party?.city) {
          doc.fillColor(secondaryColor).fontSize(9).font('Helvetica').text(`Location: ${voucher.party.city}`, 40, 128);
        }
      } else {
        doc.fillColor(primaryColor).fontSize(10).font('Helvetica-Bold').text('ISSUED TO (SUBCONTRACTOR UNIT):', 40, 100);
        doc.fillColor(secondaryColor).fontSize(10).font('Helvetica-Bold').text(voucher.subcontractorParty?.accountName || 'Processing Subcontractor', 40, 114);
        if (voucher.subcontractorParty?.city) {
          doc.fillColor(secondaryColor).fontSize(9).font('Helvetica').text(`Location: ${voucher.subcontractorParty.city}`, 40, 128);
        }
      }

      // Table Header
      const tableTop = 150;
      doc.fillColor('#F8FAFC').rect(40, tableTop, 515, 24).fill();
      doc.strokeColor(lightBorder).rect(40, tableTop, 515, 24).stroke();

      doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold');
      doc.text('Service Type', 48, tableTop + 7, { width: 150 });
      doc.text('Inward Rough', 200, tableTop + 7, { width: 80, align: 'right' });
      doc.text('Outward Polished', 290, tableTop + 7, { width: 80, align: 'right' });
      doc.text(`Rate (${currSymbol}/ct)`, 380, tableTop + 7, { width: 70, align: 'right' });
      doc.text(`Amount (${currSymbol})`, 460, tableTop + 7, { width: 85, align: 'right' });

      // Table Row Data
      const inCarats = Number(voucher.inwardRoughCarats || 0);
      const rate = isClientMode ? Number(voucher.clientBilledRate || 0) : Number(voucher.contractorExpenseRate || 0);
      const lineTotal = isClientMode
        ? Number(voucher.totalAmount || (inCarats * rate))
        : Number(voucher.contractorExpenseTotal || (inCarats * rate));

      const outCarats = voucher.outwardPolishedCarats ? Number(voucher.outwardPolishedCarats) : null;
      const outPcs = voucher.outwardPieceCount ? Number(voucher.outwardPieceCount) : null;

      const rowTop = tableTop + 30;
      doc.fillColor(secondaryColor).fontSize(9).font('Helvetica');
      doc.text(voucher.serviceType || 'DIAMOND_CONVERSION', 48, rowTop, { width: 150 });
      doc.text(`${inCarats.toFixed(3)} ct (${voucher.inwardPieceCount || 1} pcs)`, 170, rowTop, { width: 110, align: 'right' });
      doc.text(outCarats !== null ? `${outCarats.toFixed(3)} ct (${outPcs || 1} pcs)` : 'In Process', 290, rowTop, { width: 80, align: 'right' });
      doc.text(rate.toFixed(2), 380, rowTop, { width: 70, align: 'right' });
      doc.text(lineTotal.toFixed(2), 460, rowTop, { width: 85, align: 'right' });

      // Financial Summary
      const summaryTop = rowTop + 40;
      doc.strokeColor(lightBorder).lineWidth(1).moveTo(40, summaryTop).lineTo(555, summaryTop).stroke();

      const cgst = isClientMode ? Number(voucher.cgstAmount || 0) : 0;
      const sgst = isClientMode ? Number(voucher.sgstAmount || 0) : 0;
      const igst = isClientMode ? Number(voucher.igstAmount || 0) : 0;
      const netTotal = isClientMode ? Number(voucher.netAmount || lineTotal) : lineTotal;

      let currentY = summaryTop + 10;
      doc.fillColor(secondaryColor).fontSize(9).font('Helvetica').text('Gross Amount:', 350, currentY, { width: 110, align: 'right' });
      doc.text(`${currSymbol} ${lineTotal.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });

      if (cgst > 0) {
        currentY += 14;
        doc.text('CGST:', 350, currentY, { width: 110, align: 'right' });
        doc.text(`${currSymbol} ${cgst.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });
      }
      if (sgst > 0) {
        currentY += 14;
        doc.text('SGST:', 350, currentY, { width: 110, align: 'right' });
        doc.text(`${currSymbol} ${sgst.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });
      }
      if (igst > 0) {
        currentY += 14;
        doc.text('IGST:', 350, currentY, { width: 110, align: 'right' });
        doc.text(`${currSymbol} ${igst.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });
      }

      currentY += 16;
      doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold').text(isClientMode ? 'NET CLIENT RECEIVABLE:' : 'NET CONTRACTOR PAYABLE:', 310, currentY, { width: 150, align: 'right' });
      doc.text(`${currSymbol} ${netTotal.toFixed(2)}`, 460, currentY, { width: 85, align: 'right' });

      // Yield Metrics & Footer
      if (voucher.outwardPolishedCarats) {
        const yieldPct = ((Number(voucher.outwardPolishedCarats) / Number(voucher.inwardRoughCarats)) * 100).toFixed(2);
        doc.fillColor(primaryColor).fontSize(9).font('Helvetica-Bold').text(`Conversion Yield: ${yieldPct}%`, 40, summaryTop + 10);
        doc.fillColor(secondaryColor).fontSize(8).font('Helvetica').text(`Process Loss: ${(Number(voucher.inwardRoughCarats) - Number(voucher.outwardPolishedCarats)).toFixed(3)} ct`, 40, summaryTop + 24);
      }

      doc.fillColor(secondaryColor).fontSize(8).font('Helvetica').text(
        isClientMode ? 'This is a computer generated Client Jobwork Invoice.' : 'This is a computer generated Subcontractor Work Order Voucher.',
        40, 750, { align: 'center', width: 515 }
      );

      doc.end();
    });
  }
}

