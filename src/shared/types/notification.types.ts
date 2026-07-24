// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Notification Center Types
// Phase 15.3: Alert Management, Due Reminders & System Warnings
// ═══════════════════════════════════════════════════════════════

export type NotificationCategory =
  | 'RECEIVABLE'
  | 'PAYABLE'
  | 'STOCK'
  | 'SYSTEM'
  | 'USER'
  | 'FINANCIAL';

export type NotificationPriority =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INFO';

export interface IAppNotificationItem {
  id: number;
  companyId?: number | null;
  userId?: number | null;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  targetPath?: string | null;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string | Date;
}

export interface INotificationSummary {
  notifications: IAppNotificationItem[];
  unreadCount: number;
  criticalCount: number;
}
