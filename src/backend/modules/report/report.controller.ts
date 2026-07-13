import { Controller, Inject } from '@nestjs/common';
import { ReportService } from './report.service';

@Controller()
export class ReportController {
  @Inject(ReportService)
  private readonly service!: ReportService;

  async handleGetLedger(payload: { companyId: number; accountId: number | number[]; startDate?: string; endDate?: string }) {
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

  async handleGetStockReport(payload: { companyId: number; filters?: { status?: string; qualityId?: number; search?: string } }) {
    try {
      const data = await this.service.getStockReport(payload.companyId, payload.filters);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to generate stock report' };
    }
  }

  async handleGetGstDashboard(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getGstDashboard(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to generate GST dashboard' };
    }
  }

  async handleGetGstr1Report(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getGstr1Report(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to generate GSTR-1 report' };
    }
  }

  async handleGenerateGstr1Json(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.generateGstr1Json(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to generate GSTR-1 offline utility JSON' };
    }
  }

  async handleGetGstRegisters(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getGstRegisters(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch GST registers' };
    }
  }

  async handleReconcileItc(payload: { companyId: number; gstr2bList: any[]; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.reconcileItc(payload.companyId, payload.gstr2bList, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to reconcile ITC' };
    }
  }

  async handleGetGstr3bSummary(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getGstr3bSummary(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch GSTR-3B summary' };
    }
  }

  async handleGetGstAnalytics(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getGstAnalytics(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch GST analytics' };
    }
  }
}
