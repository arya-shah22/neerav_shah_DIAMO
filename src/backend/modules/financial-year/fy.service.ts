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
    const fromDate = new Date(data.fromDate);
    const toDate = new Date(data.toDate);

    // Validate dates: start must be April 1, end must be March 31
    if (fromDate.getMonth() !== 3 || fromDate.getDate() !== 1) {
      throw new BadRequestException('Financial year must start on April 1st');
    }
    if (toDate.getMonth() !== 2 || toDate.getDate() !== 31) {
      throw new BadRequestException('Financial year must end on March 31st');
    }

    // Check difference is exactly 1 year
    const diffTime = Math.abs(toDate.getTime() - fromDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 364 || diffDays > 366) {
      throw new BadRequestException('Financial year must be exactly 12 months');
    }

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

    // If is_active is requested, reset other active years first
    if (data.isActive) {
      await this.prisma.financialYear.updateMany({
        where: { companyId, isActive: true },
        data: { isActive: false },
      });
    }

    return this.prisma.financialYear.create({
      data: {
        companyId,
        fromDate,
        toDate,
        isActive: data.isActive ?? false,
        isClosed: false,
        lockTransactionUptoDate: data.lockTransactionUptoDate ? new Date(data.lockTransactionUptoDate) : null,
        gstActive: data.gstActive ?? true,
        tcsActive: data.tcsActive ?? true,
        accountEffect: data.accountEffect ?? true,
      },
    });
  }

  async activate(id: number, companyId: number) {
    // Check if the FY exists
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
}
