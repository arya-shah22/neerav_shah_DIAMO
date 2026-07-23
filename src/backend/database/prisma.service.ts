// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Prisma Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: ['query', 'info', 'warn', 'error'],
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

      // Now perform Audit Logging
      if (params.model && transactionModels.includes(params.model) && isWrite) {
        try {
          // Resolve companyId
          if (!companyId && result) {
            companyId = result.companyId;
          }

          // Fetch Audit settings for company
          let auditLevel: 'BASIC' | 'STANDARD' | 'DETAILED' = 'STANDARD';
          if (companyId) {
            const settingsRec = await this.systemSetting.findFirst({
              where: { companyId, settingKey: 'AUDIT_SECURITY_SETTINGS' },
            });
            if (settingsRec && settingsRec.settingValue) {
              auditLevel = (settingsRec.settingValue as any).auditLevel || 'STANDARD';
            }
          }

          // Action mapping
          let action: 'CREATE' | 'UPDATE' | 'DELETE' = 'UPDATE';
          if (params.action.startsWith('create')) {
            action = 'CREATE';
          } else if (params.action.startsWith('delete')) {
            action = 'DELETE';
          }

          // Should log check
          const shouldLog = 
            auditLevel === 'DETAILED' ||
            (auditLevel === 'STANDARD') ||
            (auditLevel === 'BASIC' && action === 'CREATE');

          if (shouldLog) {
            let entityId = result?.id || existingRecord?.id || 0;
            let beforeVal: any = null;
            let afterVal: any = null;

            if (auditLevel === 'DETAILED') {
              beforeVal = existingRecord;
              afterVal = action === 'DELETE' ? null : result;
            } else {
              const vNum = result?.voucherNumber || existingRecord?.voucherNumber || result?.billNumber || existingRecord?.billNumber;
              if (vNum) {
                afterVal = { voucherNumber: vNum };
              }
            }

            // Write to AuditLog
            await this.auditLog.create({
              data: {
                companyId,
                entityType: params.model,
                entityId,
                action,
                beforeValue: beforeVal,
                afterValue: afterVal,
                userId: 1, // Default fallback user
                ipAddress: '127.0.0.1',
                hostname: 'localhost',
                overrideReason: params.args.data?.overrideReason || null,
              }
            });
          }
        } catch (auditErr) {
          console.error('Audit logging failed in Prisma middleware:', auditErr);
        }
      }

      return result;
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
