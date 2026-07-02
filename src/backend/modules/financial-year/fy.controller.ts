// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Financial Year Controller Backend
// ═══════════════════════════════════════════════════════════════

import { Controller, Injectable, Inject } from '@nestjs/common';
import { FinancialYearService } from './fy.service';
import { IApiResponse } from '../../../shared/types/common.types';

@Injectable()
@Controller()
export class FinancialYearController {
  @Inject(FinancialYearService)
  private readonly fyService!: FinancialYearService;

  async handleList(companyId: number): Promise<IApiResponse> {
    try {
      const data = await this.fyService.list(companyId);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch financial years',
      };
    }
  }

  async handleCreate(payload: { companyId: number; data: any }): Promise<IApiResponse> {
    try {
      const data = await this.fyService.create(payload.companyId, payload.data);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create financial year',
      };
    }
  }

  async handleActivate(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      const data = await this.fyService.activate(payload.id, payload.companyId);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to activate financial year',
      };
    }
  }

  async handleToggleClosed(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      const data = await this.fyService.toggleClosed(payload.id, payload.companyId);
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle status',
      };
    }
  }
}
