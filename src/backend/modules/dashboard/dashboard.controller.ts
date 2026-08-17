// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Dashboard Controller
// Phase 15.1: Controller handlers for dashboard telemetry
// ═══════════════════════════════════════════════════════════════

import { Controller, Inject } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import type { IApiResponse } from '../../../shared/types/common.types';
import type { IDashboardKpiSummary } from '../../../shared/types/dashboard.types';

@Controller()
export class DashboardController {
  @Inject(DashboardService)
  private readonly dashboardService!: DashboardService;

  async handleGetTelemetry(payload: {
    companyId: number;
    financialYearId?: number;
    userId?: number;
  }): Promise<IApiResponse<IDashboardKpiSummary>> {
    try {
      const data = await this.dashboardService.getDashboardTelemetry(
        payload.companyId,
        payload.financialYearId,
        payload.userId
      );
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve dashboard telemetry',
      };
    }
  }

  async handleGetAnalytics(payload: { companyId: number; months?: number }): Promise<IApiResponse<any>> {
    try {
      const data = await this.dashboardService.getBusinessAnalytics(payload.companyId, payload.months);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve business analytics data',
      };
    }
  }
}
