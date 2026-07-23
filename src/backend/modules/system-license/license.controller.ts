// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — License Management & Version Info Controller
// ═══════════════════════════════════════════════════════════════

import { Controller, Inject } from '@nestjs/common';
import { LicenseService } from './license.service';
import type { IApiResponse } from '../../../shared/types/common.types';

@Controller()
export class LicenseController {
  @Inject(LicenseService)
  private readonly licenseService!: LicenseService;

  async handleGetInfo(payload: { companyId: number }): Promise<IApiResponse<any>> {
    try {
      const data = await this.licenseService.getLicenseAndAppInfo(payload.companyId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve licensing status',
      };
    }
  }

  async handleUpdateKey(payload: { companyId: number; licenseKey: string }): Promise<IApiResponse<any>> {
    try {
      const data = await this.licenseService.updateLicenseKey(payload.companyId, payload.licenseKey);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Licensing signature registration failed',
      };
    }
  }

  async handleResetUptime(payload: { companyId: number }): Promise<IApiResponse<any>> {
    try {
      const data = await this.licenseService.resetCumulativeUptime(payload.companyId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Uptime reset failed',
      };
    }
  }

  async handleCheckForUpdates(payload: { companyId: number }): Promise<IApiResponse<any>> {
    try {
      const data = await this.licenseService.checkForUpdates(payload.companyId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to check for software updates',
      };
    }
  }

  async handleApplyUpdate(payload: { companyId: number; version: string }): Promise<IApiResponse<any>> {
    try {
      const data = await this.licenseService.applyUpdate(payload.companyId, payload.version);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to apply software update',
      };
    }
  }
}
