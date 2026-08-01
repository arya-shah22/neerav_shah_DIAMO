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

import { syncStockMeasurements } from '../../../shared/utils/diamond-measurement';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

export interface StockListFilters {
  search?: string;
  status?: StockStatus;
  category?: StockCategory;
  qualityId?: number;
}

const STOCK_INCLUDE = {
  quality: { select: { id: true, qualityName: true } },
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
            quality: { select: { id: true, qualityName: true } },
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

  async getAllVoucherConfigs(companyId: number, financialYearId: number) {
    const configs = await this.prisma.voucherNumberConfig.findMany({
      where: { companyId, financialYearId },
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
    data: { prefix: string; separator: string; suffix: string; digitLength: number; includeYear: boolean; includeMonth?: boolean }
  ) {
    const existing = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, financialYearId, voucherType },
    });

    let formatChanged = false;
    if (existing) {
      if (
        existing.prefix !== data.prefix ||
        existing.separator !== data.separator ||
        existing.suffix !== data.suffix ||
        existing.digitLength !== data.digitLength ||
        existing.includeYear !== data.includeYear ||
        existing.includeMonth !== data.includeMonth
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
          includeMonth: data.includeMonth ?? false,
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
          includeMonth: data.includeMonth ?? false,
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
    await this.validateCertificateNumber(companyId, data.certificateNumber as string | undefined);

    const costPerCarat = Number(data.costPerCarat) || 0;
    const totalCost = data.totalCost != null ? Number(data.totalCost) : caratWeight * costPerCarat;
    const targetSaleRate = data.targetSaleRate != null && !isNaN(Number(data.targetSaleRate)) ? Number(data.targetSaleRate) : null;

    const registrationDate = data.registrationDate
      ? new Date(data.registrationDate as string)
      : new Date();

    const targetStatus =
      (data.currentStatus as StockStatus) || StockStatus.AVAILABLE;

    const measurementsData = syncStockMeasurements(data);

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
          lengthMm: toDecimalOrNull(measurementsData.lengthMm),
          widthMm: toDecimalOrNull(measurementsData.widthMm),
          depthMm: toDecimalOrNull(measurementsData.depthMm),
          measurements: measurementsData.measurements,
          totalDepthPct: toDecimalOrNull(data.totalDepthPct),
          tablePct: toDecimalOrNull(data.tablePct),
          girdlePct: toDecimalOrNull(data.girdlePct),
          // Extended Diamond Details
          fluorescenceIntensity: toUpperOrNull(data.fluorescenceIntensity),
          fluorescenceColor: toUpperOrNull(data.fluorescenceColor),
          rapPricePerCarat: toDecimalOrNull(data.rapPricePerCarat),
          rapDiscountPct: toDecimalOrNull(data.rapDiscountPct),
          crownAngle: toDecimalOrNull(data.crownAngle),
          crownHeight: toDecimalOrNull(data.crownHeight),
          pavilionAngle: toDecimalOrNull(data.pavilionAngle),
          pavilionDepth: toDecimalOrNull(data.pavilionDepth),
          girdleMin: toUpperOrNull(data.girdleMin),
          girdleMax: toUpperOrNull(data.girdleMax),
          girdleCondition: toUpperOrNull(data.girdleCondition),
          culetSize: toUpperOrNull(data.culetSize),
          culetCondition: toUpperOrNull(data.culetCondition),
          heartsAndArrows: toUpperOrNull(data.heartsAndArrows),
          eyeClean: toUpperOrNull(data.eyeClean),
          shade: toUpperOrNull(data.shade),
          milky: toUpperOrNull(data.milky),
          treatment: toUpperOrNull(data.treatment),
          tinge: toUpperOrNull(data.tinge),
          lustre: toUpperOrNull(data.lustre),
          tableInclusion: toUpperOrNull(data.tableInclusion),
          sideInclusion: toUpperOrNull(data.sideInclusion),
          tableOpen: toUpperOrNull(data.tableOpen),
          crownOpen: toUpperOrNull(data.crownOpen),
          girdleOpen: toUpperOrNull(data.girdleOpen),
          origin: toUpperOrNull(data.origin),
          certificateUrl: emptyToNull(data.certificateUrl),
          webUrl: emptyToNull(data.webUrl),
          inscription: emptyToNull(data.inscription),
          keyToSymbols: emptyToNull(data.keyToSymbols),
          diamondComment: emptyToNull(data.diamondComment),
          fancyColor: toUpperOrNull(data.fancyColor),
          fancyColorIntensity: toUpperOrNull(data.fancyColorIntensity),
          fancyColorOvertone: toUpperOrNull(data.fancyColorOvertone),
          availability: toUpperOrNull(data.availability),
          city: toUpperOrNull(data.city),
          state: toUpperOrNull(data.state),
          tradeShow: toUpperOrNull(data.tradeShow),
          brand: toUpperOrNull(data.brand),
          sellerSpec: emptyToNull(data.sellerSpec),
          pairStockNumber: emptyToNull(data.pairStockNumber),
          isPairSeparable: toUpperOrNull(data.isPairSeparable),
          parcelStones: emptyToNull(data.parcelStones),
          reportFilename: emptyToNull(data.reportFilename),
          reportIssueDate: emptyToNull(data.reportIssueDate),
          labLocation: toUpperOrNull(data.labLocation),
          certComment: emptyToNull(data.certComment),
          memberComment: emptyToNull(data.memberComment),
          allowRaplinkFeed: toUpperOrNull(data.allowRaplinkFeed),
          sarineLoupe: emptyToNull(data.sarineLoupe),
          reportType: toUpperOrNull(data.reportType),
          diamondType: toUpperOrNull(data.diamondType),
          blackInclusion: toUpperOrNull(data.blackInclusion),
          whiteInclusion: toUpperOrNull(data.whiteInclusion),
          openInclusion: toUpperOrNull(data.openInclusion),
          starLength: toDecimalOrNull(data.starLength),
          growthType: toUpperOrNull(data.growthType),
          bgm: toUpperOrNull(data.bgm),
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
      await this.validateCertificateNumber(companyId, data.certificateNumber as string, id);
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

    const mergedMeasurements = syncStockMeasurements({
      lengthMm: data.lengthMm !== undefined ? data.lengthMm : existing.lengthMm,
      widthMm: data.widthMm !== undefined ? data.widthMm : existing.widthMm,
      depthMm: data.depthMm !== undefined ? data.depthMm : existing.depthMm,
      measurements: data.measurements !== undefined ? data.measurements : existing.measurements,
      shape: data.shape !== undefined ? data.shape : existing.shape,
    });

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
          lengthMm: toDecimalOrNull(mergedMeasurements.lengthMm),
          widthMm: toDecimalOrNull(mergedMeasurements.widthMm),
          depthMm: toDecimalOrNull(mergedMeasurements.depthMm),
          measurements: mergedMeasurements.measurements,
          totalDepthPct:
            data.totalDepthPct !== undefined
              ? toDecimalOrNull(data.totalDepthPct)
              : existing.totalDepthPct,
          tablePct:
            data.tablePct !== undefined ? toDecimalOrNull(data.tablePct) : existing.tablePct,
          girdlePct:
            data.girdlePct !== undefined ? toDecimalOrNull(data.girdlePct) : existing.girdlePct,
          // Extended Diamond Details
          fluorescenceIntensity: data.fluorescenceIntensity !== undefined ? toUpperOrNull(data.fluorescenceIntensity) : existing.fluorescenceIntensity,
          fluorescenceColor: data.fluorescenceColor !== undefined ? toUpperOrNull(data.fluorescenceColor) : existing.fluorescenceColor,
          rapPricePerCarat: data.rapPricePerCarat !== undefined ? toDecimalOrNull(data.rapPricePerCarat) : existing.rapPricePerCarat,
          rapDiscountPct: data.rapDiscountPct !== undefined ? toDecimalOrNull(data.rapDiscountPct) : existing.rapDiscountPct,
          crownAngle: data.crownAngle !== undefined ? toDecimalOrNull(data.crownAngle) : existing.crownAngle,
          crownHeight: data.crownHeight !== undefined ? toDecimalOrNull(data.crownHeight) : existing.crownHeight,
          pavilionAngle: data.pavilionAngle !== undefined ? toDecimalOrNull(data.pavilionAngle) : existing.pavilionAngle,
          pavilionDepth: data.pavilionDepth !== undefined ? toDecimalOrNull(data.pavilionDepth) : existing.pavilionDepth,
          girdleMin: data.girdleMin !== undefined ? toUpperOrNull(data.girdleMin) : existing.girdleMin,
          girdleMax: data.girdleMax !== undefined ? toUpperOrNull(data.girdleMax) : existing.girdleMax,
          girdleCondition: data.girdleCondition !== undefined ? toUpperOrNull(data.girdleCondition) : existing.girdleCondition,
          culetSize: data.culetSize !== undefined ? toUpperOrNull(data.culetSize) : existing.culetSize,
          culetCondition: data.culetCondition !== undefined ? toUpperOrNull(data.culetCondition) : existing.culetCondition,
          heartsAndArrows: data.heartsAndArrows !== undefined ? toUpperOrNull(data.heartsAndArrows) : existing.heartsAndArrows,
          eyeClean: data.eyeClean !== undefined ? toUpperOrNull(data.eyeClean) : existing.eyeClean,
          shade: data.shade !== undefined ? toUpperOrNull(data.shade) : existing.shade,
          milky: data.milky !== undefined ? toUpperOrNull(data.milky) : existing.milky,
          treatment: data.treatment !== undefined ? toUpperOrNull(data.treatment) : existing.treatment,
          tinge: data.tinge !== undefined ? toUpperOrNull(data.tinge) : existing.tinge,
          lustre: data.lustre !== undefined ? toUpperOrNull(data.lustre) : existing.lustre,
          tableInclusion: data.tableInclusion !== undefined ? toUpperOrNull(data.tableInclusion) : existing.tableInclusion,
          sideInclusion: data.sideInclusion !== undefined ? toUpperOrNull(data.sideInclusion) : existing.sideInclusion,
          tableOpen: data.tableOpen !== undefined ? toUpperOrNull(data.tableOpen) : existing.tableOpen,
          crownOpen: data.crownOpen !== undefined ? toUpperOrNull(data.crownOpen) : existing.crownOpen,
          girdleOpen: data.girdleOpen !== undefined ? toUpperOrNull(data.girdleOpen) : existing.girdleOpen,
          origin: data.origin !== undefined ? toUpperOrNull(data.origin) : existing.origin,
          certificateUrl: data.certificateUrl !== undefined ? emptyToNull(data.certificateUrl) : existing.certificateUrl,
          webUrl: data.webUrl !== undefined ? emptyToNull(data.webUrl) : existing.webUrl,
          inscription: data.inscription !== undefined ? emptyToNull(data.inscription) : existing.inscription,
          keyToSymbols: data.keyToSymbols !== undefined ? emptyToNull(data.keyToSymbols) : existing.keyToSymbols,
          diamondComment: data.diamondComment !== undefined ? emptyToNull(data.diamondComment) : existing.diamondComment,
          fancyColor: data.fancyColor !== undefined ? toUpperOrNull(data.fancyColor) : existing.fancyColor,
          fancyColorIntensity: data.fancyColorIntensity !== undefined ? toUpperOrNull(data.fancyColorIntensity) : existing.fancyColorIntensity,
          fancyColorOvertone: data.fancyColorOvertone !== undefined ? toUpperOrNull(data.fancyColorOvertone) : existing.fancyColorOvertone,
          availability: data.availability !== undefined ? toUpperOrNull(data.availability) : existing.availability,
          city: data.city !== undefined ? toUpperOrNull(data.city) : existing.city,
          state: data.state !== undefined ? toUpperOrNull(data.state) : existing.state,
          tradeShow: data.tradeShow !== undefined ? toUpperOrNull(data.tradeShow) : existing.tradeShow,
          brand: data.brand !== undefined ? toUpperOrNull(data.brand) : existing.brand,
          sellerSpec: data.sellerSpec !== undefined ? emptyToNull(data.sellerSpec) : existing.sellerSpec,
          pairStockNumber: data.pairStockNumber !== undefined ? emptyToNull(data.pairStockNumber) : existing.pairStockNumber,
          isPairSeparable: data.isPairSeparable !== undefined ? toUpperOrNull(data.isPairSeparable) : existing.isPairSeparable,
          parcelStones: data.parcelStones !== undefined ? emptyToNull(data.parcelStones) : existing.parcelStones,
          reportFilename: data.reportFilename !== undefined ? emptyToNull(data.reportFilename) : existing.reportFilename,
          reportIssueDate: data.reportIssueDate !== undefined ? emptyToNull(data.reportIssueDate) : existing.reportIssueDate,
          labLocation: data.labLocation !== undefined ? toUpperOrNull(data.labLocation) : existing.labLocation,
          certComment: data.certComment !== undefined ? emptyToNull(data.certComment) : existing.certComment,
          memberComment: data.memberComment !== undefined ? emptyToNull(data.memberComment) : existing.memberComment,
          allowRaplinkFeed: data.allowRaplinkFeed !== undefined ? toUpperOrNull(data.allowRaplinkFeed) : existing.allowRaplinkFeed,
          sarineLoupe: data.sarineLoupe !== undefined ? emptyToNull(data.sarineLoupe) : existing.sarineLoupe,
          reportType: data.reportType !== undefined ? toUpperOrNull(data.reportType) : existing.reportType,
          diamondType: data.diamondType !== undefined ? toUpperOrNull(data.diamondType) : existing.diamondType,
          blackInclusion: data.blackInclusion !== undefined ? toUpperOrNull(data.blackInclusion) : existing.blackInclusion,
          whiteInclusion: data.whiteInclusion !== undefined ? toUpperOrNull(data.whiteInclusion) : existing.whiteInclusion,
          openInclusion: data.openInclusion !== undefined ? toUpperOrNull(data.openInclusion) : existing.openInclusion,
          starLength: data.starLength !== undefined ? toDecimalOrNull(data.starLength) : existing.starLength,
          growthType: data.growthType !== undefined ? toUpperOrNull(data.growthType) : existing.growthType,
          bgm: data.bgm !== undefined ? toUpperOrNull(data.bgm) : existing.bgm,
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

  private async validateCertificateNumber(companyId: number, certNumber?: string, excludeId?: number) {
    const trimmed = certNumber?.trim();
    if (!trimmed) return;

    const dup = await this.prisma.stockPacket.findFirst({
      where: {
        companyId,
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
        where: { companyId, stockIdNumber },
      });
      if (existing) {
        if (!existing.isDeleted) {
          skipped.push({
            row: rowNum,
            stockId: stockIdNumber,
            reason: `Duplicate Stock ID "${stockIdNumber}" already exists`,
          });
          continue;
        } else {
          // If previous stock was soft-deleted / archived, purge it so it can be re-imported
          await this.purgeSoftDeletedPacket(existing.id);
        }
      }

      const certNumber = row.certificateNumber?.trim();
      if (certNumber) {
        const certExists = await this.prisma.stockPacket.findFirst({
          where: { companyId, certificateNumber: certNumber },
        });
        if (certExists) {
          if (!certExists.isDeleted) {
            skipped.push({
              row: rowNum,
              stockId: stockIdNumber,
              reason: `Certificate Number "${certNumber}" already exists`,
            });
            continue;
          } else {
            // Purge archived packet with same cert number so new stone can be registered
            await this.purgeSoftDeletedPacket(certExists.id);
          }
        }
      }

      try {
        const caratWeight = Number(row.caratWeight) || 0;
        const pieceCount = Number(row.pieceCount) || 1;
        const costPerCarat = Number(row.costPerCarat) || 0;
        const totalCost = row.totalCost != null && row.totalCost !== '' ? Number(row.totalCost) : caratWeight * costPerCarat;

        const measurementsData = syncStockMeasurements(row);

        // Determine initial status based on imported availability column
        let initialStatus: StockStatus = StockStatus.AVAILABLE;
        const avail = String(row.availability || '').toUpperCase();
        if (avail.includes('HOLD') || avail.includes('MEMO') || avail.includes('RESERVED') || avail.includes('PENDING')) {
          initialStatus = StockStatus.HOLD;
        } else if (avail.includes('SOLD')) {
          initialStatus = StockStatus.SOLD;
        }

        await this.prisma.$transaction(async (tx) => {
          const hasCert = !!(row.certificateNumber || row.certificateType);
          const computedCategory: StockCategory = hasCert
            ? StockCategory.CERTIFIED
            : (row.category ? ((row.category as string).toUpperCase() as StockCategory) : StockCategory.NON_CERTIFIED);

          const packet = await tx.stockPacket.create({
                data: {
                  companyId,
                  qualityId,
                  stockIdNumber,
                  category: computedCategory,
                  registrationDate: new Date(),
                  shape: toUpperOrNull(row.shape),
                  caratWeight,
                  pieceCount,
                  color: toUpperOrNull(row.color),
                  clarity: toUpperOrNull(row.clarity),
                  cut: toUpperOrNull(row.cut),
                  polish: toUpperOrNull(row.polish),
                  symmetry: toUpperOrNull(row.symmetry),
                  lengthMm: toDecimalOrNull(measurementsData.lengthMm),
                  widthMm: toDecimalOrNull(measurementsData.widthMm),
                  depthMm: toDecimalOrNull(measurementsData.depthMm),
                  measurements: measurementsData.measurements,
                  totalDepthPct: toDecimalOrNull(row.totalDepthPct),
                  tablePct: toDecimalOrNull(row.tablePct),
                  girdlePct: toDecimalOrNull(row.girdlePct),
                  // Extended Diamond Details
                  fluorescenceIntensity: toUpperOrNull(row.fluorescenceIntensity),
                  fluorescenceColor: toUpperOrNull(row.fluorescenceColor),
                  rapPricePerCarat: toDecimalOrNull(row.rapPricePerCarat),
                  rapDiscountPct: toDecimalOrNull(row.rapDiscountPct),
                  crownAngle: toDecimalOrNull(row.crownAngle),
                  crownHeight: toDecimalOrNull(row.crownHeight),
                  pavilionAngle: toDecimalOrNull(row.pavilionAngle),
                  pavilionDepth: toDecimalOrNull(row.pavilionDepth),
                  girdleMin: toUpperOrNull(row.girdleMin),
                  girdleMax: toUpperOrNull(row.girdleMax),
                  girdleCondition: toUpperOrNull(row.girdleCondition),
                  culetSize: toUpperOrNull(row.culetSize),
                  culetCondition: toUpperOrNull(row.culetCondition),
                  heartsAndArrows: toUpperOrNull(row.heartsAndArrows),
                  eyeClean: toUpperOrNull(row.eyeClean),
                  shade: toUpperOrNull(row.shade),
                  milky: toUpperOrNull(row.milky),
                  treatment: toUpperOrNull(row.treatment),
                  tinge: toUpperOrNull(row.tinge),
                  lustre: toUpperOrNull(row.lustre),
                  tableInclusion: toUpperOrNull(row.tableInclusion),
                  sideInclusion: toUpperOrNull(row.sideInclusion),
                  tableOpen: toUpperOrNull(row.tableOpen),
                  crownOpen: toUpperOrNull(row.crownOpen),
                  girdleOpen: toUpperOrNull(row.girdleOpen),
                  origin: toUpperOrNull(row.origin),
                  certificateUrl: emptyToNull(row.certificateUrl),
                  webUrl: emptyToNull(row.webUrl),
                  inscription: emptyToNull(row.inscription),
                  keyToSymbols: emptyToNull(row.keyToSymbols),
                  diamondComment: emptyToNull(row.diamondComment),
                  fancyColor: toUpperOrNull(row.fancyColor),
                  fancyColorIntensity: toUpperOrNull(row.fancyColorIntensity),
                  fancyColorOvertone: toUpperOrNull(row.fancyColorOvertone),
                  availability: toUpperOrNull(row.availability),
                  city: toUpperOrNull(row.city),
                  state: toUpperOrNull(row.state),
                  tradeShow: toUpperOrNull(row.tradeShow),
                  brand: toUpperOrNull(row.brand),
                  sellerSpec: emptyToNull(row.sellerSpec),
                  pairStockNumber: emptyToNull(row.pairStockNumber),
                  isPairSeparable: toUpperOrNull(row.isPairSeparable),
                  parcelStones: emptyToNull(row.parcelStones),
                  reportFilename: emptyToNull(row.reportFilename),
                  reportIssueDate: emptyToNull(row.reportIssueDate),
                  labLocation: toUpperOrNull(row.labLocation),
                  certComment: emptyToNull(row.certComment),
                  memberComment: emptyToNull(row.memberComment),
                  allowRaplinkFeed: toUpperOrNull(row.allowRaplinkFeed),
                  sarineLoupe: emptyToNull(row.sarineLoupe),
                  reportType: toUpperOrNull(row.reportType),
                  diamondType: toUpperOrNull(row.diamondType),
                  blackInclusion: toUpperOrNull(row.blackInclusion),
                  whiteInclusion: toUpperOrNull(row.whiteInclusion),
                  openInclusion: toUpperOrNull(row.openInclusion),
                  starLength: toDecimalOrNull(row.starLength),
                  growthType: toUpperOrNull(row.growthType),
                  bgm: toUpperOrNull(row.bgm),
                  certificateType: toUpperOrNull(row.certificateType),
                  certificateNumber: emptyToNull(row.certificateNumber),
                  costPerCarat,
                  totalCost,
                  currentStatus: initialStatus,
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
                  newStatus: initialStatus,
                  carats: caratWeight,
                  pieces: pieceCount,
                  remarks: 'Imported via CSV',
                  userId: userId ?? null,
                },
              });

            await this.syncMediaLinks(
              tx,
              packet.id,
              row.imageLink as string | undefined,
              row.videoLink as string | undefined,
            );
          });

          imported.push(stockIdNumber);
      } catch (err: any) {
        let reason = err.message || 'Validation or database error';
        if (reason.includes('UQ_stock_packets_id_number') || reason.includes('stock_id_number')) {
          reason = `Duplicate Stock ID "${stockIdNumber}" already exists`;
        } else if (reason.includes('certificate_number') || reason.includes('certificateNumber')) {
          reason = `Certificate Number "${row.certificateNumber || ''}" is already in use`;
        } else if (reason.includes('column is too long')) {
          reason = 'Column value is too long';
        }
        skipped.push({
          row: rowNum,
          stockId: stockIdNumber,
          reason,
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
  if (typeof value === 'number') return Number.isNaN(value) ? null : value;
  const cleanStr = String(value).replace(/%/g, '').replace(/,/g, '').trim();
  const num = Number(cleanStr);
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
