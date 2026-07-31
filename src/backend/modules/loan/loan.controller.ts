// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Loan Management Controller
// ═══════════════════════════════════════════════════════════════

import { Controller, Inject } from '@nestjs/common';
import { LoanService } from './loan.service';
import type { IApiResponse } from '../../../shared/types/common.types';

@Controller()
export class LoanController {
  @Inject(LoanService)
  private readonly loanService!: LoanService;

  async handleList(payload: any): Promise<IApiResponse> {
    try {
      const companyId = Number(payload?.companyId ?? payload);
      const data = await this.loanService.list(companyId);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to list loans' };
    }
  }

  async handleCreate(payload: { companyId: number; [key: string]: any }): Promise<IApiResponse> {
    try {
      const { companyId, ...data } = payload;
      const result = await this.loanService.create(companyId, data);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to create loan' };
    }
  }

  async handleRepay(payload: { companyId: number; [key: string]: any }): Promise<IApiResponse> {
    try {
      const { companyId, ...data } = payload;
      const result = await this.loanService.repay(companyId, data);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to record repayment' };
    }
  }

  async handleDelete(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      const result = await this.loanService.delete(payload.id, payload.companyId);
      return { success: true, data: result };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to delete loan' };
    }
  }

  async handleGetOnHandMoney(payload: any): Promise<IApiResponse> {
    try {
      const companyId = Number(payload?.companyId ?? payload);
      const data = await this.loanService.getOnHandMoney(companyId);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to fetch cash on-hand' };
    }
  }

  async handleGeneratePdf(payload: any): Promise<IApiResponse> {
    try {
      const companyId = Number(payload?.companyId ?? payload);
      const buffer = await this.loanService.generateStatementPdf(companyId);
      const pdfBase64 = buffer.toString('base64');
      return { success: true, data: { pdfBase64 } };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to generate PDF statement' };
    }
  }

  async handlePreviewNumber(payload: { companyId: number; financialYearId: number }): Promise<IApiResponse> {
    try {
      const data = await this.loanService.previewVoucherNumber(payload.companyId, payload.financialYearId);
      return { success: true, data };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to preview loan number' };
    }
  }
}
