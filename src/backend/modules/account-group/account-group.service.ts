// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Account Group Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { DEFAULT_ACCOUNT_GROUPS } from './default-groups';
import { hardDeleteAccount } from '../../utils/hard-delete';

export interface AccountGroupTreeNode {
  id: number;
  groupName: string;
  nature: string;
  parentGroupId: number | null;
  isGlobal: boolean;
  sortOrder: number;
  children: AccountGroupTreeNode[];
}

@Injectable()
export class AccountGroupService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async seedDefaultGroups(companyId: number): Promise<{ created: number; restored: number }> {
    const existingAll = await this.prisma.accountGroup.findMany({
      where: { companyId, isDeleted: false },
    });

    const idByName = new Map<string, number>();
    for (const group of existingAll) {
      idByName.set(group.groupName, group.id);
    }

    let created = 0;

    for (const def of DEFAULT_ACCOUNT_GROUPS) {
      const parentGroupId = def.parentName ? idByName.get(def.parentName) ?? null : null;
      const existing = existingAll.find((g) => g.groupName === def.groupName);

      if (existing) {
        idByName.set(def.groupName, existing.id);
        continue;
      }

      // Remove legacy soft-deleted row blocking the unique name constraint
      const legacy = await this.prisma.accountGroup.findFirst({
        where: { companyId, groupName: def.groupName, isDeleted: true },
      });
      if (legacy) {
        await this.prisma.accountGroup.delete({ where: { id: legacy.id } });
      }

      const createdGroup = await this.prisma.accountGroup.create({
        data: {
          companyId,
          groupName: def.groupName,
          nature: def.nature,
          parentGroupId,
          isGlobal: true,
          sortOrder: def.sortOrder,
        },
      });
      idByName.set(def.groupName, createdGroup.id);
      created++;
    }

