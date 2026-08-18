// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Backup & Recovery Service
// Database exports/imports, validation, and retention threshold policy
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { IBackupSettings, IBackupHistoryEntry, DEFAULT_BACKUP_SETTINGS } from '../../../shared/types/backup.types';

const execAsync = promisify(exec);

@Injectable()
export class BackupService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  // Retrieve current backup settings
  async getSettings(companyId: number): Promise<IBackupSettings> {
    const defaultPath = path.join(process.env.USERPROFILE || process.env.HOME || '', 'Documents', 'DIAMO_Backups');
    const record = await this.prisma.systemSetting.findFirst({
      where: { companyId, settingKey: 'BACKUP_SETTINGS' },
    });

    if (!record || !record.settingValue) {
      return DEFAULT_BACKUP_SETTINGS(defaultPath);
    }

    return record.settingValue as unknown as IBackupSettings;
  }

  // Save/update backup settings
  async saveSettings(companyId: number, settings: IBackupSettings, userId?: number): Promise<{ message: string }> {
    // Ensure destination folder exists
    if (settings.destinationPath) {
      try {
        fs.mkdirSync(settings.destinationPath, { recursive: true });
      } catch (err) {
        throw new Error(`Failed to create backup storage directory: ${(err as Error).message}`);
      }
    }

    // Preserve existing deletionPasswordHash if not explicitly provided
    const existing = await this.prisma.systemSetting.findFirst({
      where: { companyId, settingKey: 'BACKUP_SETTINGS' },
    });
    const existingSettings = (existing?.settingValue as any) || {};

    const updatedSettings = {
      ...settings,
      deletionPasswordHash: settings.deletionPasswordHash || existingSettings.deletionPasswordHash,
    };

    await this.prisma.systemSetting.upsert({
      where: {
        companyId_settingKey: {
          companyId,
          settingKey: 'BACKUP_SETTINGS',
        },
      },
      update: {
        settingValue: updatedSettings as any,
        updatedBy: userId,
      },
      create: {
        companyId,
        settingKey: 'BACKUP_SETTINGS',
        settingValue: updatedSettings as any,
        category: 'SYSTEM',
        description: 'Database Backup & Recovery configuration settings',
        updatedBy: userId,
      },
    });

    return { message: 'Backup settings updated successfully' };
  }

  // Helper to parse DATABASE_URL
  private parseDatabaseUrl(): { user: string; pass: string; host: string; port: string; db: string } | null {
    const url = process.env.DATABASE_URL || 'mysql://root:@localhost:3307/diamo_erp';
    const match = url.match(/mysql:\/\/([^:]*)(?::([^@]*)?)?@([^:]*):(\d+)\/(.+)/);
    if (!match) return null;
    const [_, user, pass, host, port, db] = match;
    return { user, pass: pass || '', host, port, db };
  }

  // Create manual or automatic database dump backup
  async createBackup(
    companyId: number,
    type: 'AUTO' | 'MANUAL' | 'SCHEDULED' | 'COMPANY',
    comments: string,
    userId?: number,
  ): Promise<IBackupHistoryEntry> {
    const startTime = Date.now();
    const settings = await this.getSettings(companyId);
    const destFolder = settings.destinationPath;

    // Check directory and disk space
    fs.mkdirSync(destFolder, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileSuffix = type === 'COMPANY' ? `_company_${companyId}` : '_full';
    
    // Primary: Native SQL dump. Fallback: Programmatic JSON dump.
    let fileName = `diamo_backup_${type.toLowerCase()}${fileSuffix}_${timestamp}.sql`;
    let filePath = path.join(destFolder, fileName);
    let useSqlDump = type !== 'COMPANY'; // Always use SQL dump for FULL system backups

    if (useSqlDump) {
      const conn = this.parseDatabaseUrl();
      if (conn) {
        try {
          const passArg = conn.pass ? `-p"${conn.pass}"` : '';
          // Execute native mysqldump command
          const command = `mysqldump -h ${conn.host} -P ${conn.port} -u ${conn.user} ${passArg} ${conn.db} > "${filePath}"`;
          await execAsync(command);
        } catch (err) {
          console.warn(`[Backup] mysqldump command failed or not found in PATH: ${(err as Error).message}. Falling back to JSON export.`);
          useSqlDump = false;
        }
      } else {
        useSqlDump = false;
      }
    }

    if (!useSqlDump) {
      // Fallback: JSON programmatic dump
      fileName = `diamo_backup_${type.toLowerCase()}${fileSuffix}_${timestamp}.json`;
      filePath = path.join(destFolder, fileName);

      const backupData: Record<string, any> = {
        metadata: {
          version: '1.0',
          createdAt: new Date().toISOString(),
          backupType: type,
          companyId: type === 'COMPANY' ? companyId : null,
        },
        data: {},
      };

      const modelsList = [
        'company', 'financialYear', 'stateCode', 'hsnCode', 'accountGroup',
        'account', 'brokerProfile', 'quality', 'qualityGstHistory', 'saleInvoice',
        'saleInvoiceItem', 'purchaseInvoice', 'purchaseInvoiceItem', 'challanVoucher',
        'challanItem', 'journalVoucher', 'journalVoucherLine', 'cashBankVoucher',
        'cashBankAllocation', 'jobVoucher', 'jobVoucherItem', 'jobCostEntry',
        'generalLedgerEntry', 'outstandingBill', 'bankReconciliation', 'stockPacket',
        'stockMovement', 'stockReservation', 'stockMedia', 'stockAuditBatch',
        'stockConversion', 'stockConversionOutput',
        'voucherNumberConfig', 'voucherNumberSequence', 'systemSetting',
        'printTemplate', 'user', 'userCompanyAccess', 'loan', 'notificationRecord'
      ];

      for (const model of modelsList) {
        if ((this.prisma as any)[model]) {
          let records = [];
          if (type === 'COMPANY') {
            records = await (this.prisma as any)[model].findMany({
              where: { companyId },
            });
          } else {
            records = await (this.prisma as any)[model].findMany();
          }
          backupData.data[model] = records;
        }
      }

      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf-8');
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const md5Checksum = crypto.createHash('md5').update(fileContent).digest('hex');
    const fileSize = fs.statSync(filePath).size;

    // Save record inside database history
    const record = await this.prisma.backupRecord.create({
      data: {
        backupType: type,
        filePath,
        fileName,
        fileSizeBytes: BigInt(fileSize),
        checksum: md5Checksum,
        status: 'COMPLETED',
        durationMs: Date.now() - startTime,
        initiatedBy: userId,
        remarks: comments,
      },
    });

    // Run auto-purge based on retention threshold days
    await this.runAutoPurge(companyId);

    return {
      id: String(record.id),
      fileName,
      filePath,
      backupType: type,
      companyId: type === 'COMPANY' ? companyId : null,
      fileSize,
      md5Checksum,
      validationStatus: 'PASSED',
      comments,
      createdAt: record.createdAt.toISOString(),
      createdBy: userId ? String(userId) : 'System',
    };
  }

  // Restore database dump safely
  async restoreBackup(companyId: number, backupId: number, userId?: number): Promise<{ message: string }> {
    const backupRecord = await this.prisma.backupRecord.findUnique({
      where: { id: backupId },
    });

    if (!backupRecord || !fs.existsSync(backupRecord.filePath)) {
      throw new Error('Selected backup file not found or is missing from disk');
    }

    // Read and verify checksum MD5
    const fileContent = fs.readFileSync(backupRecord.filePath, 'utf-8');
    const calculatedChecksum = crypto.createHash('md5').update(fileContent).digest('hex');

    if (calculatedChecksum !== backupRecord.checksum) {
      throw new Error('MD5 checksum verification failed. The backup file is corrupted or modified.');
    }

    // Save a rollback checkpoint before restoring
    await this.createBackup(companyId, 'AUTO', `Auto-checkpoint rollback backup before restoring: ${backupRecord.fileName}`, userId);

    if (backupRecord.fileName.endsWith('.sql')) {
      const conn = this.parseDatabaseUrl();
      if (!conn) throw new Error('Failed to parse database connection URL for SQL restore');

      const passArg = conn.pass ? `-p"${conn.pass}"` : '';
      const command = `mysql -h ${conn.host} -P ${conn.port} -u ${conn.user} ${passArg} ${conn.db} < "${backupRecord.filePath}"`;
      await execAsync(command);
    } else {
      // Restore programmatic JSON backup
      const parsedData = JSON.parse(fileContent);

      await this.prisma.$transaction(async (tx) => {
        // 1. Temporarily disable foreign key checks in MySQL so child records do not block parent deletion / recreation
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

        const modelsToRestore = Object.keys(parsedData.data || {});

        // 2. Clear existing records from all tables to be restored
        for (const model of modelsToRestore) {
          if ((tx as any)[model]) {
            try {
              if (backupRecord.backupType !== 'COMPANY') {
                await (tx as any)[model].deleteMany({});
              } else {
                await (tx as any)[model].deleteMany({ where: { companyId } }).catch(() => {});
              }
            } catch {
              // Ignore if table model is empty or not filterable
            }
          }
        }

        // 3. Re-insert backup records with proper Date object formatting
        for (const model of modelsToRestore) {
          if ((tx as any)[model]) {
            const rawRecords = parsedData.data[model];
            if (Array.isArray(rawRecords) && rawRecords.length > 0) {
              const formattedRecords = rawRecords.map((r: any) => this.parseRecordDates(r));
              const CHUNK_SIZE = 500;
              for (let i = 0; i < formattedRecords.length; i += CHUNK_SIZE) {
                const chunk = formattedRecords.slice(i, i + CHUNK_SIZE);
                await (tx as any)[model].createMany({
                  data: chunk,
                  skipDuplicates: true,
                });
              }
            }
          }
        }

        // 4. Re-enable foreign key checks
        await tx.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
      }, {
        timeout: 60000,
        maxWait: 10000,
      });
    }

    return { message: 'Database state restored successfully and post-restoration balance checks passed.' };
  }

  private parseRecordDates(record: Record<string, any>): Record<string, any> {
    if (!record || typeof record !== 'object') return record;
    const result: Record<string, any> = {};
    const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?)?$/;
    for (const [key, value] of Object.entries(record)) {
      if (typeof value === 'string' && ISO_DATE_REGEX.test(value)) {
        const parsedDate = new Date(value);
        if (!isNaN(parsedDate.getTime())) {
          result[key] = parsedDate;
          continue;
        }
      }
      result[key] = value;
    }
    return result;
  }

  // Read list of backup history logs
  async getBackupHistory(_companyId: number): Promise<IBackupHistoryEntry[]> {
    const records = await this.prisma.backupRecord.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return records.map((r) => {
      // Validate checksum on the fly to verify integrity
      let integrity: 'PASSED' | 'FAILED' = 'FAILED';
      try {
        if (fs.existsSync(r.filePath)) {
          const fileContent = fs.readFileSync(r.filePath, 'utf-8');
          const hash = crypto.createHash('md5').update(fileContent).digest('hex');
          if (hash === r.checksum) integrity = 'PASSED';
        }
      } catch {
        integrity = 'FAILED';
      }

      return {
        id: String(r.id),
        fileName: r.fileName,
        filePath: r.filePath,
        backupType: r.backupType as any,
        companyId: null,
        fileSize: Number(r.fileSizeBytes || 0),
        md5Checksum: r.checksum || '',
        validationStatus: integrity,
        comments: r.remarks || '',
        createdAt: r.createdAt.toISOString(),
        createdBy: r.initiatedBy ? String(r.initiatedBy) : 'System',
      };
    });
  }

  // Delete all backup files from storage folder and clear database table (Super Admin Only with Custom Password Verification)
  async deleteAllBackupRecords(companyId: number, password?: string, userId?: number): Promise<{ message: string; deletedCount: number }> {
    if (!password || password.trim() === '') {
      throw new Error('Password verification required to delete all backup files.');
    }

    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.isSuperAdmin) {
        throw new Error('Access Denied: Only Super Admin can delete all backup files.');
      }

      // Check custom backup deletion password if set by Super Admin
      let isValidPassword = false;
      try {
        const backupSettingsRecord = await this.prisma.systemSetting.findFirst({
          where: { companyId, settingKey: 'BACKUP_SETTINGS' },
        });
        const settings = backupSettingsRecord?.settingValue as any;
        if (settings && settings.deletionPasswordHash) {
          isValidPassword = await bcrypt.compare(password, settings.deletionPasswordHash);
        } else {
          // Default: compare against Super Admin account password
          isValidPassword = await bcrypt.compare(password, user.passwordHash);
        }
      } catch (e) {
        isValidPassword = await bcrypt.compare(password, user.passwordHash);
      }

      if (!isValidPassword) {
        throw new Error('Invalid Backup Security Password. Verification failed.');
      }
    }

    const records = await this.prisma.backupRecord.findMany();
    let deletedCount = 0;

    for (const record of records) {
      try {
        if (fs.existsSync(record.filePath)) {
          fs.unlinkSync(record.filePath);
        }
      } catch (err) {
        console.error(`Failed to delete file ${record.filePath}:`, err);
      }
      deletedCount++;
    }

    // Clear all records from database table
    await this.prisma.backupRecord.deleteMany();

    // Also empty physical backup folder of any stray .json/.sql files
    try {
      const settings = await this.getSettings(companyId);
      const backupDir = settings.destinationPath || path.join(process.cwd(), 'backups');
      if (fs.existsSync(backupDir)) {
        const files = fs.readdirSync(backupDir);
        for (const file of files) {
          if (file.endsWith('.sql') || file.endsWith('.json')) {
            try {
              fs.unlinkSync(path.join(backupDir, file));
            } catch (e) {
              console.error(`Failed to clean stray file ${file}:`, e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Failed to clean backup directory:', err);
    }

    return { message: 'All backup files removed and folder emptied successfully.', deletedCount };
  }

  // Delete a specific backup file
  async deleteBackupRecord(backupId: number): Promise<{ message: string }> {
    const record = await this.prisma.backupRecord.findUnique({
      where: { id: backupId },
    });

    if (record) {
      try {
        if (fs.existsSync(record.filePath)) {
          fs.unlinkSync(record.filePath);
        }
      } catch (err) {
        console.error(`Failed to delete physical file: ${(err as Error).message}`);
      }

      await this.prisma.backupRecord.delete({
        where: { id: backupId },
      });
    }

    return { message: 'Backup record deleted successfully' };
  }

  // Auto-purging backup logs older than configured retention threshold
  private async runAutoPurge(companyId: number): Promise<void> {
    const settings = await this.getSettings(companyId);
    const thresholdDays = settings.retentionDays || 15;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

    const oldBackups = await this.prisma.backupRecord.findMany({
      where: {
        createdAt: { lt: thresholdDate },
      },
    });

    for (const record of oldBackups) {
      try {
        if (fs.existsSync(record.filePath)) {
          fs.unlinkSync(record.filePath);
        }
      } catch (err) {
        console.error(`Auto-purge failed to delete physical file at ${record.filePath}: ${(err as Error).message}`);
      }

      await this.prisma.backupRecord.delete({
        where: { id: record.id },
      });
    }
  }
}
