// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Conversion Service (Quality Transformation)
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StockStatus, MovementType } from '@prisma/client';
import { generateStockIdNumber } from '../../utils/stock-id-generator';

const CONVERSION_INCLUDE = {
  sourcePacket: {
    include: { quality: { select: { id: true, qualityName: true, itemCode: true } } },
  },
  sourceQuality: { select: { id: true, qualityName: true, itemCode: true } },
  outputItems: {
    include: {
      outputPacket: {
        include: { quality: { select: { id: true, qualityName: true, itemCode: true } } },
      },
      outputQuality: { select: { id: true, qualityName: true, itemCode: true } },
    },
    orderBy: { rowNumber: 'asc' as const },
  },
};

@Injectable()
export class StockConversionService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  /**
   * List all stock conversions for a company
   */
  async list(companyId: number) {
    return this.prisma.stockConversion.findMany({
      where: { companyId, isDeleted: false },
      orderBy: [{ conversionDate: 'desc' }, { id: 'desc' }],
      include: CONVERSION_INCLUDE,
    });
  }

  /**
   * Get a single conversion by ID
   */
  async get(id: number, companyId: number) {
    const conversion = await this.prisma.stockConversion.findFirst({
      where: { id, companyId, isDeleted: false },
      include: CONVERSION_INCLUDE,
    });
    if (!conversion) throw new BadRequestException('Stock conversion not found');
    return conversion;
  }

  /**
   * Get all conversions linked to a specific stock packet (as source or output)
   */
  async getByPacket(packetId: number, companyId: number) {
    const asSource = await this.prisma.stockConversion.findMany({
      where: { companyId, sourcePacketId: packetId, isDeleted: false },
      include: CONVERSION_INCLUDE,
    });

    const asOutput = await this.prisma.stockConversionOutput.findMany({
      where: { outputPacketId: packetId },
      include: {
        stockConversion: {
          include: CONVERSION_INCLUDE,
        },
      },
    });

    return {
      asSource,
      asOutput: asOutput.map((o) => o.stockConversion).filter((c) => !c.isDeleted),
    };
  }

  /**
   * Generate a sequential conversion number
   */
  private async generateConversionNumber(companyId: number): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const prefix = company?.companyCode || 'CONV';

    const lastConversion = await this.prisma.stockConversion.findFirst({
      where: { companyId },
      orderBy: { id: 'desc' },
    });

    const nextNum = lastConversion ? lastConversion.id + 1 : 1;
    return `${prefix}-CONV-${String(nextNum).padStart(6, '0')}`;
  }

  /**
   * Create a stock quality conversion
   */
  async create(companyId: number, data: Record<string, any>) {
    const sourcePacketId = Number(data.sourcePacketId);
    const conversionDate = new Date(data.conversionDate);
    const isFullConsumption = data.isFullConsumption !== false; // default true
    const narration = data.narration || null;
    const processingCost = Number(data.processingCost) || 0;
    const jobVoucherId = data.jobVoucherId ? Number(data.jobVoucherId) : null;
    const challanVoucherId = data.challanVoucherId ? Number(data.challanVoucherId) : null;
    const outputItems = Array.isArray(data.outputItems) ? data.outputItems : [];

    // Validate source packet
    const sourcePacket = await this.prisma.stockPacket.findFirst({
      where: { id: sourcePacketId, companyId, isDeleted: false },
      include: { quality: true },
    });

    if (!sourcePacket) {
      throw new BadRequestException('Source stock packet not found');
    }

    if (sourcePacket.currentStatus !== StockStatus.AVAILABLE && sourcePacket.currentStatus !== StockStatus.JOB_WORK) {
      throw new BadRequestException(`Source packet must be AVAILABLE or JOB_WORK status. Current: ${sourcePacket.currentStatus}`);
    }

    if (outputItems.length === 0) {
      throw new BadRequestException('At least one output item is required');
    }

    // Calculate totals
    let totalOutputCarats = 0;
    for (const item of outputItems) {
      const carats = Number(item.carats) || 0;
      if (carats <= 0) throw new BadRequestException('Each output item must have carats > 0');
      totalOutputCarats += carats;
    }

    const sourceCarats = Number(sourcePacket.caratWeight);
    const consumedCarats = isFullConsumption ? sourceCarats : (Number(data.consumedCarats) || totalOutputCarats);

    if (totalOutputCarats > consumedCarats) {
      throw new BadRequestException(`Total output carats (${totalOutputCarats.toFixed(3)}) cannot exceed consumed carats (${consumedCarats.toFixed(3)})`);
    }

    if (consumedCarats > sourceCarats) {
      throw new BadRequestException(`Consumed carats (${consumedCarats.toFixed(3)}) cannot exceed source packet carats (${sourceCarats.toFixed(3)})`);
    }

    const weightLoss = consumedCarats - totalOutputCarats;
    const lossPercentage = consumedCarats > 0 ? (weightLoss / consumedCarats) * 100 : 0;
    const remainingCarats = sourceCarats - consumedCarats;

    const conversionNumber = await this.generateConversionNumber(companyId);

    return this.prisma.$transaction(async (tx) => {
      // Create the conversion record
      const conversion = await tx.stockConversion.create({
        data: {
          companyId,
          conversionDate,
          conversionNumber,
          sourcePacketId,
          sourceQualityId: sourcePacket.qualityId,
          sourceCarats,
          sourceCost: Number(sourcePacket.totalCost),
          isFullConsumption,
          consumedCarats,
          remainingCarats,
          jobVoucherId,
          challanVoucherId,
          processingCost,
          totalOutputCarats,
          weightLoss,
          lossPercentage,
          narration,
        },
      });

      // Calculate total input investment (consumed rough cost + processing charges)
      const consumedRoughCost = isFullConsumption
        ? Number(sourcePacket.totalCost)
        : consumedCarats * Number(sourcePacket.costPerCarat);
      const totalInputInvestment = consumedRoughCost + Number(processingCost || 0);

      // Pre-calculate target valuations for proportionate cost allocation
      const itemValuations = outputItems.map((item) => {
        const carats = Number(item.carats) || 0;
        const targetRate = item.targetSaleRate != null && !isNaN(Number(item.targetSaleRate)) && Number(item.targetSaleRate) > 0
          ? Number(item.targetSaleRate)
          : (Number(item.costPerCarat) || 0);
        return {
          carats,
          targetRate,
          valuation: carats * targetRate,
        };
      });
      const totalLotValuation = itemValuations.reduce((sum, v) => sum + v.valuation, 0);

      // Create output packets and output items
      for (let i = 0; i < outputItems.length; i++) {
        const item = outputItems[i];
        const valInfo = itemValuations[i];
        const qualityId = Number(item.qualityId);
        const carats = Number(item.carats) || 0;
        const pieces = Number(item.pieces) || 1;

        // Option 1: Calculate proportionate cost basis
        let allocatedItemCost = 0;
        if (totalLotValuation > 0) {
          allocatedItemCost = totalInputInvestment * (valInfo.valuation / totalLotValuation);
        } else if (totalOutputCarats > 0) {
          allocatedItemCost = totalInputInvestment * (carats / totalOutputCarats);
        } else {
          allocatedItemCost = totalInputInvestment / (outputItems.length || 1);
        }
        const allocatedCostRate = carats > 0 ? allocatedItemCost / carats : 0;
        const targetAskingRate = valInfo.targetRate;

        // Determine stock ID for new packet
        const stockIdNumber = item.isManualStockId && item.stockIdNumber?.trim()
          ? item.stockIdNumber.trim()
          : await generateStockIdNumber(tx as any, companyId);

        const category = (item.category as any) || sourcePacket.category || 'NON_CERTIFIED';
        const polish = item.polish ? String(item.polish).toUpperCase() : null;
        const symmetry = item.symmetry ? String(item.symmetry).toUpperCase() : null;
        const clarity = item.clarity ? String(item.clarity).toUpperCase() : null;
        const cut = item.cut ? String(item.cut).toUpperCase() : null;

        // Create new stock packet with full registration attributes
        const newPacket = await tx.stockPacket.create({
          data: {
            companyId,
            qualityId,
            stockIdNumber,
            category,
            registrationDate: conversionDate,
            shape: item.shape || null,
            caratWeight: carats,
            pieceCount: pieces,
            color: item.color || null,
            clarity,
            cut,
            polish,
            symmetry,
            lengthMm: item.lengthMm != null ? Number(item.lengthMm) : null,
            widthMm: item.widthMm != null ? Number(item.widthMm) : null,
            depthMm: item.depthMm != null ? Number(item.depthMm) : null,
            totalDepthPct: item.totalDepthPct != null ? Number(item.totalDepthPct) : null,
            tablePct: item.tablePct != null ? Number(item.tablePct) : null,
            certificateType: item.certificateType || null,
            certificateNumber: item.certificateNumber || null,
            costPerCarat: allocatedCostRate,
            totalCost: allocatedItemCost,
            targetSaleRate: targetAskingRate > 0 ? targetAskingRate : null,
            currentStatus: StockStatus.AVAILABLE,
            currentOwnership: sourcePacket.currentOwnership,
            sourcePacketId,
            sourceTransformId: conversion.id,
          },
        });

        // Save media photos/videos if provided
        if (item.imageLink?.trim()) {
          await tx.stockMedia.create({
            data: {
              stockPacketId: newPacket.id,
              mediaType: 'PHOTO',
              filePath: item.imageLink.trim(),
              fileName: 'photo',
              sortOrder: 0,
            },
          });
        }
        if (item.videoLink?.trim()) {
          await tx.stockMedia.create({
            data: {
              stockPacketId: newPacket.id,
              mediaType: 'VIDEO',
              filePath: item.videoLink.trim(),
              fileName: 'video',
              sortOrder: 1,
            },
          });
        }

        // Create stock movement for new packet
        await tx.stockMovement.create({
          data: {
            stockPacketId: newPacket.id,
            movementDate: conversionDate,
            movementType: MovementType.QUALITY_TRANSFORMATION,
            previousStatus: StockStatus.CREATED,
            newStatus: StockStatus.AVAILABLE,
            carats,
            pieces,
            sourceVoucherType: 'STOCK_CONVERSION',
            sourceVoucherId: conversion.id,
            remarks: `Converted from ${sourcePacket.stockIdNumber} (${sourcePacket.quality.qualityName}) via ${conversionNumber}`,
          },
        });

        // Create output item
        await tx.stockConversionOutput.create({
          data: {
            stockConversionId: conversion.id,
            rowNumber: i + 1,
            outputPacketId: newPacket.id,
            outputQualityId: qualityId,
            carats,
            pieces,
            shape: item.shape || null,
            color: item.color || null,
            clarity,
            cut,
            costPerCarat: allocatedCostRate,
            totalCost: allocatedItemCost,
            targetSaleRate: targetAskingRate > 0 ? targetAskingRate : null,
            remarks: item.remarks || null,
          },
        });
      }

      // Handle source packet
      if (isFullConsumption) {
        // Mark source as PROCESSED
        const prevStatus = sourcePacket.currentStatus;
        await tx.stockPacket.update({
          where: { id: sourcePacketId },
          data: { currentStatus: StockStatus.PROCESSED },
        });

        await tx.stockMovement.create({
          data: {
            stockPacketId: sourcePacketId,
            movementDate: conversionDate,
            movementType: MovementType.QUALITY_TRANSFORMATION,
            previousStatus: prevStatus,
            newStatus: StockStatus.PROCESSED,
            carats: sourceCarats,
            pieces: sourcePacket.pieceCount,
            sourceVoucherType: 'STOCK_CONVERSION',
            sourceVoucherId: conversion.id,
            remarks: `Fully consumed in conversion ${conversionNumber}. Output: ${totalOutputCarats.toFixed(3)} ct, Loss: ${weightLoss.toFixed(3)} ct`,
          },
        });
      } else {
        // Partial consumption — reduce source packet weight
        const prevStatus = sourcePacket.currentStatus;
        const newCostPerCarat = Number(sourcePacket.costPerCarat);
        const newTotalCost = remainingCarats * newCostPerCarat;

        await tx.stockPacket.update({
          where: { id: sourcePacketId },
          data: {
            caratWeight: remainingCarats,
            totalCost: newTotalCost,
            currentStatus: StockStatus.AVAILABLE,
          },
        });

        await tx.stockMovement.create({
          data: {
            stockPacketId: sourcePacketId,
            movementDate: conversionDate,
            movementType: MovementType.QUALITY_TRANSFORMATION,
            previousStatus: prevStatus,
            newStatus: StockStatus.AVAILABLE,
            carats: consumedCarats,
            pieces: sourcePacket.pieceCount,
            sourceVoucherType: 'STOCK_CONVERSION',
            sourceVoucherId: conversion.id,
            remarks: `Partially consumed in conversion ${conversionNumber}. Used: ${consumedCarats.toFixed(3)} ct, Remaining: ${remainingCarats.toFixed(3)} ct`,
          },
        });
      }

      // Handle linked Job Work / Trading Challan status update
      const activeChallanId = challanVoucherId || (sourcePacket.currentStatus === StockStatus.JOB_WORK ? (
        await tx.stockReservation.findFirst({
          where: { stockPacketId: sourcePacketId, isActive: true, reservationType: 'JOB_WORK' },
          select: { challanVoucherId: true },
        })
      )?.challanVoucherId : null);

      if (activeChallanId) {
        const challan = await tx.challanVoucher.findUnique({
          where: { id: activeChallanId },
          select: { purpose: true },
        });

        const targetStatus = challan?.purpose === 'JOB_WORK' ? 'CONVERTED' : 'RETURNED';

        // Update ChallanVoucher status
        await tx.challanVoucher.update({
          where: { id: activeChallanId },
          data: { status: targetStatus },
        });

        // Close any active stock reservation for this packet
        await tx.stockReservation.updateMany({
          where: { challanVoucherId: activeChallanId, stockPacketId: sourcePacketId },
          data: { isActive: false },
        });
      }

      // Fetch and return the full conversion
      return tx.stockConversion.findUnique({
        where: { id: conversion.id },
        include: CONVERSION_INCLUDE,
      });
    });
  }

  /**
   * Delete (reverse) a stock conversion
   */
  async delete(id: number, companyId: number) {
    const conversion = await this.prisma.stockConversion.findFirst({
      where: { id, companyId, isDeleted: false },
      include: { outputItems: true },
    });

    if (!conversion) throw new BadRequestException('Stock conversion not found');

    return this.prisma.$transaction(async (tx) => {
      // 1. Delete output packets and their movements
      for (const item of conversion.outputItems) {
        await tx.stockMovement.deleteMany({
          where: { stockPacketId: item.outputPacketId },
        });
        await tx.stockPacket.update({
          where: { id: item.outputPacketId },
          data: { isDeleted: true, deletedAt: new Date() },
        });
      }

      // 2. Revert source packet
      const sourcePacket = await tx.stockPacket.findUnique({
        where: { id: conversion.sourcePacketId },
      });

      if (sourcePacket) {
        if (conversion.isFullConsumption) {
          // Revert from PROCESSED to AVAILABLE
          await tx.stockPacket.update({
            where: { id: conversion.sourcePacketId },
            data: { currentStatus: StockStatus.AVAILABLE },
          });
        } else {
          // Restore consumed carats
          const restoredCarats = Number(sourcePacket.caratWeight) + Number(conversion.consumedCarats);
          const costPerCarat = Number(sourcePacket.costPerCarat);
          await tx.stockPacket.update({
            where: { id: conversion.sourcePacketId },
            data: {
              caratWeight: restoredCarats,
              totalCost: restoredCarats * costPerCarat,
              currentStatus: StockStatus.AVAILABLE,
            },
          });
        }

        // Remove conversion-related movements from source
        await tx.stockMovement.deleteMany({
          where: {
            stockPacketId: conversion.sourcePacketId,
            sourceVoucherType: 'STOCK_CONVERSION',
            sourceVoucherId: id,
          },
        });
      }

      // 3. Delete output items
      await tx.stockConversionOutput.deleteMany({
        where: { stockConversionId: id },
      });

      // 4. Mark conversion as deleted
      await tx.stockConversion.update({
        where: { id },
        data: { isDeleted: true },
      });

      return { success: true };
    });
  }

  /**
   * Update an existing stock conversion by reversing the previous output state and re-applying new details
   */
  async update(id: number, companyId: number, data: Record<string, any>) {
    await this.delete(id, companyId);
    return this.create(companyId, data);
  }
}
