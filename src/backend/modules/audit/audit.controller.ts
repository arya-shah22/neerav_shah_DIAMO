// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Audit & Security Controller
// ═══════════════════════════════════════════════════════════════

import { Controller, Inject } from '@nestjs/common';
import { AuditService } from './audit.service';
import { IAuditSecuritySettings } from '../../../shared/types/audit-security.types';
import type { IApiResponse } from '../../../shared/types/common.types';
import { AuditAction } from '@prisma/client';

@Controller()
export class AuditController {
  @Inject(AuditService)
  private readonly auditService!: AuditService;

  async handleGetSettings(payload: { companyId: number }): Promise<IApiResponse<IAuditSecuritySettings>> {
    try {
      const data = await this.auditService.getSettings(payload.companyId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve audit & security settings',
      };
    }
  }

  async handleSaveSettings(payload: { companyId: number; settings: IAuditSecuritySettings; userId?: number }): Promise<IApiResponse<any>> {
    try {
      const result = await this.auditService.saveSettings(payload.companyId, payload.settings, payload.userId);
      return { success: true, data: result };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update audit & security settings',
      };
    }
  }

  async handleListLogs(payload: {
    companyId?: number;
    entityType?: string;
    action?: AuditAction;
    userId?: number;
    startDate?: string;
    endDate?: string;
    searchQuery?: string;
    limit?: number;
    offset?: number;
  }): Promise<IApiResponse<any>> {
    try {
      const data = await this.auditService.getAuditLogs(payload);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to query audit logs',
      };
    }
  }
}
