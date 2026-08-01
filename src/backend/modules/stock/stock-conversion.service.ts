// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Stock Conversion Service (Quality Transformation)
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StockStatus, MovementType } from '@prisma/client';
import { generateStockIdNumber } from '../../utils/stock-id-generator';

const CONVERSION_INCLUDE = {
  sourcePacket: {
    include: { quality: { select: { id: true, qualityName: true } } },
  },
  sourceQuality: { select: { id: true, qualityName: true } },
  outputItems: {
    include: {
      outputPacket: {
        include: { quality: { select: { id: true, qualityName: true } } },
      },
      outputQuality: { select: { id: true, qualityName: true } },
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
   * Bug #10 fix: Use count-based sequence instead of last ID + 1
   */
  private async generateConversionNumber(companyId: number): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const prefix = company?.companyCode || 'CONV';

    const totalConversions = await this.prisma.stockConversion.count({
      where: { companyId },
    });

    const nextNum = totalConversions + 1;
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
            // Extended Diamond Details
            fluorescenceIntensity: item.fluorescenceIntensity ? String(item.fluorescenceIntensity).toUpperCase() : null,
            fluorescenceColor: item.fluorescenceColor ? String(item.fluorescenceColor).toUpperCase() : null,
            rapPricePerCarat: item.rapPricePerCarat != null ? Number(item.rapPricePerCarat) : null,
            rapDiscountPct: item.rapDiscountPct != null ? Number(item.rapDiscountPct) : null,
            crownAngle: item.crownAngle != null ? Number(item.crownAngle) : null,
            crownHeight: item.crownHeight != null ? Number(item.crownHeight) : null,
            pavilionAngle: item.pavilionAngle != null ? Number(item.pavilionAngle) : null,
            pavilionDepth: item.pavilionDepth != null ? Number(item.pavilionDepth) : null,
            girdleMin: item.girdleMin ? String(item.girdleMin).toUpperCase() : null,
            girdleMax: item.girdleMax ? String(item.girdleMax).toUpperCase() : null,
            girdleCondition: item.girdleCondition ? String(item.girdleCondition).toUpperCase() : null,
            culetSize: item.culetSize ? String(item.culetSize).toUpperCase() : null,
            culetCondition: item.culetCondition ? String(item.culetCondition).toUpperCase() : null,
            heartsAndArrows: item.heartsAndArrows ? String(item.heartsAndArrows).toUpperCase() : null,
            eyeClean: item.eyeClean ? String(item.eyeClean).toUpperCase() : null,
            shade: item.shade ? String(item.shade).toUpperCase() : null,
            milky: item.milky ? String(item.milky).toUpperCase() : null,
            treatment: item.treatment ? String(item.treatment).toUpperCase() : null,
            tinge: item.tinge ? String(item.tinge).toUpperCase() : null,
            lustre: item.lustre ? String(item.lustre).toUpperCase() : null,
            tableInclusion: item.tableInclusion ? String(item.tableInclusion).toUpperCase() : null,
            sideInclusion: item.sideInclusion ? String(item.sideInclusion).toUpperCase() : null,
            tableOpen: item.tableOpen ? String(item.tableOpen).toUpperCase() : null,
            crownOpen: item.crownOpen ? String(item.crownOpen).toUpperCase() : null,
            girdleOpen: item.girdleOpen ? String(item.girdleOpen).toUpperCase() : null,
            origin: item.origin ? String(item.origin).toUpperCase() : null,
            certificateUrl: item.certificateUrl || null,
            webUrl: item.webUrl || null,
            inscription: item.inscription || null,
            keyToSymbols: item.keyToSymbols || null,
            diamondComment: item.diamondComment || null,
            fancyColor: item.fancyColor ? String(item.fancyColor).toUpperCase() : null,
            fancyColorIntensity: item.fancyColorIntensity ? String(item.fancyColorIntensity).toUpperCase() : null,
            fancyColorOvertone: item.fancyColorOvertone ? String(item.fancyColorOvertone).toUpperCase() : null,
            availability: item.availability ? String(item.availability).toUpperCase() : null,
            city: item.city ? String(item.city).toUpperCase() : null,
            state: item.state ? String(item.state).toUpperCase() : null,
            tradeShow: item.tradeShow ? String(item.tradeShow).toUpperCase() : null,
            brand: item.brand ? String(item.brand).toUpperCase() : null,
            sellerSpec: item.sellerSpec || null,
            pairStockNumber: item.pairStockNumber || null,
            isPairSeparable: item.isPairSeparable ? String(item.isPairSeparable).toUpperCase() : null,
            parcelStones: item.parcelStones || null,
            reportFilename: item.reportFilename || null,
            reportIssueDate: item.reportIssueDate || null,
            labLocation: item.labLocation ? String(item.labLocation).toUpperCase() : null,
            blackInclusion: item.blackInclusion ? String(item.blackInclusion).toUpperCase() : null,
            whiteInclusion: item.whiteInclusion ? String(item.whiteInclusion).toUpperCase() : null,
            openInclusion: item.openInclusion ? String(item.openInclusion).toUpperCase() : null,
            starLength: item.starLength != null ? Number(item.starLength) : null,
            growthType: item.growthType ? String(item.growthType).toUpperCase() : null,
            bgm: item.bgm ? String(item.bgm).toUpperCase() : null,
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
