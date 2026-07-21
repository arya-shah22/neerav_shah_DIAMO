// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Print Template Controller (IPC Bridge)
// ═══════════════════════════════════════════════════════════════

import { Controller, Injectable, Inject } from '@nestjs/common';
import { PrintTemplateService } from './print-template.service';
import { IApiResponse } from '../../../shared/types/common.types';
import { formatApiError } from '../../utils/format-api-error';
import { IPrintLayoutConfig } from '../../../shared/types/print-template.types';

@Injectable()
@Controller()
export class PrintTemplateController {
  @Inject(PrintTemplateService)
  private readonly service!: PrintTemplateService;

  async handleGetTemplateConfig(payload: {
    companyId: number;
    voucherType: string;
  }): Promise<IApiResponse> {
    try {
      const data = await this.service.getTemplateConfig(payload.companyId, payload.voucherType);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch print template config') };
    }
  }

  async handleSaveTemplateConfig(payload: {
    companyId: number;
    voucherType: string;
    layoutConfig: IPrintLayoutConfig;
    targetCompanyIds?: number[];
  }): Promise<IApiResponse> {
    try {
      const data = await this.service.saveTemplateConfig(
        payload.companyId,
        payload.voucherType,
        payload.layoutConfig,
        payload.targetCompanyIds,
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to save print template config') };
    }
  }

  async handleGetAllTemplates(payload: {
    companyId: number;
  }): Promise<IApiResponse> {
    try {
      const data = await this.service.getAllTemplates(payload.companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch print templates') };
    }
  }

  async handleResetTemplateConfig(payload: {
    companyId: number;
    voucherType: string;
  }): Promise<IApiResponse> {
    try {
      const data = await this.service.resetTemplateConfig(payload.companyId, payload.voucherType);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to reset print template config') };
    }
  }

  async handleCopyTemplateConfig(payload: {
    companyId: number;
    sourceVoucherType: string;
    targetVoucherTypes: string[];
    layoutConfig: IPrintLayoutConfig;
  }): Promise<IApiResponse> {
    try {
      const data = await this.service.copyTemplateConfig(
        payload.companyId,
        payload.sourceVoucherType,
        payload.targetVoucherTypes,
        payload.layoutConfig,
      );
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to copy print template config') };
    }
  }
}
