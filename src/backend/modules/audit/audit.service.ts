// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Audit & Security Log Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { IAuditSecuritySettings, DEFAULT_AUDIT_SECURITY_SETTINGS } from '../../../shared/types/audit-security.types';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  @Inject(PrismaService)
  private readonly prisma!: PrismaService;

  // Retrieve current audit & security settings
  async getSettings(companyId: number): Promise<IAuditSecuritySettings> {
    const record = await this.prisma.systemSetting.findFirst({
      where: { companyId, settingKey: 'AUDIT_SECURITY_SETTINGS' },
    });

    if (!record || !record.settingValue) {
      return DEFAULT_AUDIT_SECURITY_SETTINGS;
    }

    return record.settingValue as unknown as IAuditSecuritySettings;
  }

  // Save/update settings
  async saveSettings(companyId: number, settings: IAuditSecuritySettings, userId?: number): Promise<{ message: string }> {
    await this.prisma.systemSetting.upsert({
      where: {
        companyId_settingKey: {
          companyId,
          settingKey: 'AUDIT_SECURITY_SETTINGS',
        },
      },
      update: {
        settingValue: settings as any,
        updatedBy: userId,
      },
      create: {
        companyId,
        settingKey: 'AUDIT_SECURITY_SETTINGS',
        settingValue: settings as any,
        category: 'SECURITY',
        description: 'Audit Levels and Security Controls Config',
        updatedBy: userId,
      },
    });

    return { message: 'Audit & Security settings saved successfully' };
  }

  // Write immutable audit log
  async logAuditEvent(params: {
    companyId: number | null;
    entityType: string;
    entityId: number;
    action: AuditAction;
    beforeValue?: any;
    afterValue?: any;
    changedFields?: any;
    userId: number;
    ipAddress?: string;
    hostname?: string;
    overrideReason?: string;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        companyId: params.companyId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        beforeValue: params.beforeValue || null,
        afterValue: params.afterValue || null,
        changedFields: params.changedFields || null,
        userId: params.userId,
        ipAddress: params.ipAddress || null,
        hostname: params.hostname || null,
        overrideReason: params.overrideReason || null,
      },
    });
  }

  // Query audit logs
  async getAuditLogs(params: {
    companyId?: number;
    entityType?: string;
    action?: AuditAction;
    userId?: number;
    startDate?: string;
    endDate?: string;
    searchQuery?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (params.companyId) {
      where.companyId = params.companyId;
    }
    if (params.entityType) {
      where.entityType = params.entityType;
    }
    if (params.action) {
      where.action = params.action;
    }
    if (params.userId) {
      where.userId = params.userId;
    }

    // Date Range
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        // Enforce end of day for the end date filter
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Text Search (Module, override reason, etc.)
    if (params.searchQuery) {
      where.OR = [
        { entityType: { contains: params.searchQuery } },
        { overrideReason: { contains: params.searchQuery } },
      ];
    }

    const total = await this.prisma.auditLog.count({ where });

    const records = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
      skip: params.offset || 0,
    });

    // Map BigInt to string to avoid serialization errors over IPC
    const serializedRecords = records.map((r) => ({
      ...r,
      id: r.id.toString(),
    }));

    return {
      total,
      records: serializedRecords,
    };
  }
}
