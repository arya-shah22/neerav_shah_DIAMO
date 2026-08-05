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

  async handlePreviewNumber(payload: { companyId: number; financialYearId?: number; type?: JobType }) {
    try {
      const companyId = Number(payload.companyId || 1);
      const financialYearId = payload.financialYearId ? Number(payload.financialYearId) : undefined;
      const type = payload.type || JobType.JOB_INCOME;
      const data = await this.jobService.previewVoucherNumber(companyId, financialYearId, type);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleCreateUnified(payload: { companyId: number; data: Record<string, any> }) {
    try {
      const data = await this.jobService.createUnifiedJobWork(payload.companyId, payload.data);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleUpdateUnified(payload: { companyId: number; id: number; data: Record<string, any> }) {
    try {
      const data = await this.jobService.updateUnifiedJobWork(payload.companyId, payload.id, payload.data);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleReceiveAndBill(payload: { companyId: number; id: number; data: Record<string, any> }) {
    try {
      const data = await this.jobService.receiveAndBillJobWork(payload.companyId, payload.id, payload.data);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleCancel(payload: { companyId: number; id: number }) {
    try {
      const data = await this.jobService.cancelUnifiedJobWork(payload.companyId, payload.id);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async handleGeneratePdf(payload: { companyId: number; id: number; mode?: 'CLIENT' | 'SUBCONTRACTOR' }) {
    try {
      const buffer = await this.jobService.generateJobWorkPdf(payload.companyId, payload.id, payload.mode || 'CLIENT');
      const pdfBase64 = buffer.toString('base64');
      return { success: true, data: { pdfBase64 } };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
