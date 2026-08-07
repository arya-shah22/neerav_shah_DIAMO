// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Report Service (Facade / Delegator)
// Delegates all report calculations to domain sub-services
// ═══════════════════════════════════════════════════════════════

import { Injectable, Inject } from '@nestjs/common';
import { FinancialReportService } from './services/financial-report.service';
import { GstReportService } from './services/gst-report.service';
import { TdsTcsReportService } from './services/tds-tcs-report.service';
import { MisReportService } from './services/mis-report.service';

@Injectable()
export class ReportService {
  @Inject(FinancialReportService)
  private readonly financialReportService!: FinancialReportService;

  @Inject(GstReportService)
  private readonly gstReportService!: GstReportService;

  @Inject(TdsTcsReportService)
  private readonly tdsTcsReportService!: TdsTcsReportService;

  @Inject(MisReportService)
  private readonly misReportService!: MisReportService;

  // ─── Financial Reports ─────────────────────────────────────
  async reconcileLegacyEntries(companyId: number) {
    return this.financialReportService.reconcileLegacyEntries(companyId);
  }

  async getLedger(companyId: number, accountId: number | number[], startDateStr?: string, endDateStr?: string) {
    return this.financialReportService.getLedger(companyId, accountId, startDateStr, endDateStr);
  }

  async getTrialBalance(companyId: number, dateStr?: string) {
    return this.financialReportService.getTrialBalance(companyId, dateStr);
  }

  async getProfitLoss(companyId: number, startDateStr?: string, endDateStr?: string) {
    return this.financialReportService.getProfitLoss(companyId, startDateStr, endDateStr);
  }

  async getBalanceSheet(companyId: number, dateStr?: string) {
    return this.financialReportService.getBalanceSheet(companyId, dateStr);
  }

  async getOutstanding(companyId: number, type: 'RECEIVABLE' | 'PAYABLE') {
    return this.financialReportService.getOutstanding(companyId, type);
  }

  async getDayBookSummary(companyId: number, dateStr: string) {
    return this.financialReportService.getDayBookSummary(companyId, dateStr);
  }

  async getDayBookDatesList(companyId: number, startDateStr?: string, endDateStr?: string) {
    return this.financialReportService.getDayBookDatesList(companyId, startDateStr, endDateStr);
  }

  async getCashFlow(companyId: number, startDate?: string, endDate?: string) {
    return this.financialReportService.getCashFlow(companyId, startDate, endDate);
  }

  async getFundFlow(companyId: number, startDateStr?: string, endDateStr?: string) {
    return this.financialReportService.getFundFlow(companyId, startDateStr, endDateStr);
  }

  // ─── GST Reports ───────────────────────────────────────────
  async getGstDashboard(companyId: number, startDateStr?: string, endDateStr?: string) {
    return this.gstReportService.getGstDashboard(companyId, startDateStr, endDateStr);
  }

  async getGstr1Report(companyId: number, startDateStr?: string, endDateStr?: string) {
    return this.gstReportService.getGstr1Report(companyId, startDateStr, endDateStr);
  }

  async generateGstr1Json(companyId: number, startDateStr?: string, endDateStr?: string) {
    return this.gstReportService.generateGstr1Json(companyId, startDateStr, endDateStr);
  }

  async getGstRegisters(companyId: number, startDateStr?: string, endDateStr?: string) {
    return this.gstReportService.getGstRegisters(companyId, startDateStr, endDateStr);
  }

  async reconcileItc(companyId: number, gstr2bList: any[], startDateStr?: string, endDateStr?: string) {
    return this.gstReportService.reconcileItc(companyId, gstr2bList, startDateStr, endDateStr);
  }

  async getGstr3bSummary(companyId: number, startDateStr?: string, endDateStr?: string) {
    return this.gstReportService.getGstr3bSummary(companyId, startDateStr, endDateStr);
  }

  async getGstAnalytics(companyId: number, startDateStr?: string, endDateStr?: string) {
    return this.gstReportService.getGstAnalytics(companyId, startDateStr, endDateStr);
  }

  // ─── TDS / TCS Reports ─────────────────────────────────────
  async getTdsRegister(companyId: number, startDate?: string, endDate?: string) {
    return this.tdsTcsReportService.getTdsRegister(companyId, startDate, endDate);
  }

  async getTcsRegister(companyId: number, startDate?: string, endDate?: string) {
    return this.tdsTcsReportService.getTcsRegister(companyId, startDate, endDate);
  }

  async getTdsTcsDashboard(companyId: number, startDate?: string, endDate?: string) {
    return this.tdsTcsReportService.getTdsTcsDashboard(companyId, startDate, endDate);
  }

  async getTdsPartywise(companyId: number, startDate?: string, endDate?: string) {
    return this.tdsTcsReportService.getTdsPartywise(companyId, startDate, endDate);
  }

  async getTcsPartywise(companyId: number, startDate?: string, endDate?: string) {
    return this.tdsTcsReportService.getTcsPartywise(companyId, startDate, endDate);
  }

  // ─── MIS & Stock Analytics ─────────────────────────────────
  async getStockReport(companyId: number, filters?: { status?: string; qualityId?: number; search?: string }) {
    return this.misReportService.getStockReport(companyId, filters);
  }

  async getMisDashboard(companyId: number, startDate?: string, endDate?: string) {
    return this.misReportService.getMisDashboard(companyId, startDate, endDate);
  }

  async getMisStockJobAnalytics(companyId: number) {
    return this.misReportService.getMisStockJobAnalytics(companyId);
  }

  async getMisFinancialRatios(companyId: number, dateStr?: string) {
    return this.misReportService.getMisFinancialRatios(companyId, dateStr);
  }
}