    return { created, restored: 0 };
  }

  async list(companyId: number) {
    return this.prisma.accountGroup.findMany({
      where: { companyId, isDeleted: false },
      orderBy: [{ sortOrder: 'asc' }, { groupName: 'asc' }],
      include: {
        parentGroup: { select: { id: true, groupName: true } },
        _count: { select: { accounts: true, childGroups: true } },
      },
    });
  }

  async tree(companyId: number): Promise<AccountGroupTreeNode[]> {
    const groups = await this.prisma.accountGroup.findMany({
      where: { companyId, isDeleted: false },
      orderBy: [{ sortOrder: 'asc' }, { groupName: 'asc' }],
    });

    const map = new Map<number, AccountGroupTreeNode>();
    const roots: AccountGroupTreeNode[] = [];

    for (const g of groups) {
      map.set(g.id, {
        id: g.id,
        groupName: g.groupName,
        nature: g.nature,
        parentGroupId: g.parentGroupId,
        isGlobal: g.isGlobal,
        sortOrder: g.sortOrder,
        children: [],
      });
    }

    for (const node of map.values()) {
      if (node.parentGroupId && map.has(node.parentGroupId)) {
        map.get(node.parentGroupId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  async get(id: number, companyId: number) {
    const group = await this.prisma.accountGroup.findFirst({
      where: { id, companyId, isDeleted: false },
      include: { parentGroup: { select: { id: true, groupName: true } } },
    });
    if (!group) throw new BadRequestException('Account group not found');
    return group;
  }

  async create(companyId: number, data: {
    groupName: string;
    nature: string;
    parentGroupId?: number | null;
    sortOrder?: number;
  }) {
    const groupName = data.groupName.trim();
    if (!groupName) throw new BadRequestException('Group name is required');

    const existing = await this.prisma.accountGroup.findFirst({
      where: { companyId, groupName },
    });

    if (existing) {
      if (!existing.isDeleted) {
        throw new BadRequestException(`Account group "${groupName}" already exists.`);
      }
      // Legacy soft-deleted row — remove permanently so the name can be reused
      await this.prisma.accountGroup.delete({ where: { id: existing.id } });
    }

    if (data.parentGroupId) {
      await this.get(data.parentGroupId, companyId);
    }

    return this.prisma.accountGroup.create({
      data: {
        companyId,
        groupName,
        nature: data.nature,
        parentGroupId: data.parentGroupId || null,
        isGlobal: false,
        sortOrder: data.sortOrder ?? 0,
      },
    });
  }

  async update(id: number, companyId: number, data: {
    groupName?: string;
    nature?: string;
    parentGroupId?: number | null;
    sortOrder?: number;
  }) {
    const existing = await this.get(id, companyId);

    if (existing.isGlobal && data.groupName && data.groupName !== existing.groupName) {
      throw new BadRequestException('System reserved groups cannot be renamed');
    }

    if (data.parentGroupId !== undefined && data.parentGroupId !== null) {
      if (data.parentGroupId === id) {
        throw new BadRequestException('A group cannot be its own parent');
      }
      await this.validateNoCircularParent(id, data.parentGroupId, companyId);
      await this.get(data.parentGroupId, companyId);
    }

    if (data.groupName && data.groupName !== existing.groupName) {
      const dup = await this.prisma.accountGroup.findFirst({
        where: { companyId, groupName: data.groupName.trim(), id: { not: id } },
      });
      if (dup) {
        if (dup.isDeleted) {
          await this.prisma.accountGroup.delete({ where: { id: dup.id } });
        } else {
          throw new BadRequestException(`Account group "${data.groupName.trim()}" already exists.`);
        }
      }
    }

    return this.prisma.accountGroup.update({
      where: { id },
      data: {
        groupName: data.groupName,
        nature: data.nature,
        parentGroupId: data.parentGroupId,
        sortOrder: data.sortOrder,
        version: { increment: 1 },
      },
    });
  }

  async delete(id: number, companyId: number) {
    const existing = await this.get(id, companyId);

    if (existing.isGlobal) {
      throw new BadRequestException('System reserved groups cannot be deleted');
    }

    const activeChildGroups = await this.prisma.accountGroup.count({
      where: { parentGroupId: id, isDeleted: false },
    });
    if (activeChildGroups > 0) {
      throw new BadRequestException('Cannot delete a group that has child groups. Delete or move child groups first.');
    }

    const activeAccounts = await this.prisma.account.count({
      where: { accountGroupId: id, isDeleted: false },
    });
    if (activeAccounts > 0) {
      throw new BadRequestException('Cannot delete a group that contains accounts. Move or delete accounts first.');
    }

    await this.purgeLegacyAccountsInGroup(id, companyId);

    await this.prisma.accountGroup.updateMany({
      where: { parentGroupId: id, isDeleted: true },
      data: { parentGroupId: null },
    });

    return this.prisma.accountGroup.delete({ where: { id } });
  }

  /** Clean up legacy soft-deleted accounts still linked to this group. */
  private async purgeLegacyAccountsInGroup(groupId: number, companyId: number): Promise<void> {
    const legacyAccounts = await this.prisma.account.findMany({
      where: { accountGroupId: groupId, companyId, isDeleted: true },
      select: { id: true },
    });

    for (const account of legacyAccounts) {
      await hardDeleteAccount(this.prisma, account.id, companyId);
    }
  }

  private async validateNoCircularParent(
    groupId: number,
    newParentId: number,
    companyId: number,
  ): Promise<void> {
    let currentId: number | null = newParentId;
    const visited = new Set<number>();

    while (currentId) {
      if (currentId === groupId) {
        throw new BadRequestException('Circular parent reference detected');
      }
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const parent: { parentGroupId: number | null } | null = await this.prisma.accountGroup.findFirst({
        where: { id: currentId, companyId, isDeleted: false },
        select: { parentGroupId: true },
      });
      currentId = parent?.parentGroupId ?? null;
    }
  }
}
