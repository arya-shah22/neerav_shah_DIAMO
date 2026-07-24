// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — User Workspace Service
// Phase 15.4: User Workspace Data Persistence & Tracking
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IUserWorkspaceData } from '../../../shared/types/workspace.types';

const DEFAULT_QUICK_ACTIONS = [
  { id: 'new_sale', label: 'New Sale Invoice', path: '/transactions/sales/new', iconName: 'ShoppingCart', color: '#2563eb' },
  { id: 'new_purchase', label: 'New Purchase Bill', path: '/transactions/purchases/new', iconName: 'ShoppingBag', color: '#16a34a' },
  { id: 'cash_receipt', label: 'Cash / Bank Voucher', path: '/vouchers/cash-bank', iconName: 'Wallet', color: '#8b5cf6' },
  { id: 'add_stock', label: 'Add Stock Packet', path: '/inventory/stock/new', iconName: 'Gem', color: '#06b6d4' },
  { id: 'add_account', label: 'New Party Account', path: '/masters/accounting/accounts/new', iconName: 'Users', color: '#f59e0b' },
];

const DEFAULT_PINNED_PAGES = [
  { label: 'Sale Invoices', path: '/transactions/sales', iconName: 'ShoppingCart' },
  { label: 'Purchase Invoices', path: '/transactions/purchases', iconName: 'ShoppingBag' },
  { label: 'Stock Inventory', path: '/inventory/stock', iconName: 'Gem' },
  { label: 'Cash & Bank Book', path: '/vouchers/cash-bank', iconName: 'Wallet' },
];

@Injectable()
export class UserWorkspaceService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async getWorkspace(userId: number): Promise<IUserWorkspaceData> {
    let ws = await this.prisma.userWorkspace.findUnique({
      where: { userId },
    });

    if (!ws) {
      ws = await this.prisma.userWorkspace.create({
        data: {
          userId,
          favoritePages: DEFAULT_PINNED_PAGES,
          quickActions: DEFAULT_QUICK_ACTIONS,
          recentItems: [],
        },
      });
    }

    return {
      userId,
      favoritePages: (ws.favoritePages as any) || DEFAULT_PINNED_PAGES,
      quickActions: (ws.quickActions as any) || DEFAULT_QUICK_ACTIONS,
      recentItems: (ws.recentItems as any) || [],
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
