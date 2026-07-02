// ═══════════════════════════════════════════════════════════════
// DIAMO ERP — Broker Controller (IPC Bridge)
// ═══════════════════════════════════════════════════════════════

import { Controller, Injectable, Inject } from '@nestjs/common';
import { BrokerService } from './broker.service';
import { IApiResponse } from '../../../shared/types/common.types';
import { formatApiError } from '../../utils/format-api-error';

@Injectable()
@Controller()
export class BrokerController {
  @Inject(BrokerService)
  private readonly service!: BrokerService;

  async handleList(companyId: number): Promise<IApiResponse> {
    try {
      const data = await this.service.list(companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch brokers') };
    }
  }

  async handleGet(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      const data = await this.service.get(payload.id, payload.companyId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to fetch broker') };
    }
  }

  async handleCreate(payload: { companyId: number; data: Record<string, unknown> }): Promise<IApiResponse> {
    try {
      const data = await this.service.create(payload.companyId, payload.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to create broker') };
    }
  }

  async handleUpdate(payload: { id: number; companyId: number; data: Record<string, unknown> }): Promise<IApiResponse> {
    try {
      const data = await this.service.update(payload.id, payload.companyId, payload.data);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to update broker') };
    }
  }

  async handleDelete(payload: { id: number; companyId: number }): Promise<IApiResponse> {
    try {
      await this.service.delete(payload.id, payload.companyId);
      return { success: true };
    } catch (error) {
      return { success: false, error: formatApiError(error, 'Failed to delete broker') };
    }
  }
}
