import { Controller, Inject } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller()
export class ReportController {
  @Inject(ReportService)
  private readonly service!: ReportService;

  async handleGetLedger(payload: { companyId: number; accountId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getLedger(payload.companyId, payload.accountId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch ledger statements' };
    }
  }

  async handleGetTrialBalance(payload: { companyId: number; date?: string }) {
    try {
      const data = await this.service.getTrialBalance(payload.companyId, payload.date);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to generate trial balance' };
    }
  }

  async handleGetProfitLoss(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getProfitLoss(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to calculate profit & loss statement' };
    }
  }

  async handleGetBalanceSheet(payload: { companyId: number; date?: string }) {
    try {
      const data = await this.service.getBalanceSheet(payload.companyId, payload.date);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to compile balance sheet' };
    }
  }

  async handleGetOutstanding(payload: { companyId: number; type: 'RECEIVABLE' | 'PAYABLE' }) {
    try {
      const data = await this.service.getOutstanding(payload.companyId, payload.type);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to calculate outstanding aging' };
    }
  }
}
