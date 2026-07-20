// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Job Book Controller (Stage 8 / Phase 7)
// ═══════════════════════════════════════════════════════════════

import { Controller, Inject } from '@nestjs/common';
import { JobService } from './job.service';
import { JobType } from '@prisma/client';

@Controller()
export class JobController {
  @Inject(JobService)
  private readonly jobService!: JobService;

  async handleList(payload: { companyId: number; jobType: JobType }) {
    try {
      const data = await this.jobService.list(payload.companyId, payload.jobType);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleGet(payload: { id: number; companyId: number }) {
    try {
      const data = await this.jobService.get(payload.id, payload.companyId);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleCreate(payload: { companyId: number; data: Record<string, any> }) {
    try {
      const data = await this.jobService.create(payload.companyId, payload.data);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleDelete(payload: { id: number; companyId: number }) {
    try {
      const data = await this.jobService.delete(payload.id, payload.companyId);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handlePreviewNumber(payload: { companyId: number; financialYearId: number; type: JobType }) {
    try {
      const data = await this.jobService.previewVoucherNumber(payload.companyId, payload.financialYearId, payload.type);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
