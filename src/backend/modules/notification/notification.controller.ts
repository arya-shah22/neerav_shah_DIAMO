// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Notification Controller
// Phase 15.3: Notification IPC controller handlers
// ═══════════════════════════════════════════════════════════════

import { Controller, Inject } from '@nestjs/common';
import { NotificationService } from './notification.service';
import type { IApiResponse } from '../../../shared/types/common.types';
import type { INotificationSummary } from '../../../shared/types/notification.types';

@Controller()
export class NotificationController {
  @Inject(NotificationService)
  private readonly notificationService!: NotificationService;

  async handleGetNotifications(payload: { companyId: number }): Promise<IApiResponse<INotificationSummary>> {
    try {
      const data = await this.notificationService.getNotifications(payload.companyId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to fetch notifications',
      };
    }
  }

  async handleMarkAsRead(payload: { id: number }): Promise<IApiResponse<boolean>> {
    try {
      const data = await this.notificationService.markAsRead(payload.id);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to mark notification as read',
      };
    }
  }

  async handleMarkAllAsRead(payload: { companyId: number }): Promise<IApiResponse<boolean>> {
    try {
      const data = await this.notificationService.markAllAsRead(payload.companyId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to mark all notifications as read',
      };
    }
  }

  async handleDismiss(payload: { id: number }): Promise<IApiResponse<boolean>> {
    try {
      const data = await this.notificationService.dismissNotification(payload.id);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to dismiss notification',
      };
    }
  }
}
