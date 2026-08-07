// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Account Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AccountStatus, GstRegType, DebitCreditType } from '@prisma/client';
import { hardDeleteAccount } from '../../utils/hard-delete';
import { findOrCreateStateCode } from '../../utils/state-resolver';

@Injectable()
export class AccountService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async list(companyId: number, filters?: { search?: string; groupId?: number; isBroker?: boolean }) {
    const accounts = await this.prisma.account.findMany({
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
        broker: { select: { id: true, accountName: true } },
      },
    });

    const glEntries = await this.prisma.generalLedgerEntry.groupBy({
      by: ['accountId', 'debitCreditType'],
      where: { companyId },
      _sum: { amount: true }
    });

    return accounts.map(account => {
      const opening = Number(account.openingBalanceAmount) || 0;
      const isOpeningDebit = account.openingBalanceType === DebitCreditType.DEBIT;

      const accountGL = glEntries.filter(e => e.accountId === account.id);
      const debitSum = Number(accountGL.find(e => e.debitCreditType === DebitCreditType.DEBIT)?._sum?.amount) || 0;
      const creditSum = Number(accountGL.find(e => e.debitCreditType === DebitCreditType.CREDIT)?._sum?.amount) || 0;

      const balance = isOpeningDebit ? (opening + debitSum - creditSum) : (-opening + debitSum - creditSum);

      return {
        ...account,
        balance
      };
    });
  }

  async search(companyId: number, query?: string, limit = 200) {
    const cleanQuery = query ? query.trim() : '';
    return this.prisma.account.findMany({
      where: {
        companyId,
        isDeleted: false,
        status: AccountStatus.ACTIVE,
        ...(cleanQuery ? { accountName: { contains: cleanQuery } } : {}),
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
        accountGroup: {
          select: {
            id: true,
            groupName: true,
          },
        },
      },
    });
  }

  async get(id: number, companyId: number) {
    const account = await this.prisma.account.findFirst({
      where: { id, companyId, isDeleted: false },
      include: {
        accountGroup: { select: { id: true, groupName: true, nature: true } },
        brokerProfile: true,
        broker: { select: { id: true, accountName: true } },
      },
    });
    if (!account) throw new BadRequestException('Account not found');
    return account;
  }

  async create(companyId: number, data: Record<string, any>) {
    const addAllFirms = Boolean(data.addAllFirms);
    const targetCompanyIds = Array.isArray(data.targetCompanyIds) ? data.targetCompanyIds.map(Number) : [];

    // Resolve state name to state code if custom name is provided
    if (data.stateCode) {
      data.stateCode = await findOrCreateStateCode(this.prisma, data.stateCode);
    }

    // Get the name of the selected account group to match across other companies
    const currentGroup = await this.prisma.accountGroup.findFirst({
      where: { id: Number(data.accountGroupId), companyId, isDeleted: false },
    });
    if (!currentGroup) throw new BadRequestException('Selected Account Group not found');

    // Auto-detect if this is a broker based on group name
    const isBroker = currentGroup.groupName === 'Brokers';

    const canBuySellBoth = Boolean(data.canBuySellBoth);
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
      // Helper function to resolve/create group
      const getOrCreateGroup = async (coId: number, isDebtor: boolean) => {
        const groupName = isDebtor ? 'Sundry Debtors' : 'Sundry Creditors';
        const nature = isDebtor ? 'ASSET' : 'LIABILITY';
        let gp = await this.prisma.accountGroup.findFirst({
          where: { companyId: coId, groupName, isDeleted: false }
        });
        if (!gp) {
          gp = await this.prisma.accountGroup.create({
            data: { companyId: coId, groupName, nature }
          });
        }
        return gp.id;
      };

      if (canBuySellBoth) {
        // Create single unified account with exact user name under Sundry Debtors
        const debtorGroupId = await getOrCreateGroup(targetCoId, true);
        const cleanName = (data.accountName as string).trim();
        const dupDebtor = await this.prisma.account.findFirst({
          where: { companyId: targetCoId, accountName: cleanName, isDeleted: false },
        });

        let createdDebtor = dupDebtor;
        if (!dupDebtor) {
          createdDebtor = await this.prisma.account.create({
            data: {
              ...this.mapAccountFields({ ...data, accountName: cleanName, accountGroupId: debtorGroupId }),
              companyId: targetCoId,
              isBroker,
            },
            include: { accountGroup: { select: { id: true, groupName: true } } },
          });
        }

        if (targetCoId === companyId) {
          primaryAccount = createdDebtor;
        }
      } else {
        // Single Account Creation logic
        let targetGroupId = Number(data.accountGroupId);
        if (targetCoId !== companyId) {
          const targetGroup = await this.prisma.accountGroup.findFirst({
            where: { companyId: targetCoId, groupName: currentGroup.groupName, isDeleted: false },
          });
          if (!targetGroup) {
            console.warn(`Group ${currentGroup.groupName} not found in company ${targetCoId}, skipping creation`);
            continue;
          }
          targetGroupId = targetGroup.id;
        }

        const dup = await this.prisma.account.findFirst({
          where: { companyId: targetCoId, accountName: (data.accountName as string).trim(), isDeleted: false },
        });
        if (dup) {
          if (!addAllFirms && targetCompanyIds.length === 0) {
            throw new BadRequestException('Account name already exists');
          }
          console.warn(`Account ${(data.accountName as string).trim()} already exists in company ${targetCoId}, skipping`);
          if (targetCoId === companyId) {
            primaryAccount = dup;
          }
          continue;
        }

        const created = await this.prisma.account.create({
          data: {
            ...this.mapAccountFields({ ...data, accountGroupId: targetGroupId }),
            companyId: targetCoId,
            isBroker,
          },
          include: {
            accountGroup: { select: { id: true, groupName: true } },
          },
        });

        if (isBroker) {
          await this.prisma.brokerProfile.create({
            data: {
              accountId: created.id,
              brokeragePct: 0,
              addLess: 'LESS',
              tdsPct: 5,
            },
          });
        }

        if (targetCoId === companyId) {
          primaryAccount = created;
        }
      }
    }

    if (!primaryAccount) {
      throw new BadRequestException('Account already exists or failed to create in the active company');
    }


    return primaryAccount;
  }

  async update(id: number, companyId: number, data: Record<string, any>) {
    const existing = await this.get(id, companyId);

    // Resolve state name to state code if custom name is provided
    if (data.stateCode) {
      data.stateCode = await findOrCreateStateCode(this.prisma, data.stateCode);
    }

    if (data.accountName && data.accountName !== existing.accountName) {
      await this.validateUniqueName(companyId, data.accountName as string, id);
    }
    if (data.accountGroupId) {
      await this.validateGroup(companyId, data.accountGroupId as number);
    }

    // Auto-detect isBroker based on updated group
    const currentGroup = await this.prisma.accountGroup.findFirst({
      where: { id: Number(data.accountGroupId || existing.accountGroupId), companyId, isDeleted: false },
    });
    const isBroker = currentGroup ? currentGroup.groupName === 'Brokers' : existing.isBroker;

    if (isBroker) {
      await this.prisma.brokerProfile.upsert({
        where: { accountId: id },
        create: {
          accountId: id,
          brokeragePct: 0,
          addLess: 'LESS',
          tdsPct: 5,
        },
        update: {},
      });
    }

    return this.prisma.account.update({
      where: { id },
      data: {
        ...this.mapAccountFields(data),
        isBroker,
        version: { increment: 1 },
      },
      include: {
        accountGroup: { select: { id: true, groupName: true } },
        brokerProfile: true,
      },
    });
  }

  async updateStatus(id: number, companyId: number, status: AccountStatus) {
    const existing = await this.prisma.account.findFirst({
      where: { id, companyId, isDeleted: false },
    });
    if (!existing) throw new BadRequestException('Account not found');

    return this.prisma.account.update({
      where: { id },
      data: { status },
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

  private mapAccountFields(data: Record<string, any>) {
    return {
      accountGroupId: data.accountGroupId as number,
      accountName: data.accountName as string,
      printName: (data.printName as string) || (data.accountName as string) || null,
      status: (data.status as AccountStatus) || AccountStatus.ACTIVE,
      gstinNumber: (data.gstinNumber as string) || null,
      panNumber: (data.panNumber as string) || null,
      gstRegType: (data.gstRegType as GstRegType) || null,
      gstPct: (data.gstPct != null && !isNaN(Number(data.gstPct))) ? Number(data.gstPct) : null,
      brokerId: (data.brokerId && !isNaN(Number(data.brokerId))) ? Number(data.brokerId) : null,
      udyamMsme: (data.udyamMsme as string) || null,
      tdsLedgerId: (data.tdsLedgerId && !isNaN(Number(data.tdsLedgerId))) ? Number(data.tdsLedgerId) : null,
      tdsPct: (data.tdsPct != null && !isNaN(Number(data.tdsPct))) ? Number(data.tdsPct) : null,
      tcsPct: (data.tcsPct != null && !isNaN(Number(data.tcsPct))) ? Number(data.tcsPct) : null,
      creditDays: (!isNaN(Number(data.creditDays))) ? Number(data.creditDays) : 0,
      creditLimit: (!isNaN(Number(data.creditLimit))) ? Number(data.creditLimit) : 0,
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
      openingBalanceAmount: (!isNaN(Number(data.openingBalanceAmount))) ? Number(data.openingBalanceAmount) : 0,
      openingBalanceType: (data.openingBalanceType as DebitCreditType) || null,
    };
  }

  async seedDefaultAccounts(companyId: number) {
    const getGroup = async (groupName: string, nature: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE') => {
      let grp = await this.prisma.accountGroup.findFirst({
        where: { companyId, groupName, isDeleted: false },
      });
      if (!grp) {
        grp = await this.prisma.accountGroup.create({
          data: { companyId, groupName, nature, sortOrder: 1 },
        });
      }
      return grp.id;
    };

    const gCash = await getGroup('Cash-in-Hand', 'ASSET');
    const gBank = await getGroup('Bank Accounts', 'ASSET');
    const gSales = await getGroup('Sales Accounts', 'INCOME');
    const gPurchase = await getGroup('Purchase Accounts', 'EXPENSE');
    const gTaxes = await getGroup('Duties & Taxes', 'LIABILITY');
    const gDirectExp = await getGroup('Direct Expenses', 'EXPENSE');

    const defaultAccounts = [
      { name: 'Main Cash Account', groupId: gCash, opening: 500000 },
      { name: 'HDFC Bank Ltd - Current A/c', groupId: gBank, bankAcc: '50200012345678', ifsc: 'HDFC0000123', opening: 2500000 },
      { name: 'ICICI Bank - Export A/c', groupId: gBank, bankAcc: '60300098765432', ifsc: 'ICIC0000456', opening: 1500000 },
      { name: 'Sales - Diamonds', groupId: gSales },
      { name: 'Purchase - Rough Diamonds', groupId: gPurchase },
      { name: 'CGST Input/Output', groupId: gTaxes },
      { name: 'SGST Input/Output', groupId: gTaxes },
      { name: 'IGST Input/Output', groupId: gTaxes },
      { name: 'Job Work Expense', groupId: gDirectExp },
    ];

    let createdCount = 0;
    for (const item of defaultAccounts) {
      const existing = await this.prisma.account.findFirst({
        where: { companyId, accountName: item.name, isDeleted: false },
      });
      if (!existing) {
        await this.prisma.account.create({
          data: {
            companyId,
            accountGroupId: item.groupId,
            accountName: item.name,
            printName: item.name,
            bankAccountNumber: item.bankAcc || null,
            bankIfsc: item.ifsc || null,
            openingBalanceAmount: item.opening || 0,
            openingBalanceType: DebitCreditType.DEBIT,
          },
        });
        createdCount++;
      }
    }
    return { success: true, createdCount };
  }
}
