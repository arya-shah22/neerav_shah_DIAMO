// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Challan Service (Stage 6)
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ChallanPurpose, ChallanStatus, StockStatus, VoucherType } from '@prisma/client';

export interface ChallanListFilters {
  purpose?: ChallanPurpose;
  search?: string;
  status?: ChallanStatus;
}

function purposeToVoucherType(purpose: ChallanPurpose): VoucherType {
  switch (purpose) {
    case 'TRADING_JHANGHAD':
      return 'CHALLAN_TRADING';
    case 'JOB_WORK':
      return 'CHALLAN_JOB_WORK';
    case 'SALE_ORDER':
      return 'CHALLAN_SALE_ORDER';
    case 'PURCHASE_ORDER':
      return 'CHALLAN_PURCHASE_ORDER';
    default:
      return 'CHALLAN_TRADING';
  }
}

@Injectable()
export class ChallanService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async list(companyId: number, filters: ChallanListFilters) {
    const where: any = { companyId, isDeleted: false };
    if (filters.purpose) {
      where.purpose = filters.purpose;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search) {
      where.OR = [
        { voucherNumber: { contains: filters.search } },
        { partyName: { contains: filters.search } },
        { party: { accountName: { contains: filters.search } } },
      ];
    }

    const challans = await this.prisma.challanVoucher.findMany({
      where,
      orderBy: { challanDate: 'desc' },
      include: {
        party: { select: { id: true, accountName: true, mobile: true, city: true, gstinNumber: true } },
        items: { include: { quality: true } },
      },
    });

    const packetIds = challans
      .flatMap(c => c.items.map(it => it.stockPacketId))
      .filter((id): id is number => id !== null);

    if (packetIds.length > 0) {
      const packets = await this.prisma.stockPacket.findMany({
        where: { id: { in: packetIds } },
        select: { id: true, stockIdNumber: true },
      });
      const packetMap = new Map(packets.map(p => [p.id, p.stockIdNumber]));
      challans.forEach(c => {
        c.items = c.items.map(it => ({
          ...it,
          stockPacketIdNumber: it.stockPacketId ? packetMap.get(it.stockPacketId) : null,
        })) as any;
      });
    }

