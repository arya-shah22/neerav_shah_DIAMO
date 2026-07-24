// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Notification Service
// Phase 15.3: Automated System Alerts & Reminders Generator
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { INotificationSummary } from '../../../shared/types/notification.types';

@Injectable()
export class NotificationService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  async getNotifications(companyId: number): Promise<INotificationSummary> {
    const nowTime = new Date().getTime();

    // 1. Scan overdue receivables from sale_invoices table
    const overdueReceivables = await this.prisma.saleInvoice.findMany({
      where: { companyId, isDeleted: false, status: { not: 'CANCELLED' } },
      select: { id: true, voucherNumber: true, outstandingAmount: true, netAmount: true, jamaAmount: true, dueDate: true, customerId: true },
    });

    for (const inv of overdueReceivables) {
      const net = Number(inv.netAmount || 0);
      const jama = Number(inv.jamaAmount || 0);
      const out = inv.outstandingAmount !== null ? Number(inv.outstandingAmount) : Math.max(0, net - jama);
      if (out > 0 && inv.dueDate && new Date(inv.dueDate).getTime() < nowTime) {
        const title = `Overdue Receivable: ${inv.voucherNumber}`;
        const existing = await this.prisma.appNotification.findFirst({
          where: { companyId, title },
        });
        if (!existing) {
          await this.prisma.appNotification.create({
            data: {
              companyId,
              title,
              message: `Payment of ₹${out.toLocaleString('en-IN')} for Sale Invoice ${inv.voucherNumber} is past due date (${new Date(inv.dueDate).toLocaleDateString('en-IN')}).`,
              category: 'RECEIVABLE',
              priority: 'HIGH',
              targetPath: `/transactions/sales/${inv.id}`,
            },
          });
        }
      }
    }

    // 2. Scan overdue payables from purchase_invoices table
    const overduePayables = await this.prisma.purchaseInvoice.findMany({
      where: { companyId, isDeleted: false, status: { not: 'CANCELLED' } },
      select: { id: true, voucherNumber: true, outstandingAmount: true, netAmount: true, jamaAmount: true, dueDate: true },
    });

    for (const inv of overduePayables) {
      const net = Number(inv.netAmount || 0);
      const jama = Number(inv.jamaAmount || 0);
      const out = inv.outstandingAmount !== null ? Number(inv.outstandingAmount) : Math.max(0, net - jama);
      if (out > 0 && inv.dueDate && new Date(inv.dueDate).getTime() < nowTime) {
        const title = `Overdue Payable: ${inv.voucherNumber}`;
        const existing = await this.prisma.appNotification.findFirst({
          where: { companyId, title },
        });
        if (!existing) {
          await this.prisma.appNotification.create({
            data: {
              companyId,
              title,
              message: `Supplier payment of ₹${out.toLocaleString('en-IN')} for Purchase Bill ${inv.voucherNumber} is past due date (${new Date(inv.dueDate).toLocaleDateString('en-IN')}).`,
              category: 'PAYABLE',
              priority: 'HIGH',
              targetPath: `/transactions/purchases/${inv.id}`,
            },
          });
        }
      }
    }

    // 3. Scan stock items on trading challans for > 15 days
    const oldChallans = await this.prisma.challanVoucher.findMany({
      where: { companyId, isDeleted: false, status: 'ISSUED', purpose: 'TRADING_JHANGHAD' },
      select: { id: true, challanNumber: true, challanDate: true },
    });

    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
    for (const ch of oldChallans) {
      if (nowTime - new Date(ch.challanDate).getTime() > fifteenDaysMs) {
        const title = `Jhangad Pending > 15 Days: ${ch.challanNumber}`;
        const existing = await this.prisma.appNotification.findFirst({
          where: { companyId, title },
        });
        if (!existing) {
          await this.prisma.appNotification.create({
            data: {
              companyId,
              title,
              message: `Trading Jhangad Challan ${ch.challanNumber} has been out on approval for over 15 days without return or conversion.`,
              category: 'STOCK',
              priority: 'MEDIUM',
              targetPath: `/transactions/challans/trading/${ch.id}`,
            },
          });
        }
      }
    }

    // Fetch all notifications sorted by priority and date
    const notifications = await this.prisma.appNotification.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = notifications.filter((n: any) => !n.isRead).length;
    const criticalCount = notifications.filter((n: any) => n.priority === 'CRITICAL' && !n.isRead).length;

    return {
      notifications: notifications.map((n: any) => ({
        ...n,
        category: n.category as any,
        priority: n.priority as any,
      })),
      unreadCount,
      criticalCount,
    };
  }

  async markAsRead(id: number): Promise<boolean> {
    await this.prisma.appNotification.update({
      where: { id },
      data: { isRead: true },
    });
    return true;
  }

  async markAllAsRead(companyId: number): Promise<boolean> {
    await this.prisma.appNotification.updateMany({
      where: { companyId, isRead: false },
      data: { isRead: true },
    });
    return true;
  }

  async dismissNotification(id: number): Promise<boolean> {
    await this.prisma.appNotification.delete({
      where: { id },
    });
    return true;
  }
}
