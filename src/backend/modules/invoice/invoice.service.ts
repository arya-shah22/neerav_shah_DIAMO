// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Invoice Service Backend
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { InvoiceStatus, PaymentStatus, InvoiceType, DebitCreditType, MovementType, StockStatus } from '@prisma/client';
import { generateStockIdNumber } from '../../utils/stock-id-generator';

@Injectable()
export class InvoiceService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  /**
   * Helper to ensure standard default ledger accounts exist for the company
   */
  private async getOrCreateDefaultAccount(companyId: number, accountName: string, groupName: string): Promise<number> {
    const existing = await this.prisma.account.findFirst({
      where: { companyId, accountName, isDeleted: false },
    });
    if (existing) return existing.id;

    const group = await this.prisma.accountGroup.findFirst({
      where: { companyId, groupName, isDeleted: false },
    });
    if (!group) {
      throw new BadRequestException(`Required account group "${groupName}" not found for company ID ${companyId}`);
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
   * Previews the next sequential voucher number without incrementing the DB sequence
   */
  async previewVoucherNumber(companyId: number, financialYearId: number, type: InvoiceType): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });

    if (!company || !fy) {
      throw new BadRequestException('Company or Financial Year not found');
    }

    const config = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, financialYearId, voucherType: type as any },
    });

    const sequence = await this.prisma.voucherNumberSequence.findFirst({
      where: { companyId, financialYearId, voucherType: type as any },
    });

    const nextNum = (sequence?.currentNumber || 0) + 1;
    const digitLength = config?.digitLength || 6;

    const startYear = fy.fromDate.getFullYear();
    const endYear = fy.toDate.getFullYear();
    const yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
    
    let typeAbbr = 'INV';
    if (type === 'SALE_INVOICE') typeAbbr = 'SAL';
    else if (type === 'SALE_RETURN') typeAbbr = 'SRET';
    else if (type === 'SALE_DEBIT_NOTE') typeAbbr = 'SDN';
    else if (type === 'PURCHASE_INVOICE') typeAbbr = 'PUR';
    else if (type === 'PURCHASE_RETURN') typeAbbr = 'PRN';
    else if (type === 'PURCHASE_DEBIT_NOTE') typeAbbr = 'PCN';

    const seqStr = String(nextNum).padStart(digitLength, '0');

    return `${company.companyCode}-${yearSuffix}-${typeAbbr}-${seqStr}`;
  }

  /**
   * Generates a running sequence number and voucher string for invoice types
   */
  async generateVoucherNumber(companyId: number, financialYearId: number, type: InvoiceType): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });

    if (!company || !fy) {
      throw new BadRequestException('Company or Financial Year not found');
    }

    // 1. Get voucher numbering configuration or create default
    let config = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, financialYearId, voucherType: type as any },
    });

    if (!config) {
      config = await this.prisma.voucherNumberConfig.create({
        data: {
          companyId,
          financialYearId,
          voucherType: type as any,
          method: 'AUTOMATIC',
          digitLength: 6,
          includeYear: true,
          resetAnnually: true,
        },
      });
    }

    // 2. Increment running sequence atomically
    const sequence = await this.prisma.voucherNumberSequence.upsert({
      where: {
        companyId_financialYearId_voucherType: {
          companyId,
          financialYearId,
          voucherType: type as any,
        },
      },
      create: {
        companyId,
        financialYearId,
        voucherType: type as any,
        currentNumber: 1,
        lastGeneratedAt: new Date(),
      },
      update: {
        currentNumber: { increment: 1 },
        lastGeneratedAt: new Date(),
      },
    });

    // 3. Format the final string
    const startYear = fy.fromDate.getFullYear();
    const endYear = fy.toDate.getFullYear();
    const yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
    
    let typeAbbr = 'INV';
    if (type === 'SALE_INVOICE') typeAbbr = 'SAL';
    else if (type === 'SALE_RETURN') typeAbbr = 'SRET';
    else if (type === 'SALE_DEBIT_NOTE') typeAbbr = 'SDN';
    else if (type === 'PURCHASE_INVOICE') typeAbbr = 'PUR';
    else if (type === 'PURCHASE_RETURN') typeAbbr = 'PRN';
    else if (type === 'PURCHASE_DEBIT_NOTE') typeAbbr = 'PCN';

    const seqStr = String(sequence.currentNumber).padStart(config.digitLength, '0');

    return `${company.companyCode}-${yearSuffix}-${typeAbbr}-${seqStr}`;
  }

  /**
   * List all Sale or Purchase Invoices
   */
  async list(companyId: number, type: InvoiceType) {
    return this.prisma.saleInvoice.findMany({
      where: { companyId, invoiceType: type, isDeleted: false },
      orderBy: { invoiceDate: 'desc' },
      include: {
        customer: { select: { id: true, accountName: true } },
        broker: { select: { id: true, accountName: true } },
        items: {
          include: { quality: true }
        }
      },
    });
  }

  /**
   * Get unique invoice details
   */
  async get(id: number, companyId: number) {
    const invoice = await this.prisma.saleInvoice.findFirst({
      where: { id, companyId, isDeleted: false },
      include: {
        customer: true,
        broker: true,
        items: {
          include: { quality: true },
        },
      },
    });
    if (!invoice) throw new BadRequestException('Invoice not found');
    return invoice;
  }

  /**
   * Creates an invoice (Sale/Purchase) along with ledger postings and stock changes
   */
  async create(companyId: number, data: Record<string, any>) {
    const financialYearId = Number(data.financialYearId);
    const invoiceType = data.invoiceType as InvoiceType;
    const customerId = Number(data.customerId);
    const brokerId = data.brokerId ? Number(data.brokerId) : null;
    const invoiceDate = new Date(data.invoiceDate);
    const creditDays = Number(data.creditDays) || 0;
    const dueDate = new Date(invoiceDate.getTime() + creditDays * 24 * 60 * 60 * 1000);

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const party = await this.prisma.account.findUnique({ where: { id: customerId } });
    if (!company || !party) throw new BadRequestException('Company or Party account not found');

    const voucherNumber = await this.generateVoucherNumber(companyId, financialYearId, invoiceType);
    const billNumber = data.isManualBillNumber && data.billNumber ? data.billNumber : voucherNumber;

    const addPct = Number(data.addPct) || 0;
    const lessPct = Number(data.lessPct) || 0;

    const salesOrPurchaseLedgerId =
      invoiceType === InvoiceType.SALE_INVOICE
        ? await this.getOrCreateDefaultAccount(companyId, 'Sales A/c', 'Sales Accounts')
        : await this.getOrCreateDefaultAccount(companyId, 'Purchase A/c', 'Purchase Accounts');

    const cgstLedgerId = await this.getOrCreateDefaultAccount(companyId, 'CGST Input/Output', 'Duties & Taxes');
    const sgstLedgerId = await this.getOrCreateDefaultAccount(companyId, 'SGST Input/Output', 'Duties & Taxes');
    const igstLedgerId = await this.getOrCreateDefaultAccount(companyId, 'IGST Input/Output', 'Duties & Taxes');

    return this.prisma.$transaction(async (tx) => {
      const companyQualities = await tx.quality.findMany({
        where: { companyId, isDeleted: false }
      });

      const itemsData = Array.isArray(data.items) ? data.items : [];
      let totalCarats = 0;
      let totalPieces = 0;
      let totalGrossAmount = 0;
      let totalDiscount = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      const parsedItems = [];

      for (const [index, it] of itemsData.entries()) {
        const carats = Number(it.carats) || 0;
        const pieces = Number(it.pieces) || 1;
        const rate = Number(it.rate) || 0;
        const discountPct = Number(it.discountPct) || 0;
        const gstPct = Number(it.gstPct) || 0;

        const gross = carats * rate;
        const discount = (gross * discountPct) / 100;
        const itemAddAmount = (gross * addPct) / 100;
        const itemLessAmount = (gross * lessPct) / 100;
        const taxable = gross + itemAddAmount - itemLessAmount - discount;

        totalCarats += carats;
        totalPieces += pieces;
        totalGrossAmount += gross;
        totalDiscount += discount + itemLessAmount;

        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        const isSameState = company.stateCode === party.stateCode;
        if (isSameState) {
          cgst = (taxable * (gstPct / 2)) / 100;
          sgst = (taxable * (gstPct / 2)) / 100;
          totalCgst += cgst;
          totalSgst += sgst;
        } else {
          igst = (taxable * gstPct) / 100;
          totalIgst += igst;
        }

        const netVal = taxable + cgst + sgst + igst;

        let stockPacketId: number | null = null;
        const quality = companyQualities.find((q) => q.id === Number(it.qualityId));
        if (quality && !quality.isService) {
          if (invoiceType === 'PURCHASE_INVOICE') {
            const stockId = it.stockIdNumber?.trim() || (await generateStockIdNumber(tx, companyId));
            let pkt = await tx.stockPacket.findFirst({
              where: { companyId, stockIdNumber: stockId, isDeleted: false }
            });
            if (!pkt) {
              pkt = await tx.stockPacket.create({
                data: {
                  companyId,
                  qualityId: quality.id,
                  stockIdNumber: stockId,
                  category: (it.category as any) || 'NON_CERTIFIED',
                  shape: it.shape || null,
                  color: it.color || null,
                  clarity: it.clarity || null,
                  cut: it.cut || null,
                  polish: it.polish || null,
                  symmetry: it.symmetry || null,
                  lengthMm: it.lengthMm != null ? Number(it.lengthMm) : null,
                  widthMm: it.widthMm != null ? Number(it.widthMm) : null,
                  depthMm: it.depthMm != null ? Number(it.depthMm) : null,
                  totalDepthPct: it.totalDepthPct != null ? Number(it.totalDepthPct) : null,
                  tablePct: it.tablePct != null ? Number(it.tablePct) : null,
                  certificateType: it.certificateType || null,
                  certificateNumber: it.certificateNumber || null,
                  costPerCarat: Number(it.rate),
                  totalCost: Number(gross),
                  caratWeight: 0,
                  pieceCount: 0,
                  currentStatus: StockStatus.AVAILABLE,
                  registrationDate: new Date(),
                }
              });

              if (it.imageLink?.trim()) {
                await tx.stockMedia.create({
                  data: {
                    stockPacketId: pkt.id,
                    mediaType: 'PHOTO',
                    filePath: it.imageLink.trim(),
                    fileName: 'photo',
                    sortOrder: 0,
                  }
                });
              }
              if (it.videoLink?.trim()) {
                await tx.stockMedia.create({
                  data: {
                    stockPacketId: pkt.id,
                    mediaType: 'VIDEO',
                    filePath: it.videoLink.trim(),
                    fileName: 'video',
                    sortOrder: 1,
                  }
                });
              }
            }
            stockPacketId = pkt.id;
          } else if (it.stockPacketId) {
            stockPacketId = Number(it.stockPacketId);
          } else {
            let pkt = await tx.stockPacket.findFirst({
              where: { companyId, qualityId: quality.id, isDeleted: false }
            });
            if (!pkt) {
              pkt = await tx.stockPacket.create({
                data: {
                  companyId,
                  qualityId: quality.id,
                  stockIdNumber: `PKT-QLY-${quality.id}`,
                  caratWeight: 0,
                  pieceCount: 0,
                  currentStatus: StockStatus.AVAILABLE,
                  registrationDate: new Date(),
                }
              });
            }
            stockPacketId = pkt.id;
          }
        }

        parsedItems.push({
          rowNumber: index + 1,
          qualityId: Number(it.qualityId),
          hsnNumber: String(it.hsnNumber || '7113'),
          carats,
          pieces,
          rate,
          lessPct: discountPct + lessPct,
          termsRate: rate,
          grossAmount: gross,
          gstPct,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          netAmount: netVal,
          stockPacketId,
        });
      }

      const calculatedAddValue = (totalGrossAmount * addPct) / 100;
      const calculatedLessValue = (totalGrossAmount * lessPct) / 100;
      const taxableTotal = totalGrossAmount + calculatedAddValue - calculatedLessValue;
      const taxTotal = totalCgst + totalSgst + totalIgst;
      const rawNet = taxableTotal + taxTotal;
      const roundOff = Math.round(rawNet) - rawNet;
      const netAmount = Math.round(rawNet);

      // 1. Create Invoice Record
      const createdInvoice = await tx.saleInvoice.create({
        data: {
          companyId,
          financialYearId,
          invoiceType,
          voucherNumber,
          billNumber,
          invoiceDate,
          dueDate,
          status: InvoiceStatus.SAVED,
          paymentStatus: PaymentStatus.UNPAID,
          customerId,
          customerGstin: party.gstinNumber,
          customerStateCode: party.stateCode,
          placeOfSupply: party.stateCode,
          brokerId,
          brokeragePct: Number(data.brokeragePct) || 0,
          brokerageAmount: (taxableTotal * (Number(data.brokeragePct) || 0)) / 100,
          totalCarats,
          totalPieces,
          totalGrossAmount,
          totalDiscount,
          totalCgst,
          totalSgst,
          totalIgst,
          roundOff,
          netAmount,
          outstandingAmount: netAmount,
          narration: data.narration || '',
          items: {
            create: parsedItems,
          },
        },
      });

      // 2. Create Double-Entry General Ledger Postings
      const isSalesBook = invoiceType === 'SALE_INVOICE' || invoiceType === 'SALE_DEBIT_NOTE';
      const isSalesReturn = invoiceType === 'SALE_RETURN';
      const isPurchaseBook = invoiceType === 'PURCHASE_INVOICE' || invoiceType === 'PURCHASE_DEBIT_NOTE';
      const isPurchaseReturn = invoiceType === 'PURCHASE_RETURN';

      let partyDebitCredit: DebitCreditType = DebitCreditType.DEBIT;
      if (isSalesBook) partyDebitCredit = DebitCreditType.DEBIT;
      else if (isSalesReturn) partyDebitCredit = DebitCreditType.CREDIT;
      else if (isPurchaseBook) partyDebitCredit = DebitCreditType.CREDIT;
      else if (isPurchaseReturn) partyDebitCredit = DebitCreditType.DEBIT;

      // Party Posting
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: customerId,
          voucherDate: invoiceDate,
          debitCreditType: partyDebitCredit,
          amount: netAmount,
          sourceVoucherType: invoiceType as any,
          sourceVoucherId: createdInvoice.id,
          sourceBillNumber: billNumber,
          narration: `Bill No: ${billNumber}`,
        },
      });

      let revenueDebitCredit: DebitCreditType = DebitCreditType.CREDIT;
      if (isSalesBook) revenueDebitCredit = DebitCreditType.CREDIT;
      else if (isSalesReturn) revenueDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseBook) revenueDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseReturn) revenueDebitCredit = DebitCreditType.CREDIT;

      // Revenue / Purchase Expense Posting
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: salesOrPurchaseLedgerId,
          voucherDate: invoiceDate,
          debitCreditType: revenueDebitCredit,
          amount: taxableTotal,
          sourceVoucherType: invoiceType as any,
          sourceVoucherId: createdInvoice.id,
          sourceBillNumber: billNumber,
          narration: `${invoiceType} revenue/expense posting`,
        },
      });

      let taxDebitCredit: DebitCreditType = DebitCreditType.CREDIT;
      if (isSalesBook) taxDebitCredit = DebitCreditType.CREDIT;
      else if (isSalesReturn) taxDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseBook) taxDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseReturn) taxDebitCredit = DebitCreditType.CREDIT;

      // CGST Posting
      if (totalCgst > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: cgstLedgerId,
            voucherDate: invoiceDate,
            debitCreditType: taxDebitCredit,
            amount: totalCgst,
            sourceVoucherType: invoiceType as any,
            sourceVoucherId: createdInvoice.id,
            sourceBillNumber: billNumber,
            narration: 'CGST tax entry',
          },
        });
      }

      // SGST Posting
      if (totalSgst > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: sgstLedgerId,
            voucherDate: invoiceDate,
            debitCreditType: taxDebitCredit,
            amount: totalSgst,
            sourceVoucherType: invoiceType as any,
            sourceVoucherId: createdInvoice.id,
            sourceBillNumber: billNumber,
            narration: 'SGST tax entry',
          },
        });
      }

      // IGST Posting
      if (totalIgst > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId,
            accountId: igstLedgerId,
            voucherDate: invoiceDate,
            debitCreditType: taxDebitCredit,
            amount: totalIgst,
            sourceVoucherType: invoiceType as any,
            sourceVoucherId: createdInvoice.id,
            sourceBillNumber: billNumber,
            narration: 'IGST tax entry',
          },
        });
      }

      // 3. Stock Movements (Carat Adjustments)
      const hasStockInward = (invoiceType === 'PURCHASE_INVOICE' || invoiceType === 'SALE_RETURN');
      const hasStockOutward = (invoiceType === 'SALE_INVOICE' || invoiceType === 'PURCHASE_RETURN');
      const isFinancialOnly = (invoiceType === 'SALE_DEBIT_NOTE' || invoiceType === 'PURCHASE_DEBIT_NOTE');

      if (!isFinancialOnly) {
        for (const item of parsedItems) {
          if (!item.stockPacketId) continue;

          const packet = await tx.stockPacket.findUnique({
            where: { id: item.stockPacketId },
          });

          if (packet) {
            await tx.stockMovement.create({
              data: {
                stockPacketId: packet.id,
                movementDate: invoiceDate,
                movementType: hasStockInward ? MovementType.PURCHASE : MovementType.SALES,
                previousStatus: packet.currentStatus,
                newStatus: packet.currentStatus,
                carats: item.carats,
                pieces: item.pieces,
                sourceVoucherType: invoiceType as any,
                sourceVoucherId: createdInvoice.id,
                remarks: `Invoice ref: ${billNumber}`,
              },
            });

            await tx.stockPacket.update({
              where: { id: packet.id },
              data: {
                caratWeight: hasStockOutward
                  ? { decrement: item.carats }
                  : { increment: item.carats },
                pieceCount: hasStockOutward
                  ? { decrement: item.pieces }
                  : { increment: item.pieces },
                currentStatus: invoiceType === 'SALE_INVOICE' 
                  ? StockStatus.SOLD 
                  : (invoiceType === 'SALE_RETURN' 
                    ? StockStatus.AVAILABLE 
                    : (invoiceType === 'PURCHASE_RETURN' 
                      ? StockStatus.RETURNED 
                      : undefined)),
              },
            });
          }
        }
      }

      return createdInvoice;
    });
  }

  /**
   * Delete an Invoice (Soft delete with ledger & stock reversal)
   */
  async delete(id: number, companyId: number) {
    const invoice = await this.prisma.saleInvoice.findFirst({
      where: { id, companyId, isDeleted: false },
      include: { items: true },
    });
    if (!invoice) throw new BadRequestException('Invoice not found');

    const hasStockOutward = (invoice.invoiceType === 'SALE_INVOICE' || invoice.invoiceType === 'PURCHASE_RETURN');
    const isFinancialOnly = (invoice.invoiceType === 'SALE_DEBIT_NOTE' || invoice.invoiceType === 'PURCHASE_DEBIT_NOTE');

    return this.prisma.$transaction(async (tx) => {
      // 1. Soft-delete the invoice header
      await tx.saleInvoice.update({
        where: { id },
        data: { isDeleted: true, deletedAt: new Date() },
      });

      // 2. Remove all related general ledger entries
      await tx.generalLedgerEntry.deleteMany({
        where: {
          companyId,
          sourceVoucherType: invoice.invoiceType as any,
          sourceVoucherId: id,
        },
      });

      // 3. Reverse stock counts and remove movements
      if (!isFinancialOnly) {
        for (const item of invoice.items) {
          const quality = await tx.quality.findUnique({ where: { id: item.qualityId } });
          if (quality?.isService) continue;

          const packet = await tx.stockPacket.findFirst({
            where: { companyId, qualityId: item.qualityId, isDeleted: false },
          });

          if (packet) {
            await tx.stockPacket.update({
              where: { id: packet.id },
              data: {
                caratWeight: hasStockOutward
                  ? { increment: item.carats }
                  : { decrement: item.carats },
                pieceCount: hasStockOutward
                  ? { increment: item.pieces }
                  : { decrement: item.pieces },
                currentStatus: (invoice.invoiceType === 'SALE_INVOICE' || invoice.invoiceType === 'PURCHASE_RETURN')
                  ? StockStatus.AVAILABLE
                  : undefined,
              },
            });
          }
        }

        // Delete stock movement records
        await tx.stockMovement.deleteMany({
          where: {
            sourceVoucherType: invoice.invoiceType as any,
            sourceVoucherId: id,
          },
        });
      }

      return { success: true };
    });
  }

  /**
   * Update an Invoice — deletes old postings & stock movements, re-creates with new data
   */
  async update(id: number, companyId: number, data: Record<string, any>) {
    const existing = await this.prisma.saleInvoice.findFirst({
      where: { id, companyId, isDeleted: false },
      include: { items: true },
    });
    if (!existing) throw new BadRequestException('Invoice not found');

    const invoiceType = existing.invoiceType;

    const customerId = Number(data.customerId);
    const brokerId = data.brokerId ? Number(data.brokerId) : null;
    const invoiceDate = new Date(data.invoiceDate);
    const creditDays = Number(data.creditDays) || 0;
    const dueDate = new Date(invoiceDate.getTime() + creditDays * 24 * 60 * 60 * 1000);
    const addPct = Number(data.addPct) || 0;
    const lessPct = Number(data.lessPct) || 0;

    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const party = await this.prisma.account.findUnique({ where: { id: customerId } });
    if (!company || !party) throw new BadRequestException('Company or Party account not found');

    const billNumber = data.isManualBillNumber && data.billNumber ? data.billNumber : existing.voucherNumber;

    const salesOrPurchaseLedgerId =
      invoiceType === 'SALE_INVOICE' || invoiceType === 'SALE_DEBIT_NOTE' || invoiceType === 'SALE_RETURN'
        ? await this.getOrCreateDefaultAccount(companyId, 'Sales A/c', 'Sales Accounts')
        : await this.getOrCreateDefaultAccount(companyId, 'Purchase A/c', 'Purchase Accounts');

    const cgstLedgerId = await this.getOrCreateDefaultAccount(companyId, 'CGST Input/Output', 'Duties & Taxes');
    const sgstLedgerId = await this.getOrCreateDefaultAccount(companyId, 'SGST Input/Output', 'Duties & Taxes');
    const igstLedgerId = await this.getOrCreateDefaultAccount(companyId, 'IGST Input/Output', 'Duties & Taxes');

    return this.prisma.$transaction(async (tx) => {
      const companyQualities = await tx.quality.findMany({
        where: { companyId, isDeleted: false }
      });

      const itemsData = Array.isArray(data.items) ? data.items : [];
      let totalCarats = 0;
      let totalPieces = 0;
      let totalGrossAmount = 0;
      let totalDiscount = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      let totalIgst = 0;

      const parsedItems = [];

      for (const [index, it] of itemsData.entries()) {
        const carats = Number(it.carats) || 0;
        const pieces = Number(it.pieces) || 1;
        const rate = Number(it.rate) || 0;
        const discountPct = Number(it.discountPct) || 0;
        const gstPct = Number(it.gstPct) || 0;

        const gross = carats * rate;
        const discount = (gross * discountPct) / 100;
        const itemAddAmount = (gross * addPct) / 100;
        const itemLessAmount = (gross * lessPct) / 100;
        const taxable = gross + itemAddAmount - itemLessAmount - discount;

        totalCarats += carats;
        totalPieces += pieces;
        totalGrossAmount += gross;
        totalDiscount += discount + itemLessAmount;

        let cgst = 0;
        let sgst = 0;
        let igst = 0;

        const isSameState = company.stateCode === party.stateCode;
        if (isSameState) {
          cgst = (taxable * (gstPct / 2)) / 100;
          sgst = (taxable * (gstPct / 2)) / 100;
          totalCgst += cgst;
          totalSgst += sgst;
        } else {
          igst = (taxable * gstPct) / 100;
          totalIgst += igst;
        }

        const netVal = taxable + cgst + sgst + igst;

        let stockPacketId: number | null = null;
        const quality = companyQualities.find((q) => q.id === Number(it.qualityId));
        if (quality && !quality.isService) {
          if (invoiceType === 'PURCHASE_INVOICE') {
            const stockId = it.stockIdNumber?.trim() || (await generateStockIdNumber(tx, companyId));
            let pkt = await tx.stockPacket.findFirst({
              where: { companyId, stockIdNumber: stockId, isDeleted: false }
            });
            if (!pkt) {
              pkt = await tx.stockPacket.create({
                data: {
                  companyId,
                  qualityId: quality.id,
                  stockIdNumber: stockId,
                  category: (it.category as any) || 'NON_CERTIFIED',
                  shape: it.shape || null,
                  color: it.color || null,
                  clarity: it.clarity || null,
                  cut: it.cut || null,
                  polish: it.polish || null,
                  symmetry: it.symmetry || null,
                  lengthMm: it.lengthMm != null ? Number(it.lengthMm) : null,
                  widthMm: it.widthMm != null ? Number(it.widthMm) : null,
                  depthMm: it.depthMm != null ? Number(it.depthMm) : null,
                  totalDepthPct: it.totalDepthPct != null ? Number(it.totalDepthPct) : null,
                  tablePct: it.tablePct != null ? Number(it.tablePct) : null,
                  certificateType: it.certificateType || null,
                  certificateNumber: it.certificateNumber || null,
                  costPerCarat: Number(it.rate),
                  totalCost: Number(gross),
                  caratWeight: 0,
                  pieceCount: 0,
                  currentStatus: StockStatus.AVAILABLE,
                  registrationDate: new Date(),
                }
              });

              if (it.imageLink?.trim()) {
                await tx.stockMedia.create({
                  data: {
                    stockPacketId: pkt.id,
                    mediaType: 'PHOTO',
                    filePath: it.imageLink.trim(),
                    fileName: 'photo',
                    sortOrder: 0,
                  }
                });
              }
              if (it.videoLink?.trim()) {
                await tx.stockMedia.create({
                  data: {
                    stockPacketId: pkt.id,
                    mediaType: 'VIDEO',
                    filePath: it.videoLink.trim(),
                    fileName: 'video',
                    sortOrder: 1,
                  }
                });
              }
            }
            stockPacketId = pkt.id;
          } else if (it.stockPacketId) {
            stockPacketId = Number(it.stockPacketId);
          } else {
            let pkt = await tx.stockPacket.findFirst({
              where: { companyId, qualityId: quality.id, isDeleted: false }
            });
            if (!pkt) {
              pkt = await tx.stockPacket.create({
                data: {
                  companyId,
                  qualityId: quality.id,
                  stockIdNumber: `PKT-QLY-${quality.id}`,
                  caratWeight: 0,
                  pieceCount: 0,
                  currentStatus: StockStatus.AVAILABLE,
                  registrationDate: new Date(),
                }
              });
            }
            stockPacketId = pkt.id;
          }
        }

        parsedItems.push({
          rowNumber: index + 1,
          qualityId: Number(it.qualityId),
          hsnNumber: String(it.hsnNumber || '7113'),
          carats,
          pieces,
          rate,
          lessPct: discountPct + lessPct,
          termsRate: rate,
          grossAmount: gross,
          gstPct,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          netAmount: netVal,
          stockPacketId,
        });
      }

      // Allow manual tax overrides from frontend
      if (data.totalCgst !== undefined) totalCgst = Number(data.totalCgst);
      if (data.totalSgst !== undefined) totalSgst = Number(data.totalSgst);
      if (data.totalIgst !== undefined) totalIgst = Number(data.totalIgst);

      const calculatedAddValue = (totalGrossAmount * addPct) / 100;
      const calculatedLessValue = (totalGrossAmount * lessPct) / 100;
      const taxableTotal = totalGrossAmount + calculatedAddValue - calculatedLessValue;
      const taxTotal = totalCgst + totalSgst + totalIgst;
      const rawNet = taxableTotal + taxTotal;
      const roundOff = Math.round(rawNet) - rawNet;
      const netAmount = Math.round(rawNet);

      const brokeragePct = Number(data.brokeragePct) || 0;
      const brokerageAmount = (taxableTotal * brokeragePct) / 100;
      // 1. Reverse old stock movements
      const oldHasStockOutward = (existing.invoiceType === 'SALE_INVOICE' || existing.invoiceType === 'PURCHASE_RETURN');
      const oldIsFinancialOnly = (existing.invoiceType === 'SALE_DEBIT_NOTE' || existing.invoiceType === 'PURCHASE_DEBIT_NOTE');

      if (!oldIsFinancialOnly) {
        for (const item of existing.items) {
          const quality = await tx.quality.findUnique({ where: { id: item.qualityId } });
          if (quality?.isService) continue;

          const packet = await tx.stockPacket.findFirst({
            where: { companyId, qualityId: item.qualityId, isDeleted: false },
          });
          if (packet) {
            await tx.stockPacket.update({
              where: { id: packet.id },
              data: {
                caratWeight: oldHasStockOutward ? { increment: item.carats } : { decrement: item.carats },
                pieceCount: oldHasStockOutward ? { increment: item.pieces } : { decrement: item.pieces },
                currentStatus: (existing.invoiceType === 'SALE_INVOICE' || existing.invoiceType === 'PURCHASE_RETURN')
                  ? StockStatus.AVAILABLE
                  : undefined,
              },
            });
          }
        }
      }

      // 2. Delete old ledger entries, stock movements, and items
      await tx.generalLedgerEntry.deleteMany({
        where: { companyId, sourceVoucherType: existing.invoiceType as any, sourceVoucherId: id },
      });
      await tx.stockMovement.deleteMany({
        where: { sourceVoucherType: existing.invoiceType as any, sourceVoucherId: id },
      });
      await tx.saleInvoiceItem.deleteMany({ where: { saleInvoiceId: id } });

      // 3. Update invoice header
      const updatedInvoice = await tx.saleInvoice.update({
        where: { id },
        data: {
          billNumber,
          invoiceDate,
          dueDate,
          customerId,
          customerGstin: party.gstinNumber,
          customerStateCode: party.stateCode,
          brokerId,
          brokeragePct,
          brokerageAmount,
          totalCarats,
          totalPieces,
          totalGrossAmount,
          totalDiscount,
          totalCgst,
          totalSgst,
          totalIgst,
          roundOff,
          netAmount,
          narration: data.narration || '',
          updatedAt: new Date(),
          items: { create: parsedItems },
        },
        include: { items: true, customer: { select: { id: true, accountName: true } }, broker: { select: { id: true, accountName: true } } },
      });

      // 4. Re-create ledger entries
      const isSalesBook = invoiceType === 'SALE_INVOICE' || invoiceType === 'SALE_DEBIT_NOTE';
      const isSalesReturn = invoiceType === 'SALE_RETURN';
      const isPurchaseBook = invoiceType === 'PURCHASE_INVOICE' || invoiceType === 'PURCHASE_DEBIT_NOTE';
      const isPurchaseReturn = invoiceType === 'PURCHASE_RETURN';

      let partyDebitCredit: DebitCreditType = DebitCreditType.DEBIT;
      if (isSalesBook) partyDebitCredit = DebitCreditType.DEBIT;
      else if (isSalesReturn) partyDebitCredit = DebitCreditType.CREDIT;
      else if (isPurchaseBook) partyDebitCredit = DebitCreditType.CREDIT;
      else if (isPurchaseReturn) partyDebitCredit = DebitCreditType.DEBIT;

      // Party Posting
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: customerId,
          voucherDate: invoiceDate,
          debitCreditType: partyDebitCredit,
          amount: netAmount,
          sourceVoucherType: invoiceType as any,
          sourceVoucherId: id,
          sourceBillNumber: billNumber,
          narration: `Bill No: ${billNumber}`,
        },
      });

      let revenueDebitCredit: DebitCreditType = DebitCreditType.CREDIT;
      if (isSalesBook) revenueDebitCredit = DebitCreditType.CREDIT;
      else if (isSalesReturn) revenueDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseBook) revenueDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseReturn) revenueDebitCredit = DebitCreditType.CREDIT;

      // Revenue / Purchase Expense Posting
      await tx.generalLedgerEntry.create({
        data: {
          companyId,
          accountId: salesOrPurchaseLedgerId,
          voucherDate: invoiceDate,
          debitCreditType: revenueDebitCredit,
          amount: taxableTotal,
          sourceVoucherType: invoiceType as any,
          sourceVoucherId: id,
          sourceBillNumber: billNumber,
          narration: `${invoiceType} revenue/expense posting`,
        },
      });

      let taxDebitCredit: DebitCreditType = DebitCreditType.CREDIT;
      if (isSalesBook) taxDebitCredit = DebitCreditType.CREDIT;
      else if (isSalesReturn) taxDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseBook) taxDebitCredit = DebitCreditType.DEBIT;
      else if (isPurchaseReturn) taxDebitCredit = DebitCreditType.CREDIT;

      if (totalCgst > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId, accountId: cgstLedgerId, voucherDate: invoiceDate,
            debitCreditType: taxDebitCredit,
            amount: totalCgst, sourceVoucherType: invoiceType as any,
            sourceVoucherId: id, sourceBillNumber: billNumber, narration: 'CGST tax entry',
          },
        });
      }
      if (totalSgst > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId, accountId: sgstLedgerId, voucherDate: invoiceDate,
            debitCreditType: taxDebitCredit,
            amount: totalSgst, sourceVoucherType: invoiceType as any,
            sourceVoucherId: id, sourceBillNumber: billNumber, narration: 'SGST tax entry',
          },
        });
      }
      if (totalIgst > 0) {
        await tx.generalLedgerEntry.create({
          data: {
            companyId, accountId: igstLedgerId, voucherDate: invoiceDate,
            debitCreditType: taxDebitCredit,
            amount: totalIgst, sourceVoucherType: invoiceType as any,
            sourceVoucherId: id, sourceBillNumber: billNumber, narration: 'IGST tax entry',
          },
        });
      }

      // 5. Re-create stock movements & update stock packets
      const hasStockInward = (invoiceType === 'PURCHASE_INVOICE' || invoiceType === 'SALE_RETURN');
      const hasStockOutward = (invoiceType === 'SALE_INVOICE' || invoiceType === 'PURCHASE_RETURN');
      const isFinancialOnly = (invoiceType === 'SALE_DEBIT_NOTE' || invoiceType === 'PURCHASE_DEBIT_NOTE');

      if (!isFinancialOnly) {
        for (const item of parsedItems) {
          if (!item.stockPacketId) continue;

          const packet = await tx.stockPacket.findUnique({
            where: { id: item.stockPacketId },
          });

          if (packet) {
            await tx.stockMovement.create({
              data: {
                stockPacketId: packet.id,
                movementDate: invoiceDate,
                movementType: hasStockInward ? MovementType.PURCHASE : MovementType.SALES,
                previousStatus: packet.currentStatus,
                newStatus: packet.currentStatus,
                carats: item.carats,
                pieces: item.pieces,
                sourceVoucherType: invoiceType as any,
                sourceVoucherId: id,
                remarks: `Updated Invoice ref: ${billNumber}`,
              },
            });

            await tx.stockPacket.update({
              where: { id: packet.id },
              data: {
                caratWeight: hasStockOutward ? { decrement: item.carats } : { increment: item.carats },
                pieceCount: hasStockOutward ? { decrement: item.pieces } : { increment: item.pieces },
                currentStatus: invoiceType === 'SALE_INVOICE' 
                  ? StockStatus.SOLD 
                  : (invoiceType === 'SALE_RETURN' 
                    ? StockStatus.AVAILABLE 
                    : (invoiceType === 'PURCHASE_RETURN' 
                      ? StockStatus.RETURNED 
                      : undefined)),
              },
            });
          }
        }
      }

      return updatedInvoice;
    });
  }
}
