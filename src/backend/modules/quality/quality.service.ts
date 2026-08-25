// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Quality Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccountStatus, UqcType } from '@prisma/client';
import { HSN_CODES } from '../../../shared/constants/seed-data';

@Injectable()
export class QualityService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async list(companyId: number, search?: string) {
    // Only auto-seed default service qualities if the company has zero
    // non-deleted qualities AND no existing rows with the same names.
    const activeCount = await this.prisma.quality.count({
      where: { companyId, isDeleted: false },
    });
    if (activeCount === 0) {
      const defaultServices = [
        { name: 'Rough to 4P', hsn: '9986' },
        { name: 'Rough to Polish', hsn: '9986' },
        { name: 'Makeable to Polish', hsn: '9986' }
      ];
      for (const s of defaultServices) {
        try {
          // Check if a row with this name already exists (including soft-deleted)
          const existing = await this.prisma.quality.findFirst({
            where: { companyId, qualityName: s.name },
          });
          if (existing) {
            // If it was soft-deleted, restore it
            if (existing.isDeleted) {
              await this.prisma.quality.update({
                where: { id: existing.id },
                data: { isDeleted: false, status: AccountStatus.ACTIVE },
              });
            }
            continue;
          }
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
        } catch {
          // Ignore any remaining edge cases
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
          declarationText: data.declarationText ? (data.declarationText as string).trim() : null,
          termsConditions: data.termsConditions ? (data.termsConditions as string).trim() : null,
        },
      });

