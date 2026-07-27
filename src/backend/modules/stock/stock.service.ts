// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Service (Stage 3 Inventory)
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  MovementType,
  StockCategory,
  StockOwnership,
  StockStatus,
  VoucherType,
  ChallanPurpose,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { generateStockIdNumber, previewNextStockIdNumber } from '../../utils/stock-id-generator';
import { DEFAULT_DIAMOND_SHAPES, mergeDiamondShapes } from '../../../shared/constants/diamond-shapes';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

export interface StockListFilters {
  search?: string;
  status?: StockStatus;
  category?: StockCategory;
  qualityId?: number;
}

const STOCK_INCLUDE = {
  quality: { select: { id: true, qualityName: true, itemCode: true } },
  media: {
    where: { mediaType: { in: ['PHOTO', 'VIDEO'] as string[] } },
    orderBy: { sortOrder: 'asc' as const },
  },
};

const EDITABLE_STATUSES: StockStatus[] = [
  StockStatus.CREATED,
  StockStatus.AVAILABLE,
  StockStatus.HOLD,
  StockStatus.PURCHASED,
  StockStatus.RETURNED,
  StockStatus.DAMAGED,
];

@Injectable()
export class StockService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async list(companyId: number, filters?: StockListFilters) {
    return this.prisma.stockPacket.findMany({
      where: {
        companyId,
        isDeleted: false,
        ...(filters?.status ? { currentStatus: filters.status } : {}),
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.qualityId ? { qualityId: filters.qualityId } : {}),
        ...(filters?.search
          ? {
              OR: [
                { stockIdNumber: { contains: filters.search } },
                { certificateNumber: { contains: filters.search } },
                { shape: { contains: filters.search } },
                { color: { contains: filters.search } },
                { clarity: { contains: filters.search } },
                { quality: { qualityName: { contains: filters.search } } },
                { quality: { itemCode: { contains: filters.search } } },
              ],
            }
          : {}),
      },
      orderBy: [{ registrationDate: 'desc' }, { id: 'desc' }],
      include: STOCK_INCLUDE,
    });
  }

  async search(companyId: number, query: string, limit = 20) {
    const trimmed = query.trim();
    if (!trimmed) return [];

    return this.prisma.stockPacket.findMany({
      where: {
        companyId,
        isDeleted: false,
        currentStatus: { in: [StockStatus.AVAILABLE, StockStatus.HOLD, StockStatus.JOB_WORK] },
        OR: [
          { stockIdNumber: { contains: trimmed } },
          { certificateNumber: { contains: trimmed } },
        ],
      },
      take: limit,
      orderBy: { stockIdNumber: 'asc' },
      select: {
        id: true,
        stockIdNumber: true,
        caratWeight: true,
        pieceCount: true,
        shape: true,
        color: true,
        clarity: true,
        currentStatus: true,
        qualityId: true,
        quality: { select: { qualityName: true } },
      },
    });
  }

  async get(id: number, companyId: number) {
    const packet = await this.prisma.stockPacket.findFirst({
      where: { id, companyId, isDeleted: false },
      include: {
        ...STOCK_INCLUDE,
        sourcePacket: {
          select: {
            id: true,
            stockIdNumber: true,
            caratWeight: true,
            qualityId: true,
            quality: { select: { id: true, qualityName: true, itemCode: true } },
            currentStatus: true,
          },
        },
        movements: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { movements: true, reservations: true, media: true } },
      },
    });
    if (!packet) throw new BadRequestException('Stock packet not found');
    return mapPacketWithMediaLinks(packet);
  }

  async previewStockId(companyId: number, financialYearId?: number) {
    return previewNextStockIdNumber(this.prisma, companyId, {}, financialYearId);
  }

  async getStockIdConfig(companyId: number) {
    const config = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, voucherType: 'STOCK_ENTRY' },
    });
    if (!config) {
      return {
        prefix: 'DM',
        separator: '-',
        includeYear: true,
        sequenceLength: 6,
      };
    }
    return {
      prefix: config.prefix || 'DM',
      separator: config.separator || '-',
      includeYear: config.includeYear,
      sequenceLength: config.digitLength,
    };
  }

  async saveStockIdConfig(companyId: number, financialYearId: number, data: { prefix: string; separator: string; includeYear: boolean; sequenceLength: number }) {
    const existing = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, voucherType: 'STOCK_ENTRY' },
    });

    if (existing) {
      return this.prisma.voucherNumberConfig.update({
        where: { id: existing.id },
        data: {
          prefix: data.prefix,
          separator: data.separator,
          includeYear: data.includeYear,
          digitLength: data.sequenceLength,
          financialYearId,
        },
      });
    } else {
      return this.prisma.voucherNumberConfig.create({
        data: {
          companyId,
          financialYearId,
          voucherType: 'STOCK_ENTRY',
          prefix: data.prefix,
          separator: data.separator,
          includeYear: data.includeYear,
          digitLength: data.sequenceLength,
        },
      });
    }
  }

  async getAllVoucherConfigs(companyId: number, _financialYearId: number) {
    const configs = await this.prisma.voucherNumberConfig.findMany({
      where: { companyId },
    });
    return configs;
  }

  private async scanMaxVoucherSequence(
    companyId: number,
    financialYearId: number,
    voucherType: VoucherType,
    pattern: string,
  ): Promise<number> {
    let list: string[] = [];

    if (voucherType === 'SALE_INVOICE' || voucherType === 'SALE_RETURN' || voucherType === 'SALE_DEBIT_NOTE') {
      const rows = await this.prisma.saleInvoice.findMany({
        where: { companyId, financialYearId, invoiceType: voucherType, voucherNumber: { startsWith: pattern } },
        select: { voucherNumber: true },
      });
      list = rows.map((r) => r.voucherNumber);
    } else if (voucherType === 'PURCHASE_INVOICE' || voucherType === 'PURCHASE_RETURN' || voucherType === 'PURCHASE_DEBIT_NOTE') {
      const rows = await this.prisma.purchaseInvoice.findMany({
        where: { companyId, financialYearId, invoiceType: voucherType, voucherNumber: { startsWith: pattern } },
        select: { voucherNumber: true },
      });
      list = rows.map((r) => r.voucherNumber);
    } else if (
      voucherType === 'MEMO_TRADING' ||
      voucherType === 'MEMO_JOB_WORK' ||
      voucherType === 'MEMO_SALE_ORDER' ||
      voucherType === 'MEMO_PURCHASE_ORDER' ||
      voucherType === 'MEMO_CERTIFICATION' ||
      voucherType === 'MEMO_INTERNAL'
    ) {
      let purpose = 'TRADING_JHANGHAD';
      if (voucherType === 'MEMO_JOB_WORK') purpose = 'JOB_WORK';
      else if (voucherType === 'MEMO_SALE_ORDER') purpose = 'SALE_ORDER';
      else if (voucherType === 'MEMO_PURCHASE_ORDER') purpose = 'PURCHASE_ORDER';
      else if (voucherType === 'MEMO_CERTIFICATION') purpose = 'CERTIFICATION';
      else if (voucherType === 'MEMO_INTERNAL') purpose = 'INTERNAL';

      const rows = await this.prisma.challanVoucher.findMany({
        where: { companyId, financialYearId, purpose: purpose as ChallanPurpose, voucherNumber: { startsWith: pattern } },
        select: { voucherNumber: true },
      });
      list = rows.map((r) => r.voucherNumber);
    } else if (voucherType === 'JOB_INCOME' || voucherType === 'JOB_EXPENSE') {
      const rows = await this.prisma.jobVoucher.findMany({
        where: { companyId, financialYearId, jobType: voucherType, voucherNumber: { startsWith: pattern } },
        select: { voucherNumber: true },
      });
      list = rows.map((r) => r.voucherNumber);
    } else if (voucherType === 'JOURNAL_VOUCHER') {
      const rows = await this.prisma.journalVoucher.findMany({
        where: { companyId, financialYearId, voucherNumber: { startsWith: pattern } },
        select: { voucherNumber: true },
      });
      list = rows.map((r) => r.voucherNumber);
    } else if (
      voucherType === 'CASH_PAYMENT' ||
      voucherType === 'CASH_RECEIPT' ||
      voucherType === 'BANK_PAYMENT' ||
      voucherType === 'BANK_RECEIPT'
    ) {
      const rows = await this.prisma.cashBankVoucher.findMany({
        where: { companyId, financialYearId, transactionType: voucherType, voucherNumber: { startsWith: pattern } },
        select: { voucherNumber: true },
      });
      list = rows.map((r) => r.voucherNumber);
    } else if (voucherType === 'LOAN_VOUCHER') {
      const rows = await this.prisma.loan.findMany({
        where: { companyId, financialYearId, voucherNumber: { startsWith: pattern } },
        select: { voucherNumber: true },
      });
      list = rows.map((r) => r.voucherNumber);
    } else if (voucherType === 'STOCK_ENTRY') {
      const rows = await this.prisma.stockPacket.findMany({
        where: { companyId, stockIdNumber: { startsWith: pattern } },
        select: { stockIdNumber: true },
      });
      list = rows.map((r) => r.stockIdNumber);
    }

    let maxSeq = 0;
    for (const val of list) {
      const segment = val.slice(pattern.length);
      const match = segment.match(/^(\d+)/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (parsed > maxSeq) {
          maxSeq = parsed;
        }
      }
    }
    return maxSeq;
  }

  async saveVoucherConfig(
    companyId: number,
    financialYearId: number,
    voucherType: VoucherType,
    data: { prefix: string; separator: string; suffix: string; digitLength: number; includeYear: boolean }
  ) {
    const existing = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, voucherType },
    });

    let formatChanged = false;
    if (existing) {
      if (
        existing.prefix !== data.prefix ||
        existing.separator !== data.separator ||
        existing.suffix !== data.suffix ||
        existing.digitLength !== data.digitLength ||
        existing.includeYear !== data.includeYear
      ) {
        formatChanged = true;
      }

      await this.prisma.voucherNumberConfig.update({
        where: { id: existing.id },
        data: {
          prefix: data.prefix,
          separator: data.separator,
          suffix: data.suffix,
          digitLength: data.digitLength,
          includeYear: data.includeYear,
        },
      });
    } else {
      formatChanged = true;
      await this.prisma.voucherNumberConfig.create({
        data: {
          companyId,
          financialYearId,
          voucherType,
          method: 'AUTOMATIC',
          prefix: data.prefix,
          separator: data.separator,
          suffix: data.suffix,
          digitLength: data.digitLength,
          includeYear: data.includeYear,
        },
      });
    }

    let message: string | null = null;

    if (formatChanged) {
      let yearSuffix = '';
      if (voucherType === 'STOCK_ENTRY') {
        const year = new Date().getFullYear();
        yearSuffix = String(year);
      } else {
        const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });
        if (fy) {
          const startYear = fy.fromDate.getFullYear();
          const endYear = fy.toDate.getFullYear();
          yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;
        }
      }

      const separator = data.separator || '-';
      const pattern = data.includeYear !== false
        ? `${data.prefix}${separator}${yearSuffix}${separator}`
        : `${data.prefix}${separator}`;

      const maxSeq = await this.scanMaxVoucherSequence(companyId, financialYearId, voucherType, pattern);

      if (maxSeq > 0) {
        message = `This prefix format was already used so entry will start from number ${maxSeq + 1}`;
        
        const sequence = await this.prisma.voucherNumberSequence.findFirst({
          where: { companyId, financialYearId, voucherType },
        });
        if (sequence) {
          await this.prisma.voucherNumberSequence.update({
            where: { id: sequence.id },
            data: { currentNumber: maxSeq },
          });
        } else {
          await this.prisma.voucherNumberSequence.create({
            data: {
              companyId,
              financialYearId,
              voucherType,
              currentNumber: maxSeq,
              lastGeneratedAt: new Date(),
            },
          });
        }
      } else {
        const sequence = await this.prisma.voucherNumberSequence.findFirst({
          where: { companyId, financialYearId, voucherType },
        });
        if (sequence) {
          await this.prisma.voucherNumberSequence.update({
            where: { id: sequence.id },
            data: { currentNumber: 0 },
          });
        }
      }
    }

    return { success: true, message };
  }

  /** Built-in shapes plus shapes previously used on stock packets for this company. */
  async listShapes(companyId: number): Promise<string[]> {
    const rows = await this.prisma.stockPacket.findMany({
      where: {
        companyId,
        isDeleted: false,
        shape: { not: null },
      },
      select: { shape: true },
      distinct: ['shape'],
      orderBy: { shape: 'asc' },
    });

    const customShapes = rows
      .map((row) => row.shape)
      .filter((shape): shape is string => Boolean(shape?.trim()));

    return mergeDiamondShapes(DEFAULT_DIAMOND_SHAPES, customShapes);
  }

  async timeline(id: number, companyId: number) {
    await this.get(id, companyId);
    return this.prisma.stockMovement.findMany({
      where: { stockPacketId: id },
      orderBy: [{ movementDate: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(companyId: number, data: Record<string, unknown>, userId?: number) {
    const qualityId = Number(data.qualityId);
    if (!qualityId) throw new BadRequestException('Quality is required');

    await this.validateQuality(companyId, qualityId);

    const category = (data.category as StockCategory) || StockCategory.NON_CERTIFIED;
    this.validateCertifiedCategory(category, data.certificateNumber as string | undefined);

    const caratWeight = Number(data.caratWeight);
    if (!caratWeight || caratWeight <= 0) {
      throw new BadRequestException('Carat weight must be greater than zero');
    }

    const pieceCount = Number(data.pieceCount) || 1;
    if (pieceCount < 1) throw new BadRequestException('Piece count must be at least 1');

    const stockIdNumber = await this.resolveStockIdNumber(
      companyId,
      data.stockIdNumber as string | undefined,
      data.financialYearId ? Number(data.financialYearId) : undefined
    );
    await this.validateUniqueStockId(companyId, stockIdNumber);
    await this.validateCertificateNumber(data.certificateNumber as string | undefined);

    const costPerCarat = Number(data.costPerCarat) || 0;
    const totalCost = data.totalCost != null ? Number(data.totalCost) : caratWeight * costPerCarat;
    const targetSaleRate = data.targetSaleRate != null && !isNaN(Number(data.targetSaleRate)) ? Number(data.targetSaleRate) : null;

    const registrationDate = data.registrationDate
      ? new Date(data.registrationDate as string)
      : new Date();

    const targetStatus =
      (data.currentStatus as StockStatus) || StockStatus.AVAILABLE;

    return this.prisma.$transaction(async (tx) => {
      const packet = await tx.stockPacket.create({
        data: {
          companyId,
          qualityId,
          stockIdNumber,
          category: ((data.category as StockCategory) || StockCategory.NON_CERTIFIED).toUpperCase() as StockCategory,
          registrationDate,
          shape: toUpperOrNull(data.shape),
          caratWeight,
          pieceCount,
          color: toUpperOrNull(data.color),
          clarity: toUpperOrNull(data.clarity),
          cut: toUpperOrNull(data.cut),
          polish: toUpperOrNull(data.polish),
          symmetry: toUpperOrNull(data.symmetry),
          lengthMm: toDecimalOrNull(data.lengthMm),
          widthMm: toDecimalOrNull(data.widthMm),
          depthMm: toDecimalOrNull(data.depthMm),
          totalDepthPct: toDecimalOrNull(data.totalDepthPct),
          tablePct: toDecimalOrNull(data.tablePct),
          certificateType: toUpperOrNull(data.certificateType),
          certificateNumber: emptyToNull(data.certificateNumber),
          costPerCarat,
          totalCost,
          targetSaleRate,
          currentStatus: targetStatus,
          currentOwnership: StockOwnership.COMPANY,
          currentLocation: toUpperOrNull(data.currentLocation),
          createdBy: userId ?? null,
        },
        include: STOCK_INCLUDE,
      });

      await this.recordMovement(tx, {
        stockPacketId: packet.id,
        movementDate: registrationDate,
        movementType: MovementType.STOCK_CREATION,
        previousStatus: StockStatus.CREATED,
        newStatus: targetStatus,
        carats: caratWeight,
        pieces: pieceCount,
        remarks: 'Stock packet registered',
        userId,
      });

      await this.syncMediaLinks(
        tx,
        packet.id,
        data.imageLink as string | undefined,
        data.videoLink as string | undefined,
      );

      const withMedia = await tx.stockPacket.findUnique({
        where: { id: packet.id },
        include: STOCK_INCLUDE,
      });
      return mapPacketWithMediaLinks(withMedia!);
    });
  }

  async update(id: number, companyId: number, data: Record<string, unknown>, userId?: number) {
    const existing = await this.get(id, companyId);

    if (!EDITABLE_STATUSES.includes(existing.currentStatus)) {
      throw new BadRequestException(
        `Cannot edit stock in "${existing.currentStatus}" status`,
      );
    }

    if (data.stockIdNumber && data.stockIdNumber !== existing.stockIdNumber) {
      throw new BadRequestException('Stock ID cannot be changed after creation');
    }

    const qualityId = data.qualityId != null ? Number(data.qualityId) : existing.qualityId;
    await this.validateQuality(companyId, qualityId);

    const category = (data.category as StockCategory) ?? existing.category;
    const certificateNumber =
      data.certificateNumber !== undefined
        ? emptyToNull(data.certificateNumber)
        : existing.certificateNumber;
    this.validateCertifiedCategory(category, certificateNumber ?? undefined);

    const caratWeight = data.caratWeight != null ? Number(data.caratWeight) : Number(existing.caratWeight);
    if (caratWeight <= 0) throw new BadRequestException('Carat weight must be greater than zero');

    const pieceCount = data.pieceCount != null ? Number(data.pieceCount) : existing.pieceCount;
    if (pieceCount < 1) throw new BadRequestException('Piece count must be at least 1');

    if (
      data.certificateNumber &&
      data.certificateNumber !== existing.certificateNumber
    ) {
      await this.validateCertificateNumber(data.certificateNumber as string, id);
    }

    const costPerCarat =
      data.costPerCarat != null ? Number(data.costPerCarat) : Number(existing.costPerCarat);
    const totalCost =
      data.totalCost != null ? Number(data.totalCost) : caratWeight * costPerCarat;
    const targetSaleRate =
      data.targetSaleRate !== undefined
        ? (data.targetSaleRate != null && !isNaN(Number(data.targetSaleRate)) ? Number(data.targetSaleRate) : null)
        : existing.targetSaleRate;

    const previousStatus = existing.currentStatus;
    const newStatus = (data.currentStatus as StockStatus) || previousStatus;

    return this.prisma.$transaction(async (tx) => {
      await tx.stockPacket.update({
        where: { id },
        data: {
          qualityId,
           category: data.category !== undefined ? (data.category as StockCategory)?.toUpperCase() as StockCategory : existing.category,
          registrationDate: data.registrationDate
            ? new Date(data.registrationDate as string)
            : existing.registrationDate,
          shape: data.shape !== undefined ? toUpperOrNull(data.shape) : existing.shape,
          caratWeight,
          pieceCount,
          color: data.color !== undefined ? toUpperOrNull(data.color) : existing.color,
          clarity: data.clarity !== undefined ? toUpperOrNull(data.clarity) : existing.clarity,
          cut: data.cut !== undefined ? toUpperOrNull(data.cut) : existing.cut,
          polish: data.polish !== undefined ? toUpperOrNull(data.polish) : existing.polish,
          symmetry: data.symmetry !== undefined ? toUpperOrNull(data.symmetry) : existing.symmetry,
          lengthMm: data.lengthMm !== undefined ? toDecimalOrNull(data.lengthMm) : existing.lengthMm,
          widthMm: data.widthMm !== undefined ? toDecimalOrNull(data.widthMm) : existing.widthMm,
          depthMm: data.depthMm !== undefined ? toDecimalOrNull(data.depthMm) : existing.depthMm,
          totalDepthPct:
            data.totalDepthPct !== undefined
              ? toDecimalOrNull(data.totalDepthPct)
              : existing.totalDepthPct,
          tablePct:
            data.tablePct !== undefined ? toDecimalOrNull(data.tablePct) : existing.tablePct,
          certificateType:
            data.certificateType !== undefined
              ? toUpperOrNull(data.certificateType)
              : existing.certificateType,
          certificateNumber:
            data.certificateNumber !== undefined
              ? emptyToNull(data.certificateNumber)
              : existing.certificateNumber,
          costPerCarat,
          totalCost,
          targetSaleRate,
          currentStatus: newStatus,
          currentLocation:
            data.currentLocation !== undefined
              ? toUpperOrNull(data.currentLocation)
              : existing.currentLocation,
          updatedBy: userId ?? null,
          version: { increment: 1 },
        },
        include: STOCK_INCLUDE,
      });

      if (newStatus !== previousStatus) {
        await this.recordMovement(tx, {
          stockPacketId: id,
          movementDate: new Date(),
          movementType: MovementType.MANUAL_ADJUSTMENT,
          previousStatus,
          newStatus,
          carats: caratWeight,
          pieces: pieceCount,
          remarks: (data.statusRemarks as string) || 'Status updated manually',
          userId,
        });
      }

      await this.syncMediaLinks(
        tx,
        id,
        data.imageLink as string | undefined,
        data.videoLink as string | undefined,
      );

      const withMedia = await tx.stockPacket.findUnique({
        where: { id },
        include: STOCK_INCLUDE,
      });
      return mapPacketWithMediaLinks(withMedia!);
    });
  }

  async delete(id: number, companyId: number, userId?: number) {
    const existing = await this.get(id, companyId);
    await this.assertStockCanBeDeleted(id);

    if (existing.currentStatus === StockStatus.SOLD) {
      throw new BadRequestException('Cannot delete stock that has been sold');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.recordMovement(tx, {
        stockPacketId: id,
        movementDate: new Date(),
        movementType: MovementType.ARCHIVE,
        previousStatus: existing.currentStatus,
        newStatus: StockStatus.ARCHIVED,
        carats: Number(existing.caratWeight),
        pieces: existing.pieceCount,
        remarks: 'Stock packet archived / deleted',
        userId,
      });

      return tx.stockPacket.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId ?? null,
          currentStatus: StockStatus.ARCHIVED,
        },
      });
    });
  }

  private async resolveStockIdNumber(companyId: number, manual?: string, financialYearId?: number): Promise<string> {
    const trimmed = manual?.trim();
    if (trimmed) return trimmed;
    return generateStockIdNumber(this.prisma, companyId, {}, financialYearId);
  }

  private async validateQuality(companyId: number, qualityId: number) {
    const quality = await this.prisma.quality.findFirst({
      where: { id: qualityId, companyId, isDeleted: false },
    });
    if (!quality) throw new BadRequestException('Invalid quality selection');
  }

  private validateCertifiedCategory(category: StockCategory, certificateNumber?: string) {
    if (category === StockCategory.CERTIFIED && !certificateNumber?.trim()) {
      throw new BadRequestException('Certificate number is required for certified stones');
    }
  }

  private async validateUniqueStockId(companyId: number, stockIdNumber: string, excludeId?: number) {
    const dup = await this.prisma.stockPacket.findFirst({
      where: {
        companyId,
        stockIdNumber,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (dup && !dup.isDeleted) {
      throw new BadRequestException(`Stock ID "${stockIdNumber}" already exists`);
    }
    if (dup?.isDeleted) {
      await this.purgeSoftDeletedPacket(dup.id);
    }
  }

  private async validateCertificateNumber(certNumber?: string, excludeId?: number) {
    const trimmed = certNumber?.trim();
    if (!trimmed) return;

    const dup = await this.prisma.stockPacket.findFirst({
      where: {
        certificateNumber: trimmed,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (dup && !dup.isDeleted) {
      throw new BadRequestException(`Certificate number "${trimmed}" is already in use`);
    }
  }

  private async assertStockCanBeDeleted(stockPacketId: number) {
    const [saleItems, purchaseItems, challanItems, jobItems, activeReservations] = await Promise.all([
      this.prisma.saleInvoiceItem.count({ where: { stockPacketId } }),
      this.prisma.purchaseInvoiceItem.count({ where: { stockPacketId } }),
      this.prisma.challanItem.count({ where: { stockPacketId } }),
      this.prisma.jobVoucherItem.count({ where: { stockPacketId } }),
      this.prisma.stockReservation.count({ where: { stockPacketId, isActive: true } }),
    ]);

    if (saleItems > 0) {
      throw new BadRequestException('Cannot delete stock referenced by sale invoices');
    }
    if (purchaseItems > 0) {
      throw new BadRequestException('Cannot delete stock referenced by purchase invoices');
    }
    if (challanItems > 0) {
      throw new BadRequestException('Cannot delete stock referenced by challan vouchers');
    }
    if (jobItems > 0) {
      throw new BadRequestException('Cannot delete stock referenced by job vouchers');
    }
    if (activeReservations > 0) {
      throw new BadRequestException('Cannot delete stock with active reservations');
    }
  }

  private async purgeSoftDeletedPacket(id: number) {
    await this.prisma.stockMovement.deleteMany({ where: { stockPacketId: id } });
    await this.prisma.stockReservation.deleteMany({ where: { stockPacketId: id } });
    await this.prisma.stockMedia.deleteMany({ where: { stockPacketId: id } });
    await this.prisma.stockPacket.delete({ where: { id } });
  }

  private async syncMediaLinks(
    tx: Tx,
    stockPacketId: number,
    imageLink?: string,
    videoLink?: string,
  ): Promise<void> {
    await tx.stockMedia.deleteMany({
      where: { stockPacketId, mediaType: { in: ['PHOTO', 'VIDEO'] } },
    });

    const photoUrl = imageLink?.trim();
    if (photoUrl) {
      await tx.stockMedia.create({
        data: {
          stockPacketId,
          mediaType: 'PHOTO',
          filePath: photoUrl,
          fileName: fileNameFromUrl(photoUrl, 'image'),
          sortOrder: 0,
        },
      });
    }

    const videoUrl = videoLink?.trim();
    if (videoUrl) {
      await tx.stockMedia.create({
        data: {
          stockPacketId,
          mediaType: 'VIDEO',
          filePath: videoUrl,
          fileName: fileNameFromUrl(videoUrl, 'video'),
          sortOrder: 1,
        },
      });
    }
  }

  private async recordMovement(
    tx: Tx,
    input: {
      stockPacketId: number;
      movementDate: Date;
      movementType: MovementType;
      previousStatus: StockStatus;
      newStatus: StockStatus;
      carats?: number;
      pieces?: number;
      remarks?: string;
      userId?: number;
    },
  ) {
    await tx.stockMovement.create({
      data: {
        stockPacketId: input.stockPacketId,
        movementDate: input.movementDate,
        movementType: input.movementType,
        previousStatus: input.previousStatus,
        newStatus: input.newStatus,
        carats: input.carats ?? null,
        pieces: input.pieces ?? null,
        remarks: input.remarks ?? null,
        userId: input.userId ?? null,
      },
    });
  }

  async importCsv(
    companyId: number,
    qualityId: number,
    rows: any[],
    userId?: number,
  ) {
    await this.validateQuality(companyId, qualityId);

    const imported: string[] = [];
    const skipped: Array<{ row: number; stockId: string; reason: string }> = [];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const stockIdNumber = row.stockIdNumber?.trim();
      const rowNum = index + 2;

      if (!stockIdNumber) {
        skipped.push({
          row: rowNum,
          stockId: '',
          reason: 'Missing Stock ID',
        });
        continue;
      }

      const existing = await this.prisma.stockPacket.findFirst({
        where: { companyId, stockIdNumber, isDeleted: false },
      });
      if (existing) {
        skipped.push({
          row: rowNum,
          stockId: stockIdNumber,
          reason: `Duplicate Stock ID "${stockIdNumber}" already exists`,
        });
        continue;
      }

      const certNumber = row.certificateNumber?.trim();
      if (certNumber) {
        const certExists = await this.prisma.stockPacket.findFirst({
          where: { companyId, certificateNumber: certNumber, isDeleted: false },
        });
        if (certExists) {
          skipped.push({
            row: rowNum,
            stockId: stockIdNumber,
            reason: `Certificate Number "${certNumber}" already exists`,
          });
          continue;
        }
      }

      try {
        const caratWeight = Number(row.caratWeight) || 0;
        const pieceCount = Number(row.pieceCount) || 1;
        const costPerCarat = Number(row.costPerCarat) || 0;
        const totalCost = row.totalCost != null && row.totalCost !== '' ? Number(row.totalCost) : caratWeight * costPerCarat;

        await this.prisma.$transaction(async (tx) => {
          const packet = await tx.stockPacket.create({
            data: {
              companyId,
              qualityId,
              stockIdNumber,
              category: ((row.category as StockCategory) || StockCategory.NON_CERTIFIED).toUpperCase() as StockCategory,
              registrationDate: new Date(),
              shape: toUpperOrNull(row.shape),
              caratWeight,
              pieceCount,
              color: toUpperOrNull(row.color),
              clarity: toUpperOrNull(row.clarity),
              cut: toUpperOrNull(row.cut),
              polish: toUpperOrNull(row.polish),
              symmetry: toUpperOrNull(row.symmetry),
              lengthMm: toDecimalOrNull(row.lengthMm),
              widthMm: toDecimalOrNull(row.widthMm),
              depthMm: toDecimalOrNull(row.depthMm),
              totalDepthPct: toDecimalOrNull(row.totalDepthPct),
              tablePct: toDecimalOrNull(row.tablePct),
              certificateType: toUpperOrNull(row.certificateType),
              certificateNumber: emptyToNull(row.certificateNumber),
              costPerCarat,
              totalCost,
              currentStatus: StockStatus.AVAILABLE,
              currentOwnership: 'COMPANY',
              createdBy: userId ?? null,
            },
          });

          await tx.stockMovement.create({
            data: {
              stockPacketId: packet.id,
              movementDate: new Date(),
              movementType: MovementType.STOCK_CREATION,
              previousStatus: StockStatus.CREATED,
              newStatus: StockStatus.AVAILABLE,
              carats: caratWeight,
              pieces: pieceCount,
              remarks: 'Imported via CSV',
              userId: userId ?? null,
            },
          });
        });

        imported.push(stockIdNumber);
      } catch (err: any) {
        skipped.push({
          row: rowNum,
          stockId: stockIdNumber,
          reason: err.message || 'Validation or database error',
        });
      }
    }

    return {
      success: true,
      importedCount: imported.length,
      skippedCount: skipped.length,
      skippedDetails: skipped,
    };
  }
}

function emptyToNull(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

function toUpperOrNull(value: unknown): string | null {
  const str = emptyToNull(value);
  return str ? str.toUpperCase() : null;
}

function toDecimalOrNull(value: unknown): number | null {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

type PacketWithMedia = {
  media?: Array<{ mediaType: string; filePath: string }>;
  [key: string]: unknown;
};

function mapPacketWithMediaLinks<T extends PacketWithMedia>(packet: T) {
  const photo = packet.media?.find((m) => m.mediaType === 'PHOTO');
  const video = packet.media?.find((m) => m.mediaType === 'VIDEO');
  return {
    ...packet,
    imageLink: photo?.filePath ?? null,
    videoLink: video?.filePath ?? null,
  };
}

function fileNameFromUrl(url: string, fallback: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segment = pathname.split('/').filter(Boolean).pop();
    return segment && segment.length > 0 ? segment.slice(0, 255) : fallback;
  } catch {
    return fallback;
  }
}
