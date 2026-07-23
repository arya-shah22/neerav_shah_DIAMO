// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Shared Backup & Restore Types
// ═══════════════════════════════════════════════════════════════

export interface IBackupSettings {
  backupEnabled: boolean;
  backupMode: 'SCHEDULE' | 'START_END' | 'BOTH';
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'NONE';
  executionTime: string; // HH:MM
  destinationPath: string;
  retentionDays: number; // e.g., 15
  backupOnExit: boolean;
  deletionPasswordHash?: string;
}

export interface IBackupHistoryEntry {
  id: string;
  fileName: string;
  filePath: string;
  backupType: 'AUTO' | 'MANUAL' | 'SCHEDULED' | 'COMPANY';
  companyId: number | null;
  fileSize: number; // in bytes
  md5Checksum: string;
  validationStatus: 'PASSED' | 'FAILED';
  comments: string;
  createdAt: string;
  createdBy: string;
}

export const DEFAULT_BACKUP_SETTINGS = (defaultPath: string): IBackupSettings => ({
  backupEnabled: true,
  backupMode: 'BOTH',
  frequency: 'DAILY',
  executionTime: '22:00',
  destinationPath: defaultPath,
  retentionDays: 15,
  backupOnExit: true,
});
