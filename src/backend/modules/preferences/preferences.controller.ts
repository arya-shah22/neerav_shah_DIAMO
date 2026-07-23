// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — System Preferences Controller
// ═══════════════════════════════════════════════════════════════

import { Controller, Inject } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { ISystemPreferences } from '../../../shared/types/preferences.types';
import type { IApiResponse } from '../../../shared/types/common.types';

@Controller()
export class PreferencesController {
  @Inject(PreferencesService)
  private readonly preferencesService!: PreferencesService;

  async handleGetSettings(payload: { companyId: number }): Promise<IApiResponse<ISystemPreferences>> {
    try {
      const data = await this.preferencesService.getSettings(payload.companyId);
      return { success: true, data };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve system preferences',
      };
    }
  }

  async handleSaveSettings(payload: { companyId: number; settings: ISystemPreferences; userId?: number }): Promise<IApiResponse<any>> {
    try {
      const result = await this.preferencesService.saveSettings(payload.companyId, payload.settings, payload.userId);
      return { success: true, data: result };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to update system preferences',
      };
    }
  }
}
