// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Broker Service
// Extends Account with BrokerProfile (one-to-one)
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccountService } from '../account/account.service';
import { AccountGroupService } from '../account-group/account-group.service';
import { AddLessType } from '@prisma/client';
import { findOrCreateStateCode } from '../../utils/state-resolver';

function emptyToNull(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

@Injectable()
export class BrokerService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  @Inject(AccountService)
  private readonly accountService!: AccountService;

  @Inject(AccountGroupService)
  private readonly accountGroupService!: AccountGroupService;

  async list(companyId: number) {
    return this.prisma.account.findMany({
      where: { companyId, isDeleted: false, isBroker: true },
      orderBy: { accountName: 'asc' },
      include: {
        accountGroup: { select: { id: true, groupName: true } },
        brokerProfile: true,
      },
    });
  }

  async get(id: number, companyId: number) {
    const account = await this.prisma.account.findFirst({
      where: { id, companyId, isDeleted: false, isBroker: true },
      include: {
        accountGroup: { select: { id: true, groupName: true } },
        brokerProfile: true,
      },
    });
    if (!account) throw new BadRequestException('Broker not found');
    return account;
  }

  private async resolveBrokersGroupId(companyId: number): Promise<number> {
    let brokersGroup = await this.prisma.accountGroup.findFirst({
      where: { companyId, groupName: 'Brokers', isDeleted: false },
    });

    if (!brokersGroup) {
      await this.accountGroupService.seedDefaultGroups(companyId);
      brokersGroup = await this.prisma.accountGroup.findFirst({
        where: { companyId, groupName: 'Brokers', isDeleted: false },
      });
    }

    if (!brokersGroup) {
      throw new BadRequestException(
        'Brokers account group is missing. Open Account Groups and click "Load Default Chart", then try again.',
      );
    }

    return brokersGroup.id;
  }

  async create(companyId: number, data: Record<string, any>) {
    const accountName = String(data.accountName ?? '').trim();
    if (!accountName) {
      throw new BadRequestException('Broker name is required');
    }

    const addAllFirms = Boolean(data.addAllFirms);
    const targetCompanyIds = Array.isArray(data.targetCompanyIds) ? data.targetCompanyIds.map(Number) : [];

    // Resolve state name to state code if custom name is provided
    if (data.stateCode) {
      data.stateCode = await findOrCreateStateCode(this.prisma, data.stateCode);
    }

    let companiesToProcess = [companyId];
    if (addAllFirms) {
      const allCompanies = await this.prisma.company.findMany({
        where: { isDeleted: false },
        select: { id: true },
      });
      companiesToProcess = allCompanies.map((c) => c.id);
    } else if (targetCompanyIds.length > 0) {
      companiesToProcess = Array.from(new Set([companyId, ...targetCompanyIds]));
    }

    let primaryAccount = null;

    for (const targetCoId of companiesToProcess) {
      const accountGroupId = await this.resolveBrokersGroupId(targetCoId);

      // Check if account name is unique in this company
      const dup = await this.prisma.account.findFirst({
        where: { companyId: targetCoId, accountName, isDeleted: false },
      });
      if (dup) {
        if (!addAllFirms && targetCompanyIds.length === 0) {
          throw new BadRequestException('Broker name already exists');
        }
        console.warn(`Broker "${accountName}" already exists in company ${targetCoId}, skipping creation`);
        if (targetCoId === companyId) {
          primaryAccount = dup;
        }
        continue;
      }

      const created = await this.prisma.$transaction(async (tx) => {
        const account = await tx.account.create({
          data: {
            companyId: targetCoId,
            accountGroupId,
            accountName,
            printName: emptyToNull(data.printName),
            status: (data.status as 'ACTIVE') || 'ACTIVE',
            isBroker: true,
            gstinNumber: emptyToNull(data.gstinNumber),
            panNumber: emptyToNull(data.panNumber),
            creditDays: Number(data.creditDays) || 0,
            creditLimit: Number(data.creditLimit) || 0,
            addressLine1: emptyToNull(data.addressLine1),
            addressLine2: emptyToNull(data.addressLine2),
            city: emptyToNull(data.city),
            stateCode: emptyToNull(data.stateCode),
            pincode: emptyToNull(data.pincode),
            mobile: emptyToNull(data.mobile),
            phone: emptyToNull(data.phone),
            email: emptyToNull(data.email),
            bankAccountNumber: emptyToNull(data.bankAccountNumber),
            bankName: emptyToNull(data.bankName),
            bankBranch: emptyToNull(data.bankBranch),
            bankIfsc: emptyToNull(data.bankIfsc),
          },
        });

        await tx.brokerProfile.create({
          data: {
            accountId: account.id,
            brokeragePct: Number(data.brokeragePct) || 0,
            addLess: (data.addLess as AddLessType) || AddLessType.LESS,
            tdsLedgerId: data.tdsLedgerId ? Number(data.tdsLedgerId) : null,
            tdsPct: data.tdsPct != null ? Number(data.tdsPct) : 5,
          },
        });

        return tx.account.findUnique({
          where: { id: account.id },
          include: { accountGroup: true, brokerProfile: true },
        });
      });

      if (targetCoId === companyId) {
        primaryAccount = created;
      }
    }

    if (!primaryAccount) {
      throw new BadRequestException('Broker already exists or failed to create in the active company');
    }

    return primaryAccount;
  }

  async update(id: number, companyId: number, data: Record<string, unknown>) {
    const existing = await this.get(id, companyId);
    
    // Resolve state name to state code if custom name is provided
    if (data.stateCode) {
      data.stateCode = await findOrCreateStateCode(this.prisma, String(data.stateCode));
    }

    const accountName = data.accountName ? String(data.accountName).trim() : existing.accountName;

    if (accountName !== existing.accountName) {
      await this.accountService.assertAccountNameAvailable(companyId, accountName, id);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.account.update({
        where: { id },
        data: {
          accountName,
          printName: emptyToNull(data.printName),
          status: data.status as never,
          gstinNumber: emptyToNull(data.gstinNumber),
          panNumber: emptyToNull(data.panNumber),
          creditDays: Number(data.creditDays) || 0,
          creditLimit: Number(data.creditLimit) || 0,
          addressLine1: emptyToNull(data.addressLine1),
          city: emptyToNull(data.city),
          stateCode: emptyToNull(data.stateCode),
          pincode: emptyToNull(data.pincode),
          mobile: emptyToNull(data.mobile),
          email: emptyToNull(data.email),
          bankAccountNumber: emptyToNull(data.bankAccountNumber),
          bankName: emptyToNull(data.bankName),
          bankIfsc: emptyToNull(data.bankIfsc),
          version: { increment: 1 },
        },
      });

      await tx.brokerProfile.updateMany({
        where: { accountId: id },
        data: {
          brokeragePct: Number(data.brokeragePct) || 0,
          addLess: (data.addLess as AddLessType) || AddLessType.LESS,
          tdsPct: data.tdsPct != null ? Number(data.tdsPct) : 5,
        },
      });

      return tx.account.findUnique({
        where: { id },
        include: { accountGroup: true, brokerProfile: true },
      });
    });
  }

  async delete(id: number, companyId: number) {
    await this.get(id, companyId);
    return this.accountService.delete(id, companyId);
  }
}
