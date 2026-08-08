// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — User Workspace Service
// Phase 15.4: User Workspace Data Persistence & Tracking
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IUserWorkspaceData } from '../../../shared/types/workspace.types';

const DEFAULT_QUICK_ACTIONS = [
  { id: '/transactions/sales', label: 'New Sale Invoice', path: '/transactions/sales', iconName: 'ShoppingCart', color: '#1e40af' },
  { id: '/transactions/purchases', label: 'New Purchase Bill', path: '/transactions/purchases', iconName: 'ShoppingBag', color: '#166534' },
  { id: '/vouchers/cash-bank', label: 'Cash / Bank Voucher', path: '/vouchers/cash-bank', iconName: 'Wallet', color: '#6b21a8' },
  { id: '/inventory/stock', label: 'Add Stock Packet', path: '/inventory/stock', iconName: 'Gem', color: '#155e75' },
  { id: '/masters/accounting/accounts', label: 'New Party Account', path: '/masters/accounting/accounts', iconName: 'Users', color: '#92400e' },
];

const DEFAULT_PINNED_PAGES: any[] = [];

@Injectable()
export class UserWorkspaceService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async getWorkspace(userId: number): Promise<IUserWorkspaceData> {
    let ws = await this.prisma.userWorkspace.findUnique({
      where: { userId },
    });

    if (!ws) {
      try {
        ws = await this.prisma.userWorkspace.create({
          data: {
            userId,
            favoritePages: [],
            quickActions: DEFAULT_QUICK_ACTIONS,
            recentItems: [],
          },
        });
      } catch (_err) {
        ws = await this.prisma.userWorkspace.findUnique({
          where: { userId },
        });
      }
    }

    return {
      userId,
      favoritePages: (ws?.favoritePages as any) || [],
      quickActions: (ws?.quickActions as any) || DEFAULT_QUICK_ACTIONS,
      recentItems: (ws?.recentItems as any) || [],
    };
  }

  async updateWorkspace(userId: number, payload: Partial<IUserWorkspaceData>): Promise<IUserWorkspaceData> {
    const dataToUpdate: any = {};
    if (payload.favoritePages !== undefined) dataToUpdate.favoritePages = payload.favoritePages;
    if (payload.quickActions !== undefined) dataToUpdate.quickActions = payload.quickActions;
    if (payload.recentItems !== undefined) dataToUpdate.recentItems = payload.recentItems;

    await this.prisma.userWorkspace.upsert({
      where: { userId },
      update: dataToUpdate,
      create: {
        userId,
        favoritePages: (payload.favoritePages || DEFAULT_PINNED_PAGES) as any,
        quickActions: (payload.quickActions || DEFAULT_QUICK_ACTIONS) as any,
        recentItems: (payload.recentItems || []) as any,
      },
    });

    return this.getWorkspace(userId);
  }

  async logRecentPage(userId: number, page: { label: string; path: string }): Promise<IUserWorkspaceData> {
    const currentWs = await this.getWorkspace(userId);
    const existingRecents = currentWs.recentItems.filter((item) => item.path !== page.path);
    const updatedRecents = [
      { label: page.label, path: page.path, accessedAt: new Date() },
      ...existingRecents,
    ].slice(0, 8); // Keep top 8 recent pages

    return this.updateWorkspace(userId, { recentItems: updatedRecents });
  }
}
