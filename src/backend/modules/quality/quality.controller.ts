// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Quality Controller (IPC Bridge)
// ═══════════════════════════════════════════════════════════════

import { Controller, Injectable, Inject } from '@nestjs/common';
import { QualityService } from './quality.service';
import { IApiResponse } from '../../../shared/types/common.types';
import { formatApiError } from '../../utils/format-api-error';

@Injectable()
@Controller()
export class QualityController {
  @Inject(QualityService)
  private readonly service!: QualityService;

  async handleList(payload: { companyId: number; search?: string }): Promise<IApiResponse> {
    try {
      const data = await this.service.list(payload.companyId, payload.search);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch qualities') };
    }
  }

  async handleGet(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      const data = await this.service.get(payload.id, payload.companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch quality') };
    }
  }

  async handleCreate(payload: { companyId: number; data: Record<string, unknown> }): Promise<IApiResponse> {
    try {
      const data = await this.service.create(payload.companyId, payload.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to create quality') };
    }
  }

  async handleUpdate(payload: { id: number; companyId: number; data: Record<string, unknown> }): Promise<IApiResponse> {
    try {
      const data = await this.service.update(payload.id, payload.companyId, payload.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to update quality') };
    }
  }

  async handleDelete(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      await this.service.delete(payload.id, payload.companyId);
      return { success: true };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to delete quality') };
    }
  }

  async handleHsnList(): Promise<IApiResponse> {
    try {
      const data = await this.service.listHsnCodes();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch HSN codes') };
    }
  }
}
