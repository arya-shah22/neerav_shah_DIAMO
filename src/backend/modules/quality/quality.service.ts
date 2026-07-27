// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Quality Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccountStatus, UqcType } from '@prisma/client';

@Injectable()
export class QualityService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async list(companyId: number, search?: string) {
    const defaultServices = [
      { name: 'Rough to 4P', hsn: '9986' },
      { name: 'Rough to Polish', hsn: '9986' },
      { name: 'Makeable to Polish', hsn: '9986' }
    ];
    for (const s of defaultServices) {
      const existing = await this.prisma.quality.findFirst({
        where: { companyId, qualityName: s.name, isDeleted: false }
      });
      if (!existing) {
        try {
          await this.prisma.$transaction(async (tx) => {
            const q = await tx.quality.create({
              data: {
                companyId,
                qualityName: s.name,
                hsnNumber: s.hsn,
                uqc: UqcType.CTS,
                isService: true,
                status: AccountStatus.ACTIVE,
              }
            });
            await tx.qualityGstHistory.create({
              data: {
                qualityId: q.id,
                applyDate: new Date(),
                gstPct: 18.00,
                cessPct: 0
              }
            });
          });
        } catch (e) {
          // Ignore unique constraint issues if another thread creates it concurrently
        }
      }
    }

    return this.prisma.quality.findMany({
      where: {
        companyId,
        isDeleted: false,
        ...(search ? { qualityName: { contains: search } } : {}),
      },
      orderBy: { qualityName: 'asc' },
      include: {
        gstHistory: { orderBy: { applyDate: 'desc' }, take: 1 },
      },
    });
  }

  async get(id: number, companyId: number) {
    const quality = await this.prisma.quality.findFirst({
      where: { id, companyId, isDeleted: false },
      include: {
        gstHistory: { orderBy: { applyDate: 'desc' } },
      },
    });
    if (!quality) throw new BadRequestException('Quality not found');
    return quality;
  }

  async create(companyId: number, data: Record<string, unknown>) {
    await this.validateUnique(companyId, data.qualityName as string);

    return this.prisma.$transaction(async (tx) => {
      const quality = await tx.quality.create({
        data: {
          companyId,
          qualityName: data.qualityName as string,
          hsnNumber: data.hsnNumber as string,
          uqc: (data.uqc as UqcType) || UqcType.CTS,
          purchaseRate: Number(data.purchaseRate) || 0,
          saleRate: Number(data.saleRate) || 0,
          mrp: Number(data.mrp) || 0,
          minLevel: Number(data.minLevel) || 0,
          maxLevel: Number(data.maxLevel) || 0,
          openingBalanceCarats: Number(data.openingBalanceCarats) || 0,
          openingBalancePcs: Number(data.openingBalancePcs) || 0,
          openingBalanceRate: Number(data.openingBalanceRate) || 0,
          isService: Boolean(data.isService),
          status: (data.status as AccountStatus) || AccountStatus.ACTIVE,
        },
      });

      if (data.hsnNumber) {
        await tx.hsnCode.upsert({
          where: { hsnCode: data.hsnNumber as string },
          update: {},
          create: {
            hsnCode: data.hsnNumber as string,
            description: `Custom HSN: ${data.hsnNumber}`,
            gstPct: Number(data.gstPct) || 3.00,
            cessPct: Number(data.cessPct) || 0
          }
        });
      }

      if (data.gstPct != null) {
        await tx.qualityGstHistory.create({
          data: {
            qualityId: quality.id,
            applyDate: data.gstApplyDate ? new Date(data.gstApplyDate as string) : new Date(),
            gstPct: Number(data.gstPct),
            cessPct: Number(data.cessPct) || 0,
          },
        });
      }

      return tx.quality.findUnique({
        where: { id: quality.id },
        include: { gstHistory: true },
      });
    });
  }

  async update(id: number, companyId: number, data: Record<string, unknown>) {
    const existing = await this.get(id, companyId);

    if (data.qualityName && data.qualityName !== existing.qualityName) {
      await this.validateUnique(
        companyId,
        (data.qualityName as string) || existing.qualityName,
        id,
      );
    }

    const minLevel = data.minLevel != null ? Number(data.minLevel) : Number(existing.minLevel);
    const maxLevel = data.maxLevel != null ? Number(data.maxLevel) : Number(existing.maxLevel);
    if (minLevel > maxLevel && maxLevel > 0) {
      throw new BadRequestException('Min level cannot exceed max level');
    }

    if (data.hsnNumber) {
      await this.prisma.hsnCode.upsert({
        where: { hsnCode: data.hsnNumber as string },
        update: {},
        create: {
          hsnCode: data.hsnNumber as string,
          description: `Custom HSN: ${data.hsnNumber}`,
          gstPct: Number(data.gstPct) || Number(existing.gstHistory?.[0]?.gstPct) || 3.00,
          cessPct: Number(data.cessPct) || Number(existing.gstHistory?.[0]?.cessPct) || 0
        }
      });
    }

    return this.prisma.quality.update({
      where: { id },
      data: {
        qualityName: data.qualityName as string,
        hsnNumber: data.hsnNumber as string,
        uqc: data.uqc as UqcType,
        purchaseRate: data.purchaseRate != null ? Number(data.purchaseRate) : undefined,
        saleRate: data.saleRate != null ? Number(data.saleRate) : undefined,
        mrp: data.mrp != null ? Number(data.mrp) : undefined,
        minLevel: data.minLevel != null ? Number(data.minLevel) : undefined,
        maxLevel: data.maxLevel != null ? Number(data.maxLevel) : undefined,
        isService: data.isService != null ? Boolean(data.isService) : undefined,
        status: data.status as AccountStatus,
        version: { increment: 1 },
      },
      include: { gstHistory: { orderBy: { applyDate: 'desc' } } },
    });
  }

  async delete(id: number, companyId: number) {
    await this.get(id, companyId);

    const activeStock = await this.prisma.stockPacket.count({
      where: { qualityId: id, isDeleted: false },
    });
    if (activeStock > 0) {
      throw new BadRequestException('Cannot delete quality referenced by stock packets');
    }

    const archivedStock = await this.prisma.stockPacket.findMany({
      where: { qualityId: id, isDeleted: true },
      select: { id: true },
    });
    for (const packet of archivedStock) {
      await this.prisma.stockMovement.deleteMany({ where: { stockPacketId: packet.id } });
      await this.prisma.stockReservation.deleteMany({ where: { stockPacketId: packet.id } });
      await this.prisma.stockMedia.deleteMany({ where: { stockPacketId: packet.id } });
      await this.prisma.stockPacket.delete({ where: { id: packet.id } });
    }

    await this.prisma.qualityGstHistory.deleteMany({ where: { qualityId: id } });
    return this.prisma.quality.delete({ where: { id } });
  }

  async listHsnCodes() {
    return this.prisma.hsnCode.findMany({ orderBy: { hsnCode: 'asc' } });
  }

  private async validateUnique(
    companyId: number,
    name: string,
    excludeId?: number,
  ) {
    const dup = await this.prisma.quality.findFirst({
      where: {
        companyId,
        qualityName: name,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (dup) {
      if (dup.isDeleted) {
        await this.prisma.qualityGstHistory.deleteMany({ where: { qualityId: dup.id } });
        await this.prisma.quality.delete({ where: { id: dup.id } });
        return;
      }
      throw new BadRequestException('Quality name already exists');
    }
  }
}
