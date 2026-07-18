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

  async handleGetDayBookSummary(payload: { companyId: number; dateStr: string }) {
    try {
      const data = await this.service.getDayBookSummary(payload.companyId, payload.dateStr);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch Day Book' };
    }
  }

  async handleGetDayBookDatesList(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getDayBookDatesList(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch Day Book list' };
    }
  }

  // ─── Phase 11.6: TDS & TCS Reports ─────────────────────────

  async handleGetTdsRegister(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getTdsRegister(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch TDS register' };
    }
  }

  async handleGetTcsRegister(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getTcsRegister(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch TCS register' };
    }
  }

  async handleGetTdsTcsDashboard(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getTdsTcsDashboard(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to generate TDS/TCS dashboard' };
    }
  }

  async handleGetTdsPartywise(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getTdsPartywise(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch party-wise TDS report' };
    }
  }

  async handleGetTcsPartywise(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getTcsPartywise(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch party-wise TCS report' };
    }
  }

  // ─── Phase 11.8: Enterprise MIS & Business Analytics ─────

  async handleGetMisDashboard(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getMisDashboard(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to generate MIS dashboard' };
    }
  }

  async handleGetMisStockJobAnalytics(payload: { companyId: number }) {
    try {
      const data = await this.service.getMisStockJobAnalytics(payload.companyId);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to generate MIS stock and job analytics' };
    }
  }

  async handleGetMisFinancialRatios(payload: { companyId: number; dateStr?: string }) {
    try {
      const data = await this.service.getMisFinancialRatios(payload.companyId, payload.dateStr);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to calculate MIS financial ratios' };
    }
  }

  // ─── Phase 11.2: Financial Statement Additions ─────────────

  async handleGetCashFlow(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getCashFlow(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch Cash Flow Statement' };
    }
  }

  async handleGetFundFlow(payload: { companyId: number; startDate?: string; endDate?: string }) {
    try {
      const data = await this.service.getFundFlow(payload.companyId, payload.startDate, payload.endDate);
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch Fund Flow Statement' };
    }
  }
}

