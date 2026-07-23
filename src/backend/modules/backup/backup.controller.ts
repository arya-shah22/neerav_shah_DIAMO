// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Backup & Recovery Controller
// ═══════════════════════════════════════════════════════════════

import { Controller, Inject } from '@nestjs/common';
import { BackupService } from './backup.service';
import { IBackupSettings } from '../../../shared/types/backup.types';

@Controller()
export class BackupController {
  @Inject(BackupService)
  private readonly backupService!: BackupService;

  async handleGetSettings(payload: { companyId: number }) {
    try {
      const data = await this.backupService.getSettings(payload.companyId);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async handleSaveSettings(payload: { companyId: number; settings: IBackupSettings; userId?: number }) {
    try {
      const data = await this.backupService.saveSettings(payload.companyId, payload.settings, payload.userId);
      return { success: true, ...data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async handleCreateBackup(payload: { companyId: number; type: 'AUTO' | 'MANUAL' | 'SCHEDULED' | 'COMPANY'; comments: string; userId?: number }) {
    try {
      const data = await this.backupService.createBackup(payload.companyId, payload.type, payload.comments, payload.userId);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async handleGetHistory(payload: { companyId: number }) {
    try {
      const data = await this.backupService.getBackupHistory(payload.companyId);
      return { success: true, data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async handleRestoreBackup(payload: { companyId: number; backupId: number; userId?: number }) {
    try {
      const data = await this.backupService.restoreBackup(payload.companyId, payload.backupId, payload.userId);
      return { success: true, ...data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async handleDeleteBackup(payload: { backupId: number }) {
    try {
      const data = await this.backupService.deleteBackupRecord(payload.backupId);
      return { success: true, ...data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  async handleDeleteAllBackups(payload: { companyId: number; password?: string; userId?: number }) {
    try {
      const data = await this.backupService.deleteAllBackupRecords(payload.companyId, payload.password, payload.userId);
      return { success: true, ...data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }
}
