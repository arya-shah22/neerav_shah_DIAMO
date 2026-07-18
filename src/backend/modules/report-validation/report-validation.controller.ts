import { Controller, Inject } from '@nestjs/common';
import { ReportValidationService } from './report-validation.service';

@Controller()
export class ReportValidationController {
  @Inject(ReportValidationService)
  private readonly service!: ReportValidationService;

  async handleRunHealthChecks(payload: { companyId: number }) {
    try {
      const data = await this.service.runHealthChecks(payload.companyId);
      return { success: true, ...data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to execute system validation run' };
    }
  }

  async handleGetValidationHistory(payload: { companyId: number }) {
    try {
      const data = await this.service.getValidationHistory(payload.companyId);
      return { success: true, history: data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch validation history' };
    }
  }

  async handleGenerateCertificate(payload: { companyId: number; checkType: string; status: string; summary: string; certifiedBy: string; details: any }) {
    try {
      const data = await this.service.generateCertificate(payload.companyId, payload);
      return { success: true, ...data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to generate digital validation certificate' };
    }
  }
}
