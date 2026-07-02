// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Account Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccountStatus, GstRegType, DebitCreditType } from '@prisma/client';
import { hardDeleteAccount } from '../../utils/hard-delete';

@Injectable()
export class AccountService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async list(companyId: number, filters?: { search?: string; groupId?: number; isBroker?: boolean }) {
    return this.prisma.account.findMany({
      where: {
        companyId,
        isDeleted: false,
        ...(filters?.groupId ? { accountGroupId: filters.groupId } : {}),
        ...(filters?.isBroker !== undefined ? { isBroker: filters.isBroker } : {}),
        ...(filters?.search
          ? { accountName: { contains: filters.search } }
          : {}),
      },
      orderBy: { accountName: 'asc' },
      include: {
        accountGroup: { select: { id: true, groupName: true, nature: true } },
        brokerProfile: true,
      },
    });
  }

  async search(companyId: number, query: string, limit = 20) {
    return this.prisma.account.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: AccountStatus.ACTIVE,
        accountName: { contains: query },
      },
      take: limit,
      orderBy: { accountName: 'asc' },
      select: {
        id: true,
        accountName: true,
        accountGroupId: true,
        isBroker: true,
        gstinNumber: true,
        status: true,
      },
    });
  }

  async get(id: number, companyId: number) {
    const account = await this.prisma.account.findFirst({
      where: { id, companyId, isDeleted: false },
      include: {
        accountGroup: { select: { id: true, groupName: true, nature: true } },
        brokerProfile: true,
      },
    });
    if (!account) throw new BadRequestException('Account not found');
    return account;
  }

  async create(companyId: number, data: Record<string, unknown>) {
    await this.validateUniqueName(companyId, data.accountName as string);
    await this.validateGroup(companyId, data.accountGroupId as number);

    return this.prisma.account.create({
      data: this.mapAccountData(companyId, data),
      include: {
        accountGroup: { select: { id: true, groupName: true } },
      },
    });
  }

  async update(id: number, companyId: number, data: Record<string, unknown>) {
    const existing = await this.get(id, companyId);

    if (data.accountName && data.accountName !== existing.accountName) {
      await this.validateUniqueName(companyId, data.accountName as string, id);
    }
    if (data.accountGroupId) {
      await this.validateGroup(companyId, data.accountGroupId as number);
    }

    return this.prisma.account.update({
      where: { id },
      data: {
        ...this.mapAccountFields(data),
        version: { increment: 1 },
      },
      include: {
        accountGroup: { select: { id: true, groupName: true } },
        brokerProfile: true,
      },
    });
  }

  async delete(id: number, companyId: number) {
    await this.get(id, companyId);
    await hardDeleteAccount(this.prisma, id, companyId);
    return { id };
  }

  async assertAccountNameAvailable(companyId: number, name: string, excludeId?: number): Promise<void> {
    await this.validateUniqueName(companyId, name, excludeId);
  }

  private async validateUniqueName(companyId: number, name: string, excludeId?: number) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Account name is required');

    const dup = await this.prisma.account.findFirst({
      where: {
        companyId,
        accountName: trimmed,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    if (!dup) return;

    if (dup.isDeleted) {
      await hardDeleteAccount(this.prisma, dup.id, companyId);
      return;
    }
    throw new BadRequestException(`Account "${trimmed}" already exists.`);
  }

  private async validateGroup(companyId: number, groupId: number) {
    const group = await this.prisma.accountGroup.findFirst({
      where: { id: groupId, companyId, isDeleted: false },
    });
    if (!group) throw new BadRequestException('Invalid account group');
  }

  private mapAccountData(companyId: number, data: Record<string, unknown>) {
    return {
      companyId,
      ...this.mapAccountFields(data),
      isBroker: Boolean(data.isBroker) || false,
    };
  }

  private mapAccountFields(data: Record<string, unknown>) {
    return {
      accountGroupId: data.accountGroupId as number,
      accountName: data.accountName as string,
      printName: (data.printName as string) || null,
      status: (data.status as AccountStatus) || AccountStatus.ACTIVE,
      isBroker: Boolean(data.isBroker),
      gstinNumber: (data.gstinNumber as string) || null,
      panNumber: (data.panNumber as string) || null,
      gstRegType: (data.gstRegType as GstRegType) || null,
      udyamMsme: (data.udyamMsme as string) || null,
      tdsLedgerId: data.tdsLedgerId ? Number(data.tdsLedgerId) : null,
      tdsPct: data.tdsPct != null ? Number(data.tdsPct) : null,
      creditDays: Number(data.creditDays) || 0,
      creditLimit: Number(data.creditLimit) || 0,
      addressLine1: (data.addressLine1 as string) || null,
      addressLine2: (data.addressLine2 as string) || null,
      city: (data.city as string) || null,
      stateCode: (data.stateCode as string) || null,
      pincode: (data.pincode as string) || null,
      country: (data.country as string) || 'India',
      mobile: (data.mobile as string) || null,
      phone: (data.phone as string) || null,
      email: (data.email as string) || null,
      bankAccountNumber: (data.bankAccountNumber as string) || null,
      bankName: (data.bankName as string) || null,
      bankBranch: (data.bankBranch as string) || null,
      bankIfsc: (data.bankIfsc as string) || null,
      openingBalanceAmount: Number(data.openingBalanceAmount) || 0,
      openingBalanceType: (data.openingBalanceType as DebitCreditType) || null,
    };
  }
}
