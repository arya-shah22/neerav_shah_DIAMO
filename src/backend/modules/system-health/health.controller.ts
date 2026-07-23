// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Database Health & Diagnostics Controller
// ═══════════════════════════════════════════════════════════════

import { Controller, Inject } from '@nestjs/common';
import { HealthService } from './health.service';
import type { IApiResponse } from '../../../shared/types/common.types';

@Controller()
export class HealthController {
  @Inject(HealthService)
  private readonly healthService!: HealthService;

  async handleGetStatus(payload: { companyId: number }): Promise<IApiResponse<any>> {
    try {
      const data = await this.healthService.getHealthStatus(payload.companyId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve diagnostics status',
      };
    }
  }

  async handleRunDiagnostics(payload: { companyId: number }): Promise<IApiResponse<any>> {
    try {
      const integrity = await this.healthService.checkIntegrity();
      const diagnostics = await this.healthService.runDiagnosticsWizard(payload.companyId);
      return {
        success: true,
        data: {
          integrity,
          diagnostics,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Diagnostics run failed',
      };
    }
  }

  async handleOptimizeDb(payload: { companyId: number }): Promise<IApiResponse<any>> {
    try {
      const result = await this.healthService.optimizeDatabase(payload.companyId);
      return { success: true, data: result };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Database optimization failed',
      };
    }
  }

  async handleClearCache(): Promise<IApiResponse<any>> {
    try {
      const result = await this.healthService.clearSystemCache();
      return { success: true, data: result };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to clear system cache',
      };
    }
  }
}