    return challans;
  }

  async get(id: number, companyId: number) {
    const challan = await this.prisma.challanVoucher.findFirst({
      where: { id, companyId, isDeleted: false },
      include: {
        party: { select: { id: true, accountName: true, mobile: true, city: true, gstinNumber: true } },
        items: { include: { quality: true } },
      },
    });
    if (!challan) throw new BadRequestException('Challan not found');

    const packetIds = challan.items.map(it => it.stockPacketId).filter((id): id is number => id !== null);
    if (packetIds.length > 0) {
      const packets = await this.prisma.stockPacket.findMany({
        where: { id: { in: packetIds } },
        select: { id: true, stockIdNumber: true },
      });
      const packetMap = new Map(packets.map(p => [p.id, p.stockIdNumber]));
      challan.items = challan.items.map(it => ({
        ...it,
        stockPacketIdNumber: it.stockPacketId ? packetMap.get(it.stockPacketId) : null,
      })) as any;
    }

    return challan;
  }

  async previewVoucherNumber(companyId: number, financialYearId: number, purpose: ChallanPurpose): Promise<string> {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    const fy = await this.prisma.financialYear.findUnique({ where: { id: financialYearId } });
    if (!company || !fy) throw new BadRequestException('Company or Financial Year not found');

    const vType = purposeToVoucherType(purpose);

    const config = await this.prisma.voucherNumberConfig.findFirst({
      where: { companyId, financialYearId, voucherType: vType },
    });
    const sequence = await this.prisma.voucherNumberSequence.findFirst({
      where: { companyId, financialYearId, voucherType: vType },
    });

    const nextNum = (sequence?.currentNumber || 0) + 1;
    const digitLength = config?.digitLength || 6;

    const startYear = fy.fromDate.getFullYear();
    const endYear = fy.toDate.getFullYear();
    const yearSuffix = `${String(startYear).slice(-2)}${String(endYear).slice(-2)}`;

    let typeAbbr = 'CHL';
    if (purpose === 'JOB_WORK') typeAbbr = 'CHL-JW';
    else if (purpose === 'TRADING_JHANGHAD') typeAbbr = 'CHL-JH';
    else if (purpose === 'SALE_ORDER') typeAbbr = 'ORD-SL';
    else if (purpose === 'PURCHASE_ORDER') typeAbbr = 'ORD-PR';

    const seqStr = String(nextNum).padStart(digitLength, '0');
    return `${company.companyCode}-${yearSuffix}-${typeAbbr}-${seqStr}`;
  }

  async create(companyId: number, financialYearId: number, data: Record<string, any>, userId?: number) {
    const purpose = data.purpose as ChallanPurpose;
    if (!purpose) throw new BadRequestException('Challan purpose is required');
    const partyId = Number(data.partyId);
    if (!partyId) throw new BadRequestException('Party is required');

    const voucherNumber = await this.previewVoucherNumber(companyId, financialYearId, purpose);
    const vType = purposeToVoucherType(purpose);

    return this.prisma.$transaction(async (tx) => {
      // Update party account details if provided
      if (partyId) {
        await tx.account.update({
          where: { id: partyId },
          data: {
            mobile: data.mobile || null,
            city: data.city || null,
            gstinNumber: data.gstin || null,
          },
        });
      }

      // 1. Increment sequence
      await tx.voucherNumberSequence.upsert({
        where: {
          companyId_financialYearId_voucherType: {
            companyId,
            financialYearId,
            voucherType: vType,
          },
        },
        create: {
          companyId,
          financialYearId,
          voucherType: vType,
          currentNumber: 1,
          lastGeneratedAt: new Date(),
        },
        update: {
          currentNumber: { increment: 1 },
          lastGeneratedAt: new Date(),
        },
      });

      // 2. Validate items and lock packets
      const itemsList = Array.isArray(data.items) ? data.items : [];
      let totalCarats = 0;
      let totalPieces = 0;
      let totalAmount = 0;

      const createdItems: any[] = [];

      for (let i = 0; i < itemsList.length; i++) {
        const item = itemsList[i];
        const qualityId = Number(item.qualityId);
        const carats = Number(item.carats) || 0;
        const pieces = Number(item.pieces) || 1;
        const rate = Number(item.rate) || 0;
        const amount = carats * rate;

        totalCarats += carats;
        totalPieces += pieces;
        totalAmount += amount;

        const stockPacketId = item.stockPacketId ? Number(item.stockPacketId) : null;

        if (stockPacketId) {
          const packet = await tx.stockPacket.findFirst({
            where: { id: stockPacketId, companyId, isDeleted: false },
          });
          if (!packet) throw new BadRequestException(`Stock packet ID ${stockPacketId} not found`);

          if (packet.currentStatus !== StockStatus.AVAILABLE) {
            throw new BadRequestException(`Stock packet ${packet.stockIdNumber} is not AVAILABLE (Current status: ${packet.currentStatus})`);
          }

          // Update stock status based on purpose
          let newStatus: StockStatus = StockStatus.AVAILABLE;
          if (purpose === 'TRADING_JHANGHAD') {
            newStatus = StockStatus.HOLD;
          } else if (purpose === 'JOB_WORK') {
            newStatus = StockStatus.JOB_WORK;
          }

          await tx.stockPacket.update({
            where: { id: stockPacketId },
            data: { currentStatus: newStatus },
          });

          // Log movement
          await tx.stockMovement.create({
            data: {
              stockPacketId,
              movementDate: new Date(),
              movementType: purpose === 'JOB_WORK' ? 'JOB_WORK_ISSUE' : 'TRADING_CHALLAN',
              previousStatus: packet.currentStatus,
              newStatus,
              carats,
              pieces,
              remarks: `Issued on Challan ${voucherNumber}`,
              userId: userId ?? null,
            },
          });
        }

        createdItems.push({
          rowNumber: i + 1,
          qualityId,
          carats,
          pieces,
          rate,
          amount,
          stockPacketId,
          remarks: item.remarks || null,
        });
      }

      // 3. Create ChallanVoucher
      return tx.challanVoucher.create({
        data: {
          companyId,
          financialYearId,
          purpose,
          voucherNumber,
          challanNumber: data.challanNumber ? String(data.challanNumber) : voucherNumber,
          challanDate: data.challanDate ? new Date(data.challanDate) : new Date(),
          partyId,
          partyName: data.partyName || null,
          expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : null,
          totalCarats,
          totalPieces,
          totalAmount,
          narration: data.narration || null,
          status: 'ISSUED',
          createdBy: userId ?? null,
          items: {
            create: createdItems,
          },
        },
        include: {
          items: { include: { quality: true } },
        },
      });
    });
  }

  async update(id: number, companyId: number, data: Record<string, any>, userId?: number) {
    const challan = await this.get(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      // Update party account details if provided
      if (challan.partyId) {
        await tx.account.update({
          where: { id: challan.partyId },
          data: {
            mobile: data.mobile || null,
            city: data.city || null,
            gstinNumber: data.gstin || null,
          },
        });
      }

      // Revert status of existing stock packets first
      for (const item of challan.items) {
        if (item.stockPacketId) {
          const packet = await tx.stockPacket.findFirst({
            where: { id: item.stockPacketId },
          });
          if (packet) {
            await tx.stockPacket.update({
              where: { id: item.stockPacketId },
              data: { currentStatus: StockStatus.AVAILABLE },
            });
            await tx.stockMovement.create({
              data: {
                stockPacketId: item.stockPacketId,
                movementDate: new Date(),
                movementType: 'CORRECTION',
                previousStatus: packet.currentStatus,
                newStatus: StockStatus.AVAILABLE,
                carats: Number(item.carats),
                pieces: item.pieces,
                remarks: `Reverted due to Challan ${challan.voucherNumber} update`,
                userId: userId ?? null,
              },
            });
          }
        }
      }

      // Delete existing items
      await tx.challanItem.deleteMany({
        where: { challanVoucherId: id },
      });

      // Insert new items and update stock statuses
      const itemsList = Array.isArray(data.items) ? data.items : [];
      let totalCarats = 0;
      let totalPieces = 0;
      let totalAmount = 0;

      const createdItems: any[] = [];

      for (let i = 0; i < itemsList.length; i++) {
        const item = itemsList[i];
        const qualityId = Number(item.qualityId);
        const carats = Number(item.carats) || 0;
        const pieces = Number(item.pieces) || 1;
        const rate = Number(item.rate) || 0;
        const amount = carats * rate;

        totalCarats += carats;
        totalPieces += pieces;
        totalAmount += amount;

        const stockPacketId = item.stockPacketId ? Number(item.stockPacketId) : null;

        if (stockPacketId) {
          const packet = await tx.stockPacket.findFirst({
            where: { id: stockPacketId },
          });
          if (!packet) throw new BadRequestException(`Stock packet ID ${stockPacketId} not found`);

          let newStatus: StockStatus = StockStatus.AVAILABLE;
          if (challan.purpose === 'TRADING_JHANGHAD') {
            newStatus = StockStatus.HOLD;
          } else if (challan.purpose === 'JOB_WORK') {
            newStatus = StockStatus.JOB_WORK;
          }

          await tx.stockPacket.update({
            where: { id: stockPacketId },
            data: { currentStatus: newStatus },
          });

          await tx.stockMovement.create({
            data: {
              stockPacketId,
              movementDate: new Date(),
              movementType: 'CORRECTION',
              previousStatus: packet.currentStatus,
              newStatus,
              carats,
              pieces,
              remarks: `Updated Challan ${challan.voucherNumber}`,
              userId: userId ?? null,
            },
          });
        }

        createdItems.push({
          rowNumber: i + 1,
          qualityId,
          carats,
          pieces,
          rate,
          amount,
          stockPacketId,
          remarks: item.remarks || null,
        });
      }

      return tx.challanVoucher.update({
        where: { id },
        data: {
          challanDate: data.challanDate ? new Date(data.challanDate) : challan.challanDate,
          expectedReturnDate: data.expectedReturnDate ? new Date(data.expectedReturnDate) : null,
          totalCarats,
          totalPieces,
          totalAmount,
          narration: data.narration || null,
          updatedBy: userId ?? null,
          items: {
            create: createdItems,
          },
        },
        include: {
          items: { include: { quality: true } },
        },
      });
    });
  }

  async delete(id: number, companyId: number, userId?: number) {
    const challan = await this.get(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      // Revert status of all linked stock packets to AVAILABLE
      for (const item of challan.items) {
        if (item.stockPacketId) {
          const packet = await tx.stockPacket.findFirst({
            where: { id: item.stockPacketId },
          });
          if (packet) {
            await tx.stockPacket.update({
              where: { id: item.stockPacketId },
              data: { currentStatus: StockStatus.AVAILABLE },
            });
            await tx.stockMovement.create({
              data: {
                stockPacketId: item.stockPacketId,
                movementDate: new Date(),
                movementType: 'ARCHIVE',
                previousStatus: packet.currentStatus,
                newStatus: StockStatus.AVAILABLE,
                carats: Number(item.carats),
                pieces: item.pieces,
                remarks: `Challan ${challan.voucherNumber} deleted/archived`,
                userId: userId ?? null,
              },
            });
          }
        }
      }

      return tx.challanVoucher.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedBy: userId ?? null,
          deletedAt: new Date(),
        },
      });
    });
  }

  async updateStatus(
    id: number,
    companyId: number,
    status: ChallanStatus,
    payload: {
      actualReturnDate?: string;
      items?: { id: number; returnedCarats: number; returnedPieces: number }[];
    },
    userId?: number,
  ) {
    const challan = await this.get(id, companyId);

    return this.prisma.$transaction(async (tx) => {
      let overallReturnedCarats = 0;
      let overallReturnedPieces = 0;

      // 1. Update individual line item returns if provided
      if (payload.items && payload.items.length > 0) {
        for (const returnItem of payload.items) {
          const existingItem = challan.items.find((it) => it.id === returnItem.id);
          if (!existingItem) continue;

          overallReturnedCarats += returnItem.returnedCarats;
          overallReturnedPieces += returnItem.returnedPieces;

          await tx.challanItem.update({
            where: { id: returnItem.id },
            data: {
              returnedCarats: returnItem.returnedCarats,
              returnedPieces: returnItem.returnedPieces,
            },
          });

          // Revert stock status of the packet if it was fully returned
          if (existingItem.stockPacketId) {
            const isFullyReturned = returnItem.returnedCarats >= Number(existingItem.carats);
            if (isFullyReturned || status === 'RETURNED') {
              const packet = await tx.stockPacket.findFirst({
                where: { id: existingItem.stockPacketId },
              });
              if (packet && packet.currentStatus !== StockStatus.AVAILABLE) {
                await tx.stockPacket.update({
                  where: { id: existingItem.stockPacketId },
                  data: { currentStatus: StockStatus.AVAILABLE },
                });
                await tx.stockMovement.create({
                  data: {
                    stockPacketId: existingItem.stockPacketId,
                    movementDate: new Date(),
                    movementType: 'CORRECTION',
                    previousStatus: packet.currentStatus,
                    newStatus: StockStatus.AVAILABLE,
                    carats: Number(existingItem.carats),
                    pieces: existingItem.pieces,
                    remarks: `Returned on Challan ${challan.voucherNumber}`,
                    userId: userId ?? null,
                  },
                });
              }
            }
          }
        }
      } else {
        // If no individual item details are passed but we are moving to RETURNED/CLOSED, mark all as fully returned
        if (status === 'RETURNED' || status === 'CLOSED') {
          for (const item of challan.items) {
            overallReturnedCarats += Number(item.carats);
            overallReturnedPieces += item.pieces;

            await tx.challanItem.update({
              where: { id: item.id },
              data: {
                returnedCarats: item.carats,
                returnedPieces: item.pieces,
              },
            });

            if (item.stockPacketId) {
              const packet = await tx.stockPacket.findFirst({
                where: { id: item.stockPacketId },
              });
              if (packet && packet.currentStatus !== StockStatus.AVAILABLE) {
                await tx.stockPacket.update({
                  where: { id: item.stockPacketId },
                  data: { currentStatus: StockStatus.AVAILABLE },
                });
                await tx.stockMovement.create({
                  data: {
                    stockPacketId: item.stockPacketId,
                    movementDate: new Date(),
                    movementType: 'CORRECTION',
                    previousStatus: packet.currentStatus,
                    newStatus: StockStatus.AVAILABLE,
                    carats: Number(item.carats),
                    pieces: item.pieces,
                    remarks: `Returned on Challan ${challan.voucherNumber}`,
                    userId: userId ?? null,
                  },
                });
              }
            }
          }
        }
      }

      // 2. Update ChallanVoucher status and totals
      return tx.challanVoucher.update({
        where: { id },
        data: {
          status,
          actualReturnDate: payload.actualReturnDate ? new Date(payload.actualReturnDate) : (status === 'RETURNED' ? new Date() : null),
          returnedCarats: overallReturnedCarats,
          returnedPieces: overallReturnedPieces,
          updatedBy: userId ?? null,
        },
        include: {
          items: { include: { quality: true } },
        },
      });
    });
  }
}
