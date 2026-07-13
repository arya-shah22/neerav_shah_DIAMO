// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Service (Stage 3 Inventory)
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import {
  MovementType,
  StockCategory,
  StockOwnership,
  StockStatus,
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
              ],
            }
          : {}),
      },
      orderBy: [{ registrationDate: 'desc' }, { stockIdNumber: 'desc' }],
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
        currentStatus: { in: [StockStatus.AVAILABLE, StockStatus.HOLD] },
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
        movements: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { movements: true, reservations: true, media: true } },
      },
    });
    if (!packet) throw new BadRequestException('Stock packet not found');
    return mapPacketWithMediaLinks(packet);
  }

  async previewStockId(companyId: number) {
    return previewNextStockIdNumber(this.prisma, companyId);
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

    const stockIdNumber = await this.resolveStockIdNumber(companyId, data.stockIdNumber as string | undefined);
    await this.validateUniqueStockId(companyId, stockIdNumber);
    await this.validateCertificateNumber(data.certificateNumber as string | undefined);

    const costPerCarat = Number(data.costPerCarat) || 0;
    const totalCost = data.totalCost != null ? Number(data.totalCost) : caratWeight * costPerCarat;

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
          category: (data.category as StockCategory) || StockCategory.NON_CERTIFIED,
          registrationDate,
          shape: emptyToNull(data.shape),
          caratWeight,
          pieceCount,
          color: emptyToNull(data.color),
          clarity: toUpperOrNull(data.clarity),
          cut: toUpperOrNull(data.cut),
          polish: toUpperOrNull(data.polish),
          symmetry: toUpperOrNull(data.symmetry),
          lengthMm: toDecimalOrNull(data.lengthMm),
          widthMm: toDecimalOrNull(data.widthMm),
          depthMm: toDecimalOrNull(data.depthMm),
          totalDepthPct: toDecimalOrNull(data.totalDepthPct),
          tablePct: toDecimalOrNull(data.tablePct),
          certificateType: emptyToNull(data.certificateType),
          certificateNumber: emptyToNull(data.certificateNumber),
          costPerCarat,
          totalCost,
          currentStatus: targetStatus,
          currentOwnership: StockOwnership.COMPANY,
          currentLocation: emptyToNull(data.currentLocation),
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

    const previousStatus = existing.currentStatus;
    const newStatus = (data.currentStatus as StockStatus) || previousStatus;

    return this.prisma.$transaction(async (tx) => {
      await tx.stockPacket.update({
        where: { id },
        data: {
          qualityId,
          category: (data.category as StockCategory) ?? existing.category,
          registrationDate: data.registrationDate
            ? new Date(data.registrationDate as string)
            : existing.registrationDate,
          shape: data.shape !== undefined ? emptyToNull(data.shape) : existing.shape,
          caratWeight,
          pieceCount,
          color: data.color !== undefined ? emptyToNull(data.color) : existing.color,
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
              ? emptyToNull(data.certificateType)
              : existing.certificateType,
          certificateNumber:
            data.certificateNumber !== undefined
              ? emptyToNull(data.certificateNumber)
              : existing.certificateNumber,
          costPerCarat,
          totalCost,
          currentStatus: newStatus,
          currentLocation:
            data.currentLocation !== undefined
              ? emptyToNull(data.currentLocation)
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

  private async resolveStockIdNumber(companyId: number, manual?: string): Promise<string> {
    const trimmed = manual?.trim();
    if (trimmed) return trimmed;
    return generateStockIdNumber(this.prisma, companyId);
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
              category: (row.category as StockCategory) || StockCategory.NON_CERTIFIED,
              registrationDate: new Date(),
              shape: emptyToNull(row.shape),
              caratWeight,
              pieceCount,
              color: emptyToNull(row.color),
              clarity: toUpperOrNull(row.clarity),
              cut: toUpperOrNull(row.cut),
              polish: toUpperOrNull(row.polish),
              symmetry: toUpperOrNull(row.symmetry),
              lengthMm: toDecimalOrNull(row.lengthMm),
              widthMm: toDecimalOrNull(row.widthMm),
              depthMm: toDecimalOrNull(row.depthMm),
              totalDepthPct: toDecimalOrNull(row.totalDepthPct),
              tablePct: toDecimalOrNull(row.tablePct),
              certificateType: emptyToNull(row.certificateType),
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