      if (data.hsnNumber && typeof data.hsnNumber === 'string' && (data.hsnNumber as string).trim()) {
        const cleanHsn = (data.hsnNumber as string).trim();
        await tx.hsnCode.upsert({
          where: { hsnCode: cleanHsn },
          update: {},
          create: {
            hsnCode: cleanHsn,
            description: cleanHsn,
            gstPct: Number(data.gstPct) || 1.50,
            cessPct: Number(data.cessPct) || 0,
          },
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

    return this.prisma.$transaction(async (tx) => {
      if (data.hsnNumber && typeof data.hsnNumber === 'string' && (data.hsnNumber as string).trim()) {
        const cleanHsn = (data.hsnNumber as string).trim();
        await tx.hsnCode.upsert({
          where: { hsnCode: cleanHsn },
          update: {
            ...(data.gstPct != null ? { gstPct: Number(data.gstPct) } : {}),
            ...(data.cessPct != null ? { cessPct: Number(data.cessPct) } : {}),
          },
          create: {
            hsnCode: cleanHsn,
            description: cleanHsn,
            gstPct: Number(data.gstPct) || Number(existing.gstHistory?.[0]?.gstPct) || 1.50,
            cessPct: Number(data.cessPct) || Number(existing.gstHistory?.[0]?.cessPct) || 0,
          },
        }).catch(() => {});
      }

      // Handle GST rate update in QualityGstHistory
      if (data.gstPct != null) {
        const newGstPct = Number(data.gstPct);
        const newCessPct = data.cessPct != null ? Number(data.cessPct) : 0;
        const latestGst = existing.gstHistory?.[0];

        if (latestGst) {
          if (Number(latestGst.gstPct) !== newGstPct || Number(latestGst.cessPct) !== newCessPct) {
            await tx.qualityGstHistory.update({
              where: { id: latestGst.id },
              data: {
                gstPct: newGstPct,
                cessPct: newCessPct,
                applyDate: data.gstApplyDate ? new Date(data.gstApplyDate as string) : new Date(),
              },
            });
          }
        } else {
          await tx.qualityGstHistory.create({
            data: {
              qualityId: id,
              applyDate: data.gstApplyDate ? new Date(data.gstApplyDate as string) : new Date(),
              gstPct: newGstPct,
              cessPct: newCessPct,
            },
          });
        }
      }

      return tx.quality.update({
        where: { id },
        data: {
          qualityName: data.qualityName != null ? (data.qualityName as string) : undefined,
          hsnNumber: data.hsnNumber != null ? (data.hsnNumber as string) : undefined,
          uqc: data.uqc != null ? (data.uqc as UqcType) : undefined,
          purchaseRate: data.purchaseRate != null ? Number(data.purchaseRate) : undefined,
          saleRate: data.saleRate != null ? Number(data.saleRate) : undefined,
          mrp: data.mrp != null ? Number(data.mrp) : undefined,
          minLevel: data.minLevel != null ? Number(data.minLevel) : undefined,
          maxLevel: data.maxLevel != null ? Number(data.maxLevel) : undefined,
          openingBalanceCarats: data.openingBalanceCarats != null ? Number(data.openingBalanceCarats) : undefined,
          openingBalancePcs: data.openingBalancePcs != null ? parseInt(String(data.openingBalancePcs), 10) : undefined,
          openingBalanceRate: data.openingBalanceRate != null ? Number(data.openingBalanceRate) : undefined,
          isService: data.isService != null ? Boolean(data.isService) : undefined,
          status: data.status != null ? (data.status as AccountStatus) : undefined,
          declarationText: data.declarationText !== undefined ? (data.declarationText ? (data.declarationText as string).trim() : null) : undefined,
          termsConditions: data.termsConditions !== undefined ? (data.termsConditions ? (data.termsConditions as string).trim() : null) : undefined,
          version: { increment: 1 },
        },
        include: { gstHistory: { orderBy: { applyDate: 'desc' } } },
      });
    });
  }

  async delete(id: number, companyId: number) {
    await this.get(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      // 1. Find all stock packets (active and archived) belonging to this quality
      const packets = await tx.stockPacket.findMany({
        where: { qualityId: id },
        select: { id: true },
      });
      const packetIds = packets.map((p) => p.id);

      if (packetIds.length > 0) {
        // Unlink references to these stock packets in transaction lines
        await tx.saleInvoiceItem.updateMany({ where: { stockPacketId: { in: packetIds } }, data: { stockPacketId: null } });
        await tx.purchaseInvoiceItem.updateMany({ where: { stockPacketId: { in: packetIds } }, data: { stockPacketId: null } });
        await tx.challanItem.updateMany({ where: { stockPacketId: { in: packetIds } }, data: { stockPacketId: null } });
        await tx.jobVoucherItem.updateMany({ where: { stockPacketId: { in: packetIds } }, data: { stockPacketId: null } });
        await tx.stockConversionOutput.deleteMany({ where: { outputPacketId: { in: packetIds } } });
        await tx.stockConversion.deleteMany({ where: { sourcePacketId: { in: packetIds } } });

        // Delete movements, reservations, media, and packets
        await tx.stockMovement.deleteMany({ where: { stockPacketId: { in: packetIds } } });
        await tx.stockReservation.deleteMany({ where: { stockPacketId: { in: packetIds } } });
        await tx.stockMedia.deleteMany({ where: { stockPacketId: { in: packetIds } } });
        await tx.stockPacket.deleteMany({ where: { id: { in: packetIds } } });
      }

      // Ensure all packets of this quality are removed
      await tx.stockPacket.deleteMany({ where: { qualityId: id } });

      // 2. Remove transaction line items directly referencing this quality
      await tx.saleInvoiceItem.deleteMany({ where: { qualityId: id } });
      await tx.purchaseInvoiceItem.deleteMany({ where: { qualityId: id } });
      await tx.challanItem.deleteMany({ where: { qualityId: id } });
      await tx.jobVoucherItem.deleteMany({ where: { qualityId: id } });

      // 3. Delete quality conversions
      await tx.stockConversionOutput.deleteMany({ where: { outputQualityId: id } });
      await tx.stockConversion.deleteMany({ where: { sourceQualityId: id } });

      // 4. Delete quality GST history
      await tx.qualityGstHistory.deleteMany({ where: { qualityId: id } });

      // 5. Delete the quality record
      return tx.quality.delete({ where: { id } });
    });
  }

  async listHsnCodes() {
    try {
      for (const hsn of HSN_CODES) {
        const existing = await this.prisma.hsnCode.findUnique({ where: { hsnCode: hsn.code } });
        if (existing) {
          if (existing.description !== hsn.description || Number(existing.gstPct) !== hsn.gstPct) {
            await this.prisma.hsnCode.update({
              where: { id: existing.id },
              data: { description: hsn.description, gstPct: hsn.gstPct },
            }).catch(() => {});
          }
        } else {
          await this.prisma.hsnCode.create({
            data: { hsnCode: hsn.code, description: hsn.description, gstPct: hsn.gstPct },
          }).catch(() => {});
        }
      }

      const defaultCodeSet = new Set(HSN_CODES.map((h) => h.code));
      const legacySeedCodes = ['71023920', '71023930', '71042000', '71042010', '71031000', '71039100', '71131110', '71131120', '71131910', '7113'];
      for (const oldCode of legacySeedCodes) {
        if (!defaultCodeSet.has(oldCode)) {
          const isUsed = await this.prisma.quality.findFirst({ where: { hsnNumber: oldCode, isDeleted: false } });
          if (!isUsed) {
            await this.prisma.hsnCode.deleteMany({ where: { hsnCode: oldCode } }).catch(() => {});
          }
        }
      }
    } catch (_err) {}

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
