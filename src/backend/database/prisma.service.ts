// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Prisma Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { migrateLegacyPurchaseInvoices } from './legacy-invoice-migration';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // In-memory cache for audit settings per company (avoids 1 extra query per write)
  private auditSettingsCache = new Map<number, { level: 'BASIC' | 'STANDARD' | 'DETAILED'; cachedAt: number }>();
  private static AUDIT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Current user context for audit logging (set per-request by IPC handler)
  private _currentUserId: number = 1;

  setCurrentUserId(userId: number) {
    this._currentUserId = userId;
  }

  getCurrentUserId(): number {
    return this._currentUserId;
  }

  private async getAuditLevel(companyId: number): Promise<'BASIC' | 'STANDARD' | 'DETAILED'> {
    const cached = this.auditSettingsCache.get(companyId);
    const now = Date.now();
    if (cached && (now - cached.cachedAt) < PrismaService.AUDIT_CACHE_TTL) {
      return cached.level;
    }

    let level: 'BASIC' | 'STANDARD' | 'DETAILED' = 'STANDARD';
    try {
      const settingsRec = await this.systemSetting.findFirst({
        where: { companyId, settingKey: 'AUDIT_SECURITY_SETTINGS' },
      });
      if (settingsRec && settingsRec.settingValue) {
        level = (settingsRec.settingValue as any).auditLevel || 'STANDARD';
      }
    } catch {
      // Fallback to STANDARD on error
    }

    this.auditSettingsCache.set(companyId, { level, cachedAt: now });
    return level;
  }

  constructor() {
    super({
      log: ['error'],
    });

    // Centralized Financial Year Period Lock Check & Database Audit Logging Middleware
    this.$use(async (params, next) => {
      const transactionModels = [
        'SaleInvoice',
        'PurchaseInvoice',
        'ChallanVoucher',
        'JournalVoucher',
        'CashBankVoucher',
        'JobVoucher',
        'Loan',
      ];

      const modelKey = params.model ? params.model.charAt(0).toLowerCase() + params.model.slice(1) : '';
      const isWrite = ['create', 'update', 'delete', 'createMany', 'updateMany', 'deleteMany'].includes(params.action);

      let existingRecord: any = null;
      let financialYearId: number | null = null;
      let voucherDate: Date | null = null;
      let companyId: number | null = null;

      const getTxDate = (data: any): Date | null => {
        if (!data) return null;
        const dateVal = data.voucherDate || data.invoiceDate || data.challanDate || data.loanDate || data.date;
        return dateVal ? new Date(dateVal) : null;
      };

      if (params.model && transactionModels.includes(params.model) && isWrite) {
        if (params.action === 'create') {
          financialYearId = params.args.data?.financialYearId;
          companyId = params.args.data?.companyId;
          voucherDate = getTxDate(params.args.data);
        } else if (params.action === 'createMany') {
          const list = Array.isArray(params.args.data) ? params.args.data : [params.args.data];
          if (list.length > 0) {
            financialYearId = list[0]?.financialYearId;
            companyId = list[0]?.companyId;
            voucherDate = getTxDate(list[0]);
          }
        } else if (params.action === 'update' || params.action === 'delete') {
          existingRecord = await (this as any)[modelKey].findUnique({
            where: params.args.where,
          });

          if (existingRecord) {
            financialYearId = existingRecord.financialYearId;
            companyId = existingRecord.companyId;
            voucherDate = getTxDate(existingRecord);

            if (params.action === 'update' && params.args.data) {
              const updatedDate = getTxDate(params.args.data);
              if (updatedDate) {
                voucherDate = updatedDate;
              }
            }
          }
        }

        if (financialYearId) {
          const fy = await this.financialYear.findUnique({
            where: { id: financialYearId },
          });

          if (fy) {
            if (fy.isClosed) {
              throw new Error('This financial year is closed and locked for all postings.');
            }
            if (fy.lockTransactionUptoDate && voucherDate) {
              const lockDate = new Date(fy.lockTransactionUptoDate);
              if (voucherDate <= lockDate) {
                throw new Error(`Transactions on or before ${lockDate.toLocaleDateString('en-IN')} are locked for this financial year.`);
              }
            }
          }
        }
      }

      // Execute actual query first so we can capture the final state for 'create' and 'update'
      const result = await next(params);

      // Now perform Audit Logging (non-blocking — fire and forget)
      if (params.model && transactionModels.includes(params.model) && isWrite) {
        // Capture values for the async closure
        const capturedCompanyId = companyId || result?.companyId || null;
        const capturedExistingRecord = existingRecord;
        const capturedResult = result;
        const capturedUserId = this._currentUserId;
        const capturedModel = params.model;
        const capturedAction = params.action;
        const capturedOverrideReason = params.args.data?.overrideReason || null;

        // Fire-and-forget: don't await audit log write — it runs in the background
        // so the main operation returns immediately
        if (capturedCompanyId) {
          setImmediate(async () => {
            try {
              const auditLevel = await this.getAuditLevel(capturedCompanyId);

              // Action mapping
              let action: 'CREATE' | 'UPDATE' | 'DELETE' = 'UPDATE';
              if (capturedAction.startsWith('create')) {
                action = 'CREATE';
              } else if (capturedAction.startsWith('delete')) {
                action = 'DELETE';
              }

              // Should log check
              const shouldLog =
                auditLevel === 'DETAILED' ||
                (auditLevel === 'STANDARD') ||
                (auditLevel === 'BASIC' && action === 'CREATE');

              if (shouldLog) {
                const entityId = capturedResult?.id || capturedExistingRecord?.id || 0;
                let beforeVal: any = null;
                let afterVal: any = null;

                if (auditLevel === 'DETAILED') {
                  beforeVal = capturedExistingRecord;
                  afterVal = action === 'DELETE' ? null : capturedResult;
                } else {
                  const vNum = capturedResult?.voucherNumber || capturedExistingRecord?.voucherNumber || capturedResult?.billNumber || capturedExistingRecord?.billNumber;
                  if (vNum) {
                    afterVal = { voucherNumber: vNum };
                  }
                }

                // Write to AuditLog with real userId
                await this.auditLog.create({
                  data: {
                    companyId: capturedCompanyId,
                    entityType: capturedModel!,
                    entityId,
                    action,
                    beforeValue: beforeVal,
                    afterValue: afterVal,
                    userId: capturedUserId,
                    ipAddress: '127.0.0.1',
                    hostname: 'localhost',
                    overrideReason: capturedOverrideReason,
                  }
                });
              }
            } catch (auditErr) {
              console.error('Audit logging failed in Prisma middleware:', auditErr);
            }
          });
        }
      }

      return result;
    });
  }

  async onModuleInit() {
    // Retry connection with exponential backoff (handles MySQL startup delay)
    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 2000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.$connect();
        console.log(`[PrismaService] Database connected successfully${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
        break;
      } catch (error) {
        if (attempt === MAX_RETRIES) {
          console.warn(`[PrismaService] Database connection not ready yet during startup (will auto-connect on demand):`, (error as any).message || error);
          break;
        }
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        console.warn(`[PrismaService] Connection attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    try {
      await migrateLegacyPurchaseInvoices(this);
    } catch (migErr) {
      console.warn('[PrismaService] Deferred legacy invoice migration until database connection is established');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
