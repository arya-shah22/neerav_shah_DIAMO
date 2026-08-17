// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Financial Year Service Backend
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class FinancialYearService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async list(companyId: number) {
    return this.prisma.financialYear.findMany({
      where: { companyId, isDeleted: false },
      orderBy: { fromDate: 'desc' },
    });
  }

  async create(companyId: number, data: any) {
    const fromStr = typeof data.fromDate === 'string' ? data.fromDate.split('T')[0] : '';
    const toStr = typeof data.toDate === 'string' ? data.toDate.split('T')[0] : '';

    const fromParts = fromStr.split('-').map(Number);
    const toParts = toStr.split('-').map(Number);

    if (fromParts.length !== 3 || fromParts[1] !== 4 || fromParts[2] !== 1) {
      throw new BadRequestException('Financial year must start on April 1st');
    }
    if (toParts.length !== 3 || toParts[1] !== 3 || toParts[2] !== 31) {
      throw new BadRequestException('Financial year must end on March 31st');
    }
    if (toParts[0] !== fromParts[0] + 1) {
      throw new BadRequestException('Financial year must span exactly one fiscal year (April 1 to March 31)');
    }

    const fromDate = new Date(`${fromStr}T00:00:00.000Z`);
    const toDate = new Date(`${toStr}T00:00:00.000Z`);

    // Check for overlap
    const overlap = await this.prisma.financialYear.findFirst({
      where: {
        companyId,
        isDeleted: false,
        fromDate,
        toDate,
      },
    });

    if (overlap) {
      throw new BadRequestException('This financial year period already exists for this company');
    }

    // If isActive is requested, reset other active years first
    if (data.isActive) {
      await this.prisma.financialYear.updateMany({
        where: { companyId, isActive: true },
        data: { isActive: false },
      });
    }

    let lockDate: Date | null = null;
    if (data.lockTransactionUptoDate && data.lockTransactionUptoDate.trim()) {
      const lockStr = data.lockTransactionUptoDate.split('T')[0];
      if (lockStr < fromStr || lockStr > toStr) {
        throw new BadRequestException('Lock date must be within the financial year');
      }
      lockDate = new Date(`${lockStr}T00:00:00.000Z`);
    }

    return this.prisma.financialYear.create({
      data: {
        companyId,
        fromDate,
        toDate,
        isActive: data.isActive ?? false,
        isClosed: false,
        lockTransactionUptoDate: lockDate,
        gstActive: data.gstActive ?? true,
        tcsActive: data.tcsActive ?? true,
        accountEffect: data.accountEffect ?? true,
      },
    });
  }

  async update(id: number, companyId: number, data: any) {
    const fy = await this.prisma.financialYear.findUnique({
      where: { id },
    });
    if (!fy || fy.companyId !== companyId || fy.isDeleted) {
      throw new BadRequestException('Financial year not found');
    }

    let newFromDate = fy.fromDate;
    let newToDate = fy.toDate;

    if (data.fromDate && data.toDate) {
      const fromStr = typeof data.fromDate === 'string' ? data.fromDate.split('T')[0] : '';
      const toStr = typeof data.toDate === 'string' ? data.toDate.split('T')[0] : '';

      if (fromStr >= toStr) {
        throw new BadRequestException('Start date must be strictly before end date');
      }

      newFromDate = new Date(`${fromStr}T00:00:00.000Z`);
      newToDate = new Date(`${toStr}T00:00:00.000Z`);

      // Check overlap against other financial years for this company
      const overlap = await this.prisma.financialYear.findFirst({
        where: {
          companyId,
          id: { not: id },
          isDeleted: false,
          AND: [
            { fromDate: { lte: newToDate } },
            { toDate: { gte: newFromDate } },
          ],
        },
      });

      if (overlap) {
        throw new BadRequestException('The selected date range overlaps with another existing financial year');
      }

      // Check if any existing transactions fall outside the new date bounds
      const [salesOutside, purchaseOutside] = await Promise.all([
        this.prisma.saleInvoice.count({
          where: {
            financialYearId: id,
            isDeleted: false,
            OR: [
              { invoiceDate: { lt: newFromDate } },
              { invoiceDate: { gt: newToDate } },
            ],
          },
        }),
        this.prisma.purchaseInvoice.count({
          where: {
            financialYearId: id,
            isDeleted: false,
            OR: [
              { invoiceDate: { lt: newFromDate } },
              { invoiceDate: { gt: newToDate } },
            ],
          },
        }),
      ]);

      const txOutside = salesOutside + purchaseOutside;
      if (txOutside > 0) {
        throw new BadRequestException(
          `Cannot change date range: ${txOutside} transaction(s) exist outside the new dates (${fromStr} to ${toStr}).`
        );
      }
    }

    const fromIso = newFromDate.toISOString().split('T')[0];
    const toIso = newToDate.toISOString().split('T')[0];

    let lockDate: Date | null = fy.lockTransactionUptoDate;
    if (data.lockTransactionUptoDate !== undefined) {
      if (data.lockTransactionUptoDate && data.lockTransactionUptoDate.trim()) {
        const lockStr = data.lockTransactionUptoDate.split('T')[0];
        if (lockStr < fromIso || lockStr > toIso) {
          throw new BadRequestException('Lock date must be within the financial year dates');
        }
        lockDate = new Date(`${lockStr}T00:00:00.000Z`);
      } else {
        lockDate = null;
      }
    }

    // If activating this FY, deactivate others
    if (data.isActive === true && !fy.isActive) {
      await this.prisma.financialYear.updateMany({
        where: { companyId, id: { not: id } },
        data: { isActive: false },
      });
    }

    return this.prisma.financialYear.update({
      where: { id },
      data: {
        fromDate: newFromDate,
        toDate: newToDate,
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.isClosed !== undefined ? { isClosed: data.isClosed } : {}),
        ...(data.gstActive !== undefined ? { gstActive: data.gstActive } : {}),
        ...(data.tcsActive !== undefined ? { tcsActive: data.tcsActive } : {}),
        ...(data.accountEffect !== undefined ? { accountEffect: data.accountEffect } : {}),
        lockTransactionUptoDate: lockDate,
      },
    });
  }

  async activate(id: number, companyId: number) {
    const fy = await this.prisma.financialYear.findUnique({
      where: { id },
    });
    if (!fy || fy.companyId !== companyId || fy.isDeleted) {
      throw new BadRequestException('Financial year not found');
    }

    // Deactivate all other years for this company
    await this.prisma.financialYear.updateMany({
      where: { companyId, id: { not: id } },
      data: { isActive: false },
    });

    // Activate this year
    return this.prisma.financialYear.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async toggleClosed(id: number, companyId: number) {
    const fy = await this.prisma.financialYear.findUnique({
      where: { id },
    });
    if (!fy || fy.companyId !== companyId || fy.isDeleted) {
      throw new BadRequestException('Financial year not found');
    }

    return this.prisma.financialYear.update({
      where: { id },
      data: { isClosed: !fy.isClosed },
    });
  }

  async delete(id: number, companyId: number) {
    const fy = await this.prisma.financialYear.findUnique({
      where: { id },
    });
    if (!fy || fy.companyId !== companyId || fy.isDeleted) {
      throw new BadRequestException('Financial year not found');
    }

    if (fy.isActive) {
      const activeCount = await this.prisma.financialYear.count({
        where: { companyId, isDeleted: false },
      });
      if (activeCount > 1) {
        throw new BadRequestException('Cannot delete the currently active financial year. Please activate another year first.');
      }
    }

    // Check if any transactional vouchers exist in this financial year
    const [salesCount, purchaseCount, challanCount, journalCount, cashBankCount, jobCount] = await Promise.all([
      this.prisma.saleInvoice.count({ where: { financialYearId: id, isDeleted: false } }),
      this.prisma.purchaseInvoice.count({ where: { financialYearId: id, isDeleted: false } }),
      this.prisma.challanVoucher.count({ where: { financialYearId: id, isDeleted: false } }),
      this.prisma.journalVoucher.count({ where: { financialYearId: id, isDeleted: false } }),
      this.prisma.cashBankVoucher.count({ where: { financialYearId: id, isDeleted: false } }),
      this.prisma.jobVoucher.count({ where: { financialYearId: id, isDeleted: false } }),
    ]);

    const totalTx = salesCount + purchaseCount + challanCount + journalCount + cashBankCount + jobCount;
    if (totalTx > 0) {
      throw new BadRequestException(
        `Cannot delete financial year because it contains ${totalTx} recorded transaction(s). You can close the financial year instead.`
      );
    }

    return this.prisma.financialYear.update({
      where: { id },
      data: { isDeleted: true, isActive: false },
    });
  }
}
