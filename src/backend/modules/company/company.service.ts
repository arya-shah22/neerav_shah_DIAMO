// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Company Service Backend
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CompanyStatus } from '@prisma/client';
import { AccountGroupService } from '../account-group/account-group.service';
import { findOrCreateStateCode } from '../../utils/state-resolver';
import { assertCompanyCanBeDeleted, hardDeleteCompanyMasters } from '../../utils/hard-delete';

@Injectable()
export class CompanyService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  @Inject(AccountGroupService)
  private readonly accountGroupService!: AccountGroupService;

  async list() {
    return this.prisma.company.findMany({
      where: { isDeleted: false },
      orderBy: { companyName: 'asc' },
    });
  }

  async listStates() {
    return this.prisma.stateCode.findMany({
      orderBy: { stateCode: 'asc' },
    });
  }

  async get(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });
    if (!company || company.isDeleted) {
      throw new BadRequestException('Company not found');
    }
    return company;
  }

  async create(data: any) {
    // Check if code or name is already in use
    const existingCode = await this.prisma.company.findUnique({
      where: { companyCode: data.companyCode },
    });
    if (existingCode) {
      if (!existingCode.isDeleted) {
        throw new BadRequestException('Company code is already in use');
      }
      await this.removeLegacyCompany(existingCode.id);
    }

    const existingName = await this.prisma.company.findUnique({
      where: { companyName: data.companyName },
    });
    if (existingName) {
      if (!existingName.isDeleted) {
        throw new BadRequestException('Company name is already in use');
      }
      await this.removeLegacyCompany(existingName.id);
    }

    // If isDefault is set to true, reset others first
    if (data.isDefault) {
      await this.prisma.company.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Resolve state name to state code if custom name is provided
    if (data.stateCode) {
      data.stateCode = await findOrCreateStateCode(this.prisma, data.stateCode);
    }

    const company = await this.prisma.company.create({
      data: {
        companyName: data.companyName,
        companyCode: data.companyCode,
        panNumber: data.panNumber || '',
        gstinNumber: data.gstinNumber || null,
        tanNumber: data.tanNumber || null,
        udyamMsme: data.udyamMsme || null,
        iecCode: data.iecCode || null,
        gstEnabled: data.gstEnabled ?? true,
        gstRegistrationDate: data.gstRegistrationDate ? new Date(data.gstRegistrationDate) : null,
        businessType: data.businessType || null,
        status: data.status || CompanyStatus.ACTIVE,
        isDefault: data.isDefault ?? false,
        addressLine1: data.addressLine1 || null,
        addressLine2: data.addressLine2 || null,
        city: data.city || null,
        stateCode: data.stateCode || null,
        pincode: data.pincode || null,
        country: data.country || 'India',
        mobile: data.mobile || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        bankAccountNumber: data.bankAccountNumber || null,
        bankName: data.bankName || null,
        bankBranch: data.bankBranch || null,
        bankIfsc: data.bankIfsc || null,
        bankSwift: data.bankSwift || null,
      },
    });

    await this.accountGroupService.seedDefaultGroups(company.id);
    return company;
  }

  async update(id: number, data: any) {
    const existing = await this.get(id);

    // If code changes, ensure uniqueness
    if (data.companyCode && data.companyCode !== existing.companyCode) {
      const codeInUse = await this.prisma.company.findUnique({
        where: { companyCode: data.companyCode },
      });
      if (codeInUse && !codeInUse.isDeleted) {
        throw new BadRequestException('Company code is already in use');
      }
    }

    // If name changes, ensure uniqueness
    if (data.companyName && data.companyName !== existing.companyName) {
      const nameInUse = await this.prisma.company.findUnique({
        where: { companyName: data.companyName },
      });
      if (nameInUse && !nameInUse.isDeleted) {
        throw new BadRequestException('Company name is already in use');
      }
    }

    if (data.isDefault) {
      await this.prisma.company.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Resolve state name to state code if custom name is provided
    if (data.stateCode) {
      data.stateCode = await findOrCreateStateCode(this.prisma, String(data.stateCode));
    }

    return this.prisma.company.update({
      where: { id },
      data: {
        companyName: data.companyName,
        companyCode: data.companyCode,
        panNumber: data.panNumber,
        gstinNumber: data.gstinNumber,
        tanNumber: data.tanNumber,
        udyamMsme: data.udyamMsme,
        iecCode: data.iecCode,
        gstEnabled: data.gstEnabled,
        gstRegistrationDate: data.gstRegistrationDate ? new Date(data.gstRegistrationDate) : null,
        businessType: data.businessType,
        status: data.status,
        isDefault: data.isDefault,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        stateCode: data.stateCode,
        pincode: data.pincode,
        country: data.country,
        mobile: data.mobile,
        phone: data.phone,
        email: data.email,
        website: data.website,
        bankAccountNumber: data.bankAccountNumber,
        bankName: data.bankName,
        bankBranch: data.bankBranch,
        bankIfsc: data.bankIfsc,
        bankSwift: data.bankSwift,
        version: { increment: 1 },
      },
    });
  }

  async delete(id: number) {
    await this.get(id);
    await assertCompanyCanBeDeleted(this.prisma, id);

    await this.prisma.$transaction(async (tx) => {
      await hardDeleteCompanyMasters(tx, id);
      await tx.company.delete({ where: { id } });
    });

    return { id };
  }

  private async removeLegacyCompany(companyId: number): Promise<void> {
    await assertCompanyCanBeDeleted(this.prisma, companyId);
    await this.prisma.$transaction(async (tx) => {
      await hardDeleteCompanyMasters(tx, companyId);
      await tx.company.delete({ where: { id: companyId } });
    });
  }
}
